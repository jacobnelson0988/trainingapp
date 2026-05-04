function AdminHomePage({
  setCoachView,
  organizationLabel,
  isMobile,
}) {
  const cards = [
    {
      key: "users",
      title: "Användare",
      text: "Roller, konton och lag.",
    },
    {
      key: "teams",
      title: "Lag",
      text: "Hantera lag och tränare.",
    },
    {
      key: "stats",
      title: "Statistik",
      text: "Se helhetsbilden.",
    },
    {
      key: "exerciseBank",
      title: "Övningsbank",
      text: "Gemensamt innehåll för lag.",
    },
    {
      key: "messages",
      title: "Meddelanden",
      text: "Skriv i hela organisationen.",
    },
    {
      key: "feedback",
      title: "Feedback",
      text: "Följ inkomna synpunkter.",
    },
  ]

  return (
    <>
      <div style={headerBlockStyle}>
        <div style={sectionLabelStyle}>Admin</div>
        <div style={headerTitleStyle}>{organizationLabel || "Administration"}</div>
      </div>

      <div style={navGridStyle(isMobile)}>
        {cards.map((card) => (
          <button
            key={card.key}
            type="button"
            onClick={() => setCoachView(card.key)}
            style={navCardStyle}
          >
            <div style={navTitleStyle}>{card.title}</div>
            <div style={navTextStyle}>{card.text}</div>
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

export default AdminHomePage
