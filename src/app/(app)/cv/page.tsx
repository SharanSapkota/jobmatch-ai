import type { Metadata } from "next";
import Link from "next/link";
import { Alert, Badge, Card, PageHeader } from "@/components/ui";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/auth/session";
import { NotFoundError } from "@/server/errors";
import { EMPTY_PARSED_CV, ParsedCvSchema } from "@/server/modules/parsing/cv-schema";
import { checkGrounding } from "@/server/modules/parsing/grounding";
import { getLatestResume, getResume, listResumes } from "@/server/modules/resumes/resume-service";
import { CvActions } from "./cv-actions";
import { CvEditor } from "./cv-editor";
import { UploadForm } from "./upload-form";

export const metadata: Metadata = { title: "My CV" };

const STATUS = {
  PARSED: { tone: "success", label: "Parsed" },
  PENDING: { tone: "info", label: "Processing" },
  FAILED: { tone: "danger", label: "Parsing failed" },
} as const;

async function loadResume(userId: string, id: string | undefined) {
  if (!id) return getLatestResume(prisma, userId);
  try {
    return await getResume(prisma, userId, id);
  } catch (error) {
    if (error instanceof NotFoundError) return null;
    throw error;
  }
}

export default async function CvPage({ searchParams }: PageProps<"/cv">) {
  const user = await requireUser();
  const { id } = await searchParams;
  const [resume, all] = await Promise.all([loadResume(user.id, typeof id === "string" ? id : undefined), listResumes(prisma, user.id)]);

  if (!resume) {
    return (
      <>
        <PageHeader title="My CV" description="Upload your CV. We extract your experience, education and skills so you can review and correct them." />
        {id ? <div className="mb-4"><Alert tone="warning">That CV could not be found.</Alert></div> : null}
        <UploadForm />
        <p className="mt-4 text-xs text-slate-500">
          Your CV is stored privately and is visible only to you. Before any text is sent to an AI provider, email addresses, phone numbers and links are removed.
        </p>
      </>
    );
  }

  const parsed = ParsedCvSchema.safeParse(resume.parsedData);
  const cv = parsed.success ? parsed.data : EMPTY_PARSED_CV;
  const warnings = parsed.success ? checkGrounding(cv, resume.extractedText) : [];
  const status = STATUS[resume.parseStatus];
  const others = all.filter((r) => r.id !== resume.id);

  return (
    <>
      <PageHeader
        title="My CV"
        description="Review what we extracted and correct anything that is wrong or missing. Matching only uses what is saved here."
        action={<UploadForm compact />}
      />

      <Card className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-slate-900">{resume.originalFilename}</h2>
              <Badge tone={status.tone}>{status.label}</Badge>
            </div>
            <p className="mt-1 text-sm text-slate-600">
              {resume.fileType} · uploaded {resume.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} · last
              updated {resume.updatedAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          </div>
          <CvActions resumeId={resume.id} filename={resume.originalFilename} parsed={resume.parseStatus === "PARSED"} />
        </div>
        {resume.parseStatus === "FAILED" ? (
          <div className="mt-4">
            <Alert tone="danger" title="We could not extract your CV automatically">
              {resume.parseError ?? "Unknown error."} You can retry, or fill in your details manually below.
            </Alert>
          </div>
        ) : null}
      </Card>

      <CvEditor key={`${resume.id}-${resume.updatedAt.getTime()}`} resumeId={resume.id} initial={cv} warnings={warnings} />

      {others.length > 0 ? (
        <Card className="mt-8">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Other uploaded CVs</h2>
          <ul className="divide-y divide-slate-100 text-sm">
            {others.map((r) => (
              <li key={r.id} className="flex items-center justify-between py-2">
                <Link href={`/cv?id=${r.id}`} className="font-medium text-blue-700 hover:underline">
                  {r.originalFilename}
                </Link>
                <span className="text-slate-500">{r.createdAt.toLocaleDateString("en-GB")}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </>
  );
}
