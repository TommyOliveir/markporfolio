// The pancit errand, after the lost postcards: Mark is hungry, so you fetch him a bowl of pancit molo
// from Kap Ising's, south-east of the plaza. A counter out front with a steaming pot and a cook stirring it,
// lit by a gold glow and beam (like the lost postcards) while Mark is waiting. Walk up to the counter
// and the boy carries the bowl in both hands, steam rising off it, thinning as it cools. Walk sees to
// the rest: how fast it cools (on foot, in a vehicle, up in the balloon), and handing it to Mark, who
// sets it on his postcard table.

import {
  AdditiveBlending,
  CircleGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  SphereGeometry,
  type BufferGeometry,
  type Material,
} from "three";
import type { Obstacles } from "./collide";
import type { Game } from "./game";
import { nearestRoad } from "./ground";
import { Kit } from "./kit";
import { Person } from "./people";
import type { SignPlacement } from "./props";
import { MANSION, PANCIT, TERRACE_HEIGHT, toWorld } from "./world";

const REACH = 2.1; // how close (metres, from the middle of the counter) you need to be to take the bowl
const OUT = 1.9; // how far out from the shop's wall the counter stands

/** A bowl of pancit molo, sitting on y = 0: dumplings in a golden broth, spring onions, fried garlic. */
function bowl() {
  const k = new Kit();
  k.cyl(0.14, 0.085, 0.1, "#f4f1ea", {}, 18);
  k.cyl(0.143, 0.143, 0.014, "#2c56b8", { y: 0.072 }, 18); // a blue band round the rim
  k.cyl(0.128, 0.128, 0.006, "#e3b45f", { y: 0.088 }, 18); // the broth
  for (const [x, z] of [
    [0.04, 0.03],
    [-0.05, 0.02],
    [0, -0.05],
    [-0.02, 0.07],
  ])
    k.ball(0.03, "#f3e2c0", { x, y: 0.092, z, sy: 0.6 }, 8, 6); // dumplings
  for (const [x, z, ry] of [
    [0.07, -0.03, 0.4],
    [-0.07, -0.05, 1.3],
    [0.02, 0.09, 2.2],
    [-0.08, 0.06, 0.9],
  ])
    k.box(0.028, 0.008, 0.012, "#4f9a3a", { x, y: 0.093, z, ry }); // spring onion
  for (const [x, z] of [
    [0.06, 0.06],
    [-0.04, -0.08],
  ])
    k.ball(0.012, "#c98a3a", { x, y: 0.094, z }, 6, 4); // fried garlic
  return k.build()!;
}

/** Puffs of steam rising and fading over a pot or a bowl. */
class Steam {
  readonly group = new Group();
  private puffs: { mesh: Mesh; mat: MeshBasicMaterial; phase: number }[] = [];

  constructor(
    geo: BufferGeometry,
    n: number,
    private spread: number,
    private rise: number,
    private size: number,
  ) {
    for (let i = 0; i < n; i++) {
      const mat = new MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0, depthWrite: false });
      const mesh = new Mesh(geo, mat);
      mesh.renderOrder = 3;
      this.group.add(mesh);
      this.puffs.push({ mesh, mat, phase: i / n });
    }
  }

  /** `amount` 0…1: how much steam there is. Holds still for visitors who prefer less motion. */
  update(t: number, amount: number, still: boolean) {
    const n = this.puffs.length;
    this.puffs.forEach((p, i) => {
      const c = still ? (i + 0.5) / n : (t * 0.55 + p.phase) % 1; // 0 leaving the soup, 1 gone
      p.mesh.visible = amount > 0.02;
      p.mesh.position.set(
        Math.sin(c * 5 + i * 2.1) * this.spread * c,
        c * this.rise,
        Math.cos(c * 4 + i * 1.3) * this.spread * c,
      );
      p.mesh.scale.setScalar(this.size * (0.45 + c));
      p.mat.opacity = amount * 0.42 * Math.sin(c * Math.PI);
    });
  }

  dispose() {
    this.puffs.forEach((p) => p.mat.dispose());
  }
}

