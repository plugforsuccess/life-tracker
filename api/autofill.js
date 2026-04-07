export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { prompt } = req.body;
  if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
    return res.status(400).json({ error: "Prompt is required" });
  }

  if (prompt.length > 500) {
    return res.status(400).json({ error: "Prompt too long" });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: `You are a task parsing assistant for a life and business task tracker. Given the user's plain-english description, extract structured task data.
Respond ONLY with a valid JSON object — no markdown fences, no explanation, no extra text.

Today's date is ${new Date().toISOString().split("T")[0]}.

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
- "draft"   → a letter, email, demand letter, complaint, or legal filing that still needs to be WRITTEN or SENT.
              Use "draft" when the communication has NOT gone out yet.
              Use "pending" when it HAS gone out and you are waiting for a reply.
- "idea"    → a product, business, SaaS tool, creative concept, or project that has not been built or launched.
              Only use this for building and launching things — NOT for contacting people or legal matters.
- "due"     → a bill, invoice, rent payment, contractor payment, subscription, tax, or any amount of money
              that needs to be paid or collected. Use this when money is owed in either direction.

DRAFT vs PENDING: if the letter/email/filing has not been written → "draft". If sent and waiting on reply → "pending". If unclear → "pending".
IDEA vs PENDING: if there is a real human or organization to respond → "pending". If it is a concept to build → "idea".
DUE vs OPEN: if money is explicitly involved → "due". Otherwise → "open".

─── PRIORITY RULES ─────────────────────────────────────────
- "high"   → attorneys, courts, credit bureaus, money owed, legal deadlines, tenant issues,
             evictions, property damage, insurance disputes, government filings, overdue payments,
             or any task with a specific deadline mentioned
- "medium" → follow-ups, admin tasks, business ideas, non-urgent repairs, upcoming bills not yet overdue
- "low"    → anything described as eventually, someday, or no urgency implied
- Default to "medium" — never guess "low" for legal or financial matters

─── CATEGORY RULES ──────────────────────────────────────────
- "Business" → rental property, tenants, insurance agency, SaaS, Airbnb, contractors, LLCs
- "Personal" → credit disputes, consumer protection, personal legal matters, personal finances

─── TITLE RULES ─────────────────────────────────────────────
- Max 7 words, action noun first
- Include party name if mentioned
- Never start with "I need to" or "Follow up on"

─── DUE DATE RULES ──────────────────────────────────────────
- Only set if specific date/day/deadline mentioned
- "by Friday" → next upcoming Friday
- "end of month" → last day of current month
- "urgent"/"ASAP" → due_date: null, priority: "high"
- Never invent a due date

─── NOTES RULES ─────────────────────────────────────────────
- Always include: names, dollar amounts, unit numbers, case numbers, deadlines
- Keep under 15 words
- Never leave empty if title alone doesn't tell the full story

─── OUTPUT ──────────────────────────────────────────────────
Return exactly this JSON and nothing else:
{
  "title": "max 7 words, action noun first",
  "category": "Business" or "Personal",
  "status": one of: broke, open, lost, dirty, pending, draft, idea, due,
  "priority": "high", "medium", or "low",
  "due_date": "YYYY-MM-DD" or null,
  "notes": "under 15 words or empty string"
}`,
        messages: [{ role: "user", content: prompt.trim() }],
      }),
    });

    const data = await response.json();
    const text = data.content?.find(b => b.type === "text")?.text || "";
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
    res.status(200).json(parsed);
  } catch (err) {
    console.error("Autofill error:", err);
    res.status(500).json({ error: "Failed to parse task. Try being more specific." });
  }
}
