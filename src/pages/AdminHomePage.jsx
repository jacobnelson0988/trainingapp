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
      variant: "ink",
    },
    {
      key: "teams",
      title: "Lag",
      text: "Hantera lag och tränare.",
      variant: "accent",
    },
    {
      key: "stats",
      title: "Statistik",
      text: "Se helhetsbilden.",
      variant: "paper",
    },
    {
      key: "exerciseBank",
      title: "Övningsbank",
      text: "Gemensamt innehåll för lag.",
      variant: "paperWarm",
    },
    {
      key: "messages",
      title: "Meddelanden",
      text: "Skriv i hela organisationen.",
      variant: "paper",
    },
    {
      key: "feedback",
      title: "Feedback",
      text: "Följ inkomna synpunkter.",
      variant: "paperWarm",
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
            style={navCardStyle(card.variant)}
          >
            <div style={navTitleStyle(card.variant)}>{card.title}</div>
            <div style={navTextStyle(card.variant)}>{card.text}</div>
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

const navCardStyle = (variant = "paper") => {
  const isInk = variant === "ink"
  const isAccent = variant === "accent"
  const isWarm = variant === "paperWarm"

  return {
    minHeight: "118px",
    padding: "18px",
    borderRadius: "22px",
    border: `1px solid ${
      isInk ? "rgba(26, 24, 20, 0.9)" : isAccent ? "rgba(217, 74, 31, 0.72)" : "rgba(26, 24, 20, 0.12)"
    }`,
    background: isInk
      ? "#1a1814"
      : isAccent
      ? "linear-gradient(135deg, #d94a1f 0%, #b93617 100%)"
      : isWarm
      ? "linear-gradient(180deg, rgba(255,244,236,0.92), rgba(245,233,221,0.88))"
      : "linear-gradient(180deg, rgba(255,255,255,0.5), rgba(243,239,230,0.84))",
    textAlign: "left",
    cursor: "pointer",
    boxShadow: isInk || isAccent ? "0 18px 34px rgba(26, 24, 20, 0.16)" : "0 14px 28px rgba(26, 24, 20, 0.06)",
    display: "grid",
    alignContent: "space-between",
    gap: "8px",
  }
}

const navTitleStyle = (variant = "paper") => ({
  fontSize: "18px",
  fontWeight: "800",
  color: variant === "ink" || variant === "accent" ? "#f3efe6" : "#1a1814",
  overflowWrap: "anywhere",
})

const navTextStyle = (variant = "paper") => ({
  fontSize: "14px",
  lineHeight: 1.5,
  color: variant === "ink" || variant === "accent" ? "rgba(243, 239, 230, 0.76)" : "#6f6659",
  overflowWrap: "anywhere",
})

export default AdminHomePage
