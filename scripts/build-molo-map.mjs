// Downloads the streets, buildings, paths, lawns and trees around Molo Plaza from OpenStreetMap and
// writes them to src/sections/find-mark/molo-map.ts, in metres from the middle of the plaza
// (x = east, z = south, which is how three.js lays out a map seen from above).
//
//   node scripts/build-molo-map.mjs
//
// Map data © OpenStreetMap contributors, available under the Open Database Licence (ODbL).
// The page that shows it credits OpenStreetMap, so keep that credit if you change the page.

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// The middle of Molo Plaza. Molo Mansion (10.6965183, 122.5434615) is about 80 m to the west.
const LAT0 = 10.6969;
const LON0 = 122.5441;
const BUILDING_RADIUS = 240; // buildings whose middle is closer than this are kept
const LINE_RADIUS = 340; // roads are cut off past this
const OUT = fileURLToPath(new URL("../src/sections/find-mark/molo-map.ts", import.meta.url));

// The two buildings drawn by hand in detail; the rest are extruded from their footprints.
const CHURCH = 170832522;
const MANSION = 343842931;

// Shops and places worth a painted sign. Chain brands are left out on purpose.
const SIGNS = new Set([
  "Molo Post Office",
  "Café Panay",
  "Coffee Stroll",
  "Cafe et Al",
  "Plantopia",
  "Kurukape",
  "Pancit Mo-lo",
  "Kap Ising's Pancit Molo",
  "Ramboys",
  "Molo Public Market",
  "Molo District Health Center",
  "Iloilo Police Station № 4",
  "Convento de Molo",
  "Bahay Pamahalaan ng Barangay Katilingban",
  "Mini-l Golf sa Mansion",
  "Iloilo Supermart",
]);

const kx = Math.cos((LAT0 * Math.PI) / 180) * 111320;
const kz = 110574;
const r1 = (v) => Math.round(v * 10) / 10;
const project = (p) => [r1((p.lon - LON0) * kx), r1(-(p.lat - LAT0) * kz)];
const flat = (pts) => pts.flat();

async function download() {
  const s = LAT0 - 0.0032;
  const n = LAT0 + 0.0032;
  const w = LON0 - 0.0032;
  const e = LON0 + 0.0032;
  const bbox = `(${s},${w},${n},${e})`;
  const query = `[out:json][timeout:90];
(
  way${bbox};
  relation${bbox}[type=multipolygon];
  node${bbox}[natural=tree];
  node${bbox}[amenity];
  node${bbox}[tourism];
  node${bbox}[man_made];
  node${bbox}[leisure];
  node${bbox}[barrier];
  node${bbox}[highway=crossing];
);
out body geom;`;
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "molo-map-builder/1.0" },
      body: new URLSearchParams({ data: query }),
    });
    if (res.ok) return res.json();
    const wait = 2000 * 2 ** attempt;
    console.warn(`Overpass answered ${res.status}; trying again in ${wait / 1000}s…`);
    await new Promise((r) => setTimeout(r, wait));
  }
  throw new Error("Overpass is busy. Try again in a few minutes.");
}

const area = (pts) => {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, z1] = pts[i];
    const [x2, z2] = pts[(i + 1) % pts.length];
    a += x1 * z2 - x2 * z1;
  }
  return a / 2;
};
const centroid = (pts) => [
  pts.reduce((s, p) => s + p[0], 0) / pts.length,
  pts.reduce((s, p) => s + p[1], 0) / pts.length,
];
const dist = (p) => Math.hypot(p[0], p[1]);
const closed = (pts) => {
  const ring = pts.slice();
  if (ring.length > 1 && ring[0][0] === ring.at(-1)[0] && ring[0][1] === ring.at(-1)[1]) ring.pop();
  return ring;
};
// Stable small number from an id, so a building keeps its height and colours between runs.
const hash = (id) => {
  let h = id % 2147483647;
  h = h ^ 61 ^ (h >>> 16);
  h = (h + (h << 3)) | 0;
  h ^= h >>> 4;
  h = Math.imul(h, 0x27d4eb2d);
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
};

// Joins the separate ways of a multipolygon's outer edge into closed rings.
function stitch(members) {
  const parts = members.filter((m) => m.role === "outer" && m.geometry).map((m) => m.geometry.map(project));
  const rings = [];
  const same = (a, b) => Math.abs(a[0] - b[0]) < 0.05 && Math.abs(a[1] - b[1]) < 0.05;
  while (parts.length) {
    let ring = parts.shift();
    let grew = true;
    while (!same(ring[0], ring.at(-1)) && grew) {
      grew = false;
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        if (same(ring.at(-1), p[0])) ring = ring.concat(p.slice(1));
        else if (same(ring.at(-1), p.at(-1))) ring = ring.concat(p.slice(0, -1).reverse());
        else if (same(ring[0], p.at(-1))) ring = p.slice(0, -1).concat(ring);
        else if (same(ring[0], p[0])) ring = p.slice(1).reverse().concat(ring);
        else continue;
        parts.splice(i, 1);
        grew = true;
        break;
      }
    }
    rings.push(closed(ring));
  }
  return rings;
}

