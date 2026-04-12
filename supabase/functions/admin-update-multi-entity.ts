// supabase/functions/admin-update-multi-entity/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
}
serve(async (req) => {
    // 🔹 รองรับ preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders })
    }
    try {
        if (req.method !== "POST") {
            return new Response("Method Not Allowed", {
                status: 405,
                headers: corsHeaders
            })
        }

        const body = await req.json()

        // 🔹 รองรับ payload แบบใหม่
        // {
        //   entities: [
        //     {
        //       entity_type: "buildings",
        //       entity_id: "1-1",
        //       updates: { name: "ใหม่" }
        //     }
        //   ]
        // }

        if (!body?.entities || !Array.isArray(body.entities)) {
            return new Response("Invalid payload structure", { status: 400 })
        }

        if (body.entities.length === 0) {
            return new Response("Entities array is empty", { status: 400 })
        }

        // 🔐 ใช้ anon key + pass Authorization header
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

        // 🔹 1️⃣ ตรวจ user
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser()

        if (authError || !user) {
            return new Response("Unauthorized", { status: 401 })
        }

        // 🔹 2️⃣ ตรวจ role
        if (user.app_metadata?.role !== "admin") {
            return new Response("Forbidden", { status: 403 })
        }

        // 🔹 3️⃣ เรียก RPC ใหม่
        const { error: rpcError } = await supabase.rpc(
            "update_multiple_entities_with_log",
            {
                p_payload: body,
                p_user_id: user.id,
                p_user_name: user.email,
            }
        )

        if (rpcError) {
            console.error("RPC Error:", rpcError)
            return new Response(
                JSON.stringify({
                    success: false,
                    error: rpcError.message,
                }),
                {
                    status: 400, headers: {
                        ...corsHeaders,
                        "Content-Type": "application/json"
                    }
                }
            )
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: "Configuration updated successfully",
            }),
            {
                headers: {
                    ...corsHeaders,
                    "Content-Type": "application/json"
                }
            }
        )
    } catch (err: any) {
        console.error("Unexpected Error:", err)
        console.log('Status:', err.status);
        console.log('Body:', err.error);

        return new Response(
            JSON.stringify({
                success: false,
                error: "Internal Server Error",
            }),
            {
                status: 500, headers: {
                    ...corsHeaders,
                    "Content-Type": "application/json"
                }
            }
        )
    }
})
