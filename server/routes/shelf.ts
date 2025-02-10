interface ShelfProductWithDetails {
  shelf: {
    id: number;
    products: Array<{
      product: {
        id: number;
        brandName: string;
        productName: string;
        description: string;
        listPrice: number;
        cost?: number | null;
        lowPrice?: number | null;
        highPrice?: number | null;
        priceLevels?: number;
        packSize?: string | null;
        volumeSize?: string | null;
        images: Array<{
          id: number;
          url: string;
          ordinal: number;
        }>;
      }
    }>;
  } | null;
}

import { Router } from "express";
import { db } from "@db";
import {
  products,
  productImages,
  shelves,
  shelfVariants,
  respondents,
  personas,
  insertShelfSchema,
  shelfProducts,
  shelfPersonas,
} from "@db/schema";
import { and, eq, desc, sql } from "drizzle-orm";
import multer from "multer";
import path from "path";
import fs from "fs";
import express from "express";
import OpenAI from "openai";
import { logger } from "../logger";
import { Buffer } from "buffer";

const router = Router();
const openai = new OpenAI();

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), "uploads");
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only JPEG, PNG and GIF are allowed."));
    }
  },
});

// Function to download image from URL and save it
async function downloadAndSaveImage(imageUrl: string): Promise<string> {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`);
  }

  const buffer = await response.arrayBuffer();
  const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const filename = `generated-${uniqueSuffix}.png`;
  const filepath = path.join(process.cwd(), "uploads", filename);

  await fs.promises.writeFile(filepath, Buffer.from(buffer));
  return `/uploads/${filename}`;
}

// Update calculateTotalCombinations function to better handle price levels
function calculateTotalCombinations(shelfProducts: any[]): number {
  let totalCombinations = 1;

  for (const sp of shelfProducts) {
    const product = sp.product;
    // Consider both priceLevels and price range configuration
    const priceLevels = product.priceLevels ||
      (product.lowPrice && product.highPrice ? 5 : 1); // Default to 5 levels if price range exists
    totalCombinations *= priceLevels;
  }

  return totalCombinations;
}

function calculateMinimumSampleSize(totalCombinations: number): number {
  // Using a common rule of thumb: minimum 30 responses per combination
  // with a maximum cap of 1000 to keep it practical
  return Math.min(totalCombinations * 30, 1000);
}

// Configure personas for a shelf
router.post("/api/shelves/:id/personas", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    const shelfId = parseInt(req.params.id);
    const { personaIds } = req.body;

    if (!Array.isArray(personaIds)) {
      return res.status(400).send("personaIds must be an array");
    }

    // Delete existing persona associations
    await db.delete(shelfPersonas).where(eq(shelfPersonas.shelfId, shelfId));

    // Add new persona associations
    const newPersonaAssociations = await Promise.all(
      personaIds.map(async (personaId) => {
        const [association] = await db
          .insert(shelfPersonas)
          .values({
            shelfId,
            personaId,
          })
          .returning();
        return association;
      }),
    );

    res.json(newPersonaAssociations);
  } catch (error) {
    logger.error({ err: error }, "Error configuring shelf personas");
    res.status(500).send("Error configuring shelf personas");
  }
});

// Configure products for a shelf
router.post("/api/shelves/:id/products", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    const shelfId = parseInt(req.params.id);
    const { productIds } = req.body;

    if (!Array.isArray(productIds)) {
      return res.status(400).send("productIds must be an array");
    }

    // Delete existing product associations
    await db.delete(shelfProducts).where(eq(shelfProducts.shelfId, shelfId));

    // Add new product associations
    const newProductAssociations = await Promise.all(
      productIds.map(async (productId) => {
        const [association] = await db
          .insert(shelfProducts)
          .values({
            shelfId,
            productId,
          })
          .returning();
        return association;
      }),
    );

    res.json(newProductAssociations);
  } catch (error) {
    logger.error({ err: error }, "Error configuring shelf products");
    res.status(500).send("Error configuring shelf products");
  }
});

// Download and save AI-generated image
router.post("/api/products/:id/download-image", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    const productId = parseInt(req.params.id);
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).send("Image URL is required");
    }

    const product = await db.query.products.findFirst({
      where: eq(products.id, productId),
    });

    if (!product) {
      return res.status(404).send("Product not found");
    }

    // Download and save the image
    const savedImageUrl = await downloadAndSaveImage(imageUrl);

    // Get the highest ordinal for this product's images
    const existingImages = await db.query.productImages.findMany({
      where: eq(productImages.productId, productId),
      orderBy: [desc(productImages.ordinal)],
    });

    const nextOrdinal =
      existingImages.length > 0 ? existingImages[0].ordinal + 1 : 0;

    // Save image record in database
    const [productImage] = await db
      .insert(productImages)
      .values({
        productId,
        url: savedImageUrl,
        ordinal: nextOrdinal,
      })
      .returning();

    res.json(productImage);
  } catch (err) {
    console.error("Error downloading image:", err);
    if (err instanceof Error) {
      res.status(400).send(err.message);
    } else {
      res.status(500).send("Internal server error");
    }
  }
});

// Generate product ideas
router.post("/api/generate-products", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    const { brandName, prompt } = req.body;

    if (!brandName || !prompt) {
      return res.status(400).send("Brand name and prompt are required");
    }

    // Generate product ideas using GPT-4
    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a product ideation expert that only responds in JSON format. Generate product ideas for the brand provided based on the prompt.
Return your response in this exact JSON format:
{
  "products": [
    {
      "brandName": "string",
      "productName": "string",
      "description": "string",
      "benefits": "string",
      "cost": 0.00,
      "listPrice": 0.00,
      "imagePrompt": "string"
    }
  ]
}`,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    let productIdeas;
    try {
      const content = completion.choices[0].message.content;
      if (!content) {
        throw new Error("Empty response from GPT-4");
      }
      productIdeas = JSON.parse(content);
      if (!productIdeas.products || !Array.isArray(productIdeas.products)) {
        throw new Error("Invalid response format from GPT-4");
      }
    } catch (error) {
      logger.error({ err: error }, "Error parsing GPT response");
      return res
        .status(400)
        .send("Failed to generate product ideas. Please try again.");
    }

    // Generate images for each product idea
    const productsWithImages = await Promise.all(
      productIdeas.products.map(async (product: any) => {
        try {
          const image = await openai.images.generate({
            model: "dall-e-3",
            prompt: product.imagePrompt,
            size: "1024x1024",
            quality: "standard",
            n: 1,
          });

          return {
            ...product,
            imageUrl: image.data[0].url,
          };
        } catch (error) {
          console.error("Error generating image:", error);
          return {
            ...product,
            imageUrl: null,
            imageError: "Failed to generate image",
          };
        }
      }),
    );

    res.json(productsWithImages);
  } catch (err) {
    console.error("Product generation error:", err);
    if (err instanceof Error) {
      res.status(400).send(err.message);
    } else {
      res.status(500).send("Internal server error");
    }
  }
});

