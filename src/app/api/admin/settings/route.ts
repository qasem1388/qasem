import { NextResponse } from "next/server";
import { DEFAULT_SETTINGS, updateSettings } from "@/lib/settings";

export async function PUT(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const patch = Object.fromEntries(Object.entries(body).filter(([k, v]) => k in DEFAULT_SETTINGS && typeof v === "string"));
  return NextResponse.json(await updateSettings(patch));
}
