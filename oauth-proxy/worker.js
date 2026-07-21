/**
 * GitHub OAuth token-exchange proxy for the /portfolio/admin dashboard.
 *
 * WHY THIS EXISTS: GitHub Pages serves static files only. Turning the
 * "code" GitHub sends back after login into a real access token requires
 * a client secret - and a secret can never be shipped to the browser.
 * This is the one piece of the whole dashboard that needs an actual
 * server, and it's intentionally as small as possible: it does exactly
 * one thing (the token exchange) and holds no other state or data.
 *
 * Deploy target: Cloudflare Workers (free tier is more than enough -
 * this gets called once per login, not per request).
 */

const ALLOWED_ORIGIN = "https://hassanireza.github.io";

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }

    if (request.method !== "POST") {
      return json({ error: "method_not_allowed" }, 405);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "invalid_json" }, 400);
    }

    const code = body.code;
    if (!code || typeof code !== "string") {
      return json({ error: "missing_code" }, 400);
    }

    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    const data = await tokenRes.json();
    return json(data, tokenRes.ok ? 200 : 400);
  },
};

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}
