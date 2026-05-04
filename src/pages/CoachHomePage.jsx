const uiSurface = "var(--ghf-surface)"
const uiBorder = "var(--ghf-line)"
const uiShadowSm = "var(--ghf-shadow-sm)"
const uiShadowMd = "var(--ghf-shadow-md)"

function CoachHomePage({
  setCoachView,
  setSelectedPlayer,
  resetExerciseForm,
  coachName,
  teamName,
  activePlayerCount,
  passCount,
  activeSevenDayCount,
  openTargetChangeRequestCount,
  isMobile,
  uiVariant,
}) {
  const cards = [
    {
      key: "players",
      title: "Spelare",
      text: "Hantera lag, mål och håll koll på senaste aktivitet.",
      accent: "#dc2626",
      background: "#fff1f1",
      badge: openTargetChangeRequestCount > 0 ? String(openTargetChangeRequestCount) : "",
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
      key: "calendar",
      title: "Kalender",
      text: "Planera veckan med pass, aktiviteter och återkommande serier.",
      accent: "#0f766e",
      background: "#ecfeff",
      onClick: () => {
        setCoachView("calendar")
        setSelectedPlayer(null)
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
              <div style={coachNavMetaRowStyle}>
                {card.badge ? <div style={navBadgeStyle}>{card.badge}</div> : null}
                <div style={{ ...coachNavArrowStyle, color: card.accent, backgroundColor: card.background }}>→</div>
              </div>
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

const getInitials = (name) =>
  String(name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "TR"

const heroCardStyle = {
  marginBottom: "18px",
  padding: "22px",
  borderRadius: "28px",
  border: "1px solid rgba(26, 24, 20, 0.12)",
  background:
    "radial-gradient(circle at 84% 16%, rgba(217, 74, 31, 0.14), transparent 26%), linear-gradient(180deg, rgba(255,255,255,0.34), rgba(243,239,230,0.78))",
  boxShadow: "0 20px 38px rgba(26, 24, 20, 0.08)",
}

const heroHeaderRowStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  marginBottom: "16px",
}

const heroTitleStyle = {
  fontSize: "clamp(30px, 8vw, 40px)",
  lineHeight: 0.94,
  fontWeight: "700",
  letterSpacing: "-0.04em",
  color: "#1a1814",
}

const heroSubStyle = {
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

const statsGridStyle = (isMobile) => ({
  display: "grid",
  gap: "10px",
  gridTemplateColumns: isMobile ? "repeat(3, minmax(0, 1fr))" : "repeat(3, minmax(0, 1fr))",
  marginBottom: "14px",
})

const statCardStyle = {
  padding: "14px 12px",
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
  fontSize: "28px",
  lineHeight: 1,
  fontWeight: "800",
  color: "#1a1814",
}

const introTextStyle = {
  margin: 0,
  fontSize: "14px",
  lineHeight: 1.6,
  color: "#6f6659",
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

const navGridStyle = (isMobile) => ({
  display: "grid",
  gap: "12px",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
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

const coachNavTopRowStyle = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "10px",
}

const coachNavMetaRowStyle = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
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
}

const navAlertTextStyle = {
  marginTop: "10px",
  fontSize: "12px",
  fontWeight: "700",
  color: "#b91c1c",
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
