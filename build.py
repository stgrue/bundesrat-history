#!/usr/bin/env python3
"""
Build the merged Bundesrat history from per-state JSONs and emit:

  - data/bundesrat_history.json — verbose, indented (debug artifact, gitignored)
  - data.js                     — compact, single-line `window.HISTORY_DATA = …;`
                                  (consumed by app.js, committed to the repo)

Run from the project root: `python build.py`.
With `--check`, do not write anything; exit 1 if data.js on disk differs from
what the build would produce. Used as a CI guard so contributors must regenerate
data.js after editing data/history_states/*.json.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path


def build_state_timeline(events: list[dict]) -> dict[str, dict]:
    """Walk a state's raw event list, carrying num_seats and parties forward."""
    current_num_seats: int | None = None
    current_parties: list[str] = []
    timeline: dict[str, dict] = {}

    for event in events:
        date = event["date"]
        if (new_seats := event.get("num_seats")) is not None:
            current_num_seats = new_seats
        if (new_parties := event.get("parties")) is not None:
            current_parties = new_parties

        timeline[date] = {
            "num_seats": current_num_seats,
            "parties": current_parties,
            "note": event.get("note", ""),
            "source": event.get("source", ""),
            "is_dissolution": current_num_seats == 0,
        }

    return timeline


def merge_histories(states_dir: Path) -> list[dict]:
    """Merge per-state event files into one chronological list of snapshots."""
    state_timelines: dict[str, dict[str, dict]] = {}
    for json_file in sorted(states_dir.glob("*.json")):
        state_code = json_file.stem.upper()
        events = json.loads(json_file.read_text(encoding="utf-8"))
        state_timelines[state_code] = build_state_timeline(events)

    all_dates = sorted({date for tl in state_timelines.values() for date in tl})

    current_state: dict[str, dict] = {}
    active_states: set[str] = set()
    result: list[dict] = []

    for date in all_dates:
        states_entry: dict[str, dict] = {}

        for state, timeline in state_timelines.items():
            if date not in timeline:
                continue
            event = timeline[date]
            if event["is_dissolution"]:
                states_entry[state] = {
                    "num_seats": 0,
                    "note": event["note"],
                    "source": event["source"],
                }
                active_states.discard(state)
                current_state.pop(state, None)
            else:
                states_entry[state] = {
                    "num_seats": event["num_seats"],
                    "parties": event["parties"],
                    "note": event["note"],
                    "source": event["source"],
                }
                active_states.add(state)
                current_state[state] = {
                    "num_seats": event["num_seats"],
                    "parties": event["parties"],
                }

        for state in active_states:
            if state not in states_entry:
                cs = current_state[state]
                states_entry[state] = {
                    "num_seats": cs["num_seats"],
                    "parties": cs["parties"],
                    "note": "/unchanged",
                }

        result.append({
            "date": date,
            "states": dict(sorted(states_entry.items())),
        })

    return result


def to_compact(snapshots: list[dict]) -> list[dict]:
    """Translate verbose snapshots into the compact shape consumed by app.js.

    num_seats → n, parties → p. note/source preserved. /unchanged rows omit
    source (which is empty there anyway).
    """
    out = []
    for snap in snapshots:
        states = {}
        for code, s in snap["states"].items():
            entry: dict = {"n": s["num_seats"]}
            if "parties" in s:
                entry["p"] = s["parties"]
            if note := s.get("note"):
                entry["note"] = note
            if (src := s.get("source")) and s.get("note") != "/unchanged":
                entry["source"] = src
            states[code] = entry
        out.append({"date": snap["date"], "states": states})
    return out


def render_verbose(snapshots: list[dict]) -> str:
    return json.dumps(snapshots, ensure_ascii=False, indent=2) + "\n"


def render_data_js(snapshots: list[dict]) -> str:
    compact = to_compact(snapshots)
    payload = json.dumps(compact, ensure_ascii=False, separators=(",", ":"))
    return f"window.HISTORY_DATA = {payload};\n"


def atomic_write(path: Path, text: str) -> None:
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(text, encoding="utf-8")
    os.replace(tmp, path)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument(
        "--check",
        action="store_true",
        help="Do not write; exit 1 if data.js is out of sync with state JSONs.",
    )
    args = ap.parse_args()

    root = Path(__file__).parent
    snapshots = merge_histories(root / "data" / "history_states")

    verbose_text = render_verbose(snapshots)
    data_js_text = render_data_js(snapshots)

    verbose_path = root / "data" / "bundesrat_history.json"
    data_js_path = root / "data.js"

    if args.check:
        existing = data_js_path.read_text(encoding="utf-8") if data_js_path.exists() else ""
        if existing != data_js_text:
            print(
                f"out of date: {data_js_path.relative_to(root)} does not match "
                f"data/history_states/. Run `python build.py` and commit the result.",
                file=sys.stderr,
            )
            return 1
        return 0

    atomic_write(verbose_path, verbose_text)
    atomic_write(data_js_path, data_js_text)

    state_events = sum(
        1
        for snap in snapshots
        for s in snap["states"].values()
        if s.get("note") != "/unchanged"
    )
    print(f"wrote {verbose_path} ({len(snapshots)} snapshots, {state_events} change events)")
    print(f"wrote {data_js_path} ({len(data_js_text):,} bytes)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
