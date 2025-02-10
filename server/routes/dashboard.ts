import { Router } from "express";
import { db } from "@db";
import { shelves, products, users, responses } from "@db/schema";
import { count, desc, sql } from "drizzle-orm";

export function registerDashboardRoutes(router: Router) {
  // Get dashboard stats
  router.get("/api/dashboard/stats", async (_req, res) => {
    try {
      const [
        productsCount,
        shelvesCount,
        usersCount,
      ] = await Promise.all([
        db.select({ value: count() }).from(products),
        db.select({ value: count() }).from(shelves),
        db.select({ value: count() }).from(users),
      ]);

      // Get recent activity from responses and other tables
      const recentActivity = await db.select({
        type: sql<string>`'response'`,
        message: sql<string>`'New survey response received'`,
        timestamp: responses.createdAt,
      })
      .from(responses)
      .orderBy(desc(responses.createdAt))
      .limit(5);

      res.json({
        totalProducts: productsCount[0].value,
        totalShelves: shelvesCount[0].value,
        totalUsers: usersCount[0].value,
        recentActivity,
      });
    } catch (error: any) {
      console.error('Dashboard stats error:', error);
      res.status(500).json({
        message: "Failed to fetch dashboard statistics",
        error: error.message,
      });
    }
  });
}