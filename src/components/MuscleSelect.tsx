import { useState } from 'react';
import { Check, ChevronsUpDown, X, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MUSCLE_GROUPS } from '@/lib/constants';
import MuscleActivationDialog from '@/components/MuscleActivationDialog';
import type { Muscle } from '@/lib/api';

interface MuscleSelectProps {
  muscles: Muscle[] | undefined;
  value: number[];
  onChange: (ids: number[]) => void;
  placeholder?: string;
}

export default function MuscleSelect({ muscles, value, onChange, placeholder = 'Seleccionar músculos...' }: MuscleSelectProps) {
  const [open, setOpen] = useState(false);
  const [activationOpen, setActivationOpen] = useState(false);
  const selectedNames = value.map(id => muscles?.find(m => m.id === id)?.name).filter(Boolean) as string[];

  function toggle(id: number) {
    if (value.includes(id)) {
      onChange(value.filter(v => v !== id));
    } else {
      onChange([...value, id]);
    }
  }

  function removeId(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    onChange(value.filter(v => v !== id));
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between font-normal h-auto min-h-10">
            <div className="flex flex-wrap gap-1 flex-1">
              {selectedNames.length === 0 && <span className="text-muted-foreground">{placeholder}</span>}
              {value.map(id => {
                const name = muscles?.find(m => m.id === id)?.name;
                if (!name) return null;
                return (
                  <Badge key={id} variant="secondary" className="text-xs">
                    {name}
                    <X className="ml-1 h-3 w-3 cursor-pointer" onClick={(e) => removeId(id, e)} />
                  </Badge>
                );
              })}
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar músculo..." />
            <CommandList>
              <CommandEmpty>No encontrado</CommandEmpty>
              {Object.entries(MUSCLE_GROUPS).map(([group, names]) => {
                const groupMuscles = muscles?.filter(m => names.includes(m.name)) ?? [];
                if (groupMuscles.length === 0) return null;
                return (
                  <CommandGroup key={group} heading={group}>
                    {groupMuscles.map(m => (
                      <CommandItem key={m.id} value={m.name} onSelect={() => toggle(m.id)}>
                        <Check className={cn('mr-2 h-4 w-4', value.includes(m.id) ? 'opacity-100' : 'opacity-0')} />
                        {m.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                );
              })}
              {/* Show active muscles not in any MUSCLE_GROUPS */}
              {(() => {
                const allGroupNames = Object.values(MUSCLE_GROUPS).flat();
                const ungrouped = muscles?.filter(m => !allGroupNames.includes(m.name)) ?? [];
                if (ungrouped.length === 0) return null;
                return (
                  <CommandGroup heading="Otros">
                    {ungrouped.map(m => (
                      <CommandItem key={m.id} value={m.name} onSelect={() => toggle(m.id)}>
                        <Check className={cn('mr-2 h-4 w-4', value.includes(m.id) ? 'opacity-100' : 'opacity-0')} />
                        {m.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                );
              })()}
              <CommandGroup>
                <CommandItem value="__activate__" onSelect={() => { setOpen(false); setActivationOpen(true); }}>
                  <Settings2 className="mr-2 h-4 w-4 text-primary" />
                  <span className="text-primary font-medium">Activar más músculos</span>
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <MuscleActivationDialog open={activationOpen} onOpenChange={setActivationOpen} />
    </>
  );
}
