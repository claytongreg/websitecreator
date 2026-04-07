import type { AIProvider, AIModel, GenerateOptions, ImageOptions } from "@/types";

// Registry of all available providers
const providers = new Map<string, AIProvider>();

export function registerProvider(provider: AIProvider) {
  providers.set(provider.id, provider);
}

export function getProvider(id: string): AIProvider {
  const provider = providers.get(id);
  if (!provider) throw new Error(`AI provider "${id}" not registered`);
  return provider;
}

export function getAllProviders(): AIProvider[] {
  return Array.from(providers.values());
}

export function getAllModels(): AIModel[] {
  return getAllProviders().flatMap((p) => p.models);
}

export function getModel(modelId: string): AIModel | undefined {
  return getAllModels().find((m) => m.id === modelId);
}

export function getModelsForCapability(
  capability: "text" | "code" | "image"
): AIModel[] {
  return getAllModels().filter((m) => m.capabilities.includes(capability));
}

// 200% markup on all API costs (3x base cost)
const MARKUP_MULTIPLIER = 3;

export function estimateCost(
  modelId: string,
  inputTokens: number,
  outputTokens: number
): number {
  const model = getModel(modelId);
  if (!model) return 0;
  const baseCost =
    (inputTokens / 1000) * model.inputCostPer1k +
    (outputTokens / 1000) * model.outputCostPer1k;
  return baseCost * MARKUP_MULTIPLIER;
}

export async function* generateText(
  prompt: string,
  options: GenerateOptions
): AsyncIterable<string> {
  const model = getModel(options.model);
  if (!model) throw new Error(`Model "${options.model}" not found`);
  const provider = getProvider(model.provider);
  yield* provider.generateText(prompt, options);
}

export async function generateImage(
  prompt: string,
  options: ImageOptions
): Promise<string> {
  const model = getModel(options.model);
  if (!model) throw new Error(`Model "${options.model}" not found`);
  const provider = getProvider(model.provider);
  if (!provider.generateImage)
    throw new Error(`Provider "${provider.id}" does not support image generation`);
  return provider.generateImage(prompt, options);
}
