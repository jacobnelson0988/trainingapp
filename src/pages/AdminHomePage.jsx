const uiSurface = "var(--ghf-surface)"
const uiBorder = "var(--ghf-line)"
const uiShadowSm = "var(--ghf-shadow-sm)"
const uiShadowMd = "var(--ghf-shadow-md)"

function AdminHomePage({
  setCoachView,
  totalUsers,
  totalTeams,
  organizationLabel,
  isMobile,
  uiVariant,
}) {
  const cards = [
    {
      key: "users",
      title: "Användare",
      text: "Skapa, redigera och håll koll på roller och lag.",
      accent: "#7c3aed",
      background: "#f5f0ff",
    },
    {
      key: "teams",
      title: "Lag",
      text: "Hantera lag, tränare och vilka som hör ihop.",
      accent: "#1d4ed8",
      background: "#eef4ff",
    },
    {
      key: "stats",
      title: "Statistik",
      text: "Följ utveckling och se helhetsbilden i föreningen.",
      accent: "#0f766e",
      background: "#ecfeff",
    },
    {
      key: "exerciseBank",
      title: "Övningsbank",
      text: "Samla övningar och håll innehållet tydligt för alla lag.",
      accent: "#b45309",
      background: "#fff7ed",
    },
    {
      key: "messages",
      title: "Meddelanden",
      text: "Skriv till tränare och användare i hela organisationen.",
      accent: "#c2410c",
      background: "#fff1f2",
    },
    {
      key: "feedback",
      title: "Feedback",
      text: "Se vad testare skickar in och vad som behöver förbättras.",
      accent: "#be123c",
      background: "#fff1f2",
    },
  ]

  return (
    <>
      <div style={headerStyle}>
        <div>
          <div style={titleStyle}>Admin</div>
          <div style={subStyle}>{organizationLabel}</div>
        </div>
        <div style={avatarStyle}>AD</div>
      </div>

      <div style={statsGridStyle(isMobile, 2)}>
        <div style={statCardStyle}>
          <div style={statLabelStyle}>Användare</div>
          <div style={{ ...statValueStyle, color: "#b61e24" }}>{totalUsers}</div>
        </div>
        <div style={statCardStyle}>
          <div style={statLabelStyle}>Lag</div>
          <div style={statValueStyle}>{totalTeams}</div>
        </div>
      </div>

      <div style={introCardStyle}>
        <div style={introTitleStyle}>Snabbval för administration</div>
        <p style={introTextStyle}>
          Gå direkt till rätt del och håll överblick över användare, lag och feedback.
        </p>
      </div>

      <div style={navGridStyle(isMobile)}>
        {cards.map((card) => (
          <button
            key={card.key}
            type="button"
            onClick={() => setCoachView(card.key)}
            style={navCardStyle}
          >
            <div style={topRowStyle}>
              <div style={navTitleStyle}>{card.title}</div>
              <div style={{ ...arrowStyle, color: card.accent, backgroundColor: card.background }}>→</div>
            </div>
            <div style={navTextStyle}>{card.text}</div>
          </button>
        ))}
      </div>
    </>
  )
}

const headerStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  marginBottom: "16px",
}

const titleStyle = {
  fontSize: "clamp(30px, 8vw, 40px)",
  lineHeight: 0.94,
  fontWeight: "700",
  letterSpacing: "-0.04em",
  color: "#1a1814",
}

const subStyle = {
  marginTop: "4px",
  fontSize: "14px",
  color: "#6f6659",
}

const avatarStyle = {
  width: "42px",
  height: "42px",
  borderRadius: "14px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "rgba(26, 24, 20, 0.92)",
  border: "1px solid rgba(26, 24, 20, 0.08)",
  color: "#f3efe6",
  fontSize: "13px",
  fontWeight: "900",
  flexShrink: 0,
}

const statsGridStyle = (isMobile, count) => ({
  display: "grid",
  gap: "10px",
  gridTemplateColumns: `repeat(${Math.max(1, count)}, minmax(0, 1fr))`,
  marginBottom: "12px",
})

const statCardStyle = {
  padding: "14px 16px",
  borderRadius: "20px",
  border: "1px solid rgba(26, 24, 20, 0.12)",
  backgroundColor: "rgba(255, 255, 255, 0.32)",
}

const statLabelStyle = {
  marginBottom: "6px",
  fontSize: "11px",
  fontWeight: "800",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#6f6659",
}

const statValueStyle = {
  fontSize: "30px",
  lineHeight: 1,
  fontWeight: "800",
  color: "#1a1814",
}

const introCardStyle = {
  marginBottom: "14px",
  padding: "18px",
  borderRadius: "24px",
  border: "1px solid rgba(26, 24, 20, 0.12)",
  background:
    "radial-gradient(circle at 84% 16%, rgba(217, 74, 31, 0.14), transparent 26%), linear-gradient(180deg, rgba(255,255,255,0.34), rgba(243,239,230,0.78))",
  boxShadow: "0 20px 38px rgba(26, 24, 20, 0.08)",
}

const introTitleStyle = {
  marginBottom: "6px",
  fontSize: "18px",
  fontWeight: "800",
  color: "#1a1814",
}

const introTextStyle = {
  margin: 0,
  fontSize: "14px",
  lineHeight: 1.6,
  color: "#6f6659",
}

const navGridStyle = (isMobile) => ({
  display: "grid",
  gap: "12px",
  gridTemplateColumns: isMobile ? "repeat(2, minmax(0, 1fr))" : "repeat(2, minmax(0, 1fr))",
})

const navCardStyle = {
  minHeight: "132px",
  padding: "18px",
  borderRadius: "22px",
  border: "1px solid rgba(26, 24, 20, 0.12)",
  background: "linear-gradient(180deg, rgba(255,255,255,0.34), rgba(243,239,230,0.76))",
  textAlign: "left",
  cursor: "pointer",
  boxShadow: "0 14px 28px rgba(26, 24, 20, 0.06)",
}

const navTitleStyle = {
  fontSize: "18px",
  fontWeight: "800",
  color: "#1a1814",
}

const navTextStyle = {
  fontSize: "14px",
  lineHeight: 1.5,
  color: "#6f6659",
}

const topRowStyle = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "10px",
}

const arrowStyle = {
  width: "32px",
  height: "32px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "999px",
  fontSize: "18px",
  fontWeight: "900",
  flexShrink: 0,
}

export default AdminHomePage
