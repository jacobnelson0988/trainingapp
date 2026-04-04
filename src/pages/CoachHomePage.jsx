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
            <div style={coachNavTitleStyle}>Lägg till ny spelare</div>
            <div style={coachNavArrowStyle}>→</div>
          </div>
          <div style={coachNavTextStyle}>Skapa konto för en ny spelare</div>
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
          <div style={coachNavTextStyle}>Skapa, redigera och arkivera övningar</div>
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
          <div style={coachNavTextStyle}>Visa och bygg innehållet i Pass A, B och C</div>
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
