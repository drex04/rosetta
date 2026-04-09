import { useState, useLayoutEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';

interface AboutDialogProps {
  open: boolean;
  onClose: () => void;
  onGetStarted?: () => void;
}

// ── SVG Visuals ──────────────────────────────────────────────────────────────

function SilosVisual() {
  return (
    <svg viewBox="0 0 200 160" className="w-full h-full">
      {/* Radar */}
      <rect
        x="10"
        y="10"
        width="75"
        height="60"
        rx="6"
        style={{ fill: '#ef4444' }}
      />
      <text
        x="47"
        y="36"
        textAnchor="middle"
        style={{ fill: '#fff', fontSize: 11, fontWeight: 600 }}
      >
        Radar
      </text>
      {/* ESM */}
      <rect
        x="115"
        y="10"
        width="75"
        height="60"
        rx="6"
        style={{ fill: '#f97316' }}
      />
      <text
        x="152"
        y="36"
        textAnchor="middle"
        style={{ fill: '#fff', fontSize: 11, fontWeight: 600 }}
      >
        ESM
      </text>
      {/* C2 */}
      <rect
        x="10"
        y="90"
        width="75"
        height="60"
        rx="6"
        style={{ fill: '#14b8a6' }}
      />
      <text
        x="47"
        y="116"
        textAnchor="middle"
        style={{ fill: '#fff', fontSize: 11, fontWeight: 600 }}
      >
        C2
      </text>
      {/* Intel */}
      <rect
        x="115"
        y="90"
        width="75"
        height="60"
        rx="6"
        style={{ fill: '#3b82f6' }}
      />
      <text
        x="152"
        y="116"
        textAnchor="middle"
        style={{ fill: '#fff', fontSize: 11, fontWeight: 600 }}
      >
        Intel
      </text>
      {/* × marks between boxes */}
      <line x1="90" y1="40" x2="110" y2="40" stroke="#f43f5e" strokeWidth="2" />
      <line x1="97" y1="33" x2="103" y2="47" stroke="#f43f5e" strokeWidth="2" />
      <line x1="97" y1="47" x2="103" y2="33" stroke="#f43f5e" strokeWidth="2" />
      <line
        x1="90"
        y1="120"
        x2="110"
        y2="120"
        stroke="#f43f5e"
        strokeWidth="2"
      />
      <line
        x1="97"
        y1="113"
        x2="103"
        y2="127"
        stroke="#f43f5e"
        strokeWidth="2"
      />
      <line
        x1="97"
        y1="127"
        x2="103"
        y2="113"
        stroke="#f43f5e"
        strokeWidth="2"
      />
      <line x1="47" y1="75" x2="47" y2="85" stroke="#f43f5e" strokeWidth="2" />
      <line x1="40" y1="79" x2="54" y2="81" stroke="#f43f5e" strokeWidth="2" />
      <line x1="40" y1="81" x2="54" y2="79" stroke="#f43f5e" strokeWidth="2" />
      <line
        x1="152"
        y1="75"
        x2="152"
        y2="85"
        stroke="#f43f5e"
        strokeWidth="2"
      />
      <line
        x1="145"
        y1="79"
        x2="159"
        y2="81"
        stroke="#f43f5e"
        strokeWidth="2"
      />
      <line
        x1="145"
        y1="81"
        x2="159"
        y2="79"
        stroke="#f43f5e"
        strokeWidth="2"
      />
    </svg>
  );
}

function OntologyVisual() {
  return (
    <svg viewBox="0 0 200 160" className="w-full h-full">
      {/* Central circle */}
      <circle
        cx="100"
        cy="80"
        r="28"
        style={{ fill: '#0f766e', stroke: '#14b8a6', strokeWidth: 2 }}
      />
      <text
        x="100"
        y="76"
        textAnchor="middle"
        style={{ fill: '#fff', fontSize: 9, fontWeight: 700 }}
      >
        Air
      </text>
      <text
        x="100"
        y="87"
        textAnchor="middle"
        style={{ fill: '#fff', fontSize: 9, fontWeight: 700 }}
      >
        Track
      </text>
      {/* Dashed lines to nodes */}
      <line
        x1="100"
        y1="52"
        x2="100"
        y2="20"
        stroke="#14b8a6"
        strokeWidth="1.5"
        strokeDasharray="4 3"
      />
      <line
        x1="72"
        y1="80"
        x2="30"
        y2="80"
        stroke="#14b8a6"
        strokeWidth="1.5"
        strokeDasharray="4 3"
      />
      <line
        x1="128"
        y1="80"
        x2="170"
        y2="80"
        stroke="#14b8a6"
        strokeWidth="1.5"
        strokeDasharray="4 3"
      />
      <line
        x1="100"
        y1="108"
        x2="100"
        y2="140"
        stroke="#14b8a6"
        strokeWidth="1.5"
        strokeDasharray="4 3"
      />
      {/* Nodes */}
      <rect
        x="72"
        y="8"
        width="56"
        height="20"
        rx="4"
        style={{ fill: '#1e293b', stroke: '#475569', strokeWidth: 1 }}
      />
      <text
        x="100"
        y="21"
        textAnchor="middle"
        style={{ fill: '#94a3b8', fontSize: 9 }}
      >
        Radar
      </text>
      <rect
        x="2"
        y="70"
        width="38"
        height="20"
        rx="4"
        style={{ fill: '#1e293b', stroke: '#475569', strokeWidth: 1 }}
      />
      <text
        x="21"
        y="83"
        textAnchor="middle"
        style={{ fill: '#94a3b8', fontSize: 9 }}
      >
        ESM
      </text>
      <rect
        x="160"
        y="70"
        width="38"
        height="20"
        rx="4"
        style={{ fill: '#1e293b', stroke: '#475569', strokeWidth: 1 }}
      />
      <text
        x="179"
        y="83"
        textAnchor="middle"
        style={{ fill: '#94a3b8', fontSize: 9 }}
      >
        Threat
      </text>
      <rect
        x="60"
        y="132"
        width="80"
        height="20"
        rx="4"
        style={{ fill: '#1e293b', stroke: '#475569', strokeWidth: 1 }}
      />
      <text
        x="100"
        y="145"
        textAnchor="middle"
        style={{ fill: '#94a3b8', fontSize: 9 }}
      >
        C2
      </text>
    </svg>
  );
}

function StandardsVisual() {
  const layers = [
    { label: 'SPARQL', y: 10, color: '#7c3aed', text: '#e9d5ff' },
    { label: 'OWL + SHACL', y: 52, color: '#1d4ed8', text: '#bfdbfe' },
    { label: 'RDF Triples', y: 94, color: '#0f766e', text: '#99f6e4' },
    { label: 'URIs', y: 136, color: '#334155', text: '#94a3b8' },
  ];
  return (
    <svg viewBox="0 0 200 170" className="w-full h-full">
      {layers.map((l) => (
        <g key={l.label}>
          <rect
            x="16"
            y={l.y}
            width="168"
            height="32"
            rx="5"
            style={{ fill: l.color }}
          />
          <text
            x="100"
            y={l.y + 20}
            textAnchor="middle"
            style={{ fill: l.text, fontSize: 11, fontWeight: 600 }}
          >
            {l.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

function SpeedVisual() {
  const steps = [
    { n: '1', label: 'Map', color: '#0f766e' },
    { n: '2', label: 'Connect', color: '#1d4ed8' },
    { n: '3', label: 'Validate', color: '#7c3aed' },
    { n: '4', label: 'Query', color: '#d97706' },
  ];
  return (
    <svg viewBox="0 0 200 160" className="w-full h-full">
      {steps.map((s, i) => (
        <g key={s.label}>
          <rect
            x={4 + i * 48}
            y="20"
            width="40"
            height="40"
            rx="6"
            style={{ fill: s.color }}
          />
          <text
            x={24 + i * 48}
            y="36"
            textAnchor="middle"
            style={{ fill: '#fff', fontSize: 13, fontWeight: 700 }}
          >
            {s.n}
          </text>
          <text
            x={24 + i * 48}
            y="50"
            textAnchor="middle"
            style={{ fill: '#fff', fontSize: 8 }}
          >
            {s.label}
          </text>
          {i < 3 && (
            <polygon
              points={`${47 + i * 48},37 ${50 + i * 48},40 ${47 + i * 48},43`}
              style={{ fill: '#64748b' }}
            />
          )}
        </g>
      ))}
      {/* Before / After comparison */}
      <rect
        x="10"
        y="82"
        width="85"
        height="26"
        rx="4"
        style={{ fill: '#1e293b', stroke: '#475569', strokeWidth: 1 }}
      />
      <text
        x="52"
        y="94"
        textAnchor="middle"
        style={{ fill: '#94a3b8', fontSize: 8, fontWeight: 600 }}
      >
        BEFORE
      </text>
      <text
        x="52"
        y="104"
        textAnchor="middle"
        style={{ fill: '#f87171', fontSize: 9 }}
      >
        Months
      </text>
      <text
        x="105"
        y="98"
        textAnchor="middle"
        style={{ fill: '#64748b', fontSize: 12, fontWeight: 700 }}
      >
        →
      </text>
      <rect
        x="115"
        y="82"
        width="75"
        height="26"
        rx="4"
        style={{ fill: '#1e293b', stroke: '#14b8a6', strokeWidth: 1 }}
      />
      <text
        x="152"
        y="94"
        textAnchor="middle"
        style={{ fill: '#94a3b8', fontSize: 8, fontWeight: 600 }}
      >
        AFTER
      </text>
      <text
        x="152"
        y="104"
        textAnchor="middle"
        style={{ fill: '#34d399', fontSize: 9 }}
      >
        Days
      </text>
      {/* N×(N-1) vs N label */}
      <text
        x="100"
        y="130"
        textAnchor="middle"
        style={{ fill: '#64748b', fontSize: 8 }}
      >
        N×(N-1) connectors → N mappings
      </text>
    </svg>
  );
}

function DemoVisual() {
  return (
    <svg viewBox="0 0 200 160" className="w-full h-full">
      {/* JSON box */}
      <rect
        x="4"
        y="30"
        width="50"
        height="30"
        rx="5"
        style={{ fill: '#1e3a2f', stroke: '#16a34a', strokeWidth: 1.5 }}
      />
      <text
        x="29"
        y="49"
        textAnchor="middle"
        style={{ fill: '#86efac', fontSize: 10, fontWeight: 600 }}
      >
        JSON
      </text>
      {/* XML box */}
      <rect
        x="4"
        y="80"
        width="50"
        height="30"
        rx="5"
        style={{ fill: '#1e293b', stroke: '#475569', strokeWidth: 1.5 }}
      />
      <text
        x="29"
        y="99"
        textAnchor="middle"
        style={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
      >
        XML
      </text>
      {/* Arrows into mapping */}
      <line
        x1="54"
        y1="45"
        x2="74"
        y2="65"
        stroke="#64748b"
        strokeWidth="1.5"
        markerEnd="url(#arrowGray)"
      />
      <line
        x1="54"
        y1="95"
        x2="74"
        y2="75"
        stroke="#64748b"
        strokeWidth="1.5"
        markerEnd="url(#arrowGray)"
      />
      {/* Ontology Mapping box */}
      <rect
        x="74"
        y="50"
        width="60"
        height="30"
        rx="5"
        style={{ fill: '#0f2744', stroke: '#3b82f6', strokeWidth: 1.5 }}
      />
      <text
        x="104"
        y="63"
        textAnchor="middle"
        style={{ fill: '#93c5fd', fontSize: 8, fontWeight: 600 }}
      >
        Ontology
      </text>
      <text
        x="104"
        y="74"
        textAnchor="middle"
        style={{ fill: '#93c5fd', fontSize: 8, fontWeight: 600 }}
      >
        Mapping
      </text>
      {/* Arrow to output */}
      <line
        x1="134"
        y1="65"
        x2="152"
        y2="65"
        stroke="#64748b"
        strokeWidth="1.5"
        markerEnd="url(#arrowGray)"
      />
      {/* Unified COP box */}
      <rect
        x="152"
        y="50"
        width="44"
        height="30"
        rx="5"
        style={{ fill: '#0f1f2e', stroke: '#14b8a6', strokeWidth: 1.5 }}
      />
      <text
        x="174"
        y="63"
        textAnchor="middle"
        style={{ fill: '#5eead4', fontSize: 7, fontWeight: 700 }}
      >
        Unified
      </text>
      <text
        x="174"
        y="74"
        textAnchor="middle"
        style={{ fill: '#5eead4', fontSize: 7, fontWeight: 700 }}
      >
        COP
      </text>
      {/* Arrow markers */}
      <defs>
        <marker
          id="arrowGray"
          markerWidth="6"
          markerHeight="6"
          refX="3"
          refY="3"
          orient="auto"
        >
          <path d="M0,0 L0,6 L6,3 z" style={{ fill: '#64748b' }} />
        </marker>
      </defs>
      {/* Label */}
      <text
        x="100"
        y="130"
        textAnchor="middle"
        style={{ fill: '#475569', fontSize: 8 }}
      >
        All running locally in your browser
      </text>
    </svg>
  );
}

// ── Accent map ────────────────────────────────────────────────────────────────

const accentClasses: Record<string, string> = {
  red: 'bg-red-500/10 text-red-400',
  teal: 'bg-teal-600/10 text-teal-400',
  blue: 'bg-blue-500/10 text-blue-400',
  amber: 'bg-amber-500/10 text-amber-400',
};

// ── Slides ────────────────────────────────────────────────────────────────────

const SLIDES = [
  {
    tag: 'THE CHALLENGE',
    title: "Your Data Doesn't Speak the Same Language",
    body: "Air defense depends on radars, ESM sensors, C2 platforms, and intelligence databases — each with its own format and vocabulary. Today, analysts manually cross-reference tracks and reports to build the picture. It's slow, brittle, and incomplete.",
    visual: SilosVisual,
    accent: 'red',
  },
  {
    tag: 'THE SOLUTION',
    title: 'A Shared Ontology Changes Everything',
    body: 'An ontology is a formal, machine-readable description of concepts — Aircraft, Track, Threat, Sensor — and how they relate. When every system maps its data to this shared model, correlation happens automatically. No custom code. No analyst effort.',
    visual: OntologyVisual,
    accent: 'teal',
  },
  {
    tag: 'THE TECHNOLOGY',
    title: 'Built on Proven, Open Standards',
    body: 'RDF stores data as simple triples (Subject → Predicate → Object). OWL and SHACL define the ontology rules. SPARQL lets you query across everything. These are W3C standards — vendor-neutral, widely adopted in defence and intelligence, and future-proof.',
    visual: StandardsVisual,
    accent: 'blue',
  },
  {
    tag: 'THE RESULT',
    title: 'New Sources Online in Days, Not Months',
    body: 'Instead of building N×(N-1) point-to-point connectors, each source maps to one shared model. Onboarding a new feed is a four-step process: Map → Connect → Validate → Query. What used to take months now takes days.',
    visual: SpeedVisual,
    accent: 'amber',
  },
  {
    tag: 'TRY IT NOW',
    title: 'See Semantic Fusion in Action',
    body: 'Load real JSON and XML data sources, map them to a shared air defense ontology, and watch them fuse into a unified graph. Explore how ontology-driven integration delivers instant cross-source correlation — all running locally in your browser.',
    visual: DemoVisual,
    accent: 'teal',
  },
] as const;

// ── Component ─────────────────────────────────────────────────────────────────

export function AboutDialog({ open, onClose, onGetStarted }: AboutDialogProps) {
  const [slideIndex, setSlideIndex] = useState(0);
  const [animState, setAnimState] = useState<'enter' | 'exit'>('enter');

  useLayoutEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSlideIndex(0);
      setAnimState('enter');
    }
  }, [open]);

  function animateToSlide(i: number) {
    setAnimState('exit');
    setTimeout(() => {
      setSlideIndex(i);
      setAnimState('enter');
    }, 250);
  }

  const slide = SLIDES[slideIndex] ?? SLIDES[0];
  const Visual = slide.visual;
  const isLast = slideIndex === SLIDES.length - 1;

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-50" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-3xl -translate-x-1/2 -translate-y-1/2 rounded-lg shadow-2xl focus:outline-none max-w-3xl p-0 gap-0 bg-slate-900 border border-slate-700 overflow-hidden"
          aria-describedby={undefined}
        >
          <div className="flex flex-col">
            {/* Content area */}
            <div className="p-8 pb-4" style={{ minHeight: '340px' }}>
              <div
                style={{
                  opacity: animState === 'enter' ? 1 : 0,
                  transform:
                    animState === 'enter'
                      ? 'translateY(0)'
                      : 'translateY(10px)',
                  transition: 'opacity 0.25s ease, transform 0.25s ease',
                }}
              >
                {/* Tag badge */}
                <span
                  className={`inline-block px-2.5 py-0.5 rounded text-xs font-bold tracking-widest uppercase mb-4 ${accentClasses[slide.accent]}`}
                >
                  {slide.tag}
                </span>

                <div className="flex flex-row gap-7">
                  {/* Text */}
                  <div className="flex-1">
                    <Dialog.Title className="text-2xl font-bold text-slate-50 mb-3 leading-tight">
                      {slide.title}
                    </Dialog.Title>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      {slide.body}
                    </p>
                  </div>

                  {/* Visual */}
                  <div className="w-78 h-60 shrink-0 rounded-lg bg-slate-800 border border-slate-700/50 p-2 flex items-center justify-center">
                    <Visual />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-8 py-5 flex justify-between items-center border-t border-slate-800">
              {/* Progress dots */}
              <div className="flex items-center gap-2">
                {SLIDES.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => animateToSlide(i)}
                    className={`cursor-pointer transition-all duration-300 rounded-full ${
                      i === slideIndex
                        ? 'w-5 h-2 bg-teal-500'
                        : 'w-2 h-2 bg-slate-700 hover:bg-slate-500'
                    }`}
                    aria-label={`Go to slide ${i + 1}`}
                  />
                ))}
              </div>

              {/* Buttons */}
              <div className="flex items-center gap-2.5">
                {!isLast && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-slate-500"
                    onClick={onClose}
                  >
                    Skip
                  </Button>
                )}
                {slideIndex > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-slate-700"
                    onClick={() => animateToSlide(slideIndex - 1)}
                  >
                    Back
                  </Button>
                )}
                <Button
                  variant="default"
                  size="sm"
                  className="bg-teal-600 hover:bg-teal-700"
                  onClick={() => {
                    if (isLast) {
                      onGetStarted?.();
                      onClose();
                    } else {
                      animateToSlide(slideIndex + 1);
                    }
                  }}
                >
                  {isLast ? 'Get Started' : 'Next'}
                </Button>
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
