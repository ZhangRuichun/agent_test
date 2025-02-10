import OpenAI from "openai";
import fs from "fs";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateImageVariation(
  imageBuffer: Buffer,
  maskBuffer: Buffer | null,
  prompt: string
): Promise<string> {
  try {
    // Create temporary files for the image and mask
    const imagePath = './tmp/image.png';
    const maskPath = './tmp/mask.png';

    // Ensure tmp directory exists
    if (!fs.existsSync('./tmp')) {
      fs.mkdirSync('./tmp');
    }

    // Write buffers to files
    fs.writeFileSync(imagePath, imageBuffer);
    if (maskBuffer) {
      fs.writeFileSync(maskPath, maskBuffer);
    }

    // Create file streams for OpenAI
    const imageStream = fs.createReadStream(imagePath);
    const maskStream = maskBuffer ? fs.createReadStream(maskPath) : undefined;

    const response = await openai.images.edit({
      image: imageStream,
      mask: maskStream,
      prompt,
      n: 1,
      size: "1024x1024",
    });

    // Clean up temporary files
    fs.unlinkSync(imagePath);
    if (maskBuffer) {
      fs.unlinkSync(maskPath);
    }

    // Handle potential undefined URL
    const imageUrl = response.data[0].url;
    if (!imageUrl) {
      throw new Error("No image URL returned from OpenAI");
    }

    return imageUrl;
  } catch (error) {
    console.error("OpenAI API Error:", error);
    throw new Error("Failed to generate image variation");
  }
}