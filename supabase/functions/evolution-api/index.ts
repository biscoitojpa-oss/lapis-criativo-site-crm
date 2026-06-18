import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Evolution GO adapter
 * Docs: https://pool-evolution-go-008.cloud.pageup.dev.br/swagger/index.html
 *
 * Auth model:
 *  - Global endpoints (/instance/all, /instance/create, /instance/delete/{id},
 *    /instance/get/{id}, /instance/forcereconnect/{id}) → apikey: GLOBAL_KEY
 *  - Per-instance endpoints (/send/*, /instance/status, /instance/qr,
 *    /instance/connect, /instance/disconnect, /instance/logout, /chat/*, etc.)
 *    → apikey: <instance token returned at create time>
 *
 * The instance is identified by the apikey header (no path/name segment).
 *
 * To preserve compatibility with the previous code that called instances by
 * name, we cache name → { instanceId, token } from /instance/all on every
 * request that needs it.
 */

const GLOBAL_URL = Deno.env.get("EVOLUTION_GO_URL");
const GLOBAL_KEY = Deno.env.get("EVOLUTION_GO_API_KEY");

type InstanceMeta = { instanceId: string; token: string; name: string; connectionStatus: string };

async function fetchAllInstances(): Promise<any[]> {
  const resp = await fetch(`${GLOBAL_URL}/instance/all`, {
    headers: { apikey: GLOBAL_KEY!, "Content-Type": "application/json" },
  });
  if (!resp.ok) throw new Error(`fetch instances failed: ${resp.status} ${await resp.text()}`);
  const data = await resp.json();
  // Evolution GO returns gin.H — could be { instances: [...] } or an array
  const list = Array.isArray(data) ? data : (data.instances || data.data || []);
  return list;
}

function normalizeInstance(raw: any): InstanceMeta {
  return {
    instanceId: raw.instanceId || raw.id || raw.InstanceID || raw.ID || "",
    token: raw.token || raw.Token || raw.apikey || raw.apiKey || "",
    name: raw.name || raw.Name || raw.instanceName || "",
    connectionStatus: raw.connectionStatus || raw.status || raw.state || raw.Status || "unknown",
  };
}

async function resolveInstance(nameOrId: string): Promise<InstanceMeta> {
  const list = await fetchAllInstances();
  const normalized = list.map(normalizeInstance);
  const found = normalized.find(
    (i) => i.name?.toLowerCase() === nameOrId.toLowerCase() || i.instanceId === nameOrId
  );
  if (!found) throw new Error(`Instance "${nameOrId}" not found`);
  return found;
}

async function callInstance(method: string, path: string, token: string, body?: any) {
  const resp = await fetch(`${GLOBAL_URL}${path}`, {
    method,
    headers: { apikey: token, "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await resp.text();
  let result: any = {};
  try { result = text ? JSON.parse(text) : {}; } catch { result = { raw: text }; }
  if (!resp.ok) throw new Error(result.error || result.message || text || `HTTP ${resp.status}`);
  return result;
}

async function callGlobal(method: string, path: string, body?: any) {
  const resp = await fetch(`${GLOBAL_URL}${path}`, {
    method,
    headers: { apikey: GLOBAL_KEY!, "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await resp.text();
  let result: any = {};
  try { result = text ? JSON.parse(text) : {}; } catch { result = { raw: text }; }
  if (!resp.ok) throw new Error(result.error || result.message || text || `HTTP ${resp.status}`);
  return result;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!GLOBAL_URL || !GLOBAL_KEY) throw new Error("Evolution GO não configurada (EVOLUTION_GO_URL / EVOLUTION_GO_API_KEY)");

    const { action, instanceName, data } = await req.json();
    let result: any = {};

    switch (action) {
      case "fetchInstances": {
        const list = await fetchAllInstances();
        // Return shape compatible with previous frontend: array of { name, connectionStatus, instanceId, token }
        result = list.map(normalizeInstance);
        break;
      }

      case "connectionState": {
        const meta = await resolveInstance(instanceName);
        const state = await callInstance("GET", "/instance/status", meta.token);
        result = {
          instance: { instanceName: meta.name, state: state.status || state.state || meta.connectionStatus },
          state: state.status || state.state || meta.connectionStatus,
        };
        break;
      }

      case "instanceInfo": {
        const meta = await resolveInstance(instanceName);
        // /instance/connect with subscribe to retrieve QR + ensure webhook
        const subscribeEvents = data?.subscribe || ["MESSAGE", "CONNECTION", "QRCODE", "SEND_MESSAGE"];
        const webhookUrl = data?.webhookUrl;
        result = await callInstance("POST", "/instance/connect", meta.token, {
          subscribe: subscribeEvents,
          ...(webhookUrl ? { webhookUrl } : {}),
          immediate: true,
        });
        break;
      }

      case "createInstance": {
        const name = data?.instanceName || instanceName;
        const created = await callGlobal("POST", "/instance/create", {
          name,
          ...(data?.proxy ? { proxy: data.proxy } : {}),
          advancedSettings: {
            alwaysOnline: false,
            ignoreGroups: true,
            ignoreStatus: true,
            readMessages: false,
            rejectCall: false,
          },
        });
        const meta = normalizeInstance(created.instance || created);
        // Connect with webhook + QR
        if (meta.token) {
          const webhookUrl = data?.webhookUrl;
          const connectResult = await callInstance("POST", "/instance/connect", meta.token, {
            subscribe: ["MESSAGE", "CONNECTION", "QRCODE", "SEND_MESSAGE"],
            ...(webhookUrl ? { webhookUrl } : {}),
            immediate: true,
          });
          // Try to fetch QR
          try {
            const qr = await callInstance("GET", "/instance/qr", meta.token);
            result = { ...created, ...connectResult, qrcode: { base64: qr.qrcode || qr.base64 || qr.qr } };
          } catch {
            result = { ...created, ...connectResult };
          }
        } else {
          result = created;
        }
        break;
      }

      case "deleteInstance": {
        const meta = await resolveInstance(instanceName);
        result = await callGlobal("DELETE", `/instance/delete/${meta.instanceId}`);
        break;
      }

      case "sendTest": {
        const meta = await resolveInstance(instanceName);
        // TextStruct: { number, text, delay?, ... }
        const number = (data?.number || "").replace(/\D/g, "");
        result = await callInstance("POST", "/send/text", meta.token, {
          number,
          text: data?.text,
        });
        break;
      }

      case "logout": {
        const meta = await resolveInstance(instanceName);
        result = await callInstance("DELETE", "/instance/logout", meta.token);
        break;
      }

      case "restart": {
        const meta = await resolveInstance(instanceName);
        result = await callGlobal("POST", `/instance/forcereconnect/${meta.instanceId}`, {
          number: data?.number || "",
        });
        break;
      }

      case "qrcode": {
        const meta = await resolveInstance(instanceName);
        result = await callInstance("GET", "/instance/qr", meta.token);
        break;
      }

      case "setWebhook": {
        const meta = await resolveInstance(instanceName);
        result = await callInstance("POST", "/instance/connect", meta.token, {
          subscribe: data?.subscribe || ["MESSAGE", "CONNECTION", "QRCODE", "SEND_MESSAGE"],
          webhookUrl: data?.webhookUrl || data?.url,
          immediate: true,
        });
        break;
      }

      default:
        throw new Error(`Ação desconhecida: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Evolution GO error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
