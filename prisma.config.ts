import "dotenv/config";
import { defineConfig } from "prisma/config";

const dbUrl = process.env["DIRECT_URL"] || process.env["DATABASE_URL"]

export default defineConfig({
  schema: "prisma/schema.prisma",
  // Only pass datasource when a URL is available.
  // prisma generate does not need the URL — omitting it is safe in CI/build.
  ...(dbUrl ? { datasource: { url: dbUrl } } : {}),
});
