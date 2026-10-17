# HVAC Troubleshooting & Fault Code Standards

## Standard Commercial/Residential Fault Codes
Digital control boards in condensing units, heat pumps, and packaged rooftop systems use standard diagnostic blink codes or 2-digit alphanumeric error codes:

- E01 / 1 Flash: High Pressure Switch Open (trip threshold typically 450–600 PSI depending on R-410A vs R-22).
  Causes: Blocked outdoor condenser coil, failed condenser fan motor, overcharged refrigerant, non-condensables in system.
  Action: Inspect outdoor coil for dirt/leaves, verify fan rotation direction and capacitor, check discharge pressure with manifold gauge set.

- E02 / 2 Flashes: Low Pressure Switch Open (loss of charge or low suction threshold below 20–35 PSI).
  Causes: Low refrigerant leak, severely restricted metering device (TXV/orifice), frozen evaporator coil, defective low pressure switch.
  Action: Power off system to prevent compressor burnout, inspect lines for oil stains (leak indicators), do not bypass pressure switch.

- E03 / 3 Flashes: Freeze Protection / Low Temperature Lockout / Blocked Airflow.
  Causes: Dirty air filter, slipping blower belt, failed indoor blower motor, closed supply registers, iced evaporator coil.
  Action: Replace dirty 1-inch to 4-inch pleat air filter, thaw frozen coils fully before restarting, verify blower wheel is clean and spinning freely.

- E04 / 4 Flashes: Temperature Sensor Fault (discharge line or ambient thermistor open/shorted).
  Causes: Disconnected sensor wire, corrosion on harness pins, thermistor out of calibrated resistance spec (typically 10kΩ at 77°F/25°C).

## Compressor Lockout & Reset Protocol
- Modern systems trigger a 3-strike lockout: If a high or low pressure fault trips 3 times within a single operating cycle, the controller enters hard lockout.
- To reset: Remove 24VAC control power (turn thermostat off and cycle service disconnect) for at least 3 minutes, then re-energize.
- Safety: If the compressor thermal overload is tripped (shell hot to the touch), allow 1–2 hours for internal bimetal switch to cool and reset automatically.
