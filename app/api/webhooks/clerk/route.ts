import { verifyWebhook } from "@clerk/nextjs/webhooks";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { primaryEmailFromClerkWebhookUser } from "@/lib/clerk-webhook-user";
import { upsertUserByClerkId } from "@/lib/user-sync";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let evt;
  try {
    evt = await verifyWebhook(req);
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
  }

  if (evt.type === "user.created" || evt.type === "user.updated") {
    const data = evt.data;
    if (!data || typeof data !== "object" || !("id" in data)) {
      return NextResponse.json({ ok: true });
    }
    const record = data as Parameters<typeof primaryEmailFromClerkWebhookUser>[0];
    const email = primaryEmailFromClerkWebhookUser(record);
    await upsertUserByClerkId(record.id, email);
  }

  return NextResponse.json({ ok: true });
}