// Create new shelf
router.post("/api/shelves", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    const validatedData = insertShelfSchema.parse({
      ...req.body,
      createdBy: req.user.id,
    });

    const [shelf] = await db.insert(shelves).values(validatedData).returning();
    res.json(shelf);
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).send(err.message);
    } else {
      res.status(500).send("Internal server error");
    }
  }
});

// Delete shelf (soft delete)
router.delete("/api/shelves/:id", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    const shelfId = parseInt(req.params.id);

    const shelf = await db.query.shelves.findFirst({
      where: eq(shelves.id, shelfId),
    });

    if (!shelf) {
      return res.status(404).send("Shelf not found");
    }

    if (shelf.createdBy !== req.user.id) {
      return res.status(403).send("Unauthorized");
    }

    // Update shelf status to DELETED instead of removing it
    await db
      .update(shelves)
      .set({ status: "DELETED" })
      .where(eq(shelves.id, shelfId));

    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting shelf:", err);
    res.status(500).send("Internal server error");
  }
});

// Get all active shelves for current user
router.get("/api/shelves", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    const userShelves = await db.query.shelves.findMany({
      where: and(
        eq(shelves.createdBy, req.user.id),
        eq(shelves.status, "ACTIVE"),
      ),
      orderBy: [desc(shelves.createdAt)],
      with: {
        products: {
          with: {
            product: {
              with: {
                images: {
                  orderBy: [desc(productImages.ordinal)],
                },
              },
            },
          },
        },
        personas: {
          with: {
            persona: true,
          },
        },
      },
    });

    // Add calculations for each shelf
    const shelvesWithMetrics = userShelves.map((shelf) => {
      const totalCombinations = calculateTotalCombinations(shelf.products);
      const minimumSampleSize = calculateMinimumSampleSize(totalCombinations);

      return {
        ...shelf,
        metrics: {
          totalCombinations,
          minimumSampleSize,
        },
      };
    });

    res.json(shelvesWithMetrics);
  } catch (err) {
    console.error("Error fetching shelves:", err);
    res.status(500).send("Internal server error");
  }
});

