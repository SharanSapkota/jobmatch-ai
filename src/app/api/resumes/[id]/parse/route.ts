import { NextResponse } from "next/server";
import { getResumeDeps } from "@/server/container";
import { getApiUser } from "@/server/auth/session";
import { handleRouteError, jsonError } from "@/server/http";
import { parseResume } from "@/server/modules/resumes/resume-service";

/** Explicit user request to re-run extraction. Replaces any edits. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getApiUser();
  if (!user) return jsonError(401, "Please sign in.");
  try {
    const { id } = await params;
    const resume = await parseResume(getResumeDeps(), user.id, id, { force: true });
    return NextResponse.json({ id: resume.id, parseStatus: resume.parseStatus, parseError: resume.parseError });
  } catch (error) {
    return handleRouteError(error);
  }
}
