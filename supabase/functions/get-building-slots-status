import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {

    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {

        const { searchParams } = new URL(req.url);
        const buildingId = searchParams.get("building_id");

        if (!buildingId) {
            return new Response(
                JSON.stringify({ error: "building_id is required" }),
                { status: 400, headers: corsHeaders }
            );
        }

        const authHeader = req.headers.get("Authorization") ?? "";

        const supabase = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_ANON_KEY")!,
            {
                global: {
                    headers: { Authorization: authHeader },
                },
            }
        );

        const { data, error } = await supabase.rpc(
            "get_building_slots_status",
            { p_building_id: buildingId }
        );

        if (error) throw error;

        // convert flat rows → nested structure
        const floorsMap = new Map();

        for (const row of data) {

            if (!floorsMap.has(row.floor_id)) {
                floorsMap.set(row.floor_id, {
                    id: row.floor_id,
                    name: row.floor_name,
                    level_order: row.level_order,
                    zones: new Map()
                });
            }

            const floor = floorsMap.get(row.floor_id);

            if (!floor.zones.has(row.zone_id)) {
                floor.zones.set(row.zone_id, {
                    id: row.zone_id,
                    name: row.zone_name,
                    slots: []
                });
            }

            const zone = floor.zones.get(row.zone_id);

            zone.slots.push({
                id: row.slot_id,
                name: row.slot_name,
                slot_number: row.slot_number,
                status: row.main_status,
                current_status: row.current_status
            });
        }

        // convert Map → Array
        const result = Array.from(floorsMap.values()).map((floor) => ({
            id: floor.id,
            name: floor.name,
            level_order: floor.level_order,
            zones: Array.from(floor.zones.values())
        }));

        return new Response(
            JSON.stringify({
                success: true,
                data: result
            }),
            {
                headers: {
                    ...corsHeaders,
                    "Content-Type": "application/json"
                }
            }
        );

    } catch (err) {

        return new Response(
            JSON.stringify({
                success: false,
                error: err.message
            }),
            {
                status: 500,
                headers: corsHeaders
            }
        );

    }

});