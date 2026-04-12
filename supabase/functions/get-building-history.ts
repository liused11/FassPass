import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

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
        const authHeader = req.headers.get("Authorization")
        if (!authHeader) {
            return new Response(
                JSON.stringify({ success: false, error: "Missing Authorization header" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            )
        }

        let building_id: string | null = null
        let limit = 5
        let offset = 0

        if (req.method === "GET") {
            const { searchParams } = new URL(req.url)

            building_id = searchParams.get("building_id")
            limit = Number(searchParams.get("limit") ?? 5)
            offset = Number(searchParams.get("offset") ?? 0)

        } else {
            const body = await req.json()
            building_id = body.building_id
            limit = body.limit ?? 5
            offset = body.offset ?? 0
        }

        if (!building_id) {
            return new Response(
                JSON.stringify({ success: false, error: "building_id is required" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            )
        }

        const supabase = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_ANON_KEY")!,
            { global: { headers: { Authorization: authHeader } } }
        )

        const { data, error } = await supabase
            .from("activity_logs")
            .select("*")
            .or(`entity_id.eq.${building_id},entity_id.like.${building_id}-%`)
            .order("time", { ascending: false })
            .range(offset, offset + limit - 1)

        if (error) throw error

        const formatted = (data ?? []).map((item) => {

            let parsedChanges: any = null

            if (item.changes) {
                try {
                    parsedChanges =
                        typeof item.changes === "string"
                            ? JSON.parse(item.changes)
                            : item.changes
                } catch (err) {
                    console.error("parse error:", err)
                }
            }

            let field = null
            let oldValue = null
            let newValue = null

            if (parsedChanges && typeof parsedChanges === "object") {
                const keys = Object.keys(parsedChanges)
                if (keys.length > 0) {
                    const key = keys[0]
                    field = key
                    oldValue = parsedChanges[key]?.old ?? null
                    newValue = parsedChanges[key]?.new ?? null
                }
            }

            return {
                id: item.id,
                log_type: item.log_type,
                entity_type: item.entity_type,
                entity_id: item.entity_id,
                action: item.action,
                field,
                old_value: oldValue,
                new_value: newValue,
                user_name: item.user_name,
                created_at: item.time ?? null,
            }
        })

        return new Response(
            JSON.stringify({ success: true, data: formatted ?? [] }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )

    } catch (error: any) {
        console.error(error)
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
    }
})