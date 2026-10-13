"""Repeatable build, package, and SSH/SCP deployment using local SSH configuration."""
import argparse
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import subprocess
import sys
import uuid
from package import package, ROOT


def run(*args):
    subprocess.run(list(args), cwd=ROOT, check=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--package-only', action='store_true', help='Build ZIP archives without connecting to the server')
    parser.add_argument('--dry-run', action='store_true', help='Upload and validate without replacing public files')
    args = parser.parse_args()
    npm = shutil.which('npm.cmd' if os.name == 'nt' else 'npm')
    if not npm:
        raise RuntimeError('npm is not installed')
    run(npm, 'run', 'build')
    archive = package()
    if args.package_only:
        return
    alias = os.environ.get('PORTFOLIO_SSH_HOST', 'timeweb-lezard')
    root = os.environ.get('PORTFOLIO_DOCUMENT_ROOT', '')
    if not re.fullmatch(r'[a-zA-Z0-9_.@-]+', alias) or alias.startswith('-'):
        raise ValueError('Invalid SSH host/alias')
    if not re.fullmatch(r'/home/c/cv038824/[a-zA-Z0-9_./-]+', root) or '..' in PurePosixPath(root).parts:
        raise ValueError('Set PORTFOLIO_DOCUMENT_ROOT to the verified technical-domain public_html path. It is not guessed.')
    if PurePosixPath(root).name != 'public_html' or 'gnosis-astro' in PurePosixPath(root).parts:
        raise ValueError('Refusing an unverified or GNOSIS destination')
    remote = '/home/c/cv038824/releases/portfolio-' + uuid.uuid4().hex
    ssh = ['ssh', '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=20', alias]
    run(*ssh, f"umask 077; mkdir -p '{remote}'")
    run('scp', '-o', 'BatchMode=yes', str(archive), str(archive.with_suffix('.zip.sha256')), f'{alias}:{remote}/')
    command = f"cd '{remote}' && sha256sum -c '{archive.name}.sha256' && python3 -m zipfile -e '{archive.name}' . && python3 install.py --root '{root}' --dry-run"
    run(*ssh, command)
    if not args.dry_run:
        run(*ssh, f"cd '{remote}' && python3 install.py --root '{root}'")
        print('Installed. Verify https://cv038824.tw1.ru/ and all pre-existing applications before calling publication complete.')


if __name__ == '__main__':
    try:
        main()
    except (OSError, ValueError, RuntimeError, subprocess.CalledProcessError) as exc:
        print(f'Deployment stopped: {exc}', file=sys.stderr)
        sys.exit(1)
