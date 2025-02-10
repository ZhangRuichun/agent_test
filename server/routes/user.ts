import { type Router } from "express";
import { db } from "@db";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";
import { randomBytes } from "crypto";
import { logger } from "../logger";
import { hashPassword } from "../utils/auth";

export function registerUserRoutes(router: Router) {
  // Get all users
  router.get("/api/users", async (_req, res) => {
    try {
      const allUsers = await db.select().from(users);
      res.json(allUsers);
    } catch (error) {
      logger.error({ err: error }, "Error fetching users");
      res.status(500).send("Error fetching users");
    }
  });

  // Create new user
  router.post("/api/users", async (req, res) => {
    try {
      const { username, firstName, lastName } = req.body;

      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (existingUser) {
        return res.status(400).send("User already exists");
      }

      const passwordResetToken = randomBytes(32).toString("hex");

      const [newUser] = await db
        .insert(users)
        .values({
          username,
          firstName,
          lastName,
          password: "", // Will be set when user accepts invitation
          status: "PENDING",
          passwordResetToken,
        })
        .returning();

      logger.info({ userId: newUser.id }, "New user created");
      res.json({ ...newUser, passwordResetToken });
    } catch (error) {
      logger.error({ err: error }, "Error creating user");
      res.status(500).send("Error creating user");
    }
  });

  // Set password using reset token
  router.post("/api/set-password/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const { password } = req.body;

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.passwordResetToken, token))
        .limit(1);

      if (!user) {
        return res.status(404).send("Invalid or expired token");
      }

      const hashedPassword = await hashPassword(password);

      await db
        .update(users)
        .set({
          password: hashedPassword,
          passwordResetToken: null,
          status: "ACTIVE",
        })
        .where(eq(users.id, user.id));

      logger.info({ userId: user.id }, "Password set successfully");
      res.json({ message: "Password set successfully" });
    } catch (error) {
      logger.error({ err: error }, "Error setting password");
      res.status(500).send("Error setting password");
    }
  });

  // Suspend user
  router.post("/api/users/:id/suspend", async (req, res) => {
    try {
      const { id } = req.params;

      const [user] = await db
        .update(users)
        .set({ status: "SUSPENDED" })
        .where(eq(users.id, parseInt(id)))
        .returning();

      if (!user) {
        return res.status(404).send("User not found");
      }

      logger.info({ userId: id }, "User suspended");
      res.json(user);
    } catch (error) {
      logger.error({ err: error }, "Error suspending user");
      res.status(500).send("Error suspending user");
    }
  });

  // Generate new invite link
  router.post("/api/users/:id/invite", async (req, res) => {
    try {
      const { id } = req.params;
      const passwordResetToken = randomBytes(32).toString("hex");

      const [user] = await db
        .update(users)
        .set({ passwordResetToken })
        .where(eq(users.id, parseInt(id)))
        .returning();

      if (!user) {
        return res.status(404).send("User not found");
      }

      logger.info({ userId: id }, "New invite link generated");
      res.json({ passwordResetToken });
    } catch (error) {
      logger.error({ err: error }, "Error generating invite link");
      res.status(500).send("Error generating invite link");
    }
  });
}