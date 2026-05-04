#!/usr/bin/env python3
"""
Merge individual state Bundesrat history files into one chronological JSON.

Each output entry represents a date where at least one state changed.
States with no change on a given date are listed with note "/unchanged".
States that have been dissolved are omitted after their final (num_seats=0) entry.
"""

import json
from pathlib import Path


def build_state_timeline(events: list[dict]) -> dict[str, dict]:
    """
    Given raw events for a state, return a dict mapping date -> accumulated state.

    Each value contains:
      - num_seats: current seat count (carried forward)
      - parties: current list of parties (carried forward)
      - note, source: from this specific event
      - is_dissolution: True when num_seats == 0
    """
    current_num_seats: int | None = None
    current_parties: list[str] = []
    timeline: dict[str, dict] = {}

    for event in events:
        date = event["date"]

        new_seats = event.get("num_seats")
        new_parties = event.get("parties")

        if new_seats is not None:
            current_num_seats = new_seats
        if new_parties is not None:
            current_parties = new_parties

        timeline[date] = {
            "num_seats": current_num_seats,
            "parties": current_parties,
            "note": event.get("note", ""),
            "source": event.get("source", ""),
            "is_dissolution": current_num_seats == 0,
        }

    return timeline


def main() -> None:
    root = Path(__file__).parent
    states_dir = root / "data" / "history_states"

    # Load and build per-state timelines
    state_timelines: dict[str, dict[str, dict]] = {}
    for json_file in sorted(states_dir.glob("*.json")):
        state_code = json_file.stem.upper()
        events = json.loads(json_file.read_text(encoding="utf-8"))
        state_timelines[state_code] = build_state_timeline(events)

    # Collect all unique change dates across all states
    all_dates = sorted({date for tl in state_timelines.values() for date in tl})

    # Walk through dates chronologically, maintaining running state
    current_state: dict[str, dict] = {}   # state -> {num_seats, parties}
    active_states: set[str] = set()        # states currently in the Bundesrat

    result: list[dict] = []

    for date in all_dates:
        states_entry: dict[str, dict] = {}

        # --- States with an explicit event on this date ---
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

        # --- Active states without a change on this date → "/unchanged" ---
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

    output_path = root / "data" / "bundesrat_history.json"
    output_path.write_text(
        json.dumps(result, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"Written {len(result)} entries to {output_path}")

    # Quick sanity stats
    total_state_events = sum(
        1 for entry in result
        for state_data in entry["states"].values()
        if state_data.get("note") != "/unchanged"
    )
    print(f"  {total_state_events} state-level change events across all entries")


if __name__ == "__main__":
    main()
