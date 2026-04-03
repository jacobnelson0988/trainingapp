function CoachHomePage({
  setCoachView,
  setSelectedPlayer,
  resetExerciseForm,
  mutedTextStyle,
  cardTitleStyle,
  coachNavCardStyle,
  coachNavTitleStyle,
  coachNavTextStyle,
}) {
  return (
    <>
    
      <p style={{ ...mutedTextStyle, marginBottom: "16px" }}>
        Välj vad du vill hantera.
      </p>

      <div style={{ display: "grid", gap: "12px" }}>
        <button
          type="button"
          onClick={() => setCoachView("createPlayer")}
          style={coachNavCardStyle}
        >
          <div style={coachNavTitleStyle}>Lägg till ny spelare</div>
          <div style={coachNavTextStyle}>Skapa konto för en ny spelare</div>
        </button>

        <button
          type="button"
          onClick={() => {
            setCoachView("players")
            setSelectedPlayer(null)
          }}
          style={coachNavCardStyle}
        >
          <div style={coachNavTitleStyle}>Mina spelare</div>
          <div style={coachNavTextStyle}>Visa spelare, statistik och individuella mål</div>
        </button>

        <button
          type="button"
          onClick={() => {
            setCoachView("exerciseBank")
            setSelectedPlayer(null)
            resetExerciseForm()
          }}
          style={coachNavCardStyle}
        >
          <div style={coachNavTitleStyle}>Övningsbank</div>
          <div style={coachNavTextStyle}>Skapa, redigera och arkivera övningar</div>
        </button>
      </div>
    </>
  )
}

export default CoachHomePage