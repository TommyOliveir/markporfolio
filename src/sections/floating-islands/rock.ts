// Floating rocks: lathe-turned pillars carved with noise and painted stone and moss.

import { BufferAttribute, Color, LatheGeometry, SplineCurve, Vector2, Vector3, type BufferGeometry } from "three";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { fbm, smooth } from "./noise";

export type RockSpec = {
  /** silhouette as [radius, height] pairs from the hanging tip up to the plateau */
  profile: [number, number][];
  seed: number;
  /** how deeply the cliffs are carved */
  rough: number;
};

const rockA = new Color("#6c6862");
const rockB = new Color("#928a7e");
const rockDark = new Color("#2b2927");
const moss = new Color("#2f5a24");
const mossLight = new Color("#5f8a37");

// A lathe-turned pillar, carved with noise into vertical buttresses and ledges, then
// painted with layered stone that darkens underneath and moss where rain and light land.
export function buildRock({ profile, seed, rough }: RockSpec) {
  const outline = new SplineCurve(profile.map(([r, y]) => new Vector2(r, y))).getPoints(80);
  let geo: BufferGeometry = new LatheGeometry(
    outline.map((p) => new Vector2(Math.max(p.x, 0), p.y)),
    84,
  );
  geo.deleteAttribute("uv");
  geo.deleteAttribute("normal");
  geo = mergeVertices(geo, 1e-4);

  const pos = geo.getAttribute("position");
  const v = new Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    if (Math.hypot(v.x, v.z) < 1e-5) continue;
    const ridges = fbm(v.x * 2.1 + seed, v.y * 0.4, v.z * 2.1 + seed); // tall buttresses
    const chips = fbm(v.x * 5.5 + seed, v.y * 4.5, v.z * 5.5, 3); // cracks and chips
    const ledges = Math.sin(v.y * 10 + ridges * 5) * 0.035; // horizontal strata
    const k = 1 + rough * (ridges * 0.95 + chips * 0.45) + ledges;
    pos.setXYZ(i, v.x * k, v.y, v.z * k);
  }
  geo.computeVertexNormals();

  const yMin = profile[0][1];
  const yMax = profile[profile.length - 1][1];
  const nor = geo.getAttribute("normal");
  const colors = new Float32Array(pos.count * 3);
  const c = new Color();
  const m = new Color();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const ny = nor.getY(i);
    const h = (v.y - yMin) / (yMax - yMin); // 0 at the tip, 1 on the plateau
    const grain = fbm(v.x * 2.5 + seed, v.y * 2.5, v.z * 2.5);
    c.copy(rockA).lerp(rockB, (0.5 + 0.5 * Math.sin(v.y * 9 + grain * 3)) * 0.65);
    c.lerp(rockDark, (1 - h) * 0.5 + Math.max(-ny, 0) * 0.25);
    // moss streaks that run down the walls from the jungle above, like rain-fed growth
    const streaks = smooth(0.12, 0.38, fbm(v.x * 3.2 + seed, v.y * 0.25, v.z * 3.2)) * smooth(0.25, 0.85, h);
    const mossy =
      smooth(0.25, 0.7, ny + grain * 0.5) * smooth(0.35, 0.7, h) +
      smooth(0.84, 0.97, h + grain * 0.12) * 0.85 +
      streaks * 0.75;
    m.copy(moss).lerp(mossLight, 0.5 + grain);
    c.lerp(m, Math.min(mossy, 1));
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute("color", new BufferAttribute(colors, 3));
  return geo;
}
