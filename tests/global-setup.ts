import { execSync } from "node:child_process";

/** Applies migrations to the test database. DB tests skip when it is unset. */
export default function setup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    console.warn("TEST_DATABASE_URL is not set: database tests will be skipped.");
    return;
  }
  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: url },
    stdio: "ignore",
  });
}
