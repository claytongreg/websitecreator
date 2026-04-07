import { Mistral } from "@mistralai/mistralai";
import type { AIProvider, GenerateOptions } from "@/types";
import { registerProvider } from "./provider";

const client = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

const mistralProvider: AIProvider = {
  id: "mistral",
  name: "Mistral",
  models: [
    {
      id: "mistral-small-latest",
      name: "Mistral Small",
      provider: "mistral",
      capabilities: ["text", "code"],
      inputCostPer1k: 0, // free on Experiment tier
      outputCostPer1k: 0,
      maxTokens: 8192,
    },
    {
      id: "codestral-latest",
      name: "Codestral",
      provider: "mistral",
      capabilities: ["text", "code"],
      inputCostPer1k: 0,
      outputCostPer1k: 0,
      maxTokens: 8192,
    },
  ],

  async *generateText(prompt: string, options: GenerateOptions) {
    const stream = await client.chat.stream({
      model: options.model,
      messages: [
        ...(options.systemPrompt
          ? [{ role: "system" as const, content: options.systemPrompt }]
          : []),
        { role: "user" as const, content: prompt },
      ],
      temperature: options.temperature ?? 0.7,
      maxTokens: options.maxTokens ?? 4096,
    });

    for await (const event of stream) {
      const content = event.data.choices[0]?.delta?.content;
      if (typeof content === "string" && content) yield content;
    }
  },
};

registerProvider(mistralProvider);

export default mistralProvider;
