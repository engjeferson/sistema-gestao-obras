import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // A CLI (migrate/introspect/studio) precisa da conexão DIRETA do Neon (sem pgbouncer).
    // Em runtime, o app usa a conexão pooled (DATABASE_URL) — ver src/lib/prisma.ts.
    url: process.env["DIRECT_URL"],
  },
});
