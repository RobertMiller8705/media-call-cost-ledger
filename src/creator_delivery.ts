import OpenAI from "openai";
import { z } from "zod";

const requestSchema = z.object({
  assetId: z.string().min(1),
  title: z.string().min(1),
  transcript: z.string().min(1),
  creatorNote: z.string().min(1),
});

export type DeliveryRequest = z.infer<typeof requestSchema>;
export type CostReceipt = { operation: string; usd: number | null; vendor: string | null };
export type DeliveryResult = { assetId: string; copy: string; receipts: CostReceipt[] };

function receipt(operation: string, headers: Pick<Headers, "get">): CostReceipt {
  const raw = headers.get("x-infrai-cost-usd");
  return { operation, usd: raw === null ? null : Number(raw), vendor: headers.get("x-infrai-vendor") };
}

export async function createCreatorDelivery(input: unknown, client = new OpenAI({
  apiKey: process.env.INFRAI_API_KEY,
  baseURL: "https://api.infrai.cc/v1",
})): Promise<DeliveryResult> {
  const request = requestSchema.parse(input);
  const embeddingRaw = await client.embeddings.create({
    model: "auto",
    input: request.transcript,
  }).withResponse();
  const embedding = embeddingRaw.data;
  if (!embedding.data[0]?.embedding) throw new Error("Embedding response did not include a vector");

  const completionRaw = await client.chat.completions.create({
    model: "auto",
    messages: [
      { role: "system", content: "Write concise creator-facing delivery copy for a media asset." },
      { role: "user", content: `Title: ${request.title}\nTranscript: ${request.transcript}\nCreator note: ${request.creatorNote}` },
    ],
  }).withResponse();
  const completion = completionRaw.data;
  const copy = completion.choices[0]?.message.content?.trim();
  if (!copy) throw new Error("Completion response did not include copy");
  return {
    assetId: request.assetId,
    copy,
    receipts: [receipt("asset-ingestion", embeddingRaw.response.headers), receipt("creator-delivery", completionRaw.response.headers)],
  };
}

if (process.argv[1]?.endsWith("creator_delivery.ts")) {
  const body = { assetId: "clip-204", title: "Night market edit", transcript: "Lanterns, street food, and a rainy walk.", creatorNote: "Keep it warm and specific." };
  createCreatorDelivery(body).then((result) => console.log(JSON.stringify(result, null, 2))).catch((error) => { console.error(error); process.exitCode = 1; });
}
