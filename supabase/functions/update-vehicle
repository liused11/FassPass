import "@supabase/functions-js/edge-runtime.d.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { vehicle } = await req.json()

    if (!vehicle?.id || !vehicle?.licensePlate || !vehicle?.model || !vehicle?.province) {
      return new Response(
        JSON.stringify({ error: 'Missing required vehicle fields' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    //--------------------------------------------------
    // 1. Get current user
    //--------------------------------------------------

    const {
      data: { user },
      error: userError
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: User not logged in' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    const userId = user.id

    //--------------------------------------------------
    // 2. Get profile
    //--------------------------------------------------

    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('role, name')
      .eq('id', userId)
      .single()

    if (profileError) {
      throw new Error(profileError.message)
    }

    if (profile.role === 'Visitor') {
      return new Response(
        JSON.stringify({ error: 'ผู้ใช้งานทั่วไปไม่สามารถแก้ไขรถได้' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    //--------------------------------------------------
    // Normalize license plate
    //--------------------------------------------------

    let plate = vehicle.licensePlate
      ?.trim()
      .replace(/\s+/g, ' ')
      .toUpperCase()

    //--------------------------------------------------
    // 3. Call RPC (Update + Log)
    //--------------------------------------------------

    const { data, error } = await supabaseClient.rpc(
      'update_vehicle_with_log',
      {
        p_vehicle_id: vehicle.id,
        p_user_id: userId,
        p_user_name: profile.name ?? user.email,

        p_model: vehicle.model,
        p_license_plate: plate,
        p_province: vehicle.province,
        p_color: vehicle.color ?? null,
        p_image: vehicle.image ?? null,
        p_is_default: vehicle.isDefault ?? false
      }
    )

    if (error) {
      throw error
    }

    //--------------------------------------------------
    // 4. Return result
    //--------------------------------------------------

    return new Response(
      JSON.stringify(data),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error: any) {

    console.error('Edge Function Error:', error)

    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error occurred' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }

})