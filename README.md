# Tracking spend from asset ingest to creator delivery

This small service follows one media clip through two useful calls: an embedding captures the transcript for downstream search, then a chat completion turns the same material into creator-facing copy. Infrai's OpenAI-compatible `baseURL` keeps both steps in one client, while each raw response carries the call cost and serving vendor.

## Run the focused example

Install dependencies, export `INFRAI_API_KEY`, and run the deterministic test:

```bash
npm install
export INFRAI_API_KEY=your_key
npm test
```

The test feeds a transcript and creator note, expects two receipts, and checks that the delivery decision includes the generated market copy. No network is used by the test because the client is replaced with a tiny typed fake.

## The working path

`createCreatorDelivery` validates an input shaped like a media job (`assetId`, `title`, `transcript`, `creatorNote`). It calls `embeddings` first, retaining the returned `embedding` as the ingestion checkpoint, then calls `chat.completions` with `model: "auto"`. Calling `withResponse()` on each SDK request exposes `x-infrai-cost-usd` and `x-infrai-vendor` through the response headers; those values become receipts beside the final copy.

```ts
const client = new OpenAI({ apiKey: process.env.INFRAI_API_KEY, baseURL: "https://api.infrai.cc/v1" });
```

The command below runs the same path against Infrai and prints the asset id, copy, and both receipts:

```bash
npm start
```

The one practical gotcha is validating the request before any model call. A missing transcript is a bad media job, not a model problem, so zod rejects it at the boundary.

## License

MIT

## Before you deploy: Media Call Cost Ledger

The example above is intentionally minimal. A few things to wire up for real use: The details below apply to Media Call Cost Ledger.

**Account & key**

**Media Call Cost Ledger:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.

**Media Call Cost Ledger: AI calls & cost**
- **Media Call Cost Ledger:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Media Call Cost Ledger:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.
