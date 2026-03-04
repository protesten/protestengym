import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { ALL_FIELDS, FIELD_SECTIONS } from './fields';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Props {
  measurements: any[] | undefined;
}

export function MeasurementChart({ measurements }: Props) {
  const [chartField, setChartField] = useState('weight_kg');

  const selectedField = ALL_FIELDS.find(f => f.key === chartField)!;
  const chartData = [...(measurements ?? [])]
    .filter(m => m[chartField] != null)
    .reverse()
    .map(m => ({ date: (m.date as string).slice(5), value: m[chartField] }));

  if (chartData.length < 2) return null;

  return (
    <div className="mb-4 space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <TrendingUp className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-bold">Evolución</h3>
      </div>
      <Select value={chartField} onValueChange={setChartField}>
        <SelectTrigger className="rounded-lg bg-secondary/50 border-border text-xs h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ALL_FIELDS.map(f => (
            <SelectItem key={f.key} value={f.key} className="text-xs">{f.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="rounded-xl bg-card border border-border p-3">
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(225 12% 16%)" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(215 15% 50%)' }} />
            <YAxis tick={{ fontSize: 10, fill: 'hsl(215 15% 50%)' }} domain={['dataMin - 1', 'dataMax + 1']} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid hsl(225 12% 16%)', background: 'hsl(225 14% 11%)' }}
              formatter={(v: number) => [`${v}`, selectedField.label]}
            />
            <Line type="monotone" dataKey="value" stroke={selectedField.color} strokeWidth={2} dot={{ r: 3, fill: selectedField.color }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
