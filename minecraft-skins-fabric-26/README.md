# Minecraft Skins (Fabric 26.x)

This is the Java 25, unobfuscated Minecraft 26.x port of the original local-only Fabric mod in `../minecraft-skins-fabric`. The client commands, storage and local-override behavior are intended to match that implementation. The 26.x sources are a separate port and should be kept in sync when changing shared behavior.

The `Build Minecraft Skins JAR for 26.x` workflow builds and checks version-specific JARs. Compilation and metadata checks do **not** verify mixin application, rendering, or command behavior in Minecraft. See the main README for usage and limitations; no account upload or multiplayer skin change is performed.
