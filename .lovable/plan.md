

## Problem

The bottom navigation bar shows 8 items (5 main + 3 more), which is too crowded on mobile screens. Additionally, some pages have content that overflows horizontally, requiring left-right scrolling.

## Plan

### 1. Redesign BottomNav to show only 5 main items + a "More" menu

- Keep the 5 main items (Inicio, Ejercicios, Rutinas, Analisis, Perfil) visible in the bottom bar
- Replace the 3 extra items (Medidas, Programas, Informe) with a "More" (Mas) button that opens a small popover/sheet upward with those links
- This reduces the nav from 8 cramped icons to 5 comfortable ones

### 2. Prevent horizontal overflow globally

- Add `overflow-x: hidden` on the root/body in `src/index.css`
- Add `w-full overflow-hidden` or `max-w-full` to the main wrapper in `App.tsx`

### 3. Fix specific pages with potential overflow

- **Analysis page** (`src/pages/Analysis.tsx`): The TabsList has 7 tabs in a row. Add `overflow-x-auto` with horizontal scroll or wrap them into 2 rows. The muscle comparison grid uses fixed `w-24` columns that may overflow -- change to responsive sizing.
- **Measurements page**: The grid layout looks fine (cols-2, cols-3) but ensure inputs don't overflow.
- **All pages**: Already use `max-w-lg mx-auto` which is good. Add `overflow-x-hidden` as a safety net.

### 4. Desktop layout

- The existing `max-w-lg mx-auto` pattern centers content nicely on desktop. No changes needed there.
- The bottom nav already has `max-w-lg mx-auto` for the inner content.

### Files to modify

- `src/components/BottomNav.tsx` -- Restructure to 5 items + "More" popover
- `src/index.css` -- Add `overflow-x: hidden` to body/html
- `src/pages/Analysis.tsx` -- Fix TabsList overflow, fix muscle grid fixed widths
- `src/App.tsx` -- Add overflow-x-hidden wrapper

