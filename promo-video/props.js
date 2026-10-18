// Shared helpers and product drawings (watch, pen, misbaha) used by every video page.
// Functions draw onto the page's global `ctx`.
// ---------- helpers ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const ease = k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
const prog = (t, a, b) => ease(clamp((t - a) / (b - a)));
const P = (x, y) => ({ x, y });
const add = (p, q) => P(p.x + q.x, p.y + q.y);
const lerpP = (p, q, k) => P(lerp(p.x, q.x, k), lerp(p.y, q.y, k));
const bump = (t, a, b) => { const k = clamp((t - a) / (b - a)); return Math.sin(k * Math.PI); };

// keyframe track; values may be numbers, points, or functions returning those
function track(keys, t) {
  const val = v => typeof v === 'function' ? v() : v;
  if (t <= keys[0][0]) return val(keys[0][1]);
  for (let i = 0; i < keys.length - 1; i++) {
    const [t0, a] = keys[i], [t1, b] = keys[i + 1];
    if (t <= t1) {
      const k = ease((t - t0) / (t1 - t0)), v0 = val(a), v1 = val(b);
      if (typeof v0 === 'number') return lerp(v0, v1, k);
      const o = {}; for (const key in v0) o[key] = lerp(v0[key], v1[key], k); return o;
    }
  }
  return val(keys[keys.length - 1][1]);
}

// seeded random for deterministic particles
function rng(seed) { return () => (seed = (seed * 16807) % 2147483647) / 2147483647; }

const RG = '#d39a78', RG_L = '#f1c6aa', RG_D = '#9a5d42';

// ---------- drawing: props ----------
function star(x, y, r, a, color = '#fff6e0') {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.6);
  g.addColorStop(0, 'rgba(255,236,200,0.9)'); g.addColorStop(1, 'rgba(255,220,170,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r * 1.6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = color; ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const rr = i % 2 ? r * 0.18 : r, an = i * Math.PI / 4;
    ctx.lineTo(Math.cos(an) * rr, Math.sin(an) * rr);
  }
  ctx.closePath(); ctx.fill(); ctx.restore();
}

function drawWatch(x, y, rot, s, strap = 70, spin = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  // bracelet (brown links with rose-gold edges)
  for (const dir of [-1, 1]) {
    const y0 = dir * 30, y1 = dir * strap;
    ctx.fillStyle = '#5b3322';
    ctx.fillRect(-19, Math.min(y0, y1), 38, Math.abs(y1 - y0));
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(-6, Math.min(y0, y1), 12, Math.abs(y1 - y0));
    ctx.strokeStyle = RG; ctx.lineWidth = 2;
    for (let yy = y0; dir > 0 ? yy < y1 : yy > y1; yy += dir * 11) {
      ctx.beginPath(); ctx.moveTo(-19, yy); ctx.lineTo(19, yy); ctx.stroke();
    }
    ctx.strokeStyle = RG_D; ctx.lineWidth = 2.5;
    ctx.strokeRect(-19, Math.min(y0, y1), 38, Math.abs(y1 - y0));
  }
  // case
  let g = ctx.createLinearGradient(-36, -36, 36, 36);
  g.addColorStop(0, RG_L); g.addColorStop(.5, RG); g.addColorStop(1, RG_D);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 37, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(34, -5, 7, 10); // crown
  // bezel insert
  ctx.fillStyle = '#4a2819'; ctx.beginPath(); ctx.arc(0, 0, 32, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = RG_L; ctx.lineWidth = 1.6;
  for (let i = 0; i < 12; i++) {
    const a = i * Math.PI / 6;
    ctx.beginPath(); ctx.moveTo(Math.cos(a) * 28, Math.sin(a) * 28); ctx.lineTo(Math.cos(a) * 31, Math.sin(a) * 31); ctx.stroke();
  }
  // dial
  g = ctx.createRadialGradient(-6, -8, 2, 0, 0, 26);
  g.addColorStop(0, '#9a5e3c'); g.addColorStop(1, '#3d1f10');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 25, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = RG_L;
  for (let i = 0; i < 12; i++) {
    ctx.save(); ctx.rotate(i * Math.PI / 6); ctx.fillRect(-1.2, -23, 2.4, i % 3 ? 5 : 8); ctx.restore();
  }
  // hands (10:10)
  ctx.strokeStyle = RG_L; ctx.lineCap = 'round';
  ctx.save(); ctx.rotate(spin);
  ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-11, -9); ctx.stroke();
  ctx.rotate(spin * 11);
  ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(14, -14); ctx.stroke();
  ctx.restore();
  ctx.fillStyle = RG_L; ctx.beginPath(); ctx.arc(0, 0, 2.5, 0, Math.PI * 2); ctx.fill();
  // glass glint
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(0, 0, 21, -2.6, -1.7); ctx.stroke();
  ctx.restore();
}

