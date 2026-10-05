import { generateDJSet, TrackNotFoundError } from "@/lib/djAgent";
import { OllamaConnectionError } from "@/lib/ollama";

const TRACK_NOT_FOUND = "Track not found in library.";
const AGENT_UNAVAILABLE = "Could not connect to local DJ agent.";
const GENERATION_FAILED = "Something went wrong while generating the set.";

function isConnectionError(error: unknown): boolean {
  return (
    error instanceof OllamaConnectionError ||
    (error instanceof Error && error.name === "OllamaConnectionError")
  );
}

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
    return Response.json({ error: "Enter a current track." }, { status: 400 });
  }

  if (typeof direction !== "string" || !direction.trim()) {
    return Response.json({ error: "Enter a musical direction." }, { status: 400 });
  }

  if (typeof setLength !== "number" || !Number.isInteger(setLength) || setLength < 1) {
    return Response.json({ error: "Set length must be a positive number." }, { status: 400 });
  }

  try {
    const set = await generateDJSet(currentTrack, direction, setLength);
    return Response.json(set);
  } catch (error) {
    if (error instanceof TrackNotFoundError) {
      return Response.json({ error: TRACK_NOT_FOUND }, { status: 404 });
    }
    if (isConnectionError(error)) {
      return Response.json({ error: AGENT_UNAVAILABLE }, { status: 503 });
    }
    console.error("Set generation failed.", error);
    return Response.json({ error: GENERATION_FAILED }, { status: 500 });
  }
}
