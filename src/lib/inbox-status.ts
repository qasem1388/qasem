type Tone = "blue" | "gold" | "red" | "green" | "gray";

export const messageStatuses = {
  NEW: { label: "جديدة", tone: "blue" },
  READ: { label: "مقروءة", tone: "gray" },
  ARCHIVED: { label: "مؤرشفة", tone: "gray" },
} as const satisfies Record<string, { label: string; tone: Tone }>;

export const quoteStatuses = {
  NEW: { label: "جديد", tone: "blue" },
  IN_REVIEW: { label: "قيد الدراسة", tone: "gold" },
  QUOTED: { label: "أُرسل العرض", tone: "gold" },
  WON: { label: "تمت الترسية", tone: "green" },
  LOST: { label: "لم يُرسَ", tone: "red" },
  CLOSED: { label: "مغلق", tone: "gray" },
} as const satisfies Record<string, { label: string; tone: Tone }>;

export type MessageStatus = keyof typeof messageStatuses;
export type QuoteStatus = keyof typeof quoteStatuses;
