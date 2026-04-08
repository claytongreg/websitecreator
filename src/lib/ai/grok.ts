import OpenAI from "openai";
import type { AIProvider, GenerateOptions, ImageOptions } from "@/types";
import { registerProvider } from "./provider";

const client = new OpenAI({
  apiKey: process.env.XAI_API_KEY ?? "",
  baseURL: "https://api.x.ai/v1",
});

const grokProvider: AIProvider = {
  id: "grok",
  name: "xAI Grok",
  models: [
    {
      id: "grok-4-1-fast",
      name: "Grok 4.1 Fast",
      provider: "grok",
      capabilities: ["text", "code"],
      inputCostPer1k: 0.02,
      outputCostPer1k: 0.05,
      maxTokens: 16384,
    },
    {
      id: "grok-imagine-image",
      name: "Grok Imagine",
      provider: "grok",
      capabilities: ["image"],
      inputCostPer1k: 0,
      outputCostPer1k: 0,
      imageCostCents: 2,
      maxTokens: 0,
    },
    {
      id: "grok-imagine-image-pro",
      name: "Grok Imagine Pro",
      provider: "grok",
      capabilities: ["image"],
      inputCostPer1k: 0,
      outputCostPer1k: 0,
      imageCostCents: 7,
      maxTokens: 0,
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
      stream_options: options.onUsage ? { include_usage: true } : undefined,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) yield content;
      if (chunk.usage && options.onUsage) {
        options.onUsage({
          inputTokens: chunk.usage.prompt_tokens,
          outputTokens: chunk.usage.completion_tokens,
        });
      }
    }
  },

  async generateImage(prompt: string, options: ImageOptions) {
    const response = await client.images.generate({
      model: options.model,
      prompt,
      n: 1,
      response_format: "b64_json",
    });

    const b64 = response.data?.[0]?.b64_json;
    if (!b64) throw new Error("No image generated from Grok");
    return `data:image/png;base64,${b64}`;
  },
};

registerProvider(grokProvider);

export default grokProvider;
