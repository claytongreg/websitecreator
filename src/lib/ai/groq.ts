import Groq from "groq-sdk";
import type { AIProvider, GenerateOptions } from "@/types";
import { registerProvider } from "./provider";

const client = new Groq({ apiKey: process.env.GROQ_API_KEY ?? "" });

const groqProvider: AIProvider = {
  id: "groq",
  name: "Groq",
  models: [
    {
      id: "llama-3.3-70b-versatile",
      name: "Llama 3.3 70B",
      provider: "groq",
      capabilities: ["text", "code"],
      inputCostPer1k: 0, // free
      outputCostPer1k: 0,
      maxTokens: 8192,
    },
    {
      id: "gemma2-9b-it",
      name: "Gemma 2 9B",
      provider: "groq",
      capabilities: ["text", "code"],
      inputCostPer1k: 0,
      outputCostPer1k: 0,
      maxTokens: 8192,
    },
    {
      id: "qwen-qwq-32b",
      name: "Qwen QwQ 32B",
      provider: "groq",
      capabilities: ["text", "code"],
      inputCostPer1k: 0,
      outputCostPer1k: 0,
      maxTokens: 8192,
    },
  ],

  async *generateText(prompt: string, options: GenerateOptions) {
    const userContent = options.images?.length
      ? [
          { type: "text" as const, text: prompt },
          ...options.images.map((dataUrl) => ({
            type: "image_url" as const,
            image_url: { url: dataUrl },
          })),
        ]
      : prompt;

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
      if (options.onUsage && chunk.x_groq) {
        const u = (chunk as unknown as { usage?: { prompt_tokens: number; completion_tokens: number } }).usage;
        if (u) {
          options.onUsage({
            inputTokens: u.prompt_tokens,
            outputTokens: u.completion_tokens,
          });
        }
      }
    }
  },
};

registerProvider(groqProvider);

export default groqProvider;
