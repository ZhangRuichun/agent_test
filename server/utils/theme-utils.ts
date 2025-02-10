import OpenAI from "openai";
import fs from "fs/promises";
import { logger } from "../logger";

const openai = new OpenAI();

/**
 * Analyzes a website screenshot to extract color scheme and style variant
 * @param screenshotPath Path to the screenshot file
 * @returns Object containing primary color and style variant
 */
export async function analyzeWebsiteColors(screenshotPath: string): Promise<{ 
  primary: string; 
  variant: 'professional' | 'tint' | 'vibrant' 
}> {
  try {
    const screenshotBuffer = await fs.readFile(screenshotPath);
    if (!screenshotBuffer) {
      throw new Error('Failed to read screenshot file');
    }

    const cleanBase64 = screenshotBuffer.toString('base64');
    logger.info('Screenshot size:', screenshotBuffer.length);

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a design expert specializing in color analysis. Analyze the provided website screenshot and extract its primary color scheme and overall style variant. Respond in JSON format with the following structure: { primary: string (HSL color), variant: 'professional' | 'tint' | 'vibrant' }. The primary color should be in HSL format (e.g., 'hsl(222.2 47.4% 11.2%)'). Choose the variant based on the website's overall design approach."
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this image in detail and provide the primary color and style variant that best matches its design."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/png;base64,${cleanBase64}`
              }
            }
          ],
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    logger.info('OpenAI API Response Content:', content);
    const result = JSON.parse(content) as { primary: string; variant: 'professional' | 'tint' | 'vibrant' };

    if (!result.primary || !result.variant) {
      throw new Error('Invalid response format from OpenAI');
    }

    return result;
  } catch (error) {
    logger.error({ err: error }, 'Error in analyzeWebsiteColors');
    if (error instanceof Error) {
      logger.error('Error details:', error.message, error.stack);
    }
    throw error;
  }
}
