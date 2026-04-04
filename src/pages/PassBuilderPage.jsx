function PassBuilderPage({
  activeWorkouts,
  selectedTemplateCode,
  setSelectedTemplateCode,
  newPassName,
  setNewPassName,
  handleCreatePass,
  isCreatingPass,
  renamePassName,
  setRenamePassName,
  handleRenamePass,
  exercisesFromDB,
  selectedExerciseId,
  setSelectedExerciseId,
  handleAddExerciseToPass,
  isSavingPassExercise,
  passExerciseDrafts,
  handlePassExerciseDraftChange,
  handleSavePassExercises,
  handleRemoveExerciseFromPass,
  handleMoveExerciseInPass,
  handleDeletePass,
  cardTitleStyle,
  secondaryButtonStyle,
  mutedTextStyle,
  inputStyle,
  buttonStyle,
  isMobile,
}) {
  const currentWorkout = activeWorkouts?.[selectedTemplateCode]
  const passKeys = Object.keys(activeWorkouts || {})

  return (
    <>
      <h3 style={cardTitleStyle}>Passhantering</h3>

      <p style={{ ...mutedTextStyle, marginBottom: "14px" }}>
        Bygg pass genom att skapa ett pass, lägga till övningar, ändra ordning och spara mål och guide per övning.
      </p>

      <div
        style={{
          display: "flex",
          gap: "8px",
          marginBottom: "14px",
          flexWrap: isMobile ? "nowrap" : "wrap",
          overflowX: isMobile ? "auto" : "visible",
          paddingBottom: isMobile ? "4px" : 0,
        }}
      >
        {passKeys.map((passKey) => (
          <button
            key={passKey}
            type="button"
            onClick={() => setSelectedTemplateCode(passKey)}
            style={{
              ...secondaryButtonStyle,
              flex: isMobile ? "0 0 auto" : undefined,
              whiteSpace: "nowrap",
              backgroundColor: selectedTemplateCode === passKey ? "#111827" : "#ffffff",
              color: selectedTemplateCode === passKey ? "#ffffff" : "#111827",
            }}
          >
            {activeWorkouts[passKey].label}
          </button>
        ))}
      </div>

      {passKeys.length === 0 && (
        <p style={{ ...mutedTextStyle, marginBottom: "14px" }}>
          Inga pass finns ännu. Skapa ditt första pass här nedanför.
        </p>
      )}

      <div
        style={{
          padding: "12px 14px",
          borderRadius: "10px",
          border: "1px solid #e5e7eb",
          backgroundColor: "#ffffff",
          marginBottom: "14px",
        }}
      >
        <div style={{ fontSize: "14px", fontWeight: "700", marginBottom: "8px" }}>
          Skapa nytt pass
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", flexDirection: isMobile ? "column" : "row" }}>
          <input
            type="text"
            placeholder="T.ex. Pass D eller Benpass"
            value={newPassName}
            onChange={(e) => setNewPassName(e.target.value)}
            style={{ ...inputStyle, minWidth: isMobile ? "100%" : "220px", width: isMobile ? "100%" : undefined }}
          />

          <button
            type="button"
            onClick={handleCreatePass}
            disabled={isCreatingPass}
            style={{
              ...buttonStyle,
              width: isMobile ? "100%" : "auto",
              opacity: isCreatingPass ? 0.7 : 1,
              cursor: isCreatingPass ? "default" : "pointer",
            }}
          >
            {isCreatingPass ? "Skapar..." : "Skapa pass"}
          </button>
        </div>
      </div>

      <div
        style={{
          padding: "12px 14px",
          borderRadius: "10px",
          border: "1px solid #e5e7eb",
          backgroundColor: "#ffffff",
          marginBottom: "14px",
        }}
      >
        <div style={{ fontSize: "14px", fontWeight: "700", marginBottom: "8px" }}>
          Byt namn på valt pass
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", flexDirection: isMobile ? "column" : "row" }}>
          <input
            type="text"
            placeholder="Nytt namn på pass"
            value={renamePassName}
            onChange={(e) => setRenamePassName(e.target.value)}
            style={{ ...inputStyle, minWidth: isMobile ? "100%" : "220px", width: isMobile ? "100%" : undefined }}
          />

          <button
            type="button"
            onClick={handleRenamePass}
            disabled={!selectedTemplateCode}
            style={{ ...buttonStyle, width: isMobile ? "100%" : "auto" }}
          >
            Spara namn
          </button>

          <button
            type="button"
            onClick={handleDeletePass}
            disabled={!selectedTemplateCode}
            style={{
              ...secondaryButtonStyle,
              width: isMobile ? "100%" : "auto",
              color: "#b91c1c",
              borderColor: "#fecaca",
            }}
          >
            Ta bort pass
          </button>
        </div>
      </div>

      {/* Lägg till övning */}
      <div
        style={{
          padding: "12px 14px",
          borderRadius: "10px",
          border: "1px solid #e5e7eb",
          backgroundColor: "#ffffff",
          marginBottom: "14px",
        }}
      >
        <div style={{ fontSize: "14px", fontWeight: "700", marginBottom: "8px" }}>
          Lägg till övning
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", flexDirection: isMobile ? "column" : "row" }}>
          <select
            value={selectedExerciseId}
            onChange={(e) => setSelectedExerciseId(e.target.value)}
            style={{ ...inputStyle, minWidth: isMobile ? "100%" : "200px", width: isMobile ? "100%" : undefined }}
          >
            <option value="">Välj övning</option>
            {(exercisesFromDB || []).map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleAddExerciseToPass}
            disabled={isSavingPassExercise}
            style={{
              ...buttonStyle,
              width: isMobile ? "100%" : "auto",
              opacity: isSavingPassExercise ? 0.7 : 1,
            }}
          >
            {isSavingPassExercise ? "Sparar..." : "Lägg till"}
          </button>
        </div>
      </div>

      {/* Lista övningar */}
      {currentWorkout ? (
        <div style={{ display: "grid", gap: "10px" }}>
          {(currentWorkout.exercises || []).map((exercise, index) => {
            return (
              <div
              key={`${exercise.name}-${index}`}
              style={{
                padding: "12px 14px",
                borderRadius: "10px",
                border: "1px solid #e5e7eb",
                backgroundColor: "#ffffff",
              }}
            >
              <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "4px" }}>
                Övning {index + 1}
              </div>
              <div style={{ fontSize: "15px", fontWeight: "700", marginBottom: "4px" }}>
                {exercise.name}
              </div>

              {(() => {
                const draft = {
                  guide: exercise.guide || "",
                  targetSets: exercise.targetSets ?? "",
                  targetReps: exercise.targetReps ?? "",
                  targetRepsMode: exercise.targetRepsMode || "fixed",
                  ...(passExerciseDrafts?.[exercise.id] || {}),
                }

                return (
                  <div style={{ display: "grid", gap: "10px" }}>
                    <textarea
                      rows={3}
                      placeholder="Guide eller instruktion för övningen"
                      value={draft.guide}
                      onChange={(e) => handlePassExerciseDraftChange(exercise.id, "guide", e.target.value)}
                      style={{
                        ...inputStyle,
                        width: "100%",
                        resize: "vertical",
                        minHeight: "84px",
                      }}
                    />

                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        flexWrap: "wrap",
                        alignItems: "center",
                        flexDirection: isMobile ? "column" : "row",
                      }}
                    >
                    <input
                      type="number"
                      placeholder="Set"
                      value={draft.targetSets}
                      onChange={(e) => handlePassExerciseDraftChange(exercise.id, "targetSets", e.target.value)}
                      style={{ ...inputStyle, width: isMobile ? "100%" : "90px" }}
                    />

                    <input
                      type="number"
                      placeholder="Reps"
                      value={draft.targetReps}
                      disabled={draft.targetRepsMode === "max"}
                      onChange={(e) => handlePassExerciseDraftChange(exercise.id, "targetReps", e.target.value)}
                      style={{
                        ...inputStyle,
                        width: isMobile ? "100%" : "90px",
                        opacity: draft.targetRepsMode === "max" ? 0.5 : 1,
                      }}
                    />

                    <button
                      type="button"
                      onClick={() =>
                        handlePassExerciseDraftChange(
                          exercise.id,
                          "targetRepsMode",
                          draft.targetRepsMode === "max" ? "fixed" : "max"
                        )
                      }
                      style={{
                        ...secondaryButtonStyle,
                        width: isMobile ? "100%" : "auto",
                        backgroundColor: draft.targetRepsMode === "max" ? "#111827" : "#ffffff",
                        color: draft.targetRepsMode === "max" ? "#ffffff" : "#111827",
                      }}
                    >
                      {draft.targetRepsMode === "max" ? "MAX" : "Fast"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveExerciseInPass && handleMoveExerciseInPass(exercise.id, "up")}
                      style={{ ...secondaryButtonStyle, width: isMobile ? "100%" : "auto" }}
                    >
                      ↑
                    </button>

                    <button
                      type="button"
                      onClick={() => handleMoveExerciseInPass && handleMoveExerciseInPass(exercise.id, "down")}
                      style={{ ...secondaryButtonStyle, width: isMobile ? "100%" : "auto" }}
                    >
                      ↓
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRemoveExerciseFromPass && handleRemoveExerciseFromPass(exercise.id)}
                      style={{
                        ...secondaryButtonStyle,
                        width: isMobile ? "100%" : "auto",
                        color: "#b91c1c",
                        borderColor: "#fecaca",
                      }}
                    >
                      Ta bort
                    </button>
                    </div>
                  </div>
                )
              })()}
            </div>
            )
          })}
        </div>
      ) : (
        <p style={mutedTextStyle}>Inget pass valt</p>
      )}

      <div style={{ marginTop: "14px" }}>
        <button
          type="button"
          onClick={handleSavePassExercises}
          style={{ ...buttonStyle, width: isMobile ? "100%" : "auto" }}
        >
          Spara ändringar
        </button>
      </div>
    </>
  )
}

export default PassBuilderPage
