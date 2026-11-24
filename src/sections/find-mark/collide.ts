// What the visitor bumps into, and how they find their way around it.
// Everything is flat (seen from above): walls are line segments with a height, posts and trunks are circles.
// A coarse grid keeps each lookup to the few things nearby.

export type Seg = { ax: number; az: number; bx: number; bz: number; h: number };
export type Circle = { x: number; z: number; r: number; h: number };

const CELL = 8;

export class Obstacles {
  private grid = new Map<number, { segs: Seg[]; circles: Circle[] }>();
  /** Solid footprints (buildings), kept whole so the path grid can fill them in. */
  readonly polygons: number[][] = [];
  readonly segs: Seg[] = [];
  readonly circles: Circle[] = [];

  private key(cx: number, cz: number) {
    return (cx + 1000) * 4096 + (cz + 1000);
  }
  private bucket(cx: number, cz: number) {
    const k = this.key(cx, cz);
    let b = this.grid.get(k);
    if (!b) {
      b = { segs: [], circles: [] };
      this.grid.set(k, b);
    }
    return b;
  }

  addSegment(ax: number, az: number, bx: number, bz: number, h = 10) {
    const s: Seg = { ax, az, bx, bz, h };
    this.segs.push(s);
    const x0 = Math.floor(Math.min(ax, bx) / CELL);
    const x1 = Math.floor(Math.max(ax, bx) / CELL);
    const z0 = Math.floor(Math.min(az, bz) / CELL);
    const z1 = Math.floor(Math.max(az, bz) / CELL);
    for (let cx = x0; cx <= x1; cx++) for (let cz = z0; cz <= z1; cz++) this.bucket(cx, cz).segs.push(s);
  }

  /** A closed footprint, as a flat [x0, z0, x1, z1, …] list. */
  addPolygon(pts: number[], h = 10) {
    this.polygons.push(pts);
    const n = pts.length / 2;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      this.addSegment(pts[i * 2], pts[i * 2 + 1], pts[j * 2], pts[j * 2 + 1], h);
    }
  }

  /** A post, trunk or statue. `onRoutes: false` keeps it out of the route planner (slim columns you can slip between). */
  addCircle(x: number, z: number, r: number, h = 3, onRoutes = true) {
    const c: Circle = { x, z, r, h };
    if (onRoutes) this.circles.push(c);
    for (let cx = Math.floor((x - r) / CELL); cx <= Math.floor((x + r) / CELL); cx++)
      for (let cz = Math.floor((z - r) / CELL); cz <= Math.floor((z + r) / CELL); cz++)
        this.bucket(cx, cz).circles.push(c);
  }

  private near(x: number, z: number, pad: number, fn: (b: { segs: Seg[]; circles: Circle[] }) => void) {
    for (let cx = Math.floor((x - pad) / CELL); cx <= Math.floor((x + pad) / CELL); cx++)
      for (let cz = Math.floor((z - pad) / CELL); cz <= Math.floor((z + pad) / CELL); cz++) {
        const b = this.grid.get(this.key(cx, cz));
        if (b) fn(b);
      }
  }

  /**
   * Pushes a round body of radius `r` out of anything it overlaps. `extra` are moving things
   * (jeepneys, people) checked the same way. Changes `p` in place.
   */
  resolve(p: { x: number; z: number }, r: number, extra: Circle[] = []) {
    for (let pass = 0; pass < 3; pass++) {
      this.near(p.x, p.z, r + 1, (b) => {
        for (const s of b.segs) pushFromSeg(p, s, r);
        for (const c of b.circles) pushFromCircle(p, c, r);
      });
      for (const c of extra) pushFromCircle(p, c, r);
    }
  }

  /**
   * How far along the line from A to B (0–1) before something taller than the line gets in the way,
   * for pulling the camera in front of walls. 1 = clear.
   */
  firstHit(ax: number, ay: number, az: number, bx: number, by: number, bz: number) {
    let best = 1;
    const minX = Math.min(ax, bx);
    const maxX = Math.max(ax, bx);
    const minZ = Math.min(az, bz);
    const maxZ = Math.max(az, bz);
    const seen = new Set<Seg>();
    for (let cx = Math.floor(minX / CELL); cx <= Math.floor(maxX / CELL); cx++)
      for (let cz = Math.floor(minZ / CELL); cz <= Math.floor(maxZ / CELL); cz++) {
        const b = this.grid.get(this.key(cx, cz));
        if (!b) continue;
        for (const s of b.segs) {
          if (seen.has(s)) continue;
          seen.add(s);
          const t = segmentHit(ax, az, bx, bz, s);
          if (t !== null && t < best && ay + (by - ay) * t < s.h) best = t;
        }
      }
    return best;
  }
}

