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

`python3 build.py` checks the pack files and writes the installable zips to `dist/`:

- `Fresh-Moves-Fix.zip` - one zip for all versions (Minecraft picks the right files itself)
- `Fresh-Moves-Fix-mc<version>.zip` - one zip per Minecraft version: 1.21.5, 1.21.6, 1.21.7, 1.21.8, 1.21.9, 1.21.10, 1.21.11, 26.1, 26.2, 26.3

`python3 build.py 26.3 1.21.5` builds only the listed versions. GitHub Actions runs the same build on every push and attaches the zips as an artifact.

The per-version zips carry the pack format number of that version so Minecraft does not show the "incompatible" warning. They have not been tested in-game.
