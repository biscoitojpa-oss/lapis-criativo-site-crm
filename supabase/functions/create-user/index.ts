import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Verify caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Não autorizado");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { email, password, nome, cargo } = await req.json();
    if (!email || !password || !nome) throw new Error("Email, senha e nome são obrigatórios");

    const { data: userData, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: nome },
    });

    if (createError) throw createError;

    // Update profile
    await supabase.from("profiles").update({ nome, cargo: cargo || "" }).eq("user_id", userData.user.id);

    // Add member role
    await supabase.from("user_roles").upsert({
      user_id: userData.user.id,
      role: "member",
    }, { onConflict: "user_id,role" });

    return new Response(JSON.stringify({ success: true, user_id: userData.user.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
