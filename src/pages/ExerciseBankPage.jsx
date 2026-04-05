import { useEffect, useState } from "react"

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
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false)
  const [expandedExerciseId, setExpandedExerciseId] = useState(null)

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

  const toggleMuscleGroup = (group) => {
    setNewExerciseMuscleGroups((prev) =>
      prev.includes(group)
        ? prev.filter((item) => item !== group)
        : [...prev, group]
    )
  }

  const closeForm = () => {
    resetExerciseForm()
    setNewExerciseGuide("")
    setIsCreateFormOpen(false)
    setExpandedExerciseId(null)
  }

  const allVisibleMuscleGroups = [
    "Alla",
    ...muscleGroupOptions.filter((group) =>
      exercisesFromDB.some((exercise) => (exercise.muscle_groups || []).includes(group))
    ),
  ]

  useEffect(() => {
    if (editingExerciseId) {
      setIsCreateFormOpen(false)
      setExpandedExerciseId(editingExerciseId)
    }
  }, [editingExerciseId])

  return (
    <>
      <h3 style={cardTitleStyle}>Övningsbank</h3>
      <p style={{ ...mutedTextStyle, marginBottom: "14px" }}>
        Välj en övning i listan för att öppna åtgärder. Formuläret visas bara när du skapar eller redigerar.
      </p>

      <div style={formCardStyle(isMobile)}>
        <div
          style={{
            ...sectionHeaderStyle,
            flexDirection: isMobile ? "column" : "row",
            alignItems: isMobile ? "stretch" : sectionHeaderStyle.alignItems,
          }}
        >
          <div>
            <div style={sectionEyebrowStyle}>Ny övning</div>
            <div style={sectionTitleStyle}>Skapa ny övning</div>
          </div>

          <div style={headerActionsStyle}>
            <button
              type="button"
              onClick={() => setIsCreateFormOpen((prev) => !prev)}
              style={{ ...buttonStyle, width: isMobile ? "100%" : "auto", minHeight: "46px" }}
            >
              {isCreateFormOpen ? "Stäng formulär" : "Lägg till ny övning"}
            </button>
            <div style={countBadgeStyle}>{exercisesFromDB.length} övningar</div>
          </div>
        </div>

        {isCreateFormOpen && (
          <>
            <input
              type="text"
              placeholder="Namn på övning"
              value={newExerciseName}
              onChange={(e) => setNewExerciseName(e.target.value)}
              style={{ ...inputStyle, width: "100%", marginBottom: "10px" }}
            />

            <div
              style={{
                display: "grid",
                gap: "10px",
                marginBottom: "10px",
                gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
              }}
            >
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
              <div style={fieldLabelStyle}>Muskelgrupper</div>
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

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={handleCreateExercise}
                style={{ ...buttonStyle, width: isMobile ? "100%" : "auto", minHeight: "48px" }}
              >
                {isSavingExercise ? "Sparar..." : editingExerciseId ? "Spara ändringar" : "Spara ny övning"}
              </button>

              <button
                type="button"
                onClick={closeForm}
                style={{ ...secondaryButtonStyle, width: isMobile ? "100%" : "auto", minHeight: "48px" }}
              >
                Avbryt
              </button>
            </div>
          </>
        )}
      </div>

      <input
        type="text"
        placeholder="Sök övning"
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
        style={{ ...inputStyle, width: "100%", marginBottom: "12px" }}
      />

      <div
        style={{
          display: "flex",
          flexWrap: isMobile ? "nowrap" : "wrap",
          overflowX: isMobile ? "auto" : "visible",
          gap: "8px",
          marginBottom: "14px",
          paddingBottom: isMobile ? "4px" : 0,
          WebkitOverflowScrolling: "touch",
        }}
      >
        {allVisibleMuscleGroups.map((group) => {
          const isSelected = selectedMuscleFilter === group

          return (
            <button
              key={group}
              type="button"
              onClick={() => setSelectedMuscleFilter(group)}
              style={{
                ...tagButtonStyle,
                flex: isMobile ? "0 0 auto" : undefined,
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
          const isExpanded = expandedExerciseId === exercise.id

          return (
            <button
              key={exercise.id}
              type="button"
              onClick={() =>
                setExpandedExerciseId((current) => (current === exercise.id ? null : exercise.id))
              }
              style={{
                position: "relative",
                width: "100%",
                padding: isMobile ? "14px" : "16px",
                borderRadius: isMobile ? "16px" : "18px",
                border: isEditing || isExpanded ? "2px solid #c62828" : "1px solid #ece5e5",
                backgroundColor: "#ffffff",
                boxShadow: "0 10px 24px rgba(24, 32, 43, 0.04)",
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <div style={expandIndicatorWrapStyle}>
                <div style={expandIndicatorStyle}>{isExpanded ? "−" : "+"}</div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start", flexDirection: isMobile ? "column" : "row" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ ...exerciseTitleRowStyle, paddingRight: "40px" }}>
                    <div style={{ fontSize: "16px", fontWeight: "800", color: "#18202b" }}>
                      {exercise.name}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "6px" }}>
                    <span style={pillStyle}>{exerciseTypeLabel(exercise.exercise_type)}</span>
                    <span style={pillStyle}>{exercise.default_reps_mode === "max" ? "Max reps" : "Fast reps"}</span>
                    {(exercise.muscle_groups || []).map((group) => (
                      <span key={group} style={musclePillStyle}>{group}</span>
                    ))}
                  </div>

                  {exercise.description && (
                    <div style={{ fontSize: "13px", color: "#374151", lineHeight: 1.6 }}>
                      {exercise.description}
                    </div>
                  )}
                </div>

                {isExpanded && (
                  <div style={{ display: "flex", gap: "8px", flexDirection: isMobile ? "column" : "row", width: isMobile ? "100%" : "auto" }}>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        handleStartEditExercise(exercise)
                      }}
                      style={{ ...secondaryButtonStyle, width: isMobile ? "100%" : "auto", minHeight: "46px" }}
                    >
                      Redigera
                    </button>

                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        handleDeleteExercise(exercise.id)
                      }}
                      style={{ ...secondaryButtonStyle, width: isMobile ? "100%" : "auto", minHeight: "46px" }}
                    >
                      Ta bort
                    </button>
                  </div>
                )}
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
                  onClick={(event) => event.stopPropagation()}
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

                  <div
                    style={{
                      display: "grid",
                      gap: "10px",
                      gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
                    }}
                  >
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
                    <div style={fieldLabelStyle}>Muskelgrupper</div>
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

                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={handleCreateExercise}
                      style={{ ...buttonStyle, width: isMobile ? "100%" : "auto", minHeight: "48px" }}
                    >
                      {isSavingExercise ? "Sparar..." : "Spara ändringar"}
                    </button>

                    <button
                      type="button"
                      onClick={closeForm}
                      style={{ ...secondaryButtonStyle, width: isMobile ? "100%" : "auto", minHeight: "48px" }}
                    >
                      Avbryt
                    </button>
                  </div>
                </div>
              )}
            </button>
          )
        })}
      </div>
    </>
  )
}

const formCardStyle = (isMobile) => ({
  marginBottom: "18px",
  padding: isMobile ? "14px" : "18px",
  borderRadius: isMobile ? "16px" : "18px",
  border: "1px solid #ece5e5",
  backgroundColor: "#ffffff",
  boxShadow: "0 10px 24px rgba(24, 32, 43, 0.04)",
})

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

const headerActionsStyle = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  justifyContent: "flex-end",
}

const fieldLabelStyle = {
  fontSize: "14px",
  fontWeight: "800",
  color: "#18202b",
  marginBottom: "8px",
}

const exerciseTitleRowStyle = {
  marginBottom: "4px",
}

const expandIndicatorWrapStyle = {
  position: "absolute",
  top: "14px",
  right: "14px",
}

const expandIndicatorStyle = {
  width: "28px",
  height: "28px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "999px",
  backgroundColor: "#fff1f1",
  color: "#991b1b",
  fontSize: "20px",
  fontWeight: "800",
  flexShrink: 0,
}

export default ExerciseBankPage
