

## Plan: Integración IA en todo el ecosistema de la app

### Arquitectura

Se creará un sistema de **AI Insights contextual** que funciona de dos formas:
1. **Micro-insights automáticos**: Chips/cards pequeñas con análisis IA que aparecen en cada pantalla, generados bajo demanda al pulsar un botón "✨ Analizar con IA"
2. **Chat contextual**: Un botón flotante de IA en cada pantalla que abre el Coach con contexto pre-cargado de esa pantalla específica

### Backend: Nueva Edge Function multi-propósito

**Archivo**: `supabase/functions/ai-insights/index.ts`

Una sola Edge Function que recibe un `context` (tipo de pantalla) y `data` (datos relevantes), y devuelve un análisis corto y accionable. No streaming — respuesta directa para insights rápidos.

Contextos soportados:
- `home_summary` — resumen diario inteligente
- `exercise_analysis` — análisis de un ejercicio específico
- `routine_review` — evaluación de una rutina
- `session_feedback` — feedback post-sesión
- `fatigue_advice` — recomendaciones basadas en fatiga
- `measurement_insight` — análisis de medidas corporales
- `program_review` — evaluación del programa activo
- `calendar_patterns` — patrones de entrenamiento
- `monthly_report_narrative` — narrativa del informe mensual
- `profile_recommendations` — recomendaciones basadas en perfil

### Frontend: Componente reutilizable

**Archivo**: `src/components/AIInsightCard.tsx`

Componente que:
- Muestra un botón "✨ Analizar con IA"
- Al pulsar, llama a la Edge Function con el contexto y datos
- Muestra el resultado con markdown en una card expandible
- Cache en memoria para no repetir llamadas innecesarias

**Archivo**: `src/lib/ai-insights.ts`

Función helper para llamar a la edge function de insights.

### Implementación por pantalla

#### 1. Inicio (`Index.tsx`)
- **Briefing diario IA**: Card con resumen personalizado del día ("Llevas 3 días sin entrenar pierna, hoy sería ideal hacer tu rutina de tren inferior. Tu fatiga en pecho está al 45%, puedes atacar press banca.")
- Basado en: fatiga actual, última sesión, programa activo, distribución semanal

#### 2. Ejercicios (`Exercises.tsx`)
- **Análisis por ejercicio**: Al ver un ejercicio, botón IA que analiza su historial ("Tu press banca ha progresado un 12% en 4 semanas. Estás en fase de progresión lineal. Sugerencia: mantén RPE 7-8 y añade 2.5kg/semana.")
- Solo aparece si el ejercicio tiene historial de sesiones

#### 3. Rutinas (`Routines.tsx` + `RoutineDetail.tsx`)
- **Evaluación de rutina**: Analiza la composición de la rutina ("Esta rutina tiene 4 ejercicios de empuje y 1 de tirón. Desequilibrio Push/Pull. Sugiero añadir remo con barra o face pulls.")
- Analiza: balance muscular, volumen total, tipos de ejercicios, cobertura de grupos musculares

#### 4. Sesión activa (`SessionDetail.tsx`)
- **Feedback en tiempo real post-sesión**: Al completar la sesión, genera un resumen IA ("Sesión sólida: 12 series de trabajo, volumen total 8.2t, RPE medio 7.5. Has superado tu sesión anterior en 3 series. Posible PR en sentadilla próxima sesión.")
- Se activa al marcar como completada o bajo demanda

#### 5. Análisis (`Analysis.tsx`) — por cada tab
- **Tab Ejercicio**: "Tu curva de progresión en este ejercicio muestra una meseta desde hace 2 semanas. Considera variar el rango de repeticiones o añadir pausa en la fase excéntrica."
- **Tab Músculo**: "Cuádriceps recibe 18 series/semana (MAV óptimo). Pecho solo 6 series (infravolumen). Prioriza pecho las próximas 2 semanas."
- **Tab Volumen**: Análisis de tendencia de volumen semanal
- **Tab 1RM**: Predicción de 1RM futuro basado en tendencia
- **Tab PRs**: Análisis de PRs y probabilidad de nuevos récords
- **Tab Cuerpo**: Análisis de composición corporal y tendencias
- **Tab F. Relativa**: Clasificación de nivel y comparativa
- **Tab Resumen**: Tendencias de rendimiento global

