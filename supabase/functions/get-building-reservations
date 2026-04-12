import { serve } from 'https://deno.land/std@0.205.0/http/server.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// ✅ 1. เพิ่ม CORS Headers
const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, prefer",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
};

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

serve(async (req: Request) => {
    // ✅ 2. ดัก OPTIONS สำหรับ CORS Preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const url = new URL(req.url);
        const buildingId = url.searchParams.get('building_id');
        const fromDate = url.searchParams.get('from_date');
        const toDate = url.searchParams.get('to_date');

        // 💡 ปรับให้ building_id ไม่บังคับใส่ เพื่อให้ Admin ดูได้ทุกตึก
        const filters = [];
        if (buildingId) filters.push(`building_name=eq.${encodeURIComponent(buildingId)}`);
        if (fromDate) filters.push(`reserved_date=gte.${encodeURIComponent(fromDate)}`);
        if (toDate) filters.push(`reserved_date=lte.${encodeURIComponent(toDate)}`);

        const query = filters.length > 0 ? `?${filters.join('&')}&order=reserved_date.desc` : `?order=reserved_date.desc`;
        const endpoint = `${SUPABASE_URL}/rest/v1/building_reservations${query}`;

        const res = await fetch(endpoint, {
            headers: {
                apikey: SUPABASE_SERVICE_ROLE_KEY!,
                Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json',
                Prefer: 'return=representation'
            }
        });

        const data = await res.json();
        const status = res.ok ? 200 : res.status;

        // ✅ 3. แนบ CORS กลับไป
        return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
});