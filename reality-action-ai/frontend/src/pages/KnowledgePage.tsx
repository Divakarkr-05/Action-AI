import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from '../components/navigation/Sidebar';
import { TopBar } from '../components/navigation/TopBar';
import { CommandPalette } from '../components/CommandPalette';

interface FailurePattern {
  id: string;
  category: 'Capacitors' | 'Resistors' | 'Semiconductors' | 'Power Rails' | 'PCB Interconnect';
  title: string;
  designators: string;
  visualSigns: string[];
  mechanism: string;
  testProcedure: string;
  expectedResult: string;
  safetyNotice: string;
  typicalTools: string[];
}

const FAILURE_PATTERNS: FailurePattern[] = [
  {
    id: 'cap-vent-bulge',
    category: 'Capacitors',
    title: 'Electrolytic Capacitor Vent Bulge & Dielectric Breakdown',
    designators: 'C12, C15, C20, CE1-CE8',
    visualSigns: [
      'Convex top safety cross vent bulging upward',
      'Brown, crusty electrolyte crusting around rubber bung base',
      'Sleeve shrinkage or discoloration from localized heating',
    ],
    mechanism:
      'Electrochemical degradation from excessive ripple current or thermal overstress vaporizes aqueous electrolyte, building internal pressure until the vent scores open.',
    testProcedure:
      'Disconnect power and safely discharge capacitor with a 100Ω 5W bleeder resistor. Measure capacitance and ESR out of circuit or with an in-circuit ESR meter.',
    expectedResult:
      'Nominal value ±20%. Defective caps exhibit <50% nominal capacitance and ESR > 5Ω.',
    safetyNotice:
      'DISCHARGE FIRST. High-voltage bulk capacitors (200V-450V) can hold lethal charge for days after unpowering.',
    typicalTools: ['Digital Multimeter (Capacitance mode)', 'ESR Meter', '100Ω 5W Bleeder Resistor'],
  },
  {
    id: 'smd-mlcc-crack',
    category: 'Capacitors',
    title: 'SMD MLCC Ceramic Capacitor Micro-Cracking & Short',
    designators: 'C104, C205, C301',
    visualSigns: [
      'Subtle hairline diagonal fracture across ceramic body',
      'Localized dark burn spot between end metallization terminals',
      'Board flex marks near mounting screws or heavy inductors',
    ],
    mechanism:
      'Mechanical flexing during assembly or thermal shock fractures brittle ceramic layers, allowing internal electrode plates to migrate and form a dead low-impedance short.',
    testProcedure:
      'Measure resistance across the suspected capacitor leads with power disconnected in continuity/resistance mode.',
    expectedResult:
      'Healthy MLCC reads infinite resistance (open). Shorted MLCC reads < 2Ω.',
    safetyNotice:
      'Do not apply full rail voltage while MLCC is shorted to avoid vaporizing copper PCB traces.',
    typicalTools: ['Multimeter with fine needle probes', 'Thermal Camera / Freeze Spray'],
  },
  {
    id: 'res-thermal-burn',
    category: 'Resistors',
    title: 'SMD / Power Resistor Overheating & Open-Circuit',
    designators: 'R1, R12, R47, PR10',
    visualSigns: [
      'Blackened or blistered ceramic encapsulation',
      'Charred or lifted copper solder pads beneath the resistor body',
      'Faded color bands or obscured marking code',
    ],
    mechanism:
      'Sustained overcurrent caused by a downstream short circuit drives dissipation beyond rated wattage, incinerating the resistive film into an open circuit.',
    testProcedure:
      'Measure resistance across the component out of circuit or with nearby active devices unpowered.',
    expectedResult:
      'Should match printed marking within 1%-5%. Burned resistors read open (infinite MΩ).',
    safetyNotice:
      'Hot surfaces! Component can remain dangerously hot immediately after power removal.',
    typicalTools: ['Digital Multimeter (Resistance mode)', 'Tweezers / Desoldering wick'],
  },
  {
    id: 'diode-punch-through',
    category: 'Semiconductors',
    title: 'Schottky / Rectifier Diode Thermal Punch-Through',
    designators: 'D1, D4, DS2, B1',
    visualSigns: [
      'Glass passivation fissure or epoxy packaging cracked',
      'Flux carbonization around cathode band marker',
    ],
    mechanism:
      'Reverse voltage spike exceeding breakdown threshold triggers avalanche conduction, creating a molten silicon filament between anode and cathode.',
    testProcedure:
      'Set multimeter to Diode Check mode. Measure forward bias (red probe to anode, black to cathode) and reverse bias.',
    expectedResult:
      'Silicon diode: 0.5V-0.7V forward, OL reverse. Schottky: 0.2V-0.4V forward, OL reverse. Shorted diode reads 0.00V in both directions.',
    safetyNotice:
      'Ensure zero power before performing diode checks; test voltage from external power will skew reading and could damage meter.',
    typicalTools: ['Digital Multimeter (Diode test mode)'],
  },
  {
    id: 'ldo-rail-short',
    category: 'Power Rails',
    title: 'Voltage Regulator / Power Management Rail Drop-Out',
    designators: 'U1, REG1, VR3, PMIC',
    visualSigns: [
      'Discoloration or pinhole burn mark on IC package top',
      'Melting solder mask along copper thermal plane',
    ],
    mechanism:
      'Internal pass-transistor thermal runaway or output short causes thermal shutdown or total drain-source gate punch-through, dropping 3.3V/5V rail to ground.',
    testProcedure:
      'Measure impedance from regulated rail test point to ground with unpowered board.',
    expectedResult:
      'Normal 3.3V rail impedance to ground is >100Ω. A shorted rail reads <5Ω.',
    safetyNotice:
      'Never inject high current into low-voltage CPU/MCU rails during short-finding without current limiting.',
    typicalTools: ['Bench Power Supply (Current-Limited)', 'Multimeter', 'Thermal Camera'],
  },
  {
    id: 'cold-solder-joint',
    category: 'PCB Interconnect',
    title: 'Cold Solder Joint & Trace Intermittent Fracture',
    designators: 'J1, SW1, T1, Connectors',
    visualSigns: [
      'Dull, grainy, or crystalline solder surface instead of shiny concave fillet',
      'Concentric hairline ring crack around lead through-hole pin',
      'Intermittent operation when physical pressure is applied',
    ],
    mechanism:
      'Insufficient heat during soldering or mechanical vibration fatigue fractures the intermetallic bond layer between lead and copper barrel.',
    testProcedure:
      'Measure continuity while gently flexing connector or component lead with an insulated probe.',
    expectedResult:
      'Continuous 0.0Ω. Defective joints show erratic intermittent resistance spikes.',
    safetyNotice:
      'Use proper ESD wrist grounding when probing fragile CMOS input pins.',
    typicalTools: ['Stereo Inspection Microscope / Magnifier', 'Digital Multimeter', 'Soldering Iron with flux'],
  },
];

