import { Router, Request, Response } from "express";
import { db } from "@db";
import { eq, inArray, sql } from "drizzle-orm";
import {
  shelfVariants,
  respondents,
  responses,
  products,
  questions,
  shelves,
  shelfQuestions
} from "@db/schema";
import { logger } from "../logger";
import OpenAI from "openai";

// Define types for better type safety
interface User {
  id: number;
}

interface AuthenticatedRequest extends Request {
  user?: User;
}

interface ProductImage {
  id: number;
  url: string;
  ordinal: number;
}

interface Product {
  id: number;
  brandName: string;
  productName: string;
  description: string;
  listPrice: number;
  lowPrice?: number;
  highPrice?: number;
  benefits?: string;
  images?: ProductImage[];
  newProduct?: string;
}

interface PersonaQuestion {
  id: number;
  question: string;
  answerType: 'SINGLE' | 'MULTIPLE' | 'NUMBER' | 'TEXT';
  options?: string[];
}

interface Persona {
  id: number;
  name: string;
  questions: PersonaQuestion[];
  demographics: Record<string, any>;
  demandSpaces: string[];
}

const router = Router();
const openai = new OpenAI();

// Add type annotations to function parameters and variables
router.get("/api/survey/:id", async (req: Request, res: Response) => {
  try {
    const surveyId = parseInt(req.params.id);

    // Get the shelf variant
    const variant = await db.query.shelfVariants.findFirst({
      where: eq(shelfVariants.id, surveyId),
      with: {
        shelf: {
          with: {
            personas: {
              with: {
                persona: true
              }
            },
            questions: {
              with: {
                question: true
              }
            },
            conjointConfiguration: true
          }
        }
      }
    });

    if (!variant) {
      return res.status(404).send("Survey not found");
    }

    // Get demographic questions from personas
    const demographicQuestions = variant.shelf.personas.flatMap((p: { persona: Persona }) => {
      const demographics = p.persona.questions;

      return demographics.map(q => ({
        id: `demo_${q.id}`,
        question: q.question,
        type: q.answerType,
        options: q.options
      }));
    }).filter((q, index, self) =>
      index === self.findIndex(t => t.id === q.id)
    );

    // Get regular questions for this shelf
    const shelfQuestions = variant.shelf.questions.map(sq => ({
      id: sq.question.id.toString(),
      question: sq.question.question,
      type: sq.question.answerType,
      options: sq.question.options
    }));

    // Combine all questions - demographics first, then regular questions
    const questions = [...demographicQuestions, ...shelfQuestions];

    // Get product IDs from variant's product lineup
    const productIds = new Set<number>();
    const lineup = variant.productLineup as Array<{ productId: number; price: number }>;
    lineup.forEach(item => productIds.add(item.productId));

    // Get product details with images
    const productsData = await db.query.products.findMany({
      where: inArray(products.id, Array.from(productIds)),
      with: {
        images: {
          orderBy: (images, { asc }) => [asc(images.ordinal)]
        }
      }
    });

    // For each product, generate price variants based on the conjoint configuration
    const priceLevels = variant.shelf.conjointConfiguration?.priceLevels || 3;

    // Generate combinations of different products
    const combinations: Array<{
      id: number;
      options: Array<{
        id: string;
        productId: number;
        brandName: string;
        productName: string;
        description: string;
        benefits: string[];
        imageUrl: string | null;
        price: number;
        formattedPrice: string;
      }>;
    }> = [];

    // Map each product with their price variations
    const productsWithPrices = productsData.map((product: Product) => {
      const prices = generatePriceMatrix(product, priceLevels);
      return {
        ...product,
        priceOptions: prices.map(price => ({
          id: `${product.id}_${price}`,
          productId: product.id,
          brandName: product.brandName,
          productName: product.productName,
          description: product.description,
          benefits: product.benefits?.split(',') || [],
          imageUrl: product.images && product.images.length > 0 ? product.images[0].url : null,
          price,
          formattedPrice: `$${(price / 100).toFixed(2)}`
        }))
      };
    });

    // Calculate how many products to show (between 2 and 6)
    const numProductsToShow = Math.min(6, productsWithPrices.length);

    // Create combinations for each question
    const numCombinations = Math.max(5, Math.ceil(productsWithPrices.length / 2)); // At least 5 questions

    for (let i = 0; i < numCombinations; i++) {
      // Select products for this combination
      const selectedProducts = productsWithPrices
        .map(p => ({ sort: Math.random(), value: p }))
        .sort((a, b) => a.sort - b.sort)
        .slice(0, numProductsToShow)
        .map(p => p.value);

      // For each selected product, randomly choose one price option
      const options = selectedProducts.map(product => {
        const randomPriceIndex = Math.floor(Math.random() * product.priceOptions.length);
        return product.priceOptions[randomPriceIndex];
      });

      combinations.push({
        id: i + 1,
        options
      });
    }

    res.json({
      questions,
      productCombinations: combinations
    });
  } catch (error) {
    logger.error({ err: error }, "Error fetching survey details");
    res.status(500).send("Error fetching survey details");
  }
});

