import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {

    // ✅ CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders })
    }

    try {

        const authHeader = req.headers.get("Authorization")

        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: "Missing Authorization header" }),
                {
                    status: 401,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            )
        }

        const supabase = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_ANON_KEY")!,
            {
                global: {
                    headers: {
                        Authorization: authHeader,
                    },
                },
            }
        )

        // logic here...
        const { data: sites, error } = await supabase
            .from("parking_sites")
            .select("id, name")
            .order("id", { ascending: true });

        if (error) throw error;

        return new Response(
            JSON.stringify({ success: true, sites }),
            {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        )
    }
})