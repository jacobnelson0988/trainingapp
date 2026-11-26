const uiSurface = "var(--ghf-surface)"
const uiBorder = "var(--ghf-line)"
const uiShadowSm = "var(--ghf-shadow-sm)"
const uiShadowMd = "var(--ghf-shadow-md)"

function CoachHomePage({
  onNavigate,
  coachName,
  teamName,
  activePlayerCount,
  passCount,
  activeSevenDayCount,
  openTargetChangeRequestCount,
  renderNavIcon,
}) {
  const cards = [
    {
      key: "players",
      icon: "players",
      title: "Spelare",
      text: "Hantera lag, mål och håll koll på senaste aktivitet.",
      accent: "#dc2626",
      background: "#fff1f1",
      badge: openTargetChangeRequestCount > 0 ? String(openTargetChangeRequestCount) : "",
    },
    {
      key: "passBuilder",
      icon: "training",
      title: "Pass",
      text: "Skapa och redigera pass för laget.",
      accent: "#1d4ed8",
      background: "#eef4ff",
    },
    {
      key: "calendar",
      icon: "calendar",
      title: "Kalender",
      text: "Planera veckan med pass, aktiviteter och återkommande serier.",
      accent: "#0f766e",
      background: "#ecfeff",
    },
    {
      key: "exerciseBank",
      icon: "training",
      title: "Övningsbank",
      text: "Samla övningar, guider och media på ett ställe.",
      accent: "#b45309",
      background: "#fff7ed",
    },
    {
      key: "stats",
      icon: "stats",
      title: "Statistik",
      text: "Följ progression och se vad spelarna gjort över tid.",
      accent: "#0f766e",
      background: "#ecfeff",
    },
    {
      key: "messages",
      icon: "messages",
      title: "Meddelanden",
      text: "Skriv till laget, andra tränare eller huvudadmin.",
      accent: "#7c2d12",
      background: "#fff7ed",
    },
  ]

  return (
    <>
      <div style={heroCardStyle}>
        <div style={heroHeaderRowStyle}>
          <div>
            <h1 style={heroTitleStyle}>Hej, {coachName}!</h1>
            <div style={heroSubStyle}>{teamName}</div>
          </div>
          <div style={avatarStyle}>{getInitials(coachName)}</div>
        </div>

        <div style={statsGridStyle}>
          <div style={statCardStyle}>
            <div style={statLabelStyle}>Aktiva spelare</div>
            <div style={{ ...statValueStyle, color: "#c9fb54" }}>{activePlayerCount}</div>
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

      </div>

      <div style={sectionLabelStyle}>Snabbval</div>

      <div className="coach-home__shortcuts">
        {cards.map((card) => (
          <button key={card.key} type="button" onClick={() => onNavigate(card.key)} style={navCardStyle}>
            <div style={coachNavTopRowStyle}>
              <div style={navTitleStyle}>{card.title}</div>
              <div style={coachNavMetaRowStyle}>
                {card.badge ? <div style={navBadgeStyle}>{card.badge}</div> : null}
                <span aria-hidden="true" style={{ ...coachNavIconStyle, color: card.accent, backgroundColor: card.background }}>
                  {renderNavIcon(card.icon)}
                </span>
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
  padding: "20px",
  borderRadius: "24px",
  border: `1px solid ${uiBorder}`,
  background: "linear-gradient(130deg, #132739, #21475e)",
  boxShadow: uiShadowMd,
}

const heroHeaderRowStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  marginBottom: "16px",
}

const heroTitleStyle = {
  margin: 0,
  fontSize: "clamp(1.5rem, 4vw, 2.25rem)",
  fontWeight: "900",
  color: "#f3f8fc",
}

const heroSubStyle = {
  marginTop: "4px",
  fontSize: "14px",
  color: "#c5d8e7",
}

const avatarStyle = {
  width: "42px",
  height: "42px",
  borderRadius: "14px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "#294c62",
  border: "1px solid #53758c",
  color: "#bfeaff",
  fontSize: "13px",
  fontWeight: "900",
  flexShrink: 0,
}

const statsGridStyle = {
  display: "grid",
  gap: "8px",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
}

const statCardStyle = {
  padding: "14px 12px",
  borderRadius: "18px",
  border: "1px solid #527189",
  backgroundColor: "#29465d",
}

const statLabelStyle = {
  marginBottom: "6px",
  fontSize: "11px",
  fontWeight: "800",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#cfdeeb",
}

const statValueStyle = {
  fontSize: "28px",
  lineHeight: 1,
  fontWeight: "900",
  color: "#f3f8fc",
}

const sectionLabelStyle = {
  marginBottom: "10px",
  fontSize: "12px",
  fontWeight: "800",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#6b7280",
}

const navCardStyle = {
  minHeight: "132px",
  padding: "16px",
  borderRadius: "18px",
  border: `1px solid ${uiBorder}`,
  background: uiSurface,
  textAlign: "left",
  cursor: "pointer",
  boxShadow: uiShadowSm,
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

const coachNavIconStyle = {
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
