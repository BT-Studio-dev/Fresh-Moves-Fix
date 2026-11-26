# Glowing Eyes: experimental Fabric 1.20.5/1.20.6 backport

Unofficial modified work based on AndreasMelone / RaydanOMGr's
[Glowing Eyes](https://github.com/RaydanOMGr/GlowingEyes), 1.21.1 branch,
commit a9069a1ba71e7b27fef154cb9630ba3aa3a701f2 (2.1.3), under LGPL-3.0-or-later.
The upstream license is in LICENSE. This directory contains modified source and
is not an official upstream release.

Changes: merged common and Fabric sources into a Fabric-only build, changed
build dependencies and metadata for 1.20.5/1.20.6, and disabled the upstream
Flashback, ReplayMod, and Wildfire Gender integrations. API backporting and
runtime testing are still required; no working JAR is claimed.
