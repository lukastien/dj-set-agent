# DJ Set Agent

DJ Set Agent is a local AI-powered DJ sequencing system. It interprets a natural-language musical direction and builds a goal-aware track sequence using deterministic DJ compatibility scoring. A local language model decides where the set should go. A separate scoring engine decides which transitions are compatible. The model does not pick songs or calculate mix scores.

## Demo

A screenshot or short recording of a generated set will be added here.

<!-- Add application screenshot here -->

## Example

Starting track:

Beauty and a Beat — Justin Bieber

Direction:

"Stay in nostalgic 2010s pop for a couple tracks, gradually increase the energy, and transition into high-energy tech house."

An illustrative genre arc for that request:

```text
Dance Pop
→ Dance Pop
→ EDM
→ EDM
→ House
→ Tech House
```

This shows the kind of path the sequencer is aiming for. It is not a guarantee of those genres or of any specific tracks. Results depend on the starting song, the set length, and how the local model reads the direction.

The set length control (5, 8, 10, or 15) is the number of tracks added after the current song. The current song stays at the front of the list.

## How It Works

```text
User Direction
↓
Llama 3.2 via Ollama
↓
Structured DJ Intent
↓
DJ Agent
↓
Candidate Search
↓
Transition Scoring
↓
Goal-Aware Ranking
↓
Next Track
↓
Repeat
↓
Generated Set
```

The language model and the DJ logic are separate.

Llama 3.2, through a local Ollama server, is responsible for:

- interpreting the natural-language direction
- choosing a target genre
- choosing an energy direction: increase, decrease, or steady
- choosing a transition style: gradual, sudden, or steady

The reply is parsed into that fixed shape. If it cannot be parsed, the agent falls back to a default intent: a gradual, steady move toward House. The set is still built from the catalog with the scoring engine. The model is instructed not to name tracks or calculate BPM, Camelot, or transition scores.

The deterministic engine in `lib/djEngine.ts` is responsible for:

- BPM compatibility
- Camelot key compatibility
- energy compatibility
- genre compatibility
- the weighted transition score

The sequencing loop in `lib/djAgent.ts` is responsible for:

- keeping the current track
- keeping the tracks already chosen
- skipping tracks that are already in the set
- tracking how far the set has progressed
- balancing a strong immediate transition against the requested destination

Each step ranks the remaining library, keeps up to eight of the best immediate transitions, then re-ranks that short list for the goal of this slot. The winner becomes the current track, and the loop repeats until the set length is filled.

## Transition Scoring

Each pair of tracks receives a heuristic compatibility score from 0 to 100. The score is a weighted mix of four factors. It is not a probability that the transition will sound good, and it is not based on audio.

| Factor | Weight |
| --- | --- |
| BPM compatibility | 35% |
| Camelot key compatibility | 30% |
| Energy compatibility | 20% |
| Genre compatibility | 15% |

BPM. An exact tempo scores 100. The score falls as the tempos move apart. Half-time and double-time are considered, and the closest of those relationships is kept.

Camelot key. The same key is the strongest match. One step around the Camelot wheel, including the wrap from 12 to 1, is also strong, as is switching letter at the same number (the relative major or minor). Larger moves score lower.

Energy. Tracks use a stored energy value from 1 to 10. Similar energy scores higher. A large jump up or down scores lower. This component does not prefer rises over drops. Direction is handled later, in sequencing.

Genre. Genres sit on a fixed spectrum: 2010s Pop, Dance Pop, EDM, House, Tech House. Neighboring styles score higher than styles that are far apart.

All four values come from the track record in `data/tracks.json`. The engine does not analyze audio.

## Goal-Aware Sequencing

The next track is not simply the highest transition score.

A track can mix cleanly from the current song and still move the set the wrong way. It might drop back toward the starting genre after the set has already moved on, or jump to peak energy before the requested ramp gets there.

For each open slot, the agent looks at how far through the set it is. A gradual direction walks toward the target genre and energy. A sudden direction heads there immediately. A steady direction stays closer to the start. Energy for an "increase" request is aimed upward along that progress, and a "decrease" request is aimed downward. Candidates that fit the slot's genre and energy rank higher, even when another track has a slightly better immediate mix.

## Architecture

```text
┌─────────────────┐
│   Next.js UI    │
└────────┬────────┘
         │  POST /api/generate
         ▼
┌─────────────────┐
│    DJ Agent     │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
 Ollama    DJ Engine
 Llama     BPM / Key
 3.2       Energy / Genre
    │         │
    └────┬────┘
         ▼
   Track Ranking
         │
         ▼
   Generated Set
```

The UI collects the current track, the direction, and the set length. `POST /api/generate` validates that input and calls the agent. The agent asks Ollama for a structured intent once, then builds the set locally. The browser renders the intent, each track, and the transition scores between tracks.

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Ollama, running locally
- Llama 3.2

The app does not call a hosted model API. Track selection does not use a database, Spotify, or Rekordbox.

## Running Locally

1. Clone the repository.

```bash
git clone https://github.com/lukastien/dj-set-agent.git
cd dj-set-agent
```

2. Install dependencies.

```bash
npm install
```

3. Install Ollama from [https://ollama.com](https://ollama.com).

4. Pull the model.

```bash
ollama pull llama3.2
```

5. Start Ollama if it is not already running.

```bash
ollama serve
```

6. Start the app.

```bash
npm run dev
```

7. Open [http://localhost:3000](http://localhost:3000).

The current-track field accepts a title, or `Title - Artist`. Lookup uses the title only, matched against the local catalog. If Ollama is not reachable, the page reports that the local agent could not be contacted.

## Project Structure

```text
app/
  page.tsx                 Page entry
  dj-set-agent.tsx         Form, loading state, and generated set
  api/generate/route.ts    POST endpoint used by the UI
data/
  tracks.json              Local catalog of 40 tracks
lib/
  djAgent.ts               Sequencing loop and goal-aware ranking
  djEngine.ts              BPM, Camelot, energy, and genre scores
  ollama.ts                Local intent interpretation
  types.ts                 Track shape
```

`app/api/` also contains `test-engine`, `test-ollama`, and `test-agent`. Those routes were used to check the engine, the model call, and the agent while building the project. The UI does not call them.

## Current Limitations

- The catalog is a small local demo library: 40 tracks across 2010s Pop, Dance Pop, EDM, House, and Tech House.
- BPM, Camelot key, energy, and genre are stored metadata. They are not measured from audio.
- Ollama has to be running on the same machine. There is no hosted-model fallback.
- Transition scores are heuristics. A high score does not mean a transition will sound good in a mix.
- There is no Rekordbox import or export.
- There is no Spotify or other streaming integration.
- There is no phrase detection, waveform view, or other audio analysis.

## Roadmap

None of the following is implemented. They are possible later work:

- Rekordbox library import
- a larger catalog
- audio-feature extraction
- phrase-aware transitions
- richer energy modeling
- saved DJ preferences
- set history and feedback
- broader music discovery beyond the local file

## Why Local AI?

The model runs through Ollama on the machine where the app is running, so this project does not require a paid language-model API. That makes it a practical place to try a small agent loop: the model interprets a request, and the rest of the system keeps state and applies fixed DJ rules. Those rules stay in the scoring engine and the sequencer, where they can be inspected and changed without asking the model to invent a playlist.
