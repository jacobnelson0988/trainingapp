import { Component, useEffect, useState } from "react"
import { supabase } from "./supabase"
import TrainingApp from "./trainingApp"

const loginPageStyle = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "24px",
  background:
    "radial-gradient(circle at top left, rgba(198, 40, 40, 0.16), transparent 30%), linear-gradient(180deg, #ece7df 0%, #f5f1ea 48%, #efe6db 100%)",
  fontFamily: "Roboto, sans-serif",
}

const loginShellStyle = (isMobile) => ({
  width: "100%",
  maxWidth: "1040px",
  display: "grid",
  gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1.05fr) minmax(360px, 0.95fr)",
  gap: isMobile ? "16px" : "22px",
  alignItems: "stretch",
})

const loginHeroStyle = {
  padding: "28px",
  borderRadius: "30px",
  border: "1px solid rgba(24, 32, 43, 0.08)",
  background:
    "radial-gradient(circle at 84% 18%, rgba(198, 40, 40, 0.18), transparent 24%), linear-gradient(180deg, rgba(255,255,255,0.76), rgba(245, 238, 228, 0.94))",
  boxShadow: "0 24px 60px rgba(24, 32, 43, 0.10)",
  display: "grid",
  alignContent: "space-between",
  gap: "28px",
}

const loginHeroTopStyle = {
  display: "grid",
  gap: "16px",
}

const loginEyebrowStyle = {
  display: "inline-flex",
  width: "fit-content",
  padding: "7px 12px",
  borderRadius: "999px",
  backgroundColor: "rgba(198, 40, 40, 0.10)",
  color: "#991b1b",
  fontSize: "12px",
  fontWeight: "900",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
}

const loginHeroTitleStyle = {
  margin: 0,
  fontFamily: 'Georgia, "Times New Roman", serif',
  fontSize: "clamp(44px, 8vw, 78px)",
  lineHeight: 0.9,
  fontWeight: "700",
  letterSpacing: "-0.06em",
  color: "#15181f",
}

const loginHeroTextStyle = {
  margin: 0,
  maxWidth: "38ch",
  fontSize: "16px",
  lineHeight: 1.6,
  color: "#4b5563",
}

const loginHighlightsGridStyle = (isMobile) => ({
  display: "grid",
  gap: "12px",
  gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))",
})

const loginHighlightCardStyle = {
  padding: "16px 14px",
  borderRadius: "22px",
  border: "1px solid rgba(24, 32, 43, 0.08)",
  backgroundColor: "rgba(255, 255, 255, 0.68)",
  boxShadow: "0 10px 24px rgba(24, 32, 43, 0.06)",
}

const loginHighlightLabelStyle = {
  marginBottom: "8px",
  fontSize: "11px",
  fontWeight: "900",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "#6b7280",
}

const loginHighlightTitleStyle = {
  margin: "0 0 6px",
  fontSize: "18px",
  fontWeight: "900",
  color: "#15181f",
}

const loginHighlightTextStyle = {
  margin: 0,
  fontSize: "13px",
  lineHeight: 1.5,
  color: "#6b7280",
}

const loginAuthCardStyle = {
  padding: "28px",
  borderRadius: "30px",
  border: "1px solid rgba(24, 32, 43, 0.08)",
  background: "rgba(255, 255, 255, 0.92)",
  boxShadow: "0 24px 60px rgba(24, 32, 43, 0.10)",
  display: "grid",
  alignContent: "start",
}

const loginAuthHeaderStyle = {
  marginBottom: "22px",
}

const loginAuthKickerStyle = {
  marginBottom: "10px",
  fontSize: "12px",
  fontWeight: "900",
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "#991b1b",
}

const loginAuthTitleStyle = {
  margin: 0,
  fontFamily: 'Georgia, "Times New Roman", serif',
  fontSize: "clamp(30px, 7vw, 48px)",
  lineHeight: 0.95,
  fontWeight: "700",
  letterSpacing: "-0.05em",
  color: "#15181f",
}

const loginAuthTextStyle = {
  margin: "10px 0 0",
  fontSize: "14px",
  lineHeight: 1.6,
  color: "#6b7280",
}

const loginFormStyle = {
  display: "grid",
  gap: "14px",
}

const loginFieldStyle = {
  display: "grid",
  gap: "8px",
}

const loginLabelStyle = {
  fontSize: "12px",
  fontWeight: "900",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "#4b5563",
}

const loginInputStyle = {
  width: "100%",
  padding: "15px 16px",
  borderRadius: "18px",
  border: "1px solid #d7dee7",
  backgroundColor: "#fdfbf8",
  color: "#15181f",
  fontSize: "16px",
  boxSizing: "border-box",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)",
}

const loginButtonStyle = {
  width: "100%",
  marginTop: "6px",
  padding: "16px 18px",
  borderRadius: "18px",
  border: "none",
  background: "linear-gradient(135deg, #c62828 0%, #991b1b 100%)",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "900",
  cursor: "pointer",
  boxShadow: "0 16px 34px rgba(198, 40, 40, 0.24)",
}