function drawPen(x, y, ang, s = 1) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(s, s);
  // local +x = tip, -x = cap end
  let g = ctx.createLinearGradient(0, -8, 0, 8);
  g.addColorStop(0, '#9a5632'); g.addColorStop(.35, '#c27a4f'); g.addColorStop(1, '#3a1a0b');
  ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(-64, -8, 116, 16, 6); ctx.fill();
  const rg = ctx.createLinearGradient(0, -8, 0, 8);
  rg.addColorStop(0, RG_L); rg.addColorStop(.5, RG); rg.addColorStop(1, RG_D);
  ctx.fillStyle = rg;
  ctx.beginPath(); ctx.moveTo(50, -7); ctx.lineTo(76, -1.2); ctx.lineTo(76, 1.2); ctx.lineTo(50, 7); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.roundRect(-77, -8, 15, 16, 7); ctx.fill();
  ctx.fillRect(-20, -8.5, 9, 17);
  ctx.fillStyle = '#eee9e2'; ctx.fillRect(-11, -8, 7, 16);
  ctx.fillStyle = rg; ctx.fillRect(-4, -8.5, 3, 17);
  // clip
  ctx.fillStyle = RG; ctx.beginPath(); ctx.roundRect(-72, -12, 48, 5, 2.5); ctx.fill();
  ctx.restore();
}

function bead(x, y, r = 7.5) {
  const g = ctx.createRadialGradient(x - r * .35, y - r * .4, r * .15, x, y, r);
  g.addColorStop(0, '#b06a3c'); g.addColorStop(.55, '#6f3518'); g.addColorStop(1, '#3a1808');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,240,225,0.55)'; ctx.beginPath(); ctx.arc(x - r * .35, y - r * .4, r * .25, 0, Math.PI * 2); ctx.fill();
}

function drawBeads(pts) {
  ctx.strokeStyle = 'rgba(90,50,30,0.6)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.closePath(); ctx.stroke();
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], q = pts[(i + 1) % pts.length];
    ctx.fillStyle = RG; ctx.beginPath(); ctx.arc((p.x + q.x) / 2, (p.y + q.y) / 2, 2.6, 0, Math.PI * 2); ctx.fill();
  }
  pts.forEach(p => bead(p.x, p.y));
}

function drawImame(x, y, ang) {   // tassel end of the misbaha
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang - Math.PI / 2);
  ctx.strokeStyle = 'rgba(90,50,30,0.8)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 18); ctx.stroke();
  bead(0, 14, 5);
  const g = ctx.createLinearGradient(-6, 0, 6, 0);
  g.addColorStop(0, RG_D); g.addColorStop(.5, RG_L); g.addColorStop(1, RG_D);
  ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(-6, 20, 12, 34, 5); ctx.fill();
  ctx.strokeStyle = RG; ctx.lineWidth = 1.4;
  for (const dx of [-4, 0, 4]) { ctx.beginPath(); ctx.moveTo(0, 54); ctx.lineTo(dx * 1.6, 80); ctx.stroke(); }
  for (const dx of [-4, 0, 4]) bead(dx * 1.6, 82, 3.6);
  ctx.restore();
}

