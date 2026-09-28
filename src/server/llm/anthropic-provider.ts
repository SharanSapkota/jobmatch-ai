import Anthropic from "@anthropic-ai/sdk";
import { BaseProvider } from "./base-provider";
import { LLMError } from "./types";

const SYSTEM = [
  "You extract structured data for a job-search assistant.",
  "Use only information present in the input. Never invent employers, titles, dates, skills, metrics or qualifications.",
  "When information is missing, use null or an empty list.",
  "Respond with JSON that matches the provided schema exactly.",
].join(" ");

export class AnthropicProvider extends BaseProvider {
  readonly name = "anthropic";
  private readonly client: Anthropic;

  constructor(
    apiKey: string,
    private readonly model: string,
  ) {
    super();
    this.client = new Anthropic({ apiKey });
  }

  protected async generateRaw(prompt: string, jsonSchema: Record<string, unknown>): Promise<unknown> {
    let response: Anthropic.Beta.BetaMessage;
    try {
      response = await this.client.beta.messages.create({
        model: this.model,
        // On a policy refusal the API re-runs the request on a fallback model.
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        max_tokens: 16000,
        system: SYSTEM,
        messages: [{ role: "user", content: prompt }],
        output_config: { format: { type: "json_schema", schema: jsonSchema } },
      });
    } catch (error) {
      if (error instanceof Anthropic.RateLimitError) {
        throw new LLMError("The AI provider is busy. Please try again in a minute.", "RATE_LIMITED", { cause: error });
      }
      if (error instanceof Anthropic.APIError) {
        throw new LLMError("The AI provider returned an error. Please try again later.", "PROVIDER", { cause: error });
      }
      throw new LLMError("Could not reach the AI provider. Please try again later.", "PROVIDER", { cause: error });
    }

    if (response.stop_reason === "refusal") {
      throw new LLMError("The AI provider declined to process this document.", "REFUSED");
    }
    const text = response.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    try {
      return JSON.parse(text) as unknown;
    } catch {
      // Returned as-is so validation fails and the retry path runs.
      return text;
    }
  }
}
