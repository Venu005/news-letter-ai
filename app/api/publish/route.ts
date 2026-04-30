import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const RESEND_SEND_URL = "https://api.resend.com/emails";

const publishBodySchema = z.object({
  newsletterId: z.string().uuid(),
  to: z.string().email().optional(),
});

function truncateSubject(raw: string, max = 78): string {
  const t = raw.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1))}…`;
}

async function sendViaResend(params: {
  apiKey: string;
  from: string;
  to: string;
  subject: string;
  text: string;
}): Promise<{ ok: true; messageId?: string } | { ok: false }> {
  let response: Response;
  try {
    response = await fetch(RESEND_SEND_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: params.from,
        to: [params.to],
        subject: params.subject,
        text: params.text,
      }),
    });
  } catch {
    return { ok: false };
  }

  if (!response.ok) {
    console.error("Resend publish failed:", response.status);
    return { ok: false };
  }

  const payload = (await response.json().catch(() => null)) as { id?: string } | null;
  const messageId = typeof payload?.id === "string" ? payload.id : undefined;
  return { ok: true, messageId };
}

export async function POST(req: Request) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM?.trim();
  if (!apiKey || !from) {
    return NextResponse.json(
      { error: "Publishing is not configured on this server." },
      { status: 503 },
    );
  }

  const json = await req.json().catch(() => null);
  const parsed = publishBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  let recipient = parsed.data.to?.trim();
  if (!recipient) {
    recipient = process.env.NEWSLETTER_PUBLISH_TO?.trim();
  }
  if (!recipient) {
    return NextResponse.json(
      {
        error:
          'No recipient configured. Set NEWSLETTER_PUBLISH_TO or send a valid "to" address.',
      },
      { status: 400 },
    );
  }

  const newsletter = await prisma.newsletter.findUnique({
    where: { id: parsed.data.newsletterId },
    select: { id: true, niche: true, status: true, finalDraft: true },
  });

  if (!newsletter) {
    return NextResponse.json({ error: "Newsletter not found." }, { status: 404 });
  }

  if (newsletter.status === "PUBLISHED") {
    return NextResponse.json(
      { error: "This newsletter is already published." },
      { status: 409 },
    );
  }

  if (newsletter.status === "RESEARCHING") {
    return NextResponse.json(
      { error: "Finish researching and drafting before publishing." },
      { status: 400 },
    );
  }

  if (newsletter.status !== "DRAFTING" && newsletter.status !== "REVIEWING") {
    return NextResponse.json(
      { error: "Newsletter cannot be published in its current state." },
      { status: 400 },
    );
  }

  const bodyText = newsletter.finalDraft?.trim() ?? "";
  if (!bodyText) {
    return NextResponse.json(
      { error: "Draft is empty. Save or generate a draft before publishing." },
      { status: 400 },
    );
  }

  const subject = truncateSubject(`Newsletter: ${newsletter.niche}`);
  const sent = await sendViaResend({
    apiKey,
    from,
    to: recipient,
    subject,
    text: bodyText,
  });

  if (!sent.ok) {
    return NextResponse.json(
      { error: "Could not send email. Try again later." },
      { status: 502 },
    );
  }

  await prisma.newsletter.update({
    where: { id: newsletter.id },
    data: { status: "PUBLISHED" },
  });

  return NextResponse.json({
    ok: true,
    ...(sent.messageId !== undefined ? { messageId: sent.messageId } : {}),
  });
}
