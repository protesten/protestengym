import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { coachData } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `Eres un coach de entrenamiento de fuerza experto. Analiza los datos del usuario y responde SIEMPRE en español.

Reglas de análisis:
- Si un ejercicio lleva 3+ sesiones sin subir el 1RM estimado → es una "meseta" (plateau).
- Si el peso corporal baja pero el 1RM se mantiene o sube → la "fuerza relativa" está mejorando (eficiencia neuromuscular). Da un mensaje de refuerzo positivo sobre "Mejora en Fuerza Relativa y Eficiencia Neuromuscular".
- Si el RPE promedio semanal es > 8.5 → sugerir una semana de descarga (deload).
- Si el RPE promedio de los últimos 3 entrenamientos es > 9 → sugerir urgentemente una "Semana de Descarga" y recomendar reducir el peso un 10%.
- Si el RPE promedio semanal es ≤ 7 → hay margen para subir cargas.
- Si hay datos de grasa corporal y el usuario está en déficit (grasa bajando), prioriza el descanso en tus consejos.

Debes usar la herramienta analyze_training para dar tu respuesta estructurada. Sé conciso, directo y motivador. Usa los datos proporcionados, no inventes datos.`;

    const userPrompt = `Aquí están mis datos de entrenamiento actuales:\n\n${JSON.stringify(coachData, null, 2)}\n\nAnaliza mi progreso y dame tu evaluación.`;

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
        tools: [
          {
            type: "function",
            function: {
              name: "analyze_training",
              description: "Devuelve el análisis estructurado del entrenamiento del usuario.",
              parameters: {
                type: "object",
                properties: {
                  achievement: {
                    type: "string",
                    description: "Logro destacado de la semana. Ej: 'Tu Press Banca ha subido un 3%'. Si no hay logros claros, menciona algo positivo como consistencia o mejora en fuerza relativa.",
                  },
                  alert: {
                    type: "string",
                    description: "Alerta de mejora o estancamiento. Ej: 'Llevas 3 sesiones sin mejorar en Sentadilla'. Si RPE últimos 3 entrenos > 9, sugiere descarga urgente y reducir peso un 10%. Si no hay alertas, indica que todo va bien.",
                  },
                  advice: {
                    type: "string",
                    description: "Consejo personalizado basado en los datos antropométricos y de fatiga. Si el peso corporal baja pero la fuerza se mantiene, destaca la mejora en eficiencia neuromuscular. Si está en déficit calórico (grasa bajando), prioriza descanso.",
                  },
                  status: {
                    type: "string",
                    enum: ["progress", "plateau", "overtraining"],
                    description: "Estado general: 'progress' si hay mejoras, 'plateau' si hay estancamiento, 'overtraining' si RPE promedio > 8.5 o RPE de últimos 3 entrenos > 9.",
                  },
                },
                required: ["achievement", "alert", "advice", "status"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "analyze_training" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Límite de solicitudes excedido. Inténtalo de nuevo en unos minutos." }), {
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

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      return new Response(JSON.stringify({ error: "No se pudo generar el análisis" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const analysis = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-coach error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
