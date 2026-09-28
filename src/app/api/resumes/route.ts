import { NextResponse } from "next/server";
import { getResumeDeps } from "@/server/container";
import { getApiUser } from "@/server/auth/session";
import { handleRouteError, jsonError } from "@/server/http";
import { uploadResume } from "@/server/modules/resumes/resume-service";

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return jsonError(401, "Please sign in.");

  const deps = getResumeDeps();
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  // Multipart overhead is small; reject clearly oversized bodies before buffering.
  if (declaredLength > deps.maxUploadBytes + 64 * 1024) {
    return jsonError(413, `The file is too large. The maximum size is ${Math.round(deps.maxUploadBytes / 1024 / 1024)} MB.`);
  }

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return jsonError(400, "Please choose a PDF or DOCX file.");
    const bytes = Buffer.from(await file.arrayBuffer());
    const resume = await uploadResume(deps, user.id, { name: file.name, size: file.size, bytes });
    return NextResponse.json(
      { id: resume.id, parseStatus: resume.parseStatus, parseError: resume.parseError },
      { status: 201 },
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