// Get a specific shelf
router.get("/api/shelves/:id", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    const shelf = await db.query.shelves.findFirst({
      where: eq(shelves.id, parseInt(req.params.id)),
      with: {
        createdByUser: true,
        products: {
          with: {
            product: true,
          },
        },
        personas: {
          with: {
            persona: true,
          },
        },
      },
    });

    if (!shelf) {
      return res.status(404).send("Shelf not found");
    }

    if (shelf.createdBy !== req.user.id) {
      return res.status(403).send("Unauthorized");
    }

    // Add metrics to the response
    const totalCombinations = calculateTotalCombinations(shelf.products);
    const minimumSampleSize = calculateMinimumSampleSize(totalCombinations);

    const shelfWithMetrics = {
      ...shelf,
      metrics: {
        totalCombinations,
        minimumSampleSize,
      },
    };

    res.json(shelfWithMetrics);
  } catch (err) {
    res.status(500).send("Internal server error");
  }
});

// Create a product
router.post("/api/products", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    // Convert price-related fields from dollars to cents
    const productData = {
      ...req.body,
      listPrice: Math.round(req.body.listPrice * 100),
      cost: req.body.cost ? Math.round(req.body.cost * 100) : null,
      lowPrice: req.body.lowPrice ? Math.round(req.body.lowPrice * 100) : null,
      highPrice: req.body.highPrice
        ? Math.round(req.body.highPrice * 100)
        : null,
    };

    const [product] = await db.insert(products).values(productData).returning();

    // Convert prices back to dollars for response
    res.json({
      ...product,
      listPrice: product.listPrice / 100,
      cost: product.cost ? product.cost / 100 : null,
      lowPrice: product.lowPrice ? product.lowPrice / 100 : null,
      highPrice: product.highPrice ? product.highPrice / 100 : null,
    });
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).send(err.message);
    } else {
      res.status(500).send("Internal server error");
    }
  }
});

