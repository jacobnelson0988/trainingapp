import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get("Authorization")

    if (!authHeader) {
      return jsonResponse({ error: "Missing authorization header" }, 401)
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!
    const serviceRoleKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY")

    if (!serviceRoleKey) {
      return jsonResponse({ error: "Missing service role configuration" }, 500)
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    })

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser()

    if (userError || !user) {
      return jsonResponse({ error: "Not authenticated" }, 401)
    }

    const { data: requesterProfile, error: requesterError } = await userClient
      .from("profiles")
      .select("id, role, team_id")
      .eq("id", user.id)
      .single()

    if (requesterError || !requesterProfile) {
      return jsonResponse({ error: "Profile not found" }, 403)
    }

    const { player_id: playerId } = await req.json()

    if (!playerId) {
      return jsonResponse({ error: "player_id missing" }, 400)
    }

    const isSelfDelete = requesterProfile.id === playerId
    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    const { data: targetProfile, error: targetError } = await adminClient
      .from("profiles")
      .select("id, role, team_id")
      .eq("id", playerId)
      .single()

    if (targetError || !targetProfile) {
      return jsonResponse({ error: "Spelaren hittades inte" }, 404)
    }

    if (targetProfile.role !== "player") {
      return jsonResponse({ error: "Endast spelare kan tas bort med denna funktion" }, 400)
    }

    if (isSelfDelete) {
      if (requesterProfile.role !== "player") {
        return jsonResponse({ error: "Du kan bara ta bort ditt eget spelarkonto" }, 403)
      }
    } else if (requesterProfile.role === "head_admin") {
      // full access
    } else if (
      requesterProfile.role === "coach" &&
      requesterProfile.team_id &&
      requesterProfile.team_id === targetProfile.team_id
    ) {
      // coach may delete players in own team
    } else {
      return jsonResponse({ error: "Du har inte rätt att ta bort den här spelaren" }, 403)
    }

    const { data: sentMessages, error: sentMessagesError } = await adminClient
      .from("messages")
      .select("id")
      .eq("sender_id", playerId)

    if (sentMessagesError) {
      return jsonResponse({ error: sentMessagesError.message }, 400)
    }

    const sentMessageIds = (sentMessages || []).map((entry) => entry.id).filter(Boolean)

    const deleteSteps = [
      () => adminClient.from("player_exercise_targets").delete().eq("player_id", playerId),
      () => adminClient.from("player_exercise_goals").delete().eq("player_id", playerId),
      () => adminClient.from("workout_logs").delete().eq("user_id", playerId),
      () => adminClient.from("exercise_requests").delete().eq("requester_id", playerId),
      () => adminClient.from("beta_feedback").delete().eq("user_id", playerId),
      () => adminClient.from("message_recipients").delete().eq("recipient_id", playerId),
      () =>
        sentMessageIds.length > 0
          ? adminClient.from("message_recipients").delete().in("message_id", sentMessageIds)
          : Promise.resolve({ error: null }),
      () => adminClient.from("messages").delete().eq("sender_id", playerId),
      () => adminClient.from("profiles").delete().eq("id", playerId),
    ]

    for (const step of deleteSteps) {
      const { error } = await step()
      if (error) {
        return jsonResponse({ error: error.message }, 400)
      }
    }

    const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(playerId)

    if (deleteAuthError) {
      return jsonResponse({ error: deleteAuthError.message }, 400)
    }

    return jsonResponse({ success: true, player_id: playerId, self_deleted: isSelfDelete }, 200)
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : "Unknown error" }, 500)
  }
})

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