export class PancitErrand {
  /** the stall, its glow and beam, and the bowl on Mark's table once he has it */
  readonly group = new Group();
  /** the bowl you carry (Boy.carry holds it) */
  readonly held = new Group();
  /** the middle of the counter */
  readonly stall: { x: number; z: number };
  /** where you stand to take the bowl: in front of the counter */
  readonly spot: { x: number; z: number };
  private cook: Person;
  private potSteam: Steam;
  private heldSteam: Steam;
  private servedSteam: Steam;
  private served = new Group();
  private glow: Mesh;
  private beam: Mesh;
  private disposables: { dispose(): void }[] = [];

  constructor(
    material: Material,
    heightAt: (x: number, z: number) => number,
    sign: SignPlacement | undefined,
    obstacles: Obstacles,
  ) {
    // out from the shop's wall, under its sign (or round its map point, facing the street)
    let nx: number;
    let nz: number;
    let bx = sign?.x ?? PANCIT.x;
    let bz = sign?.z ?? PANCIT.z;
    if (sign) {
      nx = Math.sin(sign.ry);
      nz = Math.cos(sign.ry);
    } else {
      const road = nearestRoad(PANCIT.x, PANCIT.z);
      const d = Math.hypot(road.px - PANCIT.x, road.pz - PANCIT.z) || 1;
      nx = (road.px - PANCIT.x) / d;
      nz = (road.pz - PANCIT.z) / d;
      bx -= nx * OUT * 0.5;
      bz -= nz * OUT * 0.5;
    }
    // keep the counter on the pavement, clear of the street
    let out = OUT;
    for (; out > 1.1; out -= 0.2) {
      const road = nearestRoad(bx + nx * out, bz + nz * out);
      if (road.d > road.width / 2 + 0.9) break;
    }
    const cx = bx + nx * out;
    const cz = bz + nz * out;
    const floor = heightAt(cx, cz);
    const ry = Math.atan2(nx, nz); // the counter's front faces out, toward the street
    this.stall = { x: cx, z: cz };
    this.spot = { x: cx + nx * 1.3, z: cz + nz * 1.3 };

    const bowlGeo = bowl();
    const puff = new SphereGeometry(1, 8, 6);
    this.disposables.push(bowlGeo, puff);

    // ---- the counter: a wooden stand with a red skirt, a big pot, a stack of bowls ------------------
    const k = new Kit();
    k.box(1.5, 0.9, 0.62, "#8a5a33");
    k.box(1.54, 0.04, 0.66, "#c9a273", { y: 0.9 }); // the top
    k.box(1.52, 0.5, 0.02, "#c8102e", { y: 0.3, z: 0.32 }); // the skirt in front
    k.box(1.52, 0.06, 0.025, "#f4f1ea", { y: 0.8, z: 0.32 }); // a white trim
    k.cyl(0.22, 0.2, 0.32, "#9aa0a8", { x: -0.35, y: 0.94 }, 18); // the pot
    k.cyl(0.235, 0.235, 0.03, "#7d838b", { x: -0.35, y: 1.25 }, 18); // its rim
    k.cyl(0.21, 0.21, 0.005, "#e3b45f", { x: -0.35, y: 1.24 }, 18); // broth
    k.box(0.05, 0.03, 0.04, "#2a2b2e", { x: -0.6, y: 1.1 }); // handles
    k.box(0.05, 0.03, 0.04, "#2a2b2e", { x: -0.1, y: 1.1 });
    for (let i = 0; i < 3; i++) k.cyl(0.13, 0.085, 0.09, "#f4f1ea", { x: 0.42, y: 0.94 + i * 0.05 }, 16);
    const stallGeo = k.build()!;
    this.disposables.push(stallGeo);
    // and a bowl ready on the counter
    const counter = new Mesh(stallGeo, material);
    counter.castShadow = true;
    counter.position.set(cx, floor, cz);
    counter.rotation.y = ry;
    const ready = new Mesh(bowlGeo, material);
    ready.position.set(0.05, 0.945, 0.12);
    counter.add(ready);
    this.group.add(counter);
    this.potSteam = new Steam(puff, 7, 0.18, 1.2, 0.1);
    this.potSteam.group.position.set(-0.35, 1.28, 0);
    counter.add(this.potSteam.group);
    obstacles.addCircle(cx, cz, 0.85, 1.2);

    // ---- the cook, behind the counter, stirring --------------------------------------------------
    this.cook = new Person(
      {
        skin: "#b97a55",
        hair: "#2b211c",
        shirt: "#f4f1ea",
        pants: "#3e4a5c",
        hat: "cap",
        hatColor: "#c8102e",
        apron: true,
      },
      material,
    );
    const kx = cx - nx * 0.75;
    const kz = cz - nz * 0.75;
    this.cook.root.position.set(kx, heightAt(kx, kz), kz);
    this.cook.root.rotation.y = ry;
    this.group.add(this.cook.root);
    obstacles.addCircle(kx, kz, 0.35, 1.7);

    // ---- the gold glow and beam, while Mark's waiting --------------------------------------------
    const glowGeo = new CircleGeometry(1.1, 32).rotateX(-Math.PI / 2);
    const glowMat = new MeshBasicMaterial({ color: "#ffd36b", transparent: true, opacity: 0.5, depthWrite: false });
    const beamGeo = new CylinderGeometry(0.35, 0.35, 9, 16, 1, true).translate(0, 4.5, 0);
    const beamMat = new MeshBasicMaterial({
      color: "#ffcf5a",
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    this.disposables.push(glowGeo, glowMat, beamGeo, beamMat);
    this.glow = new Mesh(glowGeo, glowMat);
    this.glow.position.set(this.spot.x, heightAt(this.spot.x, this.spot.z) + 0.04, this.spot.z);
    this.glow.renderOrder = 1;
    this.beam = new Mesh(beamGeo, beamMat);
    this.beam.position.set(cx, floor, cz);
    this.beam.renderOrder = 2;
    this.group.add(this.glow, this.beam);

    // ---- the bowl in your hands ------------------------------------------------------------------
    const carried = new Mesh(bowlGeo, material);
    carried.castShadow = true;
    this.heldSteam = new Steam(puff, 5, 0.1, 0.7, 0.06);
    this.heldSteam.group.position.y = 0.1;
    this.held.add(carried, this.heldSteam.group);

    // ---- the bowl on Mark's postcard table, once he has it ----------------------------------------
    const [sx, sz] = toWorld(MANSION, -1.3, 1.62);
    const servedBowl = new Mesh(bowlGeo, material);
    this.servedSteam = new Steam(puff, 5, 0.1, 0.7, 0.06);
    this.servedSteam.group.position.y = 0.1;
    this.served.add(servedBowl, this.servedSteam.group);
    this.served.position.set(sx, TERRACE_HEIGHT + 0.79, sz);
    this.served.rotation.y = MANSION.angle;
    this.served.visible = false;
    this.group.add(this.served);
  }

  /**
   * Each frame: true when you've just taken the bowl (`canPick`: you're on foot and playing). Animates
   * the cook, the steam and the glow, and cools a bowl you're carrying by `cooling` (heat a second).
   */
  update(t: number, dt: number, game: Game, canPick: boolean, cooling: number) {
    const still = game.reducedMotion;
    const fetching = game.errand === "fetch";
    let picked = false;
    if (fetching && canPick) {
      const near = Math.hypot(this.stall.x - game.x, this.stall.z - game.z) < REACH;
      if (near && Math.abs(game.y - this.cook.root.position.y) < 1.2) picked = true;
    }
    // (Mark's bowl goes on cooling on his table, so its steam dies away too)
    if (game.errand === "carry" || game.errand === "done") game.heat = Math.max(0, game.heat - cooling * dt);

    this.glow.visible = this.beam.visible = fetching;
    if (fetching) (this.glow.material as MeshBasicMaterial).opacity = still ? 0.4 : 0.3 + Math.sin(t * 3) * 0.1;
    this.cook.animate(dt, 0, t);
    if (still) this.cook.rest();
    else this.cook.paint(t * 0.8); // stirring the pot
    this.potSteam.update(t, 1, still);
    // the steam off your bowl thins out as it cools (and starts from nothing until you have one)
    this.heldSteam.update(t, game.errand === "carry" ? Math.min(1, game.heat * 1.4) : 0, still);
    // and off Mark's, the soup's still warm for a little while
    this.served.visible = game.errand === "done";
    if (this.served.visible) this.servedSteam.update(t, Math.min(1, game.heat * 1.4), still);
    return picked;
  }

  dispose() {
    this.cook.dispose();
    this.potSteam.dispose();
    this.heldSteam.dispose();
    this.servedSteam.dispose();
    this.disposables.forEach((d) => d.dispose());
  }
}
