import "server-only";
import { NextResponse } from "next/server";
import { NotFoundError, UserInputError } from "@/server/errors";
import { LLMError } from "@/server/llm/types";

export function jsonError(status: number, error: string) {
  return NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

/** Maps domain errors to HTTP responses; unknown errors become a generic 500. */
export function handleRouteError(error: unknown) {
  if (error instanceof NotFoundError) return jsonError(404, "Not found");
  if (error instanceof UserInputError) return jsonError(400, error.message);
  if (error instanceof LLMError) return jsonError(error.code === "RATE_LIMITED" ? 429 : 502, error.message);
  console.error(error);
  return jsonError(500, "Something went wrong. Please try again.");
}
