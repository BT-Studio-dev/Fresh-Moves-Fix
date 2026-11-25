# Minecraft Skins (based on HD Skins)

**Historical, retired packaging only.** This folder describes a renamed distribution of **HD Skins** by Mumfrey,
Killjoy1221, Sollace and Mine Little Pony, not a new mod written from scratch.
The current GitHub Actions workflow no longer builds these JARs. The separate, original work-in-progress mod lives in [`../minecraft-skins-fabric`](../minecraft-skins-fabric/README.md).
HD Skins is MIT licensed; the upstream license is in `LICENSE.upstream` and
inside each JAR. Source: https://github.com/MineLittlePony/HDSkins

The only changes to each pinned upstream JAR are its display name and
information in `fabric.mod.json`, plus a notice and a copy of the upstream
license. Code, assets, mod ID `hdskins`, dependencies and behavior are unchanged.
Do not install this JAR alongside the original HD Skins: both have the same ID.

## Download a build

These historical repackaged builds are not offered by the current site or workflow.
The original mod's current build status and instructions are in its separate README.

JARs are prepared for upstream builds 1.20, 1.20.1, 1.20.2, 1.20.4, 1.20.5,
1.21.1, 1.21.3, 1.21.4, 1.21.5, 1.21.7, 1.21.10, 1.21.11, 26.1, 26.2 and
26.3. These are not verified as compatible with every Minecraft version displayed
for the separate Fresh Moves Fix resource pack. In particular there is no
separately verified 1.21.9 build in this bundle. These mods have not been tested
in-game. Back up your game first.

## Reproduce

With Python 3 and the GitHub CLI installed and authenticated, run
`python3 minecraft-skins/build-all.py dist/minecraft-skins`. Each upstream release
is pinned by asset name, tag and SHA-256 in `upstream-releases.json`. Hashes for
older assets were computed from their upstream GitHub downloads; newer hashes are
also recorded in upstream release metadata. The script refuses to modify signed
or corrupt JARs and includes the upstream copyright and MIT license. The workflow
does not publish a GitHub release.
