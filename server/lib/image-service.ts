import OpenAI from "openai";
import Replicate from "replicate";
import { logger } from "../logger";
import { VertexAI } from "@google-cloud/vertexai";

const openai = new OpenAI();
// Initialize Replicate with API token
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Initialize Vertex AI
const vertexAI = new VertexAI({
  project: process.env.GOOGLE_CLOUD_PROJECT_ID,
  location: "us-central1",
});
const imagenModel = vertexAI.preview.getGenerativeModel({
  // model: 'imagen-3.0-generate-002'
  model: "imagen-3.0-fast-generate-001",
});

export async function generateImage(
  baseImage: string,
  maskImage: string,
  prompt: string,
  model: "dall-e" | "flux" | "imagen3",
  brandName: string,
): Promise<string[]> {
  try {
    // Enhance the prompt with brand name if provided
    const enhancedPrompt = brandName 
      ? `${prompt} The product should be branded with "${brandName}" prominently displayed.`
      : prompt;

    if (model === "dall-e") {
      const response = await openai.images.edit({
        image: new File(
          [Buffer.from(baseImage.split(",")[1], "base64")],
          "image.png",
          { type: "image/png" },
        ),
        mask: new File(
          [Buffer.from(maskImage.split(",")[1], "base64")],
          "mask.png",
          { type: "image/png" },
        ),
        prompt: enhancedPrompt,
        n: 4,
        size: "1024x1024",
      });

      if (!response.data || response.data.length === 0) {
        throw new Error("No images in DALL-E response");
      }

      return response.data
        .map((img) => img.url || "")
        .filter((url) => url !== "");
    } else if (model === "imagen3") {
      // Use Google Cloud Vertex AI Imagen 3
      const request = {
        prompt: {
          prompt: enhancedPrompt,
        },
        parameters: {
          sampleCount: 4,
          aspectRatio: "1:1",
          baseImage: baseImage,
          maskImage: maskImage,
        },
      };

      const response = await imagenModel.generateImage(request);
      const results = response.images || [];

      if (results.length === 0) {
        throw new Error("No images generated from Imagen 3");
      }

      // Convert all base64 images to URLs
      const imageUrls = results
        .map((result: string) => {
          if (!result) return "";
          return `data:image/png;base64,${result}`;
        })
        .filter((url: string) => url !== "");

      if (imageUrls.length === 0) {
        throw new Error("Failed to process Imagen 3 results");
      }

      return imageUrls;
    } else {
      // Use Flux model
      const output = await replicate.run("black-forest-labs/flux-1.1-pro", {
        input: {
          prompt: enhancedPrompt,
          image: baseImage,
          mask_image: maskImage,
          num_samples: 4,
          guidance_scale: 7.5,
          negative_prompt: "",
        },
      });

      // Ensure output is an array of URLs
      const outputUrls = Array.isArray(output) ? output : [output];
      const validUrls = outputUrls.filter(
        (url): url is string => typeof url === "string" && url.length > 0,
      );

      if (validUrls.length === 0) {
        throw new Error("Invalid output from Flux API");
      }

      return validUrls;
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    logger.error({ err: error }, "Error generating image");
    throw new Error(`Failed to generate image: ${errorMessage}`);
  }
}
