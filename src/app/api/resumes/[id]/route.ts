import { NextResponse } from "next/server";
import { getResumeDeps } from "@/server/container";
import { getApiUser } from "@/server/auth/session";
import { handleRouteError, jsonError } from "@/server/http";
import { deleteResume, getResume, saveParsedData } from "@/server/modules/resumes/resume-service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const user = await getApiUser();
  if (!user) return jsonError(401, "Please sign in.");
  try {
    const { id } = await params;
    const resume = await getResume(getResumeDeps().db, user.id, id);
    return NextResponse.json(
      {
        id: resume.id,
        originalFilename: resume.originalFilename,
        fileType: resume.fileType,
        parseStatus: resume.parseStatus,
        parseError: resume.parseError,
        parsedData: resume.parsedData,
        updatedAt: resume.updatedAt,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PUT(request: Request, { params }: Params) {
  const user = await getApiUser();
  if (!user) return jsonError(401, "Please sign in.");
  try {
    const { id } = await params;
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError(400, "Invalid JSON body.");
    }
    const parsedData = await saveParsedData(getResumeDeps().db, user.id, id, body);
    return NextResponse.json({ parsedData });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const user = await getApiUser();
  if (!user) return jsonError(401, "Please sign in.");
  try {
    const { id } = await params;
    const deps = getResumeDeps();
    await deleteResume(deps.db, deps.storage, user.id, id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleRouteError(error);
  }
}
