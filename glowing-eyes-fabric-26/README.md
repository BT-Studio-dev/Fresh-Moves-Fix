# Glowing Eyes for Minecraft 26.3 — experimental port in progress

This is **not** an official Glowing Eyes release. Based on upstream 2.1.3, it is
an unfinished Fabric-only port; see [NOTICE.md](NOTICE.md) for attribution,
license, and differences. It replaces neither the upstream download list nor the
skin editor. Do not use on worlds or servers without backups.

The GitHub Actions workflow `Build experimental Glowing Eyes 26.3` attempts to
build from this directory with Java 25 and uploads an experimental JAR only if
compilation and basic metadata checks pass. A successful build does **not** prove
that mixins, rendering, preset migration, or multiplayer work. No Modrinth
publication or GitHub release is performed by this workflow.

Local prerequisites: Java 25 and Gradle 9.8.2. Run `gradle build --no-daemon`
in this directory. Requires network access to Fabric, Mojang, Maven Central and
Ladysnake repositories. The 26.3 Fabric API and loader are listed in
`gradle.properties`. Flashback, ReplayMod and Wildfire Gender integration is
currently disabled. NeoForge is not included.
