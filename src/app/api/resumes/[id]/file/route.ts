import { getResumeDeps } from "@/server/container";
import { getApiUser } from "@/server/auth/session";
import { handleRouteError, jsonError } from "@/server/http";
import { readResumeFile } from "@/server/modules/resumes/resume-service";

const CONTENT_TYPES = {
  PDF: "application/pdf",
  DOCX: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
} as const;

/** Serves the original CV to its owner only. Never cached, always a download. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getApiUser();
  if (!user) return jsonError(401, "Please sign in.");
  try {
    const { id } = await params;
    const deps = getResumeDeps();
    const { resume, bytes } = await readResumeFile(deps.db, deps.storage, user.id, id);
    const filename = encodeURIComponent(resume.originalFilename);
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": CONTENT_TYPES[resume.fileType],
        "Content-Disposition": `attachment; filename*=UTF-8''${filename}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
