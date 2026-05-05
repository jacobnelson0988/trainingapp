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
      tone: 5,
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
      tone: 4,
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
      tone: 3,
      onClick: () => {
        setCoachView("calendar")
        setSelectedPlayer(null)
      },
    },
    {
      key: "exerciseBank",
      title: "Övningsbank",
      text: "Övningar, guider och media.",
      tone: 2,
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
      tone: 1,
      onClick: () => {
        setCoachView("stats")
        setSelectedPlayer(null)
      },
    },
    {
      key: "messages",
      title: "Meddelanden",
      text: "Skriv till lag och tränare.",
      tone: 0,
      onClick: () => {
        setCoachView("messages")
        setSelectedPlayer(null)
      },
    },
  ]

  return (
    <>
      <div style={headerBlockStyle}>
        <div style={headerEyebrowStyle}>Start</div>
        <div style={headerTitleStyle}>{teamName || "Översikt"}</div>
      </div>

      <div style={navGridStyle(isMobile)}>
        {cards.map((card) => (
          <button key={card.key} type="button" onClick={card.onClick} style={navCardStyle(card.tone)}>
            <div style={coachNavTopRowStyle}>
              <div style={navTitleStyle(card.tone)}>{card.title}</div>
              {card.badge ? <div style={navBadgeStyle}>{card.badge}</div> : null}
            </div>
            <div style={navTextStyle(card.tone)}>{card.text}</div>
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

const headerEyebrowStyle = {
  fontFamily: '"IBM Plex Mono", "SFMono-Regular", Consolas, monospace',
  fontSize: "11px",
  fontWeight: 700,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "#6f6659",
}

const headerTitleStyle = {
  marginTop: "8px",
  fontFamily: '"Manrope", sans-serif',
  fontSize: "clamp(38px, 10vw, 60px)",
  lineHeight: 0.92,
  fontWeight: "700",
  letterSpacing: "-0.04em",
  color: "#1a1814",
  overflowWrap: "anywhere",
}

const navGridStyle = (isMobile) => ({
  display: "grid",
  gap: "12px",
  gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
})

const navCardStyle = (tone = 0) => {
  return {
    minHeight: "118px",
    padding: "18px",
    borderRadius: "22px",
    border: `2px solid ${navBorderByTone[tone] || navBorderByTone[0]}`,
    background: "linear-gradient(180deg, rgba(255,255,255,0.72), rgba(243,239,230,0.9))",
    textAlign: "left",
    cursor: "pointer",
    boxShadow:
      tone >= 4
        ? "0 18px 34px rgba(217, 74, 31, 0.1)"
        : "0 14px 28px rgba(26, 24, 20, 0.06)",
    display: "grid",
    alignContent: "space-between",
    gap: "8px",
  }
}

const navTitleStyle = (tone = 0) => ({
  fontSize: "18px",
  fontWeight: "800",
  color: "#1a1814",
  overflowWrap: "anywhere",
})

const navTextStyle = (tone = 0) => ({
  fontSize: "14px",
  lineHeight: 1.5,
  color: tone >= 3 ? "#4b3327" : "#6f6659",
  overflowWrap: "anywhere",
})

const navBorderByTone = {
  5: "rgba(159, 47, 22, 0.82)",
  4: "rgba(198, 74, 29, 0.68)",
  3: "rgba(223, 121, 67, 0.52)",
  2: "rgba(222, 157, 116, 0.42)",
  1: "rgba(222, 157, 116, 0.3)",
  0: "rgba(222, 157, 116, 0.22)",
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
