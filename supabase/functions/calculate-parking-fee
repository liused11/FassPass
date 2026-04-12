import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const body = await req.json().catch(() => ({}));
        const { reservationId } = body;

        if (!reservationId) throw new Error('Missing reservationId');

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // ── Step 1: ดึง reservation + profile role ──
        const { data: res, error: resError } = await supabase
            .from('reservations')
            .select('id, start_time, floor_id, profiles ( role )')
            .eq('id', reservationId)
            .single();

        if (resError || !res) throw new Error('Reservation not found: ' + resError?.message);
        if (!res.start_time) throw new Error('Start_time is missing');

        // ── Step 2: แปลง Role ──
        let rawRole = (res.profiles as any)?.role || 'Visitor';
        if (rawRole.toLowerCase() === 'authenticated') rawRole = 'User';
        const roleKey = rawRole.charAt(0).toUpperCase() + rawRole.slice(1).toLowerCase();

        // ── Step 3: ดึง floor → หา building_id ──
        let hourlyRate: number | null = null;
        let debugBuildingId = null;
        let debugRolePrices = null;

        if (res.floor_id) {
            // ดึง floors เพื่อหา foreign key ไปยัง buildings
            const { data: floorRow, error: floorErr } = await supabase
                .from('floors')
                .select('*')          // ดึงทุก column เพื่อดูว่า column ไหนคือ building_id
                .eq('id', res.floor_id)
                .single();

            // ดึง building_id จาก floor row
            // ลอง key ที่เป็นไปได้: building_id, buildingId, buildings_id
            const buildingId = floorRow?.building_id
                ?? floorRow?.buildingId
                ?? floorRow?.buildings_id
                ?? null;

            debugBuildingId = buildingId;

            if (buildingId) {
                // ── Step 4: ดึง buildings เพื่อเอา role_prices ──
                // ── Step 4: ดึง buildings ด้วย select('*') เพื่อดูโครงสร้างจริง ──
                const { data: buildingRow, error: buildingErr } = await supabase
                    .from('buildings')
                    .select('*')          // ← เปลี่ยนเป็น * ชั่วคราว
                    .eq('id', buildingId)
                    .single();

                // log ทุก key ของ buildingRow เพื่อดูว่า column ชื่ออะไร
                debugRolePrices = buildingRow;   // ← เปลี่ยนให้ดู object ทั้งหมด

                const rolePrices = buildingRow?.role_prices         // ลอง key ที่อาจเป็น
                    ?? buildingRow?.rolePrices
                    ?? buildingRow?.role_price
                    ?? buildingRow?.pricing
                    ?? buildingRow?.prices
                    ?? {};

                if (rolePrices[roleKey] !== undefined && rolePrices[roleKey] !== null) {
                    hourlyRate = Number(rolePrices[roleKey]);
                } else if (buildingRow?.price_per_hour !== undefined) {
                    hourlyRate = Number(buildingRow.price_per_hour);
                }

            }
        }

        // ❌ ห้าม hardcode — ถ้าดึงราคาไม่ได้ให้ throw error แทน
        if (hourlyRate === null) {
            throw new Error(`Cannot determine hourly rate for role "${roleKey}" with floor_id "${res.floor_id}". Debug: buildingId=${debugBuildingId}, rolePrices=${JSON.stringify(debugRolePrices)}`);
        }

        // ── Step 5: คำนวณเวลาจอด ──
        const startTime = new Date(res.start_time);
        const now = new Date();
        const diffMs = now.getTime() - startTime.getTime();
        const parkedHours = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60)));

        // ── Step 6: ดึงส่วนลด e_stamps ──
        const { data: stamp } = await supabase
            .from('e_stamps')
            .select('discount_amount')
            .eq('reservation_id', reservationId)
            .maybeSingle();

        const discountAmount = stamp?.discount_amount || 0;

        // ── Step 7: คำนวณราคาสุทธิ ──
        const grossPrice = parkedHours * hourlyRate;
        const netPrice = Math.max(0, grossPrice - discountAmount);

        return new Response(JSON.stringify({
            final_net_price: netPrice,
            debug: {
                startTime: res.start_time,
                currentTime: now.toISOString(),
                parkedHours,
                floorId: res.floor_id,
                buildingId: debugBuildingId,
                roleKey,
                rolePricesFromDB: debugRolePrices,
                hourlyRateUsed: hourlyRate,
                grossPrice,
                discountApplied: discountAmount,
            }
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200
        });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message, final_net_price: 0 }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400
        });
    }
})
