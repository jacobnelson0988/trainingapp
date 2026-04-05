function CoachHomePage({
  setCoachView,
  setSelectedPlayer,
  resetExerciseForm,
  mutedTextStyle,
  coachNavCardStyle,
  coachNavTitleStyle,
  coachNavTextStyle,
  isMobile,
}) {
  return (
    <>
    
      <p style={{ ...mutedTextStyle, marginBottom: "16px" }}>
        Välj vad du vill hantera.
      </p>

      <div style={{ display: "grid", gap: "12px", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))" }}>
        <button
          type="button"
          onClick={() => setCoachView("createPlayer")}
          style={{
            ...coachNavCardStyle,
            minHeight: isMobile ? "132px" : coachNavCardStyle.minHeight,
          }}
        >
          <div style={coachNavTopRowStyle}>
            <div style={coachNavTitleStyle}>Lägg till användare</div>
            <div style={coachNavArrowStyle}>→</div>
          </div>
          <div style={coachNavTextStyle}>Skapa spelare och tränare i ditt lag</div>
        </button>

        <button
          type="button"
          onClick={() => {
            setCoachView("players")
            setSelectedPlayer(null)
          }}
          style={{
            ...coachNavCardStyle,
            minHeight: isMobile ? "132px" : coachNavCardStyle.minHeight,
          }}
        >
          <div style={coachNavTopRowStyle}>
            <div style={coachNavTitleStyle}>Mina spelare</div>
            <div style={coachNavArrowStyle}>→</div>
          </div>
          <div style={coachNavTextStyle}>Visa spelare, statistik och individuella mål</div>
        </button>

        <button
          type="button"
          onClick={() => {
            setCoachView("exerciseBank")
            setSelectedPlayer(null)
            resetExerciseForm()
          }}
          style={{
            ...coachNavCardStyle,
            minHeight: isMobile ? "132px" : coachNavCardStyle.minHeight,
          }}
        >
          <div style={coachNavTopRowStyle}>
            <div style={coachNavTitleStyle}>Övningsbank</div>
            <div style={coachNavArrowStyle}>→</div>
          </div>
          <div style={coachNavTextStyle}>Visa övningar som kan användas i lagets pass</div>
        </button>
        <button
          type="button"
          onClick={() => {
            setCoachView("passBuilder")
            setSelectedPlayer(null)
            resetExerciseForm()
          }}
          style={{
            ...coachNavCardStyle,
            minHeight: isMobile ? "132px" : coachNavCardStyle.minHeight,
          }}
        >
          <div style={coachNavTopRowStyle}>
            <div style={coachNavTitleStyle}>Passhantering</div>
            <div style={coachNavArrowStyle}>→</div>
          </div>
          <div style={coachNavTextStyle}>Skapa och redigera pass för ditt eget lag</div>
        </button>

        <button
          type="button"
          onClick={() => {
            setCoachView("messages")
            setSelectedPlayer(null)
          }}
          style={{
            ...coachNavCardStyle,
            minHeight: isMobile ? "132px" : coachNavCardStyle.minHeight,
          }}
        >
          <div style={coachNavTopRowStyle}>
            <div style={coachNavTitleStyle}>Meddelanden</div>
            <div style={coachNavArrowStyle}>→</div>
          </div>
          <div style={coachNavTextStyle}>Skriv till laget, andra tränare eller huvudadmin</div>
        </button>
      </div>
    </>
  )
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
  backgroundColor: "#fff1f1",
  color: "#991b1b",
  fontSize: "18px",
  fontWeight: "900",
  flexShrink: 0,
}

export default CoachHomePage
