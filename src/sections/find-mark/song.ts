// Teaching the band Dandansoy, after the pancit: the band only knows one tune, so Mark sends you to the
// two who know Dandansoy, the sorbetes man by the fountain (the first half) and the guard at the mansion
// gate (the second). A gold ♪ bobs over each of them until you've walked up and heard their half, then
// over the drum major, until you teach the band (the band card's "Teach them Dandansoy", see FindMark).
// Walk sees to the singing; this keeps the markers, and where the trail and the minimap should lead.

import { Group, Mesh, MeshBasicMaterial } from "three";
import type { Game, Singer } from "./game";
import { Kit } from "./kit";
import type { Life } from "./life";

const REACH = 4.5; // how close (metres) you need to be to hear someone's half (the trail stops 4 m short)
const ABOVE = 3.3; // how high a ♪ floats over a singer's feet (clear of the sorbetes cart's umbrella)
const SINGERS: Singer[] = ["sorbetes", "guard"];

/** A musical note (♪), facing +z: a round head, a stem and a flag. */
function note() {
  const k = new Kit();
  k.ball(0.13, "#000", { sx: 1.25, sz: 0.5, rz: 0.35 });
  k.box(0.035, 0.48, 0.06, "#000", { x: 0.135 });
  k.box(0.035, 0.24, 0.06, "#000", { x: 0.2, y: 0.3, rz: 0.9 });
  return k.build()!;
}

export class SongQuest {
  readonly group = new Group();
  private marks: Record<Singer | "band", Mesh>;
  private material = new MeshBasicMaterial({ color: "#f2b51e" });
  private geometry = note();

  constructor() {
    const make = () => {
      const m = new Mesh(this.geometry, this.material);
      m.scale.setScalar(1.7);
      m.visible = false;
      this.group.add(m);
      return m;
    };
    this.marks = { sorbetes: make(), guard: make(), band: make() };
  }

  /**
   * Each frame: who you've just walked up to and should hear sing (`canLearn`: on foot and playing), or
   * null. Moves the ♪ markers, and keeps `game.songTarget` (the nearest still to see) and `game.songMarks`
   * (for the minimap) up to date.
   */
  update(t: number, game: Game, life: Life, leader: { x: number; z: number }, canLearn: boolean): Singer | null {
    const still = game.reducedMotion;
    const bob = (i: number) => (still ? 0 : Math.sin(t * 2.4 + i) * 0.12);
    const spin = (i: number) => (still ? 0 : Math.sin(t * 1.2 + i) * 0.6);
    game.songMarks.length = 0;
    let heard: Singer | null = null;
    let best = Infinity;

    SINGERS.forEach((who, i) => {
      const mark = this.marks[who];
      const p = life.singers[who].root.position;
      const waiting = game.song === "learn" && !game.learned.has(who);
      mark.visible = waiting;
      if (!waiting) return;
      mark.position.set(p.x, p.y + ABOVE + bob(i), p.z);
      mark.rotation.y = spin(i);
      game.songMarks.push({ x: p.x, z: p.z });
      const d = Math.hypot(p.x - game.x, p.z - game.z);
      if (d < best) {
        best = d;
        game.songTarget = { x: p.x, z: p.z };
      }
      if (canLearn && !heard && d < REACH) heard = who;
    });

    const band = this.marks.band;
    band.visible = game.song === "teach";
    if (band.visible) {
      band.position.set(leader.x, ABOVE + bob(2), leader.z);
      band.rotation.y = spin(2);
      game.songMarks.push(leader);
      game.songTarget = { x: leader.x, z: leader.z };
    }
    return heard;
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}
