import { useState } from "react"

const muscleGroupOptions = [
  "Helkropp",
  "Ben",
  "Baksida lår",
  "Säte",
  "Bröst",
  "Rygg",
  "Axlar",
  "Biceps",
  "Triceps",
  "Bål",
  "Explosivitet",
  "Grepp",
  "Kondition",
  "Rörlighet",
]

function ExerciseBankPage({
  newExerciseName,
  setNewExerciseName,
  newExerciseType,
  setNewExerciseType,
  newExerciseDefaultRepsMode,
  setNewExerciseDefaultRepsMode,
  newExerciseGuide,
  setNewExerciseGuide,
  newExerciseDescription,
  setNewExerciseDescription,
  newExerciseMediaUrl,
  setNewExerciseMediaUrl,
  newExerciseMuscleGroups,
  setNewExerciseMuscleGroups,
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
  const [selectedMuscleFilter, setSelectedMuscleFilter] = useState("Alla")

  const filteredExercises = exercisesFromDB.filter((exercise) => {
    const exerciseMuscleGroups = Array.isArray(exercise.muscle_groups) ? exercise.muscle_groups : []
    const haystack = `${exercise.name} ${exercise.exercise_type} ${exerciseMuscleGroups.join(" ")}`.toLowerCase()
    const matchesSearch = haystack.includes(searchValue.trim().toLowerCase())
    const matchesFilter =
      selectedMuscleFilter === "Alla" || exerciseMuscleGroups.includes(selectedMuscleFilter)

    return matchesSearch && matchesFilter
  })

  const exerciseTypeLabel = (type) => {
    if (type === "weight_reps") return "Vikt + reps"
    if (type === "seconds_only") return "Sekunder"
    return "Bara reps"
  }

  const isVideoUrl = (url) => {
    return /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url || "")
  }

  const toggleMuscleGroup = (group) => {
    setNewExerciseMuscleGroups((prev) =>
      prev.includes(group)
        ? prev.filter((item) => item !== group)
        : [...prev, group]
    )
  }

  const allVisibleMuscleGroups = [
    "Alla",
    ...muscleGroupOptions.filter((group) =>
      exercisesFromDB.some((exercise) => (exercise.muscle_groups || []).includes(group))
    ),
  ]

  return (
    <>
      <h3 style={cardTitleStyle}>Övningsbank</h3>
      <p style={{ ...mutedTextStyle, marginBottom: "14px" }}>
        Sök snabbt bland övningar och redigera direkt under den övning du valt.
      </p>

      <div
        style={{
          marginBottom: "18px",
          padding: "18px",
          borderRadius: "18px",
          border: "1px solid #ece5e5",
          backgroundColor: "#ffffff",
          boxShadow: "0 10px 24px rgba(24, 32, 43, 0.04)",
        }}
      >
        <div style={sectionHeaderStyle}>
          <div>
            <div style={sectionEyebrowStyle}>{editingExerciseId ? "Redigering" : "Ny övning"}</div>
            <div style={sectionTitleStyle}>
              {editingExerciseId ? "Justera vald övning" : "Lägg till ny övning"}
            </div>
          </div>
          <div style={countBadgeStyle}>{exercisesFromDB.length} övningar</div>
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

        <textarea
          rows={3}
          placeholder="Kort beskrivning av övningen"
          value={newExerciseDescription}
          onChange={(e) => setNewExerciseDescription(e.target.value)}
          style={{ ...inputStyle, width: "100%", marginBottom: "10px", resize: "vertical", minHeight: "84px" }}
        />

        <input
          type="url"
          placeholder="Länk till video eller gif"
          value={newExerciseMediaUrl}
          onChange={(e) => setNewExerciseMediaUrl(e.target.value)}
          style={{ ...inputStyle, width: "100%", marginBottom: "10px" }}
        />

        <div style={{ marginBottom: "12px" }}>
          <div style={{ fontSize: "14px", fontWeight: "800", color: "#18202b", marginBottom: "8px" }}>
            Muskelgrupper
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {muscleGroupOptions.map((group) => {
              const isSelected = newExerciseMuscleGroups.includes(group)

              return (
                <button
                  key={group}
                  type="button"
                  onClick={() => toggleMuscleGroup(group)}
                  style={{
                    ...tagButtonStyle,
                    backgroundColor: isSelected ? "#c62828" : "#ffffff",
                    color: isSelected ? "#ffffff" : "#991b1b",
                    border: isSelected ? "1px solid #c62828" : "1px solid #efc7c7",
                  }}
                >
                  {group}
                </button>
              )
            })}
          </div>
        </div>

        <button onClick={handleCreateExercise} style={{ ...buttonStyle, width: isMobile ? "100%" : "auto" }}>
          {isSavingExercise ? "Sparar..." : "Spara ny övning"}
        </button>
      </div>

      <input
        type="text"
        placeholder="Sök övning"
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
        style={{ ...inputStyle, width: "100%", marginBottom: "12px" }}
      />

      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "14px" }}>
        {allVisibleMuscleGroups.map((group) => {
          const isSelected = selectedMuscleFilter === group

          return (
            <button
              key={group}
              type="button"
              onClick={() => setSelectedMuscleFilter(group)}
              style={{
                ...tagButtonStyle,
                backgroundColor: isSelected ? "#18202b" : "#ffffff",
                color: isSelected ? "#ffffff" : "#374151",
                border: isSelected ? "1px solid #18202b" : "1px solid #d9dee7",
              }}
            >
              {group}
            </button>
          )
        })}
      </div>

      <div style={{ display: "grid", gap: "10px" }}>
        {filteredExercises.map((exercise) => {
          const isEditing = editingExerciseId === exercise.id

          return (
            <div
              key={exercise.id}
              style={{
                padding: "16px",
                borderRadius: "18px",
                border: isEditing ? "2px solid #c62828" : "1px solid #ece5e5",
                backgroundColor: "#ffffff",
                boxShadow: "0 10px 24px rgba(24, 32, 43, 0.04)",
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
                    {(exercise.muscle_groups || []).map((group) => (
                      <span key={group} style={musclePillStyle}>{group}</span>
                    ))}
                  </div>
                  {exercise.description && (
                    <div style={{ fontSize: "13px", color: "#374151", lineHeight: 1.6, marginBottom: "8px" }}>
                      {exercise.description}
                    </div>
                  )}
                  <div style={{ fontSize: "13px", color: "#6b7280", lineHeight: 1.5 }}>
                    {exercise.guide || "Ingen guide ännu"}
                  </div>
                  {exercise.media_url && (
                    <div style={{ marginTop: "10px" }}>
                      {isVideoUrl(exercise.media_url) ? (
                        <video
                          src={exercise.media_url}
                          controls
                          playsInline
                          style={mediaPreviewStyle}
                        />
                      ) : (
                        <img
                          src={exercise.media_url}
                          alt={`${exercise.name} demo`}
                          style={mediaPreviewStyle}
                        />
                      )}
                    </div>
                  )}
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

                  <textarea
                    rows={3}
                    placeholder="Kort beskrivning av övningen"
                    value={newExerciseDescription}
                    onChange={(e) => setNewExerciseDescription(e.target.value)}
                    style={{ ...inputStyle, width: "100%", resize: "vertical", minHeight: "84px" }}
                  />

                  <input
                    type="url"
                    placeholder="Länk till video eller gif"
                    value={newExerciseMediaUrl}
                    onChange={(e) => setNewExerciseMediaUrl(e.target.value)}
                    style={{ ...inputStyle, width: "100%" }}
                  />

                  <div>
                    <div style={{ fontSize: "14px", fontWeight: "800", color: "#18202b", marginBottom: "8px" }}>
                      Muskelgrupper
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      {muscleGroupOptions.map((group) => {
                        const isSelected = newExerciseMuscleGroups.includes(group)

                        return (
                          <button
                            key={group}
                            type="button"
                            onClick={() => toggleMuscleGroup(group)}
                            style={{
                              ...tagButtonStyle,
                              backgroundColor: isSelected ? "#c62828" : "#ffffff",
                              color: isSelected ? "#ffffff" : "#991b1b",
                              border: isSelected ? "1px solid #c62828" : "1px solid #efc7c7",
                            }}
                          >
                            {group}
                          </button>
                        )
                      })}
                    </div>
                  </div>

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

const musclePillStyle = {
  display: "inline-flex",
  padding: "4px 8px",
  borderRadius: "999px",
  backgroundColor: "#eef2ff",
  color: "#3730a3",
  fontSize: "12px",
  fontWeight: "700",
}

const tagButtonStyle = {
  padding: "8px 10px",
  borderRadius: "999px",
  backgroundColor: "#ffffff",
  fontSize: "13px",
  fontWeight: "700",
  cursor: "pointer",
}

const sectionHeaderStyle = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "12px",
  marginBottom: "12px",
}

const sectionEyebrowStyle = {
  marginBottom: "6px",
  fontSize: "11px",
  fontWeight: "800",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#991b1b",
}

const sectionTitleStyle = {
  fontSize: "18px",
  fontWeight: "900",
  color: "#18202b",
}

const countBadgeStyle = {
  display: "inline-flex",
  padding: "6px 10px",
  borderRadius: "999px",
  backgroundColor: "#fff4f4",
  color: "#991b1b",
  fontSize: "12px",
  fontWeight: "800",
}

const mediaPreviewStyle = {
  display: "block",
  width: "100%",
  maxWidth: "360px",
  borderRadius: "12px",
  border: "1px solid #e5e7eb",
  backgroundColor: "#111827",
}

export default ExerciseBankPage
