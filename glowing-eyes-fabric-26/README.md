# Glowing Eyes for Minecraft 26.x — experimental port in progress

This is **not** an official Glowing Eyes release. Based on upstream 2.1.3, it is
an unfinished Fabric-only port; see [NOTICE.md](NOTICE.md) for attribution,
license, and differences. It replaces neither the upstream download list nor the
skin editor. Do not use on worlds or servers without backups.

The GitHub Actions workflow `Build experimental Glowing Eyes 26.x` attempts to
build 26.1, 26.1.1, 26.1.2, 26.2 and 26.3 separately from this directory
with Java 25 and uploads each experimental JAR only if
compilation and basic metadata checks pass. **The port does not currently
compile and no 26.3 JAR has been produced.** Upstream's 1.21.11 GUI and render
code references APIs removed or changed in 26.3, including `GuiGraphics`,
render pipelines, and Fabric's feature-renderer callback. These need a proper
26.3 rewrite, followed by client, dedicated-server, preset and multiplayer tests.
A successful build alone would **not** prove mixins or rendering work. No
Modrinth publication or GitHub release is performed by this workflow.

Local prerequisites: Java 25 and Gradle 9.8.2. Run `gradle build --no-daemon`
in this directory. Requires network access to Fabric, Mojang, Maven Central and
Ladysnake repositories. Version-specific Fabric API and Cardinal Components versions are listed in
the workflow; the default `gradle.properties` targets 26.3. Flashback, ReplayMod and Wildfire Gender integration is
currently disabled. NeoForge is not included.
