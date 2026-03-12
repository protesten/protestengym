import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ANALYST_PERSONA = `Eres un Analista Deportivo de Alto Rendimiento especializado en ciencias del ejercicio.
Tu formación incluye: periodización ondulante y lineal (Bompa, Issurin), autorregulación por RPE (Helms, Zourdos, Tuchscherer),
velocidad de ejecución como indicador de fatiga (González-Badillo), y rangos óptimos de RPE según objetivo y fase de entrenamiento.
Siempre fundamentas tus recomendaciones en evidencia científica. Hablas SIEMPRE en español.`;

const CONTEXT_PROMPTS: Record<string, string> = {
  home_summary: `Genera un briefing diario ultra-conciso (máx 3 frases) basado en los datos del usuario.
Incluye: qué grupo muscular priorizar hoy según fatiga y último entrenamiento, una motivación breve.
Si la fatiga general es alta (>70%), sugiere descanso activo. Si lleva >3 días sin entrenar, motívalo.
Nunca inventes datos. Si no hay suficientes datos, da un consejo general de entrenamiento basado en evidencia.`,

  exercise_analysis: `Analiza el historial del ejercicio proporcionado.
Evalúa: tendencia de volumen (↑/↓/=), progresión del 1RM estimado (Epley: 1RM = peso × (1 + reps/30)), si hay meseta (3+ sesiones sin mejora).
Si hay meseta: sugiere técnicas basadas en evidencia (pausa en excéntrica, cluster sets, drop sets, cambio de rango de reps).
Si progresa: indica tasa de mejora semanal y si es sostenible.
Máximo 4 frases concisas y accionables.`,

  routine_review: `Evalúa la composición de la rutina proporcionada.
Evalúa: ratio empuje/tirón (ideal 0.8-1.2), cobertura muscular, volumen por grupo (MEV <10 series, MAV 10-20, MRV >20 por semana).
Identifica: músculos no trabajados, desequilibrios, ejercicios redundantes.
Sugiere mejoras específicas con ejercicios concretos.
Máximo 4 frases.`,

  session_feedback: `Evalúa la sesión completada.
Analiza: volumen total (tonelaje), RPE medio, comparación con sesiones anteriores, posibles nuevos PRs.
Da feedback motivador pero honesto. Si el RPE medio >8.5, advierte sobre recuperación.
Máximo 4 frases.`,

  fatigue_advice: `Basándote en los datos de fatiga muscular:
Indica qué músculos necesitan más descanso (>70% fatiga = rojo, necesitan 24-48h).
Sugiere qué tipo de entrenamiento hacer hoy (qué músculos están verdes/amarillos).
Si la fatiga media >70%, recomienda deload (reducir volumen 40-50%, mantener intensidad).
Basa tus tiempos de recuperación en la categoría del músculo: grupos grandes (48-72h), medianos (36-48h), pequeños (24-36h).
Máximo 4 frases.`,

  measurement_insight: `Analiza las medidas proporcionadas.
Evalúa: ratio cintura/cadera (salud: <0.90 hombres, <0.85 mujeres), tendencia de peso vs perímetros.
Si cintura baja y brazos/pecho suben → recomposición exitosa. Si todo sube → posible exceso calórico.
Menciona simetría bilateral si hay datos (alerta si diferencia >2cm entre lados).
Máximo 4 frases.`,

  program_review: `Evalúa el programa de entrenamiento activo.
Analiza: adherencia (% días completados), distribución de descanso, progresión de volumen.
Si la adherencia es <80%, sugiere simplificar. Si >95%, puede aumentar volumen.
Evalúa si los días de deload están bien ubicados (cada 3-6 semanas según nivel).
Máximo 4 frases.`,

  calendar_patterns: `Analiza la distribución de sesiones del usuario.
Identifica: días preferidos, consistencia semanal, gaps de entrenamiento.
Sugiere: mejor distribución si hay desequilibrios, días de recuperación activa.
Máximo 4 frases.`,

  monthly_report_narrative: `Genera un párrafo narrativo (3-4 frases) que contextualice las estadísticas del mes.
Tono: profesional pero cercano. Destaca el logro más importante, identifica un área de mejora.
Si hay PRs → celebrar. Si la frecuencia bajó → motivar sin culpar. Si el volumen subió → verificar que la fatiga sea manejable.`,

  profile_recommendations: `Evalúa el perfil del usuario.
Si faltan datos (altura, edad, sexo): indica qué análisis se desbloquean al completarlos.
Si el perfil está completo: calcula IMC, clasifica nivel de fuerza relativa según estándares.
Máximo 3 frases.`,

  new_session_suggestion: `Sugiere la mejor sesión para hoy.
Basándote en la fatiga actual y el programa activo, recomienda qué rutina hacer.
Prioriza músculos con fatiga <40% (zona verde). Evita los que están >70% (zona roja).
Máximo 3 frases.`,

  warmup_suggestion: `Diseña la rampa de calentamiento y aproximación para un ejercicio.
Basándote en el 1RM estimado o peso de trabajo anterior, el objetivo de entrenamiento y las series planificadas, sugiere:
1. Series de calentamiento progresivas (peso, reps, RPE) empezando con barra vacía o 40%.
2. Series de aproximación (70-85%) para preparar el sistema nervioso.
Formato: C1: X kg × Y reps @RPE Z. Adapta según objetivo.
Máximo 6 frases.`,

  set_coaching: `Analiza la serie que acaba de completar el atleta y sugiere UN ajuste concreto para la siguiente serie.
Considera:
- Objetivo del atleta (fuerza: RPE 8-9 óptimo; hipertrofia: RPE 7-9; potencia: RPE 7-8; resistencia: RPE 6-7; técnica: RPE 5-6; aeróbico: RPE 4-6)
- Si el RPE está por debajo del rango óptimo → sugiere subir peso o reps con cantidad exacta
- Si el RPE está en rango → confirma y sugiere mantener
- Si el RPE está por encima → sugiere bajar peso o reps con cantidad exacta
- Fatiga acumulada: si las series previas muestran RPE creciente, considera reducir carga
- Tipo de tracking: adapta la sugerencia (peso, reps, tiempo, distancia)
Responde en UNA frase corta y directa. Sin introducciones ni explicaciones largas. Ejemplo: "Sube a 82.5kg, estás 2 puntos por debajo del RPE óptimo para hipertrofia."`,
};

