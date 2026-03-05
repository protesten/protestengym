

## Añadir Video a Ejercicios

### Concepto
Añadir un campo `video_url` a las tablas `exercises` y `predefined_exercises` para que cada ejercicio pueda tener un enlace a video (YouTube, etc.). Durante el entreno, mostrar un icono de video junto al nombre del ejercicio si tiene URL configurada. En la página de ejercicios, mostrar el video embebido.

### Cambios

**1. DB Migration**: Añadir columna `video_url` (text, nullable) a `exercises` y `predefined_exercises`.

**2. `src/lib/api.ts`**: Actualizar `AnyExercise` para incluir `video_url`. Pasar el campo en `getAllExercises`.

**3. Formularios de ejercicio** (`Exercises.tsx`, `CreateExerciseDialog.tsx`): Añadir campo de input para URL de video en el form `ExForm`.

**4. `src/pages/SessionDetail.tsx`**: En el header de cada ejercicio, si tiene `video_url`, mostrar un icono `Video` (de lucide) que abre el enlace en nueva pestaña.

**5. `src/pages/Exercises.tsx`**: En cada fila de ejercicio, mostrar icono de video si existe. Al abrir edición o consulta, mostrar el video embebido (iframe de YouTube o enlace directo).

**6. Nuevo componente `src/components/VideoPreview.tsx`**: Componente que detecta si la URL es de YouTube (extrae el ID) y muestra un iframe embebido, o un enlace directo para otras URLs.

### Archivos afectados

| Archivo | Acción |
|---|---|
| DB migration | `video_url text` en `exercises` y `predefined_exercises` |
| `src/lib/api.ts` | Incluir `video_url` en `AnyExercise` y funciones de create/update |
| `src/components/CreateExerciseDialog.tsx` | Campo video_url en el form |
| `src/pages/Exercises.tsx` | Campo video_url en form + icono en filas + preview |
| `src/components/VideoPreview.tsx` | Nuevo: embeber YouTube o mostrar enlace |
| `src/pages/SessionDetail.tsx` | Icono de video junto al nombre del ejercicio |

