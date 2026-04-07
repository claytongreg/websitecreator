// Import providers to trigger registration
import "./openai";
import "./anthropic";
import "./gemini";

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
} from "./provider";
