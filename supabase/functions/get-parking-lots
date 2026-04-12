import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? ''
        )

        const { site_id, user_id, lat, lng } = await req.json()

        // ==========================================
        // 🌟 จุดที่ 1: ค้นหา Role ของผู้ใช้งานจาก Database
        // ==========================================
        let userRole = 'Visitor'; // กำหนดค่าเริ่มต้น

        if (user_id) {
            const { data: profile, error: profileError } = await supabaseClient
                .from('profiles')
                .select('role')
                .eq('id', user_id)
                .single();

            if (!profileError && profile?.role) {
                userRole = profile.role;
            }
        }

        // 1. Fetch Buildings
        const { data: buildings, error: buildingsError } = await supabaseClient
            .from('buildings')
            .select('*')
            .eq('parking_site_id', site_id)

        if (buildingsError) throw buildingsError;

        // 2. Fetch ALL Slots for this Site
        const { data: slots, error: slotsError } = await supabaseClient
            .from('slots')
            .select('id, status, vehicle_type, floor_id, floors!inner(building_id)')
            .eq('parking_site_id', site_id)

        if (slotsError) throw slotsError;

        // 3. Aggregate Data
        const formattedData = (buildings || []).map((item: any) => {
            const buildingSlots = (slots || []).filter((s: any) => s.floors?.building_id === item.id);

            const capacity = { normal: 0, ev: 0, motorcycle: 0 };
            const available = { normal: 0, ev: 0, motorcycle: 0 };

            buildingSlots.forEach((s: any) => {
                const type = s.vehicle_type || 'car';
                let key: 'normal' | 'ev' | 'motorcycle' = 'normal';
                if (type === 'car') key = 'normal';
                else if (type === 'ev') key = 'ev';
                else if (type === 'motorcycle') key = 'motorcycle';

                capacity[key]++;
                if (s.status === 'available') {
                    available[key]++;
                }
            });

            const totalCap = capacity.normal + capacity.ev + capacity.motorcycle;
            const totalAvail = available.normal + available.ev + available.motorcycle;
            let status = 'available';
            if (totalAvail === 0 && totalCap > 0) status = 'full';
            else if (totalAvail < (totalCap * 0.1)) status = 'low';

            let schedule = item.schedule_config || [];
            if (schedule.length === 0 && item.open_time && item.close_time) {
                const openParts = item.open_time.split(':');
                const closeParts = item.close_time.split(':');
                schedule = [{
                    days: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
                    open_time: `${openParts[0]}:${openParts[1]}`,
                    close_time: `${closeParts[0]}:${closeParts[1]}`,
                    cron: {
                        open: `${parseInt(openParts[1])} ${parseInt(openParts[0])} * * *`,
                        close: `${parseInt(closeParts[1])} ${parseInt(closeParts[0])} * * *`
                    }
                }];
            }

            // ==========================================
            // 🌟 จุดที่ 2: ดึงราคาให้ตรงกับ Role (แก้ใหม่)
            // ==========================================
            let displayPrice = 0; // ตั้งค่าเริ่มต้นเป็น 0 บาทไว้ก่อน

            // บังคับเช็คเฉพาะจากคอลัมน์ role_prices (JSONB) เท่านั้น
            if (item.role_prices && item.role_prices[userRole] !== undefined) {
                displayPrice = item.role_prices[userRole];
            }

            // ข้อความคำว่า "ฟรี" ถ้าราคาเป็น 0
            let priceUnitDisplay = item.price_info || 'บาท/ชม.';
            if (displayPrice === 0) {
                priceUnitDisplay = 'จอดฟรี';
            }

            return {
                id: item.id,
                name: item.name,
                category: item.category || 'parking',
                zone: item.zone,
                capacity: capacity,
                available: available,
                floors: item.floors || [],
                mapX: item.map_x || 0,
                mapY: item.map_y || 0,
                lat: item.lat || 0,
                lng: item.lng || 0,
                status: status,
                isBookmarked: false,
                distance: 0,
                hours: item.open_time && item.close_time ? `${item.open_time.slice(0, 5)} - ${item.close_time.slice(0, 5)}` : (item.hours || ''),
                hasEVCharger: item.has_ev_charger || (capacity.ev > 0),
                userTypes: Array.isArray(item.allowed_user_types) ? item.allowed_user_types.join(', ') : (item.user_types || ''),

                // ส่งราคาที่ดึงจาก role_prices ล้วนๆ กลับไปให้แอป
                price: displayPrice,
                priceUnit: priceUnitDisplay,

                supportedTypes: item.supportedTypes || ['normal'],
                schedule: schedule,
                images: item.images || ['assets/images/parking/default.png']
            };
        });

        return new Response(JSON.stringify(formattedData), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error) {
        return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown Error' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})