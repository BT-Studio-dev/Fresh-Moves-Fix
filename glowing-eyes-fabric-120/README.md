# Experimental Fabric backport for Minecraft 1.20.5 and 1.20.6

This is an unfinished, unofficial Glowing Eyes backport. See NOTICE.md for
attribution and changes. Do not install as a replacement for upstream or on
worlds without backups. The `Build experimental Glowing Eyes 1.20.x` workflow
tries each version separately and uploads a JAR only if the build and metadata
checks succeed; it does not create a GitHub or Modrinth release. Builds for
both targets passed compilation and basic metadata checks on commit `e06437f`.
Compilation alone is not proof that rendering, mixins, multiplayer, or presets
work. Neither version has been tested in game. NeoForge and optional mod
integrations are not included.

For local builds use Java 21 and Gradle 8.12.1, then run `gradle build` with
`-Pminecraft_version=... -Pfabric_version=...` as in the workflow.
