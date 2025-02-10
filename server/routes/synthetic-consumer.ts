import { Router } from "express";
import { db } from "@db";
import { personas, respondents, responses, shelfVariants, products, questions } from "@db/schema";
import { eq, desc } from "drizzle-orm";
import OpenAI from "openai";
import { logger } from "../logger";

type QuestionWithOptions = {
  id: number;
  question: string;
  answerType: 'SINGLE' | 'MULTIPLE' | 'NUMBER' | 'TEXT';
  options: string[] | null;
  status: 'ACTIVE' | 'DELETED';
  createdAt: Date;
};

const router = Router();
const openai = new OpenAI();

// Get all active personas (previously synthetic consumers)
router.get("/api/personas", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    const allPersonas = await db.query.personas.findMany({
      where: eq(personas.status, "ACTIVE"),
      orderBy: [desc(personas.createdAt)],
    });

    res.json(allPersonas);
  } catch (error) {
    logger.error({ err: error }, "Error fetching personas");
    res.status(500).send("Error fetching personas");
  }
});

// Create persona (previously synthetic consumer)
router.post("/api/personas", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    const { name, demographicScreener, demographics, demandSpaces, questions: questionsList } = req.body;

    const [persona] = await db.insert(personas)
      .values({
        name,
        demographicScreener,
        demographics,
        demandSpaces,
        questions: questionsList,
        createdBy: req.user.id,
        status: "ACTIVE" // Add status field here
      })
      .returning();

    logger.info({ personaId: persona.id }, "New persona created");
    res.json(persona);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    logger.error({ err: error }, "Error creating persona");
    res.status(500).send(`Error creating persona: ${errorMessage}`);
  }
});

// Run simulation with a persona
router.post("/api/personas/:id/simulate", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    const personaId = parseInt(req.params.id);
    const { shelfId } = req.body;

    if (!shelfId) {
      return res.status(400).send("shelfId is required");
    }

    const persona = await db.query.personas.findFirst({
      where: eq(personas.id, personaId),
    });

    if (!persona) {
      return res.status(404).send("Persona not found");
    }

    if (persona.createdBy !== req.user.id) {
      return res.status(403).send("Unauthorized");
    }

    // Get shelf variants filtered by shelfId
    const variants = await db.query.shelfVariants.findMany({
      where: eq(shelfVariants.shelfId, shelfId),
      with: {
        shelf: true,
      },
    });

    if (variants.length === 0) {
      return res.status(404).send("No shelf variants found for the given shelf");
    }

    // Create a respondent record for this simulation
    const [respondent] = await db.insert(respondents)
      .values({
        type: "SYNTHETIC",
        personaId: personaId,
      })
      .returning();

    // For each shelf variant, simulate a choice
    const simulationResults = await Promise.all(
      variants.map(async (variant) => {
        try {
          // Get product details for the lineup
          const productsInLineup = variant.productLineup as { productId: number; price: number }[];
          const productDetails = await Promise.all(
            productsInLineup.map(async (item) => {
              const product = await db.query.products.findFirst({
                where: eq(products.id, item.productId),
              });
              return {
                ...product,
                price: item.price, // Use the variant-specific price
              };
            })
          );

          // Construct prompt for GPT-4
          const prompt = `You are simulating a consumer with the following profile:
Demographics: ${JSON.stringify(persona.demographics)}
Demand Spaces: ${JSON.stringify(persona.demandSpaces)}

You are presented with the following products:
${productDetails
            .map(
              (p) => `
Product: ${p?.brandName} ${p?.productName}
Description: ${p?.description}
Price: $${((p?.price || 0) / 100).toFixed(2)}
ID: ${p?.id}
`
            )
            .join("\n")}

Based on this consumer's profile and the product options, which product would they choose? 
Respond with only the product ID number of the chosen product. For example: "5" for product with ID 5.`;

          logger.info({ 
            gpt4o_prompt: prompt,
            personaId,
            variantId: variant.id 
          }, "Sending prompt to GPT-4o for product selection");

          // Get choice from GPT-4
          const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content: "You are a consumer behavior expert. Analyze the consumer profile and products, then select the product that best matches their preferences.",
              },
              {
                role: "user",
                content: prompt,
              },
            ],
          });

          const response = completion.choices[0].message.content;
          if (!response) {
            throw new Error("No response from GPT-4");
          }

          logger.info({ 
            gpt4o_response: response,
            personaId,
            variantId: variant.id 
          }, "Received response from GPT-4o");

          // Parse and validate the product ID
          const selectedProductId = parseInt(response.trim());
          if (isNaN(selectedProductId)) {
            throw new Error(`Invalid product ID from GPT: ${response}`);
          }

          // Verify the selected product exists in the lineup
          const validProduct = productDetails.find(p => p?.id === selectedProductId);
          if (!validProduct) {
            throw new Error(`Selected product ID ${selectedProductId} not found in lineup`);
          }

          // Record the response
          const [simulationResponse] = await db.insert(responses)
            .values({
              respondentId: respondent.id,
              shelfVariantId: variant.id,
              selectedProductId,
            })
            .returning();

          return simulationResponse;
        } catch (error) {
          logger.error({ err: error, variantId: variant.id }, "Error simulating choice for variant");
          throw error;
        }
      })
    );

    res.json(simulationResults);
  } catch (error) {
    logger.error({ err: error }, "Error running simulation");
    res.status(500).send("Error running simulation");
  }
});

