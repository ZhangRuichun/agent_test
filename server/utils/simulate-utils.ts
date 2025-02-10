
import OpenAI from "openai";
import { logger } from "../logger";

const openai = new OpenAI();

export async function getSimulatedConsumerPreference(
  consumerProfile: any,
  products: Array<any>
): Promise<number | null> {
  const prompt = `You are simulating a consumer with the following characteristics:
Demographics: ${consumerProfile.demographics}
Demand Space: ${consumerProfile.demandSpace}

The Demand Space is the place or occasion where the consumer is considering purchasing a product.

You are presented with the following products:
${products.map((p, index) => `
Product ${index + 1}:
Brand: ${p.brandName}
Name: ${p.productName}
Description: ${p.description}
Price: $${(p.price / 100).toFixed(2)}
`).join('\n')}

Based on this consumer's profile, the demand space and the product options, which product (respond with just the product number 1-${products.length}) would they be most likely to purchase?`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a consumer behavior expert. Select the product number that best matches the consumer's preferences."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 10,
    });

    logger.info({prompt}, "Simulated consumer preference prompt");

    const response = completion.choices[0].message.content;
    if (!response) return null;

    logger.info({response}, "GPT-4o simulated response");

    const match = response.match(/\d+/);
    if (!match) return null;

    const selectedIndex = parseInt(match[0], 10) - 1;
    if (selectedIndex < 0 || selectedIndex >= products.length) return null;

    return products[selectedIndex].id;
  } catch (error) {
    logger.error({ err: error }, "Error getting simulated consumer preference");
    return null;
  }
}
