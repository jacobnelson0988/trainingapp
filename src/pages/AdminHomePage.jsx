function AdminHomePage({
  setCoachView,
  mutedTextStyle,
  coachNavCardStyle,
  coachNavTitleStyle,
  coachNavTextStyle,
  isMobile,
}) {
  const cards = [
    { key: "users", title: "Alla användare", text: "Se roller och vilka lag användarna tillhör" },
    { key: "teams", title: "Lag", text: "Skapa nya lag och se lagens sammansättning" },
    { key: "createPlayer", title: "Ny användare", text: "Lägg till tränare eller spelare i valfritt lag" },
    { key: "exerciseBank", title: "Övningsbank", text: "Hantera övningar för hela föreningen" },
  ]

  return (
    <>
      <p style={{ ...mutedTextStyle, marginBottom: "16px" }}>
        Huvudadmin ser hela organisationen och kan skapa lag, tränare och spelare.
      </p>

      <div style={{ display: "grid", gap: "12px", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))" }}>
        {cards.map((card) => (
          <button
            key={card.key}
            type="button"
            onClick={() => setCoachView(card.key)}
            style={{
              ...coachNavCardStyle,
              minHeight: isMobile ? "132px" : coachNavCardStyle.minHeight,
            }}
          >
            <div style={topRowStyle}>
              <div style={coachNavTitleStyle}>{card.title}</div>
              <div style={arrowStyle}>→</div>
            </div>
            <div style={coachNavTextStyle}>{card.text}</div>
          </button>
        ))}
      </div>
    </>
  )
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
  backgroundColor: "#fff1f1",
  color: "#991b1b",
  fontSize: "18px",
  fontWeight: "900",
  flexShrink: 0,
}

export default AdminHomePage