// Submit survey response
router.post("/api/survey/:id/submit", async (req: Request, res: Response) => {
  try {
    const surveyId = parseInt(req.params.id);
    const { demographics, selections } = req.body;

    // Filter out demographic_ prefixed questions and format remaining demographics
    const formattedDemographics = Object.entries(demographics)
      .filter(([key]) => key.startsWith('demo_'))
      .reduce((acc, [key, value]) => ({
        ...acc,
        [key.replace('demo_', '')]: value
      }), {});

    // Create human respondent
    const [respondent] = await db.insert(respondents)
      .values({
        type: "HUMAN",
        demographics: formattedDemographics
      })
      .returning();

    // Record responses
    await db.insert(responses)
      .values(selections.map((productId: number) => ({
        respondentId: respondent.id,
        shelfVariantId: surveyId,
        selectedProductId: productId
      })));

    res.json({ message: "Survey responses recorded successfully" });
  } catch (error) {
    logger.error({ err: error }, "Error submitting survey response");
    res.status(500).send("Error submitting survey response");
  }
});

// Get all active surveys (for marketers)
router.get("/api/active-surveys", async (req: AuthenticatedRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).send("Unauthorized");
        }

        const activeVariants = await db.query.shelfVariants.findMany({
            with: {
                shelf: {
                    columns: {
                        projectName: true
                    }
                }
            },
            orderBy: (variants, { desc }) => [desc(variants.createdAt)]
        });

        const uniqueVariants = activeVariants.reduce((acc: any[], variant) => {
            if (!acc.find(v =>
                v.shelfId === variant.shelfId &&
                new Date(v.createdAt).toDateString() === new Date(variant.createdAt).toDateString()
            )) {
                acc.push({
                    id: variant.id,
                    shelfId: variant.shelfId,
                    projectName: variant.shelf.projectName,
                    createdAt: variant.createdAt
                });
            }
            return acc;
        }, []);

        res.json(uniqueVariants);
    } catch (error) {
        logger.error({ err: error }, "Error fetching active surveys");
        res.status(500).send("Error fetching active surveys");
    }
});

