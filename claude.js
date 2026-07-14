// ================================================================
// SECURITY SETTINGS - the only bits you'd ever change
// ================================================================

// Websites allowed to use this endpoint. Add a line if you ever
// host a tool on another domain.
const ALLOWED_ORIGINS = [
  'https://toolkit.haveitallacademy.com'
];

// The only model this endpoint will ever run (the cheapest one).
// Requests asking for any other model are forced onto this one.
const ALLOWED_MODEL = 'claude-haiku-4-5-20251001';

// Hard ceilings, whatever the caller asks for.
const MAX_TOKENS_CAP = 5000;     // biggest allowed response
const MAX_INPUT_CHARS = 30000;   // biggest allowed prompt

// ================================================================

export default async (request) => {
  const origin = request.headers.get('origin') || '';
  const originAllowed = ALLOWED_ORIGINS.includes(origin);
  const corsHeaders = {
    'Access-Control-Allow-Origin': originAllowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (request.method === 'OPTIONS') {
    return new Response('', { status: 200, headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Refuse requests that don't come from an allowed website.
  // Browsers always send the Origin header on POST; tools like curl don't.
  if (!originAllowed) {
    return new Response(
      JSON.stringify({ error: { message: 'Forbidden' } }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await request.json();

    // Validate and clamp everything before it touches the API key.
    const maxTokens = Math.min(Math.max(1, parseInt(body.max_tokens, 10) || 2000), MAX_TOKENS_CAP);
    const system = typeof body.system === 'string' ? body.system : '';
    const messages = Array.isArray(body.messages) ? body.messages.slice(0, 4) : null;

    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: { message: 'Bad request' } }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    let totalChars = system.length;
    for (const m of messages) {
      if (!m || typeof m.content !== 'string' || (m.role !== 'user' && m.role !== 'assistant')) {
        return new Response(
          JSON.stringify({ error: { message: 'Bad request' } }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }
      totalChars += m.content.length;
    }
    if (totalChars > MAX_INPUT_CHARS) {
      return new Response(
        JSON.stringify({ error: { message: 'Request too large' } }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Access API key - try Netlify first, then Deno
    let apiKey;
    try { apiKey = Netlify.env.get('ANTHROPIC_API_KEY'); } catch(e) {}
    if (!apiKey) { try { apiKey = Deno.env.get('ANTHROPIC_API_KEY'); } catch(e) {} }

    if (!apiKey) {
      return new Response(JSON.stringify({ error: { message: 'API key not configured' } }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: ALLOWED_MODEL,   // caller's choice is ignored on purpose
        max_tokens: maxTokens,
        system: system,
        messages: messages,
        stream: true
      })
    });

    if (!anthropicResponse.ok) {
      const errorText = await anthropicResponse.text();
      return new Response(errorText, {
        status: anthropicResponse.status,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    return new Response(anthropicResponse.body, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        ...corsHeaders
      }
    });

  } catch (error) {
    return new Response(
      JSON.stringify({ error: { message: error.message } }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
};

export const config = { path: '/api/claude' };
