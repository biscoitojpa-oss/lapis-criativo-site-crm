import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      throw new Error("Evolution API não configurada");
    }

    const { action, instanceName, data } = await req.json();

    let url = "";
    let method = "GET";
    let body: string | undefined;

    switch (action) {
      case "fetchInstances":
        url = `${EVOLUTION_API_URL}/instance/fetchInstances`;
        break;
      case "connectionState":
        url = `${EVOLUTION_API_URL}/instance/connectionState/${instanceName}`;
        break;
      case "instanceInfo":
        url = `${EVOLUTION_API_URL}/instance/connect/${instanceName}`;
        break;
      case "createInstance":
        url = `${EVOLUTION_API_URL}/instance/create`;
        method = "POST";
        body = JSON.stringify({
          instanceName: data?.instanceName || instanceName,
          integration: data?.integration || "WHATSAPP-BAILEYS",
          qrcode: true,
          ...(data?.webhookUrl ? { webhook: { url: data.webhookUrl, byEvents: false, base64: false, events: ["MESSAGES_UPSERT"] } } : {}),
          ...(data || {}),
        });
        break;
      case "deleteInstance":
        url = `${EVOLUTION_API_URL}/instance/delete/${instanceName}`;
        method = "DELETE";
        break;
      case "sendTest":
        url = `${EVOLUTION_API_URL}/message/sendText/${instanceName}`;
        method = "POST";
        body = JSON.stringify(data);
        break;
      case "logout":
        url = `${EVOLUTION_API_URL}/instance/logout/${instanceName}`;
        method = "DELETE";
        break;
      case "restart":
        url = `${EVOLUTION_API_URL}/instance/restart/${instanceName}`;
        method = "PUT";
        break;
      case "setWebhook":
        url = `${EVOLUTION_API_URL}/webhook/set/${instanceName}`;
        method = "POST";
        body = JSON.stringify(data);
        break;
      default:
        throw new Error(`Ação desconhecida: ${action}`);
    }

    const resp = await fetch(url, {
      method,
      headers: {
        apikey: EVOLUTION_API_KEY,
        "Content-Type": "application/json",
      },
      ...(body ? { body } : {}),
    });

    const result = await resp.json();

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Evolution API error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
