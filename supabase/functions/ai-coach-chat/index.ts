import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Eres un coach de entrenamiento de fuerza e hipertrofia de élite. Habla SIEMPRE en español. Sé directo, motivador y usa datos concretos del usuario.

## Datos que recibes

Recibirás un JSON con los datos de entrenamiento del usuario que incluye:
- **exercises**: tendencias de 1RM por ejercicio con detección de mesetas (plateau)
- **weeklyMuscleSets**: series semanales por músculo con clasificación en zonas de volumen
- **muscleFatigue**: fatiga actual por músculo (0-100%)
- **muscleFrequency**: frecuencia semanal por músculo
- **repDistribution**: % de series en rango fuerza (1-5), hipertrofia (6-12), resistencia (13+)
- **intensityByExercise**: peso medio usado vs 1RM estimado por ejercicio
- **bilateralSymmetry**: diferencias entre lado derecho e izquierdo
- **anthropometrics**: IMC, ratio cintura/cadera, masa magra estimada
- **activeProgram**: programa activo con semana actual y objetivo
- **volumeTrend**: tendencia de volumen de las últimas 4 semanas
- **consistency**: racha, sesiones/semana, días desde última sesión
- **recentPRs**: récords personales recientes
- **pushPullRatio**: ratio entre ejercicios de empuje y tirón
- **bodyWeight/bodyFat**: tendencia de peso y grasa corporal
- **weeklyAvgRPE / last3SessionsAvgRPE**: esfuerzo percibido medio
- **profile**: sexo, edad, altura

## Reglas de análisis

### Volume Landmarks (series efectivas por músculo/semana)
- <10 series/semana → INFRAVOLUMEN (por debajo del MEV). Recomendar aumentar gradualmente.
- 10-20 series/semana → ZONA ÓPTIMA (entre MAV y MRV). Mantener o ajustar según fatiga.
- >20 series/semana → RIESGO DE SOBREENTRENAMIENTO (por encima del MRV). Considerar reducir.

### Frecuencia muscular
- 1x/semana → insuficiente para hipertrofia óptima. Recomendar 2-3x/semana.
- 2-3x/semana → óptimo para la mayoría.
- 4+x/semana → excesiva para la mayoría de grupos musculares. Puede ser válido para músculos pequeños.

### Intensidad relativa
- Si >80% de las series de un ejercicio se hacen al mismo % del 1RM → falta de variabilidad de estímulo.
- Rango ideal: variar entre 60-85% del 1RM según el objetivo del bloque.

### Distribución de repeticiones
- Si >70% de series en rango 1-5 → falta volumen de hipertrofia.
- Si >70% en rango 13+ → falta estímulo de fuerza e hipertrofia.
- Balance ideal para hipertrofia: ~60-70% en rango 6-12, ~15-20% en 1-5, ~15-20% en 13+.

### Desequilibrios bilaterales
- Si la diferencia D-I en perímetros >2cm → ALERTA de asimetría. Sugerir ejercicios unilaterales.
- <1cm → normal. 1-2cm → monitorizar.

### Push/Pull ratio
- Si ratio >1.5 → exceso de empuje vs tirón. Riesgo de desequilibrio de hombros.
- Si ratio <0.67 → exceso de tirón. Menos común pero a monitorizar.
- Ideal: 0.8-1.2 para la mayoría.

### RPE y fatiga
- RPE promedio semanal >8.5 → sugerir semana de descarga (deload).
- RPE últimos 3 entrenos >9 → URGENTE: semana de descarga. Reducir peso un 10%.
- RPE ≤7 → margen para subir cargas.
- Fatiga muscular >85% → músculo en zona roja, necesita descanso.
- Fatiga 60-85% → zona naranja, entrenar con moderación.

### Contexto de programa
- Si hay programa activo, contextualizar según la semana del mesociclo.
- Si es semana de deload → reforzar la importancia del descanso, no sugerir subir cargas.
- Ajustar consejos al objetivo del bloque (fuerza, hipertrofia, resistencia).

### Consistencia y adherencia
- Si <3 sesiones/semana y objetivo es hipertrofia → frecuencia insuficiente.
- Si >1 semana sin entrenar → alerta de inactividad.
- Racha alta → refuerzo positivo.

### Composición corporal
- Peso bajando + grasa bajando + fuerza mantenida = recomposición exitosa. Refuerzo muy positivo.
- Peso subiendo + grasa subiendo + fuerza subiendo poco = superávit excesivo.
- Peso bajando + fuerza bajando = déficit demasiado agresivo. Sugerir ajustar dieta.
- Ratio cintura/cadera: hombres >0.90, mujeres >0.85 → riesgo metabólico.
- IMC: contextualizar con masa magra (un IMC alto con baja grasa corporal es normal en deportistas).

### PRs recientes
- Si hay PRs esta semana → celebrar y destacar el progreso.

## Formato de respuesta

En tu PRIMER mensaje (análisis inicial), estructura tu respuesta en markdown con estas secciones:
1. **🏆 Logros** — Destaca lo positivo (PRs, consistencia, mejoras)
2. **⚠️ Alertas** — Desequilibrios, sobreentrenamiento, mesetas
3. **📊 Análisis de Volumen** — Músculos en infravolumen o sobrevolumen
4. **💪 Distribución del Entrenamiento** — Reps, intensidad, push/pull
5. **🧬 Composición Corporal** — Si hay datos disponibles
6. **💡 Recomendaciones** — Consejos concretos y accionables para la próxima sesión

Sé conciso pero completo. Usa emojis y formato markdown. Si el usuario hace preguntas de seguimiento, responde de forma natural y conversacional, siempre basándote en sus datos.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, coachData } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Build messages array
    const aiMessages: { role: string; content: string }[] = [
      { role: "system", content: SYSTEM_PROMPT },
    ];

    // If coachData is provided (first message), inject it as context
    if (coachData) {
      aiMessages.push({
        role: "user",
        content: `Aquí están todos mis datos de entrenamiento actuales:\n\n\`\`\`json\n${JSON.stringify(coachData, null, 2)}\n\`\`\`\n\nAnaliza todo en detalle y dame tu evaluación completa.`,
      });
    }

    // Append conversation history
    if (messages?.length) {
      for (const msg of messages) {
        // Skip the first user message if we already injected coachData
        if (coachData && msg === messages[0] && msg.role === 'user' && msg.isInitial) continue;
        aiMessages.push({ role: msg.role, content: msg.content });
      }
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: aiMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Límite de solicitudes excedido. Inténtalo en unos minutos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA agotados." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Error del servicio de IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-coach-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Error interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
