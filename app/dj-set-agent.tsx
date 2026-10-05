"use client";

import { FormEvent, useState } from "react";
import type { DJSet, SetTrack } from "@/lib/djAgent";
import type { DJIntent } from "@/lib/ollama";
import type { Track } from "@/lib/types";

const SET_LENGTHS = [5, 8, 10, 15] as const;

type SetLength = (typeof SET_LENGTHS)[number];

type DisplayTrack = Track & {
  incoming: Pick<
    SetTrack,
    "transitionScore" | "bpmScore" | "keyScore" | "energyScore" | "genreScore"
  > | null;
};

const DEFAULT_TRACK = "Beauty and a Beat - Justin Bieber";
const DEFAULT_DIRECTION = "Transition from 2010s pop into high-energy house";

function trackTitle(value: string): string {
  const trimmed = value.trim();
  const parts = trimmed.split(/\s+(?:-|–|—)\s+/);
  if (parts.length >= 2 && parts[0]) return parts[0].trim();
  return trimmed;
}

function label(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function isTrack(value: unknown): value is Track {
  if (!value || typeof value !== "object") return false;
  const track = value as Track;
  return (
    typeof track.id === "string" &&
    typeof track.title === "string" &&
    typeof track.artist === "string" &&
    typeof track.bpm === "number" &&
    typeof track.camelotKey === "string" &&
    typeof track.energy === "number" &&
    typeof track.genre === "string"
  );
}

function isSetTrack(value: unknown): value is SetTrack {
  if (!isTrack(value)) return false;
  const track = value as SetTrack;
  return (
    typeof track.transitionScore === "number" &&
    typeof track.bpmScore === "number" &&
    typeof track.keyScore === "number" &&
    typeof track.energyScore === "number" &&
    typeof track.genreScore === "number" &&
    typeof track.goalScore === "number"
  );
}

function isIntent(value: unknown): value is DJIntent {
  if (!value || typeof value !== "object") return false;
  const intent = value as DJIntent;
  return (
    typeof intent.targetGenre === "string" &&
    (intent.energyDirection === "increase" ||
      intent.energyDirection === "decrease" ||
      intent.energyDirection === "steady") &&
    (intent.transitionStyle === "gradual" ||
      intent.transitionStyle === "sudden" ||
      intent.transitionStyle === "steady") &&
    typeof intent.notes === "string"
  );
}

function isDJSet(value: unknown): value is DJSet {
  if (!value || typeof value !== "object") return false;
  const set = value as DJSet;
  return isIntent(set.intent) && isTrack(set.startingTrack) && Array.isArray(set.tracks) && set.tracks.every(isSetTrack);
}

function errorMessage(value: unknown, fallback: string): string {
  if (!value || typeof value !== "object") return fallback;
  const error = (value as { error?: unknown }).error;
  return typeof error === "string" && error.trim() ? error : fallback;
}

function toDisplayTracks(set: DJSet): DisplayTrack[] {
  return [
    { ...set.startingTrack, incoming: null },
    ...set.tracks.map((track) => ({
      ...track,
      incoming: {
        transitionScore: track.transitionScore,
        bpmScore: track.bpmScore,
        keyScore: track.keyScore,
        energyScore: track.energyScore,
        genreScore: track.genreScore,
      },
    })),
  ];
}

function EnergyMeter({ value }: { value: number }) {
  return (
    <div className="flex shrink-0 flex-col items-end gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">
        Energy {value}
      </span>
      <div className="flex gap-[3px]" aria-hidden="true">
        {Array.from({ length: 10 }, (_, index) => (
          <span
            key={index}
            className={`h-2.5 w-[3px] rounded-[1px] ${
              index < value ? "bg-amber-400" : "bg-white/10"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function Stat({ label: name, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-500">{name}</dt>
      <dd className="mt-1 truncate font-mono text-sm tabular-nums text-zinc-100">{value}</dd>
    </div>
  );
}

function TransitionLink({
  scores,
}: {
  scores: NonNullable<DisplayTrack["incoming"]>;
}) {
  return (
    <div className="flex flex-col items-center px-1 py-1 sm:px-6">
      <span className="h-3 w-px bg-white/20" aria-hidden="true" />
      <span className="text-sm leading-none text-zinc-500" aria-hidden="true">
        ↓
      </span>
      <div className="my-2 w-full max-w-md rounded-lg border border-dashed border-white/15 bg-black/40 px-3 py-3 text-center sm:px-4">
        <p className="font-mono text-xs tracking-wide text-zinc-100 sm:text-sm">
          Transition Score: {scores.transitionScore}/100
        </p>
        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-left min-[36rem]:grid-cols-4">
          <Stat label="BPM score" value={scores.bpmScore} />
          <Stat label="Key score" value={scores.keyScore} />
          <Stat label="Energy score" value={scores.energyScore} />
          <Stat label="Genre score" value={scores.genreScore} />
        </dl>
      </div>
      <span className="text-sm leading-none text-zinc-500" aria-hidden="true">
        ↓
      </span>
      <span className="h-3 w-px bg-white/20" aria-hidden="true" />
    </div>
  );
}

function TrackCard({ track, index }: { track: DisplayTrack; index: number }) {
  return (
    <article className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-4 sm:px-5">
      <div className="flex items-start gap-3 sm:gap-4">
        <span className="w-7 pt-0.5 font-mono text-xs tabular-nums text-zinc-500">
          {String(index + 1).padStart(2, "0")}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-[15px] font-medium text-white">{track.title}</h3>
              <p className="truncate text-sm text-zinc-400">{track.artist}</p>
            </div>
            <EnergyMeter value={track.energy} />
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-3 border-t border-white/[0.06] pt-3 min-[36rem]:grid-cols-4">
            <Stat label="BPM" value={track.bpm} />
            <Stat label="Camelot Key" value={track.camelotKey} />
            <Stat label="Energy" value={track.energy} />
            <Stat label="Genre" value={track.genre} />
          </dl>
        </div>
      </div>
    </article>
  );
}

function GoalPanel({ intent }: { intent: DJIntent }) {
  const goals = [
    ["Target Genre", intent.targetGenre],
    ["Energy Direction", label(intent.energyDirection)],
    ["Transition Style", label(intent.transitionStyle)],
  ] as const;

  return (
    <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 sm:px-5">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
        Interpreted direction
      </p>
      <dl className="mt-3 grid grid-cols-1 gap-3 min-[36rem]:grid-cols-3 min-[36rem]:gap-4">
        {goals.map(([name, value]) => (
          <div key={name} className="flex items-baseline justify-between gap-3 min-[36rem]:block">
            <dt className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-500">{name}</dt>
            <dd className="text-sm font-medium text-white sm:mt-1">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function LoadingSet() {
  return (
    <div role="status" className="mt-4">
      <div className="h-0.5 overflow-hidden rounded-full bg-white/10">
        <div className="loading-bar h-full w-1/3 rounded-full bg-amber-400/80" />
      </div>
      <p className="mt-3 text-sm text-zinc-300">Building your set...</p>
      <p className="mt-1 text-sm text-zinc-500">
        Reading your direction locally. This usually takes a few seconds.
      </p>
      <div className="mt-5 animate-pulse" aria-hidden="true">
        <div className="h-28 rounded-xl border border-white/10 bg-white/[0.03]" />
        <div className="flex flex-col items-center py-3">
          <div className="h-3 w-px bg-white/15" />
          <div className="my-2 h-16 w-full max-w-md rounded-lg border border-dashed border-white/10 bg-white/[0.03]" />
          <div className="h-3 w-px bg-white/15" />
        </div>
        <div className="h-28 rounded-xl border border-white/10 bg-white/[0.03]" />
      </div>
    </div>
  );
}

export function DjSetAgent() {
  const [currentTrack, setCurrentTrack] = useState(DEFAULT_TRACK);
  const [direction, setDirection] = useState(DEFAULT_DIRECTION);
  const [setLength, setSetLength] = useState<SetLength>(8);
  const [result, setResult] = useState<DJSet | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentTrack: trackTitle(currentTrack),
          direction: direction.trim(),
          setLength,
        }),
      });

      const payload: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        setError(errorMessage(payload, "Something went wrong while generating the set."));
        return;
      }

      if (!isDJSet(payload)) {
        setError("Something went wrong while generating the set.");
        return;
      }

      setResult(payload);
      setRevision((value) => value + 1);
    } catch {
      setError("Something went wrong while generating the set.");
    } finally {
      setLoading(false);
    }
  }

  const tracks = result ? toDisplayTracks(result) : [];

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-white/10">
        <div className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-6 sm:py-10">
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            DJ Set Agent
          </h1>
          <p className="mt-2 text-sm text-zinc-400 sm:text-base">
            AI-powered track sequencing for your next set
          </p>
          <p className="mt-4 inline-flex rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-zinc-400">
            Powered locally by Llama 3.2
          </p>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-5 py-8 sm:px-6 sm:py-10">
        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="current-track"
              className="mb-2 block text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500"
            >
              Current Track
            </label>
            <input
              id="current-track"
              name="currentTrack"
              value={currentTrack}
              onChange={(event) => setCurrentTrack(event.target.value)}
              placeholder="Beauty and a Beat - Justin Bieber"
              autoComplete="off"
              disabled={loading}
              className="h-11 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3.5 text-sm text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-white/30 disabled:opacity-60"
            />
          </div>

          <div>
            <label
              htmlFor="direction"
              className="mb-2 block text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500"
            >
              Musical Direction
            </label>
            <textarea
              id="direction"
              name="direction"
              value={direction}
              onChange={(event) => setDirection(event.target.value)}
              placeholder="Transition from 2010s pop into high-energy house"
              rows={2}
              disabled={loading}
              className="w-full resize-none rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-white/30 disabled:opacity-60"
            />
          </div>

          <fieldset disabled={loading}>
            <legend className="mb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
              Set Length
            </legend>
            <div
              role="radiogroup"
              aria-label="Set length"
              className="grid grid-cols-4 divide-x divide-white/10 overflow-hidden rounded-lg border border-white/10"
            >
              {SET_LENGTHS.map((length) => {
                const selected = setLength === length;
                return (
                  <button
                    key={length}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setSetLength(length)}
                    className={`h-12 text-sm font-medium tabular-nums transition-colors disabled:opacity-60 ${
                      selected
                        ? "bg-white text-zinc-950"
                        : "bg-white/[0.03] text-zinc-400 hover:bg-white/[0.06] hover:text-white"
                    }`}
                  >
                    {length}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-white text-sm font-medium text-zinc-950 transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? (
              <>
                <span
                  className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-950"
                  aria-hidden="true"
                />
                Building your set...
              </>
            ) : (
              "Generate Set"
            )}
          </button>
        </form>

        {error ? (
          <p role="alert" className="mt-4 text-sm text-red-300">
            {error}
          </p>
        ) : null}

        <section aria-busy={loading} className="mt-10">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-sm font-medium text-zinc-200">Generated Set</h2>
            {tracks.length > 0 && !loading ? (
              <p className="shrink-0 font-mono text-xs tabular-nums text-zinc-500">
                {tracks.length} tracks
              </p>
            ) : null}
          </div>

          {loading ? (
            <LoadingSet />
          ) : result ? (
            <>
              <GoalPanel intent={result.intent} />
              <ol key={revision} className="set-in mt-4 flex flex-col">
                {tracks.map((track, index) => (
                  <li key={`${track.id}-${index}`}>
                    {track.incoming ? <TransitionLink scores={track.incoming} /> : null}
                    <TrackCard track={track} index={index} />
                  </li>
                ))}
              </ol>
            </>
          ) : (
            <p className="mt-1 text-sm text-zinc-500">Your set will appear here.</p>
          )}
        </section>
      </main>
    </div>
  );
}