// Update product
router.put("/api/products/:id", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    const productId = parseInt(req.params.id);

    // Convert price-related fields from dollars to cents
    const productData = {
      ...req.body,
      listPrice: Math.round(req.body.listPrice * 100),
      cost: req.body.cost ? Math.round(req.body.cost * 100) : null,
      lowPrice: req.body.lowPrice ? Math.round(req.body.lowPrice * 100) : null,
      highPrice: req.body.highPrice ? Math.round(req.body.highPrice * 100) : null,
      priceLevels: req.body.priceLevels || (req.body.lowPrice && req.body.highPrice ? 5 : 1),
      packSize: req.body.packSize || null,
      volumeSize: req.body.volumeSize || null,
    };

    // Check if product exists
    const existingProduct = await db.query.products.findFirst({
      where: eq(products.id, productId),
    });

    if (!existingProduct) {
      return res.status(404).send("Product not found");
    }

    // Update the product
    const [updatedProduct] = await db
      .update(products)
      .set(productData)
      .where(eq(products.id, productId))
      .returning();

    // Find all shelves that contain this product
    const relatedShelfProducts = await db.query.shelfProducts.findMany({
      where: eq(shelfProducts.productId, productId),
      with: {
        shelf: {
          with: {
            products: {
              with: {
                product: {
                  with: {
                    images: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Calculate updated metrics for each affected shelf
    const updatedShelfMetrics = relatedShelfProducts
      .map((sp) => {
        const shelf = sp.shelf;
        if (!shelf) return null;

        const totalCombinations = calculateTotalCombinations(shelf.products);
        const minimumSampleSize = calculateMinimumSampleSize(totalCombinations);

        return {
          shelfId: shelf.id,
          metrics: {
            totalCombinations,
            minimumSampleSize,
          },
        };
      })
      .filter(Boolean);

    // Convert prices back to dollars for response
    res.json({
      product: {
        ...updatedProduct,
        listPrice: updatedProduct.listPrice / 100,
        cost: updatedProduct.cost ? updatedProduct.cost / 100 : null,
        lowPrice: updatedProduct.lowPrice ? updatedProduct.lowPrice / 100 : null,
        highPrice: updatedProduct.highPrice ? updatedProduct.highPrice / 100 : null,
      },
      affectedShelves: updatedShelfMetrics,
    });
  } catch (err) {
    console.error("Product update error:", err);
    if (err instanceof Error) {
      res.status(400).send(err.message);
    } else {
      res.status(500).send("Internal server error");
    }
  }
});

// Get all products
router.get("/api/products", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    const allProducts = await db.query.products.findMany({
      where: eq(products.status, "ACTIVE"),
      orderBy: [desc(products.createdAt)],
      with: {
        images: {
          orderBy: [desc(productImages.ordinal)],
        },
      },
    });

    // Convert prices from cents to dollars for response
    res.json(
      allProducts.map((product) => ({
        ...product,
        listPrice: product.listPrice / 100,
        cost: product.cost ? product.cost / 100 : null,
        lowPrice: product.lowPrice ? product.lowPrice / 100 : null,
        highPrice: product.highPrice ? product.highPrice / 100 : null,
      })),
    );
  } catch (err) {
    res.status(500).send("Internal server error");
  }
});

// Get panelists (personas or human)
router.get("/api/panelists/:type", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    const { type } = req.params;
    if (!["synthetic", "human"].includes(type.toLowerCase())) {
      return res.status(400).send("Invalid panelist type");
    }

    const upperType = type.toUpperCase();

    if (upperType === "SYNTHETIC") {
      // For synthetic panelists, get from personas table
      const syntheticPanelists = await db.query.personas.findMany({
        where: eq(personas.createdBy, req.user.id),
        orderBy: [desc(personas.createdAt)],
      });

      return res.json(
        syntheticPanelists.map((p) => ({
          id: p.id,
          name: p.name,
          type: "SYNTHETIC",
          demographics: p.demographics,
        })),
      );
    } else {
      // For human panelists, get from respondents table
      const humanPanelists = await db.query.respondents.findMany({
        where: and(
          eq(respondents.type, "HUMAN"),
          // Only return respondents with demographics (indicating they completed the survey)
          sql`${respondents.demographics} IS NOT NULL`,
        ),
        orderBy: [desc(respondents.createdAt)],
      });

      return res.json(
        humanPanelists.map((p) => ({
          id: p.id,
          name: `Human Panelist ${p.id}`,
          type: "HUMAN",
          demographics: p.demographics,
        })),
      );
    }
  } catch (err) {
    console.error("Error fetching panelists:", err);
    res.status(500).send("Internal server error");
  }
});

// Get products for a specific shelf
router.get("/api/shelves/:id/products", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    const shelfId = parseInt(req.params.id);

    const shelf = await db.query.shelves.findFirst({
      where: eq(shelves.id, shelfId),
      with: {
        products: {
          with: {
            product: {
              with: {
                images: true,
              },
            },
          },
        },
      },
    });

    if (!shelf) {
      return res.status(404).send("Shelf not found");
    }

    if (shelf.createdBy !== req.user.id) {
      return res.status(403).send("Unauthorized");
    }

    // Convert prices from cents to dollars
    const products = shelf.products.map((sp) => ({
      ...sp.product,
      listPrice: sp.product.listPrice / 100,
      cost: sp.product.cost ? sp.product.cost / 100 : null,
      lowPrice: sp.product.lowPrice ? sp.product.lowPrice / 100 : null,
      highPrice: sp.product.highPrice ? sp.product.highPrice / 100 : null,
    }));

    res.json(products);
  } catch (err) {
    console.error("Error fetching shelf products:", err);
    res.status(500).send("Internal server error");
  }
});

// Upload product image
router.post(
  "/api/products/:id/images",
  upload.single("image"),
  async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).send("Unauthorized");
      }

      if (!req.file) {
        return res.status(400).send("No image file uploaded");
      }

      const productId = parseInt(req.params.id);
      const product = await db.query.products.findFirst({
        where: eq(products.id, productId),
      });

      if (!product) {
        return res.status(404).send("Product not found");
      }

      // Get the highest ordinal for this product's images
      const existingImages = await db.query.productImages.findMany({
        where: eq(productImages.productId, productId),
        orderBy: [desc(productImages.ordinal)],
      });

      const nextOrdinal =
        existingImages.length > 0 ? existingImages[0].ordinal + 1 : 0;

      // Create URL for the uploaded file
      const imageUrl = `/uploads/${req.file.filename}`;

      const [productImage] = await db
        .insert(productImages)
        .values({
          productId,
          url: imageUrl,
          ordinal: nextOrdinal,
        })
        .returning();

      res.json(productImage);
    } catch (err) {
      if (err instanceof Error) {
        res.status(400).send(err.message);
      } else {
        res.status(500).send("Internal server error");
      }
    }
  },
);

