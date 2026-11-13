# Fresh-Moves-Fix

A copy of the [Fresh Moves](https://github.com/IthanMendoza/Fresh-Moves) player animation resource pack (CC0).

## Requirements

- Fabric / NeoForge / Forge: [Entity Model Features (EMF)](https://modrinth.com/mod/entity-model-features) and [Entity Texture Features (ETF)](https://modrinth.com/mod/entitytexturefeatures)
- or OptiFine

## Armour does not follow the animations (Minecraft 1.21.9+)

Since Minecraft 1.21.9 armour no longer copies the pose of the player model by itself, so iron (and any other) armour
stays in the vanilla pose while the body is animated. This is fixed in the mod, not in the pack:

- Update **EMF to 3.0.5 or newer** (3.0.12 or newer is recommended, it also removes the lag armour caused with animated players), and update ETF with it.
- Do not put another pack that animates armour models (`*_armor.jem`, `helmet.jem`, `chestplate.jem`, ...) above this one: EMF skips the pose copy for armour models that have their own animations.

## Guides

- [All guides (wiki home)](docs/Home.md)
- [Fix Black Eyes](docs/Fix-Black-Eyes.md)
- [Fix Moving 1st Person Hand](docs/Fix-Moving-1st-Person-Hand.md)
