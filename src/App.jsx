import { useEffect, useState } from "react"
import { supabase } from "./supabase"
import TrainingApp from "./trainingApp"

function App() {
  const [session, setSession] = useState(null)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [message, setMessage] = useState("")

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogin = async (e) => {
    e.preventDefault()
    setMessage("")

    const fakeEmail = `${username}@lagapp.local`

    const { error } = await supabase.auth.signInWithPassword({
      email: fakeEmail,
      password,
    })

    if (error) {
      setMessage("Fel användarnamn eller lösenord")
      return
    }

    setMessage("Inloggad ✅")
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setMessage("Utloggad")
  }

  if (session) {
    return (
      <div>
        <div style={{ padding: 16 }}>
          <button onClick={handleLogout}>Logga ut</button>
        </div>
        <TrainingApp />
      </div>
    )
  }

  return (
    <div style={{ padding: 24, maxWidth: 500, margin: "0 auto", fontFamily: "Arial, sans-serif" }}>
      <h1>Logga in</h1>

      <form onSubmit={handleLogin}>
        <div style={{ marginBottom: 12 }}>
          <input
            type="text"
            placeholder="Användarnamn"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{ width: "100%", padding: 10 }}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <input
            type="password"
            placeholder="Lösenord"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: "100%", padding: 10 }}
          />
        </div>

        <button type="submit">Logga in</button>
      </form>

      {message && <p>{message}</p>}
    </div>
  )
}

export default App