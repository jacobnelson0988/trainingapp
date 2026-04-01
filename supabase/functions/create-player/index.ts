import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  const { full_name, password } = await req.json()

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  )

  const names = full_name.toLowerCase().trim().split(" ")
  const first = names[0]?.slice(0, 3) || ""
  const last = names[names.length - 1]?.slice(0, 3) || ""

  let baseUsername = `${first}.${last}`
  let username = `${baseUsername}1`
  let counter = 1

  while (true) {
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", username)
      .maybeSingle()

    if (!data) break

    counter++
    username = `${baseUsername}${counter}`
  }

  const email = `${username}@lagapp.local`

  const { data: user, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  const { error: profileError } = await supabase.from("profiles").insert({
    id: user.user.id,
    username,
    full_name,
    role: "player",
  })

  if (profileError) {
    return new Response(JSON.stringify({ error: profileError.message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  return new Response(
    JSON.stringify({ username, email }),
    { headers: { "Content-Type": "application/json" } }
  )
})