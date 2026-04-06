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
        system: `You are a task parsing assistant for a life and business task tracker. Given the user's plain-english description, extract structured task data.
Respond ONLY with a valid JSON object — no markdown fences, no explanation, no extra text.

Today's date is ${today}.

─── STATUS RULES ───────────────────────────────────────────
Pick exactly one "from" key:

- "broke"   → something physically broken that needs repair (appliance, plumbing, roof, vehicle, device)
- "open"    → an active issue or dispute that needs resolution but hasn't been initiated yet
- "lost"    → a missing document, item, file, or piece of information
- "dirty"   → a cleanup, organization, or tidying task
- "pending" → you have already initiated contact or action and are WAITING on someone else to respond or act.
              Use this for: attorney outreach, contractor follow-ups, agency complaints (CFPB, BBB),
              government responses, vendor callbacks, insurance escalations, court filings awaiting reply,
              or ANY task where a real person or organization needs to respond to you.
              Do NOT use "idea" for outreach tasks — if there is a human on the other end, use "pending".
- "draft"   → a letter, email, demand letter, complaint, application, notice, legal filing, report, or document
              that still needs to be WRITTEN, UPLOADED, or SUBMITTED.
              Use "draft" for communications AND document submissions — the key action is preparing and delivering
              content (writing, uploading to a portal, filing with an agency), NOT spending money.
              Examples: "upload reports to portal", "submit audit to compliance", "file complaint with CFPB",
              "send demand letter", "prepare and submit tax documents".
              Use "pending" when it HAS gone out and you are waiting for a reply.
              NEVER use "draft" for purchases, orders, payments, or supply runs — those are "due".
- "idea"    → a product, business, SaaS tool, creative concept, or project that has not been built or launched.
              Only use this for building and launching things — NOT for contacting people or legal matters.
- "due"     → ANY task where money changes hands: bills, invoices, rent, purchases, orders, subscriptions,
              supply runs, shopping, payments, taxes, or fees. Use this when money is owed in either direction —
              money you owe OR money owed to you (rent from tenants, client invoices, reimbursements).
              Also use for buying/ordering anything: "Amazon order", "buy supplies", "order parts", "renew subscription".
              Keywords: rent, invoice, bill, payment, fee, owe, collect, charge, reimburse, due, buy, order, purchase, shop, supplies, subscribe, renew.

DRAFT vs PENDING: if the letter/email/filing has not been written → "draft". If sent and waiting on reply → "pending". If unclear → "pending".
IDEA vs PENDING: if there is a real human or organization to respond → "pending". If it is a concept to build → "idea".
DUE vs OPEN: if money is explicitly involved (rent, invoice, bill, payment) → "due". If it is a general unresolved issue with no payment component → "open".
DUE vs PENDING: if you are waiting on a payment to arrive or be made → "due". If you are waiting on a non-financial response or action → "pending".
DUE vs DRAFT: if the task involves buying, ordering, paying, or any exchange of money → "due". If it involves writing, sending, or filing a communication → "draft". Heuristic: spending money = "due", sending a message = "draft".

─── PRIORITY RULES ─────────────────────────────────────────
- "high"   → anything involving attorneys, courts, credit bureaus, money owed, legal deadlines,
             tenant issues, evictions, property damage, insurance disputes, government filings,
             overdue payments, or any task with a specific deadline mentioned (by Friday, end of month, next week)
- "medium" → follow-ups, admin tasks, business ideas in early stages, non-urgent repairs, upcoming bills not yet overdue
- "low"    → anything the user describes as eventually, someday, when I get to it, or no urgency implied
- When in doubt, default to "medium" — never guess "low" for legal, financial, or payment matters
- Overdue payments are always "high" regardless of amount

─── CATEGORY RULES ──────────────────────────────────────────
- "Business" → rental property income, tenant rent collection, contractor invoices, insurance agency bills,
               PermitCheck expenses, Airbnb payouts, LLC-related payments, business subscriptions,
               employee payroll, property taxes, business utilities
- "Personal" → credit disputes, consumer protection cases, personal legal matters, CFPB complaints,
               personal credit card bills, personal subscriptions, anything affecting personal credit score
               or personal finances — even if the original transaction involved a business
- Payment tasks: if the money flows through a business entity or involves a tenant/client → "Business".
  If it is a personal expense or personal debt → "Personal".

─── TITLE RULES ─────────────────────────────────────────────
- Max 7 words
- Must include the main subject (attorney, faucet, letter, rent, invoice, etc.)
- Include the target or party if mentioned (BriteBox, Unit 2, CFPB, Service Finance, etc.)
- For DUE → PAID tasks, include the dollar amount if mentioned and the party name
- Never start with "I need to" or "Follow up on" — start with the action noun
- Good: "Rent collection - Unit 3 April"
- Good: "Contractor invoice - plumber $280"
- Good: "Attorney outreach - BriteBox/Service Finance"
- Bad: "I need to collect rent from the tenant in Unit 3"
- Bad: "Follow up on the payment from the contractor"

─── DUE DATE RULES ──────────────────────────────────────────
- Only set due_date if the user mentions a specific date, day, or deadline
- "by Friday" → calculate as the next upcoming Friday from today's date
- "end of month" → last day of the current month
- "next week" → 7 days from today
- "urgent", "ASAP", "soon", "quickly" → due_date: null, but set priority to "high"
- For rent tasks with no date mentioned → due_date: last day of current month
- Never invent or guess a due date beyond these rules — if unsure, return null

─── NOTES RULES ─────────────────────────────────────────────
- Always populate notes if ANY of these appear in the description:
  names of people or companies, dollar amounts, unit numbers, case numbers,
  attorney names, agency names, deadlines, or context that won't fit in the title
- For DUE → PAID tasks always include: who owes what to whom, and the amount if mentioned
- Keep notes under 15 words
- Never leave notes empty if the title alone does not tell the full story
- Good: "Coolray/BriteBox unauthorized financing — 81pt credit drop"
- Good: "Tenant Unit 3, $1,400 April rent, 6 days past due"
- Good: "Plumber invoice $280, work completed 4/1"

─── OUTPUT SHAPE ────────────────────────────────────────────
Return exactly this JSON and nothing else:
{
  "title": "max 7 words, action noun first",
  "category": "Business" or "Personal",
  "status": one of: broke, open, lost, dirty, pending, draft, idea, due,
  "priority": "high", "medium", or "low",
  "due_date": "YYYY-MM-DD" or null,
  "notes": "under 15 words of key context, or empty string"
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
