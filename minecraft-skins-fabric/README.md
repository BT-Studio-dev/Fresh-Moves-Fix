# Minecraft Skins by Fresh Moves Fix (Fabric)

An independently written, **client-only** Fabric mod for applying local 64×64 PNG skins. It does not contain, repackage, or depend on HD Skins. This is an early implementation and is **not verified in-game**. Version-specific CI builds cover Minecraft 1.20 through 1.21.11; Minecraft 26.x uses the separate unobfuscated project in `../minecraft-skins-fabric-26/`. Only versions with a successful CI build have a verified JAR, and compilation does not prove the mixin or skin display works at runtime.

## Usage

1. Install the version-matched Fabric Loader and Fabric API, and put the matching mod JAR in `mods`. Start the game once to create `.minecraft/minecraft-skins/imports/` and `.minecraft/minecraft-skins/saved/`.
2. Download a 64×64 PNG from the website Skin Eye Editor. Copy it into `.minecraft/minecraft-skins/imports/`, with a simple filename such as `my_skin.png`.
3. In a world, run `/fmfskins import my_skin classic` or `/fmfskins import my_skin slim`. Omitting the model selects `classic`.
4. To keep a named copy use `/fmfskins save my_saved_skin`. List your copies with `/fmfskins list`, and apply one with `/fmfskins apply my_saved_skin slim` (or `classic`). Saved names contain only letters, digits, `_` and `-`; existing files are not overwritten.
5. `/fmfskins clear` returns to the normal account skin. The chosen local skin is remembered across restarts.

The local override **only appears to you**; it does not change the Mojang/Microsoft account skin or send the PNG to multiplayer servers. The mod does not provide a file browser yet. Back up your skin files. PNGs are limited to 2 MB and 64×64, as exported by the editor.

## Build

From this folder run `gradle build` with access to Fabric Maven and Minecraft dependencies. The workflow matrix records the exact Minecraft, mappings, Fabric API, Java, Gradle, Loom and adapter values for each target. Minecraft 1.20–1.20.4 uses Java 17; newer 1.20 and 1.21 builds use Java 21. Each JAR declares an exact Minecraft version, not support for adjacent versions.

Minecraft 26.1+ uses the separate `minecraft-skins-fabric-26` source and workflow, unobfuscated Loom and Java 25. Windows 7 support for modern Java/Minecraft is not guaranteed. A green build verifies compilation and JAR metadata, not in-game behavior.