// Add this new route after the existing routes
router.post("/api/personas/generate-demographics", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    const { description } = req.body;

    if (!description) {
      return res.status(400).send("Description is required");
    }

    // Fetch all active questions
    const activeQuestions = await db.query.questions.findMany({
      where: eq(questions.status, 'ACTIVE'),
      orderBy: (questions) => [questions.createdAt],
    });

    if (activeQuestions.length === 0) {
      return res.status(400).send("No active questions found in the system");
    }

    // Create a prompt that includes all questions
    const questionsPrompt = activeQuestions.map(q => {
      let questionText = `Question ${q.id}: "${q.question}" (${q.answerType})`;
      if (q.options) {
        questionText += ` Options: ${JSON.stringify(q.options)}`;
      }
      return questionText;
    }).join('\n');

    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a demographic analysis expert. Given a natural language description of a demographic profile, generate appropriate answers to the provided screening questions. Output must be a valid JSON object where each key is the question ID and the value is the appropriate answer based on the question type:
          - For SINGLE: choose one option from the provided options
          - For MULTIPLE: return an array of selected options
          - For NUMBER: return a number
          - For TEXT: return a text string

          Example: If given questions are:
          Question 1: "Age" (NUMBER)
          Question 2: "Preferred shopping locations" (MULTIPLE) Options: ["Mall", "Online", "Local store"]

          And description is "Young urban shopper", output should be:
          {
            "1": 25,
            "2": ["Mall", "Online"]
          }`
        },
        {
          role: "user",
          content: `Available questions:\n${questionsPrompt}\n\nDemographic description: ${description}`
        }
      ],
      response_format: { type: "json_object" }
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error("Failed to generate demographics");
    }

    const demographics = JSON.parse(content);

    // Validate the response matches question formats
    for (const [qId, answer] of Object.entries(demographics)) {
      const question = activeQuestions.find(q => q.id === parseInt(qId)) as QuestionWithOptions;
      if (!question) {
        throw new Error(`Invalid question ID in response: ${qId}`);
      }

      // Validate answer format
      switch (question.answerType) {
        case 'SINGLE':
          if (question.options && !question.options.includes(answer as string)) {
            throw new Error(`Invalid answer for question ${qId}: answer must be one of the provided options`);
          }
          break;
        case 'MULTIPLE':
          if (!Array.isArray(answer)) {
            throw new Error(`Invalid answer for question ${qId}: answer must be an array`);
          }
          if (question.options !== null) {
            const invalidOptions = (answer as string[]).filter(opt => !question.options!.includes(opt));
            if (invalidOptions.length > 0) {
              throw new Error(`Invalid options for question ${qId}: ${invalidOptions.join(', ')} are not valid options`);
            }
          }
          break;
        case 'NUMBER':
          if (typeof answer !== 'number') {
            throw new Error(`Invalid answer for question ${qId}: answer must be a number`);
          }
          break;
        case 'TEXT':
          if (typeof answer !== 'string') {
            throw new Error(`Invalid answer for question ${qId}: answer must be a string`);
          }
          break;
      }
    }

    // Return both the demographics and questions for frontend display
    res.json({
      demographics,
      questions: activeQuestions
    });
  } catch (error) {
    logger.error({ err: error }, "Error generating demographics");
    res.status(500).send("Error generating demographics");
  }
});


// Update persona
router.put("/api/personas/:id", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    const personaId = parseInt(req.params.id);
    const { name, demographicScreener, demandSpaces, status } = req.body;

    // Check if persona exists and belongs to user
    const existingPersona = await db.query.personas.findFirst({
      where: eq(personas.id, personaId),
    });

    if (!existingPersona) {
      return res.status(404).send("Persona not found");
    }

    if (existingPersona.createdBy !== req.user.id) {
      return res.status(403).send("Unauthorized");
    }

    // Update the persona
    const [updatedPersona] = await db
      .update(personas)
      .set({
        name,
        demographicScreener,
        demandSpaces,
        status // Update status if provided
      })
      .where(eq(personas.id, personaId))
      .returning();

    logger.info({ personaId }, "Persona updated");
    res.json(updatedPersona);
  } catch (error) {
    logger.error({ err: error }, "Error updating persona");
    res.status(500).send(`Error updating persona: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

// Soft delete persona
router.put("/api/personas/:id/delete", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    const personaId = parseInt(req.params.id);

    const [updatedPersona] = await db
      .update(personas)
      .set({ status: "DELETED" })
      .where(eq(personas.id, personaId))
      .returning();

    if (!updatedPersona) {
      return res.status(404).send("Persona not found");
    }

    res.json(updatedPersona);
  } catch (error) {
    logger.error({ err: error }, "Error updating persona status");
    res.status(500).send("Error updating persona status");
  }
});

export function registerSyntheticConsumerRoutes(app: Router) {
  app.use(router);
}