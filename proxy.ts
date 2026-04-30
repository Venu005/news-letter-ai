import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/api/newsletters(.*)",
  "/api/generate-topics",
  "/api/generate-draft",
  "/api/publish",
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isProtectedRoute(req)) return;
  await auth.protect();
});

export const config = {
  matcher: [
    "/((?!.+\\.[\\w]+$|_next).*)",
    "/",
    "/(api|trpc)(.*)",
  ],
};
