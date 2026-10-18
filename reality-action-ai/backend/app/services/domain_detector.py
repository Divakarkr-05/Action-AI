"""
REALITY → ACTION AI – Domain Classification and Grounding Protection

Determines the operational domain (PLANT, ELECTRONICS, MECHANICAL, HVAC, NETWORK, GENERAL)
from visual findings, initial question, and user query.
Enforces domain isolation between Mode A (General Reality Analysis) and Mode B (Electronics Diagnostic).
"""

from __future__ import annotations

import re
from typing import Optional


def detect_domain(what_i_see: str, initial_question: str = "", current_question: str = "") -> str:
    """
    Classify the domain of the inspected reality.
    The primary grounding signal is the visual observation (what_i_see).
    Initial question and current question provide secondary context.
    """
    see_lower = (what_i_see or "").lower()
    init_lower = (initial_question or "").lower()
    curr_lower = (current_question or "").lower()
    combined = f"{see_lower} {init_lower} {curr_lower}"

    # 1. Botany / Plants / Horticulture
    # Visual observation is strongly prioritized: if what_i_see describes a plant, domain is PLANT
    plant_see_terms = (
        "plant", "houseplant", "spider plant", "leaf", "leaves", "stem", "branch",
        "flower", "roots", "soil", "pot", "potting", "succulent", "cactus",
        "chlorophytum", "monstera", "pothos", "fiddle", "flora", "vegetation",
        "foliage", "horticulture", "botany", "gardening", "fertilizer", "sprout",
    )
    if any(re.search(rf"\b{term}\b", see_lower) for term in plant_see_terms):
        return "PLANT"

    # 2. Electronics / PCB
    elec_see_terms = (
        "pcb", "circuit", "circuitry", "circuit board", "capacitor", "capacitors",
        "resistor", "resistors", "diode", "diodes", "transistor", "transistors",
        "solder", "soldering", "trace", "traces", "integrated circuit",
        "microcontroller", "power rail", "ground plane", "multimeter", "breadboard",
        "flux", "ic chip", "smd", "surface mount", "component lead",
    )
    if any(re.search(rf"\b{term}\b", see_lower) for term in elec_see_terms):
        return "ELECTRONICS"

    # 3. Mechanical / Belts / Pulleys / Drivetrains
    mech_see_terms = (
        "pulley", "pulleys", "belt", "belts", "v-belt", "timing belt", "motor",
        "engine", "gear", "gears", "chain", "chains", "sprocket", "bearing",
        "bearings", "shaft", "coupling", "drivetrain", "transmission", "deflection",
        "sheave", "tensioner", "bicycle", "clutch", "piston",
    )
    if any(re.search(rf"\b{term}\b", see_lower) for term in mech_see_terms):
        return "MECHANICAL"

    # 4. HVAC
    hvac_see_terms = (
        "hvac", "air conditioner", "refrigerant", "compressor", "condenser",
        "evaporator", "thermostat", "heat pump", "freon", "air handler",
    )
    if any(re.search(rf"\b{term}\b", see_lower) for term in hvac_see_terms):
        return "HVAC"

    # 5. Network / RJ45
    net_see_terms = (
        "rj45", "ethernet", "cat5", "cat6", "patch cable", "crimper", "keystone",
        "twisted pair", "lan cable", "patch panel",
    )
    if any(re.search(rf"\b{term}\b", see_lower) for term in net_see_terms):
        return "NETWORK"

    # Secondary check on initial question / query if what_i_see is minimal
    if any(re.search(rf"\b{term}\b", combined) for term in plant_see_terms):
        return "PLANT"
    if any(re.search(rf"\b{term}\b", combined) for term in elec_see_terms):
        return "ELECTRONICS"
    if any(re.search(rf"\b{term}\b", combined) for term in mech_see_terms):
        return "MECHANICAL"
    if any(re.search(rf"\b{term}\b", combined) for term in hvac_see_terms):
        return "HVAC"
    if any(re.search(rf"\b{term}\b", combined) for term in net_see_terms):
        return "NETWORK"

    return "GENERAL"