// Cuts a line down to the part inside a circle (keeping whole segments that cross it).
function clipLine(pts, radius) {
  const out = [];
  let run = [];
  for (let i = 0; i < pts.length; i++) {
    const inside =
      dist(pts[i]) < radius ||
      (i > 0 && dist(pts[i - 1]) < radius) ||
      (i < pts.length - 1 && dist(pts[i + 1]) < radius);
    if (inside) run.push(pts[i]);
    else if (run.length) {
      if (run.length > 1) out.push(run);
      run = [];
    }
  }
  if (run.length > 1) out.push(run);
  return out;
}

function buildingKind(t) {
  if (t.building === "roof") return "canopy";
  if (t.amenity === "place_of_worship" || t.building === "chapel" || t.amenity === "place_of_mourning") return "chapel";
  if (t.historic) return "heritage";
  if (t.building === "civic" || t.amenity === "townhall" || t.amenity === "police") return "civic";
  if (["retail", "commercial", "supermarket"].includes(t.building) || t.shop) return "shop";
  return "house";
}

function levels(t, a, id) {
  const tagged = parseInt(t["building:levels"], 10);
  if (tagged > 0) return Math.min(tagged, 6);
  const h = hash(id);
  if (t.building === "roof") return 1;
  if (a < 45) return 1;
  if (a < 150) return h < 0.4 ? 2 : 1;
  if (a < 500) return h < 0.25 ? 3 : 2;
  return h < 0.4 ? 3 : 2;
}

const ROAD_WIDTH = {
  primary: 10,
  secondary: 8,
  tertiary: 7,
  unclassified: 6,
  residential: 5.5,
  living_street: 5,
  service: 3.6,
};
const AREA_KIND = (t) => {
  if (t.amenity === "fountain") return "fountain";
  if (t.amenity === "shelter") return "gazebo";
  if (t.tourism === "artwork") return "monument";
  if (t.leisure === "playground") return "playground";
  if (t.leisure === "fitness_station") return "fitness";
  if (t.leisure === "park") return "plaza";
  if (t.leisure === "garden") return "garden";
  if (t.landuse === "grass") return "grass";
  if (t.landuse === "forest" || t.natural === "wood") return "grove";
  if (t.amenity === "parking") return "parking";
  if (t.landuse === "religious") return "churchyard";
  if (t.highway === "pedestrian" || t.amenity === "marketplace") return "paving";
  if (t.landuse === "retail" && t.name === "Molo Mansion") return "mansion-grounds";
  return null;
};

const data = await download();
const out = {
  church: [],
  mansion: [],
  buildings: [],
  roads: [],
  paths: [],
  areas: [],
  trees: [],
  treeRows: [],
  benches: [],
  crossings: [],
  gates: [],
  points: [],
  signs: [],
};

for (const e of data.elements) {
  const t = e.tags ?? {};
  if (e.type === "node") {
    const p = project(e);
    if (dist(p) > LINE_RADIUS) continue;
    if (t.natural === "tree") out.trees.push(...p);
    else if (t.amenity === "bench") out.benches.push(...p);
    else if (t.highway === "crossing" && (t["crossing:markings"] ?? "").startsWith("zebra")) out.crossings.push(...p);
    else if (t.barrier === "gate") out.gates.push(...p);
    else if (t.man_made === "flagpole") out.points.push({ kind: "flagpole", at: p });
    else if (t.tourism === "artwork" && t.subject) out.points.push({ kind: "statue", at: p, name: t.subject });
    else if (t.tourism === "artwork") out.points.push({ kind: "artwork", at: p, name: t["name:en"] ?? t.name ?? "" });
    else if (t.amenity === "fountain") out.points.push({ kind: "fountain", at: p });
    else if (t.tourism === "information" && t.name) out.points.push({ kind: "welcome-sign", at: p, name: t.name });
    if (t.name && SIGNS.has(t.name)) out.signs.push({ name: t.name, at: p });
    continue;
  }

  const rings = e.type === "relation" ? stitch(e.members ?? []) : e.geometry ? [e.geometry.map(project)] : [];
  if (!rings.length) continue;
  const pts = rings[0];

  if (e.id === CHURCH) out.church = flat(closed(pts));
  else if (e.id === MANSION) out.mansion = flat(closed(pts));
  else if (t.building) {
    const ring = closed(pts);
    if (ring.length < 3 || dist(centroid(ring)) > BUILDING_RADIUS) continue;
    const a = Math.abs(area(ring));
    const b = {
      kind: buildingKind(t),
      levels: levels(t, a, e.id),
      seed: Math.round(hash(e.id) * 1000) / 1000,
      points: flat(ring),
    };
    if (t.name) b.name = t.name;
    out.buildings.push(b);
    if (t.name && SIGNS.has(t.name)) out.signs.push({ name: t.name, at: centroid(ring).map(r1) });
  } else if (t.highway && t.area !== "yes" && e.type === "way" && ROAD_WIDTH[t.highway]) {
    for (const run of clipLine(pts, LINE_RADIUS))
      out.roads.push({
        kind: t.highway,
        width: ROAD_WIDTH[t.highway],
        ...(t.name ? { name: t.name } : {}),
        points: flat(run),
      });
  } else if (["footway", "path", "pedestrian", "steps"].includes(t.highway) && t.area !== "yes" && e.type === "way") {
    for (const run of clipLine(pts, BUILDING_RADIUS)) out.paths.push(flat(run));
  } else if (t.natural === "tree_row") {
    out.treeRows.push(flat(pts));
  } else {
    const kind = AREA_KIND(t);
    if (!kind) continue;
    for (const ring of rings) {
      const r = closed(ring);
      if (r.length < 3 || dist(centroid(r)) > LINE_RADIUS) continue;
      out.areas.push({ kind, ...(t.name ? { name: t.name } : {}), points: flat(r) });
    }
    if (t.name && SIGNS.has(t.name)) out.signs.push({ name: t.name, at: centroid(rings[0]).map(r1) });
  }
}

