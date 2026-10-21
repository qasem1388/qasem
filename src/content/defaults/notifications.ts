export type NotifyKind = "contact" | "quote" | "application";

export type NotificationSettings = {
  /** Master switch for all notification and confirmation emails. */
  enabled: boolean;
  /** Team addresses alerted for each new submission type. */
  recipients: Record<NotifyKind, string[]>;
  /** Send a confirmation email (with the reference number) to the person who submitted. */
  autoReply: Record<NotifyKind, boolean>;
};

export const defaultNotifications: NotificationSettings = {
  enabled: true,
  recipients: { contact: [], quote: [], application: [] },
  autoReply: { contact: true, quote: true, application: true },
};
