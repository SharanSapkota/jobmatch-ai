import { z, type ZodType } from "zod";
import { LLMError, type LLMProvider } from "./types";

/**
 * Shared validation + retry. Subclasses return raw (unvalidated) JSON; every
 * response is validated with Zod. On failure we retry exactly once, feeding the
 * validation error back to the model, then fail with a user-visible error.
 */
export abstract class BaseProvider implements LLMProvider {
  abstract readonly name: string;

  protected abstract generateRaw(prompt: string, jsonSchema: Record<string, unknown>): Promise<unknown>;

  async generateStructured<T>(prompt: string, schema: ZodType<T>): Promise<T> {
    const jsonSchema = z.toJSONSchema(schema, { io: "input" }) as Record<string, unknown>;

    const first = schema.safeParse(await this.generateRaw(prompt, jsonSchema));
    if (first.success) return first.data;

    const retryPrompt = `${prompt}\n\nYour previous response failed validation with these errors:\n${formatIssues(first.error)}\nReturn a corrected response that matches the schema exactly. Do not add fields that are not in the schema.`;
    const second = schema.safeParse(await this.generateRaw(retryPrompt, jsonSchema));
    if (second.success) return second.data;

    throw new LLMError(
      "The AI response could not be validated. Please try again, or enter the information manually.",
      "VALIDATION",
      { cause: second.error },
    );
  }
}

export function formatIssues(error: z.ZodError): string {
  return error.issues
    .slice(0, 20)
    .map((i) => `- ${i.path.join(".") || "(root)"}: ${i.message}`)
    .join("\n");
}
