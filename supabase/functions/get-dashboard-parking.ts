// supabase/functions/get-dashboard-parking/index.ts
function computeStatus(building, used, total) {
    if (!building.is_active) {
        return "ปิดใช้งานอยู่";
    }
    if (!building.open_time || !building.close_time) {
        return "ปิดใช้งานอยู่";
    }

    const now = new Date();
    const thaiNow = new Date(
        now.toLocaleString("en-US", { timeZone: "Asia/Bangkok" })
    );
    const currentMinutes =
        thaiNow.getHours() * 60 + thaiNow.getMinutes();

    const [openH, openM] = building.open_time.split(":").map(Number);
    const [closeH, closeM] = building.close_time.split(":").map(Number);

    const openMinutes = openH * 60 + openM;
    const closeMinutes = closeH * 60 + closeM;

    if (currentMinutes < openMinutes || currentMinutes > closeMinutes) {
        return "ปิดใช้งานอยู่";
    }

    const minutesUntilClose = closeMinutes - currentMinutes;

    if (minutesUntilClose <= 30) {
        return "กำลังจะปิด";
    }

    if (used === total && total > 0) {
        return "เต็ม";
    }

    return "ใช้งานอยู่";
}

function getActualSlotStatus(slot: any, thaiNow: Date) {
    // 1. Check Active Reservations (Priority 1)
    // สถานะที่ไม่ใช่ cancelled หรือ checked_out และเวลาปัจจุบันอยู่ในช่วงจอง
    const activeReservation = slot.reservations?.find((r: any) => {
        const start = new Date(r.start_time);
        const end = new Date(r.end_time);
        return thaiNow >= start && thaiNow <= end;
    });
    if (activeReservation) return "occupied";

    // 2. Check Overrides (Priority 2) - เช่น Maintenance
    const currentMinutes = thaiNow.getHours() * 60 + thaiNow.getMinutes();
    const override = slot.slot_status_overrides?.find((o: any) => {
        const [sh, sm] = o.start_time.split(":").map(Number);
        const [eh, em] = o.end_time.split(":").map(Number);
        return currentMinutes >= (sh * 60 + sm) && currentMinutes < (eh * 60 + em);
    });
    if (override) return override.status;

    // 3. Main Status (Priority 3)
    return slot.status;
}


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
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
                headers: corsHeaders,
            })
        }

        const supabase = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_ANON_KEY")!,
            {
                global: { headers: { Authorization: authHeader } },
            }
        )

        const url = new URL(req.url)
        const simulate = url.searchParams.get("simulate")
        const siteId = url.searchParams.get("site_id")

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

        // =============================
        // 1) Buildings
        // =============================
        let buildingsQuery = supabase
            .from("buildings")
            .select(`
        id,
        name,
        open_time,
        close_time,
        price_info,
        is_active,
        address,
        parking_site_id,
        images,
        role_prices
      `)

        if (siteId && siteId !== "all") {
            buildingsQuery = buildingsQuery.eq("parking_site_id", siteId)
        }

        const { data: buildingsData, error: buildingsError } =
            await buildingsQuery

        if (buildingsError) throw buildingsError

        const buildings = buildingsData ?? []

        // =============================
        // 2) Floors
        // =============================
        const { data: floorsData, error: floorError } =
            await supabase
                .from("floors")
                .select("id, building_id")

        if (floorError) throw floorError
        const floors = floorsData ?? []

        const floorToBuilding = new Map(
            floors.map((f: any) => [f.id, f.building_id])
        )

        // =============================
        // 3) Zones
        // =============================
        const { data: zonesData, error: zonesError } =
            await supabase
                .from("zones")
                .select("id, floor_id")

        if (zonesError) throw zonesError
        const zones = zonesData ?? []

        const zoneToFloor = new Map(
            zones.map((z: any) => [z.id, z.floor_id])
        )

        // =============================
        // 4) Slots
        // =============================
        const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' }); // YYYY-MM-DD
        const { data: slotsData, error: slotError } =
            await supabase
                .from("slots")
                .select(`
          id, status, vehicle_type, zone_id, 
          reservations(start_time, end_time, status),
          slot_status_overrides(status, start_time, end_time, override_date)
        `)
                .filter("reservations.status", "not.in", '("cancelled","confirmed")')
                .filter("slot_status_overrides.override_date", "eq", todayStr);
        if (slotError) throw slotError
        const slots = slotsData ?? []
        const thaiNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));

        // =============================
        // 5) Metrics
        // =============================

        const totalSlots = slots.length
        const evSlots =
            slots.filter((s: any) => s.vehicle_type === "EV")
                .length
        const bikeSlots =
            slots.filter((s: any) => s.vehicle_type === "BIKE")
                .length
        const parkingCount = buildings.length

        const metrics = [
            {
                title: "ลานจอดรถทั้งหมด",
                value: parkingCount.toString(),
                subtext: "สถานที่ที่เปิดให้ใช้งาน",
                icon: "pi pi-map-marker",
                color: "blue",
            },
            {
                title: "ที่จอดรถทั้งหมด",
                value: totalSlots.toString(),
                subtext: "จำนวนช่องจอดทั้งหมดในระบบ",
                icon: "pi pi-car",
                color: "blue",
            },
            {
                title: "ที่จอดรถยนต์ EV ทั้งหมด",
                value: evSlots.toString(),
                subtext: "รองรับรถยนต์ไฟฟ้า",
                icon: "pi pi-bolt",
                color: "blue",
            },
            {
                title: "ที่จอดจักรยานยนต์ทั้งหมด",
                value: bikeSlots.toString(),
                subtext: "สำหรับรถจักรยานยนต์",
                icon: "pi pi-motorcycle",
                color: "blue",
            },
        ]

        // =============================
        // 6) Parking summary
        // =============================
        const formatPriceText = (rolePrices: any) => {
            if (!rolePrices) return "ฟรี"

            let parsed

            try {
                parsed = typeof rolePrices === "string"
                    ? JSON.parse(rolePrices)
                    : rolePrices
            } catch {
                return "-"
            }

            return Object.entries(parsed)
                .map(([role, price]) => `${role}: ${price}`)
                .join("\n")
        }

        const parkingSummary = buildings.map((b: any) => {
            const priceText = formatPriceText(b.role_prices ?? [])

            const slotsInBuilding = slots.filter((s: any) => {
                const floorId = zoneToFloor.get(s.zone_id)
                const buildingId = floorToBuilding.get(floorId)
                return buildingId === b.id
            })

            const total = slotsInBuilding.length

            // การแก้ไขที่สำคัญ: ใช้ getActualSlotStatus แทนการดึง s.status เฉยๆ
            const used = slotsInBuilding.filter((s: any) => {
                const actualStatus = getActualSlotStatus(s, thaiNow);
                return actualStatus !== "available";
            }).length

            const types = Array.from(
                new Set(
                    slotsInBuilding.map(
                        (s: any) => s.vehicle_type
                    )
                )
            )

            return {
                id: b.id,
                name: b.name,
                images: b.images ?? [],
                open_time: b.open_time,
                close_time: b.close_time,
                address: b.address ?? "",
                used,
                total,
                types,
                status: computeStatus(b, used, total),
                price_text: priceText,
                rate: b.price_info,
            }
        })

        return new Response(
            JSON.stringify({
                success: true,
                metrics,
                parking_summary: parkingSummary,
            }),
            {
                headers: {
                    ...corsHeaders,
                    "Content-Type": "application/json",
                },
            }
        )
    } catch (err: any) {
        console.error("EDGE ERROR:", err)

        return new Response(
            JSON.stringify({
                success: false,
                error: err?.message ?? "Unknown error",
            }),
            {
                status: 500,
                headers: corsHeaders,
            }
        )
    }
})