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
      tone: 5,
    },
    {
      key: "teams",
      title: "Lag",
      text: "Hantera lag och tränare.",
      tone: 4,
    },
    {
      key: "stats",
      title: "Statistik",
      text: "Se helhetsbilden.",
      tone: 3,
    },
    {
      key: "exerciseBank",
      title: "Övningsbank",
      text: "Gemensamt innehåll för lag.",
      tone: 2,
    },
    {
      key: "messages",
      title: "Meddelanden",
      text: "Skriv i hela organisationen.",
      tone: 1,
    },
    {
      key: "feedback",
      title: "Feedback",
      text: "Följ inkomna synpunkter.",
      tone: 0,
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
            style={navCardStyle(card.tone)}
          >
            <div style={navTitleStyle(card.tone)}>{card.title}</div>
            <div style={navTextStyle(card.tone)}>{card.text}</div>
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

const navCardStyle = (tone = 0) => {
  return {
    minHeight: "118px",
    padding: "18px",
    borderRadius: "22px",
    border: `1px solid ${navBorderByTone[tone] || navBorderByTone[0]}`,
    background: navBackgroundByTone[tone] || navBackgroundByTone[0],
    textAlign: "left",
    cursor: "pointer",
    boxShadow: tone >= 4 ? "0 18px 34px rgba(26, 24, 20, 0.16)" : "0 14px 28px rgba(26, 24, 20, 0.06)",
    display: "grid",
    alignContent: "space-between",
    gap: "8px",
  }
}

const navTitleStyle = (tone = 0) => ({
  fontSize: "18px",
  fontWeight: "800",
  color: tone >= 4 ? "#f3efe6" : "#1a1814",
  overflowWrap: "anywhere",
})

const navTextStyle = (tone = 0) => ({
  fontSize: "14px",
  lineHeight: 1.5,
  color: tone >= 4 ? "rgba(243, 239, 230, 0.76)" : tone >= 2 ? "#5f5448" : "#6f6659",
  overflowWrap: "anywhere",
})

const navBackgroundByTone = {
  5: "linear-gradient(180deg, #d94a1f 0%, #9f2f16 100%)",
  4: "linear-gradient(180deg, #ea6d35 0%, #c64a1d 100%)",
  3: "linear-gradient(180deg, rgba(244, 149, 101, 0.96), rgba(233, 123, 69, 0.9))",
  2: "linear-gradient(180deg, rgba(251, 200, 171, 0.96), rgba(244, 176, 139, 0.92))",
  1: "linear-gradient(180deg, rgba(255, 230, 214, 0.98), rgba(249, 210, 186, 0.94))",
  0: "linear-gradient(180deg, rgba(255, 245, 238, 0.98), rgba(250, 233, 221, 0.94))",
}

const navBorderByTone = {
  5: "rgba(159, 47, 22, 0.9)",
  4: "rgba(198, 74, 29, 0.72)",
  3: "rgba(223, 121, 67, 0.42)",
  2: "rgba(222, 157, 116, 0.28)",
  1: "rgba(222, 157, 116, 0.18)",
  0: "rgba(26, 24, 20, 0.12)",
}

export default AdminHomePage
