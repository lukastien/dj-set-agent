import { generateDJSet, TrackNotFoundError } from "@/lib/djAgent";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { currentTrack, direction, setLength } = body as {
    currentTrack?: unknown;
    direction?: unknown;
    setLength?: unknown;
  };

  if (typeof currentTrack !== "string" || !currentTrack.trim()) {
    return Response.json({ error: "currentTrack is required." }, { status: 400 });
  }

  if (typeof direction !== "string" || !direction.trim()) {
    return Response.json({ error: "direction is required." }, { status: 400 });
  }

  if (typeof setLength !== "number" || !Number.isInteger(setLength) || setLength < 1) {
    return Response.json({ error: "setLength must be a positive integer." }, { status: 400 });
  }

  try {
    const set = await generateDJSet(currentTrack, direction, setLength);
    return Response.json(set);
  } catch (error) {
    if (error instanceof TrackNotFoundError) {
      return Response.json({ error: error.message }, { status: 404 });
    }
    throw error;
  }
}
