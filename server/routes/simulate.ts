import { Router } from "express";
import { db } from "@db";
import { personas, products } from "@db/schema";
import { getSimulatedConsumerPreference } from "../utils/simulate-utils";
import { logger } from "../logger";

const router = Router();

router.post("/api/simulate-persona-preferences", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    const { personaId, productIds } = req.body;

    if (!personaId || !productIds || !Array.isArray(productIds)) {
      return res.status(400).send("Invalid request body");
    }

    // Get persona details
    const persona = await db.query.personas.findFirst({
      where: (personas, { eq }) => eq(personas.id, personaId)
    });

    if (!persona) {
      return res.status(404).send("Persona not found");
    }

    // Get product details
    const selectedProducts = await db.query.products.findMany({
      where: (products, { inArray }) => inArray(products.id, productIds),
      with: {
        images: true
      }
    });

    if (selectedProducts.length !== productIds.length) {
      return res.status(404).send("Some products not found");
    }

    // Simulate preferences for each demand space
    const demandSpaces = persona.demandSpaces as string[];
    const results = await Promise.all(
      demandSpaces.map(async (demandSpace) => {
        const selectedProductId = await getSimulatedConsumerPreference(
          {
            demographics: persona.demographicScreener,
            demandSpace: demandSpace
          },
          selectedProducts.map(p => ({
            id: p.id,
            brandName: p.brandName,
            productName: p.productName,
            description: p.description,
            benefits: p.benefits?.split(',') || [],
            price: p.listPrice,
            imageUrl: p.images?.[0]?.url
          }))
        );

        return {
          demandSpace,
          selectedProductId
        };
      })
    );

    res.json(results);
  } catch (error) {
    logger.error({ err: error }, "Error in persona simulation");
    res.status(500).send("Error running persona simulation");
  }
});

export function registerSimulateRoutes(app: Router) {
  app.use(router);
}