import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
    // จัดการ CORS
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

    try {
        const authHeader = req.headers.get("Authorization")
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_ANON_KEY")!,
            { global: { headers: { Authorization: authHeader! } } }
        )

        // ดึงข้อมูล profiles ทั้งหมด
        // สามารถเพิ่ม .order() เพื่อเรียงลำดับได้ เช่น เรียงตามชื่อ หรือวันที่สมัคร
        const { data: profiles, error } = await supabase
            .from("profiles")
            .select("id, name, email, phone, avatar, role, created_at")
            .order("name", { ascending: true })

        if (error) throw error

        // คำนวณ Metrics พื้นฐาน (ตัวอย่าง: แยกตาม Role หรือจำนวนทั้งหมด)
        const totalUsers = profiles?.length || 0
        const adminCount = profiles?.filter(p => p.role === 'Admin').length || 0
        const visitorCount = profiles?.filter(p => p.role === 'Visitor' || p.role === null).length || 0

        const metrics = [
            { title: "ผู้ใช้งานทั้งหมด", value: String(totalUsers), subtext: "บัญชี" },
            { title: "ผู้ดูแลระบบ", value: String(adminCount), subtext: "คน" },
            { title: "ผู้ใช้งานทั่วไป", value: String(visitorCount), subtext: "คน" },
        ]

        // ส่งข้อมูลกลับในรูปแบบ GET response
        return new Response(
            JSON.stringify({
                success: true,
                metrics,
                profiles: profiles.map(p => ({
                    ...p,
                    // format วันที่สมัครให้เป็นภาษาไทย
                    joined_date: new Date(p.created_at).toLocaleDateString("th-TH"),
                }))
            }),
            {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            }
        )
    }
})