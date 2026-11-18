# Minecraft Skins (based on HD Skins)

This is a renamed distribution of **HD Skins 6.16.2+26.3**, not a new mod
written from scratch. HD Skins is by Mumfrey, Killjoy1221, Sollace and Mine
Little Pony, licensed MIT; the upstream license is in `LICENSE.upstream` and
inside the JAR. Source: https://github.com/MineLittlePony/HDSkins

The only change to the pinned original JAR is the name and description in
`fabric.mod.json`, plus a notice and a copy of the upstream license. Upstream
code, assets, mod ID `hdskins`, dependencies and behavior are unchanged. Do not
install this JAR alongside the original HD Skins: they have the same mod ID.
The JAR is built for Minecraft Java 26.3 and Fabric; use the matching upstream
requirements and mod versions. This renamed distribution is not an official
upstream release and has not been tested in-game. Back up your game first.

To reproduce, download `hdskins-6.16.2+26.3.jar` from the upstream GitHub release
`6.16.2+26.3`, then run:

```
python3 minecraft-skins/repackage.py path/to/hdskins-6.16.2+26.3.jar minecraft-skins/minecraft-skins-26.3.jar
```

The script verifies the pinned SHA-256, preserves upstream content and refuses
to modify a signed JAR. Upload only the resulting JAR to your mods folder, not
the Python file. Consult upstream instructions for skin servers and setup.
