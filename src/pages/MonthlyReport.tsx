import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateMonthlyReport, type MonthlyReport } from '@/db/monthly-report';
import { exportElementAsImage, shareElementAsImage } from '@/lib/export-utils';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ChevronLeft, ChevronRight, Download, Share2, Trophy, Dumbbell, Flame, TrendingUp, Calendar } from 'lucide-react';
import { AIInsightCard } from '@/components/AIInsightCard';
import { toast } from 'sonner';

export default function MonthlyReportPage() {
  const navigate = useNavigate();
  const [monthOffset, setMonthOffset] = useState(0);
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    generateMonthlyReport(monthOffset).then(r => { setReport(r); setLoading(false); });
  }, [monthOffset]);

  const handleDownload = async () => {
    if (!cardRef.current) return;
    await exportElementAsImage(cardRef.current, `informe-${report?.month ?? 'mensual'}.png`);
    toast.success('Imagen descargada');
  };

  const handleShare = async () => {
    if (!cardRef.current) return;
    await shareElementAsImage(cardRef.current, `Informe ${report?.month}`);
  };

  return (
    <div className="p-4 pb-24 max-w-lg mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-muted-foreground mb-4 text-sm font-medium hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" />Volver
      </button>

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-black">Informe Mensual</h1>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMonthOffset(o => o + 1)}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMonthOffset(o => Math.max(0, o - 1))} disabled={monthOffset === 0}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground py-12">Generando informe...</div>
      ) : report ? (
        <>
          {/* Exportable card */}
          <div ref={cardRef} className="rounded-2xl bg-card border border-border p-5 space-y-4">
            {/* Header */}
            <div className="text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Informe Mensual</p>
              <h2 className="text-2xl font-black capitalize text-primary mt-1">{report.month}</h2>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3">
              <StatBox icon={<Calendar className="h-4 w-4" />} label="Sesiones" value={report.sessionCount.toString()} />
              <StatBox icon={<Dumbbell className="h-4 w-4" />} label="Volumen total" value={`${(report.totalVolume / 1000).toFixed(1)}t`} />
              <StatBox icon={<Flame className="h-4 w-4" />} label="Series de trabajo" value={report.totalSets.toString()} />
              <StatBox icon={<Trophy className="h-4 w-4" />} label="PRs batidos" value={report.prsBeaten.toString()} accent />
            </div>

            {/* Frequency */}
            <div className="bg-secondary/30 rounded-xl p-3">
              <p className="text-xs text-muted-foreground mb-1">Frecuencia</p>
              <p className="text-sm font-bold">{report.avgSessionsPerWeek} sesiones/semana · {report.streakWeeks} semanas activas</p>
            </div>

            {/* Top muscles */}
            {report.topMuscles.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2 font-semibold">💪 Músculos más trabajados</p>
                <div className="flex gap-2 flex-wrap">
                  {report.topMuscles.map((m, i) => (
                    <span key={i} className="text-xs font-bold bg-primary/15 text-primary px-2.5 py-1 rounded-full">{m.name} ({m.sets}s)</span>
                  ))}
                </div>
              </div>
            )}

            {report.weakMuscles.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2 font-semibold">⚠️ Menos trabajados</p>
                <div className="flex gap-2 flex-wrap">
                  {report.weakMuscles.map((m, i) => (
                    <span key={i} className="text-xs font-bold bg-destructive/15 text-destructive px-2.5 py-1 rounded-full">{m.name} ({m.sets}s)</span>
                  ))}
                </div>
              </div>
            )}

            {/* Best 1RMs */}
            {report.best1RMs.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2 font-semibold flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Mejores 1RM estimados</p>
                <div className="space-y-1">
                  {report.best1RMs.map((r, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-muted-foreground truncate">{r.exercise}</span>
                      <span className="font-mono font-black text-primary">{r.value} kg</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Watermark */}
            <p className="text-center text-[9px] text-muted-foreground/40 font-mono pt-2">GymTracker</p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 mt-4">
            <Button className="flex-1 gradient-primary text-primary-foreground border-0 rounded-xl" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />Descargar imagen
            </Button>
            <Button variant="outline" className="flex-1 rounded-xl border-border" onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-2" />Compartir
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}

function StatBox({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl p-3 ${accent ? 'bg-primary/10 border border-primary/20' : 'bg-secondary/30'}`}>
      <div className={`flex items-center gap-1.5 mb-1 ${accent ? 'text-primary' : 'text-muted-foreground'}`}>
        {icon}
        <span className="text-xs font-semibold">{label}</span>
      </div>
      <p className={`text-2xl font-black ${accent ? 'text-primary' : 'text-foreground'}`}>{value}</p>
    </div>
  );
}
