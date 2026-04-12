import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const authHeader = req.headers.get("Authorization")
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader! } } }
    )

    const url = new URL(req.url)
    const sort = url.searchParams.get("sort") ?? "desc"

    const [resResult, carResult] = await Promise.all([
      supabase
        .from("reservations")
        .select(`
          *,
          profiles (id, name, email, phone),
          floors (
            id, name,
            buildings (id, name)
          ),
          slots (
            id, name, zone_id,
            zones (id, name)
          )
        `)
        .order("start_time", { ascending: sort === "asc" }),
      supabase.from("cars").select("*")
    ])

    if (resResult.error) throw resResult.error



    const carsMap = new Map(carResult.data?.map(c => [c.id, c]))

    // 1. สร้าง Object สำหรับเก็บยอดนับแยกตามสถานะ (ไม่มี if-else)
    const counts: Record<string, number> = {
      all: 0,
      pending: 0,
      pending_payment: 0,
      confirmed: 0,
      checked_in: 0,
      cancelled: 0
    };

    // 2. สร้าง Map สำหรับแปลภาษาไทย (ไม่มี if-else)
    const statusMap: Record<string, string> = {
      pending: "รอดำเนินการ",
      pending_payment: "รอชำระเงิน",
      confirmed: "ยืนยันแล้ว",
      checked_in: "เข้าจอดแล้ว",
      checked_in_pending_payment: "เข้าจอดแล้ว", // รวมเข้าด้วยกัน
      active: "เข้าจอดแล้ว",                     // ถ้ามีหลงมาให้ถือว่าเป็นเข้าจอดแล้ว
      cancelled: "ยกเลิก"
    };

    const reservations = (resResult.data || []).map((r: any) => {
      const profile: Record<string, any> = r.profiles || {}
      const floor: Record<string, any> = r.floors || {}
      const building: Record<string, any> = floor.buildings || {}
      const slot: Record<string, any> = r.slots || {}
      const zone = slot.zones || {}
      const car: Record<string, any> = carsMap.get(r.car_id) || {}

      const start = r.start_time ? new Date(r.start_time) : new Date()
      const end = r.end_time ? new Date(r.end_time) : new Date()
      const reservedAt = r.reserved_at ? new Date(r.reserved_at) : new Date()

      // --- 3. แก้ไข Logic การนับยอด (Grouping Counts) ---
      const s = r.status;

      counts.all++; // <<--- ต้องเพิ่มบรรทัดนี้ เพื่อให้นับยอด "จองทั้งหมด"

      if (s === 'pending') counts.pending++;
      else if (s === 'pending_payment') counts.pending_payment++;
      else if (s === 'confirmed') counts.confirmed++;
      // รวมกลุ่มเข้าจอด: checked_in, checked_in_pending_payment และ active (ถ้ามี)
      else if (['checked_in', 'checked_in_pending_payment', 'active'].includes(s)) {
        counts.checked_in++;
      }
      else if (s === 'cancelled') counts.cancelled++;
      // หมายเหตุ: ไม่นับ checked_out แล้วตามที่ตกลงกัน

      const uiStatus = statusMap[s] || s;

      return {
        id: r.id,
        user_id: r.profile_id,
        user: profile.name || "ไม่ระบุชื่อ",
        email: profile.email || "-",
        phone: profile.phone || "-",
        building_name: building.name || "ไม่ทราบอาคาร",
        floor_name: floor.name || "-",
        zone_name: zone.name || "-",
        room: slot.name || r.slot_id || "-",

        car_id: r.car_id || "-",
        license_plate: car.license_plate || r.car_plate || "-",
        car_model: car.model || "-",
        car_color: car.color || "-",
        car_data: car,

        date: start.toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok" }),
        time: `${start.toLocaleTimeString("th-TH", { hour: '2-digit', minute: '2-digit', timeZone: "Asia/Bangkok" })} - ${end.toLocaleTimeString("th-TH", { hour: '2-digit', minute: '2-digit', timeZone: "Asia/Bangkok" })}`,

        reserved_at_date: reservedAt.toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok" }),
        reserved_at_time: reservedAt.toLocaleTimeString("th-TH", {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: "Asia/Bangkok"
        }),

        type: r.vehicle_type ?? "-",
        status: uiStatus,
        original_status: r.status, // สำคัญมาก: เก็บไว้เช็คเงื่อนไขพิเศษที่หน้าบ้าน
        updated_at: r.updated_at,
        reserved_at: r.reserved_at
      }
    })

    // 5. นำยอดที่นับไว้มาใส่ใน Metrics ให้ครบทุกตัว
    const metrics = [
      { title: "จองทั้งหมด", value: String(counts.all), subtext: "รายการ", color: "blue" },
      { title: "รอดำเนินการ", value: String(counts.pending), subtext: "รายการ", color: "yellow" },
      { title: "รอชำระเงิน", value: String(counts.pending_payment), subtext: "รายการ", color: "orange" },
      { title: "ยืนยันแล้ว", value: String(counts.confirmed), subtext: "รายการ", color: "purple" },
      { title: "เข้าจอดแล้ว", value: String(counts.checked_in), subtext: "รายการ", color: "green" },
      { title: "ยกเลิก", value: String(counts.cancelled), subtext: "รายการ", color: "red" }
    ];

    return new Response(
      JSON.stringify({ success: true, metrics, reservations, all_cars: carResult.data || [] }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )

  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})