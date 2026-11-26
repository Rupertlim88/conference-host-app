// Facts about each host app, and the parser for look.mts. `node lib.mjs <society> <field>`
// prints one field, so the shell scripts read the same facts.
import { fileURLToPath } from "node:url";

const APPS = {
  ams: { dir: "ui/apps/ams", port: 3001, name: "Isobar Meetings 2027", conference: "ams-2027", schema: "ams2027", sampleTalk: "493803" },
};

export function appFor(society) {
  const app = APPS[society];
  if (!app) throw new Error(`society must be ams, not ${JSON.stringify(society)}`);
  return { society, ...app };
}

/** Splits "left=right" at the first "=". */
function pair(option, value, left, right) {
  const at = value?.indexOf("=") ?? -1;
  if (at < 1) throw new Error(`${option} takes ${left}=${right}, not ${JSON.stringify(value)}`);
  return [value.slice(0, at), value.slice(at + 1)];
}

const USAGE = "usage: look.mts ams <route> <name> [--computer] [--signed-out] [--click role=name] [--fill label=text] [--press key] [--expect role=name]";

export function parseLook(argv) {
  const [society, route, name, ...rest] = argv;
  if (name === undefined) throw new Error(USAGE);
  const app = appFor(society);
  if (!route.startsWith("/")) throw new Error(`route must start with /, not ${JSON.stringify(route)}`);
  if (!/^[a-z0-9-]+$/.test(name)) throw new Error(`name must be lowercase letters, digits and dashes, not ${JSON.stringify(name)}`);

  let device = "phone";
  let signedIn = true;
  const steps = [];
  for (let i = 0; i < rest.length; i++) {
    const option = rest[i];
    if (option === "--computer") device = "computer";
    else if (option === "--signed-out") signedIn = false;
    else if (option === "--click" || option === "--expect") {
      const [role, label] = pair(option, rest[++i], "role", "name");
      steps.push({ [option.slice(2)]: { role, name: label } });
    } else if (option === "--fill") {
      const [label, text] = pair(option, rest[++i], "label", "text");
      steps.push({ fill: { label, text } });
    } else if (option === "--press") {
      const key = rest[++i];
      if (!key) throw new Error("--press takes a key name, such as Escape");
      steps.push({ press: key });
    } else throw new Error(`unknown option ${option}\n${USAGE}`);
  }
  return { app, route, name, device, signedIn, steps };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [society, field] = process.argv.slice(2);
  const value = appFor(society)[field];
  if (value === undefined) throw new Error(`no field ${JSON.stringify(field)}`);
  console.log(value);
}
