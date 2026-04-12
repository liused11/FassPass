import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        ///////////////////////////////////////////////////
        // 1️⃣ Validate Params
        ///////////////////////////////////////////////////

        const { searchParams } = new URL(req.url);
        const slotId = searchParams.get("slot_id");
        const date = searchParams.get("date"); // format: YYYY-MM-DD

        if (!slotId || !date) {
            return new Response(
                JSON.stringify({ error: "slot_id and date are required" }),
                { status: 400, headers: corsHeaders }
            );
        }

        const authHeader = req.headers.get("Authorization") ?? "";
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: "Unauthorized" }),
                { status: 401, headers: corsHeaders }
            );
        }

        const supabase = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_ANON_KEY")!,
            {
                global: { headers: { Authorization: authHeader } },
            }
        );

        ///////////////////////////////////////////////////
        // 2️⃣ Get Slot + Building Schedule
        ///////////////////////////////////////////////////

        const { data: slotData, error: slotError } = await supabase
            .from("slots")
            .select(`
        status,
        floor_id,
        floors (
          building_id,
          buildings (
            open_time,
            close_time
          )
        )
      `)
            .eq("id", slotId)
            .single();

        if (slotError || !slotData) {
            throw new Error("Slot not found");
        }

        const building = slotData.floors?.buildings;
        if (!building) {
            throw new Error("Building not found");
        }

        const openTime = building.open_time;
        const closeTime = building.close_time;

        ///////////////////////////////////////////////////
        // 3️⃣ Generate Time Slots (1 hr interval)
        ///////////////////////////////////////////////////

        const toMinutes = (t: string) => {
            const [h, m] = t.substring(0, 5).split(":").map(Number);
            return h * 60 + m;
        };

        const toHHMM = (mins: number) => {
            const h = Math.floor(mins / 60);
            const m = mins % 60;
            return `${h.toString().padStart(2, "0")}:${m
                .toString()
                .padStart(2, "0")}`;
        };

        const generateTimeSlots = (
            open: string,
            close: string,
            interval = 60
        ) => {
            const slots = [];
            let current = toMinutes(open);
            const end = toMinutes(close);

            while (current + interval <= end) {
                const start = toHHMM(current);
                const finish = toHHMM(current + interval);
                slots.push(`${start}-${finish}`);
                current += interval;
            }

            return slots;
        };

        const timeSlots = generateTimeSlots(openTime, closeTime, 60);

        ///////////////////////////////////////////////////
        // 4️⃣ Recurring Rules
        ///////////////////////////////////////////////////

        const { data: rules } = await supabase
            .from("slot_recurring_rules")
            .select("*")
            .eq("slot_id", slotId)
            .lte("start_date", date)
            .gte("end_date", date);

        const weekday = new Date(`${date}T00:00:00+07:00`).getDay();

        const validRules =
            rules?.filter((rule) => {
                if (rule.recurrence_type === "daily") return true;
                if (rule.recurrence_type === "weekly")
                    return rule.weekday === weekday;
                return false;
            }) ?? [];

        ///////////////////////////////////////////////////
        // 5️⃣ Overrides
        ///////////////////////////////////////////////////

        const { data: overrides } = await supabase
            .from("slot_status_overrides")
            .select("*")
            .eq("slot_id", slotId)
            .eq("override_date", date);

        ///////////////////////////////////////////////////
        // 6️⃣ Base Result
        ///////////////////////////////////////////////////

        let result = timeSlots.map((time) => ({
            time,
            status: slotData.status,
        }));

        const isTimeInRange = (
            slotTime: string,
            start: string,
            end: string
        ) => {
            const [slotStart] = slotTime.split("-");
            const slotMin = toMinutes(slotStart);
            return slotMin >= toMinutes(start) && slotMin < toMinutes(end);
        };

        ///////////////////////////////////////////////////
        // Apply Recurring Rules
        ///////////////////////////////////////////////////

        for (const rule of validRules) {
            result = result.map((ts) => {
                if (isTimeInRange(ts.time, rule.start_time, rule.end_time)) {
                    return { ...ts, status: rule.status };
                }
                return ts;
            });
        }

        ///////////////////////////////////////////////////
        // Apply Overrides (higher priority)
        ///////////////////////////////////////////////////

        for (const override of overrides ?? []) {
            result = result.map((ts) => {
                if (isTimeInRange(ts.time, override.start_time, override.end_time)) {
                    return { ...ts, status: override.status };
                }
                return ts;
            });
        }

        ///////////////////////////////////////////////////
        // 7️⃣ Reservations (FINAL PRIORITY)
        ///////////////////////////////////////////////////

        const startOfDay = new Date(`${date}T00:00:00+07:00`);
        const endOfDay = new Date(`${date}T23:59:59+07:00`);

        const { data: reservations } = await supabase
            .from("reservations")
            .select("*")
            .eq("slot_id", slotId)
            .in("status", ["confirmed", "checked_in", "active"])
            .lt("start_time", endOfDay.toISOString())
            .gt("end_time", startOfDay.toISOString());

        const buildSlotTimestamp = (dateStr: string, timeStr: string) => {
            return new Date(`${dateStr}T${timeStr}+07:00`);
        };

        for (const reservation of reservations ?? []) {
            result = result.map((ts) => {
                const [slotStartStr, slotEndStr] = ts.time.split("-");
                const slotStart = buildSlotTimestamp(date, slotStartStr);
                const slotEnd = buildSlotTimestamp(date, slotEndStr);

                const resStart = new Date(reservation.start_time);
                const resEnd = new Date(reservation.end_time);

                const overlap =
                    resStart < slotEnd && resEnd > slotStart;

                if (overlap) {
                    return { ...ts, status: "reserved" };
                }

                return ts;
            });
        }

        ///////////////////////////////////////////////////
        // RESPONSE
        ///////////////////////////////////////////////////

        return new Response(
            JSON.stringify({
                success: true,
                data: {
                    slot_id: slotId,
                    date,
                    open_time: openTime,
                    close_time: closeTime,
                    time_slots: result,
                },
            }),
            {
                headers: {
                    ...corsHeaders,
                    "Content-Type": "application/json",
                },
                status: 200,
            }
        );
    } catch (err: any) {
        return new Response(
            JSON.stringify({
                success: false,
                error: err.message,
            }),
            {
                status: 500,
                headers: corsHeaders,
            }
        );
    }
});