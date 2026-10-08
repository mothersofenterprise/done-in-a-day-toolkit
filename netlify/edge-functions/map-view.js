// ================================================================
// SAVED MAP PAGE: /m/<id>
// Shows a woman's full Family-First Map, saved when she clicked
// "Email me my Map". The link is private (an unguessable id) and
// emailed to her through Kartra. She can print or save it as a PDF.
// ================================================================
import { getStore } from 'https://esm.sh/@netlify/blobs@8';

const esc = (t) => String(t ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const paras = (t) => String(t ?? '').split(/\n+/).filter(Boolean).map(p => `<p>${esc(p)}</p>`).join('');

const page = (title, body) => `<!DOCTYPE html>
<html lang="en-GB"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title><meta name="robots" content="noindex, nofollow">
<link href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&family=Raleway:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
:root{--teal:#225151;--pink:#ef1970;--cream:#fbf8f2;--blush:#f1d2cb;--coral:#ff8882;--white:#fff}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--cream);color:var(--teal);font-family:'Raleway',sans-serif;font-size:17px;line-height:1.6;-webkit-font-smoothing:antialiased}
.wrap{max-width:660px;margin:0 auto;padding:32px 20px 64px}
.eyebrow{font-size:12px;letter-spacing:3px;text-transform:uppercase;font-weight:600;color:var(--pink);text-align:center;margin-bottom:14px}
h1{font-family:'Libre Baskerville',serif;font-size:30px;line-height:1.25;text-align:center;margin-bottom:14px}
.sub{text-align:center;max-width:520px;margin:0 auto 26px}
.sec{background:var(--white);border:2px solid var(--blush);border-radius:18px;padding:26px 24px;margin-bottom:18px}
.sec h3{font-family:'Libre Baskerville',serif;font-size:19px;color:var(--pink);margin-bottom:12px}
.sec p{margin-bottom:12px}.sec p:last-child{margin-bottom:0}
.goal{font-family:'Libre Baskerville',serif;font-size:20px;margin-bottom:12px}
.rows{list-style:none;margin:0 0 14px}.rows li{padding:9px 0;border-bottom:1px solid var(--cream);font-size:16px}
.small{font-size:13.5px;font-style:italic;color:#4d6f6f;margin-top:12px}
.route{list-style:none;position:relative}
.route li{position:relative;padding:4px 0 18px 34px}.route li:last-child{padding-bottom:0}
.route li:before{content:'';position:absolute;left:9px;top:22px;bottom:-4px;width:2px;background:var(--blush)}
.route li:last-child:before{display:none}
.dot{position:absolute;left:0;top:4px;width:20px;height:20px;border-radius:50%;background:var(--white);border:3px solid var(--blush)}
.done .dot{background:var(--teal);border-color:var(--teal)}
.here .dot{background:var(--pink);border-color:var(--pink);box-shadow:0 0 0 5px rgba(239,25,112,.15)}
.leg{font-weight:700}.ph{font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:#4d6f6f;font-weight:600;margin-left:6px}
.badge{display:inline-block;background:var(--pink);color:#fff;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;border-radius:99px;padding:3px 10px;margin-left:8px;vertical-align:middle}
.route p{margin:4px 0 0;font-size:16px}
.tst{background:var(--blush);border-radius:18px;padding:24px;margin-bottom:18px}
.tst .h{font-family:'Libre Baskerville',serif;font-size:19px;font-weight:700;margin-bottom:8px}
.tst p{font-size:16px;font-style:italic;margin-bottom:10px}
.tst .w{font-size:13px;letter-spacing:1.5px;text-transform:uppercase;font-weight:700}
.cta{background:var(--teal);border-radius:18px;padding:32px 26px;text-align:center;color:var(--cream)}
.cta h3{font-family:'Libre Baskerville',serif;font-size:24px;color:#fff;margin-bottom:12px;line-height:1.3}
.cta p{color:var(--blush)}
.btn{display:inline-block;margin-top:20px;background:var(--pink);color:#fff;text-decoration:none;border:none;border-radius:99px;padding:16px 38px;font-family:'Raleway',sans-serif;font-weight:700;font-size:17px;cursor:pointer}
.actions{text-align:center;margin-top:26px}.actions .btn{background:var(--teal)}
.foot{text-align:center;margin-top:44px;font-size:13px;color:#4d6f6f;letter-spacing:1px}
@media(max-width:480px){h1{font-size:25px}}
@media print{body{background:#fff}.no-print{display:none!important}.sec{border-color:#ddd;break-inside:avoid}.cta{background:#fff;border:2px solid #ddd}.cta h3,.cta p{color:var(--teal)}}
</style></head><body><div class="wrap">${body}</div></body></html>`;

export default async (request) => {
  const id = new URL(request.url).pathname.split('/').filter(Boolean)[1] || '';
  const notFound = () => new Response(page('Map not found',
    `<h1>We couldn't find that Map.</h1><p class="sub">The link may be incomplete. You can build a fresh one any time.</p>
     <p style="text-align:center"><a class="btn" href="/map.html">Build my Map</a></p>`),
    { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } });

  if (!/^[a-f0-9-]{36}$/.test(id)) return notFound();

  let v;
  try { v = await getStore('maps').get(id, { type: 'json' }); } catch (e) { v = null; }
  if (!v) return notFound();

  const route = (v.route || []).map(r => `<li class="${r.state === 'done' ? 'done' : r.state === 'here' ? 'here' : ''}"><span class="dot"></span><span class="leg">${esc(r.leg)}</span><span class="ph">${esc(r.phases)}</span>${r.state === 'here' ? '<span class="badge">You are here</span>' : ''}<p>${esc(r.plan)}</p></li>`).join('');
  const t = v.testimonial;
  const c = v.cta;

  const body = `
  <div class="eyebrow">The Family-First Business Map</div>
  <h1>${esc(v.name)}’s Family-First Business Map</h1>
  <p class="sub">Built from your answers, your hours, and your numbers. Save it, print it, stick it on the fridge.</p>
  <div class="sec"><h3>Your Week</h3>${paras(v.week)}</div>
  <div class="sec"><h3>Your Income Map</h3><div class="goal">${esc(v.incomeGoal)}</div>
    <ul class="rows">${(v.incomeRows || []).map(r => `<li>${esc(r)}</li>`).join('')}</ul>${paras(v.income)}
    <p class="small">Projections at example prices, not promises. Your real price comes when your product exists.</p></div>
  <div class="sec"><h3>What You're Sitting On</h3>${paras(v.sittingOn)}</div>
  <div class="sec"><h3>Your Route</h3><ul class="route">${route}</ul>
    <p class="small">This is the route every Have It All Academy student walks, in this order. Your dot shows where you'd start.</p></div>
  <div class="sec"><h3>The Gap</h3>${paras(v.gap)}</div>
  ${t ? `<div class="tst"><div class="h">${esc(t.head)}</div><p>${esc(t.quote)}</p><div class="w">${esc(t.who)} · Have It All Academy</div></div>` : ''}
  ${c ? `<div class="cta"><h3>${esc(c.headline)}</h3><p>${esc(c.body)}</p><a class="btn" href="${esc(c.url)}" target="_blank" rel="noopener">${esc(c.button)}</a></div>` : ''}
  <div class="actions no-print"><button class="btn" onclick="window.print()">Print or save as PDF</button></div>
  <div class="foot">With love and belief, <b>Suzy XO</b><br>Mothers of Enterprise&reg;</div>`;

  return new Response(page(`${v.name}’s Family-First Business Map`, body), {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Robots-Tag': 'noindex, nofollow', 'Cache-Control': 'private, no-store' }
  });
};

export const config = { path: '/m/*' };
