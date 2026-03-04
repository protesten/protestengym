import { useState, useCallback } from 'react';
import { fatigueColor } from '@/lib/fatigue-config';

interface BodyHeatmapProps {
  fatigue: Map<number, number>;
  muscleNames: Map<number, string>;
  activeMuscleIds?: Set<number>;
}

type MuscleRegion = {
  label: string;
  ids: number[];
  paths: string[];
  view: 'front' | 'back';
};

// Anatomically detailed muscle regions with precise SVG paths
// Body is centered at x=100, head top ~28, feet ~290
// Front and back views side by side
const REGIONS: MuscleRegion[] = [
  // =================== FRONT VIEW ===================

  // --- CHEST ---
  {
    label: 'Pectoral Mayor',
    ids: [1, 2],
    view: 'front',
    paths: [
      // Left pec
      'M 82,82 Q 78,84 76,88 Q 75,92 76,97 Q 78,102 84,106 Q 90,108 96,107 L 96,96 Q 96,88 92,84 Q 88,81 82,82 Z',
      // Right pec
      'M 118,82 Q 122,84 124,88 Q 125,92 124,97 Q 122,102 116,106 Q 110,108 104,107 L 104,96 Q 104,88 108,84 Q 112,81 118,82 Z',
    ],
  },

  // --- DELTOIDS ANTERIOR ---
  {
    label: 'Deltoides Ant.',
    ids: [13],
    view: 'front',
    paths: [
      // Left anterior delt
      'M 76,72 Q 72,74 70,78 Q 68,82 70,88 L 76,88 Q 78,84 78,80 Q 78,75 76,72 Z',
      // Right anterior delt
      'M 124,72 Q 128,74 130,78 Q 132,82 130,88 L 124,88 Q 122,84 122,80 Q 122,75 124,72 Z',
    ],
  },

  // --- DELTOIDS LATERAL ---
  {
    label: 'Deltoides Lat.',
    ids: [14],
    view: 'front',
    paths: [
      // Left lateral delt
      'M 72,70 Q 66,72 64,78 Q 62,84 64,90 L 70,88 Q 68,82 70,76 Q 71,72 72,70 Z',
      // Right lateral delt
      'M 128,70 Q 134,72 136,78 Q 138,84 136,90 L 130,88 Q 132,82 130,76 Q 129,72 128,70 Z',
    ],
  },

  // --- BICEPS ---
  {
    label: 'Bíceps',
    ids: [16, 17, 18],
    view: 'front',
    paths: [
      // Left biceps
      'M 64,92 Q 62,94 60,100 Q 58,108 60,116 Q 62,122 66,124 Q 70,122 72,116 Q 74,108 72,100 Q 70,94 68,92 Z',
      // Right biceps
      'M 136,92 Q 138,94 140,100 Q 142,108 140,116 Q 138,122 134,124 Q 130,122 128,116 Q 126,108 128,100 Q 130,94 132,92 Z',
    ],
  },

  // --- FOREARMS ---
  {
    label: 'Antebrazo',
    ids: [22, 23, 24],
    view: 'front',
    paths: [
      // Left forearm
      'M 60,126 Q 58,130 56,140 Q 54,150 54,158 Q 55,164 58,166 Q 62,164 64,158 Q 66,150 66,140 Q 66,132 64,126 Z',
      // Right forearm
      'M 140,126 Q 142,130 144,140 Q 146,150 146,158 Q 145,164 142,166 Q 138,164 136,158 Q 134,150 134,140 Q 134,132 136,126 Z',
    ],
  },

  // --- ABS ---
  {
    label: 'Recto Abdominal',
    ids: [45],
    view: 'front',
    paths: [
      'M 93,108 L 107,108 Q 108,120 108,132 Q 108,144 106,154 L 94,154 Q 92,144 92,132 Q 92,120 93,108 Z',
    ],
  },

  // --- OBLIQUES ---
  {
    label: 'Oblicuos',
    ids: [46, 47, 48],
    view: 'front',
    paths: [
      // Left oblique
      'M 84,108 L 93,108 Q 92,120 92,135 Q 92,148 94,154 L 86,154 Q 82,146 80,135 Q 79,124 80,114 Z',
      // Right oblique
      'M 116,108 L 107,108 Q 108,120 108,135 Q 108,148 106,154 L 114,154 Q 118,146 120,135 Q 121,124 120,114 Z',
    ],
  },

  // --- QUADRICEPS ---
  {
    label: 'Cuádriceps',
    ids: [25, 26, 27, 28],
    view: 'front',
    paths: [
      // Left quad
      'M 82,160 Q 78,162 76,170 Q 74,182 76,196 Q 78,210 80,220 Q 82,226 86,228 Q 92,228 94,224 Q 96,218 96,208 Q 96,196 94,182 Q 92,170 90,164 Q 88,160 82,160 Z',
      // Right quad
      'M 118,160 Q 122,162 124,170 Q 126,182 124,196 Q 122,210 120,220 Q 118,226 114,228 Q 108,228 106,224 Q 104,218 104,208 Q 104,196 106,182 Q 108,170 110,164 Q 112,160 118,160 Z',
    ],
  },

  // --- ADDUCTORS ---
  {
    label: 'Aductores',
    ids: [38, 39, 40, 41, 42],
    view: 'front',
    paths: [
      // Left adductor
      'M 90,160 Q 94,164 96,172 Q 98,182 98,194 Q 96,204 94,210 L 90,210 Q 88,200 88,190 Q 88,178 88,168 Q 88,162 90,160 Z',
      // Right adductor
      'M 110,160 Q 106,164 104,172 Q 102,182 102,194 Q 104,204 106,210 L 110,210 Q 112,200 112,190 Q 112,178 112,168 Q 112,162 110,160 Z',
    ],
  },

  // --- TIBIALIS ---
  {
    label: 'Tibial Anterior',
    ids: [44],
    view: 'front',
    paths: [
      // Left shin
      'M 80,232 Q 78,236 78,248 Q 78,258 80,268 Q 82,274 84,276 Q 88,274 88,268 Q 90,258 88,248 Q 86,238 84,232 Z',
      // Right shin
      'M 120,232 Q 122,236 122,248 Q 122,258 120,268 Q 118,274 116,276 Q 112,274 112,268 Q 110,258 112,248 Q 114,238 116,232 Z',
    ],
  },

  // =================== BACK VIEW ===================

  // --- TRAPEZIUS ---
  {
    label: 'Trapecio',
    ids: [4, 5, 6],
    view: 'back',
    paths: [
      'M 88,62 Q 84,66 80,72 Q 76,78 76,82 L 84,84 Q 90,78 96,74 L 100,72 L 104,74 Q 110,78 116,84 L 124,82 Q 124,78 120,72 Q 116,66 112,62 Q 106,58 100,56 Q 94,58 88,62 Z',
    ],
  },

  // --- DELTOIDS POSTERIOR ---
  {
    label: 'Deltoides Post.',
    ids: [15],
    view: 'back',
    paths: [
      // Left posterior delt
      'M 72,70 Q 66,74 64,80 Q 62,86 64,90 L 70,88 Q 68,82 70,76 L 76,72 Z',
      // Right posterior delt
      'M 128,70 Q 134,74 136,80 Q 138,86 136,90 L 130,88 Q 132,82 130,76 L 124,72 Z',
    ],
  },

  // --- INFRASPINATUS / TERES ---
  {
    label: 'Infraespinoso',
    ids: [11, 9, 10],
    view: 'back',
    paths: [
      // Left infraspinatus
      'M 78,84 L 84,84 Q 88,88 92,92 L 92,100 Q 88,98 84,96 Q 80,94 78,90 Z',
      // Right infraspinatus
      'M 122,84 L 116,84 Q 112,88 108,92 L 108,100 Q 112,98 116,96 Q 120,94 122,90 Z',
    ],
  },

  // --- LATS ---
  {
    label: 'Dorsal Ancho',
    ids: [3],
    view: 'back',
    paths: [
      // Left lat
      'M 78,92 Q 76,96 74,102 Q 72,112 74,122 Q 76,132 80,140 L 90,140 Q 90,130 90,118 Q 90,106 92,98 L 92,92 Q 86,94 78,92 Z',
      // Right lat
      'M 122,92 Q 124,96 126,102 Q 128,112 126,122 Q 124,132 120,140 L 110,140 Q 110,130 110,118 Q 110,106 108,98 L 108,92 Q 114,94 122,92 Z',
    ],
  },

  // --- RHOMBOIDS ---
  {
    label: 'Romboides',
    ids: [7, 8],
    view: 'back',
    paths: [
      'M 92,84 L 100,80 L 108,84 L 108,100 Q 104,96 100,94 Q 96,96 92,100 Z',
    ],
  },

  // --- ERECTOR SPINAE ---
  {
    label: 'Erectores',
    ids: [12],
    view: 'back',
    paths: [
      // Left erector
      'M 94,100 Q 92,110 92,122 Q 92,134 94,146 Q 96,152 98,154 L 100,154 L 100,100 Z',
      // Right erector
      'M 106,100 Q 108,110 108,122 Q 108,134 106,146 Q 104,152 102,154 L 100,154 L 100,100 Z',
    ],
  },

  // --- TRICEPS ---
  {
    label: 'Tríceps',
    ids: [19, 20, 21],
    view: 'back',
    paths: [
      // Left triceps
      'M 64,92 Q 62,96 60,104 Q 58,112 60,120 Q 62,126 66,128 Q 70,126 72,120 Q 74,112 72,104 Q 70,96 68,92 Z',
      // Right triceps
      'M 136,92 Q 138,96 140,104 Q 142,112 140,120 Q 138,126 134,128 Q 130,126 128,120 Q 126,112 128,104 Q 130,96 132,92 Z',
    ],
  },

  // --- GLUTES ---
  {
    label: 'Glúteos',
    ids: [29, 30, 31, 43, 50],
    view: 'back',
    paths: [
      // Left glute
      'M 82,148 Q 78,152 76,158 Q 74,164 76,170 Q 80,176 86,178 Q 92,178 96,174 Q 100,170 100,164 Q 100,158 98,154 Q 94,150 88,148 Z',
      // Right glute
      'M 118,148 Q 122,152 124,158 Q 126,164 124,170 Q 120,176 114,178 Q 108,178 104,174 Q 100,170 100,164 Q 100,158 102,154 Q 106,150 112,148 Z',
    ],
  },

  // --- HAMSTRINGS ---
  {
    label: 'Isquiotibiales',
    ids: [32, 33, 34],
    view: 'back',
    paths: [
      // Left hamstring
      'M 80,180 Q 76,186 76,196 Q 76,208 78,218 Q 80,226 84,230 Q 88,230 92,226 Q 94,218 94,208 Q 94,196 92,186 Q 90,180 86,180 Z',
      // Right hamstring
      'M 120,180 Q 124,186 124,196 Q 124,208 122,218 Q 120,226 116,230 Q 112,230 108,226 Q 106,218 106,208 Q 106,196 108,186 Q 110,180 114,180 Z',
    ],
  },

  // --- CALVES ---
  {
    label: 'Gemelos',
    ids: [35, 36, 37],
    view: 'back',
    paths: [
      // Left calf
      'M 78,234 Q 76,240 76,250 Q 76,260 78,268 Q 80,274 84,276 Q 88,274 90,268 Q 92,260 92,250 Q 90,240 88,234 Z',
      // Right calf
      'M 122,234 Q 124,240 124,250 Q 124,260 122,268 Q 120,274 116,276 Q 112,274 110,268 Q 108,260 108,250 Q 110,240 112,234 Z',
    ],
  },

  // --- SERRATUS (front) ---
  {
    label: 'Serrato Anterior',
    ids: [49],
    view: 'front',
    paths: [
      // Left serratus
      'M 78,100 Q 76,104 76,110 L 84,112 Q 84,106 82,100 Z',
      // Right serratus
      'M 122,100 Q 124,104 124,110 L 116,112 Q 116,106 118,100 Z',
    ],
  },
];

