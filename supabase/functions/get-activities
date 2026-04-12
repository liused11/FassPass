// supabase/functions/get-activities/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
}

const cleanSnapshot = (data: any) => {
    if (!data) return data;

    // ถ้า data มาเป็น string (เช่นจาก Postgres) ให้ parse ก่อน
    let obj = typeof data === 'string' ? JSON.parse(data) : data;

    // ตรวจสอบฟิลด์ที่มีโอกาสเก็บ Base64 (ปรับชื่อฟิลด์ตาม table จริงของคุณ)
    const heavyFields = ['image', 'photo', 'avatar', 'attachment'];

    const processObject = (item: any) => {
        if (typeof item !== 'object' || item === null) return;

        for (const key in item) {
            if (heavyFields.includes(key) && typeof item[key] === 'string' && item[key].startsWith('data:image')) {
                // ย่อให้เหลือแค่ 50 ตัวอักษรพอให้รู้ว่าเป็นประเภทไหน หรือใส่ placeholder แทน
                item[key] = item[key].substring(0, 50) + "...(base64 truncated)";
            } else if (typeof item[key] === 'object') {
                processObject(item[key]); // ทำงานแบบ Recursive ถ้ามี object ซ้อนข้างใน
            }
        }
    };

    processObject(obj);
    return obj;
};

serve(async (req) => {

    // ---------- CORS ----------
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders })
    }

    try {

        // ---------- Auth ----------
        const authHeader = req.headers.get("Authorization")

        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: "Missing Authorization header" }),
                {
                    status: 401,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            )
        }

        // ---------- Supabase client (RLS user) ----------
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_ANON_KEY")!,
            {
                global: {
                    headers: {
                        Authorization: authHeader,
                    },
                },
            }
        )

        // ---------- Query params ----------
        const url = new URL(req.url)
        const simulate = url.searchParams.get("simulate")
        const siteId = url.searchParams.get("site_id")
        const date = url.searchParams.get("date")

        const limitParam = url.searchParams.get("limit")
        const limit = limitParam ? Number(limitParam) : 10000
        const offset = Number(url.searchParams.get("offset") ?? 0)

        if (simulate === "hang") {
            console.log("Simulating server hang...");
            await new Promise(() => { }); // ❗ ค้างตลอด
        }

        if (simulate === "slow") {
            console.log("Simulating slow response...");
            await new Promise(res => setTimeout(res, 30000)); // 30 วิ
        }

        if (simulate === "error") {
            throw new Error("Simulated server error");
        }

        if (simulate === "no-response") {
            return; // ❗ ไม่ return Response → behavior แปลก ๆ ได้
        }

        // sanitize siteId
        const safeSiteId = siteId?.replace(/[^a-zA-Z0-9_-]/g, "")

        let start: string | null = null
        let end: string | null = null

        if (date) {
            start = `${date}T00:00:00.000+07:00`
            end = `${date}T23:59:59.999+07:00`
        }

        // ================= ACTIVITIES QUERY =================

        let activityQuery = supabase
            .from("activity_logs")
            .select(`
        id,
        site_id,
        time,
        action,
        category,
        status,
        entity_id,
        entity_type,
        user_name,
        log_type,
        detail,
        old_data,
        new_data,
        changes,
        meta
      `)

        let totalQuery = supabase
            .from("activity_logs")
            .select("*", { count: "exact", head: true })

        let activityCountQuery = supabase
            .from("activity_logs")
            .select("*", { count: "exact", head: true })
            .eq("log_type", "activity")

        // --- เพิ่มตรงนี้: Query สำหรับนับ Revision ---
        let revisionCountQuery = supabase
            .from("activity_logs")
            .select("*", { count: "exact", head: true })
            .eq("log_type", "revision")

        // 1. สร้าง Array ของ Query เพื่อวนลูปใส่ Filter ที่เหมือนกัน
        const queries = [activityQuery, totalQuery, activityCountQuery, revisionCountQuery];

        // 2. ใส่ Date Filter
        if (start && end) {
            // ใช้ Type 'any' ชั่วคราวเพื่อให้เรียก Method ของ Supabase Query Builder ได้ในลูป
            queries.forEach((q: any) => {
                q.gte("time", start).lte("time", end);
            });
        }

        // 3. ใส่ Site Filter
        if (safeSiteId && safeSiteId !== "all") {
            const orFilter = `site_id.eq.${safeSiteId},site_id.is.null`;
            queries.forEach((q: any) => {
                q.or(orFilter);
            });
        }

        // เพิ่ม Order และ Range เฉพาะตัวข้อมูลหลัก
        activityQuery = activityQuery.order("time", { ascending: false }).range(offset, offset + limit - 1)

        // --- แก้ไขจุดสำคัญ: ใช้ Promise.all เพื่อรัน 3 Query พร้อมกัน (Parallel) ---
        const [resActivities, resTotal, resCount, resRevision] = await Promise.all([
            activityQuery,
            totalQuery,
            activityCountQuery,
            revisionCountQuery
        ])

        if (resActivities.error) throw resActivities.error
        if (resRevision.error) throw resRevision.error

        const cleanedActivities = resActivities.data.map((act: any) => ({
            ...act,
            // ล้างข้อมูลใน old_data และ new_data
            old_data: act.old_data ? cleanSnapshot(act.old_data) : null,
            new_data: act.new_data ? cleanSnapshot(act.new_data) : null,
            // ถ้าใน meta มีเก็บ snapshot ไว้ด้วย ก็ทำด้วย
            meta: act.meta ? cleanSnapshot(act.meta) : act.meta
        }));

        const activities = cleanedActivities
        const totalLogs = resTotal.count ?? 0
        const totalActivities = resCount.count ?? 0
        const totalRevisions = resRevision.count ?? 0 // ดึงค่า count ออกมา

        // ---------- Metrics label ----------
        const today = new Date().toISOString().slice(0, 10)

        const subtext =
            date && date === today
                ? "Today"
                : date
                    ? `On ${date}`
                    : "All time"

        const metrics = [
            {
                title: "Total Logs",
                value: String(totalLogs ?? 0),
                subtext,
                icon: "pi pi-database",
                color: "blue",
            },
            {
                title: "Activities",
                value: String(totalActivities ?? 0),
                subtext: "Events",
                icon: "pi pi-bolt",
                color: "blue",
            },
            {
                title: "Revisions",
                value: String(totalRevisions ?? 0),
                subtext: "Changes",
                icon: "pi pi-history", // ใช้ icon เข็มนาฬิกาหรือประวัติ
                color: "orange",
            }
        ]

        // ================= RESPONSE =================

        return new Response(
            JSON.stringify({
                success: true,
                activities,
                metrics,
                pagination: {
                    limit,
                    offset,
                },
            }),
            {
                status: 200,
                headers: {
                    ...corsHeaders,
                    "Content-Type": "application/json",
                },
            }
        )

    } catch (error: any) {

        console.error("get-activities error:", error)

        return new Response(
            JSON.stringify({
                success: false,
                error: error.message,
            }),
            {
                status: 500,
                headers: {
                    ...corsHeaders,
                    "Content-Type": "application/json",
                },
            }
        )
    }
})