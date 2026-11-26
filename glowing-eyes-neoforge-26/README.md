# Unofficial experimental Glowing Eyes NeoForge 26.x

This is an LGPL-derived experimental port, not an upstream release. See NOTICE.md
for source and attribution. [This GitHub Actions run](https://github.com/BT-Studio-dev/Fresh-Moves-Fix/actions/runs/45898373636)
compiled builds for Minecraft 26.1, 26.1.1, 26.1.2, 26.2 and 26.3 using
version-specific NeoForge dependencies and Java 25. Artifacts expire after seven
days and may require GitHub sign-in. 26.1, 26.1.1 and 26.3 use beta NeoForge
versions. Compilation alone does not verify Minecraft gameplay, rendering, mixins,
presets, server behaviour or multiplayer. Back up your files.

These are NeoForge JARs, not Forge JARs. The separate Fabric artifacts are not
confirmed to work on Quilt: Quilt Loader 0.30.2 advertises Fabric Loader 0.19.5,
while our 26.x Fabric builds require Fabric Loader 0.20.1. Do not override that
requirement without testing the resulting combination. NeoForge for 1.20.5 and
1.20.6, and Forge and Quilt ports for the requested versions, remain unfinished.