// Run survey endpoint
router.post("/api/shelves/:id/run-survey", async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    const shelfId = parseInt(req.params.id);
    const { runName } = req.body;

    logger.info({ shelfId, runName }, "Starting survey simulation");

    if (!runName) {
      return res.status(400).send("Run name is required");
    }

    // Get the shelf with its configured products, personas, and conjoint configuration
    const shelf = await db.query.shelves.findFirst({
      where: eq(shelves.id, shelfId),
      with: {
        products: {
          with: {
            product: {
              with: {
                images: true
              }
            }
          }
        },
        personas: {
          with: {
            persona: true
          }
        },
        conjointConfiguration: true
      }
    });

    if (!shelf) {
      logger.error({ shelfId }, "Shelf not found");
      return res.status(404).send("Shelf not found");
    }

    if (shelf.createdBy !== req.user.id) {
      logger.warn({ userId: req.user.id, shelfId }, "Unauthorized access attempt");
      return res.status(403).send("Unauthorized");
    }

    // Get the price levels from conjoint configuration, default to 3 if not set
    const priceLevels = shelf.conjointConfiguration?.priceLevels || 3;

    // Generate conjoint matrix with configured price levels
    const productsData = shelf.products.map(sp => ({
      id: sp.product.id,
      brandName: sp.product.brandName,
      productName: sp.product.productName,
      description: sp.product.description,
      listPrice: sp.product.listPrice,
      lowPrice: sp.product.lowPrice,
      highPrice: sp.product.highPrice,
      images: sp.product.images
    }));

    const conjointMatrix = generateConjointMatrix(productsData, priceLevels);
    logger.info({ matrixSize: conjointMatrix.length, priceLevels }, "Generated conjoint matrix");

    // Create a shelf variant for tracking responses
    const [variant] = await db.insert(shelfVariants)
      .values({
        shelfId,
        productLineup: productsData.map(p => ({
          productId: p.id,
          price: p.listPrice
        }))
      })
      .returning();

    // Run simulations for each persona and matrix combination
    const simulationResults: Record<number, { selections: number, prices: number[] }> = {};

    // Initialize results tracking
    productsData.forEach(p => {
      simulationResults[p.id] = {
        selections: 0,
        prices: []
      };
    });

    // Process each persona
    for (const personaLink of shelf.personas) {
      const persona = personaLink.persona;

      // Create synthetic respondent
      const [respondent] = await db.insert(respondents)
        .values({
          type: "SYNTHETIC",
          personaId: persona.id
        })
        .returning();

      // Process each conjoint combination
      for (const combination of conjointMatrix) {
        const selectedProductId = await getPersonaPreference(persona, combination);

        if (selectedProductId) {
          // Record the response
          await db.insert(responses)
            .values({
              respondentId: respondent.id,
              shelfVariantId: variant.id,
              selectedProductId
            });

          // Update simulation results
          const selectedProduct = combination.find((p: any) => p.id === selectedProductId);
          if (selectedProduct) {
            simulationResults[selectedProductId].selections++;
            simulationResults[selectedProductId].prices.push(selectedProduct.currentPrice);
          }
        }
      }
    }

    // Calculate optimal prices and preference shares
    const totalSelections = Object.values(simulationResults)
      .reduce((sum, result) => sum + result.selections, 0);

    const results = productsData.map(product => {
      const result = simulationResults[product.id];
      const optimalPrice = result.prices.length > 0
        ? result.prices.reduce((sum, price) => sum + price, 0) / result.prices.length
        : product.listPrice;

      return {
        brand: product.brandName,
        name: product.productName,
        description: product.description,
        imageUrl: product.images && product.images.length > 0
          ? product.images[0].url
          : null,
        optimalPrice: optimalPrice / 100, // Convert cents to dollars
        preferenceShare: totalSelections > 0
          ? result.selections / totalSelections
          : 1 / productsData.length // Equal distribution if no selections
      };
    });

    logger.info({
      variantId: variant.id,
      productCount: results.length,
      response: JSON.stringify(results)
    }, "Completed simulation");

    res.json({
      products: results,
      surveyUrl: `/survey/${variant.id}`,
      variantId: variant.id
    });
  } catch (error) {
    logger.error({ err: error }, "Error running survey");
    res.status(500).send(error instanceof Error ? error.message : "Internal server error");
  }
});

// Get all survey runs
router.get("/api/survey-runs", async (req: Request, res: Response) => {
    try {
        const runs = await db.query.shelfVariants.findMany({
            columns: {
                id: true,
                shelfId: true,
                createdAt: true
            },
            with: {
                shelf: {
                    columns: {
                        projectName: true
                    }
                }
            },
            orderBy: (variants, { desc }) => [desc(variants.createdAt)]
        });

        const uniqueRuns = runs.reduce((acc: any[], run) => {
            if (!acc.find(r => r.shelfId === run.shelfId &&
                new Date(r.createdAt).toDateString() === new Date(run.createdAt).toDateString())) {
                acc.push({
                    id: run.id,
                    shelfId: run.shelfId,
                    projectName: run.shelf.projectName,
                    date: run.createdAt
                });
            }
            return acc;
        }, []);

        res.json(uniqueRuns);
    } catch (error) {
        logger.error({ err: error }, "Error fetching survey runs");
        res.status(500).send(error instanceof Error ? error.message : "Internal server error");
    }
});

