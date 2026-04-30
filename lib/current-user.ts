import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { upsertUserByClerkId } from "@/lib/user-sync";

type UpsertOk = { ok: true; userId: string };
type UpsertFail = { ok: false };

async function upsertInternalUser(): Promise<UpsertOk | UpsertFail> {
  const { userId } = await auth();
  if (!userId) return { ok: false };

  const profile = await currentUser();
  const email =
    profile?.primaryEmailAddress?.emailAddress ??
    profile?.emailAddresses?.[0]?.emailAddress ??
    null;

  const user = await upsertUserByClerkId(userId, email);
  return { ok: true, userId: user.id };
}

/** Server components: signed-in internal user id, or null. */
export async function getInternalUserId(): Promise<string | null> {
  const r = await upsertInternalUser();
  return r.ok ? r.userId : null;
}

export async function requireInternalUserId(): Promise<
  { ok: true; userId: string } | { ok: false; response: NextResponse }
> {
  const r = await upsertInternalUser();
  if (!r.ok) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized." }, { status: 401 }),
    };
  }
  return { ok: true, userId: r.userId };
}
