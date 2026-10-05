import type { Track } from "./types";

// Weighted mix of the four compatibility scores. Each score is 0-100.
const BPM_WEIGHT = 0.35;
const CAMELOT_WEIGHT = 0.3;
const ENERGY_WEIGHT = 0.2;
const GENRE_WEIGHT = 0.15;

// Pop sits next to dance pop, which opens into EDM, then house, then tech house.
const GENRE_SPECTRUM = ["2010s Pop", "Dance Pop", "EDM", "House", "Tech House"];

// One step along that spectrum is still mixable. Further steps fall off quickly.
const GENRE_DISTANCE_SCORES = [100, 80, 55, 30, 15];

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, score));
}

/**
 * BPM score. An exact tempo is 100. Each BPM of difference costs 5 points,
 * so a typical ±6 BPM mix is about 70 and a 20 BPM gap is 0.
 * Half-time and double-time (2x / 0.5x) are scored the same way, and the
 * best of the three relationships is kept.
 */
export function bpmCompatibility(trackA: Track, trackB: Track): number {
  const ratios = [1, 2, 0.5];
  let best = 0;

  for (const ratio of ratios) {
    const difference = Math.abs(trackA.bpm - trackB.bpm * ratio);
    const score = clampScore(100 - difference * 5);
    if (score > best) best = score;
  }

  return best;
}

function parseCamelot(camelotKey: string): { number: number; letter: "A" | "B" } | null {
  const match = camelotKey.trim().toUpperCase().match(/^(\d{1,2})([AB])$/);
  if (!match) return null;

  const number = Number(match[1]);
  const letter = match[2];
  if (number < 1 || number > 12 || (letter !== "A" && letter !== "B")) return null;

  return { number, letter };
}

// Shortest distance on the 12-key wheel, so 12 and 1 are neighbors.
function camelotSteps(from: number, to: number): number {
  const difference = Math.abs(from - to);
  return Math.min(difference, 12 - difference);
}

/**
 * Camelot score. The strong moves are:
 * - the same key (100)
 * - one step around the wheel, same letter, including 12 ↔ 1 (90)
 * - the relative major/minor, same number with A/B swapped (85)
 * Two steps or a letter change as well is only a partial match.
 */
export function camelotCompatibility(trackA: Track, trackB: Track): number {
  const keyA = parseCamelot(trackA.camelotKey);
  const keyB = parseCamelot(trackB.camelotKey);
  if (!keyA || !keyB) return 0;

  const steps = camelotSteps(keyA.number, keyB.number);
  const sameLetter = keyA.letter === keyB.letter;

  if (steps === 0 && sameLetter) return 100;
  if (steps === 1 && sameLetter) return 90;
  if (steps === 0 && !sameLetter) return 85;
  if (steps === 2 && sameLetter) return 50;
  if (steps === 1 && !sameLetter) return 40;
  if (steps === 2 && !sameLetter) return 25;
  if (steps === 3 && sameLetter) return 15;
  return 0;
}

/**
 * Energy score. Matching energy is 100. Each point of difference costs 20,
 * so a jump of 5 or more scores 0. Direction does not matter: a large rise
 * and a large drop are both poor transitions.
 */
export function energyCompatibility(trackA: Track, trackB: Track): number {
  const difference = Math.abs(trackA.energy - trackB.energy);
  return clampScore(100 - difference * 20);
}

function genreIndex(genre: string): number {
  const normalized = genre.trim().toLowerCase();
  return GENRE_SPECTRUM.findIndex((name) => name.toLowerCase() === normalized);
}

/**
 * Genre score. Identical genres are 100. Neighbors on
 * 2010s Pop → Dance Pop → EDM → House → Tech House score 80,
 * then 55, 30, and 15 as the styles get further apart.
 */
export function genreCompatibility(trackA: Track, trackB: Track): number {
  const indexA = genreIndex(trackA.genre);
  const indexB = genreIndex(trackB.genre);

  if (indexA === -1 || indexB === -1) {
    return trackA.genre.trim().toLowerCase() === trackB.genre.trim().toLowerCase() ? 100 : 20;
  }

  const distance = Math.abs(indexA - indexB);
  return GENRE_DISTANCE_SCORES[distance] ?? 0;
}

/** Weighted transition score: BPM 35%, Camelot 30%, energy 20%, genre 15%. */
export function scoreTransition(trackA: Track, trackB: Track): number {
  const score =
    bpmCompatibility(trackA, trackB) * BPM_WEIGHT +
    camelotCompatibility(trackA, trackB) * CAMELOT_WEIGHT +
    energyCompatibility(trackA, trackB) * ENERGY_WEIGHT +
    genreCompatibility(trackA, trackB) * GENRE_WEIGHT;

  return Math.round(score);
}

/**
 * Highest transition score first. Equal scores keep a stable order by id.
 * The input list is not mutated. The current track is not removed.
 */
export function rankTransitions(currentTrack: Track, candidates: Track[]): Track[] {
  return candidates
    .map((track) => ({ track, score: scoreTransition(currentTrack, track) }))
    .sort((a, b) => b.score - a.score || a.track.id.localeCompare(b.track.id))
    .map((entry) => entry.track);
}
