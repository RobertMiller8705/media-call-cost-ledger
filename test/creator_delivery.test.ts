import assert from "node:assert/strict";
import { createCreatorDelivery } from "../src/creator_delivery.js";

const headers = new Headers({ "x-infrai-cost-usd": "0.004", "x-infrai-vendor": "example-vendor" });
const fakeClient = {
  embeddings: { create: () => ({ withResponse: async () => ({ response: { headers }, data: { data: [{ embedding: [0.1, 0.2] }] } }) }) },
  chat: { completions: { create: () => ({ withResponse: async () => ({ response: { headers }, data: { choices: [{ message: { content: "A rainy market walk, ready for your audience." } }] } }) }) } },
} as any;

const result = await createCreatorDelivery({ assetId: "clip-1", title: "Market", transcript: "Rain and lanterns", creatorNote: "Warm tone" }, fakeClient);
assert.equal(result.assetId, "clip-1");
assert.equal(result.receipts.length, 2);
assert.equal(result.receipts[1].usd, 0.004);
assert.match(result.copy, /rainy market/i);
await assert.rejects(() => createCreatorDelivery({ assetId: "", title: "Market", transcript: "x", creatorNote: "y" }, fakeClient));
console.log("creator delivery test passed");
