# Glowing Eyes: experimental Fabric 26.x port

This is an unofficial modified work based on AndreasMelone / RaydanOMGr's
[Glowing Eyes](https://github.com/RaydanOMGr/GlowingEyes), 1.21.11 branch,
commit d8d0d0243d4e50ad6dadabae9c63a6ff704bcccb (2.1.3), under LGPL-3.0-or-later.
The upstream license is in LICENSE. This directory contains the corresponding
modified source; it is not an official upstream release.

Changes: merged upstream common and Fabric sources into a Fabric-only build,
updated the build target/dependencies and metadata to Minecraft 26.x / Java 25,
adapted the Fabric client command and key registration API, and disabled
upstream Flashback, ReplayMod, and Wildfire Gender compat code,
which still targets older Minecraft APIs. Further API and runtime porting is
required. Nothing here asserts that the resulting mod compiles or works in game.

Shared 26.1.2 GUI, shader and render-pipeline adaptations were taken from
[steelsicarius/GlowingEyes-Neoforge-26.1.2-unofficial-port](https://github.com/steelsicarius/GlowingEyes-Neoforge-26.1.2-unofficial-port),
commit 1ed7c611c7f552dca27a23c9e81825262971efaa, also LGPL-3.0-or-later.
These changes are being adapted to Fabric and remain unverified in this port.
