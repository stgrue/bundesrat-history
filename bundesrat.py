import math
import cairo

from collections import defaultdict

TEXT_WIDTH = defaultdict(lambda: 0.017)
TEXT_WIDTH["BW"] = 0.021
TEXT_WIDTH["NI"] = 0.012


class State:
    def __init__(self, name, num_seats, parties):
        self.name = name
        self.num_seats = num_seats
        self.parties = parties

    @classmethod
    def from_json(cls, name, json_dict):
        return cls(name, json_dict["num_seats"], json_dict.get("parties", []))


class Bundesrat:
    def __init__(self, date, states):
        self.date = date
        self.states = states
        
        self.num_seats = sum(state.num_seats for state in self.states)
        

    @classmethod
    def from_json(cls, json_dict):
        date = tuple(map(int, json_dict["date"].split("-")))
        states = [
            State.from_json(name, state_data)
            for name, state_data in json_dict["states"].items()
            if state_data["num_seats"] > 0
        ]

        return cls(date, states)
    

def draw_bundesrat(bundesrat, context, draw_options):
    origin_x = draw_options["origin_x"]
    origin_y = draw_options["origin_y"]

    draw_date(context, bundesrat.date, origin_x, origin_y)

    # Draw seats
    seat_space_ratio = draw_options["seat_space_ratio"]

    seat_angle = 1 / (bundesrat.num_seats + seat_space_ratio * (bundesrat.num_seats - 1)) * math.pi
    seat_space_angle = seat_angle * seat_space_ratio

    seats_inner_radius = draw_options["seats_inner_radius"]
    seats_outer_radius = draw_options["seats_outer_radius"]

    draw_seats(context, bundesrat.num_seats, origin_x, origin_y, seat_angle, seat_space_angle, seats_inner_radius, seats_outer_radius, fill_color=(0.5, 0.5, 0.5))

    # Draw actual states
    states_inner_radius = draw_options["states_inner_radius"]
    states_outer_radius = draw_options["states_outer_radius"]
    party_color_map = draw_options["party_color_map"]
    states_order = draw_options["states_order"]

    ordered_states = sorted(
        bundesrat.states,
        key=lambda s: states_order.index(s.name) if s.name in states_order else len(states_order)
    )

    curr_start_seat_ix = 0
    for state in reversed(ordered_states):
        curr_end_seat_ix = curr_start_seat_ix + state.num_seats
        
        if curr_end_seat_ix == bundesrat.num_seats:
            tickmark_radius = None
        else:
            tickmark_radius = draw_options["states_tickmark_radius"]
        
        draw_state(context, state, origin_x, origin_y, curr_start_seat_ix, curr_end_seat_ix, \
                   states_inner_radius, states_outer_radius, tickmark_radius, seat_angle, seat_space_angle, party_color_map)
        curr_start_seat_ix = curr_end_seat_ix


def draw_date(context, date, origin_x, origin_y):
    ESTIMATED_CHAR_WIDTH = 0.015
    ESTIMATED_CHAR_HEIGHT = 0.023

    date_str = "-".join(f"{elem:02d}" for elem in date)
    date_str_width = len(date_str) * ESTIMATED_CHAR_WIDTH

    context.set_font_size(0.03)
    context.select_font_face("Liberation Sans", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_BOLD)
    context.move_to(origin_x-date_str_width/2, origin_y+ESTIMATED_CHAR_HEIGHT)
    context.set_source_rgb(0, 0, 0)
    context.show_text(date_str)


def draw_seats(context, num_seats, origin_x, origin_y, seat_angle, seat_space_angle, inner_radius, outer_radius, fill_color=(0.5, 0.5, 0.5)):
    for i in range(num_seats):
        curr_angle = i*seat_angle + i*seat_space_angle
        draw_slice(context, origin_x, origin_y, curr_angle, curr_angle+seat_angle, inner_radius, outer_radius, fill_color=fill_color, stroke_color=(1,1,1))


def draw_state(context, state, origin_x, origin_y, seat_start_ix, seat_end_ix, inner_radius, outer_radius, tickmark_radius, seat_angle, seat_space_angle, party_color_map):
    start_angle = seat_start_ix * seat_angle + (seat_start_ix - 0.5) * seat_space_angle
    end_angle = seat_end_ix * seat_angle + (seat_end_ix - 0.5) * seat_space_angle

    start_angle = max(0, start_angle)
    end_angle = min(math.pi, end_angle)
    state_slice_length = outer_radius - inner_radius
    party_slice_length = state_slice_length / len(state.parties)

    # Draw party slices
    for i, party in enumerate(reversed(state.parties)):  # Reverse because we assume party list to be sorted by descending size; TODO check this assumption
        party_slice_inner_radius = inner_radius + i*party_slice_length
        party_slice_outer_radius = inner_radius + (i+1)*party_slice_length
        
        draw_slice(context, origin_x, origin_y, start_angle, end_angle, party_slice_inner_radius, party_slice_outer_radius, \
                   fill_color=party_color_map[party], stroke_color=(1.0, 1.0, 1.0))
    
    # Draw tickmarks
    if tickmark_radius is not None:
        context.move_to(origin_x + math.cos(end_angle)*outer_radius, origin_y + math.sin(end_angle)*outer_radius)
        context.line_to(origin_x + math.cos(end_angle)*tickmark_radius, origin_y + math.sin(end_angle)*tickmark_radius)
        context.set_source_rgb(0, 0, 0)
        context.stroke()

    # Draw state abbreviation
    mid_angle = (start_angle + end_angle) / 2
    text_radius = outer_radius + 0.067
    context.set_font_size(0.025)
    context.select_font_face("Liberation Sans", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_BOLD)
    context.move_to(origin_x + math.cos(mid_angle)*text_radius-TEXT_WIDTH[state.name], origin_y + math.sin(mid_angle)*text_radius+0.006)
    context.set_source_rgb(0, 0, 0)
    context.show_text(state.name)


def draw_slice(context, origin_x, origin_y, start_angle, end_angle, inner_radius, outer_radius, fill_color=(1.0, 1.0, 1.0), stroke_color=(0.0, 0.0, 0.0)):
    a_x = origin_x + math.cos(start_angle)*inner_radius
    a_y = origin_y + math.sin(start_angle)*inner_radius
    
    b_x = origin_x + math.cos(start_angle)*outer_radius
    b_y = origin_y + math.sin(start_angle)*outer_radius
    
    c_x = origin_x + math.cos(end_angle)*outer_radius
    c_y = origin_y + math.sin(end_angle)*outer_radius
    
    d_x = origin_x + math.cos(end_angle)*inner_radius
    d_y = origin_y + math.sin(end_angle)*inner_radius
    
    context.move_to(a_x, a_y)
    context.line_to(b_x, b_y)
    
    context.arc(origin_x, origin_y, outer_radius, start_angle, end_angle)
    
    context.line_to(c_x, c_y)

    context.arc_negative(origin_x, origin_y, inner_radius, end_angle, start_angle)

    context.close_path()

    context.set_source_rgb(*fill_color)
    context.fill_preserve()

    context.set_source_rgb(*stroke_color)
    context.stroke()

