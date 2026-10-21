import "server-only";
import { revalidatePath } from "next/cache";

/** Regenerates every public page (both locales) after content or settings change. */
export function revalidateSite() {
  revalidatePath("/[locale]", "layout");
  revalidatePath("/sitemap.xml");
  revalidatePath("/robots.txt");
}
