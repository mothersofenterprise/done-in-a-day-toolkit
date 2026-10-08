// ================================================================
// FAMILY-FIRST MAP → KARTRA
// Saves a woman's Map answers onto her Kartra lead (creates the lead
// if she isn't in Kartra yet) and tags her, so emails can match her stage.
//
// Needs 3 Netlify environment variables (Site settings → Environment variables):
//   KARTRA_APP_ID        (Kartra → Settings → Integrations → My Apps)
//   KARTRA_API_KEY       (Kartra → Settings → Integrations → API)
//   KARTRA_API_PASSWORD  (Kartra → Settings → Integrations → API)
// ================================================================

import { getStore } from 'https://esm.sh/@netlify/blobs@8';

// SAVE THE FULL MAP AS A PRIVATE PAGE (/m/<id>) and put the link on her Kartra lead.
// If saving ever fails, everything else still works (she just gets her starting point).
const SAVE_FULL_MAP = true;
// The Academy/offer button on the saved page may only point to these sites.
const SAFE_LINK_HOSTS = ['www.haveitallacademy.com', 'haveitallacademy.com', 'toolkit.haveitallacademy.com'];

// Websites allowed to use this endpoint (same as the Claude endpoint).
const ALLOWED_ORIGINS = [
  'https://toolkit.haveitallacademy.com'
];

// TAGS: these must already exist in Kartra (Kartra can't create tags by API).
// A missing tag is skipped, it won't break anything else.
const TAG_ALWAYS = 'Map Completed';
const TAG_EMAIL_ME = 'Map Email Requested';   // use this to trigger the "here's your Map" email
const STAGE_TAGS = {
  1: 'Map Stage 1 - No idea yet',
  2: 'Map Stage 2 - Idea not launched',
  3: 'Map Stage 3 - Selling but patchy',
  4: 'Map Stage 4 - Maxed out'
};
const BLOCKER_TAGS = [
  ['know what to make', 'Map Blocker - What to make'],
  ['Time', 'Map Blocker - Time'],
  ['tech', 'Map Blocker - Tech'],
  ['Confidence', 'Map Blocker - Confidence'],
  ['tried things', 'Map Blocker - Tried before'],
  ['Life keeps happening', 'Map Blocker - Life season']
];

// CUSTOM FIELDS: create these in Kartra as text areas with exactly these identifiers.
// Kartra quietly ignores any that don't exist yet.
const FIELDS = {
  stage: 'FFMap_stage',
  blocker: 'FFMap_blocker',
  goal: 'FFMap_goal',
  hours: 'FFMap_hours',
  business: 'FFMap_business',
  link: 'FFMap_link',      // link to her saved full Map page
  report: 'FFMap_report'   // holds her "You are here" starting point, 360 chars max
};

const STAGE_LABELS = {
  1: 'No idea yet',
  2: 'Has an idea, not launched',
  3: 'Selling but patchy',
  4: 'Business works but maxed out'
};

const clip = (v, n) => String(v || '').slice(0, n);

