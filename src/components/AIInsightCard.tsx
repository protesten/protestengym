import { useState, useCallback } from 'react';
import { Sparkles, X, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchInsight, type InsightContext } from '@/lib/ai-insights';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';

// In-memory cache to avoid redundant calls within the same session
const insightCache = new Map<string, string>();

interface AIInsightCardProps {
  context: InsightContext;
  data: Record<string, unknown>;
  /** Unique cache key to distinguish same context with different data */
  cacheKey?: string;
  /** Compact mode for inline use */
  compact?: boolean;
  /** Custom button label */
  label?: string;
  /** Auto-fetch on mount */
  autoFetch?: boolean;
}

export function AIInsightCard({ context, data, cacheKey, compact = false, label, autoFetch = false }: AIInsightCardProps) {
  const fullKey = `${context}:${cacheKey ?? JSON.stringify(data)}`;
  const cached = insightCache.get(fullKey);

  const [insight, setInsight] = useState<string>(cached ?? '');
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(!!cached || autoFetch);
  const [cooldown, setCooldown] = useState(false);

  const doFetch = useCallback(async () => {
    if (cooldown) return;
    setLoading(true);
    try {
      const result = await fetchInsight(context, data);
      setInsight(result);
      insightCache.set(fullKey, result);
    } catch (e: any) {
      toast.error(e.message ?? 'Error al analizar');
    } finally {
      setLoading(false);
      setCooldown(true);
      setTimeout(() => setCooldown(false), 30000);
    }
  }, [context, data, fullKey, cooldown]);

  // Auto-fetch on first render if autoFetch and no cache
  useState(() => {
    if (autoFetch && !cached) {
      setVisible(true);
      doFetch();
    }
  });

  if (!visible) {
    return (
      <Button
        variant="outline"
        size={compact ? 'sm' : 'default'}
        className={`gap-1.5 border-primary/20 text-primary hover:bg-primary/5 hover:border-primary/40 transition-all ${
          compact ? 'h-7 text-[10px] rounded-lg px-2.5' : 'rounded-xl text-xs font-semibold w-full'
        }`}
        onClick={() => {
          setVisible(true);
          if (!insight) doFetch();
        }}
      >
        <Sparkles className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
        {label ?? '✨ Analizar con IA'}
      </Button>
    );
  }

  return (
    <div className={`rounded-xl border border-primary/20 bg-primary/[0.03] ${compact ? 'p-2.5' : 'p-3'}`}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Análisis IA</span>
        </div>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-primary"
            onClick={doFetch}
            disabled={loading || cooldown}
            title="Regenerar"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            onClick={() => { setVisible(false); setInsight(''); }}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {loading && !insight ? (
        <div className="flex items-center gap-2 py-2">
          <div className="h-1 w-12 bg-primary/30 rounded-full overflow-hidden">
            <div className="h-full w-1/2 bg-primary rounded-full animate-pulse" />
          </div>
          <span className="text-[10px] text-muted-foreground">Analizando...</span>
        </div>
      ) : insight ? (
        <div className="prose prose-sm prose-invert max-w-none text-xs text-foreground/90 leading-relaxed [&_p]:mb-1 [&_ul]:mb-1 [&_li]:mb-0.5 [&_strong]:text-primary [&_h1]:text-sm [&_h2]:text-xs [&_h3]:text-xs">
          <ReactMarkdown>{insight}</ReactMarkdown>
        </div>
      ) : null}
    </div>
  );
}
