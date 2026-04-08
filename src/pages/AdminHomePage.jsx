function AdminHomePage({
  setCoachView,
  totalUsers,
  totalTeams,
  organizationLabel,
  isMobile,
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
      <div style={heroCardStyle}>
        <div style={heroHeaderRowStyle}>
          <div>
            <div style={heroTitleStyle}>Admin</div>
            <div style={heroSubStyle}>{organizationLabel}</div>
          </div>
          <div style={avatarStyle}>AD</div>
        </div>

        <div style={statsGridStyle(isMobile, 2)}>
          <div style={statCardStyle}>
            <div style={statLabelStyle}>Användare</div>
            <div style={{ ...statValueStyle, color: "#7c3aed" }}>{totalUsers}</div>
          </div>
          <div style={statCardStyle}>
            <div style={statLabelStyle}>Lag</div>
            <div style={statValueStyle}>{totalTeams}</div>
          </div>
        </div>

        <p style={introTextStyle}>
          Här får du snabb överblick och kan gå vidare till rätt del direkt.
        </p>
      </div>

      <div style={sectionLabelStyle}>Snabbval</div>

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

const heroCardStyle = {
  marginBottom: "18px",
  padding: "20px",
  borderRadius: "24px",
  border: "1px solid rgba(15, 23, 42, 0.08)",
  background: "linear-gradient(180deg, #ffffff 0%, #fbf7f7 100%)",
  boxShadow: "0 18px 40px rgba(15, 23, 42, 0.06)",
}

const heroHeaderRowStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  marginBottom: "16px",
}

const heroTitleStyle = {
  fontSize: "24px",
  fontWeight: "900",
  color: "#111827",
}

const heroSubStyle = {
  marginTop: "4px",
  fontSize: "14px",
  color: "#6b7280",
}

const avatarStyle = {
  width: "42px",
  height: "42px",
  borderRadius: "14px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "#f5f0ff",
  border: "1px solid rgba(124, 58, 237, 0.15)",
  color: "#7c3aed",
  fontSize: "13px",
  fontWeight: "900",
  flexShrink: 0,
}

const statsGridStyle = (isMobile, count) => ({
  display: "grid",
  gap: "10px",
  gridTemplateColumns: `repeat(${Math.max(1, count)}, minmax(0, 1fr))`,
  marginBottom: "14px",
})

const statCardStyle = {
  padding: "14px 16px",
  borderRadius: "18px",
  border: "1px solid rgba(15, 23, 42, 0.08)",
  backgroundColor: "#ffffff",
}

const statLabelStyle = {
  marginBottom: "6px",
  fontSize: "11px",
  fontWeight: "800",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#6b7280",
}

const statValueStyle = {
  fontSize: "30px",
  lineHeight: 1,
  fontWeight: "900",
  color: "#111827",
}

const introTextStyle = {
  margin: 0,
  fontSize: "14px",
  lineHeight: 1.6,
  color: "#6b7280",
}

const sectionLabelStyle = {
  marginBottom: "10px",
  fontSize: "12px",
  fontWeight: "800",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#6b7280",
}

const navGridStyle = (isMobile) => ({
  display: "grid",
  gap: "12px",
  gridTemplateColumns: isMobile ? "repeat(2, minmax(0, 1fr))" : "repeat(2, minmax(0, 1fr))",
})

const navCardStyle = {
  minHeight: "132px",
  padding: "16px",
  borderRadius: "18px",
  border: "1px solid rgba(15, 23, 42, 0.08)",
  background: "#ffffff",
  textAlign: "left",
  cursor: "pointer",
  boxShadow: "0 12px 28px rgba(15, 23, 42, 0.05)",
}

const navTitleStyle = {
  fontSize: "16px",
  fontWeight: "900",
  color: "#111827",
}

const navTextStyle = {
  fontSize: "13px",
  lineHeight: 1.5,
  color: "#6b7280",
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