// Serve uploaded files statically
const uploadDir = path.join(process.cwd(), "uploads");
// Create uploads directory if it doesn't exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
console.log("Serving static files from:", uploadDir);
router.use("/uploads", express.static(uploadDir));

// Edit image with DALL-E
router.post("/api/edit-image", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    const { image, mask, prompt } = req.body;

    if (!image || !mask || !prompt) {
      return res.status(400).send("Missing required fields");
    }

    // Convert base64 to Buffer
    const imageBuffer = Buffer.from(image, "base64");
    const maskBuffer = Buffer.from(mask, "base64");

    // Create temporary files for the buffers
    const imagePath = path.join(uploadDir, `temp-image-${Date.now()}.png`);
    const maskPath = path.join(uploadDir, `temp-mask-${Date.now()}.png`);

    // Write buffers to temporary files
    await fs.promises.writeFile(imagePath, imageBuffer);
    await fs.promises.writeFile(maskPath, maskBuffer);

    try {
      // Generate edited image using DALL-E with file paths
      const response = await openai.images.edit({
        image: fs.createReadStream(imagePath),
        mask: fs.createReadStream(maskPath),
        prompt,
        n: 4,
        size: "1024x1024",
      });

      if (!response.data || response.data.length === 0) {
        throw new Error("Failed to generate images");
      }

      const savedImageUrls = await Promise.all(
        response.data.map(async (imgData) => {
          if (!imgData.url) throw new Error("Missing image url in response");
          return await downloadAndSaveImage(imgData.url);
        }),
      );

      res.json({ urls: savedImageUrls });
    } finally {
      // Clean up temporary files
      await fs.promises.unlink(imagePath).catch(console.error);
      await fs.promises.unlink(maskPath).catch(console.error);
    }
  } catch (error) {
    console.error("Error editing image:", error);
    res
      .status(500)
      .send(error instanceof Error ? error.message : "Internal server error");
  }
});

// Configure shelf variants for simulation
router.post("/api/shelves/:id/variants", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    const shelf = await db.query.shelves.findFirst({
      where: eq(shelves.id, parseInt(req.params.id)),
      with: {
        createdByUser: true,
      },
    });

    if (!shelf) {
      return res.status(404).send("Shelf not found");
    }

    if (shelf.createdBy !== req.user.id) {
      return res.status(403).send("Unauthorized");
    }

    const { products: productConfigs } = req.body;

    // For each product configuration, create shelf variants with different price points
    const variants = [];
    for (const config of productConfigs) {
      const { productId, minPricePercent, maxPricePercent } = config;

      // Get base product details
      const baseProduct = await db.query.products.findFirst({
        where: eq(products.id, productId),
      });

      if (!baseProduct) {
        return res.status(404).send(`Product ${productId} not found`);
      }

      // Create variants with different price points
      const steps = 5; // Number of price points to test
      const priceRange = maxPricePercent - minPricePercent;
      const step = priceRange / (steps - 1);

      for (let i = 0; i < steps; i++) {
        const pricePercent = minPricePercent + step * i;
        const price = Math.round(
          baseProduct.listPrice * (1 + pricePercent / 100),
        );

        // Create a variant with this price configuration
        const [variant] = await db
          .insert(shelfVariants)
          .values({
            shelfId: shelf.id,
            productLineup: [
              {
                productId,
                price,
              },
            ],
          })
          .returning();

        variants.push(variant);
      }
    }

    res.json(variants);
  } catch (error) {
    logger.error({ err: error }, "Error configuring shelf variants");
    res.status(500).send("Error configuring shelf variants");
  }
});

