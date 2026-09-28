import { describe, expect, it } from "vitest";
import { z } from "zod";
import { BaseProvider } from "@/server/llm/base-provider";
import { MockProvider } from "@/server/llm/mock-provider";
import { LLMError } from "@/server/llm/types";
import { buildCvExtractionPrompt } from "@/server/prompts/cv-extraction";
import { ParsedCvSchema } from "@/server/modules/parsing/cv-schema";
import { CANDIDATE_C_CV } from "../fixtures/candidates";

class ScriptedProvider extends BaseProvider {
  readonly name = "scripted";
  prompts: string[] = [];
  constructor(private readonly responses: unknown[]) {
    super();
  }
  protected async generateRaw(prompt: string): Promise<unknown> {
    this.prompts.push(prompt);
    return this.responses.shift();
  }
}

const Schema = z.strictObject({ name: z.string(), years: z.number() });

describe("BaseProvider validation and retry", () => {
  it("returns valid output without retrying", async () => {
    const p = new ScriptedProvider([{ name: "a", years: 1 }]);
    await expect(p.generateStructured("prompt", Schema)).resolves.toEqual({ name: "a", years: 1 });
    expect(p.prompts).toHaveLength(1);
  });

  it("retries once with the validation error, then succeeds", async () => {
    const p = new ScriptedProvider([{ name: "a", years: "one" }, { name: "a", years: 1 }]);
    await expect(p.generateStructured("prompt", Schema)).resolves.toEqual({ name: "a", years: 1 });
    expect(p.prompts).toHaveLength(2);
    expect(p.prompts[1]).toMatch(/failed validation/);
    expect(p.prompts[1]).toMatch(/years/);
  });

  it("fails with a user-visible error after the retry also fails", async () => {
    const p = new ScriptedProvider([{ name: "a", years: 1, invented: true }, "not json"]);
    const error = await p.generateStructured("prompt", Schema).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(LLMError);
    expect((error as LLMError).code).toBe("VALIDATION");
    expect(p.prompts).toHaveLength(2);
  });
});

describe("MockProvider", () => {
  it("extracts a CV deterministically", async () => {
    const provider = new MockProvider();
    const prompt = buildCvExtractionPrompt(CANDIDATE_C_CV);
    const a = await provider.generateStructured(prompt, ParsedCvSchema);
    const b = await provider.generateStructured(prompt, ParsedCvSchema);
    expect(a).toEqual(b);
    expect(a.experience[0].company).toBe("Freshmart");
  });

  it("rejects prompts it has no handler for", async () => {
    await expect(new MockProvider().generateStructured("TASK: unknown\n", Schema)).rejects.toBeInstanceOf(LLMError);
  });
});
