import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // 1. Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // 2. อ่านค่า profile_id จาก Body
        const { profile_id } = await req.json()

        if (!profile_id) {
            throw new Error('Please send "profile_id" in request body')
        }

        // 3. สร้าง Client
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
        const supabase = createClient(supabaseUrl, supabaseAnonKey)

        // 4. Query ข้อมูล Reservations 
        const { data: reservations, error: resError } = await supabase
            .from('reservations')
            .select('*')
            .eq('profile_id', profile_id)
            .order('start_time', { ascending: false })

        if (resError) throw resError

        // 5. ดึง car_id ที่ไม่ซ้ำกันออกมา
        const carIds = [...new Set(reservations.map(r => r.car_id).filter(Boolean))]

        // 6. ไปดึงข้อมูลรถจากตาราง cars (เพิ่ม province และ color ใน select)
        let carsMap = {}
        if (carIds.length > 0) {
            const { data: cars, error: carsError } = await supabase
                .from('cars')
                .select('id, model, province, color') // <--- แก้ไขจุดนี้
                .in('id', carIds)

            if (carsError) throw carsError

            // แปลงข้อมูลให้อยู่ในรูปแบบ Object เพื่อให้จับคู่ได้ง่าย
            carsMap = cars.reduce((acc, car) => {
                acc[car.id] = {
                    model: car.model,
                    province: car.province,
                    color: car.color
                }
                return acc
            }, {})
        }

        // 7. นำข้อมูลรถมาประกอบร่างเข้ากับ reservations
        const finalData = reservations.map(res => ({
            ...res,
            cars: carsMap[res.car_id] || { model: null, province: null, color: null } // <--- แก้ไขจุดนี้
        }))

        // 8. ส่งผลลัพธ์กลับ
        return new Response(JSON.stringify({
            success: true,
            profile_id_checked: profile_id,
            data: finalData
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error) {
        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})