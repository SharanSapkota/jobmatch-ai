import { parseCvHeuristically } from "@/server/modules/parsing/heuristic-cv-parser";
import { CV_EXTRACTION_PROMPT, CV_TEXT_CLOSE, CV_TEXT_OPEN } from "@/server/prompts/cv-extraction";
import { BaseProvider } from "./base-provider";
import { LLMError } from "./types";

type Handler = (prompt: string) => unknown;

function between(prompt: string, open: string, close: string): string {
  const start = prompt.indexOf(open);
  const end = prompt.lastIndexOf(close);
  if (start < 0 || end < start) throw new LLMError("Mock provider could not find its input in the prompt.", "PROVIDER");
  return prompt.slice(start + open.length, end).trim();
}

const HANDLERS: Record<string, Handler> = {
  [CV_EXTRACTION_PROMPT.name]: (prompt) => parseCvHeuristically(between(prompt, CV_TEXT_OPEN, CV_TEXT_CLOSE)),
};

/**
 * Deterministic provider used when no API key is configured and in tests.
 * Dispatches on the `TASK: <name>` line every prompt starts with.
 */
export class MockProvider extends BaseProvider {
  readonly name = "mock";

  protected async generateRaw(prompt: string): Promise<unknown> {
    const task = prompt.match(/^TASK: ([\w-]+)/)?.[1];
    const handler = task ? HANDLERS[task] : undefined;
    if (!handler) throw new LLMError(`Mock provider has no handler for task "${task ?? "unknown"}".`, "PROVIDER");
    return handler(prompt);
  }
}
