const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

// ✅ 1. เพิ่ม CORS Headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
};

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
}

Deno.serve(async (req) => {
  // ✅ 2. ดัก OPTIONS เพื่อแก้ปัญหา CORS
  if (req.method === 'OPTIONS') {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url)
    if (req.method !== 'GET') return new Response(JSON.stringify({ data: null, error: 'Method not allowed' }), { status: 405, headers: corsHeaders })

    const params = url.searchParams
    const invite_code = params.get('invite_code')
    const host_id = params.get('host_id')

    const filters = []
    if (invite_code) filters.push(`invite_code=eq.${encodeURIComponent(invite_code)}`)
    if (host_id) filters.push(`host_id=eq.${encodeURIComponent(host_id)}`)
    const filterQuery = filters.length ? `?${filters.join('&')}` : ''

    const endpoint = `${SUPABASE_URL}/rest/v1/access_tickets${filterQuery}`

    const res = await fetch(endpoint, {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        Accept: 'application/json'
      }
    })

    const data = await res.json()
    if (!res.ok) {
      return new Response(JSON.stringify({ data: null, error: data }), { status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ✅ 3. แนบ CORS กลับไปกับ Response ด้วย
    return new Response(JSON.stringify({ data, error: null }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ data: null, error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})