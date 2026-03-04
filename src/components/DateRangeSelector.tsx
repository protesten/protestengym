import { useState } from 'react';
import { format, subDays, subMonths, startOfMonth, startOfYear } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { DateRange } from '@/db/calculations';

type Preset = { label: string; value: string };

const PRESETS: Preset[] = [
  { label: 'Todo', value: 'all' },
  { label: '7d', value: '7d' },
  { label: '30d', value: '30d' },
  { label: '90d', value: '90d' },
  { label: 'Este mes', value: 'month' },
  { label: 'Este año', value: 'year' },
  { label: 'Personalizado', value: 'custom' },
];

function presetToRange(preset: string): DateRange | undefined {
  const today = format(new Date(), 'yyyy-MM-dd');
  switch (preset) {
    case 'all': return undefined;
    case '7d': return { from: format(subDays(new Date(), 6), 'yyyy-MM-dd'), to: today };
    case '30d': return { from: format(subDays(new Date(), 29), 'yyyy-MM-dd'), to: today };
    case '90d': return { from: format(subDays(new Date(), 89), 'yyyy-MM-dd'), to: today };
    case 'month': return { from: format(startOfMonth(new Date()), 'yyyy-MM-dd'), to: today };
    case 'year': return { from: format(startOfYear(new Date()), 'yyyy-MM-dd'), to: today };
    default: return undefined;
  }
}

interface Props {
  value: DateRange | undefined;
  onChange: (range: DateRange | undefined) => void;
}

export function DateRangeSelector({ value, onChange }: Props) {
  const [activePreset, setActivePreset] = useState<string>('all');
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();
  const [showCustom, setShowCustom] = useState(false);

  const handlePreset = (preset: string) => {
    setActivePreset(preset);
    if (preset === 'custom') {
      setShowCustom(true);
      return;
    }
    setShowCustom(false);
    onChange(presetToRange(preset));
  };

  const handleCustomApply = () => {
    if (customFrom && customTo) {
      const range: DateRange = {
        from: format(customFrom, 'yyyy-MM-dd'),
        to: format(customTo, 'yyyy-MM-dd'),
      };
      onChange(range);
    }
  };

  const handleClear = () => {
    setActivePreset('all');
    setShowCustom(false);
    setCustomFrom(undefined);
    setCustomTo(undefined);
    onChange(undefined);
  };

  return (
    <div className="space-y-2">
      {/* Preset buttons */}
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map(p => (
          <button
            key={p.value}
            onClick={() => handlePreset(p.value)}
            className={cn(
              'text-xs px-3 py-1 rounded-full font-semibold transition-all',
              activePreset === p.value
                ? 'gradient-primary text-primary-foreground glow-primary'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Custom date pickers */}
      {showCustom && (
        <div className="flex items-center gap-2 flex-wrap">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn('text-xs rounded-lg gap-1.5 h-8', !customFrom && 'text-muted-foreground')}>
                <CalendarIcon className="h-3 w-3" />
                {customFrom ? format(customFrom, 'dd MMM yyyy', { locale: es }) : 'Desde'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={customFrom}
                onSelect={setCustomFrom}
                initialFocus
                className="p-3 pointer-events-auto"
                disabled={(date) => date > new Date()}
              />
            </PopoverContent>
          </Popover>

          <span className="text-xs text-muted-foreground">→</span>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn('text-xs rounded-lg gap-1.5 h-8', !customTo && 'text-muted-foreground')}>
                <CalendarIcon className="h-3 w-3" />
                {customTo ? format(customTo, 'dd MMM yyyy', { locale: es }) : 'Hasta'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={customTo}
                onSelect={setCustomTo}
                initialFocus
                className="p-3 pointer-events-auto"
                disabled={(date) => date > new Date() || (customFrom ? date < customFrom : false)}
              />
            </PopoverContent>
          </Popover>

          <Button
            size="sm"
            className="text-xs h-8 rounded-lg"
            disabled={!customFrom || !customTo}
            onClick={handleCustomApply}
          >
            Aplicar
          </Button>
        </div>
      )}

      {/* Active filter indicator */}
      {value && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/30 rounded-lg px-3 py-1.5">
          <CalendarIcon className="h-3 w-3" />
          <span>
            Filtrando: <span className="font-semibold text-foreground">{value.from}</span> → <span className="font-semibold text-foreground">{value.to}</span>
          </span>
          <button onClick={handleClear} className="ml-auto p-0.5 rounded hover:bg-secondary">
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}
