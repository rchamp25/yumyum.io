// Vercel cron job (scheduled in vercel.json): makes one small Supabase request a day so the
// free-tier project never goes a week without activity, which would get it paused.
export default async function handler(_req, res) {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    res.status(500).json({ ok: false, error: 'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set' });
    return;
  }

  try {
    const response = await fetch(`${url}/rest/v1/characters?select=id&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    res.status(response.ok ? 200 : 502).json({ ok: response.ok, supabaseStatus: response.status });
  } catch (error) {
    res.status(502).json({ ok: false, error: String(error) });
  }
}
