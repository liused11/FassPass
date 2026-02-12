import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const { site_id, user_id, lat, lng } = await req.json()

    // 1. Fetch Buildings
    const { data: buildings, error: buildingsError } = await supabaseClient
      .from('buildings')
      .select('*')
      .eq('parking_site_id', site_id)

    if (buildingsError) throw buildingsError;

    // 2. Fetch ALL Slots for this Site (to aggregate capacity/available)
    // We need to join with floors to filter by site_id, or just use site_id if slots have it
    // The slots table has parking_site_id according to schema
    const { data: slots, error: slotsError } = await supabaseClient
      .from('slots')
      .select('id, status, vehicle_type, floor_id, floors!inner(building_id)')
      .eq('parking_site_id', site_id)

    if (slotsError) throw slotsError;

    // 3. Aggregate Data
    const formattedData = (buildings || []).map((item: any) => {
        // Filter slots for this building
        const buildingSlots = (slots || []).filter((s: any) => s.floors?.building_id === item.id);

        const capacity = { normal: 0, ev: 0, motorcycle: 0 };
        const available = { normal: 0, ev: 0, motorcycle: 0 };

        buildingSlots.forEach((s: any) => {
            const type = s.vehicle_type || 'car'; // 'car', 'ev', 'motorcycle'
            // Map DB type to Frontend type key
            let key: 'normal' | 'ev' | 'motorcycle' = 'normal';
            if (type === 'car') key = 'normal';
            else if (type === 'ev') key = 'ev';
            else if (type === 'motorcycle') key = 'motorcycle';

            capacity[key]++;
            // Condition: Count as available ONLY if status is 'available'
            if (s.status === 'available') {
                available[key]++;
            }
        });

        // Calculate Status
        const totalCap = capacity.normal + capacity.ev + capacity.motorcycle;
        const totalAvail = available.normal + available.ev + available.motorcycle;
        let status = 'available';
        if (totalAvail === 0 && totalCap > 0) status = 'full';
        else if (totalAvail < (totalCap * 0.1)) status = 'low';

        // Logic to generate schedule if missing from config but present in columns
        let schedule = item.schedule_config || [];
        if (schedule.length === 0 && item.open_time && item.close_time) {
           const openParts = item.open_time.split(':');
           const closeParts = item.close_time.split(':');
           const openH = parseInt(openParts[0]);
           const openM = parseInt(openParts[1]);
           const closeH = parseInt(closeParts[0]);
           const closeM = parseInt(closeParts[1]);

           schedule = [{
              days: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
              open_time: `${openParts[0]}:${openParts[1]}`,
              close_time: `${closeParts[0]}:${closeParts[1]}`,
              cron: {
                  open: `${openM} ${openH} * * *`,
                  close: `${closeM} ${closeH} * * *`
              }
           }];
        }

        return {
          id: item.id,
          name: item.name,
          category: item.category || 'parking',
          zone: item.zone,
          capacity: capacity,
          available: available,
          floors: item.floors || [], // This might be null if not joined, but UI fetches floors separately usually? Or we need to fetch floors? 
          // UI uses getSiteBuildings for initial list, floors derived or fetched later?
          // The previous RPC returned floors joined. We might need to fetch floors too if used.
          // Checking UI: Tab1 doesn't seem to iterate floors in list, just counts.
          // Parking Detail fetches floors via getAvailability.
          mapX: item.map_x || 0,
          mapY: item.map_y || 0,
          lat: item.lat || 0,
          lng: item.lng || 0,
          status: status,
          isBookmarked: false, // Need user_id query for this, skip for now or separate query
          distance: 0, 
          hours: item.open_time && item.close_time ? `${item.open_time.slice(0, 5)} - ${item.close_time.slice(0, 5)}` : (item.hours || ''),
          hasEVCharger: item.has_ev_charger || (capacity.ev > 0),
          userTypes: Array.isArray(item.allowed_user_types) ? item.allowed_user_types.join(', ') : (item.user_types || ''),
          price: item.price_value || 0,
          priceUnit: item.price_info || 'บาท/ชม.',
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
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
