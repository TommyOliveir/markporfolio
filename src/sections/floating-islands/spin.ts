// Drag/swipe spin shared by the 3D band's islands and the circling words.

export class Spin {
  angle = 0; // radians
  private velocity = 0;
  private dragging = false;
  private lastX = 0;

  start(x: number) {
    this.dragging = true;
    this.velocity = 0;
    this.lastX = x;
  }
  move(x: number) {
    if (!this.dragging) return;
    const turn = (x - this.lastX) * 0.008;
    this.lastX = x;
    this.angle += turn;
    this.velocity = turn;
  }
  end() {
    this.dragging = false;
  }
  /** Called every frame: keeps a fling going after release, easing to a stop. */
  step(delta: number) {
    if (this.dragging) return;
    this.angle += this.velocity * delta * 60;
    this.velocity *= Math.pow(0.93, delta * 60);
  }
}