function pushFromSeg(p: { x: number; z: number }, s: Seg, r: number) {
  const dx = s.bx - s.ax;
  const dz = s.bz - s.az;
  const len2 = dx * dx + dz * dz || 1e-9;
  const t = Math.max(0, Math.min(1, ((p.x - s.ax) * dx + (p.z - s.az) * dz) / len2));
  const qx = s.ax + dx * t;
  const qz = s.az + dz * t;
  let nx = p.x - qx;
  let nz = p.z - qz;
  const d = Math.hypot(nx, nz);
  if (d >= r) return;
  if (d < 1e-6) {
    nx = -dz;
    nz = dx;
  }
  const k = Math.hypot(nx, nz) || 1;
  p.x = qx + (nx / k) * r;
  p.z = qz + (nz / k) * r;
}

function pushFromCircle(p: { x: number; z: number }, c: Circle, r: number) {
  const dx = p.x - c.x;
  const dz = p.z - c.z;
  const d = Math.hypot(dx, dz);
  const min = c.r + r;
  if (d >= min) return;
  const k = d < 1e-6 ? 1 : d;
  p.x = c.x + ((d < 1e-6 ? 1 : dx) / k) * min;
  p.z = c.z + ((d < 1e-6 ? 0 : dz) / k) * min;
}

function segmentDistance(x: number, z: number, s: Seg) {
  const dx = s.bx - s.ax;
  const dz = s.bz - s.az;
  const len2 = dx * dx + dz * dz || 1e-9;
  const t = Math.max(0, Math.min(1, ((x - s.ax) * dx + (z - s.az) * dz) / len2));
  return Math.hypot(x - s.ax - dx * t, z - s.az - dz * t);
}

function segmentHit(ax: number, az: number, bx: number, bz: number, s: Seg) {
  const rx = bx - ax;
  const rz = bz - az;
  const sx = s.bx - s.ax;
  const sz = s.bz - s.az;
  const den = rx * sz - rz * sx;
  if (Math.abs(den) < 1e-9) return null;
  const qx = s.ax - ax;
  const qz = s.az - az;
  const t = (qx * sz - qz * sx) / den;
  const u = (qx * rz - qz * rx) / den;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? t : null;
}

/** Is (x, z) inside a closed flat-list polygon? */
export function inside(pts: number[], x: number, z: number) {
  let hit = false;
  const n = pts.length / 2;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = pts[i * 2];
    const zi = pts[i * 2 + 1];
    const xj = pts[j * 2];
    const zj = pts[j * 2 + 1];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) hit = !hit;
  }
  return hit;
}

// ---------------------------------------------------------------------------------------------
// Path finding: a half-metre grid over the map, A* across it, then the zig-zags pulled straight.
// A cell is closed if a body standing at its centre would overlap something.

const RES = 0.5;
const CLEARANCE = 0.45; // a body's radius, plus a little room

export class WalkGrid {
  readonly size: number;
  readonly half: number;
  private blocked: Uint8Array;
  private scratch: { cost: Float64Array; from: Int32Array; done: Uint8Array } | null = null;

