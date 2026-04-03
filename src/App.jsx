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

    const cleanUsername = username.trim().toLowerCase()
    const cleanPassword = password.trim()

    if (!cleanUsername || !cleanPassword) {
      setMessage("Fyll i användarnamn och lösenord")
      return
    }

    const normalizedUsername = cleanUsername
      .replace(/[åä]/g, "a")
      .replace(/ö/g, "o")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")

    const compactUsername = normalizedUsername.replace(/[^a-z0-9]/g, "")

    const candidateEmails = [
      `${cleanUsername}@example.com`,
      `${normalizedUsername}@example.com`,
      `${compactUsername}@example.com`,
      `${cleanUsername}@lagapp.local`,
      `${cleanUsername}@lagapp.test`,
    ]

    const uniqueCandidateEmails = [...new Set(candidateEmails.filter(Boolean))]

    let lastErrorMessage = "Fel användarnamn eller lösenord"

    for (const email of uniqueCandidateEmails) {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: cleanPassword,
      })

      if (!error) {
        setMessage("Inloggad ✅")
        return
      }

      console.error(`Login failed for ${email}:`, error)
      lastErrorMessage = error.message || "Fel användarnamn eller lösenord"
    }

    setMessage(lastErrorMessage)
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
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f3f4f6",
        padding: 24,
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 380,
          backgroundColor: "#ffffff",
          borderRadius: 16,
          padding: 32,
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.08)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div
            style={{
              width: 64,
              height: 64,
              margin: "0 auto 12px",
              borderRadius: "50%",
              backgroundColor: "#dc2626",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
            }}
          >
            🏋️
          </div>
          <h1 style={{ margin: 0, fontSize: 28, color: "#111827" }}>Gurra Styrka</h1>
          <p style={{ margin: "8px 0 0", color: "#6b7280", fontSize: 14 }}>
            Logga in för att starta ditt pass
          </p>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 12 }}>
            <input
              type="text"
              placeholder="Användarnamn"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 10,
                border: "1px solid #d1d5db",
                fontSize: 16,
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <input
              type="password"
              placeholder="Lösenord"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 10,
                border: "1px solid #d1d5db",
                fontSize: 16,
                boxSizing: "border-box",
              }}
            />
          </div>

          <button
            type="submit"
            style={{
              width: "100%",
              padding: "14px 16px",
              borderRadius: 12,
              border: "none",
              backgroundColor: "#dc2626",
              color: "#ffffff",
              fontSize: 16,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(220, 38, 38, 0.25)",
            }}
          >
            Logga in
          </button>
        </form>

        {message && (
          <p style={{ marginTop: 16, textAlign: "center", color: "#6b7280" }}>{message}</p>
        )}
      </div>
    </div>
  )
}

export default App