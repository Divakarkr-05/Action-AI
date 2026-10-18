# Semiconductor Diode, Transistor, and MOSFET Testing

## Overview
Semiconductors (diodes, BJTs, MOSFETs) fail predominantly through thermal avalanche, reverse overvoltage breakdown, electrostatic discharge (ESD), or gate-oxide puncturing.

## Visual Failure Signatures
- **Package Rupture / Crater**: Physical crater, pinhole, or soot mark on top of epoxy encapsulation (common in flyback diodes or power switching MOSFETs).
- **Lifted Bonding Wires**: Internal open-circuit with or without external discolouration.
- **Trace Vaporization**: Thin PCB copper traces connected to source/drain or anode/cathode blown clear off the FR4 substrate.

## Discriminating Tests
1. **Diode Forward Voltage Drop Test**:
   - Use multimeter Diode Mode.
   - Red probe on Anode, Black probe on Cathode:
     - Silicon diode / PN junction: 0.50V – 0.75V forward drop.
     - Schottky diode: 0.15V – 0.40V forward drop.
     - Germanium: 0.20V – 0.30V forward drop.
   - Reverse probes (Red on Cathode, Black on Anode):
     - Expected: Over-limit ("OL" or open).
2. **MOSFET Drain-Source Short Test**:
   - Touch gate to source with a shorting wire/probe to discharge internal gate capacitance.
   - Measure resistance between Drain and Source.
   - Reading ≈ 0 Ω in both directions confirms punched-through short circuit.

## Safety & Interpretation Rules
- **Bi-directional Continuity / 0V Drop**: P-N junction is shorted. Will pull power supply down into thermal overcurrent protection.
- **Bi-directional Open (OL)**: P-N junction has blown open.
- When replacing a shorted power transistor, ALWAYS inspect the gate driver circuitry and flyback snubber diode to prevent immediate re-failure upon re-powering.