// Delete product image
router.delete("/api/products/:productId/images/:imageId", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    const productId = parseInt(req.params.productId);
    const imageId = parseInt(req.params.imageId);

    // Find the image first
    const image = await db.query.productImages.findFirst({
      where: and(
        eq(productImages.id, imageId),
        eq(productImages.productId, productId),
      ),
    });

    if (!image) {
      return res.status(404).send("Image not found");
    }

    // Delete the image file from the uploads directory
    const filepath = path.join(process.cwd(), image.url);
    try {
      await fs.promises.unlink(filepath);
    } catch (error) {
      console.error("Error deleting image file:", error);
      // Continue even if file deletion fails
    }

    // Delete the image record from the database
    await db
      .delete(productImages)
      .where(
        and(
          eq(productImages.id, imageId),
          eq(productImages.productId, productId),
        ),
      );

    res.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, "Error deleting product image");
    res.status(500).send("Error deleting product image");
  }
});

// Delete product
router.delete("/api/products/:id", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    const productId = parseInt(req.params.id);

    // Check if product exists
    const existingProduct = await db.query.products.findFirst({
      where: eq(products.id, productId),
    });

    if (!existingProduct) {
      return res.status(404).send("Product not found");
    }

    // Find all shelves that contain this product before deleting
    const affectedShelves = await db.query.shelfProducts.findMany({
      where: eq(shelfProducts.productId, productId),
      with: {
        shelf: {
          with: {
            products: {
              with: {
                product: true,
              },
            },
          },
        },
      },
    });

    // Update product status to DELETED
    await db
      .update(products)
      .set({ status: "DELETED" })
      .where(eq(products.id, productId));

    // Calculate updated metrics for each affected shelf
    const updatedShelfMetrics = affectedShelves.map((sp) => {
      const shelf = sp.shelf;
      if (!shelf) return null;

      const totalCombinations = calculateTotalCombinations(shelf.products);
      const minimumSampleSize = calculateMinimumSampleSize(totalCombinations);

      return {
        shelfId: shelf.id,
        metrics: {
          totalCombinations,
          minimumSampleSize,
        },
      };
    }).filter(Boolean);

    res.json({
      success: true,
      affectedShelves: updatedShelfMetrics,
    });
  } catch (err) {
    console.error("Error deleting product:", err);
    if (err instanceof Error) {
      res.status(400).send(err.message);
    } else {
      res.status(500).send("Internal server error");
    }
  }
});

// Configure product price levels
router.post("/api/products/:id/price-config", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    const productId = parseInt(req.params.id);
    const { lowPrice, highPrice, priceLevels } = req.body;

    // Input validation
    if (!lowPrice || !highPrice || !priceLevels) {
      return res.status(400).send("Missing required fields");
    }

    if (lowPrice >= highPrice) {
      return res.status(400).send("High price must be greater than low price");
    }

    if (priceLevels < 2 || priceLevels > 5) {
      return res.status(400).send("Price levels must be between 2 and 5");
    }

    // Get the product
    const product = await db.query.products.findFirst({
      where: eq(products.id, productId),
    });

    if (!product) {
      return res.status(404).send("Product not found");
    }

    // Update product with new price configuration
    const [updatedProduct] = await db
      .update(products)
      .set({
        lowPrice: Math.round(lowPrice * 100),
        highPrice: Math.round(highPrice * 100),
        priceLevels,
      })
      .where(eq(products.id, productId))
      .returning();

    // Convert prices back to dollars for response
    res.json({
      ...updatedProduct,
      listPrice: updatedProduct.listPrice / 100,
      cost: updatedProduct.cost ? updatedProduct.cost / 100 : null,
      lowPrice: updatedProduct.lowPrice ? updatedProduct.lowPrice / 100 : null,
      highPrice: updatedProduct.highPrice ? updatedProduct.highPrice / 100 : null,
    });
  } catch (err) {
    logger.error({ err }, "Error updating product price configuration");
    if (err instanceof Error) {
      res.status(400).send(err.message);
    } else {
      res.status(500).send("Internal server error");
    }
  }
});

// Export the router
export function registerShelfRoutes(app: Router) {
  app.use(router);
}

// Placeholder for shelfVariants table definition.  Replace with your actual schema.
// import { sql } from 'drizzle-orm';
// export const shelfVariants = sql`CREATE TABLE IF NOT EXISTS shelfVariants (
//   id SERIAL PRIMARY KEY,
//   shelfId INTEGER REFERENCES shelves(id),
//   productLineup JSONB
// )`;