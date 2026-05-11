import { NextResponse } from "next/server";
import { z } from "zod";
import { requireInternalUserId } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { allocateNewsletterSlug } from "@/lib/slug";

const createNewsletterSchema = z.object({
  name: z.string().trim().min(1).max(120),
});

export async function POST(req: Request) {
  const authResult = await requireInternalUserId();
  if (!authResult.ok) return authResult.response;

  const json = await req.json().catch(() => null);
  const parsed = createNewsletterSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const slug = await allocateNewsletterSlug(parsed.data.name, async (candidate) => {
    const row = await prisma.newsletter.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    return !!row;
  });

  const newsletter = await prisma.newsletter.create({
    data: {
      name: parsed.data.name,
      slug,
      userId: authResult.userId,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      tagline: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({
    newsletter: {
      id: newsletter.id,
      name: newsletter.name,
      slug: newsletter.slug,
      tagline: newsletter.tagline,
      createdAt: newsletter.createdAt.toISOString(),
      updatedAt: newsletter.updatedAt.toISOString(),
    },
  });
}