export const KnowledgePage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const navigate = useNavigate();

  const categories = ['All', 'Capacitors', 'Resistors', 'Semiconductors', 'Power Rails', 'PCB Interconnect'];

  const filtered = FAILURE_PATTERNS.filter((p) => {
    const matchCat = selectedCategory === 'All' || p.category === selectedCategory;
    const q = search.toLowerCase().trim();
    if (!q) return matchCat;
    const matchSearch =
      p.title.toLowerCase().includes(q) ||
      p.designators.toLowerCase().includes(q) ||
      p.mechanism.toLowerCase().includes(q) ||
      p.testProcedure.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  return (
    <div className="min-h-screen bg-graphite-950 text-white">
      {/* App Shell Navigation */}
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        onStartNewDiagnosis={() => navigate('/')}
        onOpenCases={() => navigate('/')}
      />

      <TopBar
        isSidebarCollapsed={isSidebarCollapsed}
        onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
      />

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onStartNewDiagnosis={() => navigate('/')}
      />

      {/* Main Content Area */}
      <main
        className={`pt-20 pb-16 px-4 sm:px-8 transition-all duration-300 ${
          isSidebarCollapsed ? 'md:ml-20' : 'md:ml-64'
        }`}
      >
        <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
          {/* Header */}
          <div className="border-b border-white/[0.08] pb-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lime-400 font-mono text-xs uppercase tracking-widest font-semibold">
                DIAGNOSTIC KNOWLEDGE CORPUS
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-2">
              Hardware Failure Signatures &amp; Test Guides
            </h1>
            <p className="text-white/60 text-sm max-w-2xl font-light leading-relaxed">
              Explore physical failure modes, visible signs, failure mechanisms, and safe discriminating multimeter tests curated for electronics troubleshooting.
            </p>
          </div>

          {/* Search & Category Filter */}
          <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search failure signature, component (e.g. C12), or test..."
                className="w-full bg-graphite-900 border border-white/[0.1] rounded-xl px-4 py-2.5 text-xs font-mono text-white placeholder:text-white/30 focus:outline-none focus:border-lime-400"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Category Buttons */}
            <div className="flex flex-wrap gap-1.5 bg-graphite-900 p-1 rounded-xl border border-white/[0.06]">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-lime-400 text-black font-bold'
                      : 'text-white/50 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filtered.map((item) => (
              <div
                key={item.id}
                className="bg-graphite-900 border border-white/[0.08] rounded-xl p-6 shadow-xl flex flex-col justify-between space-y-4 hover:border-lime-400/40 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-lime-400/10 text-lime-400 uppercase font-semibold">
                      {item.category}
                    </span>
                    <span className="text-[10px] font-mono text-white/40">
                      Ref: {item.designators}
                    </span>
                  </div>

                  <h3 className="font-mono text-base font-bold text-white mb-2">
                    {item.title}
                  </h3>

                  {/* Visual Signs */}
                  <div className="mb-3">
                    <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider block mb-1">
                      Visual Physical Signs
                    </span>
                    <ul className="text-xs font-mono text-white/80 space-y-1 list-disc list-inside bg-graphite-950/60 p-2.5 rounded border border-white/[0.04]">
                      {item.visualSigns.map((sign, idx) => (
                        <li key={idx}>{sign}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Mechanism */}
                  <div className="mb-3">
                    <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider block mb-0.5">
                      Failure Mechanism
                    </span>
                    <p className="text-xs text-white/70 font-mono leading-relaxed">
                      {item.mechanism}
                    </p>
                  </div>

                  {/* Safe Discriminating Test */}
                  <div className="p-3 bg-lime-400/[0.04] border border-lime-400/20 rounded-lg space-y-1.5 font-mono text-xs">
                    <div className="text-lime-400 font-bold flex items-center gap-1.5">
                      <span>⚡</span>
                      <span>DISCRIMINATING TEST PROCEDURE</span>
                    </div>
                    <p className="text-white/80">{item.testProcedure}</p>
                    <div className="text-[11px] text-white/50 pt-1 border-t border-white/[0.06]">
                      <span className="text-lime-300">Expected:</span> {item.expectedResult}
                    </div>
                  </div>

                  {/* Safety Notice */}
                  <div className="mt-3 p-2 bg-amber-950/20 border border-amber-400/30 rounded text-[11px] font-mono text-amber-300/90 flex items-start gap-1.5">
                    <span className="shrink-0">⚠️</span>
                    <span>{item.safetyNotice}</span>
                  </div>
                </div>

                {/* Footer Tools & Action */}
                <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-1">
                    {item.typicalTools.map((t, idx) => (
                      <span
                        key={idx}
                        className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/[0.04] text-white/40"
                      >
                        {t}
                      </span>
                    ))}
                  </div>

                  <button
                    onClick={() => navigate('/')}
                    className="btn-primary text-xs py-1.5 px-3.5 shrink-0"
                  >
                    Diagnose Board →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};
