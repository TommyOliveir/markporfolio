// Where things are in the Molo map: the frames the church and mansion are drawn in, where Mark waits,
// where the visitor starts, and the landmarks that show a little card when you walk up to them.
// Positions are metres from the middle of Molo Plaza, x = east, z = south (see molo-map.ts).

import { postcardShops } from "@/sections/postcards/content";
import { ORIGIN } from "./molo-map";

/** A local drawing frame: its origin in the map, and how far it's turned (three.js rotation.y). */
export type Frame = { x: number; z: number; angle: number };

/** Local (x, z) in a frame → map (x, z). Local +z is the way the building faces. */
export function toWorld(f: Frame, lx: number, lz: number): [number, number] {
  const c = Math.cos(f.angle);
  const s = Math.sin(f.angle);
  return [f.x + lx * c + lz * s, f.z - lx * s + lz * c];
}

/** Map (x, z) → local (x, z) in a frame. */
export function toLocal(f: Frame, x: number, z: number): [number, number] {
  const c = Math.cos(f.angle);
  const s = Math.sin(f.angle);
  const dx = x - f.x;
  const dz = z - f.z;
  return [dx * c - dz * s, dx * s + dz * c];
}

/** Latitude/longitude → map metres. */
export function fromLatLon(lat: number, lon: number): [number, number] {
  const kx = Math.cos((ORIGIN.lat * Math.PI) / 180) * 111320;
  return [(lon - ORIGIN.lon) * kx, -(lat - ORIGIN.lat) * 110574];
}

// St. Anne's: origin at the middle of the facade, facing west-south-west across Jocson Street to the plaza.
export const CHURCH: Frame = { x: 40.35, z: -40.0, angle: -1.1182 };
// Molo Mansion: origin at the middle of the front wall, under the round portico, facing the fountain roundabout.
export const MANSION: Frame = { x: -62.55, z: 39.45, angle: 2.1249 };

/** The height of the mansion's ground-floor terrace, up the grand staircase. */
export const TERRACE_HEIGHT = 1.5;

export const shop = postcardShops[0];

// Mark waits on the mansion's portico terrace with his postcards.
const [markX, markZ] = toWorld(MANSION, 0.7, 1.5);
export const MARK = { x: markX, z: markZ, y: TERRACE_HEIGHT, facing: MANSION.angle };

// The visitor starts on the church steps, looking out over the plaza.
const [startX, startZ] = toWorld(CHURCH, 0, 7.5);
export const START = { x: startX, z: startZ, facing: CHURCH.angle };

/** Within this many metres of Mark (on the terrace or at the top of the stairs) counts as finding him. */
export const FOUND_RADIUS = 3.6;

/** How far out the map goes. The visitor can't wander past this. */
export const WORLD_RADIUS = 190;

export type Landmark = {
  id: string;
  x: number;
  z: number;
  radius: number;
  title: string;
  kicker: string;
  text: string;
  /** A song that plays while you're near (and the card is open), from `start` seconds in. */
  music?: { src: string; start: number; title: string };
};

const [churchX, churchZ] = toWorld(CHURCH, 0, 4);

/** In front of Iloilo Supermart, on its Avanceña Street side. */
export const SUPERMART = { x: -99, z: -50 };
const [mansionX, mansionZ] = toWorld(MANSION, 0, 8);

// Real places, with a line or two each, shown when the visitor walks near.
export const landmarks: Landmark[] = [
  {
    id: "church",
    x: churchX,
    z: churchZ,
    radius: 20,
    kicker: "1831 – 1888",
    title: "St. Anne Parish Church",
    text: "Molo Church: Gothic-Renaissance, built of coral stone. Sixteen statues of female saints line the aisles inside, which is why Ilonggos call it the feminist church.",
  },
  {
    id: "goddesses",
    x: -14.8,
    z: -30.3,
    radius: 7,
    kicker: "Molo Plaza",
    title: "The six goddesses",
    text: "A white gazebo with six goddesses from Greek mythology, standing guard over the plaza.",
  },
  {
    id: "fountain",
    x: -3.6,
    z: -15.7,
    radius: 7,
    kicker: "Molo Plaza",
    title: "The plaza fountain",
    text: "The heart of the square, restored by the National Historical Commission and reopened in 2022.",
  },
  {
    id: "maria-clara",
    x: 3.3,
    z: 1.7,
    radius: 6,
    kicker: "Monument",
    title: "Maria Clara",
    text: "Moved to the middle of the plaza in the restoration, so she now looks across at the fountain and the goddesses.",
  },
  {
    id: "kalaw",
    x: 43.3,
    z: 57,
    radius: 6,
    kicker: "Monument",
    title: "Pura Villanueva Kalaw",
    text: "Ilongga writer and suffragist, the first queen of the Manila Carnival — and married right here at Molo Church in 1910.",
  },
  {
    id: "pancit",
    x: -48.5,
    z: 51.7,
    radius: 6,
    kicker: "Hungry?",
    title: "Pancit molo",
    text: "Molo gave its name to pancit molo, the dumpling soup Ilonggos grow up on.",
  },
  {
    id: "mansion",
    x: mansionX,
    z: mansionZ,
    radius: 15,
    kicker: "1926",
    title: "Molo Mansion",
    text: `The Yusay-Consing Mansion: neoclassical, with Art Deco touches, restored in 2014–15. Mark's postcards are here, ${shop.hours.replace("- ", "–")}. Up the stairs!`,
  },
  {
    id: "supermart",
    x: SUPERMART.x,
    z: SUPERMART.z,
    radius: 16,
    kicker: "Avanceña Street",
    title: "Iloilo Supermart",
    text: "Iloilo's home-grown supermarket, with the Jollibee right across the road. You know the jingle.",
    music: { src: encodeURI("/Iloilo Supermart Jingle Full.mp3"), start: 12, title: "the Iloilo Supermart jingle" },
  },
];

/** The card inside St. Anne's, once you're through the door and into the nave. */
export const churchInside: Landmark = {
  id: "church-inside",
  x: CHURCH.x,
  z: CHURCH.z,
  radius: 0,
  kicker: "Inside St. Anne's",
  title: "The sixteen saints",
  text: "Eight female saints on the columns each side of the nave, leading you up to St. Anne herself on the altar. Listen to the bells!",
};

/** Google Maps directions to the mansion, for the "found him" card. */
export const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${shop.geo.latitude},${shop.geo.longitude}`;
