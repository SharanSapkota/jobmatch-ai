import type { Metadata } from "next";
import Link from "next/link";
import { Badge, ButtonLink, Card, CardHeader, EmptyState, PageHeader } from "@/components/ui";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/auth/session";
import { ParsedCvSchema } from "@/server/modules/parsing/cv-schema";
import { profileChecklist } from "@/server/modules/profile/completeness";
import { getProfile } from "@/server/modules/profile/profile-service";
import { getLatestResume } from "@/server/modules/resumes/resume-service";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireUser();
  const [resume, profile] = await Promise.all([getLatestResume(prisma, user.id), getProfile(prisma, user.id)]);
  const parsed = resume ? ParsedCvSchema.safeParse(resume.parsedData) : null;
  const cv = parsed?.success ? parsed.data : null;
  const checklist = profileChecklist(profile);
  const done = checklist.filter((c) => c.done).length;

  return (
    <>
      <PageHeader title={`Welcome${user.name ? `, ${user.name}` : ""}`} description="Your job search at a glance." />
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader title="Your CV" action={resume ? <ButtonLink href="/cv" variant="secondary">Review CV</ButtonLink> : undefined} />
          {!resume ? (
            <EmptyState
              title="No CV uploaded"
              description="Upload your CV to get started. Everything else builds on it."
              action={<ButtonLink href="/cv">Upload CV</ButtonLink>}
            />
          ) : cv ? (
            <dl className="grid grid-cols-3 gap-4 text-center">
              {[
                ["Positions", cv.experience.length],
                ["Education", cv.education.length],
                ["Skills", cv.skills.length],
              ].map(([label, n]) => (
                <div key={label} className="rounded-md bg-slate-50 p-3">
                  <dt className="text-xs text-slate-500">{label}</dt>
                  <dd className="text-xl font-semibold text-slate-900">{n}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-sm text-slate-700">
              <Badge tone="danger">Parsing failed</Badge>{" "}
              <Link href="/cv" className="text-blue-700 hover:underline">Retry or enter details manually</Link>.
            </p>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Job preferences"
            description={`${done} of ${checklist.length} completed`}
            action={<ButtonLink href="/profile" variant="secondary">Edit profile</ButtonLink>}
          />
          <div className="mb-4 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuemin={0} aria-valuemax={checklist.length} aria-valuenow={done} aria-label="Profile completeness">
            <div className="h-full bg-blue-700" style={{ width: `${(done / checklist.length) * 100}%` }} />
          </div>
          <ul className="space-y-1.5 text-sm">
            {checklist.map((c) => (
              <li key={c.label} className="flex items-center gap-2">
                <span aria-hidden className={c.done ? "text-green-700" : "text-slate-400"}>{c.done ? "✓" : "○"}</span>
                <span className={c.done ? "text-slate-700" : "text-slate-500"}>{c.label}</span>
                <span className="sr-only">{c.done ? "completed" : "missing"}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader title="Recommended jobs" />
          <p className="text-sm text-slate-600">
            Job matching is not available yet. Once it is, jobs will appear here with an internal compatibility score and a clear list of what your CV does and does not show evidence for.
          </p>
        </Card>
      </div>
    </>
  );
}
