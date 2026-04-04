import { useState } from "react"

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
  const [searchValue, setSearchValue] = useState("")

  const filteredExercises = exercisesFromDB.filter((exercise) => {
    const haystack = `${exercise.name} ${exercise.exercise_type}`.toLowerCase()
    return haystack.includes(searchValue.trim().toLowerCase())
  })

  const exerciseTypeLabel = (type) => {
    if (type === "weight_reps") return "Vikt + reps"
    if (type === "seconds_only") return "Sekunder"
    return "Bara reps"
  }

  return (
    <>
      <h3 style={cardTitleStyle}>Övningsbank</h3>
      <p style={{ ...mutedTextStyle, marginBottom: "14px" }}>
        Sök snabbt bland övningar och redigera direkt under den övning du valt.
      </p>

      <div
        style={{
          marginBottom: "18px",
          padding: "16px",
          borderRadius: "16px",
          border: "1px solid #e8dddd",
          backgroundColor: "#fffdfd",
        }}
      >
        <div style={{ fontSize: "15px", fontWeight: "800", marginBottom: "10px", color: "#18202b" }}>
          Lägg till ny övning
        </div>

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
          {isSavingExercise ? "Sparar..." : "Spara ny övning"}
        </button>
      </div>

      <input
        type="text"
        placeholder="Sök övning"
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
        style={{ ...inputStyle, width: "100%", marginBottom: "14px" }}
      />

      <div style={{ display: "grid", gap: "10px" }}>
        {filteredExercises.map((exercise) => {
          const isEditing = editingExerciseId === exercise.id

          return (
            <div
              key={exercise.id}
              style={{
                padding: "14px",
                borderRadius: "16px",
                border: isEditing ? "2px solid #c62828" : "1px solid #e8dddd",
                backgroundColor: "#ffffff",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start", flexDirection: isMobile ? "column" : "row" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "16px", fontWeight: "800", color: "#18202b", marginBottom: "4px" }}>
                    {exercise.name}
                  </div>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "6px" }}>
                    <span style={pillStyle}>{exerciseTypeLabel(exercise.exercise_type)}</span>
                    <span style={pillStyle}>{exercise.default_reps_mode === "max" ? "Max reps" : "Fast reps"}</span>
                  </div>
                  <div style={{ fontSize: "13px", color: "#6b7280", lineHeight: 1.5 }}>
                    {exercise.guide || "Ingen guide ännu"}
                  </div>
                </div>

                <div style={{ display: "flex", gap: "8px", flexDirection: isMobile ? "column" : "row", width: isMobile ? "100%" : "auto" }}>
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

              {isEditing && (
                <div
                  style={{
                    marginTop: "14px",
                    paddingTop: "14px",
                    borderTop: "1px solid #eee2e2",
                    display: "grid",
                    gap: "10px",
                  }}
                >
                  <div style={{ fontSize: "14px", fontWeight: "800", color: "#991b1b" }}>
                    Redigera övning
                  </div>

                  <input
                    type="text"
                    placeholder="Namn på övning"
                    value={newExerciseName}
                    onChange={(e) => setNewExerciseName(e.target.value)}
                    style={{ ...inputStyle, width: "100%" }}
                  />

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

                  <input
                    type="text"
                    placeholder="Guide"
                    value={newExerciseGuide}
                    onChange={(e) => setNewExerciseGuide(e.target.value)}
                    style={{ ...inputStyle, width: "100%" }}
                  />

                  <div style={{ display: "flex", gap: "8px", flexDirection: isMobile ? "column" : "row" }}>
                    <button
                      onClick={handleCreateExercise}
                      style={{ ...buttonStyle, width: isMobile ? "100%" : "auto" }}
                    >
                      {isSavingExercise ? "Sparar..." : "Spara ändring"}
                    </button>
                    <button
                      onClick={resetExerciseForm}
                      style={{ ...secondaryButtonStyle, width: isMobile ? "100%" : "auto" }}
                    >
                      Avbryt
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}

const pillStyle = {
  display: "inline-flex",
  padding: "4px 8px",
  borderRadius: "999px",
  backgroundColor: "#fff4f4",
  color: "#991b1b",
  fontSize: "12px",
  fontWeight: "700",
}

export default ExerciseBankPage
