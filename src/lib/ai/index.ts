// Import providers to trigger registration
import "./openai";
import "./anthropic";
import "./gemini";
import "./groq";
import "./mistral";
import "./deepseek";
import "./grok";

// Re-export the provider API
export {
  getProvider,
  getAllProviders,
  getAllModels,
  getModel,
  getModelsForCapability,
  estimateCost,
  generateText,
  generateImage,
  getImageModels,
  estimateImageCost,
} from "./provider";
