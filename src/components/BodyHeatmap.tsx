import { useState } from 'react';
import { fatigueColor } from '@/lib/fatigue-config';

interface BodyHeatmapProps {
  fatigue: Map<number, number>;
  muscleNames: Map<number, string>;
}

// Grouped muscle regions mapped to SVG areas
// Each group has a label, the muscle IDs it represents, and path data for front/back views
type MuscleRegion = {
  label: string;
  ids: number[];
  front?: string;
  back?: string;
  cx?: number;
  cy?: number;
};

const REGIONS: MuscleRegion[] = [
  // FRONT
  { label: 'Pecho', ids: [1, 2], front: 'M 85,95 Q 100,88 115,95 L 115,115 Q 100,120 85,115 Z' },
  { label: 'Deltoides Ant.', ids: [13], front: 'M 72,88 L 85,95 L 85,105 L 70,100 Z' },
  { label: 'Deltoides Ant. D', ids: [13], front: 'M 128,88 L 115,95 L 115,105 L 130,100 Z' },
  { label: 'Deltoides Lat.', ids: [14], front: 'M 68,85 L 72,88 L 70,100 L 65,97 Z' },
  { label: 'Deltoides Lat. D', ids: [14], front: 'M 132,85 L 128,88 L 130,100 L 135,97 Z' },
  { label: 'Bíceps Izq.', ids: [16, 17, 18], front: 'M 65,100 L 70,100 L 68,130 L 62,130 Z' },
  { label: 'Bíceps Der.', ids: [16, 17, 18], front: 'M 130,100 L 135,100 L 138,130 L 132,130 Z' },
  { label: 'Antebrazo Izq.', ids: [22, 23, 24], front: 'M 62,130 L 68,130 L 66,158 L 60,158 Z' },
  { label: 'Antebrazo Der.', ids: [22, 23, 24], front: 'M 132,130 L 138,130 L 140,158 L 134,158 Z' },
  { label: 'Abdominales', ids: [45, 46, 47, 48], front: 'M 88,118 L 112,118 L 112,155 L 88,155 Z' },
  { label: 'Cuádriceps Izq.', ids: [25, 26, 27, 28], front: 'M 82,160 L 97,160 L 95,215 L 80,215 Z' },
  { label: 'Cuádriceps Der.', ids: [25, 26, 27, 28], front: 'M 103,160 L 118,160 L 120,215 L 105,215 Z' },
  { label: 'Aductores Izq.', ids: [38, 39, 40, 41, 42], front: 'M 93,160 L 100,160 L 100,200 L 93,200 Z' },
  { label: 'Aductores Der.', ids: [38, 39, 40, 41, 42], front: 'M 100,160 L 107,160 L 107,200 L 100,200 Z' },
  { label: 'Tibial Izq.', ids: [44], front: 'M 82,220 L 92,220 L 90,265 L 82,265 Z' },
  { label: 'Tibial Der.', ids: [44], front: 'M 108,220 L 118,220 L 118,265 L 110,265 Z' },

  // BACK
  { label: 'Trapecio', ids: [4, 5, 6], back: 'M 88,80 L 100,72 L 112,80 L 112,100 L 88,100 Z' },
  { label: 'Deltoides Post.', ids: [15], back: 'M 68,85 L 75,88 L 73,100 L 65,97 Z' },
  { label: 'Deltoides Post. D', ids: [15], back: 'M 132,85 L 125,88 L 127,100 L 135,97 Z' },
  { label: 'Dorsal', ids: [3, 7, 8, 9, 10, 11, 49], back: 'M 82,100 L 118,100 L 120,140 L 80,140 Z' },
  { label: 'Tríceps Izq.', ids: [19, 20, 21], back: 'M 62,100 L 68,100 L 66,132 L 60,132 Z' },
  { label: 'Tríceps Der.', ids: [19, 20, 21], back: 'M 132,100 L 138,100 L 140,132 L 134,132 Z' },
  { label: 'Erectores', ids: [12], back: 'M 93,105 L 107,105 L 107,155 L 93,155 Z' },
  { label: 'Glúteos', ids: [29, 30, 31, 43, 50], back: 'M 82,150 L 118,150 L 118,175 L 82,175 Z' },
  { label: 'Isquios Izq.', ids: [32, 33, 34], back: 'M 82,178 L 97,178 L 95,220 L 80,220 Z' },
  { label: 'Isquios Der.', ids: [32, 33, 34], back: 'M 103,178 L 118,178 L 120,220 L 105,220 Z' },
  { label: 'Gemelos Izq.', ids: [35, 36, 37], back: 'M 80,222 L 93,222 L 91,265 L 80,265 Z' },
  { label: 'Gemelos Der.', ids: [35, 36, 37], back: 'M 107,222 L 120,222 L 120,265 L 109,265 Z' },
];

function getRegionFatigue(ids: number[], fatigue: Map<number, number>): number {
  let max = 0;
  for (const id of ids) {
    max = Math.max(max, fatigue.get(id) ?? 0);
  }
  return max;
}

