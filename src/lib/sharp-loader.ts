import type SharpType from "sharp";

/**
 * تحميل sharp عند الحاجة فقط: على بعض خوادم VPS (معالج QEMU قديم بدون SSE4)
 * لا يعمل sharp إطلاقاً، فنعيد null ونستخدم المعالجة داخل المتصفح بدلاً منه.
 */
let cached: Promise<typeof SharpType | null> | undefined;

export function getSharp(): Promise<typeof SharpType | null> {
  if (process.env.DISABLE_SHARP === "true") return Promise.resolve(null);
  cached ??= import("sharp")
    .then((m) => (m.default ?? m) as typeof SharpType)
    .then(async (s) => {
      // تأكد أنه يعمل فعلاً (بعض الأخطاء لا تظهر إلا عند أول عملية)
      await s({ create: { width: 2, height: 2, channels: 3, background: "#fff" } }).png().toBuffer();
      return s;
    })
    .catch((e) => {
      console.warn("sharp unavailable, using browser-side image processing:", String(e?.message ?? e).split("\n")[0]);
      return null;
    });
  return cached;
}

/** يتعرف على نوع الصورة من أول بايتات الملف */
export function sniffImage(buf: Buffer): { ext: "jpg" | "png" | "webp"; mime: "image/jpeg" | "image/png" | "image/webp" } | null {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: "jpg", mime: "image/jpeg" };
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { ext: "png", mime: "image/png" };
  if (buf.length > 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return { ext: "webp", mime: "image/webp" };
  return null;
}
