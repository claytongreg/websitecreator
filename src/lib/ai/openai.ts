import OpenAI from "openai";
import type { AIProvider, GenerateOptions } from "@/types";
import { registerProvider } from "./provider";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const openaiProvider: AIProvider = {
  id: "openai",
  name: "OpenAI",
  models: [
    {
      id: "gpt-4o",
      name: "GPT-4o",
      provider: "openai",
      capabilities: ["text", "code"],
      inputCostPer1k: 0.25, // cents
      outputCostPer1k: 1.0,
      maxTokens: 16384,
    },
    {
      id: "gpt-4o-mini",
      name: "GPT-4o Mini",
      provider: "openai",
      capabilities: ["text", "code"],
      inputCostPer1k: 0.015,
      outputCostPer1k: 0.06,
      maxTokens: 16384,
    },
  ],

  async *generateText(prompt: string, options: GenerateOptions) {
    const stream = await client.chat.completions.create({
      model: options.model,
      messages: [
        ...(options.systemPrompt
          ? [{ role: "system" as const, content: options.systemPrompt }]
          : []),
        { role: "user" as const, content: prompt },
      ],
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4096,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) yield content;
    }
  },
};

registerProvider(openaiProvider);

export default openaiProvider;
