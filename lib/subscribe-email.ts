const RESEND_SEND_URL = "https://api.resend.com/emails";

export function confirmationLink(token: string): string {
  const base = process.env.APP_URL?.replace(/\/$/, "") ?? "";
  if (!base) throw new Error("APP_URL is required for confirmation links");
  const url = new URL("/subscribe/confirm", base);
  url.searchParams.set("token", token);
  return url.toString();
}

export async function sendSubscribeConfirmationEmail(params: {
  to: string;
  newsletterTitle: string;
  confirmUrl: string;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM?.trim();
  if (!apiKey || !from) return false;

  const response = await fetch(RESEND_SEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [params.to],
      subject: `Confirm subscription — ${params.newsletterTitle}`,
      text: `Confirm your subscription to "${params.newsletterTitle}".\n\n${params.confirmUrl}\n`,
    }),
  });

  return response.ok;
}
