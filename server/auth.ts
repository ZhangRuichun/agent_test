import passport from "passport";
import { IVerifyOptions, Strategy as LocalStrategy } from "passport-local";
import { type Express } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { users, type SelectUser, insertUserSchema } from "@db/schema";
import { db } from "@db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";
import { z } from "zod";

const scryptAsync = promisify(scrypt);

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const loginSchema = z.object({
  username: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const crypto = {
  hash: async (password: string) => {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
  },
  compare: async (suppliedPassword: string, storedPassword: string) => {
    const [hashedPassword, salt] = storedPassword.split(".");
    const hashedPasswordBuf = Buffer.from(hashedPassword, "hex");
    const suppliedPasswordBuf = (await scryptAsync(
      suppliedPassword,
      salt,
      64
    )) as Buffer;
    return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
  },
};

export function setupAuth(app: Express) {
  const MemoryStore = createMemoryStore(session);
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || process.env.REPL_ID || "development-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      secure: app.get("env") === "production",
      sameSite: "lax",
      httpOnly: true,
      path: "/"
    },
    store: new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    }),
  };

  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
    sessionSettings.cookie!.secure = true;
  }

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.username, username))
          .limit(1);

        if (!user) {
          logger.warn({ username }, "Login attempt with non-existent username");
          return done(null, false, { message: "Invalid credentials." });
        }

        const isMatch = await crypto.compare(password, user.password);
        if (!isMatch) {
          logger.warn({ username }, "Failed login attempt - incorrect password");
          return done(null, false, { message: "Invalid credentials." });
        }

        logger.info({ username }, "Successful login");
        return done(null, user);
      } catch (err) {
        logger.error({ err, username }, "Error during login");
        return done(err);
      }
    })
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      if (!user) {
        return done(null, false);
      }

      done(null, user);
    } catch (err) {
      logger.error({ err, userId: id }, "Error deserializing user");
      done(err);
    }
  });

  app.post("/api/register", async (req, res) => {
    try {
      const result = insertUserSchema.safeParse(req.body);
      if (!result.success) {
        const errorMessage = result.error.issues.map(i => i.message).join(", ");
        logger.warn({ validation: result.error.issues }, "Invalid registration input");
        return res.status(400).send(errorMessage);
      }

      const { username, password } = result.data;

      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (existingUser) {
        logger.warn({ username }, "Registration attempt with existing username");
        return res.status(400).send("Email already exists");
      }

      const hashedPassword = await crypto.hash(password);

      const [newUser] = await db
        .insert(users)
        .values({
          username,
          password: hashedPassword,
          status: "ACTIVE",
        })
        .returning();

      logger.info({ username: newUser.username }, "New user registered");

      req.login(newUser, (err) => {
        if (err) {
          logger.error({ err, username }, "Error logging in after registration");
          return res.status(500).send("Error during login after registration");
        }
        return res.json({
          message: "Registration successful",
          user: { id: newUser.id, username: newUser.username },
        });
      });
    } catch (error) {
      logger.error({ err: error }, "Error during registration");
      res.status(500).send("Registration failed");
    }
  });

  app.post("/api/login", (req, res, next) => {
    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
      const errorMessage = result.error.issues.map(i => i.message).join(", ");
      logger.warn({ validation: result.error.issues }, "Invalid login input");
      return res.status(400).send(errorMessage);
    }

    passport.authenticate("local", (err: any, user: Express.User | false, info?: IVerifyOptions) => {
      if (err) {
        logger.error({ err }, "Error during login");
        return next(err);
      }

      if (!user) {
        return res.status(401).send(info?.message ?? "Login failed");
      }

      req.logIn(user, (err) => {
        if (err) {
          logger.error({ err, userId: user.id }, "Error during login session creation");
          return next(err);
        }

        logger.info({ username: user.username }, "User logged in successfully");
        return res.json({
          message: "Login successful",
          user: { id: user.id, username: user.username },
        });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res) => {
    const username = req.user?.username;
    req.logout((err) => {
      if (err) {
        logger.error({ err, username }, "Error during logout");
        return res.status(500).send("Logout failed");
      }

      logger.info({ username }, "User logged out successfully");
      res.json({ message: "Logout successful" });
    });
  });

  app.get("/api/user", (req, res) => {
    if (req.isAuthenticated()) {
      const { password, ...userWithoutPassword } = req.user;
      return res.json(userWithoutPassword);
    }
    res.status(401).send("Not logged in");
  });
}