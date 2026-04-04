function PassBuilderPage({
  activeWorkouts,
  selectedTemplateCode,
  setSelectedTemplateCode,
  newPassName,
  setNewPassName,
  newPassInfo,
  setNewPassInfo,
  handleCreatePass,
  isCreatingPass,
  renamePassName,
  setRenamePassName,
  renamePassInfo,
  setRenamePassInfo,
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
  const exerciseCount = currentWorkout?.exercises?.length || 0

  return (
    <>
      <h3 style={cardTitleStyle}>Passhantering</h3>

      <p style={{ ...mutedTextStyle, marginBottom: "16px" }}>
        Bygg pass i fyra steg: välj pass, justera passinfo, lägg till övningar och finjustera varje övning.
      </p>

      <div style={pageStackStyle}>
        <section style={panelStyle}>
          <div
            style={{
              ...panelHeaderStyle,
              flexDirection: isMobile ? "column" : "row",
              alignItems: isMobile ? "stretch" : panelHeaderStyle.alignItems,
            }}
          >
            <div>
              <div style={sectionEyebrowStyle}>Steg 1</div>
              <div style={sectionTitleStyle}>Välj pass att jobba med</div>
            </div>
            <div style={{ ...summaryBadgeStyle, alignSelf: isMobile ? "flex-start" : "auto" }}>{passKeys.length} pass</div>
          </div>

          {passKeys.length === 0 ? (
            <p style={mutedTextStyle}>Inga pass finns ännu. Skapa ditt första pass nedan.</p>
          ) : (
            <div style={{ ...passGridStyle, gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(180px, 1fr))" }}>
              {passKeys.map((passKey) => {
                const isSelected = selectedTemplateCode === passKey
                const workout = activeWorkouts[passKey]

                return (
                  <button
                    key={passKey}
                    type="button"
                    onClick={() => setSelectedTemplateCode(passKey)}
                    style={{
                      ...passCardButtonStyle,
                      border: isSelected ? "2px solid #c62828" : "1px solid #e5e7eb",
                      backgroundColor: isSelected ? "#fff7f7" : "#ffffff",
                    }}
                  >
                    <div style={{ fontSize: "15px", fontWeight: "800", color: "#18202b", marginBottom: "6px" }}>
                      {workout.label}
                    </div>
                    <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "8px" }}>
                      {(workout.exercises || []).length} övningar
                    </div>
                    <div
                      style={{
                        ...chipStyle,
                        backgroundColor: isSelected ? "#c62828" : "#f3f4f6",
                        color: isSelected ? "#ffffff" : "#4b5563",
                      }}
                    >
                      {isSelected ? "Valt pass" : "Tryck för att välja"}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </section>

        <div style={{ display: "grid", gap: "14px", gridTemplateColumns: isMobile ? "1fr" : "1.1fr 0.9fr" }}>
          <section style={panelStyle}>
            <div style={panelHeaderStyle}>
              <div>
                <div style={sectionEyebrowStyle}>Steg 2</div>
                <div style={sectionTitleStyle}>Skapa eller byt namn på pass</div>
              </div>
            </div>

            <div style={innerPanelStyle}>
              <div style={innerTitleStyle}>Nytt pass</div>
              <div style={mutedBlockStyle}>Skapa ett nytt pass som du sedan kan fylla med övningar.</div>
              <div style={{ display: "flex", gap: "8px", flexDirection: isMobile ? "column" : "row" }}>
                <input
                  type="text"
                  placeholder="T.ex. Pass D eller Benpass"
                  value={newPassName}
                  onChange={(e) => setNewPassName(e.target.value)}
                  style={{ ...inputStyle, width: "100%" }}
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
              <textarea
                rows={4}
                placeholder="Kort info om passet som spelaren ser före start"
                value={newPassInfo}
                onChange={(e) => setNewPassInfo(e.target.value)}
                style={{ ...inputStyle, ...textareaStyle, width: "100%", marginTop: "10px" }}
              />
            </div>

            <div style={{ ...innerPanelStyle, marginTop: "12px" }}>
              <div style={innerTitleStyle}>Valt pass</div>
              <div style={mutedBlockStyle}>
                {currentWorkout
                  ? `Du redigerar just nu ${currentWorkout.label}.`
                  : "Välj ett pass ovan för att kunna byta namn eller ta bort det."}
              </div>
              <div style={{ display: "flex", gap: "8px", flexDirection: isMobile ? "column" : "row" }}>
                <input
                  type="text"
                  placeholder="Nytt namn på pass"
                  value={renamePassName}
                  onChange={(e) => setRenamePassName(e.target.value)}
                  style={{ ...inputStyle, width: "100%" }}
                />
                <button
                  type="button"
                  onClick={handleRenamePass}
                  disabled={!selectedTemplateCode}
                  style={{ ...buttonStyle, width: isMobile ? "100%" : "auto" }}
                >
                  Spara passnamn
                </button>
              </div>
              <textarea
                rows={4}
                placeholder="Kort info om passet som spelaren ser före start"
                value={renamePassInfo}
                onChange={(e) => setRenamePassInfo(e.target.value)}
                style={{ ...inputStyle, ...textareaStyle, width: "100%", marginTop: "10px" }}
              />
              <button
                type="button"
                onClick={handleDeletePass}
                disabled={!selectedTemplateCode}
                style={{
                  ...secondaryButtonStyle,
                  width: isMobile ? "100%" : "auto",
                  color: "#b91c1c",
                  borderColor: "#fecaca",
                  marginTop: "10px",
                }}
              >
                Ta bort valt pass
              </button>
            </div>
          </section>

          <section style={panelStyle}>
            <div
              style={{
                ...panelHeaderStyle,
                flexDirection: isMobile ? "column" : "row",
                alignItems: isMobile ? "stretch" : panelHeaderStyle.alignItems,
              }}
            >
              <div>
                <div style={sectionEyebrowStyle}>Steg 3</div>
                <div style={sectionTitleStyle}>Lägg till övning i passet</div>
              </div>
              {currentWorkout && <div style={{ ...summaryBadgeStyle, alignSelf: isMobile ? "flex-start" : "auto" }}>{exerciseCount} övningar</div>}
            </div>

            <div style={innerPanelStyle}>
              <div style={mutedBlockStyle}>
                {currentWorkout
                  ? `Lägg till fler övningar i ${currentWorkout.label}.`
                  : "Välj ett pass först och lägg sedan till övningar."}
              </div>
              <div style={{ display: "grid", gap: "10px" }}>
                <select
                  value={selectedExerciseId}
                  onChange={(e) => setSelectedExerciseId(e.target.value)}
                  style={{ ...inputStyle, width: "100%" }}
                >
                  <option value="">Välj övning</option>
                  {(exercisesFromDB || []).map((exercise) => (
                    <option key={exercise.id} value={String(exercise.id)}>
                      {exercise.name}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleAddExerciseToPass}
                  disabled={isSavingPassExercise || !selectedTemplateCode}
                  style={{
                    ...buttonStyle,
                    width: "100%",
                    opacity: isSavingPassExercise || !selectedTemplateCode ? 0.7 : 1,
                  }}
                >
                  {isSavingPassExercise ? "Sparar..." : "Lägg till övning"}
                </button>
              </div>
            </div>
          </section>
        </div>

        <section style={panelStyle}>
          <div
            style={{
              ...panelHeaderStyle,
              flexDirection: isMobile ? "column" : "row",
              alignItems: isMobile ? "stretch" : panelHeaderStyle.alignItems,
            }}
          >
            <div>
              <div style={sectionEyebrowStyle}>Steg 4</div>
              <div style={sectionTitleStyle}>Redigera innehåll i valt pass</div>
            </div>
            {currentWorkout && <div style={{ ...summaryBadgeStyle, alignSelf: isMobile ? "flex-start" : "auto" }}>{exerciseCount} övningar</div>}
          </div>

          {!currentWorkout ? (
            <p style={mutedTextStyle}>Välj ett pass för att se och redigera innehållet.</p>
          ) : exerciseCount === 0 ? (
            <div style={emptyStateStyle}>
              <div style={emptyStateTitleStyle}>Passet är tomt just nu</div>
              <div style={mutedTextStyle}>Lägg till den första övningen ovan för att komma igång.</div>
            </div>
          ) : (
            <>
              <div style={workspaceSummaryStyle}>
                <div>
                  <div style={workspaceLabelStyle}>Nu redigerar du</div>
                  <div style={workspaceTitleStyle}>{currentWorkout.label}</div>
                </div>
                <button
                  type="button"
                  onClick={handleSavePassExercises}
                  style={{ ...buttonStyle, width: isMobile ? "100%" : "auto" }}
                >
                  Spara passändringar
                </button>
              </div>

              <div style={{ display: "grid", gap: "12px" }}>
                {(currentWorkout.exercises || []).map((exercise, index) => {
                  const draft = {
                    guide: exercise.guide || "",
                    targetSets: exercise.targetSets ?? "",
                    targetReps: exercise.targetReps ?? "",
                    targetRepsMode: exercise.targetRepsMode || "fixed",
                    ...(passExerciseDrafts?.[exercise.id] || {}),
                  }

                  return (
                    <div key={`${exercise.name}-${index}`} style={exerciseEditorCardStyle}>
                      <div style={exerciseEditorHeaderStyle}>
                        <div>
                          <div style={exerciseOrderStyle}>Övning {index + 1}</div>
                          <div style={exerciseNameStyle}>{exercise.name}</div>
                        </div>
                        <div style={{ display: "flex", gap: "8px", flexDirection: isMobile ? "column" : "row" }}>
                          <button
                            type="button"
                            onClick={() => handleMoveExerciseInPass && handleMoveExerciseInPass(exercise.id, "up")}
                            style={{ ...secondaryButtonStyle, width: isMobile ? "100%" : "auto" }}
                          >
                            Flytta upp
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveExerciseInPass && handleMoveExerciseInPass(exercise.id, "down")}
                            style={{ ...secondaryButtonStyle, width: isMobile ? "100%" : "auto" }}
                          >
                            Flytta ner
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

                      <div style={hintBoxStyle}>
                        Standardtexten kommer från övningsbanken. Ändra den här bara om passet ska ha en egen instruktion.
                      </div>

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

                        <div style={{ ...targetGridStyle, gridTemplateColumns: isMobile ? "1fr" : "92px 92px auto" }}>
                          <input
                            type="number"
                            placeholder="Set"
                            value={draft.targetSets}
                            onChange={(e) => handlePassExerciseDraftChange(exercise.id, "targetSets", e.target.value)}
                            style={{ ...inputStyle, width: "100%" }}
                          />

                          <input
                            type="number"
                            placeholder="Reps"
                            value={draft.targetReps}
                            disabled={draft.targetRepsMode === "max"}
                            onChange={(e) => handlePassExerciseDraftChange(exercise.id, "targetReps", e.target.value)}
                            style={{
                              ...inputStyle,
                              width: "100%",
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
                            {draft.targetRepsMode === "max" ? "MAX-läge" : "Fast reps"}
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </section>
      </div>
    </>
  )
}

const pageStackStyle = {
  display: "grid",
  gap: "14px",
}

const panelStyle = {
  padding: "18px",
  borderRadius: "18px",
  border: "1px solid #ece5e5",
  backgroundColor: "#ffffff",
  boxShadow: "0 10px 24px rgba(24, 32, 43, 0.04)",
}

const panelHeaderStyle = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "12px",
  marginBottom: "14px",
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

const summaryBadgeStyle = {
  display: "inline-flex",
  padding: "6px 10px",
  borderRadius: "999px",
  backgroundColor: "#fff4f4",
  color: "#991b1b",
  fontSize: "12px",
  fontWeight: "800",
}

const passGridStyle = {
  display: "grid",
  gap: "10px",
}

const passCardButtonStyle = {
  padding: "14px",
  borderRadius: "16px",
  backgroundColor: "#ffffff",
  textAlign: "left",
  cursor: "pointer",
}

const chipStyle = {
  display: "inline-flex",
  padding: "5px 9px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: "800",
}

const innerPanelStyle = {
  padding: "14px",
  borderRadius: "16px",
  border: "1px solid #f0e5e5",
  backgroundColor: "#fffdfd",
}

const innerTitleStyle = {
  marginBottom: "6px",
  fontSize: "15px",
  fontWeight: "800",
  color: "#18202b",
}

const mutedBlockStyle = {
  marginBottom: "10px",
  fontSize: "13px",
  color: "#6b7280",
  lineHeight: 1.6,
}

const emptyStateStyle = {
  padding: "18px",
  borderRadius: "16px",
  border: "1px dashed #e5caca",
  backgroundColor: "#fffdfd",
}

const emptyStateTitleStyle = {
  marginBottom: "6px",
  fontSize: "15px",
  fontWeight: "800",
  color: "#18202b",
}

const workspaceSummaryStyle = {
  marginBottom: "14px",
  padding: "14px 16px",
  borderRadius: "16px",
  border: "1px solid #f0dada",
  backgroundColor: "#fff7f7",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  flexWrap: "wrap",
}

const workspaceLabelStyle = {
  marginBottom: "4px",
  fontSize: "12px",
  fontWeight: "800",
  color: "#991b1b",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
}

const workspaceTitleStyle = {
  fontSize: "18px",
  fontWeight: "900",
  color: "#18202b",
}

const exerciseEditorCardStyle = {
  padding: "16px",
  borderRadius: "16px",
  border: "1px solid #e5e7eb",
  backgroundColor: "#ffffff",
}

const exerciseEditorHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "12px",
  marginBottom: "12px",
  flexWrap: "wrap",
}

const exerciseOrderStyle = {
  marginBottom: "4px",
  fontSize: "12px",
  color: "#6b7280",
  fontWeight: "700",
}

const exerciseNameStyle = {
  fontSize: "17px",
  fontWeight: "900",
  color: "#18202b",
}

const hintBoxStyle = {
  marginBottom: "12px",
  padding: "10px 12px",
  borderRadius: "12px",
  backgroundColor: "#f9fafb",
  color: "#6b7280",
  fontSize: "13px",
  lineHeight: 1.6,
}

const targetGridStyle = {
  display: "grid",
  gap: "8px",
  alignItems: "center",
}

const textareaStyle = {
  resize: "vertical",
  minHeight: "104px",
  fontFamily: "inherit",
}

export default PassBuilderPage
