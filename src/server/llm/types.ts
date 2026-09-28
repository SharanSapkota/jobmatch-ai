import type { ZodType } from "zod";

export interface LLMProvider {
  readonly name: string;
  generateStructured<T>(prompt: string, schema: ZodType<T>): Promise<T>;
}

/** User-safe failure from the LLM layer. `message` may be shown in the UI. */
export class LLMError extends Error {
  constructor(
    message: string,
    readonly code: "VALIDATION" | "PROVIDER" | "RATE_LIMITED" | "REFUSED",
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "LLMError";
  }
}
