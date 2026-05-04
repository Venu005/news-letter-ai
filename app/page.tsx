import { auth } from "@clerk/nextjs/server";
import { OrchestraLanding } from "@/components/landing/orchestra-landing";

/** Public marketing home: no internal user sync here (that belongs on protected routes). */
export default async function Home() {
  const { userId } = await auth();
  return <OrchestraLanding signedIn={!!userId} />;
}
