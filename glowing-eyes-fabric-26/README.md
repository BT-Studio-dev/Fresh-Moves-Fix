# Glowing Eyes for Minecraft 26.x — experimental port in progress

This is **not** an official Glowing Eyes release. Based on upstream 2.1.3, it is
an unfinished Fabric-only port; see [NOTICE.md](NOTICE.md) for attribution,
license, and differences. It replaces neither the upstream download list nor the
skin editor. Do not use on worlds or servers without backups.

The GitHub Actions workflow `Build experimental Glowing Eyes 26.x` attempts to
build 26.1, 26.1.1, 26.1.2, 26.2 and 26.3 separately from this directory
with Java 25 and uploads each experimental JAR only if compilation and basic
metadata checks pass. [This run](https://github.com/BT-Studio-dev/Fresh-Moves-Fix/actions/runs/45896822544)
built all five targets; its artifacts expire after 7 days and may require GitHub
sign-in. The 26.2 and 26.3 versions use version-specific adaptations for GUI,
entity, graphics and input APIs. **None of the 26.x builds has been tested in Minecraft.**
Client, dedicated-server, preset, rendering, mixin and multiplayer tests are
still needed; a successful build alone does not prove the mod works. No
Modrinth publication or GitHub release is performed by this workflow.

Local prerequisites: Java 25 and Gradle 9.8.2. Run `gradle build --no-daemon`
in this directory. Requires network access to Fabric, Mojang, Maven Central and
Ladysnake repositories. Version-specific Fabric API and Cardinal Components versions are listed in
the workflow; the default `gradle.properties` targets 26.3. Flashback, ReplayMod and Wildfire Gender integration is
currently disabled. NeoForge is not included.
