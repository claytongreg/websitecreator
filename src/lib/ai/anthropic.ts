import Anthropic from "@anthropic-ai/sdk";
import type { AIProvider, GenerateOptions } from "@/types";
import { registerProvider } from "./provider";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const anthropicProvider: AIProvider = {
  id: "anthropic",
  name: "Anthropic",
  models: [
    {
      id: "claude-sonnet-4-20250514",
      name: "Claude Sonnet 4",
      provider: "anthropic",
      capabilities: ["text", "code"],
      inputCostPer1k: 0.3,
      outputCostPer1k: 1.5,
      maxTokens: 8192,
    },
    {
      id: "claude-haiku-4-5-20251001",
      name: "Claude Haiku 4.5",
      provider: "anthropic",
      capabilities: ["text", "code"],
      inputCostPer1k: 0.08,
      outputCostPer1k: 0.4,
      maxTokens: 8192,
    },
  ],

  async *generateText(prompt: string, options: GenerateOptions) {
    const stream = client.messages.stream({
      model: options.model,
      max_tokens: options.maxTokens ?? 4096,
      ...(options.systemPrompt ? { system: options.systemPrompt } : {}),
      messages: [{ role: "user", content: prompt }],
    });

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        yield event.delta.text;
      }
    }
  },
};

registerProvider(anthropicProvider);

export default anthropicProvider;
