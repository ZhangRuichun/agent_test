import { pgTable, text, serial, integer, timestamp, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Create enums
export const userStatusEnum = pgEnum('user_status', ['PENDING', 'ACTIVE', 'SUSPENDED']);
export const respondentTypeEnum = pgEnum('respondent_type', ['HUMAN', 'SYNTHETIC']);
export const shelfStatusEnum = pgEnum('shelf_status', ['ACTIVE', 'DELETED']);
export const personaStatusEnum = pgEnum('persona_status', ['ACTIVE', 'DELETED']);
export const questionAnswerTypeEnum = pgEnum('question_answer_type', ['SINGLE', 'MULTIPLE', 'NUMBER', 'TEXT']);
export const questionStatusEnum = pgEnum('question_status', ['ACTIVE', 'DELETED']);
export const productStatusEnum = pgEnum('product_status', ['ACTIVE', 'DELETED']);
export const themeVariantEnum = pgEnum('theme_variant', ['professional', 'tint', 'vibrant']);

// Products with new fields and status
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  brandName: text("brand_name").notNull(),
  productName: text("product_name").notNull(),
  description: text("description").notNull(),
  listPrice: integer("list_price").notNull(), // Store price in cents
  benefits: text("benefits"),
  cost: integer("cost"), // Store cost in cents
  lowPrice: integer("low_price"), // Store price in cents
  highPrice: integer("high_price"), // Store price in cents
  priceLevels: integer("price_levels"), // Add price levels field
  packSize: text("pack_size"),
  volumeSize: text("volume_size"),
  newProduct: text("new_product").default('yes').notNull(),
  status: productStatusEnum("status").default('ACTIVE').notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Shelf (projects)
export const shelves = pgTable("shelves", {
  id: serial("id").primaryKey(),
  projectName: text("project_name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: integer("created_by").references(() => users.id),
  status: shelfStatusEnum("status").default('ACTIVE').notNull(),
});

// Questions table
export const questions = pgTable("questions", {
  id: serial("id").primaryKey(),
  question: text("question").notNull(),
  answerType: questionAnswerTypeEnum("answer_type").notNull(),
  options: jsonb("options"), // For SINGLE/MULTIPLE types
  status: questionStatusEnum("status").default('ACTIVE').notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: integer("created_by").references(() => users.id),
});

// Rename synthetic_consumers to personas
export const personas = pgTable("personas", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  demographicScreener: text("demographic_screener").notNull(),
  demographics: jsonb("demographics").notNull(),
  demandSpaces: jsonb("demand_spaces").notNull(),
  questions: jsonb("questions").notNull(), // Add questions field
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: integer("created_by").references(() => users.id),
  status: personaStatusEnum("status").default('ACTIVE').notNull(),
});

// Many-to-many tables
export const shelfProducts = pgTable("shelf_products", {
  id: serial("id").primaryKey(),
  shelfId: integer("shelf_id").references(() => shelves.id).notNull(),
  productId: integer("product_id").references(() => products.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const shelfPersonas = pgTable("shelf_personas", {
  id: serial("id").primaryKey(),
  shelfId: integer("shelf_id").references(() => shelves.id).notNull(),
  personaId: integer("persona_id").references(() => personas.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Add shelfQuestions table after existing many-to-many tables
export const shelfQuestions = pgTable("shelf_questions", {
  id: serial("id").primaryKey(),
  shelfId: integer("shelf_id").references(() => shelves.id).notNull(),
  questionId: integer("question_id").references(() => questions.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Product Images
export const productImages = pgTable("product_images", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id).notNull(),
  url: text("url").notNull(),
  ordinal: integer("ordinal").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Shelf Variants (configurations)
export const shelfVariants = pgTable("shelf_variants", {
  id: serial("id").primaryKey(),
  shelfId: integer("shelf_id").references(() => shelves.id).notNull(),
  productLineup: jsonb("product_lineup").notNull(), // JSON array of product configurations
  configurationId: integer("configuration_id").references(() => conjointConfigurations.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Add after shelfVariants table definition
export const conjointConfigurations = pgTable("conjoint_configurations", {
  id: serial("id").primaryKey(),
  shelfId: integer("shelf_id").notNull().references(() => shelves.id),
  priceLevels: integer("price_levels").notNull().default(3),
  combinationCount: integer("combination_count").notNull(),
  estimatedDuration: integer("estimated_duration").notNull(), // in seconds
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: integer("created_by").notNull().references(() => users.id),
});

// Respondents
export const respondents = pgTable("respondents", {
  id: serial("id").primaryKey(),
  type: respondentTypeEnum("type").notNull(),
  personaId: integer("persona_id").references(() => personas.id),
  demographics: jsonb("demographics"), // For human respondents
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Responses
export const responses = pgTable("responses", {
  id: serial("id").primaryKey(),
  respondentId: integer("respondent_id").references(() => respondents.id).notNull(),
  shelfVariantId: integer("shelf_variant_id").references(() => shelfVariants.id).notNull(),
  selectedProductId: integer("selected_product_id").references(() => products.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Themes table for storing custom UI themes
export const themes = pgTable("themes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  primary: text("primary").notNull(),
  variant: themeVariantEnum("variant").default('professional').notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: integer("created_by").references(() => users.id),
});

// Relations
export const shelvesRelations = relations(shelves, ({ one, many }) => ({
  createdByUser: one(users, {
    fields: [shelves.createdBy],
    references: [users.id],
  }),
  products: many(shelfProducts),
  personas: many(shelfPersonas),
  questions: many(shelfQuestions),
  conjointConfiguration: one(conjointConfigurations, {
    fields: [shelves.id],
    references: [conjointConfigurations.shelfId],
  }),
}));

export const productsRelations = relations(products, ({ many }) => ({
  images: many(productImages),
  shelves: many(shelfProducts),
}));

export const personasRelations = relations(personas, ({ many, one }) => ({
  shelves: many(shelfPersonas),
  createdByUser: one(users, {
    fields: [personas.createdBy],
    references: [users.id],
  }),
  respondents: many(respondents)
}));

export const shelfProductsRelations = relations(shelfProducts, ({ one }) => ({
  shelf: one(shelves, {
    fields: [shelfProducts.shelfId],
    references: [shelves.id],
  }),
  product: one(products, {
    fields: [shelfProducts.productId],
    references: [products.id],
  }),
}));

export const shelfPersonasRelations = relations(shelfPersonas, ({ one }) => ({
  shelf: one(shelves, {
    fields: [shelfPersonas.shelfId],
    references: [shelves.id],
  }),
  persona: one(personas, {
    fields: [shelfPersonas.personaId],
    references: [personas.id],
  }),
}));

export const respondentsRelations = relations(respondents, ({ one, many }) => ({
  persona: one(personas, {
    fields: [respondents.personaId],
    references: [personas.id],
  }),
  responses: many(responses),
}));

export const responsesRelations = relations(responses, ({ one }) => ({
  respondent: one(respondents, {
    fields: [responses.respondentId],
    references: [respondents.id],
  }),
  shelfVariant: one(shelfVariants, {
    fields: [responses.shelfVariantId],
    references: [shelfVariants.id],
  }),
  selectedProduct: one(products, {
    fields: [responses.selectedProductId],
    references: [products.id],
  }),
}));

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, {
    fields: [productImages.productId],
    references: [products.id],
  }),
}));

export const shelfVariantsRelations = relations(shelfVariants, ({ one }) => ({
  shelf: one(shelves, {
    fields: [shelfVariants.shelfId],
    references: [shelves.id],
  }),
  configuration: one(conjointConfigurations, {
    fields: [shelfVariants.configurationId],
    references: [conjointConfigurations.id],
  }),
}));

export const questionsRelations = relations(questions, ({ one, many }) => ({
  createdByUser: one(users, {
    fields: [questions.createdBy],
    references: [users.id],
  }),
  shelves: many(shelfQuestions),
}));

export const shelfQuestionsRelations = relations(shelfQuestions, ({ one }) => ({
  shelf: one(shelves, {
    fields: [shelfQuestions.shelfId],
    references: [shelves.id],
  }),
  question: one(questions, {
    fields: [shelfQuestions.questionId],
    references: [questions.id],
  }),
}));

export const themesRelations = relations(themes, ({ one }) => ({
  createdByUser: one(users, {
    fields: [themes.createdBy],
    references: [users.id],
  }),
}));

export const conjointConfigurationsRelations = relations(conjointConfigurations, ({ one }) => ({
  shelf: one(shelves, {
    fields: [conjointConfigurations.shelfId],
    references: [shelves.id],
  }),
  createdByUser: one(users, {
    fields: [conjointConfigurations.createdBy],
    references: [users.id],
  }),
}));


// Define users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  status: userStatusEnum("status").default('PENDING').notNull(),
  passwordResetToken: text("password_reset_token"),
});

// Schemas
export const insertUserSchema = createInsertSchema(users, {
  username: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  status: z.enum(['PENDING', 'ACTIVE', 'SUSPENDED']).optional(),
  passwordResetToken: z.string().optional(),
});

export const selectUserSchema = createSelectSchema(users);

export const insertShelfSchema = createInsertSchema(shelves);
export const selectShelfSchema = createSelectSchema(shelves);

// Update product schemas to include newProduct
export const insertProductSchema = createInsertSchema(products, {
  newProduct: z.enum(['yes', 'no']).default('yes'),
  priceLevels: z.number().min(2).max(5).optional(),
  packSize: z.string().optional(),
  volumeSize: z.string().optional(),
});
export const selectProductSchema = createSelectSchema(products);

export const insertProductImageSchema = createInsertSchema(productImages);
export const selectProductImageSchema = createSelectSchema(productImages);

export const insertShelfVariantSchema = createInsertSchema(shelfVariants, {
  productLineup: z.array(z.object({
    productId: z.number(),
    price: z.number(),
  })),
});
export const selectShelfVariantSchema = createSelectSchema(shelfVariants);

export const insertQuestionSchema = createInsertSchema(questions, {
  options: z.array(z.string()).optional(),
});
export const selectQuestionSchema = createSelectSchema(questions);

export const insertPersonaSchema = createInsertSchema(personas, {
  demographicScreener: z.string().min(1, "Demographic screener is required"),
  demographics: z.record(z.string(), z.any()),
  demandSpaces: z.array(z.string()),
  questions: z.array(z.object({
    id: z.number(),
    question: z.string(),
    answerType: z.enum(['SINGLE', 'MULTIPLE', 'NUMBER', 'TEXT']),
    options: z.array(z.string()).optional(),
  })),
});
export const selectPersonaSchema = createSelectSchema(personas);

export const insertRespondentSchema = createInsertSchema(respondents, {
  demographics: z.record(z.string(), z.any()).optional(),
});
export const selectRespondentSchema = createSelectSchema(respondents);

export const insertResponseSchema = createInsertSchema(responses);
export const selectResponseSchema = createSelectSchema(responses);

// Add theme schemas
export const insertThemeSchema = createInsertSchema(themes, {
  name: z.string().min(1, "Theme name is required"),
  primary: z.string().regex(/^hsl\(\d+(\.\d+)?(\s+\d+(\.\d+)?%){2}\)$/, "Primary color must be in HSL format"),
  variant: z.enum(['professional', 'tint', 'vibrant']),
});

export const selectThemeSchema = createSelectSchema(themes);

// Add schemas
export const insertConjointConfigurationSchema = createInsertSchema(conjointConfigurations);
export const selectConjointConfigurationSchema = createSelectSchema(conjointConfigurations);

// Export types
export type InsertUser = typeof users.$inferInsert;
export type SelectUser = typeof users.$inferSelect;

export type InsertShelf = typeof shelves.$inferInsert;
export type SelectShelf = typeof shelves.$inferSelect;

export type InsertProduct = typeof products.$inferInsert;
export type SelectProduct = typeof products.$inferSelect;

export type InsertProductImage = typeof productImages.$inferInsert;
export type SelectProductImage = typeof productImages.$inferSelect;

export type InsertShelfVariant = typeof shelfVariants.$inferInsert;
export type SelectShelfVariant = typeof shelfVariants.$inferSelect;

export type InsertQuestion = typeof questions.$inferInsert;
export type SelectQuestion = typeof questions.$inferSelect;

export type InsertPersona = typeof personas.$inferInsert;
export type SelectPersona = typeof personas.$inferSelect;

export type InsertRespondent = typeof respondents.$inferInsert;
export type SelectRespondent = typeof respondents.$inferSelect;

export type InsertResponse = typeof responses.$inferInsert;
export type SelectResponse = typeof responses.$inferSelect;

export type InsertShelfProduct = typeof shelfProducts.$inferInsert;
export type SelectShelfProduct = typeof shelfProducts.$inferSelect;

export type InsertShelfPersona = typeof shelfPersonas.$inferInsert;
export type SelectShelfPersona = typeof shelfPersonas.$inferSelect;

export type InsertShelfQuestion = typeof shelfQuestions.$inferInsert;
export type SelectShelfQuestion = typeof shelfQuestions.$inferSelect;

export type InsertTheme = typeof themes.$inferInsert;
export type SelectTheme = typeof themes.$inferSelect;

export type InsertConjointConfiguration = typeof conjointConfigurations.$inferInsert;
export type SelectConjointConfiguration = typeof conjointConfigurations.$inferSelect;