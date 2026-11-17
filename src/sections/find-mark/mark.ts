// Mark's corner on the mansion's portico terrace: Mark in his beret and paint-spotted apron, a table of
// postcards, a spinner rack, an easel with the Iloilo City postcard, bunting between the columns, and a
// sandwich board at the foot of the stairs. Over the stairs, a golden beam and a floating pin you can
// see from across the plaza.

import {
  AdditiveBlending,
  CanvasTexture,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  PlaneGeometry,
  SRGBColorSpace,
  ShaderMaterial,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  TextureLoader,
  type Material,
} from "three";
import { postcards } from "@/sections/postcards/content";
import { Kit } from "./kit";
import { boardTexture } from "./labels";
import { Person } from "./people";
import { MANSION, TERRACE_HEIGHT, toWorld } from "./world";

const T = TERRACE_HEIGHT;
// Mark stands at (0.7, 1.5) on the terrace; his easel is at (2.2, 1.1). This is the turn that faces it.
const PAINTING = Math.atan2(2.2 - 0.7, 1.1 - 1.5);

export function buildMarkCorner(material: Material) {
  const group = new Group(); // in the mansion's frame
  group.position.set(MANSION.x, 0, MANSION.z);
  group.rotation.y = MANSION.angle;
  const disposables: { dispose: () => void }[] = [];

  const mark = new Person(
    {
      skin: "#b97a55",
      hair: "#1d1b1a",
      shirt: "#1b8e8e",
      pants: "#3e4a5c",
      hat: "beret",
      hatColor: "#8c2633",
      apron: true,
    },
    material,
  );
  mark.root.position.set(0.7, T, 1.5);
  const brush = new Mesh(new CylinderGeometry(0.012, 0.016, 0.3, 5).translate(0, -0.15, 0), material);
  brush.position.set(0, -0.62, 0.05);
  brush.rotation.x = 1.1;
  mark.armR.add(brush);
  group.add(mark.root);
  disposables.push(mark, brush.geometry);

  const k = new Kit();
  // the postcard table, with a cloth and a runner
  k.box(1.4, 0.04, 0.7, "#fdfaf3", { x: -1.3, y: T + 0.74, z: 1.6 });
  k.box(1.42, 0.3, 0.02, "#fdfaf3", { x: -1.3, y: T + 0.46, z: 1.96 });
  k.box(0.4, 0.045, 0.72, "#b92a4f", { x: -1.3, y: T + 0.745, z: 1.6 });
  for (const [x, z] of [
    [-1.92, 1.32],
    [-0.68, 1.32],
    [-1.92, 1.88],
    [-0.68, 1.88],
  ])
    k.box(0.04, 0.74, 0.04, "#6e3d22", { x, y: T, z });
  const cardColours = ["#d63c62", "#2c56b8", "#f2a516", "#1b8e8e", "#6b4aa6", "#f4d78f", "#e98a7a", "#8fd3ef"];
  for (let i = 0; i < 10; i++) {
    const x = -1.85 + (i % 5) * 0.27;
    const z = 1.42 + Math.floor(i / 5) * 0.3;
    k.box(0.2, 0.012, 0.14, "#fdfaf3", { x, y: T + 0.77, z, ry: (i % 3) * 0.05 - 0.05 });
    k.box(0.17, 0.004, 0.11, cardColours[i % cardColours.length], { x, y: T + 0.783, z, ry: (i % 3) * 0.05 - 0.05 });
  }
  // a palette and a jar of brushes
  k.cyl(0.13, 0.13, 0.015, "#e9d9bd", { x: -0.78, y: T + 0.77, z: 1.75 }, 14);
  cardColours
    .slice(0, 4)
    .forEach((c, i) => k.ball(0.022, c, { x: -0.84 + i * 0.04, y: T + 0.79, z: 1.7 + (i % 2) * 0.05 }, 6, 4));
  k.cyl(0.05, 0.05, 0.14, "#8fd3ef", { x: -1.95, y: T + 0.77, z: 1.45 }, 10);
  for (let i = 0; i < 4; i++)
    k.cyl(
      0.006,
      0.006,
      0.26,
      "#6e3d22",
      { x: -1.95 + (i - 1.5) * 0.015, y: T + 0.82, z: 1.45, rz: (i - 1.5) * 0.12 },
      4,
    );

  // a spinner rack of postcards
  k.cyl(0.025, 0.025, 1.6, "#2a2b2e", { x: -2.5, y: T, z: 0.9 }, 6);
  k.cyl(0.25, 0.3, 0.05, "#2a2b2e", { x: -2.5, y: T, z: 0.9 }, 12);
  for (let tier = 0; tier < 4; tier++)
    for (let s = 0; s < 6; s++) {
      const a = (s / 6) * Math.PI * 2 + tier * 0.4;
      k.box(0.14, 0.2, 0.01, cardColours[(s + tier) % cardColours.length], {
        x: -2.5 + Math.sin(a) * 0.14,
        y: T + 0.55 + tier * 0.26,
        z: 0.9 + Math.cos(a) * 0.14,
        ry: a,
      });
    }

  // the easel, a stool and a bucket
  for (const [x, rz, rx] of [
    [-0.28, 0.12, 0.08],
    [0.28, -0.12, 0.08],
  ])
    k.box(0.04, 1.7, 0.04, "#8a5a3a", { x: 2.2 + x, y: T, z: 1.1, rz, rx });
  k.box(0.04, 1.6, 0.04, "#8a5a3a", { x: 2.2, y: T, z: 0.75, rx: -0.35 });
  k.box(0.7, 0.04, 0.08, "#8a5a3a", { x: 2.2, y: T + 0.6, z: 1.13 });
  k.cyl(0.18, 0.18, 0.5, "#6e3d22", { x: 0.75, y: T, z: 0.95 }, 10);
  k.cyl(0.12, 0.1, 0.25, "#cfd4d8", { x: 1.75, y: T, z: 1.45 }, 10);

  // bunting strung between the columns
  const flagColours = ["#d63c62", "#f2a516", "#1b8e8e", "#2c56b8", "#f4d78f"];
  const a0 = -Math.PI / 2 + (1.5 / 6) * Math.PI;
  const a1 = -Math.PI / 2 + (4.5 / 6) * Math.PI;
  const p0 = [Math.sin(a0) * 3.4, Math.cos(a0) * 3.4];
  const p1 = [Math.sin(a1) * 3.4, Math.cos(a1) * 3.4];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    const x = p0[0] + (p1[0] - p0[0]) * t;
    const z = p0[1] + (p1[1] - p0[1]) * t + Math.sin(t * Math.PI) * 0.6;
    const y = T + 3.25 - Math.sin(t * Math.PI) * 0.35;
    k.add(
      new ConeGeometry(0.12, 0.26, 3).rotateZ(Math.PI).translate(0, -0.13, 0),
      flagColours[i % flagColours.length],
      { x, y, z, ry: 0.4, sz: 0.15 },
    );
  }

  // the sandwich board at the foot of the stairs
  const [boardX, boardZ] = [2.9, 8.4];
  const BOARD_W = 0.9;
  const BOARD_H = 1.25;
  const LEAN = 0.2; // each board leans this far (radians) toward the other
  for (const dir of [1, -1])
    k.box(BOARD_W + 0.08, BOARD_H, 0.04, "#5b3a26", { x: boardX, z: boardZ + dir * 0.25, rx: -dir * LEAN });
  const stall = new Mesh(k.build()!, material);
  stall.castShadow = true;
  stall.receiveShadow = true;
  group.add(stall);
  disposables.push(stall.geometry);

  let boardTex = boardTexture();
  const boardMat = new MeshLambertMaterial({ map: boardTex });
  // the chalkboard faces, one on each side of the A-frame, just proud of the wood
  for (const dir of [1, -1]) {
    const face = new Mesh(new PlaneGeometry(BOARD_W - 0.06, BOARD_H - 0.1), boardMat);
    const half = BOARD_H / 2;
    // the board's middle, after leaning back by LEAN from its foot at z = boardZ + dir * 0.25
    face.position.set(boardX, Math.cos(LEAN) * half, boardZ + dir * (0.25 - Math.sin(LEAN) * half + 0.03));
    face.rotation.set(-LEAN, dir > 0 ? 0 : Math.PI, 0, "YXZ");
    group.add(face);
    disposables.push(face.geometry);
  }
  disposables.push(boardMat);

  // the easel's painting: the real Iloilo City postcard
  const card = postcards.find((c) => c.slug === "iloilo-city") ?? postcards[0];
  const painting = new MeshLambertMaterial({ color: "#f5efe3" });
  new TextureLoader().load(card.src, (tex) => {
    tex.colorSpace = SRGBColorSpace;
    painting.map = tex;
    painting.color = new Color("#ffffff");
    painting.needsUpdate = true;
    disposables.push(tex);
  });
  const canvas = new Mesh(new PlaneGeometry(0.62, 1.1), painting);
  canvas.position.set(2.2, T + 1.2, 1.17);
  canvas.rotation.x = -0.08;
  group.add(canvas);
  disposables.push(canvas.geometry, painting);

  // the beacon over the stairs
  const beaconGroup = new Group();
  const [bx, bz] = toWorld(MANSION, 0, 8.6);
  beaconGroup.position.set(bx, 0, bz);
  const beamMat = new ShaderMaterial({
    uniforms: { uOpacity: { value: 1 }, uNear: { value: 1 }, uColor: { value: new Color("#ffcf6a") } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform float uOpacity;
      uniform float uNear;
      uniform vec3 uColor;
      varying vec2 vUv;
      void main() {
        float a = pow(1.0 - vUv.y, 1.6) * 0.42 * uOpacity * (0.7 + 0.3 * sin(vUv.x * 6.2831 * 3.0));
        a *= mix(uNear, 1.0, smoothstep(0.08, 0.3, vUv.y)); // fainter round your head when you're close
        gl_FragColor = vec4(uColor, a);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    blending: AdditiveBlending,
    fog: false,
  });
  const beam = new Mesh(new CylinderGeometry(1.1, 1.8, 90, 24, 1, true).translate(0, 45, 0), beamMat);
  beam.renderOrder = 5;
  beaconGroup.add(beam);

  const pin = new Group();
  const pinMat = new MeshLambertMaterial({ color: "#d63c62", emissive: "#d63c62", emissiveIntensity: 0.5 });
  const pinHead = new Mesh(new SphereGeometry(1.1, 24, 16), pinMat);
  pinHead.position.y = 1.5;
  const pinTip = new Mesh(new ConeGeometry(0.95, 2.2, 24).rotateX(Math.PI), pinMat);
  pinTip.position.y = 0.25;
  const pinDot = new Mesh(new SphereGeometry(0.45, 16, 12), new MeshBasicMaterial({ color: "#fdfaf3" }));
  pinDot.position.set(0, 1.55, 0.85);
  pin.add(pinHead, pinTip, pinDot);
  pin.position.y = 17;
  beaconGroup.add(pin);
  disposables.push(beamMat, beam.geometry, pinMat, pinHead.geometry, pinTip.geometry, pinDot.geometry, pinDot.material);

  const labelMat = new SpriteMaterial({ map: labelTexture(), depthWrite: false, fog: false });
  const label = new Sprite(labelMat);
  label.scale.set(13, 3.25, 1);
  label.position.y = 21.6;
  label.renderOrder = 6;
  beaconGroup.add(label);
  disposables.push(labelMat);

  return {
    group,
    beacon: beaconGroup,
    mark,
    update(t: number, found: boolean, distance: number, towardPlayer: number) {
      // Mark turns to wave when you come close; otherwise he's painting
      const near = distance < 14;
      const want = near || found ? towardPlayer - MANSION.angle : PAINTING;
      let d = want - mark.root.rotation.y;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      mark.root.rotation.y += d * 0.08;
      mark.animate(1 / 60, 0, t);
      if (near || found) mark.wave(t);
      else mark.paint(t);
      pin.position.y = 17 + Math.sin(t * 2) * 0.6;
      pin.rotation.y = t * 1.2;
      // the beam thins out as you get close (so you can see Mark), and goes for good once you've found him
      const fade = found ? Math.max(0, beamMat.uniforms.uOpacity.value - 0.02) : 1;
      beamMat.uniforms.uOpacity.value = fade;
      beamMat.uniforms.uNear.value = Math.min(Math.max((distance - 8) / 30, 0.08), 1);
      pin.visible = label.visible = fade > 0.05;
    },
    /** Paints the board and the label again once the site's fonts have loaded. */
    repaint() {
      boardMat.map?.dispose();
      boardTex = boardTexture();
      boardMat.map = boardTex;
      labelMat.map?.dispose();
      labelMat.map = labelTexture();
      boardMat.needsUpdate = labelMat.needsUpdate = true;
    },
    dispose() {
      disposables.forEach((d) => d.dispose());
      boardMat.map?.dispose();
      labelMat.map?.dispose();
    },
  };
}

function labelTexture() {
  const css = getComputedStyle(document.documentElement);
  const script = css.getPropertyValue("--font-cedarville").trim() || "cursive";
  const caps = css.getPropertyValue("--font-cinzel").trim() || "Georgia, serif";
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(253, 250, 243, 0.92)";
  ctx.beginPath();
  ctx.roundRect(140, 30, 744, 196, 98);
  ctx.fill();
  ctx.fillStyle = "#b92a4f";
  ctx.font = `600 40px ${caps}`;
  ctx.letterSpacing = "10px";
  ctx.fillText("POSTCARDS HERE", 512, 95);
  ctx.fillStyle = "#1d1b2a";
  ctx.font = `96px ${script}`;
  ctx.letterSpacing = "0px";
  ctx.fillText("Mark is here!", 512, 195);
  const t = new CanvasTexture(canvas);
  t.colorSpace = SRGBColorSpace;
  return t;
}
