import tracks from "@/data/tracks.json";
import {
  bpmCompatibility,
  camelotCompatibility,
  energyCompatibility,
  genreCompatibility,
  rankTransitions,
  scoreTransition,
} from "@/lib/djEngine";
import { interpretDJIntent, type DJIntent } from "@/lib/ollama";
import type { Track } from "@/lib/types";

const library = tracks as Track[];

// Same order as the engine's genre spectrum, used only to place the set along the arc.
const GENRE_SPECTRUM = ["2010s Pop", "Dance Pop", "EDM", "House", "Tech House"];

const SHORTLIST_SIZE = 8;

export class TrackNotFoundError extends Error {
  constructor(title: string) {
    super(`Track not found: ${title}`);
    this.name = "TrackNotFoundError";
  }
}

export interface SetTrack extends Track {
  transitionScore: number;
  bpmScore: number;
  keyScore: number;
  energyScore: number;
  genreScore: number;
  goalScore: number;
}

export interface DJSet {
  intent: DJIntent;
  startingTrack: Track;
  tracks: SetTrack[];
}

function genreIndex(genre: string): number {
  const index = GENRE_SPECTRUM.findIndex(
    (name) => name.toLowerCase() === genre.trim().toLowerCase(),
  );
  return index === -1 ? 0 : index;
}

/**
 * How far along the arc this slot should be.
 * Gradual walks there evenly. Sudden heads there immediately.
 * Steady mostly stays near the starting track.
 */
