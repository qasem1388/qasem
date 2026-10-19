import { ApiError } from "@/shared/api/client";

type Tx = (key: string, params?: Record<string, string | number>) => string;

/** Human-readable Arabic text for any thrown value. */
export function errorText(e: unknown, tx: Tx): string {
  if (e instanceof ApiError) {
    if (e.code === "no_backend") return tx("system.noBackend");
    const key = `errors.${e.code}`;
    const text = tx(key, { minutes: e.minutesRemaining ?? 15 });
    // Unknown code (e.g. a new accounting rule): show the backend's Arabic message.
    return text === key ? e.message : text;
  }
  return tx("errors.unknown");
}
