import "server-only";
import { getEnv } from "@/server/env";
import { AnthropicProvider } from "./anthropic-provider";
import { MockProvider } from "./mock-provider";
import type { LLMProvider } from "./types";

export { LLMError, type LLMProvider } from "./types";

let provider: LLMProvider | undefined;

/**
 * LLM_PROVIDER=anthropic requires ANTHROPIC_API_KEY. With no explicit choice we
 * use Anthropic when a key is present, otherwise the deterministic mock.
 */
export function getLLMProvider(): LLMProvider {
  if (provider) return provider;
  const env = getEnv();
  const choice = env.LLM_PROVIDER ?? (env.ANTHROPIC_API_KEY ? "anthropic" : "mock");
  if (choice === "anthropic") {
    if (!env.ANTHROPIC_API_KEY) throw new Error("LLM_PROVIDER=anthropic but ANTHROPIC_API_KEY is not set");
    provider = new AnthropicProvider(env.ANTHROPIC_API_KEY, env.ANTHROPIC_MODEL);
  } else {
    provider = new MockProvider();
  }
  return provider;
}
