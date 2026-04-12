import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
    // 1. จัดการ CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const body = await req.json().catch(() => ({}));

        // รับค่า reservationId (รหัสการจอง) และ shopId (รหัสโปรไฟล์ของคนที่กดให้ส่วนลด)
        // โดยกำหนดให้ discountAmount มีค่าเริ่มต้นที่ 30 บาท
        const { reservationId, shopId, discountAmount = 30 } = body;

        if (!reservationId || !shopId) {
            throw new Error('จำเป็นต้องส่ง reservationId และ shopId');
        }

        // สร้าง Supabase Client (ใช้ Service Role Key เพื่อให้มีสิทธิ์เขียน Database ได้แน่นอน)
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 2. บันทึกส่วนลดลงตาราง e_stamps (ใช้ upsert เพื่อให้สร้างใหม่ หรืออัปเดตทับของเดิมถ้ามีอยู่แล้ว)
        const { data, error } = await supabase
            .from('e_stamps')
            .upsert({
                reservation_id: reservationId,
                shop_id: shopId,
                discount_amount: discountAmount,
                note: `ส่วนลดพิเศษ ${discountAmount} บาทจากการกดปุ่ม`
            }, {
                onConflict: 'reservation_id' // เช็คจาก reservation_id ถ้ามีแล้วให้อัปเดตทับ
            })
            .select()
            .single();

        if (error) throw error;

        // 3. ส่งผลลัพธ์ว่าสำเร็จกลับไปให้แอป
        return new Response(JSON.stringify({
            success: true,
            message: `ลดราคา ${discountAmount} บาท สำเร็จ!`,
            data: data
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200
        });

    } catch (error: any) {
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400
        });
    }
})