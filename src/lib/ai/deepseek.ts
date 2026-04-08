import OpenAI from "openai";
import type { AIProvider, GenerateOptions } from "@/types";
import { registerProvider } from "./provider";

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY ?? "",
  baseURL: "https://api.deepseek.com",
});

const deepseekProvider: AIProvider = {
  id: "deepseek",
  name: "DeepSeek",
  models: [
    {
      id: "deepseek-chat",
      name: "DeepSeek V3",
      provider: "deepseek",
      capabilities: ["text", "code"],
      inputCostPer1k: 0.027,
      outputCostPer1k: 0.11,
      maxTokens: 8192,
    },
    {
      id: "deepseek-reasoner",
      name: "DeepSeek R1",
      provider: "deepseek",
      capabilities: ["text", "code"],
      inputCostPer1k: 0.055,
      outputCostPer1k: 0.22,
      maxTokens: 8192,
    },
  ],

  async *generateText(prompt: string, options: GenerateOptions) {
    const userContent: OpenAI.ChatCompletionContentPart[] = [
      { type: "text", text: prompt },
      ...(options.images ?? []).map((dataUrl) => ({
        type: "image_url" as const,
        image_url: { url: dataUrl },
      })),
    ];

    const stream = await client.chat.completions.create({
      model: options.model,
      messages: [
        ...(options.systemPrompt
          ? [{ role: "system" as const, content: options.systemPrompt }]
          : []),
        { role: "user" as const, content: userContent },
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

registerProvider(deepseekProvider);

export default deepseekProvider;
