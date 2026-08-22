// api/newsletter-feed.js
//
// A public JSON endpoint that Brevo's Data Feed fetches automatically each time
// a campaign is sent. Returns approved events for the upcoming month.
//
// No password needed here — it only exposes events that are already public
// and approved on the live site, same data anyone can already see.
//
// Uses the public/anon key (not the admin secret key) since this only reads
// already-public, approved rows.
//
// Env vars used (already set from earlier steps):
//   NEXT_PUBLIC_SUPABASE_URL
//   NEXT_PUBLIC_SUPABASE_ANON_KEY

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Which calendar month this feed covers. Sends go out on the 25th for the
// FOLLOWING month, so "next month" relative to today is always the right target.
function getTargetMonthRange() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth(); // 0-indexed
  // Next month
  const targetYear = month === 11 ? year + 1 : year;
  const targetMonth = month === 11 ? 0 : month + 1;

  const start = new Date(Date.UTC(targetYear, targetMonth, 1));
  const end = new Date(Date.UTC(targetYear, targetMonth + 1, 0)); // last day of target month

  const toISODate = (d) => d.toISOString().slice(0, 10);
  return { start: toISODate(start), end: toISODate(end) };
}

function fmtDateDE(isoDate) {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-');
  return `${d}.${m}.${y}`;
}

export default async function handler(req, res) {
  const { start, end } = getTargetMonthRange();

  // Events that start within the target month, OR multi-day events that
  // started earlier but end during/after the start of the target month.
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('status', 'approved')
    .lte('event_date', end)
    .or(`event_end_date.gte.${start},event_end_date.is.null`)
    .order('event_date', { ascending: true });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  // Only keep events that actually overlap the target month
  // (covers the edge case a single .or() filter can't express cleanly)
  const filtered = (data || []).filter((ev) => {
    const evStart = ev.event_date;
    const evEnd = ev.event_end_date || ev.event_date;
    return evStart <= end && evEnd >= start;
  });

  const events = filtered.map((ev) => ({
    name: ev.event_name,
    date: fmtDateDE(ev.event_date),
    date_end: ev.event_end_date ? fmtDateDE(ev.event_end_date) : '',
    time: ev.start_time ? ev.start_time.slice(0, 5) : '',
    location: ev.location || '',
    address: ev.address || '',
    description: ev.description || '',
    link: ev.link || '',
    categories: (ev.categories || []).join(', '),
    is_free: !!ev.is_free,
    is_barrierfrei: !!ev.is_barrierfrei,
  }));

  // Cache for an hour at the edge — this only needs to be fresh once a month,
  // but a short cache avoids hammering Supabase if Brevo retries.
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
  return res.status(200).json({ month: start.slice(0, 7), events });
}
