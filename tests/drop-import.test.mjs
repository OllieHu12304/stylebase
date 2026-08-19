import assert from "node:assert/strict";
import test from "node:test";

import {
  hasDraggedFiles,
  partitionImageFiles,
} from "../public/drop-import.js";

test("hasDraggedFiles distinguishes file drags from text drags", () => {
  assert.equal(hasDraggedFiles({ types: ["Files"] }), true);
  assert.equal(hasDraggedFiles({ types: ["text/plain"] }), false);
  assert.equal(hasDraggedFiles(null), false);
});

test("partitionImageFiles accepts only formats supported by Stylebase", () => {
  const jpeg = { name: "reference.jpg", type: "image/jpeg" };
  const webp = { name: "reference.webp", type: "image/webp" };
  const svg = { name: "reference.svg", type: "image/svg+xml" };
  const pdf = { name: "reference.pdf", type: "application/pdf" };

  const result = partitionImageFiles([jpeg, webp, svg, pdf]);

  assert.deepEqual(result.supported, [jpeg, webp]);
  assert.deepEqual(result.rejected, [svg, pdf]);
});
