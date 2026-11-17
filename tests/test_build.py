import unittest
import zipfile
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

import build


class EyesOnlyBuildTests(unittest.TestCase):
    def test_eyes_only_has_correct_install_instructions(self):
        with TemporaryDirectory() as tmp:
            output = Path(tmp) / 'eyes-only.zip'
            def save(name, entries):
                with zipfile.ZipFile(output, 'w') as z:
                    for name, value in entries.items():
                        if isinstance(value, Path):
                            z.write(value, name)
                        else:
                            z.writestr(name, value)
            with patch.object(build, 'write_zip', side_effect=save):
                build.build_eyes_only(build.check())
            with zipfile.ZipFile(output) as z:
                notes = z.read('INSTALL.txt').decode()
                self.assertIn('wave, sit', notes)
                self.assertIn('not available', notes)
                self.assertIn('TALKING MOUTH', notes)
                self.assertNotIn('Every tap on sneak is the next emote', notes)
                self.assertNotIn('Stand still, sneak and look straight down', notes)
                self.assertNotIn('assets/minecraft/optifine/cem/player_cape.jem', z.namelist())
        # The normal pack's instructions must remain intact.
        self.assertIn('Every tap on sneak is the next emote', (build.ROOT / 'INSTALL.txt').read_text())


if __name__ == '__main__':
    unittest.main()
