import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders })
    }

    try {
        const body = await req.json()

        const supabase = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_ANON_KEY")!,
            {
                global: {
                    headers: {
                        Authorization: req.headers.get("Authorization") ?? "",
                    },
                },
            }
        )

        if (!body.slot_id || !body.date || !Array.isArray(body.time_ranges)) {
            return new Response("Invalid payload", { status: 400 })
        }

        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return new Response("Unauthorized", { status: 401 })
        }

        if (user.app_metadata?.role !== "admin") {
            return new Response("Forbidden", { status: 403 })
        }

        const { error } = await supabase.rpc(
            "admin_upsert_slot_overrides_with_log",
            {
                p_slot_id: body.slot_id,
                p_override_date: body.date,
                p_ranges: body.time_ranges,
                p_user_id: user.id,
                p_user_name: user.email
            }
        )

        if (error) {
            return new Response(JSON.stringify(error), {
                status: 400,
                headers: corsHeaders
            })
        }

        return new Response(
            JSON.stringify({ success: true }),
            { headers: corsHeaders }
        )

    } catch (err) {
        console.error("ERROR:", err)

        return new Response(
            JSON.stringify({
                error: err.message ?? err
            }),
            {
                status: 500,
                headers: corsHeaders
            }
        )
    }
})