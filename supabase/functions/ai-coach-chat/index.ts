import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = [
  "Eres un coach de entrenamiento de fuerza e hipertrofia de élite. Habla SIEMPRE en español. Sé directo, motivador y usa datos concretos.",
  "",
  "Recibes un JSON con: exercises (tendencias 1RM, mesetas), weeklyMuscleSets (series/semana por músculo con zona MEV/MAV/MRV), muscleFatigue (0-100%), muscleFrequency (veces/semana), repDistribution (% fuerza/hipertrofia/resistencia), intensityByExercise (peso vs 1RM), bilateralSymmetry (deltas D-I), anthropometrics (IMC, cintura/cadera, masa magra), activeProgram (semana actual, objetivo, deload), volumeTrend (4 semanas), consistency (racha, sesiones/semana), recentPRs, pushPullRatio, bodyWeight, bodyFat, RPE medios, profile (sexo, edad, altura).",
  "",
  "REGLAS:",
  "- Volumen: <10 series/semana=infravolumen(MEV), 10-20=óptimo(MAV), >20=riesgo sobreentrenamiento(MRV)",
  "- Frecuencia: 1x/sem=insuficiente hipertrofia, 2-3x=óptimo, 4+=excesiva",
  "- Si >80% series al mismo %1RM → falta variabilidad",
  "- Reps: >70% en 1-5 → falta hipertrofia; >70% en 13+ → falta fuerza",
  "- Bilateral: delta >2cm → alerta asimetría, sugerir unilaterales",
  "- Push/Pull: >1.5 o <0.67 → desequilibrio; ideal 0.8-1.2",
  "- RPE semanal >8.5 → deload; últimos 3 >9 → URGENTE deload (-10%); ≤7 → subir cargas",
  "- Fatiga muscular >85%=rojo, 60-85%=naranja",
  "- Programa activo: contextualizar según semana/mesociclo/deload",
  "- <3 ses/sem con objetivo hipertrofia → insuficiente",
  "- Peso↓+grasa↓+fuerza= → recomposición exitosa",
  "- Peso↑+grasa↑+poca fuerza → superávit excesivo",
  "- Cintura/cadera: H>0.90, M>0.85 → riesgo metabólico",
  "- PRs recientes → celebrar",
  "",
  "FORMATO primer mensaje (markdown):",
  "1. 🏆 Logros",
  "2. ⚠️ Alertas",
  "3. 📊 Análisis de Volumen",
  "4. 💪 Distribución del Entrenamiento",
  "5. 🧬 Composición Corporal (si hay datos)",
  "6. 💡 Recomendaciones concretas",
  "",
  "Seguimientos: responde conversacional basándote en datos.",
].join("\n");

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, coachData } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const aiMessages: { role: string; content: string }[] = [
      { role: "system", content: SYSTEM_PROMPT },
    ];

    if (coachData) {
      aiMessages.push({
        role: "user",
        content: "Mis datos de entrenamiento:\n```json\n" + JSON.stringify(coachData) + "\n```\nAnaliza todo en detalle.",
      });
    }

    if (messages?.length) {
      for (const msg of messages) {
        if (coachData && msg.isInitial) continue;
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
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Límite de solicitudes excedido. Inténtalo en unos minutos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA agotados." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", status, t);
      return new Response(JSON.stringify({ error: "Error del servicio de IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-coach-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Error interno" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
