"""Regression checks for the installer boundaries and rollback."""
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('portfolio_install', Path(__file__).with_name('install.py'))
installer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(installer)


class InstallerTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.base = Path(self.temp.name)
        self.root = self.base / 'technical' / 'public_html'
        self.root.mkdir(parents=True)
        self.release = self.base / 'release'
        self.release.mkdir()
        self.files = {'index.html': '<h1>Portfolio</h1>', 'approach/index.html': '<h1>Approach</h1>', 'approach/.web-lizard-portfolio': 'web-lizard-portfolio\n', 'portfolio-assets/app.js': 'console.log(1)', 'portfolio-media/portrait.webp': 'test image'}
        self.write_release()
        (self.root / 'index.html').write_text('old homepage')
        for name in ['gnosis/index.html', 'tarot/app/index.html', 'other/data.txt', '.htaccess']:
            path = self.root / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text('DO NOT CHANGE')

    def tearDown(self):
        self.temp.cleanup()

    def write_release(self):
        manifest = {}
        for name, content in self.files.items():
            path = self.release / 'site' / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(content)
            manifest[name] = hashlib.sha256(path.read_bytes()).hexdigest()
        (self.release / 'manifest.json').write_text(json.dumps(manifest))

    def snapshot(self):
        return {p.relative_to(self.root).as_posix(): p.read_bytes() for p in self.root.rglob('*') if p.is_file()}

    def test_preserves_other_applications_and_backs_up_home(self):
        old = self.snapshot()
        backup = installer.install(self.release, self.root)
        for name, content in old.items():
            if name != 'index.html':
                self.assertEqual((self.root / name).read_bytes(), content)
        self.assertEqual((backup / 'index.html').read_text(), 'old homepage')
        self.assertEqual((self.root / 'index.html').read_text(), self.files['index.html'])
        self.assertEqual((self.root / 'approach/index.html').read_text(), self.files['approach/index.html'])

    def test_dry_run_does_not_write(self):
        old = self.snapshot()
        installer.install(self.release, self.root, True)
        self.assertEqual(old, self.snapshot())
        self.assertFalse((self.root.parent / '.portfolio-backups').exists())

    def test_checksum_failure_does_not_write(self):
        old = self.snapshot()
        (self.release / 'site/index.html').write_text('corrupt')
        with self.assertRaisesRegex(ValueError, 'Checksum'):
            installer.install(self.release, self.root)
        self.assertEqual(old, self.snapshot())

    def test_path_traversal_and_foreign_names(self):
        for name in ['../index.html', '/index.html', 'gnosis/index.html', '.htaccess', 'portfolio-media/../gnosis/data', 'portfolio-media\\x', 'index.html/child', 'portfolio-media//x']:
            with self.subTest(name=name), self.assertRaises(ValueError):
                installer.safe_relative(name)

    def test_rollback_after_partial_copy(self):
        old = self.snapshot()
        original = installer.atomic_copy
        def failing(source, target):
            if Path(source) == self.release / 'site/index.html':
                raise OSError('Simulated storage failure')
            return original(source, target)
        with patch.object(installer, 'atomic_copy', side_effect=failing):
            with self.assertRaises(OSError):
                installer.install(self.release, self.root)
        self.assertEqual(old, self.snapshot())

    def test_refuses_existing_php_homepage_and_gnosis_root(self):
        (self.root / 'index.php').write_text('old app')
        with self.assertRaisesRegex(ValueError, 'index.php'):
            installer.install(self.release, self.root)
        gnosis = self.base / 'gnosis-astro/public_html'
        gnosis.mkdir(parents=True)
        with self.assertRaisesRegex(ValueError, 'GNOSIS'):
            installer.install(self.release, gnosis)

    def test_refuses_unowned_approach_directory(self):
        old = self.snapshot()
        (self.root / 'approach').mkdir()
        (self.root / 'approach/other.html').write_text('DO NOT CHANGE')
        with self.assertRaisesRegex(ValueError, 'unowned approach'):
            installer.install(self.release, self.root)
        self.assertEqual((self.root / 'approach/other.html').read_text(), 'DO NOT CHANGE')
        for name, content in old.items():
            self.assertEqual((self.root / name).read_bytes(), content)

    def test_refuses_symlink_parent(self):
        other = self.base / 'unrelated'
        other.mkdir()
        try:
            (self.root / 'portfolio-assets').symlink_to(other, target_is_directory=True)
        except OSError:
            self.skipTest('Symlink creation unavailable for this OS user')
        with self.assertRaisesRegex(ValueError, 'Symlink'):
            installer.install(self.release, self.root)
        self.assertEqual(list(other.iterdir()), [])


if __name__ == '__main__':
    unittest.main(verbosity=2)
