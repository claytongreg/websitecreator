import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AIProvider, GenerateOptions, ImageOptions } from "@/types";
import { registerProvider } from "./provider";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");

const geminiProvider: AIProvider = {
  id: "gemini",
  name: "Google Gemini",
  models: [
    {
      id: "gemini-2.0-flash",
      name: "Gemini 2.0 Flash",
      provider: "gemini",
      capabilities: ["text", "code"],
      inputCostPer1k: 0.01,
      outputCostPer1k: 0.04,
      maxTokens: 8192,
    },
    {
      id: "gemini-2.0-pro",
      name: "Gemini 2.0 Pro",
      provider: "gemini",
      capabilities: ["text", "code", "image"],
      inputCostPer1k: 0.125,
      outputCostPer1k: 0.5,
      maxTokens: 8192,
    },
  ],

  async *generateText(prompt: string, options: GenerateOptions) {
    const model = genAI.getGenerativeModel({ model: options.model });
    const result = await model.generateContentStream({
      contents: [
        ...(options.systemPrompt
          ? [{ role: "model" as const, parts: [{ text: options.systemPrompt }] }]
          : []),
        { role: "user" as const, parts: [{ text: prompt }] },
      ],
      generationConfig: {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxTokens ?? 4096,
      },
    });

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) yield text;
    }
  },

  async generateImage(prompt: string, _options: ImageOptions) {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        // @ts-expect-error — responseModalities is available in newer Gemini models
        responseModalities: ["image", "text"],
      },
    });

    const parts = result.response.candidates?.[0]?.content?.parts ?? [];
    for (const part of parts) {
      const inlineData = (part as { inlineData?: { data: string } }).inlineData;
      if (inlineData) {
        return `data:image/png;base64,${inlineData.data}`;
      }
    }
    throw new Error("No image generated");
  },
};

registerProvider(geminiProvider);

export default geminiProvider;
