import OpenAI from "openai";
import type { AIProvider, GenerateOptions, ImageOptions } from "@/types";
import { registerProvider } from "./provider";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? "" });

const openaiProvider: AIProvider = {
  id: "openai",
  name: "OpenAI",
  models: [
    {
      id: "gpt-4.1",
      name: "GPT-4.1",
      provider: "openai",
      capabilities: ["text", "code"],
      inputCostPer1k: 0.2,
      outputCostPer1k: 0.8,
      maxTokens: 32768,
    },
    {
      id: "gpt-4.1-mini",
      name: "GPT-4.1 Mini",
      provider: "openai",
      capabilities: ["text", "code"],
      inputCostPer1k: 0.04,
      outputCostPer1k: 0.16,
      maxTokens: 16384,
    },
    {
      id: "o3-mini",
      name: "o3 Mini",
      provider: "openai",
      capabilities: ["text", "code"],
      inputCostPer1k: 0.11,
      outputCostPer1k: 0.44,
      maxTokens: 16384,
    },
    {
      id: "gpt-4o",
      name: "GPT-4o",
      provider: "openai",
      capabilities: ["text", "code"],
      inputCostPer1k: 0.25,
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
    {
      id: "gpt-image-1-mini",
      name: "GPT Image 1 Mini",
      provider: "openai",
      capabilities: ["image"],
      inputCostPer1k: 0,
      outputCostPer1k: 0,
      imageCostCents: 1,
      maxTokens: 0,
    },
    {
      id: "gpt-image-1",
      name: "GPT Image 1",
      provider: "openai",
      capabilities: ["image"],
      inputCostPer1k: 0,
      outputCostPer1k: 0,
      imageCostCents: 4,
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
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) yield content;
    }
  },

  async generateImage(prompt: string, options: ImageOptions) {
    const size =
      options.width && options.height
        ? (`${options.width}x${options.height}` as "1024x1024")
        : "1024x1024";

    const response = await client.images.generate({
      model: options.model,
      prompt,
      n: 1,
      size,
      response_format: "b64_json",
    });

    const b64 = response.data?.[0]?.b64_json;
    if (!b64) throw new Error("No image generated from OpenAI");
    return `data:image/png;base64,${b64}`;
  },
};

registerProvider(openaiProvider);

export default openaiProvider;
