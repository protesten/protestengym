import { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import { X, Play, Pause, RotateCcw, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const PRESET_TIMES = [60, 90, 120, 180] as const;

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export interface RestTimerHandle {
  start: (seconds: number) => void;
}

export const RestTimer = forwardRef<RestTimerHandle>(function RestTimer(_props, ref) {
  const [isOpen, setIsOpen] = useState(false);
  const [totalTime, setTotalTime] = useState(90);
  const [remaining, setRemaining] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => {
    setIsRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const start = useCallback((seconds: number) => {
    stop();
    setTotalTime(seconds);
    setRemaining(seconds);
    setIsRunning(true);
    setIsOpen(true);
  }, [stop]);

  useImperativeHandle(ref, () => ({ start }), [start]);

  useEffect(() => {
    if (!isRunning) return;
    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          stop();
          try { navigator.vibrate?.([200, 100, 200, 100, 200]); } catch {}
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning, stop]);

  const progress = totalTime > 0 ? ((totalTime - remaining) / totalTime) * 100 : 0;
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  const finished = remaining === 0 && !isRunning && isOpen;

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 z-40 w-12 h-12 rounded-full gradient-primary text-primary-foreground flex items-center justify-center shadow-lg glow-primary hover:opacity-90 transition-opacity"
      >
        <Timer className="h-5 w-5" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-20 right-4 z-40 w-48 rounded-2xl bg-card border border-border shadow-2xl p-4 flex flex-col items-center gap-3">
      <div className="flex items-center justify-between w-full">
        <span className="text-xs font-bold text-muted-foreground">Descanso</span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { stop(); setIsOpen(false); setRemaining(0); }}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Circular progress */}
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
          <circle cx="48" cy="48" r="40" fill="none" stroke="hsl(var(--secondary))" strokeWidth="6" />
          <circle
            cx="48" cy="48" r="40" fill="none"
            stroke={finished ? 'hsl(var(--success))' : 'hsl(var(--primary))'}
            strokeWidth="6" strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-linear"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn("text-xl font-black font-mono", finished && "text-green-400")}>
            {formatTime(remaining)}
          </span>
        </div>
      </div>

      {/* Controls */}
      {isRunning ? (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="rounded-lg h-8" onClick={stop}>
            <Pause className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="sm" className="rounded-lg h-8" onClick={() => { setRemaining(totalTime); }}>
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : remaining > 0 ? (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="rounded-lg h-8" onClick={() => setIsRunning(true)}>
            <Play className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="sm" className="rounded-lg h-8" onClick={() => { setRemaining(totalTime); }}>
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5 justify-center">
          {PRESET_TIMES.map(t => (
            <Button
              key={t}
              variant="outline"
              size="sm"
              className="rounded-lg h-7 text-[11px] px-2.5 border-border hover:border-primary/30"
              onClick={() => start(t)}
            >
              {formatTime(t)}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
});
