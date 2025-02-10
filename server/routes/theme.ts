import { Router } from "express";
import { db } from "@db";
import { themes, type InsertTheme } from "@db/schema";
import { eq } from "drizzle-orm";
import puppeteer from "puppeteer";
import path from "path";
import fs from "fs/promises";
import express from 'express';
import { logger } from "../logger";
import { analyzeWebsiteColors } from "../utils/theme-utils";

const router = Router();

// Theme routes
router.get('/api/themes', async (_req, res) => {
  try {
    const allThemes = await db.query.themes.findMany({
      orderBy: (themes, { desc }) => [desc(themes.createdAt)],
    });
    res.json(allThemes);
  } catch (error) {
    logger.error('Error fetching themes:', error);
    res.status(500).json({ message: 'Failed to fetch themes' });
  }
});

router.post('/api/themes/generate', async (req, res) => {
  let browser;
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ message: 'URL is required' });
    }

    logger.info('Launching puppeteer with custom configuration...');
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-extensions',
      ],
      executablePath: '/nix/store/khk7xpgsm5insk81azy9d560yq4npf77-chromium-131.0.6778.204/bin/chromium',
      env: {
        ...process.env,
        CHROME_PATH: '/nix/store/khk7xpgsm5insk81azy9d560yq4npf77-chromium-131.0.6778.204/bin/chromium',
        LD_LIBRARY_PATH: '/nix/store/khk7xpgsm5insk81azy9d560yq4npf77-chromium-131.0.6778.204/lib:/nix/store/nspr/lib:/nix/store/nss/lib:/nix/store/gtk3/lib:/nix/store/glib/lib:/nix/store/pango/lib:/nix/store/cairo/lib:/nix/store/dbus/lib:/nix/store/expat/lib:/nix/store/fontconfig/lib',
        FONTCONFIG_PATH: '/nix/store/fontconfig/etc/fonts'
      }
    });

    logger.info('Browser launched successfully');
    const page = await browser.newPage();
    logger.info(`Navigating to ${url}...`);
    await page.goto(url, { waitUntil: 'networkidle0' });

    // Set a smaller viewport size to reduce image size
    await page.setViewport({ width: 800, height: 600, deviceScaleFactor: 1 });

    logger.info('Taking screenshot...');
    const uploadDir = path.join(process.cwd(), 'uploads');
    await fs.mkdir(uploadDir, { recursive: true });
    const screenshotPath = path.join(uploadDir, `screenshot-${Date.now()}.png`);
    await page.screenshot({
      path: screenshotPath,
      type: 'png',
      omitBackground: true,
    });
    logger.info('Screenshot saved to:', screenshotPath);

    logger.info('Analyzing colors with GPT-4o...');
    const { primary, variant } = await analyzeWebsiteColors(screenshotPath);
    logger.info('Color analysis complete:', { primary, variant });

    const newTheme: InsertTheme = {
      name: new URL(url).hostname,
      primary,
      variant,
      createdBy: req.user?.id ?? null,
    };

    const [theme] = await db.insert(themes).values(newTheme).returning();

    // Clean up the temporary screenshot
    await fs.unlink(screenshotPath).catch(console.error);

    res.json(theme);
  } catch (error) {
    logger.error('Error generating theme:', error);
    if (error instanceof Error) {
      logger.error('Error details:', error.message, error.stack);
    }
    res.status(500).json({
      message: 'Failed to generate theme',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    if (browser) {
      try {
        await browser.close();
        logger.info('Browser closed');
      } catch (closeError) {
        logger.error('Error closing browser:', closeError);
      }
    }
  }
});

router.post('/api/themes/apply', async (req, res) => {
  try {
    const { themeId } = req.body;
    if (!themeId) {
      return res.status(400).json({ message: 'Theme ID is required' });
    }

    const theme = await db.query.themes.findFirst({
      where: eq(themes.id, themeId),
    });

    if (!theme) {
      return res.status(404).json({ message: 'Theme not found' });
    }

    const themeConfig = {
      variant: theme.variant,
      primary: theme.primary,
      appearance: 'light' as const,
      radius: 0.5
    };

    await fs.writeFile(
      path.resolve(process.cwd(), 'theme.json'),
      JSON.stringify(themeConfig, null, 2)
    );

    res.json({
      message: 'Theme applied successfully',
      theme: themeConfig
    });
  } catch (error) {
    logger.error('Error applying theme:', error);
    res.status(500).json({
      message: 'Failed to apply theme',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export function registerThemeRoutes(app: Router) {
  app.use(router);
}