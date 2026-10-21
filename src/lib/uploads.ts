import "server-only";

export type UploadKind = "pdf" | "doc" | "docx" | "xlsx" | "png" | "jpg" | "webp" | "gif" | "svg" | "ico";

const extensions: Record<UploadKind, string[]> = {
  pdf: ["pdf"],
  doc: ["doc"],
  docx: ["docx"],
  xlsx: ["xlsx"],
  png: ["png"],
  jpg: ["jpg", "jpeg"],
  webp: ["webp"],
  gif: ["gif"],
  svg: ["svg"],
  ico: ["ico"],
};

export const contentTypes: Record<UploadKind, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
  ico: "image/x-icon",
};

/** Rejects SVGs that could carry active content (scripts, event handlers, external references). */
function isSafeSvg(b: Uint8Array) {
  const text = new TextDecoder().decode(b.slice(0, 2 * 1024 * 1024)).trimStart();
  if (!/^(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*(<!DOCTYPE svg[^>]*>\s*)?<svg[\s>]/i.test(text)) return false;
  return !/<script|<foreignObject|\son[a-z]+\s*=|javascript:|data:text\/html|<iframe|<embed|<object|xlink:href\s*=\s*["'](?!#)|href\s*=\s*["'](?!#)/i.test(
    text,
  );
}

/** Leading "magic" bytes; the declared extension must agree with the real content. */
const signatures: Record<UploadKind, (b: Uint8Array) => boolean> = {
  pdf: (b) => b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46, // %PDF
  doc: (b) => b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0, // OLE2
  docx: (b) => b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04, // ZIP
  xlsx: (b) => b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04,
  png: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  jpg: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  webp: (b) => b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45,
  gif: (b) => b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38,
  svg: isSafeSvg,
  ico: (b) => b[0] === 0x00 && b[1] === 0x00 && b[2] === 0x01 && b[3] === 0x00,
};

export type ValidatedFile = { name: string; kind: UploadKind; size: number; bytes: Uint8Array };

/**
 * Validates an uploaded file by size, extension and file signature.
 * Returns `null` when no file was sent, or an error code when rejected.
 */
export async function validateUpload(
  value: FormDataEntryValue | null,
  opts: { maxBytes: number; allowed: UploadKind[] },
): Promise<ValidatedFile | null | "invalid"> {
  if (!value || typeof value === "string" || value.size === 0) return null;
  if (value.size > opts.maxBytes) return "invalid";

  const ext = value.name.split(".").pop()?.toLowerCase() ?? "";
  const kind = opts.allowed.find((k) => extensions[k].includes(ext));
  if (!kind) return "invalid";

  const bytes = new Uint8Array(await value.arrayBuffer());
  if (!signatures[kind](bytes)) return "invalid";

  // Keep only a safe, short display name; storage (phase 6) uses generated keys.
  const name = value.name.replace(/[^\p{L}\p{N}._ -]/gu, "_").slice(-120);
  return { name, kind, size: value.size, bytes };
}

export const CV_RULES = { maxBytes: 5 * 1024 * 1024, allowed: ["pdf", "doc", "docx"] as UploadKind[] };
export const ATTACHMENT_RULES = {
  maxBytes: 8 * 1024 * 1024,
  allowed: ["pdf", "doc", "docx", "xlsx", "png", "jpg", "webp"] as UploadKind[],
};

export const IMAGE_RULES = {
  maxBytes: 5 * 1024 * 1024,
  allowed: ["png", "jpg", "webp", "gif", "svg", "ico"] as UploadKind[],
};
