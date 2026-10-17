# Capacitor Discharge & Energy Storage Safety

## Stored Energy Hazard
Capacitors in power supplies, motor drives, HVAC compressors, microwave ovens, and audio amplifiers store lethal electrical energy long after mains power has been disconnected. Never touch capacitor leads, terminals, or PCB traces directly with bare fingers or uninsulated tools.

## Proper Capacitor Discharge Procedure
1. Disconnect mains power and verify LOTO.
2. Select a dedicated discharge tool or power resistor:
   - For high-voltage/large filter capacitors (e.g. 200V–450V electrolytic caps): use a ceramic power resistor (1kΩ to 5kΩ rated for 5W to 20W).
   - For motor run/start capacitors (240V–480VAC): use a 20kΩ 5W power resistor with insulated alligator clips.
3. Attach the discharge resistor across the positive and negative capacitor terminals for at least 10–30 seconds.
4. DO NOT use a standard screwdriver to short capacitor terminals directly. Direct shorting causes severe contact welding, sparks, explosive dielectric rupture, and component damage.

## Residual Voltage Verification
- After discharging, measure terminal voltage using a calibrated multimeter set to DC Volts.
- Verify that terminal potential is below 5.0 VDC (and ideally 0.0V) before desoldering, handling, or replacing.
- Note: High-voltage capacitors can experience dielectric absorption (charge recovery). Recheck voltage if the component has been sitting idle for several minutes.

## Visual Failure Indicators
- Bulging or dome-shaped aluminum vent tops.
- Brownish or crusty electrolytic residue leaking around capacitor rubber bungs or PCB pads.
- Scorched sleeve insulation indicating chronic overheating or overvoltage ripple.
