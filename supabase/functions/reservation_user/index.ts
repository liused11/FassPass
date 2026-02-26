import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
serve(async (req)=>{
  // 1. Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    // 2. อ่านค่า user_id จาก Body
    const { user_id } = await req.json();
    if (!user_id) {
      throw new Error('Please send "user_id" in request body');
    }
    // 3. สร้าง Client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    // 4. Query ข้อมูล
    // แก้ไข: เปลี่ยนจาก order('created_at') เป็น order('start_time')
    const { data, error } = await supabase.from('reservations').select('*').eq('user_id', user_id).order('start_time', {
      ascending: false
    });
    if (error) throw error;
    // 5. ส่งผลลัพธ์
    return new Response(JSON.stringify({
      success: true,
      user_id_checked: user_id,
      data: data
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 400
    });
  }
});
