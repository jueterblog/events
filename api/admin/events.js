// api/admin/events.js
//
// A plain Vercel Serverless Function (Node.js runtime) — works for ANY project
// type (static HTML, Vite, Next.js, etc.), as long as this file lives at
// /api/admin/events.js relative to your project root.
//
// Uses the Supabase SERVICE ROLE key server-side (bypasses RLS) and checks a
// shared admin password on every request.
//
// Env vars (these were auto-created by the Vercel <-> Supabase Marketplace integration):
//   NEXT_PUBLIC_SUPABASE_URL    (your project URL — public, safe to reuse server-side)
//   SUPABASE_SERVICE_ROLE_KEY   (privileged key — keep secret, never sent to the browser)
//   ADMIN_PASSWORD              (add this one manually — pick any password)

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Only these columns can be written from the admin page — protects id/created_at etc.
const EDITABLE_FIELDS = [
  'event_name',
  'categories',
  'event_date',
  'start_time',
  'event_end_date',
  'end_time',
  'description',
  'link',
  'is_free',
  'submitter_name',
  'submitter_email',
  'status',
  'location',
  'address',
  'is_barrierfrei',
  'barrierfrei_info',
];

function checkPassword(req) {
  const provided = req.headers['x-admin-password'];
  return provided && provided === process.env.ADMIN_PASSWORD;
}

function pickEditableFields(body) {
  const out = {};
  for (const key of EDITABLE_FIELDS) {
    if (key in body) out[key] = body[key];
  }
  return out;
}

export default async function handler(req, res) {
  if (!checkPassword(req)) {
    return res.status(401).json({ error: 'Invalid or missing admin password' });
  }

  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('events')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ events: data });
  }

  if (req.method === 'PATCH') {
    const { id, ...body } = req.body;
    if (!id) return res.status(400).json({ error: 'Missing event id' });

    const fields = pickEditableFields(body);
    fields.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('events')
      .update(fields)
      .eq('id', id)
      .select();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ event: data[0] });
  }

  if (req.method === 'DELETE') {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'Missing event id' });

    const { error } = await supabaseAdmin.from('events').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  res.setHeader('Allow', ['GET', 'PATCH', 'DELETE']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
