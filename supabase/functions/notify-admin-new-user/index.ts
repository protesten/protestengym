import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Authenticate: accept either service role key OR user JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    let callerUserId: string | null = null;

    // If it's the service role key, trust the body's record
    const isServiceRole = token === serviceRoleKey;

    if (!isServiceRole) {
      // Validate user JWT
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data, error } = await userClient.auth.getUser(token);
      if (error || !data?.user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      callerUserId = data.user.id;
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Get profile info
    let profileUserId: string;
    let displayName: string;

    if (isServiceRole) {
      const { record } = await req.json();
      if (!record) {
        return new Response(JSON.stringify({ error: "No record" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      profileUserId = record.user_id;
      displayName = record.display_name || "Sin nombre";
    } else {
      // User calling for themselves
      profileUserId = callerUserId!;
      const { data: profile } = await adminClient
        .from("profiles")
        .select("display_name, is_approved")
        .eq("user_id", profileUserId)
        .single();

      if (!profile || profile.is_approved) {
        // Already approved or no profile — nothing to notify
        return new Response(JSON.stringify({ ok: true, message: "No notification needed" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      displayName = profile.display_name || "Sin nombre";
    }

    // Find admin emails
    const { data: adminRoles } = await adminClient
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (!adminRoles?.length) {
      console.log("No admins found to notify");
      return new Response(JSON.stringify({ ok: true, message: "No admins" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminEmails: string[] = [];
    for (const role of adminRoles) {
      const { data: { user } } = await adminClient.auth.admin.getUserById(role.user_id);
      if (user?.email) adminEmails.push(user.email);
    }

    if (!adminEmails.length) {
      return new Response(JSON.stringify({ ok: true, message: "No admin emails" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newUserName = escapeHtml(displayName);
    let userEmail = "desconocido";
    try {
      const { data: { user } } = await adminClient.auth.admin.getUserById(profileUserId);
      if (user?.email) userEmail = user.email;
    } catch {}
    const safeEmail = escapeHtml(userEmail);
    const safeSubject = displayName.replace(/[<>"'&]/g, "");

    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (resendApiKey) {
      for (const adminEmail of adminEmails) {
        try {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${resendApiKey}`,
            },
            body: JSON.stringify({
              from: "ProtestenGym <notifications@gym.protesten.com>",
              to: [adminEmail],
              subject: `Nuevo usuario pendiente: ${safeSubject}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
                  <h2 style="color: #111; margin-bottom: 16px;">Nuevo usuario registrado</h2>
                  <p style="color: #555; font-size: 14px;">Un nuevo usuario se ha registrado y está pendiente de aprobación:</p>
                  <div style="background: #f5f5f5; border-radius: 12px; padding: 16px; margin: 16px 0;">
                    <p style="margin: 4px 0; font-weight: bold;">${newUserName}</p>
                    <p style="margin: 4px 0; color: #777; font-size: 13px;">${safeEmail}</p>
                  </div>
                  <p style="color: #555; font-size: 14px;">Accede a tu perfil en la app para aprobar o rechazar este usuario.</p>
                </div>
              `,
            }),
          });
        } catch (emailErr) {
          console.error("Error sending notification to", adminEmail, emailErr);
        }
      }
    } else {
      console.log("RESEND_API_KEY not configured. Skipping email notifications.");
      console.log(`New user pending: ${displayName} (${userEmail}). Admins to notify: ${adminEmails.join(", ")}`);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("notify-admin-new-user error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
