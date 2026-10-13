"""Install an extracted, verified portfolio release without deleting existing paths.

Run outside public_html. Every overwritten file gets a private backup. index.html
is replaced last, atomically. On an exception, overwritten files are restored.
"""
import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import shutil
import tempfile


def safe_relative(name):
    path = PurePosixPath(name)
    if not name or '\\' in name or path.is_absolute() or '..' in path.parts or ':' in name:
        raise ValueError(f'Unsafe manifest path: {name}')
    if path.as_posix() != name:
        raise ValueError(f'Non-canonical path: {name}')
    if name != 'index.html' and not (len(path.parts) == 2 and path.parts[0] == 'approach' and path.parts[1] in ('index.html', '.web-lizard-portfolio')) and (len(path.parts) < 2 or path.parts[0] not in ('portfolio-assets', 'portfolio-media')):
        raise ValueError(f'Unowned path: {name}')
    return path


def no_symlinks(path):
    for part in (path, *path.parents):
        if part.is_symlink():
            raise ValueError(f'Symlink not permitted: {part}')


def atomic_copy(source, target):
    target.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary = tempfile.mkstemp(prefix='.portfolio-', dir=target.parent)
    os.close(fd)
    try:
        shutil.copyfile(source, temporary)
        os.chmod(temporary, 0o644)
        os.replace(temporary, target)
    finally:
        Path(temporary).unlink(missing_ok=True)


def install(release, root, dry_run=False):
    release, root = Path(release).absolute(), Path(root).absolute()
    no_symlinks(release)
    no_symlinks(root)
    if not root.is_dir() or root.name != 'public_html':
        raise ValueError('Document root must be an existing public_html directory, verified in the hosting panel')
    if 'gnosis-astro' in root.parts:
        raise ValueError('Refusing to install into the GNOSIS site')
    if root == release or root in release.parents:
        raise ValueError('Extract the release outside the public document root')
    # An existing PHP index may have priority over index.html. Never rename it blindly.
    if (root / 'index.php').exists():
        raise ValueError('index.php exists: inspect DirectoryIndex and the old homepage before installation')
    manifest_path = release / 'manifest.json'
    no_symlinks(manifest_path)
    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    if not isinstance(manifest, dict) or 'index.html' not in manifest:
        raise ValueError('Missing index.html in manifest')
    if 'approach/index.html' in manifest:
        marker = 'approach/.web-lizard-portfolio'
        if marker not in manifest:
            raise ValueError('Missing approach ownership marker')
        existing_approach = root / 'approach'
        if existing_approach.exists() and not (existing_approach / '.web-lizard-portfolio').is_file():
            raise ValueError('Refusing to replace an unowned approach directory')
        if existing_approach.exists() and (existing_approach / '.web-lizard-portfolio').read_text(encoding='utf-8') != 'web-lizard-portfolio\n':
            raise ValueError('Invalid approach ownership marker')
    jobs = []
    for name, digest in manifest.items():
        relative = safe_relative(name)
        source, target = release / 'site' / relative, root / relative
        no_symlinks(source)
        no_symlinks(target)
        if not source.is_file() or hashlib.sha256(source.read_bytes()).hexdigest() != digest:
            raise ValueError(f'Checksum mismatch: {name}')
        for parent in target.parents:
            if parent == root:
                break
            if parent.exists() and not parent.is_dir():
                raise ValueError(f'Parent is not a directory: {parent}')
        if target.exists() and not target.is_file():
            raise ValueError(f'Refusing to replace a directory: {target}')
        jobs.append((name, source, target))
    jobs.sort(key=lambda item: (item[0] == 'index.html', item[0]))
    print(f'Root: {root}. Verified files: {len(jobs)}. No deletions. Existing directories preserved.')
    if dry_run:
        print('Dry run passed; no files changed.')
        return None
    backups = root.parent / '.portfolio-backups'
    no_symlinks(backups)
    backups.mkdir(mode=0o700, exist_ok=True)
    backup = Path(tempfile.mkdtemp(prefix=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ-'), dir=backups))
    replaced, created = [], []
    # Prepare complete backup before making the first public change.
    for name, _, target in jobs:
        if target.exists():
            destination = backup / name
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(target, destination)
            replaced.append(name)
        else:
            created.append(name)
    (backup / 'receipt.json').write_text(json.dumps({'root': str(root), 'replaced': replaced, 'created': created}, indent=2), encoding='utf-8')
    applied = []
    try:
        for name, source, target in jobs:
            no_symlinks(target)
            applied.append((name, target))
            atomic_copy(source, target)
    except Exception:
        for name, target in reversed(applied):
            if name in replaced:
                atomic_copy(backup / name, target)
            elif name in created:
                target.unlink(missing_ok=True)
        raise
    print(f'Installed. Private backup: {backup}')
    return backup


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', required=True, type=Path)
    parser.add_argument('--release', type=Path, default=Path(__file__).resolve().parent)
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()
    install(args.release, args.root, args.dry_run)
