import { Router } from "express";
import { db } from "@db";
import { questions } from "@db/schema";
import { eq } from "drizzle-orm";
import { logger } from "../logger";

const router = Router();

// Get all active questions
router.get("/api/questions", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    const allQuestions = await db.query.questions.findMany({
      where: eq(questions.status, 'ACTIVE'),
      orderBy: (questions) => [questions.createdAt],
    });

    res.json(allQuestions);
  } catch (error) {
    logger.error({ err: error }, "Error fetching questions");
    res.status(500).send("Error fetching questions");
  }
});

// Create a new question
router.post("/api/questions", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    const { question, answerType, options } = req.body;

    const [newQuestion] = await db.insert(questions)
      .values({
        question,
        answerType,
        options,
        createdBy: req.user.id,
      })
      .returning();

    res.json(newQuestion);
  } catch (error) {
    logger.error({ err: error }, "Error creating question");
    res.status(500).send("Error creating question");
  }
});

// Update a question
router.put("/api/questions/:id", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    const id = parseInt(req.params.id);
    const { question, answerType, options } = req.body;

    const [updatedQuestion] = await db.update(questions)
      .set({
        question,
        answerType,
        options,
      })
      .where(eq(questions.id, id))
      .returning();

    if (!updatedQuestion) {
      return res.status(404).send("Question not found");
    }

    res.json(updatedQuestion);
  } catch (error) {
    logger.error({ err: error }, "Error updating question");
    res.status(500).send("Error updating question");
  }
});

// Delete a question (soft delete - update status to DELETED)
router.delete("/api/questions/:id", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    const id = parseInt(req.params.id);

    const [deletedQuestion] = await db.update(questions)
      .set({
        status: 'DELETED',
      })
      .where(eq(questions.id, id))
      .returning();

    if (!deletedQuestion) {
      return res.status(404).send("Question not found");
    }

    res.json({ message: "Question deleted successfully" });
  } catch (error) {
    logger.error({ err: error }, "Error deleting question");
    res.status(500).send("Error deleting question");
  }
});

export function registerQuestionRoutes(app: Router) {
  app.use(router);
}