function shapedProgress(progress: number, style: DJIntent["transitionStyle"]): number {
  if (style === "sudden") return 1;
  if (style === "steady") return progress * 0.25;
  return progress;
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

/** High-energy requests aim at the top of the scale. A decrease aims at the bottom. */
function targetEndingEnergy(intent: DJIntent, startingEnergy: number): number {
  if (intent.energyDirection === "increase") return 10;
  if (intent.energyDirection === "decrease") return 1;
  return startingEnergy;
}

function genreGoalScore(
  candidate: Track,
  startingTrack: Track,
  currentTrack: Track,
  intent: DJIntent,
  shaped: number,
): number {
  const startGenre = genreIndex(startingTrack.genre);
  const targetGenre = genreIndex(intent.targetGenre);
  const idealGenreIndex = Math.round(startGenre + (targetGenre - startGenre) * shaped);
  const idealGenre =
    GENRE_SPECTRUM[Math.max(0, Math.min(GENRE_SPECTRUM.length - 1, idealGenreIndex))];

  // Distance uses the engine's genre scale. Stepping backward, away from the
  // target, is discounted so the arc does not reverse.
  let genreFit = genreCompatibility({ ...candidate, genre: idealGenre }, candidate);
  const direction = Math.sign(targetGenre - startGenre);
  const candidateGenre = genreIndex(candidate.genre);
  const behindTheStart = direction !== 0 && Math.sign(candidateGenre - startGenre) === -direction;
  const behindTheCurrent =
    direction !== 0 && Math.sign(candidateGenre - genreIndex(currentTrack.genre)) === -direction;
  if (behindTheStart || behindTheCurrent) genreFit = Math.round(genreFit * 0.5);

  return genreFit;
}

/**
 * How close this track is to the energy the set should have at this slot.
 * Closeness is the base score. Early jumps past the ramp, and drops while
 * energy is supposed to rise, are penalized but not forbidden.
 */
function energyGoalScore(
  candidateEnergy: number,
  currentEnergy: number,
  desiredEnergy: number,
  direction: DJIntent["energyDirection"],
  progress: number,
): number {
  const gap = candidateEnergy - desiredEnergy;
  let score = 100 - Math.abs(gap) * 28;

  const jump = candidateEnergy - currentEnergy;
  const excessJump = jump - Math.max(0, desiredEnergy - currentEnergy);
  if (excessJump > 1) {
    const earliness = 1 - progress;
    score -= (excessJump - 1) * 20 * (0.4 + earliness);
  }

  if (direction === "increase" && jump <= -1) {
    const drop = -jump;
    score -= drop >= 2 ? drop * 22 : 10;
  }
  if (direction === "decrease" && jump >= 1) {
    const rise = jump;
    score -= rise >= 2 ? rise * 22 : 10;
  }

  return clampScore(score);
}

function findTrack(title: string): Track {
  const normalized = title.trim().toLowerCase();
  const track = library.find((item) => item.title.toLowerCase() === normalized);
  if (!track) throw new TrackNotFoundError(title.trim());
  return track;
}

/**
 * Builds a set that follows the starting track.
 * `setLength` is the number of songs chosen after the starting track.
 * Ollama only interprets the direction. Every pick is a deterministic re-rank
 * of the engine's best transitions.
 */
export async function generateDJSet(
  currentTrackTitle: string,
  direction: string,
  setLength: number,
): Promise<DJSet> {
  if (!Number.isInteger(setLength) || setLength < 1) {
    throw new Error("setLength must be a positive integer.");
  }

  const intent = await interpretDJIntent(direction);
  const startingTrack = findTrack(currentTrackTitle);

  let currentTrack = startingTrack;
  let unusedTracks = library.filter((track) => track.id !== startingTrack.id);
  const selectedTracks: SetTrack[] = [];
  const picks = Math.min(setLength, unusedTracks.length);

  const endingEnergy = targetEndingEnergy(intent, startingTrack.energy);

  for (let position = 0; position < picks; position++) {
    // Genre still walks from the start of the set to the end.
    const genreProgress = shapedProgress(
      picks <= 1 ? 1 : position / (picks - 1),
      intent.transitionStyle,
    );
    // Energy uses the slot number, so the first song is already one step up
    // and the last song is at the target energy.
    const energyProgress = shapedProgress((position + 1) / picks, intent.transitionStyle);
    const desiredEnergy =
      startingTrack.energy + (endingEnergy - startingTrack.energy) * energyProgress;
    const shortlist = rankTransitions(currentTrack, unusedTracks).slice(0, SHORTLIST_SIZE);

    const ranked = shortlist
      .map((track) => {
        const transitionScore = scoreTransition(currentTrack, track);
        const genreGoal = genreGoalScore(track, startingTrack, currentTrack, intent, genreProgress);
        const energyGoal = energyGoalScore(
          track.energy,
          currentTrack.energy,
          desiredEnergy,
          intent.energyDirection,
          energyProgress,
        );
        // Transition quality, the energy due at this slot, and genre progress.
        // Energy stays a steady share so it matters without overriding a much better mix.
        const genreWeight = 0.15 + 0.2 * genreProgress;
        const energyWeight = 0.3;
        const transitionWeight = 1 - genreWeight - energyWeight;
        const adjustedScore =
          transitionScore * transitionWeight + energyGoal * energyWeight + genreGoal * genreWeight;
        const goalScore = Math.round(genreGoal * 0.5 + energyGoal * 0.5);

        const choice: SetTrack = {
          ...track,
          transitionScore,
          bpmScore: bpmCompatibility(currentTrack, track),
          keyScore: camelotCompatibility(currentTrack, track),
          energyScore: energyCompatibility(currentTrack, track),
          genreScore: genreCompatibility(currentTrack, track),
          goalScore,
        };

        return { choice, adjustedScore };
      })
      .sort(
        (a, b) =>
          b.adjustedScore - a.adjustedScore ||
          b.choice.goalScore - a.choice.goalScore ||
          a.choice.id.localeCompare(b.choice.id),
      );

    const nextTrack = ranked[0]?.choice;
    if (!nextTrack) break;

    selectedTracks.push(nextTrack);
    unusedTracks = unusedTracks.filter((track) => track.id !== nextTrack.id);
    currentTrack = nextTrack;
  }

  return { intent, startingTrack, tracks: selectedTracks };
}
