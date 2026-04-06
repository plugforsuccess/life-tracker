import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { prompt } = await req.json();

    if (!prompt || typeof prompt !== "string") {
      return new Response(JSON.stringify({ error: "Missing prompt" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const today = new Date().toISOString().split("T")[0];

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: `You are a task parsing assistant for a life/business task tracker. Given the user's plain-english description, extract structured task data.
Respond ONLY with a valid JSON object — no markdown fences, no explanation, no extra text.

Status options (pick the most fitting "from" key):
- "broke"   → something broken needing repair
- "open"    → active issue needing resolution
- "lost"    → missing document/item/info
- "dirty"   → cleanup or organization task
- "pending" → waiting on someone else to respond or act — use this for attorney outreach, contractor follow-ups, agency complaints, government responses, vendor callbacks, or ANY task where you have already initiated contact and are waiting on a reply from a real person or organization
- "draft"   → a letter, email, demand letter, complaint, or filing that still needs to be written or sent
- "idea"    → a product, business, SaaS, or creative concept that hasn't been built or launched yet — do NOT use this for professional outreach, legal matters, or contacting people

Today's date is ${today}.

Return exactly this shape:
{
  "title": "short, clear task title (max 8 words)",
  "category": "Business" or "Personal",
  "status": one of the keys above,
  "priority": "high", "medium", or "low",
  "due_date": "YYYY-MM-DD" or null,
  "notes": "any extra context worth capturing — include names of attorneys, contractors, companies, or agencies mentioned, or empty string"
}`,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return new Response(JSON.stringify({ error: `Anthropic API error: ${res.status}`, details: err }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    const text = data.content?.find((b: any) => b.type === "text")?.text || "";
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
