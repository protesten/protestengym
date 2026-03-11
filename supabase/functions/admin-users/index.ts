import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function verifyAdmin(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new Error("No authorization");

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user: caller } } = await userClient.auth.getUser();
  if (!caller) throw new Error("Not authenticated");

  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const { data: roleData } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", caller.id)
    .eq("role", "admin");

  if (!roleData?.length) throw new Error("Not admin");

  return { adminClient, callerId: caller.id };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { adminClient } = await verifyAdmin(req);
    const body = await req.json();
    const { action } = body;

    // ── LIST USERS ──
    if (action === "list_users") {
      const { data: profiles, error } = await adminClient
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) return json({ error: error.message }, 500);

      // Fetch emails from auth.users
      const { data: { users: authUsers }, error: authErr } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
      if (authErr) return json({ error: authErr.message }, 500);

      const emailMap = new Map<string, string>();
      for (const u of authUsers) emailMap.set(u.id, u.email ?? "");

      const result = (profiles ?? []).map((p: any) => ({
        ...p,
        email: emailMap.get(p.user_id) ?? "",
      }));

      return json(result);
    }

    // ── REJECT (delete user) ──
    if (action === "reject") {
      const { user_id } = body;
      if (!user_id) return json({ error: "user_id required" }, 400);
      const { error } = await adminClient.auth.admin.deleteUser(user_id);
      if (error) return json({ error: error.message }, 500);
      return json({ success: true });
    }

    // ── TRANSFER DATA ──
    if (action === "transfer_data") {
      const { source_user_id, target_user_id, tables } = body;
      if (!source_user_id || !target_user_id || !tables?.length) {
        return json({ error: "source_user_id, target_user_id, tables required" }, 400);
      }
      if (source_user_id === target_user_id) {
        return json({ error: "Source and target must be different" }, 400);
      }

      const summary: Record<string, number> = {};

      // Helper: generate new uuid
      const crypto = globalThis.crypto;
      const newId = () => crypto.randomUUID();

      // ── EXERCISES ──
      const exerciseMap = new Map<string, string>(); // old_id → new_id
      if (tables.includes("exercises")) {
        const { data: exercises } = await adminClient
          .from("exercises")
          .select("*")
          .eq("user_id", source_user_id);
        if (exercises?.length) {
          const toInsert = exercises.map((e: any) => {
            const nid = newId();
            exerciseMap.set(e.id, nid);
            const { id, user_id, created_at, ...rest } = e;
            return { ...rest, id: nid, user_id: target_user_id };
          });
          const { error } = await adminClient.from("exercises").insert(toInsert);
          if (error) return json({ error: `exercises: ${error.message}` }, 500);
          summary.exercises = toInsert.length;
        }
      }

      // If we need exercise mapping but didn't transfer exercises, build it
      if (!tables.includes("exercises") && (tables.includes("routines") || tables.includes("sessions"))) {
        const { data: srcEx } = await adminClient.from("exercises").select("id").eq("user_id", source_user_id);
        const { data: tgtEx } = await adminClient.from("exercises").select("id, name").eq("user_id", target_user_id);
        // For non-transferred exercises, we'll keep original IDs (they might reference predefined exercises)
        if (srcEx) srcEx.forEach((e: any) => exerciseMap.set(e.id, e.id));
      }

      // ── ROUTINES + ROUTINE_EXERCISES ──
      const routineMap = new Map<string, string>();
      if (tables.includes("routines")) {
        const { data: routines } = await adminClient
          .from("routines")
          .select("*")
          .eq("user_id", source_user_id);
        if (routines?.length) {
          const toInsert = routines.map((r: any) => {
            const nid = newId();
            routineMap.set(r.id, nid);
            const { id, user_id, created_at, ...rest } = r;
            return { ...rest, id: nid, user_id: target_user_id };
          });
          const { error } = await adminClient.from("routines").insert(toInsert);
          if (error) return json({ error: `routines: ${error.message}` }, 500);
          summary.routines = toInsert.length;

          // routine_exercises
          const routineIds = routines.map((r: any) => r.id);
          const { data: routineExs } = await adminClient
            .from("routine_exercises")
            .select("*")
            .in("routine_id", routineIds);
          if (routineExs?.length) {
            const reInsert = routineExs.map((re: any) => {
              const { id, routine_id, exercise_id, ...rest } = re;
              return {
                ...rest,
                id: newId(),
                routine_id: routineMap.get(routine_id) ?? routine_id,
                exercise_id: exerciseMap.get(exercise_id) ?? exercise_id,
              };
            });
            const { error: reErr } = await adminClient.from("routine_exercises").insert(reInsert);
            if (reErr) return json({ error: `routine_exercises: ${reErr.message}` }, 500);
            summary.routine_exercises = reInsert.length;
          }
        }
      }

      // ── SESSIONS + SESSION_EXERCISES + SETS ──
      if (tables.includes("sessions")) {
        const { data: sessions } = await adminClient
          .from("sessions")
          .select("*")
          .eq("user_id", source_user_id);
        if (sessions?.length) {
          const sessionMap = new Map<string, string>();
          const toInsert = sessions.map((s: any) => {
            const nid = newId();
            sessionMap.set(s.id, nid);
            const { id, user_id, created_at, routine_id, ...rest } = s;
            return {
              ...rest,
              id: nid,
              user_id: target_user_id,
              routine_id: routine_id ? (routineMap.get(routine_id) ?? routine_id) : null,
            };
          });
          const { error } = await adminClient.from("sessions").insert(toInsert);
          if (error) return json({ error: `sessions: ${error.message}` }, 500);
          summary.sessions = toInsert.length;

          // session_exercises
          const sessionIds = sessions.map((s: any) => s.id);
          const { data: sessionExs } = await adminClient
            .from("session_exercises")
            .select("*")
            .in("session_id", sessionIds);
          if (sessionExs?.length) {
            const seMap = new Map<string, string>();
            const seInsert = sessionExs.map((se: any) => {
              const nid = newId();
              seMap.set(se.id, nid);
              const { id, session_id, exercise_id, ...rest } = se;
              return {
                ...rest,
                id: nid,
                session_id: sessionMap.get(session_id) ?? session_id,
                exercise_id: exerciseMap.get(exercise_id) ?? exercise_id,
              };
            });
            const { error: seErr } = await adminClient.from("session_exercises").insert(seInsert);
            if (seErr) return json({ error: `session_exercises: ${seErr.message}` }, 500);
            summary.session_exercises = seInsert.length;

            // sets
            const seIds = sessionExs.map((se: any) => se.id);
            const { data: sets } = await adminClient
              .from("sets")
              .select("*")
              .in("session_exercise_id", seIds);
            if (sets?.length) {
              const setsInsert = sets.map((st: any) => {
                const { id, session_exercise_id, created_at, ...rest } = st;
                return {
                  ...rest,
                  id: newId(),
                  session_exercise_id: seMap.get(session_exercise_id) ?? session_exercise_id,
                };
              });
              const { error: sErr } = await adminClient.from("sets").insert(setsInsert);
              if (sErr) return json({ error: `sets: ${sErr.message}` }, 500);
              summary.sets = setsInsert.length;
            }
          }
        }
      }

      // ── PROGRAMS + PROGRAM_WEEKS ──
      if (tables.includes("programs")) {
        const { data: programs } = await adminClient
          .from("programs")
          .select("*")
          .eq("user_id", source_user_id);
        if (programs?.length) {
          const programMap = new Map<string, string>();
          const toInsert = programs.map((p: any) => {
            const nid = newId();
            programMap.set(p.id, nid);
            const { id, user_id, created_at, ...rest } = p;
            return { ...rest, id: nid, user_id: target_user_id };
          });
          const { error } = await adminClient.from("programs").insert(toInsert);
          if (error) return json({ error: `programs: ${error.message}` }, 500);
          summary.programs = toInsert.length;

          const programIds = programs.map((p: any) => p.id);
          const { data: weeks } = await adminClient
            .from("program_weeks")
            .select("*")
            .in("program_id", programIds);
          if (weeks?.length) {
            const wInsert = weeks.map((w: any) => {
              const { id, program_id, routine_id, ...rest } = w;
              return {
                ...rest,
                id: newId(),
                program_id: programMap.get(program_id) ?? program_id,
                routine_id: routine_id ? (routineMap.get(routine_id) ?? routine_id) : null,
              };
            });
            const { error: wErr } = await adminClient.from("program_weeks").insert(wInsert);
            if (wErr) return json({ error: `program_weeks: ${wErr.message}` }, 500);
            summary.program_weeks = wInsert.length;
          }
        }
      }

      // ── MEASUREMENTS ──
      if (tables.includes("measurements")) {
        const { data: measurements } = await adminClient
          .from("body_measurements")
          .select("*")
          .eq("user_id", source_user_id);
        if (measurements?.length) {
          const toInsert = measurements.map((m: any) => {
            const { id, user_id, created_at, ...rest } = m;
            return { ...rest, id: newId(), user_id: target_user_id };
          });
          const { error } = await adminClient.from("body_measurements").insert(toInsert);
          if (error) return json({ error: `measurements: ${error.message}` }, 500);
          summary.measurements = toInsert.length;
        }
      }

      return json({ success: true, summary });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err: any) {
    const status = err.message === "Not admin" ? 403 : err.message === "Not authenticated" || err.message === "No authorization" ? 401 : 500;
    console.error("[admin-users]", err);
    return json({ error: err.message || "Internal server error" }, status);
  }
});
