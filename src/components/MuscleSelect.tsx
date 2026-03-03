import { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MUSCLE_GROUPS } from '@/db';
import type { Muscle } from '@/db';

interface MuscleSelectProps {
  muscles: Muscle[] | undefined;
  value: number;
  onChange: (id: number) => void;
  allowNone?: boolean;
  placeholder?: string;
}

export default function MuscleSelect({ muscles, value, onChange, allowNone, placeholder = 'Seleccionar músculo...' }: MuscleSelectProps) {
  const [open, setOpen] = useState(false);
  const selectedName = value ? muscles?.find(m => m.id === value)?.name ?? '' : (allowNone ? 'Ninguno' : '');

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between font-normal">
          <span className="truncate">{selectedName || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar músculo..." />
          <CommandList>
            <CommandEmpty>No encontrado</CommandEmpty>
            {allowNone && (
              <CommandGroup>
                <CommandItem value="ninguno" onSelect={() => { onChange(0); setOpen(false); }}>
                  <Check className={cn('mr-2 h-4 w-4', value === 0 ? 'opacity-100' : 'opacity-0')} />
                  Ninguno
                </CommandItem>
              </CommandGroup>
            )}
            {Object.entries(MUSCLE_GROUPS).map(([group, names]) => {
              const groupMuscles = muscles?.filter(m => names.includes(m.name)) ?? [];
              if (groupMuscles.length === 0) return null;
              return (
                <CommandGroup key={group} heading={group}>
                  {groupMuscles.map(m => (
                    <CommandItem key={m.id} value={m.name} onSelect={() => { onChange(m.id!); setOpen(false); }}>
                      <Check className={cn('mr-2 h-4 w-4', value === m.id ? 'opacity-100' : 'opacity-0')} />
                      {m.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              );
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
