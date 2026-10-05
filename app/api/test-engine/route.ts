import tracks from "@/data/tracks.json";
import {
  bpmCompatibility,
  camelotCompatibility,
  energyCompatibility,
  genreCompatibility,
  rankTransitions,
  scoreTransition,
} from "@/lib/djEngine";
import type { Track } from "@/lib/types";

const library = tracks as Track[];

export async function GET(request: Request) {
  const title = new URL(request.url).searchParams.get("track")?.trim() ?? "";

  if (!title) {
    return Response.json({ error: "Missing track query parameter." }, { status: 400 });
  }

  const currentTrack = library.find(
    (track) => track.title.toLowerCase() === title.toLowerCase(),
  );

  if (!currentTrack) {
    return Response.json({ error: `Track not found: ${title}` }, { status: 404 });
  }

  const candidates = library.filter((track) => track.id !== currentTrack.id);
  const ranked = rankTransitions(currentTrack, candidates);

  const recommendations = ranked.slice(0, 10).map((track) => ({
    ...track,
    transitionScore: scoreTransition(currentTrack, track),
    bpmScore: bpmCompatibility(currentTrack, track),
    keyScore: camelotCompatibility(currentTrack, track),
    energyScore: energyCompatibility(currentTrack, track),
    genreScore: genreCompatibility(currentTrack, track),
  }));

  return Response.json({ currentTrack, recommendations });
}
