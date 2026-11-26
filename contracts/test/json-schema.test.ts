import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { z } from "zod";

import { TESTER_FORMS } from "../src/tester";

const folder = join(import.meta.dirname, "..", "src", "json-schema");

describe("the tester's forms published as JSON Schema", () => {
  test("covers the map, the test set, its reply and the report", () => {
    expect(Object.keys(TESTER_FORMS).sort()).toEqual(["programme-map", "recommendations", "test-set", "test-set-reply"]);
  });

  test.each(Object.entries(TESTER_FORMS))("%s.json is exactly what its form gives", (name, form) => {
    const published = JSON.parse(readFileSync(join(folder, `${name}.json`), "utf8"));
    expect(published).toEqual(z.toJSONSchema(form));
  });
});
