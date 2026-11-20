import { defineConfig } from "vitest/config";

// The database tests share one Postgres, so files run one at a time.
export default defineConfig({ test: { fileParallelism: false } });
