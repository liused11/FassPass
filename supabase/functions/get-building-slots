import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders })
    }
    try {
        const { searchParams } = new URL(req.url);
        const buildingId = searchParams.get("building_id");

        if (!buildingId) {
            return new Response(
                JSON.stringify({ error: "building_id is required" }),
                { status: 400 }
            );
        }

        const authHeader = req.headers.get("Authorization") ?? "";
        if (!authHeader) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
                headers: corsHeaders,
            })
        }

        const supabase = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_ANON_KEY")!,
            {
                global: {
                    headers: {
                        Authorization: authHeader
                    },
                },
            }
        );

        const { data, error } = await supabase
            .from("floors")
            .select(`
        id,
        name,
        level_order,
        zones (
        id,
        name,
        slots (
            id,
            name,
            status,
            slot_number
        )
        )
    `)
            .eq("building_id", buildingId)
            .order("level_order", { ascending: true })
            .order("slot_number", {
                foreignTable: "zones.slots",
                ascending: true
            });

        if (error) throw error;

        return new Response(
            JSON.stringify({
                success: true,
                data
            }),
            {
                headers: {
                    ...corsHeaders,
                    "Content-Type": "application/json",
                },
                status: 200,
            });

    } catch (err) {
        return new Response(
            JSON.stringify({
                success: false,
                error: err.message
            }),
            {
                status: 500,
                headers: corsHeaders,
            }
        );
    }
});