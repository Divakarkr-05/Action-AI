# RJ45 Network Cable Termination & Continuity Diagnostics

## Wiring Standards: TIA-568A vs TIA-568B
Network cabling requires adherence to standard color codes to prevent split pairs and maintain noise cancellation:

- T568B (Most common commercial/residential standard in US/Europe):
  Pin 1: White/Orange
  Pin 2: Orange
  Pin 3: White/Green
  Pin 4: Blue
  Pin 5: White/Blue
  Pin 6: Green
  Pin 7: White/Brown
  Pin 8: Brown

- T568A (Government, residential structured wiring, or crossover opposite end):
  Pin 1: White/Green
  Pin 2: Green
  Pin 3: White/Orange
  Pin 4: Blue
  Pin 5: White/Blue
  Pin 6: Orange
  Pin 7: White/Brown
  Pin 8: Brown

Note: Both ends of a straight-through patch cable or structured permanent link MUST use the same standard (B-to-B or A-to-A).

## Patch Panel & Keystone Punch-Down Best Practices
- Untwist limit: Do NOT untwist cable pairs more than 0.5 inches (12.7 mm) from the point of IDC termination to preserve Cat5e/Cat6/Cat6A crosstalk ratings.
- Tool usage: Use an impact punch-down tool set to the LOW impact setting for keystones and patch panels. Ensure the cutting blade is facing the external scrap wire side, NOT the connector center.
- Jacket stripping: Strip no more than 1.5 to 2.0 inches of outer PVC jacket. Do not nick internal conductor insulation with the stripping blade.

## Cable Tester Diagnostics & Failure Modes
- Open Circuit (LED does not illuminate on corresponding pin): Broken copper conductor, unseated pin, or IDC punch-down blade did not pierce wire insulation.
- Short Circuit (Multiple LEDs illuminate together): Crushed cable, staple through jacket, or stray wire strand bridging adjacent pins.
- Reversed Pair (Pins illuminate out of sequence, e.g., 1-2 swapped with 2-1): Wire conductors swapped at one termination.
- Split Pair (Continuity test passes 1-through-8, but wire map shows cross-talk error): Conductors from different twisted pairs mixed into pins 3 & 6 or 1 & 2, destroying common-mode electromagnetic noise rejection.