export default async (request) => {
  const origin = request.headers.get('origin') || '';
  // Optional test site: set EXTRA_ALLOWED_ORIGIN in Netlify (e.g. https://map-test-123.netlify.app)
  let extraOrigin = '';
  try { extraOrigin = Netlify.env.get('EXTRA_ALLOWED_ORIGIN') || ''; } catch (e) {}
  if (!extraOrigin) { try { extraOrigin = Deno.env.get('EXTRA_ALLOWED_ORIGIN') || ''; } catch (e) {} }
  const originAllowed = ALLOWED_ORIGINS.includes(origin) || (extraOrigin && origin === extraOrigin.replace(/\/$/, ''));
  const cors = {
    'Access-Control-Allow-Origin': originAllowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };
  const reply = (status, obj) => new Response(JSON.stringify(obj), {
    status, headers: { 'Content-Type': 'application/json', ...cors }
  });

  if (request.method === 'OPTIONS') return new Response('', { status: 200, headers: cors });
  if (request.method !== 'POST') return reply(405, { ok: false, error: 'Method not allowed' });
  if (!originAllowed) return reply(403, { ok: false, error: 'Forbidden' });

  const env = (k) => {
    try { const v = Netlify.env.get(k); if (v) return v; } catch (e) {}
    try { return Deno.env.get(k); } catch (e) { return undefined; }
  };
  const auth = {
    app_id: env('KARTRA_APP_ID'),
    api_key: env('KARTRA_API_KEY'),
    api_password: env('KARTRA_API_PASSWORD')
  };
  if (!auth.app_id || !auth.api_key || !auth.api_password) {
    return reply(500, { ok: false, error: 'Kartra not configured' });
  }

  let b;
  try { b = await request.json(); } catch (e) { return reply(400, { ok: false, error: 'Bad request' }); }

  const email = clip(b.email, 120).trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return reply(400, { ok: false, error: 'Bad email' });
  const stage = [1, 2, 3, 4].includes(Number(b.stage)) ? Number(b.stage) : 0;
  const blocker = clip(b.blocker, 200);

  const tags = [TAG_ALWAYS, TAG_EMAIL_ME];
  if (STAGE_TAGS[stage]) tags.push(STAGE_TAGS[stage]);
  const bt = BLOCKER_TAGS.find(([needle]) => blocker.includes(needle));
  if (bt) tags.push(bt[1]);

  // Kartra text area custom fields hold max 365 characters, so everything is clipped to 360.
  const custom = [
    [FIELDS.stage, STAGE_LABELS[stage] || ''],
    [FIELDS.blocker, clip(blocker, 360)],
    [FIELDS.goal, clip(b.goal, 360)],
    [FIELDS.hours, clip(clip(b.hours, 40) + (Array.isArray(b.pockets) && b.pockets.length ? ', ' + b.pockets.join(', ') : ''), 360)],
    [FIELDS.business, clip(b.raw, 360)],
    [FIELDS.report, clip(b.report, 360)]   // her starting point on the route (not the whole Map)
  ];

  const build = (primaryCmd) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(auth)) p.append(k, v);
    p.append('lead[email]', email);
    if (b.name) p.append('lead[first_name]', clip(b.name, 40));
    custom.forEach(([id, val], i) => {
      p.append(`lead[custom_fields][${i}][field_identifier]`, id);
      p.append(`lead[custom_fields][${i}][field_value]`, val);
    });
    p.append('actions[0][cmd]', primaryCmd);
    // Remove the email tag first, so re-adding it re-triggers the "here's your Map"
    // email even if she has done the Map before. (Harmless if she doesn't have it.)
    p.append('actions[1][cmd]', 'unassign_tag');
    p.append('actions[1][tag_name]', TAG_EMAIL_ME);
    tags.forEach((t, i) => {
      p.append(`actions[${i + 2}][cmd]`, 'assign_tag');
      p.append(`actions[${i + 2}][tag_name]`, t);
    });
    return p;
  };

  const callKartra = async (params) => {
    const res = await fetch('https://app.kartra.com/api', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        // Kartra's firewall blocks some default script user agents
        'User-Agent': 'Mozilla/5.0 (compatible; FamilyFirstMap/1.0; +https://toolkit.haveitallacademy.com)'
      },
      body: params.toString()
    });
    return res.json();
  };

  // ---- Save the full Map as a private page ----
  let mapLink = '';
  if (SAVE_FULL_MAP && b.view && typeof b.view === 'object') {
    try {
      const v = b.view;
      const str = (x, n) => clip(typeof x === 'string' ? x : '', n);
      let ctaUrl = '';
      try { const u = new URL(String(v.cta && v.cta.url)); if (u.protocol === 'https:' && SAFE_LINK_HOSTS.includes(u.hostname)) ctaUrl = u.href; } catch (e) {}
      const clean = {
        name: str(v.name, 40),
        week: str(v.week, 1500), income: str(v.income, 800), sittingOn: str(v.sittingOn, 1200), gap: str(v.gap, 1000),
        incomeGoal: str(v.incomeGoal, 120),
        incomeRows: (Array.isArray(v.incomeRows) ? v.incomeRows : []).slice(0, 5).map(r => str(r, 120)),
        route: (Array.isArray(v.route) ? v.route : []).slice(0, 4).map(r => ({
          leg: str(r && r.leg, 60), phases: str(r && r.phases, 30), plan: str(r && r.plan, 600),
          state: ['done', 'here', 'ahead'].includes(r && r.state) ? r.state : 'ahead'
        })),
        testimonial: v.testimonial ? { head: str(v.testimonial.head, 120), quote: str(v.testimonial.quote, 600), who: str(v.testimonial.who, 80) } : null,
        cta: ctaUrl ? { headline: str(v.cta.headline, 120), body: str(v.cta.body, 600), button: str(v.cta.button, 60), url: ctaUrl } : null,
        savedAt: new Date().toISOString()
      };
      const id = crypto.randomUUID();
      await getStore('maps').setJSON(id, clean);
      mapLink = new URL('/m/' + id, request.url).href;
    } catch (e) { mapLink = ''; }
  }
  if (mapLink) custom.push([FIELDS.link, mapLink]);

  try {
    // Existing lead (most women opted in before taking the Map) → edit. New → create.
    let out = await callKartra(build('edit_lead'));
    const first = out && out.actions && out.actions[0] && Object.values(out.actions[0])[0];
    const notFound = (out && String(out.type) === '243') || (first && String(first.type) === '243');
    if (notFound) out = await callKartra(build('create_lead'));

    const primary = out && out.actions && out.actions[0] && Object.values(out.actions[0])[0];
    if (!primary || primary.status !== 'Success') {
      return reply(502, { ok: false, error: (primary && primary.message) || (out && out.message) || 'Kartra error' });
    }
    const skippedTags = (out.actions || []).slice(2)
      .map((a, i) => ({ tag: tags[i], r: Object.values(a)[0] }))
      .filter(x => x.r && x.r.status !== 'Success')
      .map(x => x.tag);
    return reply(200, { ok: true, skippedTags });
  } catch (e) {
    return reply(500, { ok: false, error: 'Could not reach Kartra' });
  }
};

export const config = { path: '/api/lead' };
