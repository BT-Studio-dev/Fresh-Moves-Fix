# Minecraft Skins by Fresh Moves Fix (Fabric)

An independently written, **client-only** Fabric mod for applying local 64×64 PNG skins. It does not contain, repackage, or depend on HD Skins. This is an early implementation: it is **not verified in-game** and currently targets Minecraft Java 1.20 and 1.20.1 only. Other versions through 26.3 require separate porting and testing. Do not advertise unbuilt versions as available.

## Usage

1. Install the version-matched Fabric Loader and Fabric API, and put the matching mod JAR in `mods`. Start the game once to create `.minecraft/minecraft-skins/imports/` and `.minecraft/minecraft-skins/saved/`.
2. Download a 64×64 PNG from the website Skin Eye Editor. Copy it into `.minecraft/minecraft-skins/imports/`, with a simple filename such as `my_skin.png`.
3. In a world, run `/fmfskins import my_skin classic` or `/fmfskins import my_skin slim`. Omitting the model selects `classic`.
4. To keep a named copy use `/fmfskins save my_saved_skin`. List your copies with `/fmfskins list`, and apply one with `/fmfskins apply my_saved_skin slim` (or `classic`). Saved names contain only letters, digits, `_` and `-`; existing files are not overwritten.
5. `/fmfskins clear` returns to the normal account skin. The chosen local skin is remembered across restarts.

The local override **only appears to you**; it does not change the Mojang/Microsoft account skin or send the PNG to multiplayer servers. The mod does not provide a file browser yet. Back up your skin files. PNGs are limited to 2 MB and 64×64, as exported by the editor.

## Build

Use Java 17 and Gradle 8.5. From this folder run `gradle build` (requires access to Fabric Maven and Minecraft dependencies). The `Build Minecraft Skins JAR` action builds version-specific artifacts for the versions in its matrix. Only successful builds are valid artifacts; there are no automatically published GitHub Release downloads yet.

To build for 1.20, pass `-Pminecraft_version=1.20 -Pyarn_mappings=1.20+build.1 -Pfabric_version=0.83.0+1.20`. The build targets the exact version in `fabric.mod.json` and does not claim adjacent-version support.

Minecraft 26.1+ uses a different, unobfuscated development toolchain and Java 25; the 1.20 source is **not** a 26.x build. Windows 7 support for modern Java/Minecraft is not guaranteed.
