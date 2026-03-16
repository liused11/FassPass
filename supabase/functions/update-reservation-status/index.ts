import "@supabase/functions-js/edge-runtime.d.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

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

    const { reservationId, status } = await req.json()

    if (!reservationId || !status) {
      return new Response(
        JSON.stringify({ error: 'Missing reservationId or status' }),
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
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    //--------------------------------------------------
    // 2. Get profile
    //--------------------------------------------------

    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('name')
      .eq('id', user.id)
      .single()

    if (profileError) throw profileError

    //--------------------------------------------------
    // 3. Call RPC
    //--------------------------------------------------

    const { data, error } = await supabaseClient.rpc(
      'update_reservation_status_with_log',
      {
        p_user_id: user.id,
        p_user_name: profile.name ?? user.email,
        p_reservation_id: reservationId,
        p_new_status: status
      }
    )

    if (error) throw error

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
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }

})