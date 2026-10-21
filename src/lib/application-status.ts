export const applicationStatuses = {
  NEW: { label: "جديد", tone: "blue" },
  SHORTLISTED: { label: "قائمة مختصرة", tone: "gold" },
  INTERVIEW: { label: "مقابلة", tone: "gold" },
  REJECTED: { label: "مرفوض", tone: "red" },
  HIRED: { label: "تم التعيين", tone: "green" },
} as const;

export type ApplicationStatus = keyof typeof applicationStatuses;
