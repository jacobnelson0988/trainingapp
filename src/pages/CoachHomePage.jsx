function CoachHomePage({
  setCoachView,
  setSelectedPlayer,
  resetExerciseForm,
  teamName,
  openTargetChangeRequestCount,
  isMobile,
}) {
  const cards = [
    {
      key: "players",
      title: "Spelare",
      text: "Hantera lag och mål.",
      badge: openTargetChangeRequestCount > 0 ? String(openTargetChangeRequestCount) : "",
      onClick: () => {
        setCoachView("players")
        setSelectedPlayer(null)
      },
    },
    {
      key: "passBuilder",
      title: "Pass",
      text: "Skapa och redigera pass.",
      onClick: () => {
        setCoachView("passBuilder")
        setSelectedPlayer(null)
        resetExerciseForm()
      },
    },
    {
      key: "calendar",
      title: "Kalender",
      text: "Planera veckan.",
      onClick: () => {
        setCoachView("calendar")
        setSelectedPlayer(null)
      },
    },
    {
      key: "exerciseBank",
      title: "Övningsbank",
      text: "Övningar, guider och media.",
      onClick: () => {
        setCoachView("exerciseBank")
        setSelectedPlayer(null)
        resetExerciseForm()
      },
    },
    {
      key: "stats",
      title: "Statistik",
      text: "Följ progression över tid.",
      onClick: () => {
        setCoachView("stats")
        setSelectedPlayer(null)
      },
    },
    {
      key: "messages",
      title: "Meddelanden",
      text: "Skriv till lag och tränare.",
      onClick: () => {
        setCoachView("messages")
        setSelectedPlayer(null)
      },
    },
  ]

  return (
    <>
      <div style={headerBlockStyle}>
        <div style={sectionLabelStyle}>Tränare</div>
        <div style={headerTitleStyle}>{teamName || "Översikt"}</div>
      </div>

      <div style={navGridStyle(isMobile)}>
        {cards.map((card) => (
          <button key={card.key} type="button" onClick={card.onClick} style={navCardStyle}>
            <div style={coachNavTopRowStyle}>
              <div style={navTitleStyle}>{card.title}</div>
              {card.badge ? <div style={navBadgeStyle}>{card.badge}</div> : null}
            </div>
            <div style={navTextStyle}>{card.text}</div>
            {card.key === "players" && openTargetChangeRequestCount > 0 ? (
              <div style={navAlertTextStyle}>
                {openTargetChangeRequestCount} öppen{openTargetChangeRequestCount === 1 ? "" : "a"} målrequest
              </div>
            ) : null}
          </button>
        ))}
      </div>
    </>
  )
}

const headerBlockStyle = {
  marginBottom: "14px",
  padding: "4px 4px 2px",
}

const sectionLabelStyle = {
  marginBottom: "10px",
  fontFamily: '"IBM Plex Mono", "SFMono-Regular", Consolas, monospace',
  fontSize: "10px",
  fontWeight: "700",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "#6f6659",
}

const headerTitleStyle = {
  fontSize: "clamp(34px, 8vw, 48px)",
  lineHeight: 0.94,
  fontWeight: "700",
  letterSpacing: "-0.05em",
  color: "#1a1814",
  overflowWrap: "anywhere",
}

const navGridStyle = (isMobile) => ({
  display: "grid",
  gap: "12px",
  gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
})

const navCardStyle = {
  minHeight: "118px",
  padding: "18px",
  borderRadius: "22px",
  border: "1px solid rgba(26, 24, 20, 0.12)",
  background: "linear-gradient(180deg, rgba(255,255,255,0.34), rgba(243,239,230,0.76))",
  textAlign: "left",
  cursor: "pointer",
  boxShadow: "0 14px 28px rgba(26, 24, 20, 0.06)",
  display: "grid",
  alignContent: "space-between",
  gap: "8px",
}

const navTitleStyle = {
  fontSize: "18px",
  fontWeight: "800",
  color: "#1a1814",
  overflowWrap: "anywhere",
}

const navTextStyle = {
  fontSize: "14px",
  lineHeight: 1.5,
  color: "#6f6659",
  overflowWrap: "anywhere",
}

const coachNavTopRowStyle = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "10px",
}

const navBadgeStyle = {
  minWidth: "24px",
  height: "24px",
  padding: "0 7px",
  borderRadius: "999px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "#dc2626",
  color: "#ffffff",
  fontSize: "12px",
  fontWeight: "800",
  flexShrink: 0,
}

const navAlertTextStyle = {
  marginTop: "2px",
  fontSize: "12px",
  fontWeight: "700",
  color: "#9a3412",
  overflowWrap: "anywhere",
}

export default CoachHomePage