const loginMessageStyle = (isSuccess) => ({
  marginTop: "16px",
  padding: "12px 14px",
  borderRadius: "16px",
  border: `1px solid ${isSuccess ? "#c9ead7" : "#f1d1d1"}`,
  backgroundColor: isSuccess ? "#effaf3" : "#fff4f4",
  color: isSuccess ? "#17603a" : "#7f1d1d",
  fontSize: "14px",
  lineHeight: 1.5,
})

class AppErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error) {
    console.error("App crashed:", error)
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            fontFamily: "Roboto, sans-serif",
            backgroundColor: "#fff8f8",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 520,
              backgroundColor: "#ffffff",
              borderRadius: 24,
              padding: 24,
              border: "1px solid #f1caca",
              boxShadow: "0 20px 48px rgba(24, 32, 43, 0.12)",
            }}
          >
            <h1 style={{ margin: "0 0 12px 0", fontSize: 24, color: "#991b1b" }}>
              Något gick fel i appen
            </h1>
            <p style={{ margin: "0 0 12px 0", color: "#566173", lineHeight: 1.6 }}>
              Skicka den här texten till mig så kan jag fixa nästa steg utan DevTools.
            </p>
            <div
              style={{
                padding: "12px 14px",
                borderRadius: 14,
                backgroundColor: "#fff4f4",
                border: "1px solid #f4d0d0",
                color: "#18202b",
                fontSize: 14,
                lineHeight: 1.5,
                wordBreak: "break-word",
              }}
            >
              {String(this.state.error?.message || this.state.error || "Okänt fel")}
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                marginTop: 14,
                padding: "12px 16px",
                borderRadius: 14,
                border: "none",
                background: "linear-gradient(135deg, #c62828 0%, #991b1b 100%)",
                color: "#ffffff",
                fontSize: 14,
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Ladda om
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

function App() {
  const [session, setSession] = useState(null)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [message, setMessage] = useState("")
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const isMobile = typeof window !== "undefined" ? window.innerWidth <= 768 : false
  const isSuccessMessage = message.includes("✅")

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
    setIsLoggingIn(true)

    const cleanUsername = username.trim().toLowerCase()
    const cleanPassword = password.trim()

    if (!cleanUsername || !cleanPassword) {
      setMessage("Fyll i användarnamn och lösenord")
      setIsLoggingIn(false)
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

    try {
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
    } finally {
      setIsLoggingIn(false)
    }
  }

  if (session) {
    return (
      <AppErrorBoundary>
        <TrainingApp />
      </AppErrorBoundary>
    )
  }

  return (
    <div style={loginPageStyle}>
      <div style={loginShellStyle(isMobile)}>
        <section style={loginHeroStyle}>
          <div style={loginHeroTopStyle}>
            <div style={loginEyebrowStyle}>Gustavsbergs Handboll</div>
            <h1 style={loginHeroTitleStyle}>Starkare Gurra</h1>
            <p style={loginHeroTextStyle}>
              Samma app för pass, kalender, historik och statistik. Logga in och fortsätt direkt i ditt flöde.
            </p>
          </div>

          <div style={loginHighlightsGridStyle(isMobile)}>
            <div style={loginHighlightCardStyle}>
              <div style={loginHighlightLabelStyle}>Pass</div>
              <h2 style={loginHighlightTitleStyle}>Välj snabbt.</h2>
              <p style={loginHighlightTextStyle}>Styrka, löpning och prehab ligger redo när du kommer in.</p>
            </div>
            <div style={loginHighlightCardStyle}>
              <div style={loginHighlightLabelStyle}>Kalender</div>
              <h2 style={loginHighlightTitleStyle}>Planera veckan.</h2>
              <p style={loginHighlightTextStyle}>Se vad tränaren lagt in och bygg på med egna aktiviteter.</p>
            </div>
            <div style={loginHighlightCardStyle}>
              <div style={loginHighlightLabelStyle}>Utveckling</div>
              <h2 style={loginHighlightTitleStyle}>Följ framsteg.</h2>
              <p style={loginHighlightTextStyle}>Historik och statistik finns nära utan att kännas rörigt.</p>
            </div>
          </div>
        </section>

        <section style={loginAuthCardStyle}>
          <div style={loginAuthHeaderStyle}>
            <div style={loginAuthKickerStyle}>Logga in</div>
            <h2 style={loginAuthTitleStyle}>Välkommen tillbaka.</h2>
            <p style={loginAuthTextStyle}>Använd ditt användarnamn och lösenord för att öppna appen.</p>
          </div>

          <form onSubmit={handleLogin} style={loginFormStyle}>
            <div style={loginFieldStyle}>
              <label htmlFor="username" style={loginLabelStyle}>
                Användarnamn
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={loginInputStyle}
                autoComplete="username"
                placeholder="t.ex. jac.nel2"
              />
            </div>

            <div style={loginFieldStyle}>
              <label htmlFor="password" style={loginLabelStyle}>
                Lösenord
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={loginInputStyle}
                autoComplete="current-password"
                placeholder="Ditt lösenord"
              />
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              style={{
                ...loginButtonStyle,
                opacity: isLoggingIn ? 0.72 : 1,
                cursor: isLoggingIn ? "default" : "pointer",
              }}
            >
              {isLoggingIn ? "Loggar in..." : "Logga in"}
            </button>
          </form>

          {message ? <div style={loginMessageStyle(isSuccessMessage)}>{message}</div> : null}
        </section>
      </div>
    </div>
  )
}

export default App
