// Fresh Moves Fix - the player model shared by the pages: moves and emotes, the 3D model file (glTF),
// and a 3D viewer that needs no WebGL (it draws on a normal 2D canvas).
(function () {
  // ---- emotes: one description for both 3D viewers. t = seconds; each part gets [turn x, turn y, turn z]; lift moves the whole player up ----
  const EMOTES = {
    cheer: (t) => ({ ra: [0, 0, -2.6 + Math.sin(t * 8) * 0.2], la: [0, 0, 2.6 - Math.sin(t * 8) * 0.2], head: [-0.25, 0, 0], lift: Math.abs(Math.sin(t * 4)) * 2 }),
    jacks: (t) => { const p = (1 - Math.cos(t * 6)) / 2; return { ra: [0, 0, -p * 2.7], la: [0, 0, p * 2.7], rl: [0, 0, -p * 0.4], ll: [0, 0, p * 0.4], lift: Math.sin(Math.min(1, p * 1.2) * Math.PI) * 1.5 }; },
    clap: (t) => { const c = 0.32 + Math.max(0, Math.sin(t * 11)) * 0.3; return { ra: [-1.35, 0, c], la: [-1.35, 0, -c], head: [0.12, 0, 0] }; },
    dance: (t) => { const w = Math.sin(t * 6); return { ra: [-2.7 + w * 0.5, 0, -0.25], la: [-2.7 - w * 0.5, 0, 0.25], rl: [w * 0.45, 0, 0], ll: [-w * 0.45, 0, 0], head: [0, 0, w * 0.18], lift: Math.abs(w) * 1.2 }; },
    dab: (t) => { const b = Math.sin(t * 3) * 0.04; return { head: [0.45, 0.35, 0], ra: [0, 0, -2.05 + b], la: [-1.75, -0.2, -0.95 + b], rl: [0, 0, -0.08], ll: [0, 0, 0.08] }; },
    sit: (t) => { const b = Math.sin(t * 1.6) * 0.03; return { rl: [-1.45, 0.12, 0], ll: [-1.45, -0.12, 0], ra: [-0.55 + b, 0, -0.08], la: [-0.55 - b, 0, 0.08], lift: -10 }; },
    look: (t) => ({ head: [Math.sin(t * 0.9) * 0.25, Math.sin(t * 1.5) * 0.9, 0], ra: [0, 0, -0.05], la: [0, 0, 0.05] }),
    tpose: () => ({ ra: [0, 0, -Math.PI / 2], la: [0, 0, Math.PI / 2] }),
  };
  // the four basic moves, in the same form (used by the simple viewer and by the 3D model file)
  const MOVES = {
    idle: (t) => { const b = Math.sin(t * 1.6) * 0.04; return { ra: [b, 0, -0.05 - b], la: [-b, 0, 0.05 + b] }; },
    walk: (t) => { const w = Math.sin(t * 6) * 0.6; return { ra: [w, 0, 0], la: [-w, 0, 0], rl: [-w, 0, 0], ll: [w, 0, 0] }; },
    run: (t) => { const w = Math.sin(t * 10) * 1.1; return { ra: [w, 0, 0], la: [-w, 0, 0], rl: [-w, 0, 0], ll: [w, 0, 0] }; },
    wave: (t) => ({ ra: [0, 0, -2.4 + Math.sin(t * 7) * 0.35], la: [0, 0, 0.05], head: [0, 0, 0.06] }),
  };
  const moveOf = (name) => EMOTES[name] || MOVES[name] || MOVES.idle;
  // seconds after which each move repeats (for a clean loop in the 3D model file)
  const LOOP = { idle: 2 * Math.PI / 1.6, walk: Math.PI / 3, run: Math.PI / 5, wave: 2 * Math.PI / 7, cheer: Math.PI / 4, jacks: Math.PI / 3, clap: 2 * Math.PI / 11, dance: Math.PI / 3, dab: 2 * Math.PI / 3, sit: 2 * Math.PI / 1.6, look: 2 * Math.PI / 0.3, tpose: 1 };
  const BOXES = (slim) => { // [joint, u, v, w, h, d, centre x, y, z, inflate]
    const aw = slim ? 3 : 4, ax = slim ? 5.5 : 6;
    return [
      ["head", 0, 0, 8, 8, 8, 0, 28, 0, 0], ["head", 32, 0, 8, 8, 8, 0, 28, 0, 0.5],
      ["body", 16, 16, 8, 12, 4, 0, 18, 0, 0], ["body", 16, 32, 8, 12, 4, 0, 18, 0, 0.25],
      ["ra", 40, 16, aw, 12, 4, -ax, 18, 0, 0], ["ra", 40, 32, aw, 12, 4, -ax, 18, 0, 0.25],
      ["la", 32, 48, aw, 12, 4, ax, 18, 0, 0], ["la", 48, 48, aw, 12, 4, ax, 18, 0, 0.25],
      ["rl", 0, 16, 4, 12, 4, -2, 6, 0, 0], ["rl", 0, 32, 4, 12, 4, -2, 6, 0, 0.25],
      ["ll", 16, 48, 4, 12, 4, 2, 6, 0, 0], ["ll", 0, 48, 4, 12, 4, 2, 6, 0, 0.25],
    ];
  };
  const PIVOTS = { head: [0, 24, 0], body: [0, 24, 0], ra: [-5, 22, 0], la: [5, 22, 0], rl: [-2, 12, 0], ll: [2, 12, 0] };
  const FACE_NORMALS = [[0, 0, 1], [0, 0, -1], [-1, 0, 0], [1, 0, 0], [0, 1, 0], [0, -1, 0]]; // front, back, right, left, top, bottom
  // the four corners of each box face with their place on the skin: [x, y, z, u, v] x4
  function boxFaces(u, v, w, h, dp, cx, cy, cz, n) {
    const X = w / 2 + n, Y = h / 2 + n, Z = dp / 2 + n, t = cy + Y, b = cy - Y;
    const q = (fu, fv, cols, rows, p) => [[...p[0], fu, fv], [...p[1], fu + cols, fv], [...p[2], fu + cols, fv + rows], [...p[3], fu, fv + rows]];
    return [
      q(u + dp, v + dp, w, h, [[cx - X, t, cz + Z], [cx + X, t, cz + Z], [cx + X, b, cz + Z], [cx - X, b, cz + Z]]),
      q(u + 2 * dp + w, v + dp, w, h, [[cx + X, t, cz - Z], [cx - X, t, cz - Z], [cx - X, b, cz - Z], [cx + X, b, cz - Z]]),
      q(u, v + dp, dp, h, [[cx - X, t, cz - Z], [cx - X, t, cz + Z], [cx - X, b, cz + Z], [cx - X, b, cz - Z]]),
      q(u + dp + w, v + dp, dp, h, [[cx + X, t, cz + Z], [cx + X, t, cz - Z], [cx + X, b, cz - Z], [cx + X, b, cz + Z]]),
      q(u + dp, v, w, dp, [[cx - X, t, cz - Z], [cx + X, t, cz - Z], [cx + X, t, cz + Z], [cx - X, t, cz + Z]]),
      q(u + dp + w, v, w, dp, [[cx - X, b, cz - Z], [cx + X, b, cz - Z], [cx + X, b, cz + Z], [cx - X, b, cz + Z]]), // same picture as the preview; seen from below
    ];
  }
  // ---- 3D model file (glTF 2.0): the player with the skin on it and one looping move. Opens in Blender, Blockbench, Windows 3D Viewer. ----
  function buildGltf(pngDataUrl, slim, move) {
    const S = 1 / 16, JOINTS = ["head", "body", "ra", "la", "rl", "ll"], NAMES = { head: "Head", body: "Body", ra: "RightArm", la: "LeftArm", rl: "RightLeg", ll: "LeftLeg" };
    const chunks = [], views = [], accessors = []; let size = 0;
    const add = (typed, target, type, comp, count, extra) => {
      const bytes = new Uint8Array(typed.buffer); const pad = (4 - (bytes.length % 4)) % 4;
      views.push(Object.assign({ buffer: 0, byteOffset: size, byteLength: bytes.length }, target ? { target } : {}));
      chunks.push(bytes); if (pad) chunks.push(new Uint8Array(pad)); size += bytes.length + pad;
      accessors.push(Object.assign({ bufferView: views.length - 1, componentType: comp, count, type }, extra || {}));
      return accessors.length - 1;
    };
    const meshes = [], nodes = [{ name: "Player", children: JOINTS.map((_, i) => i + 1), translation: [0, 0, 0] }];
    JOINTS.forEach((j, ji) => {
      const pv = PIVOTS[j], prims = [];
      for (const layer of [0, 1]) {
        const pos = [], nor = [], uv = [], idx = [];
        for (const [name, u, v, w, h, dp, cx, cy, cz, inf] of BOXES(slim)) {
          if (name !== j || (inf > 0) !== (layer === 1)) continue;
          boxFaces(u, v, w, h, dp, cx, cy, cz, inf).forEach((f, fi) => {
            const base = pos.length / 3;
            for (const c of f) { pos.push((c[0] - pv[0]) * S, (c[1] - pv[1]) * S, (c[2] - pv[2]) * S); nor.push(...FACE_NORMALS[fi]); uv.push(c[3] / 64, c[4] / 64); }
            if (fi === 5) idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
            else idx.push(base, base + 3, base + 2, base, base + 2, base + 1); // counter-clockwise seen from outside
          });
        }
        const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
        for (let i = 0; i < pos.length; i++) { mn[i % 3] = Math.min(mn[i % 3], pos[i]); mx[i % 3] = Math.max(mx[i % 3], pos[i]); }
        const P = add(new Float32Array(pos), 34962, "VEC3", 5126, pos.length / 3, { min: Array.from(new Float32Array(mn)), max: Array.from(new Float32Array(mx)) });
        const N = add(new Float32Array(nor), 34962, "VEC3", 5126, nor.length / 3);
        const T = add(new Float32Array(uv), 34962, "VEC2", 5126, uv.length / 2);
        const I = add(new Uint16Array(idx), 34963, "SCALAR", 5123, idx.length);
        prims.push({ attributes: { POSITION: P, NORMAL: N, TEXCOORD_0: T }, indices: I, material: layer });
      }
      meshes.push({ name: NAMES[j], primitives: prims });
      nodes.push({ name: NAMES[j], mesh: ji, translation: [pv[0] * S, pv[1] * S, pv[2] * S], rotation: [0, 0, 0, 1] });
    });
    // the move: one turn value per joint, 30 times a second, over one loop
    const fn = moveOf(move), len = LOOP[move] || 2, frames = Math.max(2, Math.min(600, Math.round(len * 30) + 1));
    const times = new Float32Array(frames), rot = JOINTS.map(() => new Float32Array(frames * 4)), lift = new Float32Array(frames * 3);
    for (let f = 0; f < frames; f++) {
      const t = (f / (frames - 1)) * len, e = fn(t); times[f] = t;
      JOINTS.forEach((j, ji) => {
        const r = e[j] || [0, 0, 0], cx = Math.cos(r[0] / 2), sx = Math.sin(r[0] / 2), cy = Math.cos(r[1] / 2), sy = Math.sin(r[1] / 2), cz = Math.cos(r[2] / 2), sz = Math.sin(r[2] / 2);
        // turn order x, y, z as in the preview
        rot[ji].set([sx * cy * cz + cx * sy * sz, cx * sy * cz - sx * cy * sz, cx * cy * sz + sx * sy * cz, cx * cy * cz - sx * sy * sz], f * 4);
      });
      lift[f * 3 + 1] = (e.lift || 0) * S;
    }
    const TI = add(times, 0, "SCALAR", 5126, frames, { min: [0], max: [times[frames - 1]] });
    const samplers = [], channels = [];
    JOINTS.forEach((j, ji) => {
      samplers.push({ input: TI, output: add(rot[ji], 0, "VEC4", 5126, frames), interpolation: "LINEAR" });
      channels.push({ sampler: samplers.length - 1, target: { node: ji + 1, path: "rotation" } });
    });
    samplers.push({ input: TI, output: add(lift, 0, "VEC3", 5126, frames), interpolation: "LINEAR" });
    channels.push({ sampler: samplers.length - 1, target: { node: 0, path: "translation" } });
    const all = new Uint8Array(size); let o = 0; for (const c of chunks) { all.set(c, o); o += c.length; }
    let bin = ""; for (let i = 0; i < all.length; i += 0x8000) bin += String.fromCharCode.apply(null, all.subarray(i, i + 0x8000));
    const mat = (name) => ({ name, pbrMetallicRoughness: { baseColorTexture: { index: 0 }, metallicFactor: 0, roughnessFactor: 1 }, alphaMode: "MASK", alphaCutoff: 0.5, doubleSided: name !== "Skin" });
    return JSON.stringify({
      asset: { version: "2.0", generator: "Fresh Moves Fix skin editor" },
      scene: 0, scenes: [{ name: "Scene", nodes: [0] }], nodes, meshes,
      materials: [mat("Skin"), mat("SkinSecondLayer")],
      textures: [{ sampler: 0, source: 0 }], images: [{ name: "skin", uri: pngDataUrl }],
      samplers: [{ magFilter: 9728, minFilter: 9728, wrapS: 33071, wrapT: 33071 }],
      animations: [{ name: move, samplers, channels }],
      accessors, bufferViews: views, buffers: [{ byteLength: size, uri: "data:application/octet-stream;base64," + btoa(bin) }],
    });
  }

  // ---- simple 3D preview without WebGL: the model is drawn pixel by pixel on a normal 2D canvas ----
  function SoftViewer(cv) {
    const g = cv.getContext("2d");
    let img = null, slim = false, yaw = -0.5, pitch = 0.15, raf = 0, last = 0, t = 0, dead = false, drag = null;
    const self = this; self.soft = true; self.autoRotate = false; self.zoom = 0.9; self.pose = "idle"; self.layers3d = false;
    // box: uv corner, size (w,h,d), centre, pivot name, inflate
    function parts() {
      const aw = slim ? 3 : 4, ax = slim ? 5.5 : 6;
      const P = [
        ["head", 0, 0, 8, 8, 8, 0, 28, 0, 0], ["head", 32, 0, 8, 8, 8, 0, 28, 0, 0.5],
        ["body", 16, 16, 8, 12, 4, 0, 18, 0, 0], ["body", 16, 32, 8, 12, 4, 0, 18, 0, 0.25],
        ["ra", 40, 16, aw, 12, 4, -ax, 18, 0, 0], ["ra", 40, 32, aw, 12, 4, -ax, 18, 0, 0.25],
        ["la", 32, 48, aw, 12, 4, ax, 18, 0, 0], ["la", 48, 48, aw, 12, 4, ax, 18, 0, 0.25],
        ["rl", 0, 16, 4, 12, 4, -2, 6, 0, 0], ["rl", 0, 32, 4, 12, 4, -2, 6, 0, 0.25],
        ["ll", 16, 48, 4, 12, 4, 2, 6, 0, 0], ["ll", 0, 48, 4, 12, 4, 2, 6, 0, 0.25],
      ];
      return P;
    }
    const NORMALS = [[0, 0, 1], [0, 0, -1], [-1, 0, 0], [1, 0, 0], [0, 1, 0], [0, -1, 0]]; // front, back, right, left, top, bottom
    const PIV = { head: [0, 24, 0], body: [0, 24, 0], ra: [-5, 22, 0], la: [5, 22, 0], rl: [-2, 12, 0], ll: [2, 12, 0] };
    function angles() { // [turn x, turn y, turn z] per part, plus lift
      const A = { head: [0, 0, 0], body: [0, 0, 0], ra: [0, 0, 0], la: [0, 0, 0], rl: [0, 0, 0], ll: [0, 0, 0], lift: 0 };
      const e = moveOf(self.pose)(t); for (const k in e) A[k] = e[k];
      return A;
    }
    function draw() {
      const W = cv.width, H = cv.height; g.clearRect(0, 0, W, H);
      if (self.bg) { g.fillStyle = self.bg; g.fillRect(0, 0, W, H); } // a background colour, for pictures and videos
      if (!img) return;
      const d = img.data, A = angles(), sc = (H / 46) * self.zoom, cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
      const quads = [];
      const pt = (name, x, y, z) => {
        const a = A[name], pv = PIV[name];
        let X = x - pv[0], Y = y - pv[1], Z = z - pv[2];
        if (a[2]) { const c = Math.cos(a[2]), s2 = Math.sin(a[2]); const x2 = X * c - Y * s2; Y = X * s2 + Y * c; X = x2; }   // same order as the WebGL viewer: z, then y, then x
        if (a[1]) { const c = Math.cos(a[1]), s2 = Math.sin(a[1]); const x2 = X * c + Z * s2; Z = -X * s2 + Z * c; X = x2; }
        if (a[0]) { const c = Math.cos(a[0]), s2 = Math.sin(a[0]); const y2 = Y * c - Z * s2; Z = Y * s2 + Z * c; Y = y2; }
        X += pv[0]; Y += pv[1] - 16 + A.lift; Z += pv[2];
        const x3 = X * cy + Z * sy, z3 = -X * sy + Z * cy;       // turn left/right
        const y4 = Y * cp - z3 * sp, z4 = Y * sp + z3 * cp;       // tilt
        const f = 90 / (90 - z4);                                 // a little perspective
        return [W / 2 + x3 * f * sc, H / 2 - y4 * f * sc, z4];
      };
      const col = (o, k) => "rgba(" + Math.round(d[o] * k) + "," + Math.round(d[o + 1] * k) + "," + Math.round(d[o + 2] * k) + "," + (d[o + 3] / 255) + ")";
      const zq = (a, b, c, e) => (a[2] + b[2] + c[2] + e[2]) / 4;
      for (const [name, u, v, w, h, dp, cx, cyy, cz, inf0] of parts()) {
        if (inf0 > 0 && self.showOuter === false) continue; // outer layer hidden
        const vox = self.layers3d && inf0 > 0;          // 3D skin layers: the second layer becomes little blocks
        const inf = vox ? (name === "head" ? 0.7 : 0.55) : inf0;
        // each face: texture corner, columns, rows, and a function texel corner (i,j) -> model point
        const faces = (n) => {
          const sx = (w + 2 * n) / w, sy2 = (h + 2 * n) / h, sz = (dp + 2 * n) / dp, top = cyy + h / 2 * sy2;
          return [
            [u + dp, v + dp, w, h, (i, j) => [cx + (-w / 2 + i) * sx, top - j * sy2, cz + dp / 2 * sz]],               // front
            [u + 2 * dp + w, v + dp, w, h, (i, j) => [cx + (w / 2 - i) * sx, top - j * sy2, cz - dp / 2 * sz]],       // back
            [u, v + dp, dp, h, (i, j) => [cx - w / 2 * sx, top - j * sy2, cz + (-dp / 2 + i) * sz]],                  // player's right
            [u + dp + w, v + dp, dp, h, (i, j) => [cx + w / 2 * sx, top - j * sy2, cz + (dp / 2 - i) * sz]],          // player's left
            [u + dp, v, w, dp, (i, j) => [cx + (-w / 2 + i) * sx, top, cz + (-dp / 2 + j) * sz]],                     // top
            [u + dp + w, v, w, dp, (i, j) => [cx + (-w / 2 + i) * sx, top - h * sy2, cz + (-dp / 2 + j) * sz]],       // bottom
          ];
        };
        const F = faces(inf);
        for (let fi = 0; fi < 6; fi++) {
          const [fu, fv, cols, rows, fn] = F[fi];
          // corners of the whole face, to drop faces that look away (not for the thin see-through layer)
          const c00 = pt(name, ...fn(0, 0)), c10 = pt(name, ...fn(cols, 0)), c01 = pt(name, ...fn(0, rows));
          let cross = (c10[0] - c00[0]) * (c01[1] - c00[1]) - (c10[1] - c00[1]) * (c01[0] - c00[0]);
          if (fi === 5) cross = -cross; // the bottom is seen from below
          if (!inf0 && cross <= 0) continue;
          const C = cols + 1, grid = [], base = [];
          for (let jj = 0; jj <= rows; jj++) for (let ii = 0; ii <= cols; ii++) {
            grid.push(pt(name, ...fn(ii, jj)));
            if (vox) { const q = fn(ii, jj), nrm = NORMALS[fi]; base.push(pt(name, q[0] - nrm[0] * inf, q[1] - nrm[1] * inf, q[2] - nrm[2] * inf)); } // straight down to the skin
          }
          const shade = cross > 0 ? (fi < 2 ? 1 : fi < 4 ? 0.82 : fi === 4 ? 1 : 0.6) : 0.7;
          const solid = (ii, jj) => ii >= 0 && jj >= 0 && ii < cols && jj < rows && d[((fv + jj) * 64 + fu + ii) * 4 + 3] > 0;
          for (let jj = 0; jj < rows; jj++) for (let ii = 0; ii < cols; ii++) {
            const o = ((fv + jj) * 64 + fu + ii) * 4;
            if (!d[o + 3]) continue;
            const k = [jj * C + ii, jj * C + ii + 1, (jj + 1) * C + ii + 1, (jj + 1) * C + ii];
            const a = grid[k[0]], b = grid[k[1]], c = grid[k[2]], e = grid[k[3]];
            if (!vox || cross > 0) quads.push([zq(a, b, c, e), a, b, c, e, col(o, shade)]);
            if (vox) { // walls of the little block where the pixel next to it is empty
              const nb = [[0, -1], [1, 0], [0, 1], [-1, 0]];
              for (let m = 0; m < 4; m++) {
                if (solid(ii + nb[m][0], jj + nb[m][1])) continue;
                const p1 = grid[k[m]], p2 = grid[k[(m + 1) % 4]], q2 = base[k[(m + 1) % 4]], q1 = base[k[m]];
                // walls that look away from you are not drawn
                let area = (p2[0] - p1[0]) * (q1[1] - p1[1]) - (p2[1] - p1[1]) * (q1[0] - p1[0]);
                if (fi === 5) area = -area;
                if (area >= 0) continue;
                quads.push([zq(p1, p2, q2, q1), p1, p2, q2, q1, col(o, m % 2 ? 0.72 : 0.86)]);
              }
            }
          }
        }
      }
      quads.sort((p, q) => p[0] - q[0]);
      g.lineJoin = "round"; g.lineWidth = 0.7;
      for (const q of quads) {
        g.fillStyle = g.strokeStyle = q[5];
        g.beginPath(); g.moveTo(q[1][0], q[1][1]); g.lineTo(q[2][0], q[2][1]); g.lineTo(q[3][0], q[3][1]); g.lineTo(q[4][0], q[4][1]); g.closePath();
        g.fill(); g.stroke();
      }
    }
    function frame(now) {
      if (dead) return;
      const dt = Math.min(0.1, (now - (last || now)) / 1000); last = now; if (!self.paused) t += dt;
      if (self.autoRotate && !drag && !self.paused) yaw += dt * 0.9;
      try { draw(); } catch (e) {}
      raf = requestAnimationFrame(frame);
    }
    const down = (e) => { drag = [e.clientX, e.clientY, yaw, pitch]; try { cv.setPointerCapture(e.pointerId); } catch (x) {} };
    const move = (e) => { if (!drag) return; yaw = drag[2] + (e.clientX - drag[0]) * 0.012; pitch = Math.max(-1.3, Math.min(1.3, drag[3] + (e.clientY - drag[1]) * 0.012)); };
    const up = () => { drag = null; };
    const wheel = (e) => {
      e.preventDefault(); const n = Math.max(0.6, Math.min(2.4, self.zoom * (e.deltaY > 0 ? 0.93 : 1.07)));
      self.zoom = n; if (self.onZoom) self.onZoom(n);
    };
    cv.addEventListener("pointerdown", down); cv.addEventListener("pointermove", move); cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
    cv.addEventListener("wheel", wheel, { passive: false });
    cv.style.touchAction = "none"; cv.style.cursor = "grab";
    self.loadSkin = (canvas, opt) => { img = canvas.getContext("2d").getImageData(0, 0, 64, 64); slim = !!opt && opt.model === "slim"; };
    self.view = (y, p, at) => { yaw = y; pitch = p; if (at !== undefined) t = at; };
    self.render = () => { try { draw(); } catch (e) {} };
    self.dispose = () => { dead = true; cancelAnimationFrame(raf); cv.removeEventListener("pointerdown", down); cv.removeEventListener("pointermove", move); cv.removeEventListener("pointerup", up); cv.removeEventListener("pointercancel", up); cv.removeEventListener("wheel", wheel); };
    raf = requestAnimationFrame(frame);
  }
  window.FMFPlayer = { EMOTES, MOVES, moveOf, LOOP, buildGltf, SoftViewer };
})();
