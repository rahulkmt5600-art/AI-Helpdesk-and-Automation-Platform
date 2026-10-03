const GROQ_URL =
  "https://api.groq.com/openai/v1/chat/completions";

const MODEL = "openai/gpt-oss-120b";

// ============================================================
// VALID VALUES
// ============================================================

const VALID_CATEGORIES = [
  "hardware",
  "software",
  "network",
  "access",
  "billing",
  "other",
];

const VALID_PRIORITIES = [
  "low",
  "medium",
  "high",
];

// ============================================================
// GROQ API HELPER
// ============================================================

async function callGroq(
  messages,
  {
    temperature = 0.2,
    maxTokens = 300,
  } = {}
) {
  const response = await fetch(GROQ_URL, {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },

    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const body = await response.text();

    throw new Error(
      `Groq API responded ${response.status}: ${body}`
    );
  }

  const data = await response.json();

  if (
    !data.choices ||
    !data.choices[0] ||
    !data.choices[0].message
  ) {
    throw new Error(
      "Invalid response received from Groq API"
    );
  }

  return data.choices[0].message.content;
}

// ============================================================
// AI TICKET CLASSIFICATION PROMPT
// ============================================================

const CLASSIFY_SYSTEM_PROMPT = `
You are an AI triage assistant for an internal IT helpdesk.

Your task is to analyze a support ticket and classify it.

Respond with ONLY a valid JSON object.

Do NOT use:
- Markdown
- Code fences
- Explanation outside JSON
- Extra keys

The JSON object must contain exactly these keys:

{
  "category": "hardware | software | network | access | billing | other",
  "priority": "low | medium | high",
  "summary": "single sentence under 20 words",
  "confidence": 0.0,
  "reason": "short explanation of why the category and priority were selected"
}

CATEGORY GUIDANCE:

hardware:
Physical devices or components such as:
- laptop
- desktop
- monitor
- keyboard
- mouse
- printer
- hard drive
- RAM
- battery
- physical device failure

software:
Applications, operating systems, software installation,
crashes, bugs, configuration problems, or application errors.

network:
Internet, Wi-Fi, VPN, LAN, connectivity,
DNS, network access, connection drops, or slow network.

access:
Login problems, password reset, account lock,
permissions, authentication, authorization, or access requests.

billing:
Payments, invoices, subscriptions, charges,
billing disputes, or payment failures.

other:
Use this when the issue does not clearly belong
to the categories above.

PRIORITY GUIDANCE:

high:
The user cannot work, has a major outage,
has a serious access problem, or the issue blocks
an important business function.

medium:
The issue is significant but there is a workaround
or the user can continue working partially.

low:
Minor issue, general question, cosmetic issue,
non-urgent request, or informational request.

CONFIDENCE:

Return a number between 0 and 1.

Examples:
0.95 = very clear classification
0.85 = strong classification
0.70 = reasonably clear
0.55 = uncertain
0.40 = highly uncertain

The confidence should represent how certain you are
about the classification based on the information provided.

REASON:

Explain briefly why the selected category and priority
fit the ticket.

The reason must:
- Be concise
- Be factual
- Mention the important evidence from the ticket
- Not exceed 30 words

Example:

{
  "category": "network",
  "priority": "high",
  "summary": "User cannot connect to the company VPN.",
  "confidence": 0.94,
  "reason": "The ticket explicitly reports VPN connection failure, which is a network issue and prevents the user from accessing required resources."
}
`;

// ============================================================
// CLASSIFY TICKET
// ============================================================

async function classifyTicket(
  title,
  description
) {
  const userPrompt = `
Ticket title: ${title}

Ticket description: ${description}
`;

  const raw = await callGroq([
    {
      role: "system",
      content: CLASSIFY_SYSTEM_PROMPT,
    },
    {
      role: "user",
      content: userPrompt,
    },
  ]);

  // ----------------------------------------------------------
  // Parse AI response
  // ----------------------------------------------------------

  let parsed;

  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    console.error(
      "Failed to parse Groq classification:",
      raw
    );

    throw new Error(
      "AI returned an invalid classification response"
    );
  }

  // ----------------------------------------------------------
  // Validate category
  // ----------------------------------------------------------

  const category =
    VALID_CATEGORIES.includes(parsed.category)
      ? parsed.category
      : "other";

  // ----------------------------------------------------------
  // Validate priority
  // ----------------------------------------------------------

  const priority =
    VALID_PRIORITIES.includes(parsed.priority)
      ? parsed.priority
      : "medium";

  // ----------------------------------------------------------
  // Validate summary
  // ----------------------------------------------------------

  const summary =
    typeof parsed.summary === "string"
      ? parsed.summary
          .trim()
          .slice(0, 200)
      : "";

  // ----------------------------------------------------------
  // Validate confidence
  // ----------------------------------------------------------

  let confidence = 0;

  if (
    typeof parsed.confidence === "number" &&
    Number.isFinite(parsed.confidence)
  ) {
    confidence = Math.min(
      Math.max(parsed.confidence, 0),
      1
    );
  }

  // ----------------------------------------------------------
  // Validate reason
  // ----------------------------------------------------------

  const reason =
    typeof parsed.reason === "string"
      ? parsed.reason
          .trim()
          .slice(0, 200)
      : "";

  // ----------------------------------------------------------
  // Return clean classification
  // ----------------------------------------------------------

  return {
    category,
    priority,
    summary,
    confidence,
    reason,
  };
}

// ============================================================
// AI SUGGESTED REPLY
// ============================================================

const REPLY_SYSTEM_PROMPT = `
You are an IT support agent writing a response to a helpdesk requester.

Generate a complete response of 3 to 5 sentences.

The response must:
- Directly acknowledge the user's specific problem.
- Use the provided Knowledge Base information when it is relevant.
- Give practical troubleshooting steps based on the Knowledge Base.
- Ask one useful question if more information is needed.
- Be professional, friendly, and easy to understand.
- Do not invent facts or troubleshooting steps.
- Do not claim the problem is fixed unless the ticket status is resolved.
- Do not promise a resolution time.
- Do not include a greeting such as "Dear User".
- Do not include a signature.
- Do not use markdown.
- Do not output headings.
- Do not explain that you are an AI.
- Return ONLY the complete response text.

IMPORTANT:
Do not stop after the first sentence.
Always provide a complete 3-5 sentence response.
`;


// ============================================================
// GENERATE AI SUGGESTED REPLY
// ============================================================

async function generateSuggestedReply(
  ticket,
  knowledgeContext = ""
) {
  const userPrompt = `
Ticket title:
${ticket.title}

Ticket description:
${ticket.description}

Category:
${ticket.category}

Priority:
${ticket.priority}

Current status:
${ticket.status}

Knowledge Base information:
${knowledgeContext || "No relevant Knowledge Base information was found."}

Using the ticket information and Knowledge Base context,
write a concise support reply draft for the IT support agent.
`;

  const draft = await callGroq(
    [
      {
        role: "system",
        content: REPLY_SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: userPrompt,
      },
    ],
    {
      temperature: 0.4,
      maxTokens: 220,
    }
  );

  return draft.trim();
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  classifyTicket,
  generateSuggestedReply,
};