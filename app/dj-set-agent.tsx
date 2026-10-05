"use client";

import { FormEvent, useState } from "react";

const SET_LENGTHS = [5, 8, 10, 15] as const;

type SetLength = (typeof SET_LENGTHS)[number];

type Track = {
  title: string;
  artist: string;
  bpm: number;
  camelot: string;
  energy: number;
};

const SAMPLE_TRACKS: Track[] = [
  { title: "Beauty and a Beat", artist: "Justin Bieber", bpm: 128, camelot: "11B", energy: 7 },
  { title: "We Found Love", artist: "Rihanna", bpm: 128, camelot: "7B", energy: 8 },
  { title: "Titanium", artist: "David Guetta", bpm: 126, camelot: "8B", energy: 8 },
  { title: "Wake Me Up", artist: "Avicii", bpm: 124, camelot: "9B", energy: 8 },
  { title: "Levels", artist: "Avicii", bpm: 126, camelot: "5A", energy: 8 },
  { title: "Don't You Worry Child", artist: "Swedish House Mafia", bpm: 129, camelot: "6A", energy: 9 },
  { title: "Clarity", artist: "Zedd", bpm: 128, camelot: "1A", energy: 9 },
  { title: "Reload", artist: "Sebastian Ingrosso", bpm: 128, camelot: "4A", energy: 9 },
  { title: "Animals", artist: "Martin Garrix", bpm: 128, camelot: "6A", energy: 9 },
  { title: "Tremor", artist: "Dimitri Vegas & Like Mike", bpm: 128, camelot: "8A", energy: 9 },
  { title: "Outside", artist: "Calvin Harris", bpm: 128, camelot: "7A", energy: 10 },
  { title: "Tsunami", artist: "DVBBS & Borgeous", bpm: 130, camelot: "10A", energy: 10 },
  { title: "Epic", artist: "Sandro Silva & Quintino", bpm: 128, camelot: "9A", energy: 10 },
  { title: "Wizard", artist: "Martin Garrix", bpm: 128, camelot: "11A", energy: 10 },
  { title: "Turn Up the Speakers", artist: "Afrojack", bpm: 128, camelot: "12A", energy: 10 },
];

const TRANSITION_SCORES = [92, 90, 88, 91, 86, 93, 89, 94, 87, 90, 88, 91, 85, 92];

const DEFAULT_TRACK = "Beauty and a Beat - Justin Bieber";
const DEFAULT_DIRECTION = "Transition from 2010s pop into high-energy house";

function parseTrack(value: string): Pick<Track, "title" | "artist"> | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parts = trimmed
    .split(/\s+(?:-|–|—|by)\s+/i)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    return { title: parts[0], artist: parts.slice(1).join(" ") };
  }

  return { title: trimmed, artist: "—" };
}

function buildSet(currentTrack: string, length: SetLength): Track[] {
  const opening = parseTrack(currentTrack);

  return SAMPLE_TRACKS.slice(0, length).map((track, index) =>
    index === 0 && opening ? { ...track, title: opening.title, artist: opening.artist } : track,
  );
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

export function DjSetAgent() {
  const [currentTrack, setCurrentTrack] = useState(DEFAULT_TRACK);
  const [direction, setDirection] = useState(DEFAULT_DIRECTION);
  const [setLength, setSetLength] = useState<SetLength>(8);
  const [tracks, setTracks] = useState(() => buildSet(DEFAULT_TRACK, 8));
  const [activeDirection, setActiveDirection] = useState(DEFAULT_DIRECTION);
  const [revision, setRevision] = useState(0);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTracks(buildSet(currentTrack, setLength));
    setActiveDirection(direction.trim());
    setRevision((value) => value + 1);
  }

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
              className="h-11 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3.5 text-sm text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-white/30"
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
              className="w-full resize-none rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-white/30"
            />
          </div>

          <fieldset>
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
                    className={`h-12 text-sm font-medium tabular-nums transition-colors ${
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
            className="h-12 w-full rounded-lg bg-white text-sm font-medium text-zinc-950 transition-colors hover:bg-zinc-200"
          >
            Generate Set
          </button>
        </form>

        <section aria-live="polite" className="mt-10">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-sm font-medium text-zinc-200">Generated Set</h2>
              {activeDirection ? (
                <p className="mt-1 text-sm text-zinc-500">{activeDirection}</p>
              ) : null}
            </div>
            <p className="shrink-0 font-mono text-xs tabular-nums text-zinc-500">
              {tracks.length} tracks
            </p>
          </div>

          <ol key={revision} className="set-in overflow-hidden rounded-xl border border-white/10">
            {tracks.map((track, index) => {
              const score = TRANSITION_SCORES[index];
              const isLast = index === tracks.length - 1;

              return (
                <li key={`${track.title}-${index}`}>
                  <article className="px-4 py-4 sm:px-5">
                    <div className="flex items-start gap-3 sm:gap-4">
                      <span className="w-7 pt-0.5 font-mono text-xs tabular-nums text-zinc-500">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="truncate text-[15px] font-medium text-white">
                              {track.title}
                            </h3>
                            <p className="truncate text-sm text-zinc-400">{track.artist}</p>
                          </div>
                          <EnergyMeter value={track.energy} />
                        </div>
                        <p className="mt-3 font-mono text-xs text-zinc-400">
                          {track.bpm} BPM
                          <span className="px-1.5 text-zinc-600">|</span>
                          <span className="text-zinc-200">{track.camelot}</span>
                          <span className="px-1.5 text-zinc-600">|</span>
                          Energy {track.energy}
                        </p>
                      </div>
                    </div>
                  </article>
                  {!isLast ? (
                    <div className="border-y border-white/[0.06] bg-black/30 py-2 text-center font-mono text-[11px] tracking-wide text-zinc-500">
                      ↓ {score}% transition
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </section>
      </main>
    </div>
  );
}
