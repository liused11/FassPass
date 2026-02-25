import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userId, role } = await req.json()

    const MENU_IDS: Record<string, string> = {
      guest: "richmenu-b385e9a15da827b7a5183ba9f2423b8d",
      visitor: "richmenu-2b37d4a1e18193a51580bed45e9dfb28", 
      host: "richmenu-5024f435bb8ef2f1a67f31bfc657deb4",
      user: "richmenu-ce44eafa7924d65357236b8f81f2be45"
    }

    const targetMenuId = MENU_IDS[role] || MENU_IDS['guest']

    console.log(`Switching menu for ${userId} to ${role} (${targetMenuId})`)

    const channelAccessToken = Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN')
    
    if (!channelAccessToken) {
        throw new Error("LINE Token not found in Secrets")
    }

    const url = `https://api.line.me/v2/bot/user/${userId}/richmenu/${targetMenuId}`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${channelAccessToken}`,
        'Content-Type': 'application/json'
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('LINE API Error:', errorText)
      throw new Error(`Failed to change menu: ${response.status}`)
    }

    return new Response(
      JSON.stringify({ success: true, message: `Menu changed to ${role}` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error(error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})