export function BodyHeatmap({ fatigue, muscleNames }: BodyHeatmapProps) {
  const [tooltip, setTooltip] = useState<{ label: string; pct: number; x: number; y: number } | null>(null);

  const renderRegion = (region: MuscleRegion, pathData: string, index: number) => {
    const pct = getRegionFatigue(region.ids, fatigue);
    const color = fatigueColor(pct);
    return (
      <path
        key={`${region.label}-${index}`}
        d={pathData}
        fill={color}
        fillOpacity={0.75}
        stroke="hsl(var(--border))"
        strokeWidth={0.5}
        className="cursor-pointer transition-all hover:fill-opacity-100"
        onMouseEnter={(e) => {
          const rect = (e.target as SVGElement).closest('svg')!.getBoundingClientRect();
          setTooltip({ label: region.label, pct: Math.round(pct), x: e.clientX - rect.left, y: e.clientY - rect.top });
        }}
        onMouseLeave={() => setTooltip(null)}
        onTouchStart={(e) => {
          const rect = (e.target as SVGElement).closest('svg')!.getBoundingClientRect();
          const touch = e.touches[0];
          setTooltip({ label: region.label, pct: Math.round(pct), x: touch.clientX - rect.left, y: touch.clientY - rect.top });
        }}
      />
    );
  };

  return (
    <div className="grid grid-cols-2 gap-2">
      {/* Front view */}
      <div className="relative">
        <p className="text-xs text-muted-foreground text-center mb-1 font-semibold">Frontal</p>
        <svg viewBox="55 60 90 220" className="w-full" style={{ maxHeight: 360 }}>
          {/* Silhouette */}
          <path d="M 100,65 Q 92,65 90,72 Q 88,80 90,85 Q 92,88 95,88 L 100,88 L 105,88 Q 108,88 110,85 Q 112,80 110,72 Q 108,65 100,65 Z" fill="hsl(var(--muted))" fillOpacity={0.3} stroke="hsl(var(--border))" strokeWidth={0.5} />
          <path d="M 85,90 L 65,95 L 58,158 L 68,160 L 72,135 L 85,115 Z" fill="hsl(var(--muted))" fillOpacity={0.15} stroke="hsl(var(--border))" strokeWidth={0.3} />
          <path d="M 115,90 L 135,95 L 142,158 L 132,160 L 128,135 L 115,115 Z" fill="hsl(var(--muted))" fillOpacity={0.15} stroke="hsl(var(--border))" strokeWidth={0.3} />
          <path d="M 85,155 L 82,160 L 78,270 L 92,270 L 97,160 Z" fill="hsl(var(--muted))" fillOpacity={0.15} stroke="hsl(var(--border))" strokeWidth={0.3} />
          <path d="M 115,155 L 118,160 L 122,270 L 108,270 L 103,160 Z" fill="hsl(var(--muted))" fillOpacity={0.15} stroke="hsl(var(--border))" strokeWidth={0.3} />
          <rect x="85" y="90" width="30" height="65" rx="3" fill="hsl(var(--muted))" fillOpacity={0.15} stroke="hsl(var(--border))" strokeWidth={0.3} />
          {/* Muscle overlays */}
          {REGIONS.filter(r => r.front).map((r, i) => renderRegion(r, r.front!, i))}
          {tooltip && (
            <g>
              <rect x={Math.min(tooltip.x, 110)} y={tooltip.y - 22} width={60} height={18} rx={4} fill="hsl(var(--popover))" stroke="hsl(var(--border))" strokeWidth={0.5} />
              <text x={Math.min(tooltip.x, 110) + 30} y={tooltip.y - 10} textAnchor="middle" fontSize={6} fill="hsl(var(--popover-foreground))" fontWeight="bold">
                {tooltip.label} {tooltip.pct}%
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* Back view */}
      <div className="relative">
        <p className="text-xs text-muted-foreground text-center mb-1 font-semibold">Posterior</p>
        <svg viewBox="55 60 90 220" className="w-full" style={{ maxHeight: 360 }}>
          {/* Silhouette */}
          <path d="M 100,65 Q 92,65 90,72 Q 88,80 90,85 Q 92,88 95,88 L 100,88 L 105,88 Q 108,88 110,85 Q 112,80 110,72 Q 108,65 100,65 Z" fill="hsl(var(--muted))" fillOpacity={0.3} stroke="hsl(var(--border))" strokeWidth={0.5} />
          <path d="M 85,90 L 65,95 L 58,158 L 68,160 L 72,135 L 85,115 Z" fill="hsl(var(--muted))" fillOpacity={0.15} stroke="hsl(var(--border))" strokeWidth={0.3} />
          <path d="M 115,90 L 135,95 L 142,158 L 132,160 L 128,135 L 115,115 Z" fill="hsl(var(--muted))" fillOpacity={0.15} stroke="hsl(var(--border))" strokeWidth={0.3} />
          <path d="M 85,155 L 82,160 L 78,270 L 92,270 L 97,160 Z" fill="hsl(var(--muted))" fillOpacity={0.15} stroke="hsl(var(--border))" strokeWidth={0.3} />
          <path d="M 115,155 L 118,160 L 122,270 L 108,270 L 103,160 Z" fill="hsl(var(--muted))" fillOpacity={0.15} stroke="hsl(var(--border))" strokeWidth={0.3} />
          <rect x="80" y="90" width="40" height="65" rx="3" fill="hsl(var(--muted))" fillOpacity={0.15} stroke="hsl(var(--border))" strokeWidth={0.3} />
          {/* Muscle overlays */}
          {REGIONS.filter(r => r.back).map((r, i) => renderRegion(r, r.back!, i))}
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
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: l.color }} />
            <span className="text-[10px] text-muted-foreground">{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
