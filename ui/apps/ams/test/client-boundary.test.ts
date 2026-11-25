import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

// A file that starts with "use client" hands the server only references to its exports. Server code may render its
// components, with props the server can send, but may not call its functions or read its values.

type Files = Record<string, string>;

const isClient = (text: string) => /^\s*["']use client["']/.test(text);
const exportsOf = (text: string) =>
  [...text.matchAll(/^export (?:async )?function (\w+)|^export const (\w+)/gm)].map((m) => m[1] ?? m[2]!);

/** Every place server code uses a client file's export as anything but a component, or passes it a function. */
function problems(files: Files): string[] {
  const clientExports = new Map<string, string[]>();
  for (const [path, text] of Object.entries(files)) {
    if (path.startsWith("features/") && isClient(text)) {
      clientExports.set(`@/${path.replace(/\.tsx?$/, "")}`, exportsOf(text));
    }
  }
  const found: string[] = [];
  for (const [path, text] of Object.entries(files)) {
    if (isClient(text)) continue;
    for (const [module, names] of clientExports) {
      const imported = text.match(new RegExp(`import \\{([^}]*)\\} from "${module}"`));
      if (!imported) continue;
      const body = text.replace(imported[0], "");
      for (const name of imported[1]!.split(",").map((n) => n.trim().replace(/^type /, ""))) {
        if (!names.includes(name)) continue;
        const asJsx = new RegExp(`<${name}\\b`).test(body);
        if (new RegExp(`(?<![<\\w.])${name}\\b(?!\\s*[=:])`).test(body) && !asJsx) found.push(`${path} uses ${name}`);
        // The tag runs to the arrow's own ">", so the prop is looked for inside the tag, lazily.
        if (new RegExp(`<${name}\\b[^>]*?=\\{\\s*(\\([^)]*\\)|\\w+)\\s*=>`, "s").test(body)) {
          found.push(`${path} passes a function to ${name}`);
        }
      }
    }
  }
  return found;
}

function appFiles(): Files {
  const root = fileURLToPath(new URL("..", import.meta.url));
  const files: Files = {};
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.tsx?$/.test(name)) files[relative(root, full)] = readFileSync(full, "utf8");
    }
  };
  walk(join(root, "app"));
  walk(join(root, "features"));
  return files;
}

describe("the line between server and client code", () => {
  test("is never crossed in this app", () => {
    expect(problems(appFiles())).toEqual([]);
  });

  test("a server file calling a client file's function is caught", () => {
    const files = {
      "features/time.tsx": '"use client";\nexport function placeOf(room: string) { return room; }\n',
      "features/cards.tsx": 'import { placeOf } from "@/features/time";\nexport const Card = () => placeOf("403");\n',
    };
    expect(problems(files)).toEqual(["features/cards.tsx uses placeOf"]);
  });

  test("a server page passing a function to a client component is caught; rendering it with data is not", () => {
    const files = {
      "features/papers.tsx": '"use client";\nexport function PaperView() { return null; }\n',
      "app/page.tsx": 'import { PaperView } from "@/features/papers";\nexport default () => <PaperView move={(s) => s} />;\n',
      "app/other.tsx": 'import { PaperView } from "@/features/papers";\nexport default () => <PaperView talk={talk} />;\n',
    };
    expect(problems(files)).toEqual(["app/page.tsx passes a function to PaperView"]);
  });
});
