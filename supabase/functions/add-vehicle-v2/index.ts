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

    if (!vehicle?.licensePlate || !vehicle?.model || !vehicle?.province) {
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
        JSON.stringify({ error: 'ผู้ใช้งานทั่วไปไม่สามารถลงทะเบียนรถได้' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    //--------------------------------------------------
    // 3. Check vehicle limit
    //--------------------------------------------------

    const { count, error: countError } = await supabaseClient
      .from('cars')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', userId)
      .eq('is_active', true)

    if (countError) {
      throw new Error(countError.message)
    }

    if (count && count >= 3) {
      return new Response(
        JSON.stringify({ error: 'Vehicle limit reached. Maximum of 3 vehicles allowed.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    //--------------------------------------------------
    // 4. Prepare vehicle data
    //--------------------------------------------------

    const vehicleType =
      vehicle.type !== 'car' &&
      vehicle.type !== 'ev' &&
      vehicle.type !== 'motorcycle'
        ? 'other'
        : vehicle.type

    const model =
      vehicle.type === 'other' || vehicle.customType
        ? `[${vehicle.customType || 'อื่นๆ'}] ${vehicle.model}`
        : vehicle.model

    //--------------------------------------------------
    // Normalize license plate
    //--------------------------------------------------

    let plate = vehicle.licensePlate
        ?.trim()
        .replace(/\s+/g, ' ')   // collapse spaces

    // Motorcycle plates often have no letters
    // keep as-is but normalize spacing

    if (vehicleType === 'motorcycle') {
        plate = plate.toUpperCase()
    } else {
        // car / ev
        plate = plate.toUpperCase()
    }

    //--------------------------------------------------
    // 5. Call RPC (Insert + Log)
    //--------------------------------------------------

    const { data, error } = await supabaseClient.rpc(
      'add_vehicle_with_log',
      {
        p_user_id: userId,
        p_user_name: profile.name ?? user.email,

        p_vehicle_type: vehicleType,
        p_model: model,
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
    // 6. Return result
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