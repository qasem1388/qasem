/**
 * Generates the original placeholder artwork in /public/demo and the brand
 * mark in /public/brand. All visuals are produced procedurally here, so they
 * carry no third-party licence. Replace them with real photography from the
 * admin panel (or by swapping the files) before launch.
 *
 * Usage: node scripts/generate-demo-art.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const demoDir = join(root, "public/demo");
const brandDir = join(root, "public/brand");
mkdirSync(demoDir, { recursive: true });
mkdirSync(brandDir, { recursive: true });

const NAVY = "#0b1f3a";
const GOLD = "#c8a24a";

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const r1 = (n) => Math.round(n * 10) / 10;

const palettes = {
  dusk: {
    sky: ["#0b1f3a", "#1d3a66", "#c97b4a", "#f2c879"],
    sun: "#ffd98a",
    far: "#1a3358",
    mid: "#132a4b",
    near: "#0b1f3a",
    win: "#ffd98a",
    ground: "#0a1a31",
  },
  day: {
    sky: ["#3f79b8", "#79a9d6", "#cfe1ef", "#f4efe2"],
    sun: "#fff6d8",
    far: "#9db6cf",
    mid: "#4f6f93",
    near: "#22406a",
    win: "#d9e8f5",
    ground: "#d9c7a4",
  },
  night: {
    sky: ["#050d1c", "#0b1f3a", "#173459", "#24456e"],
    sun: "#e9eef6",
    far: "#14294a",
    mid: "#0f2240",
    near: "#081629",
    win: "#ffcf6b",
    ground: "#061223",
  },
  golden: {
    sky: ["#1b2f52", "#5a5a78", "#d99a5b", "#f6d08d"],
    sun: "#fff0c2",
    far: "#6c6880",
    mid: "#3a3e5c",
    near: "#1d2742",
    win: "#ffe2a1",
    ground: "#b98d5c",
  },
};

function skyDefs(id, p) {
  return `<linearGradient id="${id}-sky" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${p.sky[0]}"/><stop offset=".45" stop-color="${p.sky[1]}"/>
    <stop offset=".8" stop-color="${p.sky[2]}"/><stop offset="1" stop-color="${p.sky[3]}"/></linearGradient>
  <radialGradient id="${id}-sun" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="${p.sun}" stop-opacity=".95"/>
    <stop offset=".35" stop-color="${p.sun}" stop-opacity=".35"/><stop offset="1" stop-color="${p.sun}" stop-opacity="0"/></radialGradient>
  <linearGradient id="${id}-fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/>
    <stop offset="1" stop-color="#000" stop-opacity=".35"/></linearGradient>`;
}

function stars(rand, w, h, n) {
  let out = "";
  for (let i = 0; i < n; i++) {
    out += `<circle cx="${r1(rand() * w)}" cy="${r1(rand() * h)}" r="${r1(rand() * 1.3 + 0.3)}" fill="#fff" opacity="${r1(rand() * 0.6 + 0.2)}"/>`;
  }
  return out;
}

function windows(rand, x, y, w, h, color, density = 0.55) {
  let out = "";
  const cols = Math.max(2, Math.floor(w / 9));
  const rows = Math.max(3, Math.floor(h / 12));
  const cw = w / cols;
  const rh = h / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (rand() > density) continue;
      out += `<rect x="${r1(x + c * cw + cw * 0.25)}" y="${r1(y + r * rh + rh * 0.3)}" width="${r1(cw * 0.5)}" height="${r1(rh * 0.42)}" fill="${color}" opacity="${r1(rand() * 0.6 + 0.25)}"/>`;
    }
  }
  return out;
}

function tower(rand, x, base, w, h, fill, win, kind) {
  const top = base - h;
  let shape = "";
  if (kind === "kingdom") {
    // Tall tapered tower with a parabolic opening near the top.
    const t = w * 0.18;
    shape = `<path d="M${x} ${base} L${x + t} ${top} L${x + w - t} ${top} L${x + w} ${base} Z" fill="${fill}"/>
      <path d="M${x + t + 6} ${top - 1} Q${x + w / 2} ${top + h * 0.28} ${x + w - t - 6} ${top - 1} Z" fill="url(#cut)"/>`;
    return shape + windows(rand, x + w * 0.2, top + h * 0.33, w * 0.6, h * 0.62, win, 0.45);
  }
  if (kind === "pyramid") {
    shape = `<path d="M${x} ${base} L${x + w / 2} ${top} L${x + w} ${base} Z" fill="${fill}"/>
      <circle cx="${x + w / 2}" cy="${top + h * 0.22}" r="${w * 0.14}" fill="${GOLD}" opacity=".9"/>`;
    return shape + windows(rand, x + w * 0.3, top + h * 0.45, w * 0.4, h * 0.5, win, 0.4);
  }
  if (kind === "spire") {
    shape = `<rect x="${x}" y="${top}" width="${w}" height="${h}" fill="${fill}"/>
      <path d="M${x + w * 0.2} ${top} L${x + w / 2} ${top - h * 0.18} L${x + w * 0.8} ${top} Z" fill="${fill}"/>
      <rect x="${x + w / 2 - 1}" y="${top - h * 0.3}" width="2" height="${h * 0.14}" fill="${fill}"/>`;
    return shape + windows(rand, x, top + 6, w, h - 6, win);
  }
  if (kind === "stepped") {
    shape = `<rect x="${x}" y="${top + h * 0.2}" width="${w}" height="${h * 0.8}" fill="${fill}"/>
      <rect x="${x + w * 0.15}" y="${top + h * 0.08}" width="${w * 0.7}" height="${h * 0.14}" fill="${fill}"/>
      <rect x="${x + w * 0.3}" y="${top}" width="${w * 0.4}" height="${h * 0.1}" fill="${fill}"/>`;
    return shape + windows(rand, x, top + h * 0.22, w, h * 0.76, win);
  }
  shape = `<rect x="${x}" y="${top}" width="${w}" height="${h}" fill="${fill}"/>`;
  return shape + windows(rand, x, top + 4, w, h - 4, win);
}

function skyline(rand, { w, base, count, minH, maxH, fill, win, landmarks = false }) {
  let out = "";
  let x = -20;
  const kinds = ["box", "box", "spire", "stepped"];
  let i = 0;
  while (x < w) {
    const bw = 34 + rand() * 46;
    let bh = minH + rand() * (maxH - minH);
    let kind = kinds[Math.floor(rand() * kinds.length)];
    if (landmarks && i === Math.floor(count * 0.35)) {
      kind = "kingdom";
      bh = maxH * 1.35;
    } else if (landmarks && i === Math.floor(count * 0.7)) {
      kind = "pyramid";
      bh = maxH * 1.1;
    }
    out += tower(rand, x, base, kind === "kingdom" ? bw * 1.5 : bw, bh, fill, win, kind);
    x += (kind === "kingdom" ? bw * 1.5 : bw) + rand() * 10 - 2;
    i++;
  }
  return out;
}

function frame(w, h, id, p, body, { sunX = 0.7, sunY = 0.62, sunR = 0.35, night = false, seed = 1 } = {}) {
  const rand = rng(seed + 99);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice">
  <defs>${skyDefs(id, p)}<linearGradient id="cut" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.sky[1]}"/><stop offset="1" stop-color="${p.sky[2]}"/></linearGradient></defs>
  <rect width="${w}" height="${h}" fill="url(#${id}-sky)"/>
  ${night ? stars(rand, w, h * 0.6, 90) : ""}
  <circle cx="${w * sunX}" cy="${h * sunY}" r="${w * sunR}" fill="url(#${id}-sun)"/>
  ${body}
  <rect width="${w}" height="${h}" fill="url(#${id}-fade)"/>
</svg>`;
}

function cityScene({ w, h, palette, seed, landmarks = true, roads = true, ...opts }) {
  const p = palettes[palette];
  const rand = rng(seed);
  const base = h * 0.82;
  let body = "";
  body += skyline(rand, {
    w,
    base: base - 18,
    count: 18,
    minH: h * 0.12,
    maxH: h * 0.3,
    fill: p.far,
    win: p.win,
    landmarks: false,
  });
  body += skyline(rand, { w, base: base - 6, count: 16, minH: h * 0.1, maxH: h * 0.34, fill: p.mid, win: p.win, landmarks });
  body += skyline(rand, { w, base, count: 14, minH: h * 0.06, maxH: h * 0.16, fill: p.near, win: p.win });
  body += `<rect y="${base}" width="${w}" height="${h - base}" fill="${p.ground}"/>`;
  if (roads) {
    for (let i = 0; i < 6; i++) {
      const y = base + 10 + i * ((h - base - 12) / 6);
      body += `<path d="M0 ${r1(y)} Q${w / 2} ${r1(y - 8)} ${w} ${r1(y + 4)}" stroke="${i % 2 ? GOLD : "#ff6b4a"}" stroke-width="${r1(1 + rand() * 1.6)}" stroke-dasharray="${r1(30 + rand() * 60)} ${r1(10 + rand() * 30)}" opacity=".55" fill="none"/>`;
    }
  }
  return frame(w, h, `c${seed}`, p, body, { ...opts, seed });
}

function warehouseScene({ w, h, palette, seed }) {
  const p = palettes[palette];
  const rand = rng(seed);
  const base = h * 0.78;
  let body = skyline(rand, { w, base: base - 40, count: 18, minH: h * 0.05, maxH: h * 0.16, fill: p.far, win: p.win });
  // Warehouses with arched roofs
  for (let i = 0; i < 3; i++) {
    const x = 40 + i * (w / 3.1);
    const bw = w / 3.4;
    const bh = h * (0.16 + i * 0.03);
    body += `<path d="M${x} ${base} V${base - bh} Q${x + bw / 2} ${base - bh - 40} ${x + bw} ${base - bh} V${base} Z" fill="${i === 1 ? p.near : p.mid}"/>`;
    for (let d = 0; d < 5; d++) {
      body += `<rect x="${r1(x + 14 + (d * (bw - 28)) / 5)}" y="${r1(base - bh * 0.55)}" width="${r1((bw - 28) / 5 - 8)}" height="${r1(bh * 0.55)}" fill="#ffffff" opacity=".12"/>`;
    }
    body += `<rect x="${x}" y="${base - bh - 4}" width="${bw}" height="5" fill="${GOLD}" opacity=".8"/>`;
  }
  body += `<rect y="${base}" width="${w}" height="${h - base}" fill="${p.ground}"/>`;
  // Trucks
  for (let i = 0; i < 4; i++) {
    const x = 60 + i * (w / 4.2) + rand() * 30;
    const y = base + 30 + (i % 2) * 40;
    body += `<g><rect x="${x}" y="${y - 34}" width="92" height="34" rx="3" fill="#f3f4f6"/>
      <rect x="${x + 92}" y="${y - 24}" width="26" height="24" rx="4" fill="${GOLD}"/>
      <rect x="${x + 100}" y="${y - 20}" width="12" height="9" fill="${p.near}" opacity=".7"/>
      <rect x="${x + 6}" y="${y - 27}" width="40" height="5" fill="${NAVY}" opacity=".6"/>
      <circle cx="${x + 20}" cy="${y + 2}" r="7" fill="#111"/><circle cx="${x + 70}" cy="${y + 2}" r="7" fill="#111"/><circle cx="${x + 106}" cy="${y + 2}" r="7" fill="#111"/></g>`;
  }
  return frame(w, h, `w${seed}`, p, body, { seed, sunX: 0.2, sunY: 0.5 });
}

function industrialScene({ w, h, palette, seed }) {
  const p = palettes[palette];
  const rand = rng(seed);
  const base = h * 0.8;
  let body = "";
  // Chimneys with smoke
  for (let i = 0; i < 4; i++) {
    const x = 90 + i * (w / 4.5);
    const ch = h * (0.3 + rand() * 0.15);
    body += `<rect x="${x}" y="${base - ch}" width="22" height="${ch}" fill="${p.mid}"/>
      <rect x="${x}" y="${base - ch + 12}" width="22" height="6" fill="#e2483d" opacity=".8"/><rect x="${x}" y="${base - ch + 28}" width="22" height="6" fill="#f3f4f6" opacity=".6"/>`;
    for (let s = 0; s < 4; s++) {
      body += `<circle cx="${x + 11 + s * 16}" cy="${base - ch - 12 - s * 14}" r="${12 + s * 7}" fill="#ffffff" opacity="${0.18 - s * 0.03}"/>`;
    }
  }
  // Tanks
  for (let i = 0; i < 5; i++) {
    const x = 20 + i * (w / 5);
    const tw = 80 + rand() * 40;
    const th = 60 + rand() * 60;
    body += `<rect x="${x}" y="${base - th}" width="${tw}" height="${th}" fill="${i % 2 ? p.near : p.mid}"/>
      <ellipse cx="${x + tw / 2}" cy="${base - th}" rx="${tw / 2}" ry="10" fill="${p.far}"/>
      <rect x="${x}" y="${base - th * 0.6}" width="${tw}" height="4" fill="${GOLD}" opacity=".7"/>`;
  }
  // Pipes
  body += `<path d="M0 ${base - 30} H${w}" stroke="${p.far}" stroke-width="8"/><path d="M0 ${base - 50} H${w}" stroke="${GOLD}" stroke-width="3" opacity=".6"/>`;
  body += `<rect y="${base}" width="${w}" height="${h - base}" fill="${p.ground}"/>`;
  return frame(w, h, `i${seed}`, p, body, { seed, sunX: 0.8, sunY: 0.45 });
}

function campusScene({ w, h, palette, seed, cross = false }) {
  const p = palettes[palette];
  const rand = rng(seed);
  const base = h * 0.8;
  let body = skyline(rand, { w, base: base - 60, count: 18, minH: h * 0.05, maxH: h * 0.14, fill: p.far, win: p.win });
  const bx = w * 0.12;
  const bw = w * 0.76;
  const bh = h * 0.34;
  body += `<rect x="${bx}" y="${base - bh}" width="${bw}" height="${bh}" fill="${p.near}"/>
    <rect x="${bx - 10}" y="${base - bh - 12}" width="${bw + 20}" height="14" fill="${p.mid}"/>
    <rect x="${bx + bw * 0.38}" y="${base - bh - 50}" width="${bw * 0.24}" height="50" fill="${p.near}"/>`;
  for (let c = 0; c < 12; c++) {
    body += `<rect x="${bx + 20 + (c * (bw - 40)) / 12}" y="${base - bh + 20}" width="${(bw - 40) / 12 - 10}" height="${bh - 20}" fill="#ffffff" opacity=".1"/>`;
  }
  body += windows(rand, bx + 10, base - bh + 24, bw - 20, bh - 40, p.win, 0.35);
  if (cross) {
    const cx = bx + bw / 2;
    const cy = base - bh - 26;
    body += `<rect x="${cx - 6}" y="${cy - 16}" width="12" height="32" fill="#e2483d"/><rect x="${cx - 16}" y="${cy - 6}" width="32" height="12" fill="#e2483d"/>`;
  } else {
    body += `<rect x="${bx + bw * 0.38}" y="${base - bh - 54}" width="${bw * 0.24}" height="6" fill="${GOLD}"/>`;
  }
  body += `<rect y="${base}" width="${w}" height="${h - base}" fill="${p.ground}"/>`;
  for (let t = 0; t < 9; t++) {
    const x = 20 + t * (w / 8.5);
    body += `<rect x="${x - 2}" y="${base - 6}" width="4" height="26" fill="#3b2f1e"/><circle cx="${x}" cy="${base - 14}" r="${16 + rand() * 8}" fill="#2f6b4f" opacity=".95"/>`;
  }
  return frame(w, h, `s${seed}`, p, body, { seed, sunX: 0.85, sunY: 0.3, sunR: 0.25 });
}

function hotelScene({ w, h, palette, seed }) {
  const p = palettes[palette];
  const rand = rng(seed);
  const base = h * 0.8;
  let body = "";
  body += `<path d="M0 ${base - 40} Q${w * 0.25} ${base - 120} ${w * 0.5} ${base - 60} T${w} ${base - 50} V${base} H0 Z" fill="${p.far}"/>`;
  const x = w * 0.32;
  const bw = w * 0.36;
  const bh = h * 0.6;
  body += `<path d="M${x} ${base} V${base - bh} Q${x + bw / 2} ${base - bh - 60} ${x + bw} ${base - bh} V${base} Z" fill="${p.near}"/>`;
  for (let r = 0; r < 16; r++) {
    body += `<rect x="${x + 8}" y="${base - bh + 18 + (r * (bh - 30)) / 16}" width="${bw - 16}" height="3" fill="${GOLD}" opacity=".55"/>`;
  }
  body += windows(rand, x + 10, base - bh + 20, bw - 20, bh - 30, p.win, 0.5);
  body += `<rect y="${base}" width="${w}" height="${h - base}" fill="${p.ground}"/>`;
  for (let t = 0; t < 6; t++) {
    const px = t < 3 ? 40 + t * 70 : w - 40 - (t - 3) * 70;
    const ph = 90 + rand() * 40;
    body += `<path d="M${px} ${base + 10} Q${px + 6} ${base - ph / 2} ${px + 2} ${base - ph}" stroke="#4a3a24" stroke-width="5" fill="none"/>`;
    for (let l = 0; l < 6; l++) {
      const a = (l / 6) * Math.PI * 2;
      body += `<path d="M${px + 2} ${base - ph} q${r1(Math.cos(a) * 26)} ${r1(Math.sin(a) * 10 - 6)} ${r1(Math.cos(a) * 44)} ${r1(Math.sin(a) * 18 + 10)}" stroke="#2f6b4f" stroke-width="7" stroke-linecap="round" fill="none"/>`;
    }
  }
  return frame(w, h, `h${seed}`, p, body, { seed, sunX: 0.75, sunY: 0.55 });
}

function abstractFacade({ w, h, seed, tint = GOLD }) {
  const rand = rng(seed);
  let body = `<rect width="${w}" height="${h}" fill="${NAVY}"/>`;
  const cols = 9;
  const cw = w / cols;
  for (let c = 0; c < cols; c++) {
    const skew = (c - cols / 2) * 6;
    for (let r = 0; r < 14; r++) {
      const op = r1(0.08 + rand() * 0.35);
      const fill = rand() > 0.82 ? tint : "#7fa4cf";
      body += `<path d="M${r1(c * cw + skew + 3)} ${r1((r * h) / 14 + 3)} h${r1(cw - 6)} l${r1(-skew / 7)} ${r1(h / 14 - 6)} h${r1(-(cw - 6))} Z" fill="${fill}" opacity="${op}"/>`;
    }
  }
  body += `<path d="M0 ${h * 0.72} L${w} ${h * 0.35} V${h} H0 Z" fill="${NAVY}" opacity=".55"/>
    <path d="M0 ${h * 0.74} L${w} ${h * 0.37}" stroke="${tint}" stroke-width="4"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice">${body}</svg>`;
}

function clientLogo(i) {
  const shapes = [
    `<circle cx="30" cy="30" r="18" fill="none" stroke="${NAVY}" stroke-width="6"/><circle cx="30" cy="30" r="6" fill="${GOLD}"/>`,
    `<path d="M12 48 L30 12 L48 48 Z" fill="${NAVY}"/><path d="M24 48 L30 36 L36 48 Z" fill="${GOLD}"/>`,
    `<rect x="12" y="12" width="36" height="36" rx="8" fill="${NAVY}"/><rect x="22" y="22" width="16" height="16" rx="3" fill="${GOLD}"/>`,
    `<path d="M10 30 Q30 4 50 30 Q30 56 10 30 Z" fill="${NAVY}"/><circle cx="30" cy="30" r="7" fill="${GOLD}"/>`,
    `<rect x="12" y="34" width="9" height="14" fill="${NAVY}"/><rect x="25" y="24" width="9" height="24" fill="${NAVY}"/><rect x="38" y="12" width="9" height="36" fill="${GOLD}"/>`,
    `<path d="M30 10 L50 22 V38 L30 50 L10 38 V22 Z" fill="${NAVY}"/><path d="M30 22 L40 28 V34 L30 40 L20 34 V28 Z" fill="${GOLD}"/>`,
    `<circle cx="22" cy="30" r="14" fill="${NAVY}"/><circle cx="38" cy="30" r="14" fill="${GOLD}" opacity=".85"/>`,
    `<path d="M12 44 C12 20 48 20 48 44" fill="none" stroke="${NAVY}" stroke-width="7" stroke-linecap="round"/><circle cx="30" cy="18" r="6" fill="${GOLD}"/>`,
  ];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60" width="200" height="60">
  ${shapes[i % shapes.length]}
  <text x="64" y="29" font-family="Arial, Helvetica, sans-serif" font-size="17" font-weight="700" fill="${NAVY}" letter-spacing="1">PARTNER</text>
  <text x="64" y="47" font-family="Arial, Helvetica, sans-serif" font-size="11" fill="#64748b" letter-spacing="3">DEMO 0${i + 1}</text>
</svg>`;
}

const logoMark = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e3c77c"/><stop offset="1" stop-color="${GOLD}"/></linearGradient></defs>
  <rect width="64" height="64" rx="16" fill="${NAVY}"/>
  <rect x="14" y="36" width="8" height="14" rx="2" fill="url(#g)" opacity=".55"/>
  <rect x="28" y="26" width="8" height="24" rx="2" fill="url(#g)" opacity=".8"/>
  <rect x="42" y="14" width="8" height="36" rx="2" fill="url(#g)"/>
  <path d="M12 30 L32 18 L44 11" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <path d="M38 10 H45 V17" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>`;

const files = {
  "hero.svg": cityScene({ w: 960, h: 800, palette: "dusk", seed: 7, sunX: 0.62, sunY: 0.66, sunR: 0.42 }),
  "about.svg": abstractFacade({ w: 800, h: 640, seed: 3 }),
  "why-us.svg": cityScene({ w: 800, h: 880, palette: "night", seed: 21, night: true, sunX: 0.75, sunY: 0.18, sunR: 0.12 }),
  "project-1.svg": cityScene({ w: 640, h: 544, palette: "day", seed: 11, landmarks: false, sunX: 0.8, sunY: 0.2, sunR: 0.2 }),
  "project-2.svg": warehouseScene({ w: 640, h: 544, palette: "golden", seed: 12 }),
  "project-3.svg": campusScene({ w: 640, h: 544, palette: "day", seed: 13, cross: true }),
  "project-4.svg": industrialScene({ w: 640, h: 544, palette: "dusk", seed: 14 }),
  "project-5.svg": campusScene({ w: 640, h: 544, palette: "golden", seed: 15 }),
  "project-6.svg": hotelScene({ w: 640, h: 544, palette: "dusk", seed: 16 }),
  "news-1.svg": cityScene({ w: 640, h: 400, palette: "golden", seed: 31, sunX: 0.3, sunY: 0.6 }),
  "news-2.svg": abstractFacade({ w: 640, h: 400, seed: 32, tint: "#e3c77c" }),
  "news-3.svg": cityScene({
    w: 640,
    h: 400,
    palette: "night",
    seed: 33,
    night: true,
    landmarks: false,
    sunX: 0.2,
    sunY: 0.2,
    sunR: 0.1,
  }),
  "service-supply.svg": warehouseScene({ w: 640, h: 420, palette: "day", seed: 41 }),
  "service-contracting.svg": cityScene({ w: 640, h: 420, palette: "golden", seed: 42, landmarks: false }),
  "service-facility.svg": campusScene({ w: 640, h: 420, palette: "dusk", seed: 43 }),
  "service-logistics.svg": warehouseScene({ w: 640, h: 420, palette: "dusk", seed: 44 }),
  "service-consulting.svg": abstractFacade({ w: 640, h: 420, seed: 45 }),
  "service-tech.svg": cityScene({ w: 640, h: 420, palette: "night", seed: 46, night: true, sunR: 0.1, sunY: 0.2 }),
  "gallery-1.svg": cityScene({ w: 800, h: 600, palette: "day", seed: 51, sunX: 0.2, sunY: 0.25, sunR: 0.2 }),
  "gallery-2.svg": warehouseScene({ w: 800, h: 600, palette: "dusk", seed: 52 }),
  "gallery-3.svg": warehouseScene({ w: 800, h: 600, palette: "golden", seed: 53 }),
  "gallery-4.svg": industrialScene({ w: 800, h: 600, palette: "golden", seed: 54 }),
  "gallery-5.svg": hotelScene({ w: 800, h: 600, palette: "night", seed: 55 }),
  "gallery-6.svg": abstractFacade({ w: 800, h: 600, seed: 56, tint: "#e3c77c" }),
  "gallery-7.svg": campusScene({ w: 800, h: 600, palette: "dusk", seed: 57, cross: true }),
  "gallery-8.svg": cityScene({ w: 800, h: 600, palette: "night", seed: 58, night: true, sunX: 0.8, sunY: 0.15, sunR: 0.1 }),
  "gallery-9.svg": industrialScene({ w: 800, h: 600, palette: "day", seed: 59 }),
  "page-header.svg": cityScene({ w: 1600, h: 500, palette: "night", seed: 61, night: true, sunX: 0.85, sunY: 0.2, sunR: 0.08 }),
};
for (let i = 0; i < 8; i++) files[`client-${i + 1}.svg`] = clientLogo(i);

for (const [name, svg] of Object.entries(files)) {
  writeFileSync(join(demoDir, name), svg.replace(/\n\s*/g, "\n"));
}
writeFileSync(join(brandDir, "logo-mark.svg"), logoMark);
console.log(`Generated ${Object.keys(files).length} demo images + brand mark.`);