  constructor(obstacles: Obstacles, radius: number) {
    this.half = Math.ceil(radius / RES);
    this.size = this.half * 2;
    const n = this.size;
    const blocked = new Uint8Array(n * n);
    this.blocked = blocked;

    // visits every cell whose centre lies in a box (map metres)
    const each = (x0: number, z0: number, x1: number, z1: number, fn: (i: number, cx: number, cz: number) => void) => {
      const [gx0, gz0] = this.cell(x0, z0);
      const [gx1, gz1] = this.cell(x1, z1);
      for (let gz = Math.max(gz0, 0); gz <= Math.min(gz1, n - 1); gz++)
        for (let gx = Math.max(gx0, 0); gx <= Math.min(gx1, n - 1); gx++) {
          const i = gz * n + gx;
          if (!blocked[i]) fn(i, ...this.centre(gx, gz));
        }
    };

    // walls and fences, including every footprint's outline
    for (const s of obstacles.segs) {
      const c = CLEARANCE;
      each(
        Math.min(s.ax, s.bx) - c,
        Math.min(s.az, s.bz) - c,
        Math.max(s.ax, s.bx) + c,
        Math.max(s.az, s.bz) + c,
        (i, cx, cz) => {
          if (segmentDistance(cx, cz, s) < c) blocked[i] = 1;
        },
      );
    }
    // the insides of buildings
    for (const pts of obstacles.polygons) {
      let x0 = Infinity;
      let x1 = -Infinity;
      let z0 = Infinity;
      let z1 = -Infinity;
      for (let i = 0; i < pts.length; i += 2) {
        x0 = Math.min(x0, pts[i]);
        x1 = Math.max(x1, pts[i]);
        z0 = Math.min(z0, pts[i + 1]);
        z1 = Math.max(z1, pts[i + 1]);
      }
      each(x0, z0, x1, z1, (i, cx, cz) => {
        if (inside(pts, cx, cz)) blocked[i] = 1;
      });
    }
    // posts, trunks, statues, the fountain
    for (const c of obstacles.circles) {
      const r = c.r + CLEARANCE;
      each(c.x - r, c.z - r, c.x + r, c.z + r, (i, cx, cz) => {
        if (Math.hypot(cx - c.x, cz - c.z) < r) blocked[i] = 1;
      });
    }
  }

  cell(x: number, z: number): [number, number] {
    return [Math.floor(x / RES) + this.half, Math.floor(z / RES) + this.half];
  }
  centre(gx: number, gz: number): [number, number] {
    return [(gx - this.half + 0.5) * RES, (gz - this.half + 0.5) * RES];
  }
  free(gx: number, gz: number) {
    return gx >= 0 && gz >= 0 && gx < this.size && gz < this.size && !this.blocked[gz * this.size + gx];
  }

