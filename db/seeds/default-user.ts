
import { db } from "@db";
import { users } from "@db/schema";
import { log } from "../../server/vite";
import { hashPassword } from "../../server/utils/auth";

async function seed() {
  try {
    const defaultUser = {
      username: "admin@example.com",
      password: await hashPassword("888888"),
      status: "ACTIVE" as const,
      firstName: "Admin",
      lastName: "User"
    };

    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.username, defaultUser.username)
    });

    if (existingUser) {
      log("Default user already exists, skipping creation");
      return;
    }

    // Create default user
    const result = await db.insert(users).values(defaultUser);
    log("Successfully created default user");
    
    return result;
  } catch (error) {
    log("Error seeding default user:");
    console.error(error);
    process.exit(1);
  }
}

// Run the seed
seed().then(() => {
  log("Seeding complete");
  process.exit(0);
});
