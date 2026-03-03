import { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { AnyExercise } from '@/lib/api';

interface ExerciseSearchSelectProps {
  exercises: AnyExercise[] | undefined;
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
}

export default function ExerciseSearchSelect({ exercises, value, onChange, placeholder = 'Añadir ejercicio...' }: ExerciseSearchSelectProps) {
  const [open, setOpen] = useState(false);
  const selectedName = exercises?.find(e => e.id === value)?.name;
  const predefined = exercises?.filter(e => e.source === 'predefined') ?? [];
  const personal = exercises?.filter(e => e.source === 'personal') ?? [];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="flex-1 justify-between font-normal">
          <span className={cn(!selectedName && 'text-muted-foreground')}>
            {selectedName ?? placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar ejercicio..." />
          <CommandList>
            <CommandEmpty>No encontrado</CommandEmpty>
            {predefined.length > 0 && (
              <CommandGroup heading="Predefinidos">
                {predefined.map(e => (
                  <CommandItem key={e.id} value={e.name} onSelect={() => { onChange(e.id); setOpen(false); }}>
                    <Check className={cn('mr-2 h-4 w-4', value === e.id ? 'opacity-100' : 'opacity-0')} />
                    {e.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {personal.length > 0 && (
              <CommandGroup heading="Mis ejercicios">
                {personal.map(e => (
                  <CommandItem key={e.id} value={e.name} onSelect={() => { onChange(e.id); setOpen(false); }}>
                    <Check className={cn('mr-2 h-4 w-4', value === e.id ? 'opacity-100' : 'opacity-0')} />
                    {e.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
