function CoachHomePage({
  setCoachView,
  setSelectedPlayer,
  resetExerciseForm,
  coachName,
  teamName,
  activePlayerCount,
  passCount,
  activeSevenDayCount,
  isMobile,
}) {
  const cards = [
    {
      key: "players",
      title: "Spelare",
      text: "Hantera lag, mål och håll koll på senaste aktivitet.",
      accent: "#dc2626",
      background: "#fff1f1",
      onClick: () => {
        setCoachView("players")
        setSelectedPlayer(null)
      },
    },
    {
      key: "passBuilder",
      title: "Pass",
      text: "Skapa och redigera pass för laget.",
      accent: "#1d4ed8",
      background: "#eef4ff",
      onClick: () => {
        setCoachView("passBuilder")
        setSelectedPlayer(null)
        resetExerciseForm()
      },
    },
    {
      key: "exerciseBank",
      title: "Övningsbank",
      text: "Samla övningar, guider och media på ett ställe.",
      accent: "#b45309",
      background: "#fff7ed",
      onClick: () => {
        setCoachView("exerciseBank")
        setSelectedPlayer(null)
        resetExerciseForm()
      },
    },
    {
      key: "stats",
      title: "Statistik",
      text: "Följ progression och se vad spelarna gjort över tid.",
      accent: "#0f766e",
      background: "#ecfeff",
      onClick: () => {
        setCoachView("stats")
        setSelectedPlayer(null)
      },
    },
    {
      key: "messages",
      title: "Meddelanden",
      text: "Skriv till laget, andra tränare eller huvudadmin.",
      accent: "#7c2d12",
      background: "#fff7ed",
      onClick: () => {
        setCoachView("messages")
        setSelectedPlayer(null)
      },
    },
  ]

  return (
    <>
      <div style={heroCardStyle}>
        <div style={heroHeaderRowStyle}>
          <div>
            <div style={heroTitleStyle}>Hej, {coachName}!</div>
            <div style={heroSubStyle}>{teamName}</div>
          </div>
          <div style={avatarStyle}>{getInitials(coachName)}</div>
        </div>

        <div style={statsGridStyle(isMobile)}>
          <div style={statCardStyle}>
            <div style={statLabelStyle}>Aktiva spelare</div>
            <div style={{ ...statValueStyle, color: "#dc2626" }}>{activePlayerCount}</div>
          </div>
          <div style={statCardStyle}>
            <div style={statLabelStyle}>Pass</div>
            <div style={statValueStyle}>{passCount}</div>
          </div>
          <div style={statCardStyle}>
            <div style={statLabelStyle}>Aktiva 7 d</div>
            <div style={statValueStyle}>{activeSevenDayCount}</div>
          </div>
        </div>

        <p style={introTextStyle}>Välj vad du vill hantera.</p>
      </div>

      <div style={sectionLabelStyle}>Snabbval</div>

      <div style={navGridStyle(isMobile)}>
        {cards.map((card) => (
          <button key={card.key} type="button" onClick={card.onClick} style={navCardStyle}>
            <div style={coachNavTopRowStyle}>
              <div style={navTitleStyle}>{card.title}</div>
              <div style={{ ...coachNavArrowStyle, color: card.accent, backgroundColor: card.background }}>→</div>
            </div>
            <div style={navTextStyle}>{card.text}</div>
          </button>
        ))}
      </div>
    </>
  )
}

const getInitials = (name) =>
  String(name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "TR"

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
  backgroundColor: "#fff1f1",
  border: "1px solid rgba(220, 38, 38, 0.15)",
  color: "#dc2626",
  fontSize: "13px",
  fontWeight: "900",
  flexShrink: 0,
}

const statsGridStyle = (isMobile) => ({
  display: "grid",
  gap: "10px",
  gridTemplateColumns: isMobile ? "repeat(3, minmax(0, 1fr))" : "repeat(3, minmax(0, 1fr))",
  marginBottom: "14px",
})

const statCardStyle = {
  padding: "14px 12px",
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
  fontSize: "28px",
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
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
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

const coachNavTopRowStyle = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "10px",
}

const coachNavArrowStyle = {
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

export default CoachHomePage
