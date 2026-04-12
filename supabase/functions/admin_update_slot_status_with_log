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

        //--------------------------------------------------------
        // Validate payload
        //--------------------------------------------------------

        if (!Array.isArray(body.slot_ids) || !body.status) {
            return new Response("Invalid payload", { status: 400 })
        }

        //--------------------------------------------------------
        // Auth
        //--------------------------------------------------------

        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return new Response("Unauthorized", { status: 401 })
        }

        if (user.app_metadata?.role !== "admin") {
            return new Response("Forbidden", { status: 403 })
        }

        //--------------------------------------------------------
        // Call RPC
        //--------------------------------------------------------

        const { error } = await supabase.rpc(
            "admin_update_slot_status_with_log",
            {
                p_slot_ids: body.slot_ids,
                p_status: body.status,
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