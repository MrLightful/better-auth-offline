import { betterAuth } from "better-auth";
import { createClient } from "@libsql/client";
import { LibsqlDialect } from "@libsql/kysely-libsql";

const client = createClient({ url: "file::memory:" });

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  database: {
    dialect: new LibsqlDialect({ client }),
    type: "sqlite",
  },
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 4,
  },
});

// Seed demo user on cold start
(async () => {
  try {
    const ctx = await auth.$context;
    await ctx.runMigrations();
    const hashedPassword = await ctx.password.hash("demo");
    const user = await ctx.internalAdapter.createUser({
      email: "demo@example.com",
      name: "Demo User",
      emailVerified: true,
    });
    await ctx.internalAdapter.createAccount({
      userId: user.id,
      providerId: "credential",
      accountId: user.id,
      password: hashedPassword,
    });
  } catch {
    // Already seeded (warm start) — ignore
  }
})();
