import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { record } = await req.json();
    if (!record) {
      return new Response(JSON.stringify({ error: "No record" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Get admin users
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

    // Get admin emails
    const adminEmails: string[] = [];
    for (const role of adminRoles) {
      const { data: { user } } = await adminClient.auth.admin.getUserById(role.user_id);
      if (user?.email) adminEmails.push(user.email);
    }

    if (!adminEmails.length) {
      console.log("No admin emails found");
      return new Response(JSON.stringify({ ok: true, message: "No admin emails" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newUserName = record.display_name || "Sin nombre";
    const newUserEmail = record.user_id; // We'll get the actual email below

    // Get the new user's email
    let userEmail = "desconocido";
    try {
      const { data: { user } } = await adminClient.auth.admin.getUserById(record.user_id);
      if (user?.email) userEmail = user.email;
    } catch {}

    // Send notification email to each admin using Supabase's built-in SMTP
    // We use the admin API to send a simple notification
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
              subject: `Nuevo usuario pendiente: ${newUserName}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
                  <h2 style="color: #111; margin-bottom: 16px;">Nuevo usuario registrado</h2>
                  <p style="color: #555; font-size: 14px;">Un nuevo usuario se ha registrado y está pendiente de aprobación:</p>
                  <div style="background: #f5f5f5; border-radius: 12px; padding: 16px; margin: 16px 0;">
                    <p style="margin: 4px 0; font-weight: bold;">${newUserName}</p>
                    <p style="margin: 4px 0; color: #777; font-size: 13px;">${userEmail}</p>
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
      console.log(`New user pending: ${newUserName} (${userEmail}). Admins to notify: ${adminEmails.join(", ")}`);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("notify-admin-new-user error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
