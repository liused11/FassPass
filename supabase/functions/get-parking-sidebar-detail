// supabase/functions/get-parking-sidebar-detail/index.ts

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
        // อ่าน query parameter แทน
        const url = new URL(req.url)
        const buildingId = url.searchParams.get("id")

        if (!buildingId) {
            return new Response(
                JSON.stringify({ success: false, error: "id query param is required" }),
                { status: 400, headers: corsHeaders }
            )
        }

        const supabase = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_ANON_KEY")!,
            {
                global: {
                    headers: {
                        Authorization: req.headers.get("Authorization")!,
                    },
                },
            }
        )

        // =====================================================
        // 1️⃣ ดึงข้อมูล building หลัก
        // =====================================================
        const { data: building, error } = await supabase
            .from("buildings")
            .select(`
        id,
        name,
        address,
        images,
        is_active,
        open_time,
        close_time,
        role_prices,
        capacity
      `)
            .eq("id", buildingId)
            .single()

        if (error) throw error
        if (!building) throw new Error("Building not found")

        // =====================================================
        // 2️⃣ ดึง vehicle types จาก slots
        // =====================================================
        const { data: floors } = await supabase
            .from("floors")
            .select("id")
            .eq("building_id", buildingId)

        const floorIds = floors?.map(f => f.id) ?? []

        let allowedVehicleTypes: string[] = []

        if (floorIds.length > 0) {
            const { data: zones } = await supabase
                .from("zones")
                .select("id")
                .in("floor_id", floorIds)

            const zoneIds = zones?.map(z => z.id) ?? []

            if (zoneIds.length > 0) {
                const { data: slots } = await supabase
                    .from("slots")
                    .select("vehicle_type")
                    .in("zone_id", zoneIds)

                const uniqueTypes = Array.from(
                    new Set(slots?.map(s => s.vehicle_type))
                )

                // map DB value → FE value
                allowedVehicleTypes = uniqueTypes.map(type => {
                    switch (type) {
                        case "CAR":
                            return "car"
                        case "EV":
                            return "ev"
                        case "BIKE":
                            return "motorcycle"
                        default:
                            return type?.toLowerCase()
                    }
                })
            }
        }

        const getUserPrice = (rolePrices: any): number => {
            if (!rolePrices) return 0
            try {
                const parsed =
                    typeof rolePrices === "string"
                        ? JSON.parse(rolePrices)
                        : rolePrices
                return parsed?.User ?? 0
            } catch {
                return 0
            }
        }

        // =====================================================
        // 3️⃣ ส่งข้อมูลให้ Sidebar
        // =====================================================
        return new Response(
            JSON.stringify({
                success: true,
                data: {
                    id: building.id,
                    name: building.name ?? "",
                    address: building.address ?? "",
                    imageUrl: building.images ?? [],
                    isActive: building.is_active ?? false,

                    openTime: building.open_time ?? "08:00:00",
                    closeTime: building.close_time ?? "20:00:00",

                    capacity: building.capacity ?? 0,
                    role_prices: typeof building.role_prices === 'string'
                        ? JSON.parse(building.role_prices)
                        : (building.role_prices ?? { Host: 0, User: 0, Visitor: 0 }),

                    allowedVehicleTypes,
                }
            }),
            {
                headers: {
                    ...corsHeaders,
                    "Content-Type": "application/json",
                },
            }
        )
    } catch (err) {
        return new Response(
            JSON.stringify({
                success: false,
                error: err.message,
            }),
            {
                status: 500,
                headers: corsHeaders,
            }
        )
    }
})