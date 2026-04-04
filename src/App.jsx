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

  if (session) {
    return <TrainingApp />
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        fontFamily: "Roboto, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(255,248,248,0.96))",
          borderRadius: 28,
          padding: 32,
          boxShadow: "0 24px 60px rgba(24, 32, 43, 0.12)",
          border: "1px solid rgba(198, 40, 40, 0.12)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div
            style={{
              width: 84,
              height: 84,
              margin: "0 auto 16px",
              borderRadius: 24,
              background:
                "linear-gradient(135deg, #c62828 0%, #991b1b 100%)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 26,
              fontWeight: 900,
              letterSpacing: "0.08em",
              boxShadow: "0 16px 32px rgba(198, 40, 40, 0.28)",
            }}
          >
            GIF
          </div>
          <div
            style={{
              display: "inline-flex",
              padding: "6px 12px",
              borderRadius: 999,
              backgroundColor: "#fff1f1",
              color: "#991b1b",
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 14,
            }}
          >
            Gustavsbergs Handboll
          </div>
          <h1 style={{ margin: 0, fontSize: 34, color: "#18202b", lineHeight: 1 }}>
            Gurra Styrka
          </h1>
          <p style={{ margin: "10px 0 0", color: "#566173", fontSize: 15, lineHeight: 1.6 }}>
            Enkel träning för spelare och tränare. Logga in och hitta rätt pass direkt.
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
                padding: 14,
                borderRadius: 16,
                border: "1px solid #e6dada",
                fontSize: 16,
                boxSizing: "border-box",
                backgroundColor: "#fffefe",
                color: "#18202b",
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
                padding: 14,
                borderRadius: 16,
                border: "1px solid #e6dada",
                fontSize: 16,
                boxSizing: "border-box",
                backgroundColor: "#fffefe",
                color: "#18202b",
              }}
            />
          </div>

          <button
            type="submit"
            style={{
              width: "100%",
              padding: "15px 18px",
              borderRadius: 16,
              border: "none",
              background:
                "linear-gradient(135deg, #c62828 0%, #991b1b 100%)",
              color: "#ffffff",
              fontSize: 16,
              fontWeight: 800,
              cursor: "pointer",
              boxShadow: "0 14px 30px rgba(198, 40, 40, 0.26)",
            }}
          >
            Logga in
          </button>
        </form>

        {message && (
          <p
            style={{
              marginTop: 16,
              textAlign: "center",
              color: "#566173",
              backgroundColor: "#fff4f4",
              border: "1px solid #f4d0d0",
              borderRadius: 14,
              padding: "12px 14px",
              fontSize: 14,
            }}
          >
            {message}
          </p>
        )}
      </div>
    </div>
  )
}

export default App
