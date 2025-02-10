import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic } from "./vite";
import { logger } from "./logger";
import pinoHttp from "pino-http";
import path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { setupAuth } from "./auth";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Increase JSON payload limit to 10MB to handle base64 encoded images
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Configure pino-http middleware with our custom logger
app.use(pinoHttp({
  logger,
  autoLogging: false, // Disable auto-logging since we have custom logging
}));

// Custom request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      const metadata = {
        path,
        method: req.method,
        statusCode: res.statusCode,
        duration,
        ip: req.ip,
      };
      logger.info(
        metadata,
        `${req.method} ${path} ${res.statusCode} in ${duration}ms`
      );
    }
  });

  next();
});

// Set up authentication before routes
setupAuth(app);

(async () => {
  const server = registerRoutes(app);

  // Serve theme.json statically
  app.use('/theme.json', express.static(path.join(__dirname, 'theme.json')));

  // Global error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    logger.error({ 
      err,
      status,
      stack: err.stack
    }, message);

    // Always send error responses as JSON
    res.status(status).json({ 
      error: message,
      ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
    });
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const PORT = 5000;
  server.listen(PORT, "0.0.0.0", () => {
    logger.info({ port: PORT }, `Server running on port ${PORT}`);
  });
})();