function getRegionFatigue(ids: number[], fatigue: Map<number, number>): number {
  let max = 0;
  for (const id of ids) {
    max = Math.max(max, fatigue.get(id) ?? 0);
  }
  return max;
}

// Silhouette paths for body outline
const FRONT_SILHOUETTE = [
  // Head
  'M 100,30 Q 90,30 88,38 Q 86,46 88,52 Q 90,58 94,60 L 96,62 L 100,64 L 104,62 L 106,60 Q 110,58 112,52 Q 114,46 112,38 Q 110,30 100,30 Z',
  // Neck
  'M 94,62 L 92,70 L 108,70 L 106,62 Z',
  // Torso
  'M 76,72 Q 72,74 70,80 L 64,90 L 58,126 L 54,160 Q 54,166 58,168 L 62,128 L 68,92 L 76,88 L 84,108 L 84,154 Q 82,156 82,160 L 76,228 L 78,282 L 90,284 L 96,228 L 100,200 L 104,228 L 110,284 L 122,282 L 124,228 Q 118,156 116,154 L 116,108 L 124,88 L 132,92 L 138,128 L 142,168 Q 146,166 146,160 L 142,126 L 136,90 L 130,80 Q 128,74 124,72 Z',
];

const BACK_SILHOUETTE = FRONT_SILHOUETTE; // Same outline for back

