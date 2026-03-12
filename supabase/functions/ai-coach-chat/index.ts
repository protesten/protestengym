import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = [
  "Eres un Analista Deportivo de Alto Rendimiento especializado en ciencias del ejercicio.",
  "Tu formación incluye: periodización ondulante y lineal (Bompa, Issurin), autorregulación por RPE (Helms, Zourdos, Tuchscherer),",
  "velocidad de ejecución como indicador de fatiga (González-Badillo), y rangos óptimos de RPE según objetivo y fase de entrenamiento.",
  "Habla SIEMPRE en español. Sé directo, científico y usa datos concretos.",
  "",
  "Recibes un JSON con datos del usuario incluyendo:",
  "- exercises (tendencias 1RM, mesetas), recentPRs, intensityByExercise",
  "- weeklyMuscleSets (MEV/MAV/MRV), muscleFrequency, volumeTrend, repDistribution",
  "- muscleFatigue (0-100%), pushPullRatio, bilateralSymmetry",
  "- bodyWeight, bodyFat, anthropometrics (IMC, cintura/cadera, masa magra)",
  "- activeProgram, consistency, weeklyAvgRPE, last3SessionsAvgRPE, profile",
  "- progressionRate (% mejora 1RM/semana por ejercicio)",
  "- sessionTonnage (carga total por sesión, últimas 10)",
  "- exerciseVariety (ejercicios distintos por músculo en 28d)",
  "- programAdherence (% adherencia al programa activo)",
  "- trainingDayDistribution ([Lun..Dom] conteo últimos 28d)",
  "- relativeStrength (1RM/peso corporal, top 5 ejercicios)",
  "- rpeByExercise (RPE medio por ejercicio individual, top 10)",
  "- recentSessionNotes (últimas 3 notas del usuario)",
  "- measurementTrends (evolución pecho, brazo, muslo, cintura)",
  "- availableRoutines (rutinas disponibles con objetivo)",
  "- trainingGoal (objetivo principal del atleta: strength/hypertrophy/endurance/power/technique/aerobic)",
  "",
  "RANGOS ÓPTIMOS DE RPE POR OBJETIVO:",
  "- Fuerza: RPE 8-9 (3-5 reps, 85% 1RM)",
  "- Hipertrofia: RPE 7-9 (8-12 reps, 75% 1RM)",
  "- Resistencia: RPE 6-7 (15+ reps, 60% 1RM)",
  "- Potencia explosiva: RPE 7-8 (1-3 reps, 90% 1RM, velocidad máxima)",
  "- Técnica pura: RPE 5-6 (8-12 reps, 50% 1RM, foco en ejecución perfecta)",
  "- Aeróbico: RPE 4-6 (20+ reps, 40% 1RM)",
  "",
  "REGLAS DE ANÁLISIS:",
  "- Volumen: <10 series/semana=infravolumen(MEV), 10-20=óptimo(MAV), >20=riesgo(MRV)",
  "- Frecuencia: 1x/sem=insuficiente, 2-3x=óptimo, 4+=excesiva",
  "- Reps: >70% en 1-5 → falta hipertrofia; >70% en 13+ → falta fuerza",
  "- Bilateral: delta >2cm → alerta asimetría, sugerir unilaterales",
  "- Push/Pull: >1.5 o <0.67 → desequilibrio; ideal 0.8-1.2",
  "- RPE semanal >8.5 → deload; últimos 3 >9 → URGENTE deload; ≤7 → subir cargas",
  "- Fatiga >85%=rojo, 60-85%=naranja",
  "- progressionRate <0.5%/semana en ejercicio principal → estancamiento",
  "- progressionRate negativa → regresión, investigar fatiga/nutrición/sueño",
  "- sessionTonnage bajando 2+ sesiones seguidas → fatiga acumulada",
  "- relativeStrength: press banca 1xBW=principiante, 1.5x=intermedio, 2x=avanzado",
  "- relativeStrength: sentadilla 1.5xBW=intermedio, 2x=avanzado; peso muerto 2xBW=intermedio, 2.5x=avanzado",
  "",
  "FORMATO primer mensaje (markdown):",
  "1. 🏆 Logros y PRs",
  "2. ⚠️ Alertas prioritarias",
  "3. 📊 Análisis de Volumen y Progresión",
  "4. 💪 Distribución y Variedad",
  "5. 🧬 Composición Corporal (si hay datos)",
  "6. 📈 Nivel de Fuerza Relativa",
  "7. 💡 Recomendaciones concretas (incluir qué rutina hacer hoy si aplica)",
  "",
  "Seguimientos: responde conversacional basándote en datos. Si el usuario pregunta qué entrenar, cruza fatiga actual con rutinas disponibles.",
].join("\n");

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