// Get analysis data for a specific run
router.get("/api/survey-runs/:runId/analysis", async (req: Request, res: Response) => {
  try {
    const runId = parseInt(req.params.runId);

    // Get the shelf variant to identify the shelf
    const variant = await db.query.shelfVariants.findFirst({
      where: eq(shelfVariants.id, runId)
    });

    if (!variant) {
      return res.status(404).send("Survey run not found");
    }

    // Get all variants from this shelf (same run)
    const allVariants = await db.query.shelfVariants.findMany({
      where: (variants, { and, eq, gte }) => and(
        eq(variants.shelfId, variant.shelfId),
        gte(variants.createdAt, new Date(new Date(variant.createdAt).toDateString()))
      )
    });

    const variantIds = allVariants.map(v => v.id);

    // Get aggregate response data
    const responseData = await db.select({
      productId: responses.selectedProductId,
      respondentType: respondents.type,
      count: sql<number>`count(*)`.as('count')
    })
      .from(responses)
      .leftJoin(respondents, eq(responses.respondentId, respondents.id))
      .where(inArray(responses.shelfVariantId, variantIds))
      .groupBy(responses.selectedProductId, respondents.type);

    // Get product IDs from the variants' product lineup
    const productIds = new Set<number>();
    allVariants.forEach(variant => {
      const lineup = variant.productLineup as Array<{ productId: number; price: number }>;
      lineup.forEach(item => productIds.add(item.productId));
    });

    // Get product details with images
    const productsData = await db.query.products.findMany({
      where: inArray(products.id, Array.from(productIds)),
      with: {
        images: {
          orderBy: (images, { asc }) => [asc(images.ordinal)]
        }
      }
    });

    // Format response
    const analysis = {
      totalResponses: responseData.reduce((sum, item) => sum + Number(item.count), 0),
      byRespondentType: responseData.reduce((acc: Record<string, number>, item) => {
        const type = item.respondentType || "UNKNOWN";
        acc[type] = (acc[type] || 0) + Number(item.count);
        return acc;
      }, {}),
      byProduct: productsData.map(product => ({
        productId: product.id,
        brandName: product.brandName,
        productName: product.productName,
        description: product.description,
        imageUrl: product.images && product.images.length > 0 ? product.images[0].url : null,
        listPrice: product.listPrice,
        responses: responseData
          .filter(r => r.productId === product.id)
          .reduce((acc: Record<string, number>, item) => {
            const type = item.respondentType || "UNKNOWN";
            acc[type] = Number(item.count);
            return acc;
          }, {})
      }))
    };

    res.json(analysis);
  } catch (error) {
    logger.error({ err: error }, "Error fetching analysis data");
    res.status(500).send(error instanceof Error ? error.message : "Internal server error");
  }
});

// Add this new endpoint after the existing /api/survey-runs/:runId/analysis endpoint
router.post("/api/shelves/:id/create-survey", async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    const shelfId = parseInt(req.params.id);

    // Get the shelf with its configured products and conjoint configuration
    const shelf = await db.query.shelves.findFirst({
      where: eq(shelves.id, shelfId),
      with: {
        products: {
          with: {
            product: {
              with: {
                images: true
              }
            }
          }
        },
        conjointConfiguration: true
      }
    });

    if (!shelf) {
      logger.error({ shelfId }, "Shelf not found");
      return res.status(404).send("Shelf not found");
    }

    if (shelf.createdBy !== req.user.id) {
      logger.warn({ userId: req.user.id, shelfId }, "Unauthorized access attempt");
      return res.status(403).send("Unauthorized");
    }

    // Get the price levels from conjoint configuration, default to 3 if not set
    const priceLevels = shelf.conjointConfiguration?.priceLevels || 3;

    // Generate product data for conjoint matrix
    const productsData = shelf.products.map(sp => ({
      id: sp.product.id,
      brandName: sp.product.brandName,
      productName: sp.product.productName,
      description: sp.product.description,
      listPrice: sp.product.listPrice,
      lowPrice: sp.product.lowPrice || Math.round(sp.product.listPrice * 0.8),
      highPrice: sp.product.highPrice || Math.round(sp.product.listPrice * 1.2),
      images: sp.product.images
    }));

    // Create a shelf variant for preview
    const [variant] = await db.insert(shelfVariants)
      .values({
        shelfId,
        productLineup: productsData.map(p => ({
          productId: p.id,
          price: p.listPrice
        }))
      })
      .returning();

    logger.info({ variantId: variant.id }, "Created preview survey variant");

    res.json({ surveyId: variant.id });
  } catch (error) {
    logger.error({ err: error }, "Error creating preview survey");
    res.status(500).send(error instanceof Error ? error.message : "Internal server error");
  }
});

