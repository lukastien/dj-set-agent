import { interpretDJIntent } from "@/lib/ollama";

export async function GET(request: Request) {
  const direction = new URL(request.url).searchParams.get("direction")?.trim() ?? "";

  if (!direction) {
    return Response.json({ error: "Missing direction query parameter." }, { status: 400 });
  }

  const intent = await interpretDJIntent(direction);
  return Response.json(intent);
}