const TONE_MODIFIERS: Record<string, string> = {
  technical: "Usa terminología técnica de entrenamiento (periodización, MEV/MAV/MRV, RPE, hipertrofia, etc.). Asume que el usuario entiende conceptos avanzados.",
  casual: "Explica como si hablaras con un amigo. Evita jerga técnica. Usa ejemplos cotidianos y lenguaje sencillo.",
};

const MOOD_MODIFIERS: Record<string, string> = {
  motivator: "Sé animador, positivo y entusiasta. Usa emojis ocasionalmente. Celebra los logros y motiva ante los retos.",
  focused: "Sé directo, conciso y profesional. Sin adornos ni emojis. Solo datos, análisis y acciones concretas.",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { context, data, tone, mood } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const contextPrompt = CONTEXT_PROMPTS[context];
    if (!contextPrompt) {
      return new Response(JSON.stringify({ error: "Contexto no válido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const toneModifier = TONE_MODIFIERS[tone] ?? "";
    const moodModifier = MOOD_MODIFIERS[mood] ?? "";
    const fullSystemPrompt = [ANALYST_PERSONA, toneModifier, moodModifier, contextPrompt].filter(Boolean).join("\n\n");

    const userPrompt = `Aquí están los datos relevantes:\n\n${JSON.stringify(data, null, 2)}\n\nDame tu análisis conciso en español.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: fullSystemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Límite de solicitudes excedido. Inténtalo en unos minutos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA agotados." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI gateway error:", response.status, await response.text());
      return new Response(JSON.stringify({ error: "Error del servicio de IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content ?? "";

    return new Response(JSON.stringify({ insight: content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-insights error:", e);
    return new Response(JSON.stringify({ error: "Error interno del servidor" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
