# Fresh-Moves-Fix

## Guides

- [All guides (wiki home)](docs/Home.md)
- [All releases and Minecraft versions](docs/Versions.md)

## Changes from the original pack

- Eyes stay closed while sleeping and after death (upstream issue #360).
- `v1_21_2/` overlay (loaded automatically on Minecraft 1.21.2+): the second skin layer (hat, jacket, sleeves, pants) no longer moves twice (upstream issues #211, #309).
- `pack.mcmeta` declares the overlay and the `min_format` / `max_format` fields that Minecraft 1.21.9+ expects.
- Added example skins `herobrine.png` and `alex_white_eyes.png`.
- Wiki pages copied to `docs/`; caption fixed in "Eyebrow (Villager)" (upstream issue #246).

None of the model changes have been tested in-game yet.

## Build

`python3 build.py` checks the pack files and writes the installable zip to `dist/Fresh-Moves-Fix.zip`
(add a version, e.g. `python3 build.py 3.1-fix1`, to put it in the file name). GitHub Actions runs the same build on every push and attaches the zip as an artifact.
