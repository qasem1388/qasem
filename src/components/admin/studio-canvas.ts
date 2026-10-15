"use client";

/**
 * توليد 6 صور استوديو احترافية داخل المتصفح (Canvas).
 * يُستخدم عندما لا يدعم معالج الخادم مكتبة معالجة الصور.
 */

const SIZE = 1200;

export const STUDIO_STYLES = [
  "استوديو أبيض نقي",
  "تدرّج ناعم مع إضاءة",
  "منصة عرض بلون العلامة",
  "خلفية دافئة عصرية",
  "فخامة داكنة",
  "لقطة مقرّبة للتفاصيل",
] as const;

type Ctx = CanvasRenderingContext2D;

function canvas(w = SIZE, h = SIZE) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawBackground(ctx: Ctx, style: number) {
  const g = (stops: [number, string][], grad: CanvasGradient) => {
    stops.forEach(([o, c]) => grad.addColorStop(o, c));
    return grad;
  };
  switch (style) {
    case 0:
    case 5:
      ctx.fillStyle = style === 0 ? "#ffffff" : "#fafafa";
      ctx.fillRect(0, 0, SIZE, SIZE);
      break;
    case 1:
      ctx.fillStyle = g([[0, "#ffffff"], [1, "#e6e9ee"]], ctx.createRadialGradient(600, 480, 0, 600, 480, 900));
      ctx.fillRect(0, 0, SIZE, SIZE);
      break;
    case 2:
      ctx.fillStyle = g([[0, "#dfece6"], [1, "#94beaf"]], ctx.createLinearGradient(0, 0, 0, SIZE));
      ctx.fillRect(0, 0, SIZE, SIZE);
      ctx.fillStyle = "rgba(255,255,255,.85)";
      ctx.beginPath();
      ctx.ellipse(600, 1010, 430, 70, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f2f7f5";
      ctx.beginPath();
      ctx.ellipse(600, 1000, 430, 70, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 3:
      ctx.fillStyle = "#f6efe6";
      ctx.fillRect(0, 0, SIZE, SIZE);
      ctx.fillStyle = "#ead9c4";
      ctx.beginPath();
      ctx.moveTo(0, 820);
      ctx.lineTo(SIZE, 620);
      ctx.lineTo(SIZE, SIZE);
      ctx.lineTo(0, SIZE);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#f1e3d1";
      ctx.beginPath();
      ctx.arc(980, 230, 170, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 4:
      ctx.fillStyle = g([[0, "#3a3f3d"], [1, "#121413"]], ctx.createRadialGradient(600, 540, 0, 600, 540, 840));
      ctx.fillRect(0, 0, SIZE, SIZE);
      ctx.strokeStyle = "rgba(201,154,69,.55)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(600, 560, 420, 0, Math.PI * 2);
      ctx.stroke();
      break;
  }
}

/** قص الحواف ذات اللون الموحّد (مثل الخلفية البيضاء) لإبراز المنتج */
function trimBox(img: ImageBitmap): { x: number; y: number; w: number; h: number } {
  const scale = Math.min(1, 400 / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const c = canvas(w, h);
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);
  const [r0, g0, b0] = [data[0], data[1], data[2]];
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (Math.abs(data[i] - r0) + Math.abs(data[i + 1] - g0) + Math.abs(data[i + 2] - b0) > 54) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0 || (maxX - minX) < w * 0.2 || (maxY - minY) < h * 0.2) return { x: 0, y: 0, w: img.width, h: img.height };
  const pad = 6;
  const x = Math.max(0, (minX - pad) / scale);
  const y = Math.max(0, (minY - pad) / scale);
  return { x, y, w: Math.min(img.width - x, (maxX - minX + pad * 2) / scale), h: Math.min(img.height - y, (maxY - minY + pad * 2) / scale) };
}

function drawCard(ctx: Ctx, img: ImageBitmap, src: { x: number; y: number; w: number; h: number }, x: number, y: number, w: number, h: number, shadow: number) {
  ctx.save();
  ctx.shadowColor = `rgba(0,0,0,${shadow})`;
  ctx.shadowBlur = 60;
  ctx.shadowOffsetY = 18;
  roundRect(ctx, x, y, w, h, 36);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.restore();
  ctx.save();
  roundRect(ctx, x, y, w, h, 36);
  ctx.clip();
  ctx.filter = "saturate(1.05) brightness(1.02) contrast(1.03)";
  ctx.drawImage(img, src.x, src.y, src.w, src.h, x, y, w, h);
  ctx.restore();
}

function toBlob(c: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error("تعذّر إنشاء الصورة"))), "image/jpeg", 0.9));
}

export async function composeStudioImages(file: Blob): Promise<{ blob: Blob; style: string }[]> {
  const img = await createImageBitmap(file);
  const box = trimBox(img);
  const ratio = box.w / box.h;
  const results: { blob: Blob; style: string }[] = [];

  for (let style = 0; style < 6; style++) {
    const c = canvas();
    const ctx = c.getContext("2d")!;
    ctx.imageSmoothingQuality = "high";
    drawBackground(ctx, style);

    if (style === 5) {
      // لقطة مقرّبة: تكبير منتصف المنتج
      const side = Math.min(box.w, box.h) * 0.62;
      const src = { x: box.x + (box.w - side) / 2, y: box.y + (box.h - side) / 2, w: side, h: side };
      drawCard(ctx, img, src, 80, 80, 1040, 1040, 0.18);
    } else {
      const maxW = style === 0 ? 900 : 820;
      const maxH = style === 2 ? 760 : 860;
      let w = maxW;
      let h = Math.round(w / ratio);
      if (h > maxH) {
        h = maxH;
        w = Math.round(h * ratio);
      }
      const x = Math.round((SIZE - w) / 2);
      const y = style === 2 ? 990 - h : Math.round((SIZE - h) / 2) - 20;
      drawCard(ctx, img, box, x, y, w, h, style === 4 ? 0.55 : 0.22);
    }
    results.push({ blob: await toBlob(c), style: STUDIO_STYLES[style] });
  }
  img.close();
  return results;
}
