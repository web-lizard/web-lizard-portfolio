"""Create static-upload and verified installer archives. No secrets or sources in web root."""
import hashlib
import json
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parents[1]


def package():
    dist = ROOT / 'dist'
    if not (dist / 'index.html').is_file():
        raise RuntimeError('Run npm run build first')
    files = sorted(p for p in dist.rglob('*') if p.is_file())
    for path in files:
        relative = path.relative_to(dist)
        if relative.parts[0] not in ('index.html', 'approach', 'portfolio-assets', 'portfolio-media'):
            raise RuntimeError(f'Unexpected production file: {relative}')
        if path.is_symlink():
            raise RuntimeError('Symlinks are not permitted')
    output = ROOT / 'artifacts'
    output.mkdir(exist_ok=True)
    manifest = {p.relative_to(dist).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest() for p in files}
    for name, managed in [('web-lizard-portfolio-upload.zip', False), ('web-lizard-portfolio-release.zip', True)]:
        archive = output / name
        with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as z:
            for path in files:
                z.write(path, ('site/' if managed else '') + path.relative_to(dist).as_posix())
            if managed:
                z.writestr('manifest.json', json.dumps(manifest, indent=2))
                z.write(ROOT / 'scripts/install.py', 'install.py')
                z.write(ROOT / 'DEPLOY.md', 'DEPLOY.md')
        digest = hashlib.sha256(archive.read_bytes()).hexdigest()
        archive.with_suffix('.zip.sha256').write_text(f'{digest}  {name}\n', encoding='ascii')
        print(f'{archive} ({archive.stat().st_size:,} bytes)')
    return output / 'web-lizard-portfolio-release.zip'


if __name__ == '__main__':
    package()
