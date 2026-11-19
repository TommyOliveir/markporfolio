// Puts the whole map together: ground, buildings, the church and mansion in their frames, the plaza's
// furniture and trees, plus everything you can bump into, the heights you can climb (steps, the
// gazebo, the mansion's staircase) and the grid the route planner walks.

import { Group, Mesh, type Material } from "three";
import { buildBuildings } from "./buildings";
import { buildChurch } from "./church";
import { addChurchObstacles, buildChurchInterior, floorLocal } from "./church-interior";
import { Obstacles, WalkGrid } from "./collide";
import { buildGround } from "./ground";
import { Kit } from "./kit";
import { buildMansion, buildReflectingPool } from "./mansion";
import { buildingMaterial, groundMaterial, paintedMaterial } from "./materials";
import { points } from "./molo-map";
import { buildProps, type Platform } from "./props";
import { buildTrees } from "./trees";
import { CHURCH, MANSION, TERRACE_HEIGHT, WORLD_RADIUS, toLocal, toWorld, type Frame } from "./world";

/** Heights you can stand at: the mansion's terrace and stairs, the church steps, raised platforms. */
export class Terrain {
  constructor(private platforms: Platform[]) {}

  heightAt(x: number, z: number) {
    const [mx, mz] = toLocal(MANSION, x, z);
    if (Math.abs(mx) < 3.45 && mz > -0.5 && mz < 7.25) {
      if (mz <= 3.3) return TERRACE_HEIGHT;
      return (TERRACE_HEIGHT * (7.25 - mz)) / 3.95;
    }
    const [cx, cz] = toLocal(CHURCH, x, z);
    const inside = floorLocal(cx, cz);
    if (inside !== null) return inside;
    if (Math.abs(cx) < 6 && cz > 1.8 && cz < 4.5) return (0.45 * (4.5 - cz)) / 2.7;
    for (const p of this.platforms) {
      const d = Math.hypot(x - p.x, z - p.z);
      if (d < p.r) return p.h;
      if (d < p.r + 0.4) return p.h * (1 - (d - p.r) / 0.4);
    }
    return 0;
  }
}

function rectIn(f: Frame, x0: number, x1: number, z0: number, z1: number) {
  return [toWorld(f, x0, z0), toWorld(f, x1, z0), toWorld(f, x1, z1), toWorld(f, x0, z1)].flat();
}

function placed(mesh: Mesh, f: Frame) {
  const g = new Group();
  g.position.set(f.x, 0, f.z);
  g.rotation.y = f.angle;
  g.add(mesh);
  return g;
}

export function buildWorld(lite: boolean) {
  const obstacles = new Obstacles();
  const materials: Material[] = [];
  const keep = <M extends Material>(m: M) => {
    materials.push(m);
    return m;
  };
  const painted = keep(paintedMaterial());
  const root = new Group();

  const ground = new Mesh(buildGround(), keep(groundMaterial()));
  ground.receiveShadow = true;
  root.add(ground);

  // everyday buildings, with water tanks on the flat roofs
  const b = buildBuildings();
  const buildings = new Mesh(b.geometry, keep(buildingMaterial()));
  buildings.castShadow = true;
  buildings.receiveShadow = true;
  root.add(buildings);
  b.footprints.forEach((f) => obstacles.addPolygon(f.points, f.height));
  b.posts.forEach(([x, z]) => obstacles.addCircle(x, z, 0.3, 5));
  const tanks = new Kit();
  for (const [x, y, z, s] of b.tanks) {
    const blue = s > 0.75;
    tanks.cyl(0.65, 0.65, 1.3, blue ? "#2c6fb8" : "#2b2b2e", { x, y: y + 0.7, z }, 14);
    tanks.box(1.5, 0.7, 1.5, "#9a9a96", { x, y, z });
  }
  if (!tanks.empty) {
    const t = new Mesh(tanks.build()!, painted);
    t.castShadow = true;
    root.add(t);
  }

  // St. Anne's
  const church = new Mesh(buildChurch(), painted);
  church.castShadow = true;
  church.receiveShadow = true;
  root.add(placed(church, CHURCH));
  // and its inside: hidden until the camera goes in through the door (see Walk)
  // (a touch of warm glow of its own, as if lit by the windows and chandeliers, so the ceilings
  // don't go muddy in the shade)
  const insideMaterial = keep(paintedMaterial());
  insideMaterial.emissive.set("#2a241c");
  const churchInside = new Mesh(buildChurchInterior(), insideMaterial);
  churchInside.visible = false;
  root.add(placed(churchInside, CHURCH));
  addChurchObstacles(obstacles);

  // Molo Mansion, its terraces and staircase
  const mansion = new Mesh(buildMansion(), painted);
  mansion.castShadow = true;
  mansion.receiveShadow = true;
  const mansionGroup = placed(mansion, MANSION);
  root.add(mansionGroup);
  for (const [x0, x1, z0, z1] of [
    [-9.5, 9.5, -18, 0],
    [3.4, 9.6, -0.2, 2.5],
    [-9.6, -3.4, -0.2, 2.5],
    [-5, 8.9, -26.5, -17.8],
    [9.3, 12.3, -19, -8.7],
    [-11.5, -9.3, -12.2, -3.8],
  ])
    obstacles.addPolygon(rectIn(MANSION, x0, x1, z0, z1), 16);
  for (const side of [-1, 1]) {
    const [ax, az] = toWorld(MANSION, side * 3.5, 2.4);
    const [bx, bz] = toWorld(MANSION, side * 3.5, 7.4);
    obstacles.addSegment(ax, az, bx, bz, 1.8);
  }
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + ((i + 0.5) / 6) * Math.PI;
    const [x, z] = toWorld(MANSION, Math.sin(a) * 3.4, Math.cos(a) * 3.4);
    obstacles.addCircle(x, z, 0.24, 6, false);
  }
  // the reflecting pool at the middle of the roundabout (OpenStreetMap: amenity = fountain)
  const [poolX, poolZ] = points.find((p) => p.kind === "fountain")?.at ?? [-49.1, 30.5];
  const pool = new Mesh(buildReflectingPool(poolX, poolZ, MANSION.angle, obstacles), painted);
  pool.castShadow = true;
  pool.receiveShadow = true;
  root.add(pool);

  // the plaza's furniture and the mansion grounds
  const props = buildProps(obstacles);
  const propsMesh = new Mesh(props.geometry, painted);
  propsMesh.castShadow = true;
  propsMesh.receiveShadow = true;
  root.add(propsMesh);

  const trees = buildTrees(obstacles, lite);
  trees.forEach((t) => {
    root.add(t);
    materials.push(t.material as Material);
  });

  const terrain = new Terrain(props.platforms);

  return {
    root,
    obstacles,
    terrain,
    props,
    pool: { x: poolX, z: poolZ },
    painted,
    mansionGroup,
    /** What a click can land on. */
    clickable: [ground, buildings, church, churchInside, mansion],
    church,
    churchInside,
    /** The route grid takes a moment, so it's built when first needed. */
    walkGrid: () => new WalkGrid(obstacles, WORLD_RADIUS + 10),
    dispose() {
      root.traverse((o) => {
        if (o instanceof Mesh) o.geometry.dispose();
      });
      materials.forEach((m) => m.dispose());
    },
  };
}
