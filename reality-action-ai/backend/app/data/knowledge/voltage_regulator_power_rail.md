# Voltage Regulator and Power Rail Diagnostics

## Overview
Power distribution networks step down primary input voltages (e.g. 12V, 24V, 48V) to clean logic rails (5V, 3.3V, 1.8V, 1.2V) using linear regulators (LDOs) or buck switch-mode power supplies (SMPS). Power rail collapse accounts for over 60% of apparent "dead board" electronics failures.

## Failure Modes & Visual Signatures
- **Overheating LDO**: Scorched thermal tab, discolored silkscreen around ground plane, bubble in top plastic package.
- **Buck Converter Inductor / Diode**: Swollen electrolytic filter capacitors on output rail; burned freewheeling Schottky diode.
- **Crowbar / TVS Activation**: Clamping diode shorted to ground after absorbing an input voltage spike.

## Systematic Diagnostic Procedure
1. **Cold Resistance-to-Ground Check (Before Powering On)**:
   - Multimeter in Ohms mode, Black probe on chassis/GND ground plane.
   - Probe each power rail inductor or filter capacitor (+) terminal.
   - Rail reading < 10 Ω on high-voltage rails (5V/12V) indicates an immediate short circuit to ground. (Note: Modern GPU/CPU core rails may naturally have low resistance like 1–5 Ω; auxiliary rails should read kΩ or MΩ).
2. **Voltage Measurement Under Power**:
   - Power up with current-limited bench power supply if available.
   - Measure Vin, Vout, and Enable pins of the regulator.
   - If Vin is present and Vout = 0V with high rail resistance: regulator IC is defective or locked in shutdown.
   - If Vin dips and regulator becomes scorching hot (>70°C): short circuit exists downstream on the output rail.

## Fault Isolation Strategy
- Isolate the short by injecting low voltage (e.g., 1.0V) on the shorted rail with a bench power supply set to 1A current limit.
- Feel or use isopropyl alcohol / thermal camera to spot which component boils off alcohol first (the shorted bypass capacitor or IC).
