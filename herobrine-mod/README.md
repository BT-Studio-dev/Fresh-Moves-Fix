# Herobrine Watcher — experimental Fabric mod

This is **experimental source code**. A test JAR was built by GitHub Actions. It targets Minecraft Java 26.3,
Fabric Loader 0.20.1+, Fabric API 0.166.2+26.3, and Java 25. The GitHub Actions build compiled successfully, but gameplay has not been verified. Back up worlds before testing.

The prototype uses an invulnerable, silent armor stand, not a custom mob or
player model. Every five minutes of server runtime it tries to appear about twelve
blocks from players, in a randomly chosen direction, turn toward a nearby player, and disappear 20 seconds
later. It plays Minecraft’s cave ambience sound once when it appears, and does not attack. Its head uses the `MHF_Herobrine` Minecraft profile, which has white eyes.
The game must resolve its skin online; it may not load offline. The eyes are
white pixels, not emissive (they do not glow in the dark). Dyed leather armor provides a turquoise shirt and blue trousers, but remains a placeholder. Terrain, multiplayer,
commands, and appearance all need real game testing; sightings can be obstructed.

Build on a machine with Java 25 and Gradle 9.8.2 with access to the Fabric and
Minecraft repositories: from this directory, run `gradle build`. The binary is
in `build/libs/`. Alternatively run the **Build Herobrine mod** GitHub Actions
workflow and download its artifact if it succeeds. Install the binary JAR and
matching Fabric API in the `mods` folder with Fabric Loader; on multiplayer the
server needs the mod. Do not install sources or the Gradle build files as mods.

This is separate from the Fresh Moves Fix resource pack. Windows 7 compatibility
with Java 25 and Minecraft 26.3 is not assured.

You can also type `/herobrine` in chat to try to summon the watcher nearby. Enable cheats in single-player or use an operator account on a server. The command and appearance are untested in-game.
