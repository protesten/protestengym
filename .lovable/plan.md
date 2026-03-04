

## Ampliación de Medidas Corporales para Análisis Antropométrico

### Resumen

Ampliar la tabla `body_measurements` con todos los campos de medición solicitados y añadir campos de altura y edad al perfil del usuario para completar el análisis antropométrico.

### Nuevos campos de medición

Reemplazar los campos actuales (chest_cm, waist_cm, arm_cm, thigh_cm, body_fat_pct) por un conjunto completo:

| Campo | Columna DB |
|---|---|
| Cuello | neck_cm |
| Pecho | chest_cm (ya existe) |
| Bíceps derecho contraído | bicep_right_contracted_cm |
| Bíceps derecho relajado | bicep_right_relaxed_cm |
| Bíceps izquierdo contraído | bicep_left_contracted_cm |
| Bíceps izquierdo relajado | bicep_left_relaxed_cm |
| Cintura | waist_cm (ya existe) |
| Abdomen | abdomen_cm |
| Cadera | hip_cm |
| Pliegue subglúteo derecho | subgluteal_right_cm |
| Muslo derecho relajado | thigh_right_relaxed_cm |
| Muslo derecho contraído | thigh_right_contracted_cm |
| Muslo izquierdo relajado | thigh_left_relaxed_cm |
| Muslo izquierdo contraído | thigh_left_contracted_cm |
| Gemelo derecho | calf_right_cm |
| Gemelo izquierdo | calf_left_cm |

Se mantienen: weight_kg, body_fat_pct, chest_cm, waist_cm. Se eliminan del UI: arm_cm y thigh_cm (columnas antiguas se mantienen en DB por datos existentes).

### Cambios en el perfil

Añadir a la tabla `profiles`: `height_cm` (numeric, nullable) y `birth_date` (date, nullable) para calcular la edad.

### Plan de implementación

1. **Migración DB**: Añadir ~14 nuevas columnas a `body_measurements` + 2 columnas a `profiles`
2. **Actualizar `src/pages/Measurements.tsx`**: Reorganizar el formulario en secciones (Tren superior, Core, Tren inferior) con los nuevos campos. Actualizar la interfaz Measurement, el array FIELDS, el formulario y las tarjetas del historial
3. **Actualizar `src/pages/Profile.tsx`**: Añadir campos de altura y fecha de nacimiento

### Detalles técnicos

- El formulario se organizará en secciones colapsables o con headers para no abrumar visualmente
- Los chips del gráfico se agruparán o se usará un selector para manejar tantos campos
- Las tarjetas del historial mostrarán solo los campos con valor, organizados por sección
- Los tipos en la interfaz se actualizarán automáticamente tras la migración

