// The lost-postcards quest: five of Mark's postcards have blown away across Molo (LOST_POSTCARDS in
// world.ts). Each floats over its spot, bobbing and turning, with a soft gold glow on the ground under
// it and a faint gold beam above, so you can spot it from across the plaza. Walk into one to pick it up: it flies up and away, and the page counts it (see Walk and
// FindMark). Bring all five to Mark to finish.

import {
  AdditiveBlending,
  BoxGeometry,
  CircleGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  type Material,
  type Texture,
} from "three";
import { postcards } from "@/sections/postcards/content";
import type { Game } from "./game";
import { postcardTexture } from "./labels";
import { LOST_POSTCARDS, type LostPostcard } from "./world";

const REACH = 1.5; // how close (metres, across the ground) you need to be to pick one up
const HOVER = 1.7; // how high a card floats over the ground (clear of the gazebo's goddesses)
const FLY = 0.7; // seconds for a picked-up card to fly away

type Card = { spot: LostPostcard; card: Group; glow: Mesh; beam: Mesh; floor: number; gone: number };

export class LostPostcards {
  readonly group = new Group();
  private cards: Card[] = [];
  private disposables: { dispose(): void }[] = [];

  constructor(private heightAt: (x: number, z: number) => number) {}

  /** Paints and places the cards (once the site's fonts have loaded, for the "Molo" lettering). */
  build() {
    const geo = new BoxGeometry(0.95, 0.64, 0.03);
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
    const edge = new MeshBasicMaterial({ color: "#efe4c8" });
    this.disposables.push(geo, glowGeo, glowMat, beamGeo, beamMat, edge);
    const stamps = postcards.map((c) => c.stampColor);
    LOST_POSTCARDS.forEach((spot, i) => {
      const stamp = stamps[i % stamps.length] ?? "#d63c62";
      const front = postcardTexture(i, "front", stamp);
      const back = postcardTexture(i, "back", stamp);
      const faces: Material[] = [edge, edge, edge, edge, face(front), face(back)];
      faces.slice(4).forEach((m) => this.disposables.push(m));
      this.disposables.push(front, back);
      const card = new Group();
      card.add(new Mesh(geo, faces));
      const floor = this.heightAt(spot.x, spot.z);
      card.position.set(spot.x, floor + HOVER, spot.z);
      const glow = new Mesh(glowGeo, glowMat);
      glow.position.set(spot.x, floor + 0.04, spot.z);
      glow.renderOrder = 1;
      const beam = new Mesh(beamGeo, beamMat);
      beam.position.set(spot.x, floor, spot.z);
      beam.renderOrder = 2;
      this.group.add(card, glow, beam);
      this.cards.push({ spot, card, glow, beam, floor, gone: -1 });
    });
  }

  /**
   * Each frame: picks up a card you've walked into (returning it, at most one a frame) and animates
   * the rest. Works before `build` too (the cards just aren't drawn yet).
   */
  update(t: number, dt: number, game: Game, playing: boolean): LostPostcard | null {
    let picked: LostPostcard | null = null;
    // the postcards only blow away once you've found Mark and he's asked you to fetch them
    this.group.visible = game.questStarted;
    if (playing && game.questStarted)
      for (const spot of LOST_POSTCARDS) {
        if (game.collected.has(spot.id) || picked) continue;
        const near = Math.hypot(spot.x - game.x, spot.z - game.z) < REACH;
        if (near && Math.abs(game.y - this.heightAt(spot.x, spot.z)) < 1.2) {
          game.collected.add(spot.id);
          picked = spot;
        }
      }
    this.cards.forEach((c, i) => {
      const taken = game.collected.has(c.spot.id);
      if (taken && c.gone < 0) c.gone = 0;
      if (c.gone >= 0) {
        // picked up: up, round and away (or simply gone, for visitors who prefer less motion)
        c.gone += dt;
        const k = game.reducedMotion ? 1 : Math.min(c.gone / FLY, 1);
        c.card.visible = k < 1;
        c.glow.visible = false;
        c.beam.visible = false;
        c.card.position.y = c.floor + HOVER + k * k * 2.5;
        c.card.rotation.y += dt * 14;
        c.card.scale.setScalar(1 - k * 0.9);
        return;
      }
      const still = game.reducedMotion;
      c.card.position.y = c.floor + HOVER + (still ? 0 : Math.sin(t * 2 + i) * 0.12);
      c.card.rotation.y = still ? i : t * 1.1 + i;
      c.card.rotation.z = still ? 0 : Math.sin(t * 1.3 + i) * 0.12;
      (c.glow.material as MeshBasicMaterial).opacity = still ? 0.4 : 0.3 + Math.sin(t * 3 + i) * 0.1;
    });
    return picked;
  }

  dispose() {
    this.disposables.forEach((d) => d.dispose());
  }
}

/** An unlit face for a card, so it reads clearly in sun and in shade. */
function face(map: Texture) {
  return new MeshBasicMaterial({ map });
}