// Get all survey runs/:runId/details
router.get("/api/survey-runs/:runId/details", async (req: Request, res: Response) => {
  try {
    const runId = parseInt(req.params.runId);

    // Get all responses for this run with related data
    const responseData = await db.query.responses.findMany({
      where: eq(responses.shelfVariantId, runId),
      with: {
        respondent: {
          with: {
            persona: true
          }
        },
        selectedProduct: true
      }
    });

    // Get the shelf variant to get the product lineup with prices
    const variant = await db.query.shelfVariants.findFirst({
      where: eq(shelfVariants.id, runId)
    });

    if (!variant) {
      return res.status(404).send("Survey run not found");
    }

    // Format the response data
    const details = responseData.map(response => ({
      id: response.id,
      timestamp: response.createdAt,
      persona: response.respondent.persona ? {
        name: response.respondent.persona.name,
        demographics: response.respondent.persona.demographics,
        demandSpaces: response.respondent.persona.demandSpaces
      } : null,
      selectedProduct: {
        id: response.selectedProduct.id,
        brandName: response.selectedProduct.brandName,
        productName: response.selectedProduct.productName
      },
      productLineup: variant.productLineup
    }));

    res.json(details);
  } catch (error) {
    logger.error({ err: error }, "Error fetching simulation details");
    res.status(500).send("Error fetching simulation details");
  }
});

// Type for product lineup in shelf variant
interface ProductLineupItem {
    productId: number;
    price: number;
}

// Enhanced generatePriceMatrix function to handle configurable price levels
function generatePriceMatrix(product: Product, priceLevels: number) {
    const lowPrice = product.lowPrice || Math.round(product.listPrice * 0.8); // fallback to 20% below list price
    const highPrice = product.highPrice || Math.round(product.listPrice * 1.2); // fallback to 20% above list price
    const listPrice = product.listPrice;

    if (priceLevels === 2) {
        return [lowPrice, highPrice];
    } else if (priceLevels === 3) {
        return [lowPrice, listPrice, highPrice];
    } else if (priceLevels === 4) {
        const quarterPoint = Math.round(lowPrice + (listPrice - lowPrice) / 2);
        const threeQuarterPoint = Math.round(listPrice + (highPrice - listPrice) / 2);
        return [lowPrice, quarterPoint, threeQuarterPoint, highPrice];
    } else if (priceLevels === 5) {
        const p1 = Math.round(lowPrice + (listPrice - lowPrice) / 3);
        const p2 = Math.round(lowPrice + 2 * (listPrice - lowPrice) / 3);
        const p3 = Math.round(listPrice + (highPrice - listPrice) / 3);
        const p4 = Math.round(listPrice + 2 * (highPrice - listPrice) / 3);
        return [lowPrice, p1, p2, p3, p4, highPrice];
    }

    return [lowPrice, listPrice, highPrice]; // default to 3 levels
}

// Enhanced generateConjointMatrix function
function generateConjointMatrix(products: Product[], priceLevels: number = 3) {
  // Generate price variations for each product
  const productPrices = products.map(product => ({
    ...product,
    prices: generatePriceMatrix(product, priceLevels)
  }));

  // Generate all combinations
  const combinations: any[][] = [];

  function generateCombinations(current: any[], index: number) {
    if (index === productPrices.length) {
      combinations.push([...current]);
      return;
    }

    const product = productPrices[index];
    for (const price of product.prices) {
      generateCombinations([...current, { ...product, currentPrice: price }], index + 1);
    }
  }

  generateCombinations([], 0);
  return combinations;
}

// Function to get product preference from GPT-4o
async function getPersonaPreference(
    persona: Persona,
    products: any[]
): Promise<number | null> {
    const prompt = `You are simulating a consumer with the following characteristics:
Demographics: ${JSON.stringify(persona.demographics)}
Demand Spaces: ${JSON.stringify(persona.demandSpaces)}

You are presented with the following products:
${products.map((p, index) => `
Product ${index + 1}:
Brand: ${p.brandName}
Name: ${p.productName}
Description: ${p.description}
Price: $${(p.currentPrice / 100).toFixed(2)}
`).join('\n')}

Based on this consumer's profile and the product options, which product (respond with just the product number 1-${products.length}) would they be most likely to purchase? Consider their demographics, preferences, and the value proposition of each product.`;

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: "You are a consumer behavior expert. Select the product number that best matches the persona's preferences and constraints."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            temperature: 0.7,
            max_tokens: 10,
        });

        const response = completion.choices[0].message.content;
        if (!response) return null;

        // Extract the product number from the response
        const match = response.match(/\d+/);
        if (!match) return null;

        const selectedIndex = parseInt(match[0], 10) - 1;
        if (selectedIndex < 0 || selectedIndex >= products.length) return null;

        return products[selectedIndex].id;
    } catch (error) {
        logger.error({ err: error }, "Error getting persona preference");
        return null;
    }
}

export function registerSurveyRoutes(app: Router) {
  app.use(router);
}