// Hand-added: the Jollibee across Avanceña Street from Iloilo Supermart, and its mascot out front.
out.buildings.unshift({
  kind: "shop",
  levels: 2,
  seed: 0.314,
  points: [-89.6, -31.2, -97.6, -27, -94.4, -20.8, -86.4, -25],
  name: "Jollibee",
});
out.points.push({ kind: "mascot", at: [-97, -30.6], name: "Jollibee" });
out.signs.push({ name: "Jollibee", at: [-92, -25.9], street: "Avanceña Street" });
// Iloilo Supermart's sign goes on its Avanceña Street wall, looking across at the Jollibee.
const supermart = out.signs.find((s) => s.name === "Iloilo Supermart");
if (supermart) Object.assign(supermart, { at: [-100.2, -55], street: "Avanceña Street" });

// Big areas first so smaller ones (a lawn inside the plaza) are drawn on top.
out.areas.sort((a, b) => Math.abs(area(chunk(b.points))) - Math.abs(area(chunk(a.points))));
function chunk(f) {
  const p = [];
  for (let i = 0; i < f.length; i += 2) p.push([f[i], f[i + 1]]);
  return p;
}

const json = (v) => JSON.stringify(v);
const lines = (arr) => `[\n${arr.map((v) => `  ${json(v)},`).join("\n")}\n]`;
const ts = `// Generated by scripts/build-molo-map.mjs — don't edit by hand, run the script again instead.
// Molo, Iloilo City, from OpenStreetMap: © OpenStreetMap contributors, Open Database Licence (ODbL).
// Every position is in metres from the middle of Molo Plaza (${LAT0}, ${LON0}): x = east, z = south.
// Points are flat lists: [x0, z0, x1, z1, …].

export type BuildingKind = "house" | "shop" | "civic" | "heritage" | "chapel" | "canopy";
export type AreaKind =
  | "plaza"
  | "paving"
  | "churchyard"
  | "grass"
  | "garden"
  | "grove"
  | "parking"
  | "playground"
  | "fitness"
  | "fountain"
  | "gazebo"
  | "monument"
  | "mansion-grounds";
export type Building = { kind: BuildingKind; levels: number; seed: number; name?: string; points: number[] };
export type Road = { kind: string; width: number; name?: string; points: number[] };
export type Area = { kind: AreaKind; name?: string; points: number[] };
export type MapPoint = { kind: string; at: number[]; name?: string };

export const ORIGIN = { lat: ${LAT0}, lon: ${LON0} };

/** St. Anne Parish Church (Molo Church), drawn in detail in church.ts. */
export const churchFootprint: number[] = ${json(out.church)};

/** The Yusay-Consing Mansion (Molo Mansion), drawn in detail in mansion.ts. */
export const mansionFootprint: number[] = ${json(out.mansion)};

export const buildings: Building[] = ${lines(out.buildings)};

export const roads: Road[] = ${lines(out.roads)};

export const paths: number[][] = ${lines(out.paths)};

export const areas: Area[] = ${lines(out.areas)};

export const trees: number[] = ${json(out.trees)};

export const treeRows: number[][] = ${lines(out.treeRows)};

export const benches: number[] = ${json(out.benches)};

/** Zebra crossings. */
export const crossings: number[] = ${json(out.crossings)};

export const gates: number[] = ${json(out.gates)};

export const points: MapPoint[] = ${lines(out.points)};

/** Local shops and public buildings that get a painted sign. */
export const signs: { name: string; at: number[]; street?: string }[] = ${lines(out.signs)};
`;

writeFileSync(OUT, ts);
console.log(
  `Wrote ${OUT}: ${out.buildings.length} buildings, ${out.roads.length} roads, ${out.paths.length} paths, ` +
    `${out.areas.length} areas, ${out.trees.length / 2} trees, ${out.signs.length} signs.`,
);
