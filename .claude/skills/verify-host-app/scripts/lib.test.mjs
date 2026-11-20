import assert from "node:assert/strict";
import { test } from "node:test";

import { appFor, parseLook } from "./lib.mjs";

test("each society has its app's folder, port, name and conference id", () => {
  assert.deepEqual(appFor("ams"), {
    society: "ams",
    dir: "ui/apps/ams",
    port: 3001,
    name: "Isobar Meetings 2027",
    conference: "ams-2027",
    schema: "ams2027",
    sampleTalk: "487641",
  });
  assert.equal(appFor("gsa").port, 3002);
  assert.equal(appFor("gsa").name, "Strata Guide");
  assert.equal(appFor("gsa").sampleTalk, "16121");
});

test("an unknown society is refused", () => {
  assert.throws(() => appFor("agu"), /society must be ams or gsa/);
});

test("a look names the society, the route and the evidence name, on a phone by default", () => {
  assert.deepEqual(parseLook(["ams", "/talks/493803", "talk"]), {
    app: appFor("ams"),
    route: "/talks/493803",
    name: "talk",
    device: "phone",
    signedIn: true,
    steps: [],
  });
  assert.equal(parseLook(["gsa", "/", "home", "--computer"]).device, "computer");
  assert.equal(parseLook(["gsa", "/talks/16121", "gate", "--signed-out"]).signedIn, false);
});

test("steps run in the order given", () => {
  const look = parseLook([
    "gsa", "/talks/16121", "note",
    "--fill", "My note=Ask about the emulators.",
    "--click", "button=Save note",
    "--press", "Escape",
  ]);
  assert.deepEqual(look.steps, [
    { fill: { label: "My note", text: "Ask about the emulators." } },
    { click: { role: "button", name: "Save note" } },
    { press: "Escape" },
  ]);
});

test("an expect step waits for a named element, so a look can fail", () => {
  assert.deepEqual(parseLook(["ams", "/talks/493803", "star", "--click", "button=Add to My Schedule", "--expect", "button=Remove from My Schedule"]).steps, [
    { click: { role: "button", name: "Add to My Schedule" } },
    { expect: { role: "button", name: "Remove from My Schedule" } },
  ]);
});

test("a click splits at the first equals sign, so names may hold one", () => {
  assert.deepEqual(parseLook(["ams", "/", "x", "--click", "link=a=b"]).steps, [{ click: { role: "link", name: "a=b" } }]);
});

test("bad looks are refused with the reason", () => {
  assert.throws(() => parseLook(["ams"]), /usage/);
  assert.throws(() => parseLook(["ams", "talks", "x"]), /route must start with \//);
  assert.throws(() => parseLook(["ams", "/", "Bad Name"]), /name must be lowercase/);
  assert.throws(() => parseLook(["ams", "/", "x", "--click", "Save"]), /--click takes role=name/);
  assert.throws(() => parseLook(["ams", "/", "x", "--wobble"]), /unknown option --wobble/);
});
