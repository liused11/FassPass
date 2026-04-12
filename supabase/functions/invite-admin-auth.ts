import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
}

serve(async (req) => {
    // ดัก CORS Preflight
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

    try {
        const { email } = await req.json()

        // 💡 ต้องใช้ SERVICE_ROLE_KEY ถึงจะมีสิทธิ์ส่ง Email เชิญได้
        const supabaseAdmin = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        )

        // สั่ง Supabase ส่งอีเมลคำเชิญ (Magic Link) ไปยังผู้ใช้
        const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
            email,
            {
                data: { role: 'Admin' } // 👈 จุดสำคัญ: แนบยศไปตรงนี้
            }
        )

        if (error) throw error

        return new Response(JSON.stringify({ success: true, data }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        })
    } catch (error: any) {
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
        })
    }
})