  /**
   * The nearest open ground to (x, z) with `room` metres clear all round (for setting a balloon down),
   * searching up to `within` metres away; null if there's none.
   */
  openGround(x: number, z: number, room: number, within = 40): [number, number] | null {
    const [gx, gz] = this.cell(x, z);
    const reach = Math.ceil(within / RES);
    const ring = Math.ceil(room / RES);
    const clear = (cx: number, cz: number) => {
      for (let dz = -ring; dz <= ring; dz += 2)
        for (let dx = -ring; dx <= ring; dx += 2) {
          if (dx * dx + dz * dz > ring * ring) continue;
          if (!this.free(cx + dx, cz + dz)) return false;
        }
      return true;
    };
    for (let r = 0; r <= reach; r++)
      for (let dz = -r; dz <= r; dz++)
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
          if (clear(gx + dx, gz + dz)) return this.centre(gx + dx, gz + dz);
        }
    return null;
  }

  /** Nearest open cell to a point (a click on a wall walks you to its foot). */
  private nearestFree(gx: number, gz: number): [number, number] | null {
    if (this.free(gx, gz)) return [gx, gz];
    for (let r = 1; r < 40; r++)
      for (let dz = -r; dz <= r; dz++)
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
          if (this.free(gx + dx, gz + dz)) return [gx + dx, gz + dz];
        }
    return null;
  }

  private lineClear(ax: number, az: number, bx: number, bz: number) {
    const steps = Math.ceil(Math.hypot(bx - ax, bz - az) / (RES * 0.4));
    for (let k = 1; k < steps; k++) {
      const [gx, gz] = this.cell(ax + ((bx - ax) * k) / steps, az + ((bz - az) * k) / steps);
      if (!this.free(gx, gz)) return false;
    }
    return true;
  }

  /** Route from A to B as a list of corner points (map metres), or null if there's no way through. */
  find(ax: number, az: number, bx: number, bz: number): [number, number][] | null {
    const n = this.size;
    const s = this.nearestFree(...this.cell(ax, az));
    const g = this.nearestFree(...this.cell(bx, bz));
    if (!s || !g) return null;
    const start = s[1] * n + s[0];
    const goal = g[1] * n + g[0];

    // full-precision costs: rounding them to 32 bits makes an equal path look cheaper forever.
    // The arrays are kept between searches (the trail is re-planned as you walk).
    this.scratch ??= { cost: new Float64Array(n * n), from: new Int32Array(n * n), done: new Uint8Array(n * n) };
    const { cost, from, done } = this.scratch;
    cost.fill(Infinity);
    from.fill(-1);
    done.fill(0);
    const heap = new Heap();
    const h = (i: number) => {
      const dx = Math.abs((i % n) - g[0]);
      const dz = Math.abs(Math.floor(i / n) - g[1]);
      return Math.max(dx, dz) + 0.414 * Math.min(dx, dz);
    };
    cost[start] = 0;
    heap.push(start, h(start));
    let found = false;
    while (heap.size) {
      const i = heap.pop();
      if (done[i]) continue; // an older, dearer entry for a cell already settled
      done[i] = 1;
      if (i === goal) {
        found = true;
        break;
      }
      const ix = i % n;
      const iz = Math.floor(i / n);
      for (let dz = -1; dz <= 1; dz++)
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dz) continue;
          const x = ix + dx;
          const z = iz + dz;
          if (!this.free(x, z)) continue;
          if (dx && dz && (!this.free(ix + dx, iz) || !this.free(ix, iz + dz))) continue; // no cutting corners
          const j = z * n + x;
          if (done[j]) continue;
          const c = cost[i] + (dx && dz ? 1.414 : 1);
          if (c < cost[j]) {
            cost[j] = c;
            from[j] = i;
            heap.push(j, c + h(j));
          }
        }
    }
    if (!found) return null;

    const cells: [number, number][] = [];
    for (let i = goal; i !== -1; i = from[i]) cells.push(this.centre(i % n, Math.floor(i / n)));
    cells.reverse();
    cells[0] = [ax, az];
    cells[cells.length - 1] = this.free(...this.cell(bx, bz)) ? [bx, bz] : cells[cells.length - 1];

    // pull the staircase of cells into straight runs
    const out: [number, number][] = [cells[0]];
    let i = 0;
    while (i < cells.length - 1) {
      let j = cells.length - 1;
      while (j > i + 1 && !this.lineClear(cells[i][0], cells[i][1], cells[j][0], cells[j][1])) j--;
      out.push(cells[j]);
      i = j;
    }
    return out;
  }
}

class Heap {
  private items: number[] = [];
  private keys: number[] = [];
  get size() {
    return this.items.length;
  }
  push(item: number, key: number) {
    const a = this.items;
    const k = this.keys;
    a.push(item);
    k.push(key);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (k[p] <= k[i]) break;
      [a[p], a[i]] = [a[i], a[p]];
      [k[p], k[i]] = [k[i], k[p]];
      i = p;
    }
  }
  pop() {
    const a = this.items;
    const k = this.keys;
    const top = a[0];
    const lastItem = a.pop()!;
    const lastKey = k.pop()!;
    if (a.length) {
      a[0] = lastItem;
      k[0] = lastKey;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < a.length && k[l] < k[m]) m = l;
        if (r < a.length && k[r] < k[m]) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        [k[m], k[i]] = [k[i], k[m]];
        i = m;
      }
    }
    return top;
  }
}
