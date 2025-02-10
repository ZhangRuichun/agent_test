import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { registerUserRoutes } from "./routes/user"; 
import { registerShelfRoutes } from "./routes/shelf";
import { registerSyntheticConsumerRoutes } from "./routes/synthetic-consumer";
import { registerSurveyRoutes } from "./routes/survey";
import { registerDashboardRoutes } from "./routes/dashboard";
import { registerQuestionRoutes } from "./routes/questions";
import { registerThemeRoutes } from "./routes/theme";
import { registerSimulateRoutes } from "./routes/simulate";
import { Router } from "express";
import express from 'express';
import path from "path";
import fs from "fs/promises";
import { db } from "@db";
import { conjointConfigurations, shelves } from "@db/schema";
import { eq } from "drizzle-orm";

export function registerRoutes(app: Express): Server {
  const mainRouter = Router();

  // Setup auth on the main app first
  setupAuth(app);

  // Create uploads directory if it doesn't exist
  const uploadDir = path.join(process.cwd(), 'uploads');
  fs.mkdir(uploadDir, { recursive: true }).catch(console.error);

  // Serve uploaded files statically
  app.use('/uploads', express.static(uploadDir));

  // Add conjoint configuration routes
  mainRouter.post('/api/shelves/:id/conjoint-configuration', async (req, res) => {
    const { id } = req.params;
    const { priceLevels } = req.body;
    const userId = (req.user as any)?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
      // Validate input
      if (!priceLevels || typeof priceLevels !== 'number' || priceLevels < 2 || priceLevels > 5) {
        return res.status(400).json({ message: 'Invalid price levels. Must be between 2 and 5.' });
      }

      // Fetch shelf and validate
      const shelf = await db.query.shelves.findFirst({
        where: eq(shelves.id, parseInt(id)),
        with: {
          products: {
            with: {
              product: true,
            },
          },
        },
      });

      if (!shelf) {
        return res.status(404).json({ message: 'Shelf not found' });
      }

      if (shelf.products.length === 0) {
        return res.status(400).json({ message: 'Shelf must have at least one product to configure conjoint analysis' });
      }

      // Calculate combinations
      const combinationCount = Math.pow(priceLevels, shelf.products.length);
      const estimatedDuration = combinationCount * 30; // 30 seconds per combination

      // Save configuration
      const [config] = await db.insert(conjointConfigurations).values({
        shelfId: parseInt(id),
        priceLevels,
        combinationCount,
        estimatedDuration,
        createdBy: userId,
      }).returning();

      res.json(config);
    } catch (error) {
      console.error('Error saving conjoint configuration:', error);
      res.status(500).json({ message: 'Error saving configuration' });
    }
  });

  // Get configuration for a shelf
  mainRouter.get('/api/shelves/:id/conjoint-configuration', async (req, res) => {
    const { id } = req.params;
    const userId = (req.user as any)?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
      const config = await db.query.conjointConfigurations.findFirst({
        where: eq(conjointConfigurations.shelfId, parseInt(id)),
        orderBy: (configurations, { desc }) => [desc(configurations.createdAt)],
      });

      res.json(config || null);
    } catch (error) {
      console.error('Error fetching conjoint configuration:', error);
      res.status(500).json({ message: 'Error fetching configuration' });
    }
  });

  // Register all route handlers with the main router
  registerUserRoutes(mainRouter);
  registerShelfRoutes(mainRouter);
  registerSyntheticConsumerRoutes(mainRouter);
  registerSurveyRoutes(mainRouter);
  registerDashboardRoutes(mainRouter);
  registerQuestionRoutes(mainRouter);
  registerThemeRoutes(mainRouter);
  registerSimulateRoutes(mainRouter);

  // Use the main router on the app
  app.use("/", mainRouter);

  const httpServer = createServer(app);
  return httpServer;
}