/* ============================================================
   VÒNG QUAY MÓN ĂN (canvas)
   ============================================================ */

const PALETTE = [
  ["#FFC7D9", "#DE4F72"], // hồng
  ["#B0EBDA", "#3BAE95"], // xanh mint
  ["#CFE4AA", "#7CA648"], // xanh bơ
  ["#FFE0EA", "#F4708F"],
  ["#D6F5EA", "#5CC9AF"],
  ["#E4F0CF", "#9CC463"]
];

export class Wheel {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {(item:object)=>void} onDone
   */
  constructor(canvas, onDone) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.onDone = onDone;
    this.items = [];
    this.angle = 0;
    this.spinning = false;
    this._fitDPR();
    window.addEventListener("resize", () => { this._fitDPR(); this.draw(); });
  }

  _fitDPR() {
    const dpr = window.devicePixelRatio || 1;
    const size = this.canvas.clientWidth || 440;
    this.canvas.width = size * dpr;
    this.canvas.height = size * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.size = size;
  }

  setItems(items) {
    this.items = items || [];
    this.angle = 0;
    this.draw();
  }

  draw() {
    const ctx = this.ctx;
    const s = this.size;
    const r = s / 2;
    ctx.clearRect(0, 0, s, s);

    if (!this.items.length) {
      ctx.save();
      ctx.translate(r, r);
      ctx.beginPath();
      ctx.arc(0, 0, r - 8, 0, Math.PI * 2);
      ctx.fillStyle = "#FFF1F5";
      ctx.fill();
      ctx.strokeStyle = "#FFC7D9";
      ctx.lineWidth = 4;
      ctx.setLineDash([10, 8]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#8A7680";
      ctx.font = `600 ${Math.max(13, s * 0.038)}px Quicksand, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText("Chưa có món nào để quay", 0, -14);
      ctx.fillText("Hãy chọn món ở Bước 2 nha 🥺", 0, s * 0.055);
      ctx.restore();
      return;
    }

    const n = this.items.length;
    const arc = (Math.PI * 2) / n;

    ctx.save();
    ctx.translate(r, r);
    ctx.rotate(this.angle);

    for (let i = 0; i < n; i++) {
      const [bg, fg] = PALETTE[i % PALETTE.length];
      const start = i * arc;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, r - 10, start, start + arc);
      ctx.closePath();
      ctx.fillStyle = bg;
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 3;
      ctx.stroke();

      // nhãn
      const mid = start + arc / 2;
      // góc thật trên màn hình -> quyết định có phải lật chữ không
      const screenAngle = ((this.angle + mid) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
      const flipped = screenAngle > Math.PI / 2 && screenAngle < Math.PI * 1.5;

      ctx.save();
      ctx.rotate(mid);
      ctx.fillStyle = fg;
      ctx.textBaseline = "middle";

      const item = this.items[i];
      const fontSize = Math.max(10, Math.min(16, (s * 0.9) / Math.max(n, 9)));
      let label = item.name;
      const maxChars = n > 14 ? 9 : n > 10 ? 12 : 16;
      if (label.length > maxChars) label = label.slice(0, maxChars - 1) + "…";

      if (flipped) {
        // lật 180° để chữ luôn đọc xuôi
        ctx.rotate(Math.PI);
        ctx.textAlign = "left";
        ctx.font = `700 ${fontSize}px Quicksand, sans-serif`;
        ctx.fillText(label, -(r - 46), 0);
        ctx.font = `${fontSize * 1.5}px serif`;
        ctx.fillText(item.emoji, -(r - 26), 0);
      } else {
        ctx.textAlign = "right";
        ctx.font = `700 ${fontSize}px Quicksand, sans-serif`;
        ctx.fillText(label, r - 46, 0);
        ctx.font = `${fontSize * 1.5}px serif`;
        ctx.fillText(item.emoji, r - 26, 0);
      }
      ctx.restore();
    }
    ctx.restore();

    // viền ngoài + tâm
    ctx.beginPath();
    ctx.arc(r, r, r - 8, 0, Math.PI * 2);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 8;
    ctx.stroke();
  }

  spin() {
    if (this.spinning || !this.items.length) return;
    this.spinning = true;

    const n = this.items.length;
    const arc = (Math.PI * 2) / n;
    const winner = Math.floor(Math.random() * n);

    // Kim chỉ ở đỉnh (góc -90°). Cần tâm của lát `winner` dừng đúng vị trí đó.
    const targetMod = (-Math.PI / 2) - (winner * arc + arc / 2);
    const turns = 5 + Math.floor(Math.random() * 3);
    const from = this.angle;
    const twoPi = Math.PI * 2;
    let to = targetMod;
    while (to < from + turns * twoPi) to += twoPi;

    const duration = 4200 + Math.random() * 900;
    const t0 = performance.now();
    const easeOut = t => 1 - Math.pow(1 - t, 4);

    const frame = now => {
      const p = Math.min(1, (now - t0) / duration);
      this.angle = from + (to - from) * easeOut(p);
      this.draw();
      if (p < 1) {
        requestAnimationFrame(frame);
      } else {
        this.angle = to % twoPi;
        this.spinning = false;
        this.onDone && this.onDone(this.items[winner]);
      }
    };
    requestAnimationFrame(frame);
  }
}
