export interface DJIntent {
  targetGenre: string;
  energyDirection: "increase" | "decrease" | "steady";
  transitionStyle: "gradual" | "sudden" | "steady";
  notes: string;
}

const OLLAMA_CHAT_URL = "http://127.0.0.1:11434/api/chat";
const OLLAMA_MODEL = "llama3.2";

const GENRES = ["2010s Pop", "Dance Pop", "EDM", "House", "Tech House"] as const;
const ENERGY_DIRECTIONS = ["increase", "decrease", "steady"] as const;
const TRANSITION_STYLES = ["gradual", "sudden", "steady"] as const;

export class OllamaConnectionError extends Error {
  constructor() {
    super("Could not connect to local DJ agent.");
    this.name = "OllamaConnectionError";
  }
}

const DEFAULT_INTENT: DJIntent = {
  targetGenre: "House",
  energyDirection: "steady",
  transitionStyle: "gradual",
  notes: "Stay close to the current style.",
};

const SYSTEM_PROMPT = `You interpret a DJ's musical direction.
Reply with JSON only. No markdown.

Use exactly this shape:
{
  "targetGenre": "2010s Pop" | "Dance Pop" | "EDM" | "House" | "Tech House",
  "energyDirection": "increase" | "decrease" | "steady",
  "transitionStyle": "gradual" | "sudden" | "steady",
  "notes": "one short sentence about the direction"
}

targetGenre is the final style the set should arrive at, not the style it starts in.
energyDirection is whether energy should rise, fall, or stay level.
transitionStyle is "gradual" for a slow blend, "sudden" for an immediate change, or "steady" for staying put.

Example direction: "Keep it nostalgic for two songs, then gradually transition into high-energy house."
Example JSON: {"targetGenre":"House","energyDirection":"increase","transitionStyle":"gradual","notes":"Stay near 2010s dance-pop initially before moving toward house."}

Do not invent tracks. Do not name songs or artists.
Do not calculate BPM, Camelot keys, or transition scores.`;

function defaultIntent(): DJIntent {
  return { ...DEFAULT_INTENT };
}

function matchAllowed<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return allowed.find((option) => option.toLowerCase() === normalized) ?? null;
}

function matchGenre(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  const exact = GENRES.find((genre) => genre.toLowerCase() === normalized);
  if (exact) return exact;

  // Prefer the longer name so "tech house" is not read as "house".
  return (
    [...GENRES]
      .sort((a, b) => b.length - a.length)
      .find((genre) => normalized.includes(genre.toLowerCase())) ?? null
  );
}

function parseIntent(content: string): DJIntent {
  const trimmed = content.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const parsed: unknown = JSON.parse(fenced?.[1] ?? trimmed);

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return defaultIntent();
  }

  const record = parsed as Record<string, unknown>;
  const notes = typeof record.notes === "string" ? record.notes.trim().slice(0, 280) : "";

  return {
    targetGenre: matchGenre(record.targetGenre) ?? DEFAULT_INTENT.targetGenre,
    energyDirection: matchAllowed(record.energyDirection, ENERGY_DIRECTIONS) ?? DEFAULT_INTENT.energyDirection,
    transitionStyle: matchAllowed(record.transitionStyle, TRANSITION_STYLES) ?? DEFAULT_INTENT.transitionStyle,
    notes: notes || DEFAULT_INTENT.notes,
  };
}

/**
 * Turns a natural-language DJ direction into a small intent object.
 * Ollama does not pick tracks or score transitions. Unreadable model
 * output falls back to a steady, gradual move toward House. If Ollama
 * itself cannot be reached, this throws OllamaConnectionError.
 */
export async function interpretDJIntent(direction: string): Promise<DJIntent> {
  const prompt = direction.trim();
  if (!prompt) return defaultIntent();

  let response: Response;
  try {
    response = await fetch(OLLAMA_CHAT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(60_000),
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        stream: false,
        format: "json",
        options: { temperature: 0 },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
      }),
    });
  } catch (error) {
    console.error("Ollama intent request failed.", error);
    throw new OllamaConnectionError();
  }

  if (!response.ok) {
    console.error(`Ollama request failed: ${response.status}`);
    throw new OllamaConnectionError();
  }

  try {
    const data = (await response.json()) as { message?: { content?: unknown } };
    const content = data.message?.content;
    if (typeof content !== "string") return defaultIntent();
    return parseIntent(content);
  } catch (error) {
    if (error instanceof OllamaConnectionError) throw error;
    console.error("Ollama intent could not be parsed.", error);
    return defaultIntent();
  }
}