export function BodyHeatmap({ fatigue, muscleNames, activeMuscleIds }: BodyHeatmapProps) {
  const [tooltip, setTooltip] = useState<{ label: string; pct: number; x: number; y: number } | null>(null);

  const handleMouseEnter = useCallback((region: MuscleRegion, pct: number, e: React.MouseEvent<SVGPathElement>) => {
    const svg = (e.target as SVGElement).closest('svg')!;
    const rect = svg.getBoundingClientRect();
    setTooltip({
      label: region.label,
      pct: Math.round(pct),
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }, []);

  const handleTouchStart = useCallback((region: MuscleRegion, pct: number, e: React.TouchEvent<SVGPathElement>) => {
    const svg = (e.target as SVGElement).closest('svg')!;
    const rect = svg.getBoundingClientRect();
    const touch = e.touches[0];
    setTooltip({
      label: region.label,
      pct: Math.round(pct),
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    });
  }, []);

  const handleLeave = useCallback(() => setTooltip(null), []);

  const renderRegions = (view: 'front' | 'back') => {
    return REGIONS
      .filter(r => r.view === view)
      .filter(r => !activeMuscleIds || r.ids.some(id => activeMuscleIds.has(id)))
      .map((region, ri) => {
        const pct = getRegionFatigue(region.ids, fatigue);
        const color = fatigueColor(pct);
        return region.paths.map((d, pi) => (
          <path
            key={`${region.label}-${ri}-${pi}`}
            d={d}
            fill={color}
            fillOpacity={0.8}
            stroke="hsl(var(--border))"
            strokeWidth={0.4}
            className="cursor-pointer transition-all duration-200 hover:fill-opacity-100 hover:brightness-110"
            style={{ filter: pct > 60 ? `drop-shadow(0 0 2px ${color})` : undefined }}
            onMouseEnter={(e) => handleMouseEnter(region, pct, e)}
            onMouseLeave={handleLeave}
            onTouchStart={(e) => handleTouchStart(region, pct, e)}
          />
        ));
      });
  };

  const renderSilhouette = () => (
    <>
      {FRONT_SILHOUETTE.map((d, i) => (
        <path
          key={`sil-${i}`}
          d={d}
          fill="hsl(var(--muted))"
          fillOpacity={0.12}
          stroke="hsl(var(--border))"
          strokeWidth={0.3}
        />
      ))}
    </>
  );

  const renderTooltip = () => {
    if (!tooltip) return null;
    const boxW = 70;
    const tx = Math.max(10, Math.min(tooltip.x - boxW / 2, 130));
    return (
      <g>
        <rect
          x={tx}
          y={tooltip.y - 24}
          width={boxW}
          height={20}
          rx={4}
          fill="hsl(var(--popover))"
          stroke="hsl(var(--border))"
          strokeWidth={0.5}
          fillOpacity={0.95}
        />
        <text
          x={tx + boxW / 2}
          y={tooltip.y - 11}
          textAnchor="middle"
          fontSize={5.5}
          fill="hsl(var(--popover-foreground))"
          fontWeight="bold"
        >
          {tooltip.label} {tooltip.pct}%
        </text>
      </g>
    );
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Front view */}
      <div className="relative">
        <p className="text-xs text-muted-foreground text-center mb-1 font-semibold tracking-wide uppercase">
          Frontal
        </p>
        <svg viewBox="50 24 100 268" className="w-full" style={{ maxHeight: 380 }}>
          {renderSilhouette()}
          {renderRegions('front')}
          {renderTooltip()}
        </svg>
      </div>

      {/* Back view */}
      <div className="relative">
        <p className="text-xs text-muted-foreground text-center mb-1 font-semibold tracking-wide uppercase">
          Posterior
        </p>
        <svg viewBox="50 24 100 268" className="w-full" style={{ maxHeight: 380 }}>
          {renderSilhouette()}
          {renderRegions('back')}
        </svg>
      </div>

      {/* Legend */}
      <div className="col-span-2 flex items-center justify-center gap-3 mt-1">
        {[
          { label: '<30%', color: 'hsl(140 60% 45%)' },
          { label: '30-60%', color: 'hsl(45 90% 50%)' },
          { label: '60-85%', color: 'hsl(25 90% 50%)' },
          { label: '>85%', color: 'hsl(0 80% 50%)' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm border border-border/50" style={{ backgroundColor: l.color }} />
            <span className="text-[10px] text-muted-foreground">{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
