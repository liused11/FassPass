// get-user-reservations-v2/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
    // -----------------------------
    // CORS
    // -----------------------------
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders })
    }

    try {
        // -----------------------------
        // Auth
        // -----------------------------
        const authHeader = req.headers.get("Authorization")
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: "Unauthorized" }),
                { status: 401, headers: corsHeaders }
            )
        }

        // -----------------------------
        // Supabase client (RLS)
        // -----------------------------
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_ANON_KEY")!,
            {
                global: {
                    headers: { Authorization: authHeader },
                },
            }
        )

        // -----------------------------
        // Query params
        // -----------------------------
        const url = new URL(req.url)
        const sort = url.searchParams.get("sort") ?? "desc"

        // ⭐ date filter (same pattern as get-activities)
        const date = url.searchParams.get("date")
        let start: string | null = null
        let end: string | null = null

        if (date) {
            start = `${date}T00:00:00Z`
            end = `${date}T23:59:59Z`
        }

        const now = new Date()

        // -----------------------------
        // Base query
        // -----------------------------
        let reservationQuery = supabase
            .from("reservations")
            .select(`
        id,
        start_time,
        end_time,
        status,
        vehicle_type,
        floor_id,
        slot_id,
        users (
          name
        )
      `)
            .order("start_time", { ascending: sort === "asc" })

        if (start && end) {
            reservationQuery = reservationQuery
                .gte("start_time", start)
                .lte("start_time", end)
        }

        const { data: rows, error } = await reservationQuery
        if (error) throw error

        // -----------------------------
        // Transform → UI-ready
        // -----------------------------
        const reservations = (rows ?? []).map((r) => {
            const start = new Date(r.start_time)
            const end = new Date(r.end_time)

            // เวลา
            const time = `${start.toLocaleTimeString("th-TH", {
                hour: "2-digit",
                minute: "2-digit",
            })}-${end.toLocaleTimeString("th-TH", {
                hour: "2-digit",
                minute: "2-digit",
            })}`

            // วันที่ พ.ศ.
            const dateTH = start.toLocaleDateString("th-TH", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
            })

            // UI Status
            let uiStatus = "ยังไม่ใช้งาน"
            if (r.status === "cancelled") {
                uiStatus = "ยกเลิก"
            } else if (end < now) {
                uiStatus = "หมดอายุ"
            } else if (start <= now && end >= now) {
                uiStatus = "ใช้งานแล้ว"
            }

            return {
                user: r.users?.name ?? "-",
                id: r.id,
                date: dateTH,
                time,
                room: `${r.floor_id}-${r.slot_id}`,
                type: r.vehicle_type ?? "-",
                invitee: "-", // ตอนนี้ยังไม่มี field จริง
                status: uiStatus,
            }
        })


        // =====================================================
        // METRICS QUERY (Independent from list)
        // =====================================================
        let metricBase = supabase
            .from("reservations")
            .select("id, start_time, end_time, status", { count: "exact" })

        if (start && end) {
            metricBase = metricBase
                .gte("start_time", start)
                .lte("start_time", end)
        }

        const { data: metricRows, count: total } = await metricBase

        const upcoming =
            metricRows?.filter(r => new Date(r.start_time) > now).length ?? 0

        const active =
            metricRows?.filter(r => {
                const s = new Date(r.start_time)
                const e = new Date(r.end_time)
                return s <= now && e >= now
            }).length ?? 0

        const expired =
            metricRows?.filter(r => new Date(r.end_time) < now).length ?? 0

        const metrics = [
            {
                title: "รายการจอง",
                value: String(total ?? 0),
                subtext: `+${total ?? 0} การจอง`,
                icon: "pi pi-users",
            },
            {
                title: "การจองที่ยังไม่ถึงเวลา",
                value: upcoming.toString(),
                subtext: `+${upcoming} การจอง`,
                icon: "pi pi-clock",
            },
            {
                title: "การจองที่ถึงกำหนด",
                value: active.toString(),
                subtext: `+${active} การจอง`,
                icon: "pi pi-check-circle",
            },
            {
                title: "การจองที่หมดอายุ",
                value: expired.toString(),
                subtext: `+${expired} การจอง`,
                icon: "pi pi-exclamation-circle",
            },
        ]


        // -----------------------------
        // Response
        // -----------------------------
        return new Response(
            JSON.stringify({
                success: true,
                metrics,
                reservations,
            }),
            {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        )
    } catch (error) {
        console.error("get-user-reservations v2 error:", error)

        return new Response(
            JSON.stringify({
                success: false,
                error: error.message,
            }),
            {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        )
    }
})
