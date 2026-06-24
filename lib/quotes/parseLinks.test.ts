// Run with Node's built-in test runner (the repo ships no jest/vitest):
//   npx tsx --test lib/quotes/parseLinks.test.ts
// Uses node:test + node:assert so it type-checks under strict tsc via @types/node
// with no new dependency.
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseLinks } from "./parseLinks";

test("plain text only", () => {
  assert.deepEqual(parseLinks("Breakfast at hotel"), [
    { plain: true, text: "Breakfast at hotel" },
  ]);
});

test("single link mid-sentence", () => {
  assert.deepEqual(parseLinks("Visit [the Globe](https://x.com) tonight"), [
    { plain: true, text: "Visit " },
    { plain: false, text: "the Globe", url: "https://x.com" },
    { plain: true, text: " tonight" },
  ]);
});

test("two links", () => {
  assert.deepEqual(parseLinks("[A](https://a) and [B](https://b)"), [
    { plain: false, text: "A", url: "https://a" },
    { plain: true, text: " and " },
    { plain: false, text: "B", url: "https://b" },
  ]);
});

test("empty string", () => {
  assert.deepEqual(parseLinks(""), []);
});

test("link with empty url", () => {
  assert.deepEqual(parseLinks("[label]()"), [
    { plain: false, text: "label", url: "" },
  ]);
});
