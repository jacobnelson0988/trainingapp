function ExerciseBankPage({
  newExerciseName,
  setNewExerciseName,
  newExerciseType,
  setNewExerciseType,
  newExerciseDefaultRepsMode,
  setNewExerciseDefaultRepsMode,
  newExerciseGuide,
  setNewExerciseGuide,
  editingExerciseId,
  isSavingExercise,
  handleCreateExercise,
  handleStartEditExercise,
  handleDeleteExercise,
  resetExerciseForm,
  exercisesFromDB,
  inputStyle,
  buttonStyle,
  secondaryButtonStyle,
  mutedTextStyle,
  cardTitleStyle,
  isMobile,
}) {
  return (
    <>
      <h3 style={cardTitleStyle}>Övningsbank</h3>

      <div style={{ marginBottom: "16px" }}>
        <input
          type="text"
          placeholder="Namn på övning"
          value={newExerciseName}
          onChange={(e) => setNewExerciseName(e.target.value)}
          style={{ ...inputStyle, width: "100%", marginBottom: "10px" }}
        />

        <div style={{ display: "grid", gap: "10px", marginBottom: "10px" }}>
          <select
            value={newExerciseType}
            onChange={(e) => setNewExerciseType(e.target.value)}
            style={{ ...inputStyle, width: "100%" }}
          >
            <option value="weight_reps">Vikt + reps</option>
            <option value="reps_only">Bara reps</option>
            <option value="seconds_only">Sekunder</option>
          </select>

          <select
            value={newExerciseDefaultRepsMode}
            onChange={(e) => setNewExerciseDefaultRepsMode(e.target.value)}
            style={{ ...inputStyle, width: "100%" }}
          >
            <option value="fixed">Fast reps</option>
            <option value="max">Max</option>
          </select>
        </div>

        <input
          type="text"
          placeholder="Guide"
          value={newExerciseGuide}
          onChange={(e) => setNewExerciseGuide(e.target.value)}
          style={{ ...inputStyle, width: "100%", marginBottom: "10px" }}
        />

        <button onClick={handleCreateExercise} style={{ ...buttonStyle, width: isMobile ? "100%" : "auto" }}>
          {editingExerciseId ? "Uppdatera övning" : "Spara övning"}
        </button>
      </div>

      <div style={{ display: "grid", gap: "10px" }}>
        {exercisesFromDB.map((exercise) => (
          <div
            key={exercise.id}
            style={{
              padding: "14px",
              borderRadius: "14px",
              border: "1px solid #e8dddd",
              backgroundColor: "#ffffff",
            }}
          >
            <strong>{exercise.name}</strong>

            <div
              style={{
                display: "flex",
                gap: "8px",
                flexDirection: isMobile ? "column" : "row",
                marginTop: "10px",
              }}
            >
              <button
                onClick={() => handleStartEditExercise(exercise)}
                style={{ ...secondaryButtonStyle, width: isMobile ? "100%" : "auto" }}
              >
                Redigera
              </button>

              <button
                onClick={() => handleDeleteExercise(exercise.id)}
                style={{ ...secondaryButtonStyle, width: isMobile ? "100%" : "auto" }}
              >
                Ta bort
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

export default ExerciseBankPage
