import { auth } from "@clerk/nextjs/server";
import { CinematicLanding } from "@/components/landing/cinematic-landing";

/** Public marketing home: no internal user sync here (that belongs on protected routes). */
export default async function Home() {
  const { userId } = await auth();
  return <CinematicLanding signedIn={!!userId} />;
}
