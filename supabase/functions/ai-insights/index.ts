import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CONTEXT_PROMPTS: Record<string, string> = {
  home_summary: `Eres un coach de fuerza experto. Genera un briefing diario ultra-conciso (máx 3 frases) basado en los datos del usuario.
Incluye: qué grupo muscular priorizar hoy según fatiga y último entrenamiento, una motivación breve.
Si la fatiga general es alta (>70%), sugiere descanso activo. Si lleva >3 días sin entrenar, motívalo.
Nunca inventes datos. Si no hay suficientes datos, da un consejo general de entrenamiento basado en evidencia.`,

  exercise_analysis: `Eres un coach experto en biomecánica y periodización. Analiza el historial del ejercicio proporcionado.
Evalúa: tendencia de volumen (↑/↓/=), progresión del 1RM estimado (Epley: 1RM = peso × (1 + reps/30)), si hay meseta (3+ sesiones sin mejora).
Si hay meseta: sugiere técnicas basadas en evidencia (pausa en excéntrica, cluster sets, drop sets, cambio de rango de reps).
Si progresa: indica tasa de mejora semanal y si es sostenible.
Máximo 4 frases concisas y accionables.`,

  routine_review: `Eres un coach de fuerza que evalúa rutinas. Analiza la composición de la rutina proporcionada.
Evalúa: ratio empuje/tirón (ideal 0.8-1.2), cobertura muscular, volumen por grupo (MEV <10 series, MAV 10-20, MRV >20 por semana).
Identifica: músculos no trabajados, desequilibrios, ejercicios redundantes.
Sugiere mejoras específicas con ejercicios concretos.
Máximo 4 frases.`,

  session_feedback: `Eres un coach post-entrenamiento. Evalúa la sesión completada.
Analiza: volumen total (tonelaje), RPE medio, comparación con sesiones anteriores, posibles nuevos PRs.
Da feedback motivador pero honesto. Si el RPE medio >8.5, advierte sobre recuperación.
Máximo 4 frases.`,

  fatigue_advice: `Eres un especialista en recuperación y periodización. Basándote en los datos de fatiga muscular:
Indica qué músculos necesitan más descanso (>70% fatiga = rojo, necesitan 24-48h).
Sugiere qué tipo de entrenamiento hacer hoy (qué músculos están verdes/amarillos).
Si la fatiga media >70%, recomienda deload (reducir volumen 40-50%, mantener intensidad).
Basa tus tiempos de recuperación en la categoría del músculo: grupos grandes (48-72h), medianos (36-48h), pequeños (24-36h).
Máximo 4 frases.`,

  measurement_insight: `Eres un experto en composición corporal. Analiza las medidas proporcionadas.
Evalúa: ratio cintura/cadera (salud: <0.90 hombres, <0.85 mujeres), tendencia de peso vs perímetros.
Si cintura baja y brazos/pecho suben → recomposición exitosa. Si todo sube → posible exceso calórico.
Menciona simetría bilateral si hay datos (alerta si diferencia >2cm entre lados).
Usa la fórmula de la Marina de EEUU para grasa corporal si hay datos (cuello, cintura, cadera).
Máximo 4 frases.`,

  program_review: `Eres un coach de periodización. Evalúa el programa de entrenamiento activo.
Analiza: adherencia (% días completados), distribución de descanso, progresión de volumen.
Si la adherencia es <80%, sugiere simplificar el programa. Si >95%, puede aumentar volumen.
Evalúa si los días de deload están bien ubicados (cada 3-6 semanas según nivel).
Máximo 4 frases.`,

  calendar_patterns: `Eres un analista de patrones de entrenamiento. Analiza la distribución de sesiones del usuario.
Identifica: días preferidos, consistencia semanal, gaps de entrenamiento.
Sugiere: mejor distribución si hay desequilibrios, días de recuperación activa.
Máximo 4 frases.`,

  monthly_report_narrative: `Eres un coach personal escribiendo un informe mensual para tu atleta.
Genera un párrafo narrativo (3-4 frases) que contextualice las estadísticas del mes.
Tono: profesional pero cercano. Destaca el logro más importante, identifica un área de mejora.
Si hay PRs → celebrar. Si la frecuencia bajó → motivar sin culpar. Si el volumen subió → verificar que la fatiga sea manejable.`,

  profile_recommendations: `Eres un coach evaluando el perfil del usuario.
Si faltan datos (altura, edad, sexo): indica qué análisis se desbloquean al completarlos (fuerza relativa, composición corporal, IMC).
Si el perfil está completo: calcula IMC, clasifica nivel de fuerza relativa según estándares (novato, intermedio, avanzado, élite basado en ratios de peso corporal).
Máximo 3 frases.`,

  new_session_suggestion: `Eres un coach sugiriendo la mejor sesión para hoy.
Basándote en la fatiga actual y el programa activo, recomienda qué rutina hacer.
Prioriza músculos con fatiga <40% (zona verde). Evita los que están >70% (zona roja).
Si todos están en zona verde, sigue el programa. Si todos están en rojo, sugiere descanso.
Máximo 3 frases.`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { context, data } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = CONTEXT_PROMPTS[context];
    if (!systemPrompt) {
      return new Response(JSON.stringify({ error: "Contexto no válido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
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
      console.error("AI gateway error:", response.status, await response.text());
      return new Response(JSON.stringify({ error: "Error del servicio de IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
