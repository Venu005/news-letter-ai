"use client";

import Link from "next/link";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { fetchNewsletterDetail } from "@/lib/query/fetch-newsletter-detail";
import { newsletterDetailQueryKey } from "@/lib/query/newsletter-keys";

export function IssuesList({ newsletterId }: { newsletterId: string }) {
  const { data } = useSuspenseQuery({
    queryKey: newsletterDetailQueryKey(newsletterId),
    queryFn: ({ signal }) => fetchNewsletterDetail(newsletterId, { signal }),
  });

  if (data.issues.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-[#6F6F6F]">
            No articles yet. Use the form above to create your first one.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <section className="flex flex-col gap-intel-stack-md">
      <h2 className="orchestra-heading text-xl font-normal text-black">Articles</h2>
      <div className="flex flex-col gap-intel-stack-sm">
        {data.issues.map((issue) => {
          const isPublished = issue.status === "PUBLISHED" && issue.slug;
          const editTarget =
            issue.status === "REVIEWING" || issue.status === "PUBLISHED"
              ? "draft"
              : "topics";
          return (
            <Card key={issue.id} size="sm">
              <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-intel-stack-md space-y-0">
                <div className="min-w-0 space-y-1">
                  <CardTitle className="text-base font-medium text-black">
                    {issue.title ?? issue.niche}
                  </CardTitle>
                  <CardDescription className="text-[#6F6F6F]">
                    {issue.publishedAt
                      ? `Published ${new Date(issue.publishedAt).toLocaleDateString()}`
                      : `Updated ${new Date(issue.updatedAt).toLocaleDateString()}`}
                  </CardDescription>
                </div>
                <Badge variant="secondary">{issue.status}</Badge>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-intel-stack-sm pt-0">
                <Button variant="outline" size="sm" asChild>
                  <Link
                    href={`/dashboard/newsletter/${newsletterId}/issue/${issue.id}/${editTarget}`}
                  >
                    {issue.status === "PUBLISHED" ? "View" : "Edit"}
                  </Link>
                </Button>
                {isPublished ? (
                  <Button variant="outline" size="sm" asChild>
                    <Link
                      href={`/p/${data.newsletter.slug}/i/${issue.slug}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Public link
                    </Link>
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
