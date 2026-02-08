// Supabase Edge Function: auto-cancel-reservations
// Purpose: Trigger auto-cancellation of expired pending reservations
// Deploy: supabase functions deploy auto-cancel-reservations
// Invoke: Can be called via HTTP or scheduled via external cron (GitHub Actions, etc.)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify request is authorized
    const authHeader = req.headers.get('Authorization')
    const apiKey = req.headers.get('x-api-key')
    const cronSecret = Deno.env.get('CRON_SECRET')
    
    // Allow multiple authentication methods:
    // 1. Authorization header with Bearer token (service_role or anon key)
    // 2. x-api-key matching CRON_SECRET (for GitHub Actions)
    const hasAuthHeader = authHeader?.startsWith('Bearer ')
    const hasValidApiKey = cronSecret && apiKey === cronSecret
    
    if (!hasAuthHeader && !hasValidApiKey) {
      console.log('Authentication failed:', { 
        hasAuthHeader,
        hasValidApiKey,
        cronSecretSet: !!cronSecret,
        apiKeyProvided: !!apiKey
      })
      
      return new Response(
        JSON.stringify({ 
          error: 'Unauthorized',
          message: 'Please provide either Authorization header or valid x-api-key'
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }


    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Call the database function
    const { data, error } = await supabase.rpc('auto_cancel_expired_pending_reservations')

    if (error) {
      throw error
    }

    const cancelledCount = data || 0

    console.log(`Auto-cancellation completed: ${cancelledCount} reservation(s) cancelled`)

    return new Response(
      JSON.stringify({
        success: true,
        cancelled_count: cancelledCount,
        timestamp: new Date().toISOString(),
        message: `Successfully cancelled ${cancelledCount} expired pending reservation(s)`
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in auto-cancel-reservations:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
