/** Extract primary email from Clerk `user.*` webhook payload `data`. */
export function primaryEmailFromClerkWebhookUser(data: {
  id: string;
  email_addresses?: Array<{ id: string; email_address: string }>;
  primary_email_address_id?: string | null;
}): string | null {
  const addresses = data.email_addresses;
  if (!addresses?.length) return null;
  const primaryId = data.primary_email_address_id;
  if (primaryId) {
    const match = addresses.find((a) => a.id === primaryId);
    if (match) return match.email_address;
  }
  return addresses[0]?.email_address ?? null;
}