#### 6. Fatiga (`Fatigue.tsx`)
- **Recomendación de recuperación**: "Tu pecho necesita ~24h más de descanso. Cuádriceps en zona naranja (72%) — entrénalo con volumen reducido. Recomendación: sesión de tren superior con énfasis en tirón."
- Basado en datos de fatiga ya calculados

#### 7. Medidas (`Measurements.tsx`)
- **Análisis de tendencia corporal**: "En las últimas 4 semanas: brazo +0.8cm, cintura -1.2cm. Indicadores de recomposición corporal exitosa. Tu ratio cintura/cadera ha mejorado de 0.87 a 0.84."

#### 8. Programas (`Programs.tsx`)
- **Evaluación del programa**: "Llevas 8 de 16 días completados (50%). Adherencia: 85%. La distribución de días de descanso es adecuada. Considera añadir un día de deload en el día 12."

#### 9. Calendario (`SessionCalendar.tsx`)
- **Patrones de entrenamiento**: "Entrenas mayormente Lun-Mié-Vie. Los martes y jueves podrían ser días de recuperación activa. Tu consistencia este mes es del 92%."

#### 10. Informe Mensual (`MonthlyReport.tsx`)
- **Narrativa IA del informe**: Genera un párrafo personalizado tipo "coach report" que acompaña las estadísticas del informe, dando contexto humano a los números

#### 11. Perfil (`Profile.tsx`)
- **Recomendaciones de perfil**: "Completa tu fecha de nacimiento y altura para desbloquear análisis avanzados de composición corporal y fuerza relativa."
- Si el perfil está completo: "Basado en tu perfil (25 años, 180cm, 80kg), tu IMC es 24.7. Tu nivel de fuerza relativa es intermedio-avanzado."

#### 12. Nueva Sesión (`NewSession.tsx`)
- **Sugerencia inteligente**: "Basado en tu fatiga actual y programa, hoy te recomiendo la rutina 'Tren Superior - Empuje'. Tu pecho está recuperado al 95% y llevas 3 días sin entrenarlo."

### Archivos a crear/modificar

| Archivo | Acción |
|---|---|
| `supabase/functions/ai-insights/index.ts` | **Crear** — Edge Function multi-contexto |
| `src/components/AIInsightCard.tsx` | **Crear** — Componente reutilizable |
| `src/lib/ai-insights.ts` | **Crear** — Helper para llamadas |
| `src/pages/Index.tsx` | Modificar — añadir briefing diario |
| `src/pages/Exercises.tsx` | Modificar — añadir análisis por ejercicio |
| `src/pages/RoutineDetail.tsx` | Modificar — añadir evaluación de rutina |
| `src/pages/SessionDetail.tsx` | Modificar — añadir feedback post-sesión |
| `src/pages/Analysis.tsx` | Modificar — añadir insights por tab |
| `src/pages/Fatigue.tsx` | Modificar — añadir recomendaciones |
| `src/pages/Measurements.tsx` | Modificar — añadir análisis corporal |
| `src/pages/Programs.tsx` | Modificar — añadir evaluación programa |
| `src/pages/SessionCalendar.tsx` | Modificar — añadir patrones |
| `src/pages/MonthlyReport.tsx` | Modificar — añadir narrativa |
| `src/pages/Profile.tsx` | Modificar — añadir recomendaciones |
| `src/pages/NewSession.tsx` | Modificar — añadir sugerencia |

### Consideraciones técnicas

- Cada insight usa la API de Lovable AI (no streaming, respuesta directa via `supabase.functions.invoke`)
- Cache local con `useState` para evitar llamadas repetidas en la misma sesión
- Prompts específicos por contexto en el backend, con reglas científicas de entrenamiento
- Modelo: `google/gemini-2.5-flash` (rápido, barato, suficiente para insights cortos)
- Rate limiting: botón deshabilitado durante 30s tras cada llamada
- Los datos se envían como JSON compacto para minimizar tokens

