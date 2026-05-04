import json
import cairo
import math

from bundesrat import Bundesrat, draw_bundesrat


PARTY_COLOR_MAP = {
    "SPD": (0.91, 0, 0.09),
    "CDU": (0, 0, 0),
    "CSU": (0, 0, 0),
    "Zentrum": (0, 0, 0),
    "FDP": (0.9, 0.9, 0),
    "DVP": (0.9, 0.9, 0),
    "FDP/DVP": (0.9, 0.9, 0),
    "FDP/DPS": (0.9, 0.9, 0),
    "DPS": (0.9, 0.9, 0),
    "BDV": (0.9, 0.9, 0),
    "Freie Wähler": (1, 0.5, 0),
    "Bündnis 90/Die Grünen": (0.27, 0.59, 0.22),
    "Bündnis 90": (0.27, 0.59, 0.22),
    "Die Grünen": (0.27, 0.59, 0.22),
    "GAL": (0.27, 0.59, 0.22),
    "AL": (0.27, 0.59, 0.22),
    "Die Linke": (0.76, 0.16, 0.45),
    "PDS": (0.76, 0.16, 0.45),
    "BSW": (0.44, 0.16, 0.39),
    "KPD": (0.76, 0.16, 0.45),
    "DP": (0.0, 0.3, 0.6),
    "BP": (0.0, 0.5, 0.8),
    "BHE": (0.5, 0.3, 0.1),
    "GB/BHE": (0.5, 0.3, 0.1),
    "CVP": (0.0, 0.4, 0.3),
    "SSW": (0.0, 0.3, 0.6),
    "STATT Partei": (0.5, 0.5, 0.5),
    "Partei Rechtsstaatlicher Offensive": (0.2, 0.2, 0.6),
}

STATES_ORDER = [
    "BA",
    "BW",
    "BY",
    "BE",
    "BB",
    "HB",
    "HH",
    "HE",
    "MV",
    "NI",
    "NW",
    "RP",
    "SL",
    "SN",
    "ST",
    "SH",
    "TH",
    "WB",
    "WH"
]

DRAW_OPTIONS = {
    "origin_x": 0.5,
    "origin_y": 0.1,
    "seats_inner_radius": 0.41,
    "seats_outer_radius": 0.43,
    "seat_space_ratio": 0.33,
    "states_inner_radius": 0.1,
    "states_outer_radius": 0.4,
    "states_tickmark_radius": 0.45,
    "party_color_map": PARTY_COLOR_MAP,
    "states_order": STATES_ORDER
}


def read_bundesrat_data(json_filename):
    with open(json_filename) as json_file:
        composition_data = json.load(json_file)

    return Bundesrat.from_json(composition_data)


def read_bundesrat_history(json_filename):
    with open(json_filename) as json_file:
        history_data = json.load(json_file)
        
    assert isinstance(history_data, list)
    for composition_data in history_data:
        yield Bundesrat.from_json(composition_data)


if __name__ == "__main__":
    for i, bundesrat in enumerate(read_bundesrat_history("data/bundesrat_history.json")):
        with cairo.SVGSurface(f"output/br{i}.svg", 800, 500) as surface:
            bg = cairo.Context(surface)
            bg.set_source_rgb(1, 1, 1)
            bg.paint()

            context = cairo.Context(surface)

            context.scale(800, 800)
            context.set_line_width(0.0025)
    
            draw_bundesrat(bundesrat, context, DRAW_OPTIONS)

