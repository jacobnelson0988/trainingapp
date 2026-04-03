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

        <button onClick={handleCreateExercise} style={buttonStyle}>
          {editingExerciseId ? "Uppdatera övning" : "Spara övning"}
        </button>
      </div>

      <div>
        {exercisesFromDB.map((exercise) => (
          <div key={exercise.id} style={{ marginBottom: 10 }}>
            <strong>{exercise.name}</strong>

            <div>
              <button onClick={() => handleStartEditExercise(exercise)} style={secondaryButtonStyle}>
                Redigera
              </button>

              <button onClick={() => handleDeleteExercise(exercise.id)} style={secondaryButtonStyle}>
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