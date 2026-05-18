/** Server-derived newsletter count for the signed-in user (dashboard list query). */
export function needsFirstNewsletterOnboarding(newsletterCount: number): boolean {
  return newsletterCount === 0;
}
