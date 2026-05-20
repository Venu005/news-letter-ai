import { NextResponse } from "next/server";
import { z } from "zod";
import { requireInternalUserId } from "@/lib/current-user";
import { issueOwnedBy } from "@/lib/issue-owner";
import { extractTitleFromMarkdown } from "@/lib/markdown-title";
import { prisma } from "@/lib/prisma";
import type { IssueDetail, IssueStatus } from "@/lib/types/issue";
import type { Topic } from "@/lib/types/topic";

const patchIssueSchema = z.object({
  finalDraft: z.string().optional(),
});

function mapIssue(row: {
  id: string;
  newsletterId: string;
  niche: string;
  title: string | null;
  status: string;
  slug: string | null;
  publishedAt: Date | null;
  finalDraft: string | null;
  createdAt: Date;
  updatedAt: Date;
}): IssueDetail {
  return {
    id: row.id,
    newsletterId: row.newsletterId,
    niche: row.niche,
    title: row.title,
    status: row.status as IssueStatus,
    slug: row.slug,
    publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
    finalDraft: row.finalDraft,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapTopic(row: {
  id: string;
  title: string;
  sourceUrl: string;
  brief: string;
  keyFacts: string;
  fullText: string;
  isApproved: boolean;
  issueId: string;
}): Topic {
  let parsedKeyFacts: string[];
  try {
    parsedKeyFacts = JSON.parse(row.keyFacts);
  } catch {
    parsedKeyFacts = [row.keyFacts];
  }
  return {
    id: row.id,
    title: row.title,
    brief: row.brief,
    keyFacts: parsedKeyFacts,
    fullText: row.fullText,
    sourceUrl: row.sourceUrl,
    isApproved: row.isApproved,
    issueId: row.issueId,
  };
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const authResult = await requireInternalUserId();
  if (!authResult.ok) return authResult.response;

  const { id } = await ctx.params;
  const owner = await issueOwnedBy(id, authResult.userId);
  if (!owner) {
    return NextResponse.json({ error: "Issue not found." }, { status: 404 });
  }

  const issue = await prisma.issue.findUnique({
    where: { id },
    include: { topics: { orderBy: { title: "asc" } } },
  });
  if (!issue) {
    return NextResponse.json({ error: "Issue not found." }, { status: 404 });
  }

  return NextResponse.json({
    issue: mapIssue(issue),
    topics: issue.topics.map(mapTopic),
  });
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const authResult = await requireInternalUserId();
  if (!authResult.ok) return authResult.response;

  const { id } = await ctx.params;
  const owner = await issueOwnedBy(id, authResult.userId);
  if (!owner) {
    return NextResponse.json({ error: "Issue not found." }, { status: 404 });
  }

  const json = await req.json().catch(() => null);
  const parsed = patchIssueSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  if (parsed.data.finalDraft === undefined) {
    return NextResponse.json({ error: "At least one field required." }, { status: 400 });
  }

  const issueBefore = await prisma.issue.findUnique({
    where: { id },
    select: { niche: true, status: true },
  });
  if (!issueBefore) {
    return NextResponse.json({ error: "Issue not found." }, { status: 404 });
  }

  const title =
    extractTitleFromMarkdown(parsed.data.finalDraft, issueBefore.niche) ?? issueBefore.niche;

  const issue = await prisma.issue.update({
    where: { id },
    data: {
      finalDraft: parsed.data.finalDraft,
      title,
    },
    include: { topics: { orderBy: { title: "asc" } } },
  });

  return NextResponse.json({
    issue: mapIssue(issue),
    topics: issue.topics.map(mapTopic),
  });
}
