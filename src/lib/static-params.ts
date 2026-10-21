/**
 * Pages are prerendered from the database during `next build`. When the build
 * machine cannot (or should not) reach the production database — e.g. a Docker
 * image build — set SKIP_PRERENDER=1: no pages are generated at build time,
 * each one renders on its first request and is then cached until content
 * changes in the admin panel.
 */
export const prerenderAtBuild = process.env.SKIP_PRERENDER !== "1";

export async function staticParams<T>(load: () => Promise<T[]> | T[]): Promise<T[]> {
  return prerenderAtBuild ? load() : [];
}
