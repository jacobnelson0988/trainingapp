import { useEffect, useState } from "react"

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
  resetPassEditorState,
  cardTitleStyle,
  secondaryButtonStyle,
  mutedTextStyle,
  inputStyle,
  buttonStyle,
  isMobile,
}) {
  const [view, setView] = useState("overview")
  const currentWorkout = activeWorkouts?.[selectedTemplateCode]
  const passKeys = Object.keys(activeWorkouts || {})
  const exerciseCount = currentWorkout?.exercises?.length || 0

  useEffect(() => {
    if (view === "edit" && !currentWorkout) {
      setView("overview")
    }
  }, [currentWorkout, view])

  const openCreateView = () => {
    setNewPassName("")
    setNewPassInfo("")
    setView("create")
  }

  const openEditView = () => {
    if (!selectedTemplateCode) return
    resetPassEditorState(selectedTemplateCode)
    setView("edit")
  }

  const goToOverview = () => {
    resetPassEditorState(selectedTemplateCode)
    setSelectedExerciseId("")
    setView("overview")
  }

  const handleCreateAndReturn = async () => {
    const didCreate = await handleCreatePass()

    if (didCreate) {
      setView("overview")
    }
  }

  const handleSaveAndReturn = async () => {
    const didSave = await handleSavePassExercises()

    if (didSave) {
      setView("overview")
    }
  }

  const handleDeleteAndReturn = async () => {
    const didDelete = await handleDeletePass()

    if (didDelete) {
      setView("overview")
    }
  }

  if (view === "create") {
    return (
      <>
        <div style={topBarStyle}>
          <button type="button" onClick={() => setView("overview")} style={secondaryButtonStyle}>
            ← Tillbaka
          </button>
        </div>

        <div style={panelStyle}>
          <div style={sectionEyebrowStyle}>Nytt pass</div>
          <h3 style={{ ...cardTitleStyle, marginBottom: "8px" }}>Skapa nytt pass</h3>
          <p style={{ ...mutedTextStyle, marginBottom: "16px" }}>
            Skapa först passet med namn och kort info. Du kan lägga till övningar efteråt.
          </p>

          <div style={formStackStyle}>
            <input
              type="text"
              placeholder="T.ex. Pass D eller Benpass"
              value={newPassName}
              onChange={(e) => setNewPassName(e.target.value)}
              style={{ ...inputStyle, width: "100%" }}
            />

            <textarea
              rows={4}
              placeholder="Kort info om passet som spelaren ser före start"
              value={newPassInfo}
              onChange={(e) => setNewPassInfo(e.target.value)}
              style={{ ...inputStyle, ...textareaStyle, width: "100%" }}
            />

            <button
              type="button"
              onClick={handleCreateAndReturn}
              disabled={isCreatingPass}
              style={{
                ...buttonStyle,
                width: isMobile ? "100%" : "auto",
                opacity: isCreatingPass ? 0.7 : 1,
              }}
            >
              {isCreatingPass ? "Skapar..." : "Skapa pass"}
            </button>
          </div>
        </div>
      </>
    )
  }

  if (view === "edit" && currentWorkout) {
    return (
      <>
        <div style={topBarStyle}>
          <button type="button" onClick={goToOverview} style={secondaryButtonStyle}>
            ← Tillbaka till pass
          </button>
        </div>

        <div style={pageStackStyle}>
          <section style={panelStyle}>
            <div style={editorHeaderStyle}>
              <div>
                <div style={sectionEyebrowStyle}>Redigera pass</div>
                <h3 style={{ ...cardTitleStyle, marginBottom: "6px" }}>{currentWorkout.label}</h3>
                <p style={mutedTextStyle}>
                  Ändra namn, info och övningsinnehåll. När du sparar går du tillbaka till startsidan för pass.
                </p>
              </div>

              <div style={editorActionsStyle}>
                <button
                  type="button"
                  onClick={handleDeleteAndReturn}
                  style={{
                    ...secondaryButtonStyle,
                    color: "#b91c1c",
                    borderColor: "#fecaca",
                    width: isMobile ? "100%" : "auto",
                  }}
                >
                  Ta bort pass
                </button>
                <button
                  type="button"
                  onClick={handleSaveAndReturn}
                  style={{ ...buttonStyle, width: isMobile ? "100%" : "auto" }}
                >
                  Spara pass
                </button>
              </div>
            </div>
          </section>

          <section style={panelStyle}>
            <div style={sectionEyebrowStyle}>Passinfo</div>
            <div style={formStackStyle}>
              <input
                type="text"
                placeholder="Namn på pass"
                value={renamePassName}
                onChange={(e) => setRenamePassName(e.target.value)}
                style={{ ...inputStyle, width: "100%" }}
              />

              <textarea
                rows={4}
                placeholder="Kort info om passet som spelaren ser före start"
                value={renamePassInfo}
                onChange={(e) => setRenamePassInfo(e.target.value)}
                style={{ ...inputStyle, ...textareaStyle, width: "100%" }}
              />
            </div>
          </section>

          <section style={panelStyle}>
            <div style={panelHeaderStyle}>
              <div>
                <div style={sectionEyebrowStyle}>Övningar</div>
                <div style={sectionTitleStyle}>Lägg till övning i passet</div>
              </div>
              <div style={summaryBadgeStyle}>{exerciseCount} övningar</div>
            </div>

            <div style={addExercisePanelStyle}>
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
                  width: isMobile ? "100%" : "auto",
                  opacity: isSavingPassExercise || !selectedTemplateCode ? 0.7 : 1,
                }}
              >
                {isSavingPassExercise ? "Lägger till..." : "Lägg till övning"}
              </button>
            </div>
          </section>

          <section style={panelStyle}>
            <div style={panelHeaderStyle}>
              <div>
                <div style={sectionEyebrowStyle}>Innehåll</div>
                <div style={sectionTitleStyle}>Redigera övningarna i passet</div>
              </div>
              <div style={summaryBadgeStyle}>{exerciseCount} övningar</div>
            </div>

            {exerciseCount === 0 ? (
              <div style={emptyStateStyle}>
                <div style={emptyStateTitleStyle}>Passet är tomt just nu</div>
                <div style={mutedTextStyle}>Lägg till den första övningen ovan för att komma igång.</div>
              </div>
            ) : (
              <div style={exerciseListStyle}>
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

                        <div style={exerciseButtonRowStyle}>
                          <button
                            type="button"
                            onClick={() => handleMoveExerciseInPass(exercise.id, "up")}
                            style={{ ...secondaryButtonStyle, width: isMobile ? "100%" : "auto" }}
                          >
                            Flytta upp
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveExerciseInPass(exercise.id, "down")}
                            style={{ ...secondaryButtonStyle, width: isMobile ? "100%" : "auto" }}
                          >
                            Flytta ner
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveExerciseFromPass(exercise.id)}
                            style={{
                              ...secondaryButtonStyle,
                              color: "#b91c1c",
                              borderColor: "#fecaca",
                              width: isMobile ? "100%" : "auto",
                            }}
                          >
                            Ta bort
                          </button>
                        </div>
                      </div>

                      <div style={hintBoxStyle}>
                        Lämna fältet tomt om passet inte behöver en egen instruktion för övningen.
                      </div>

                      {!draft.guide.trim() && exercise.suggestedGuide && (
                        <div style={suggestionBoxStyle}>
                          <div style={suggestionTextStyle}>
                            Tidigare instruktion i ditt lag: {exercise.suggestedGuide}
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              handlePassExerciseDraftChange(exercise.id, "guide", exercise.suggestedGuide)
                            }
                            style={{ ...secondaryButtonStyle, width: isMobile ? "100%" : "auto" }}
                          >
                            Använd förslag
                          </button>
                        </div>
                      )}

                      <div style={formStackStyle}>
                        <textarea
                          rows={3}
                          placeholder="Guide eller instruktion för övningen"
                          value={draft.guide}
                          onChange={(e) => handlePassExerciseDraftChange(exercise.id, "guide", e.target.value)}
                          style={{ ...inputStyle, ...textareaStyle, width: "100%", minHeight: "84px" }}
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
            )}
          </section>
        </div>
      </>
    )
  }

  return (
    <>
      <div style={overviewHeaderStyle}>
        <div>
          <h3 style={cardTitleStyle}>Passhantering</h3>
          <p style={{ ...mutedTextStyle, marginTop: "8px" }}>
            Välj ett pass för att öppna redigeringsläget, eller skapa ett nytt pass.
          </p>
        </div>

        <button type="button" onClick={openCreateView} style={{ ...buttonStyle, width: isMobile ? "100%" : "auto" }}>
          Skapa nytt pass
        </button>
      </div>

      <div style={pageStackStyle}>
        <section style={panelStyle}>
          <div style={panelHeaderStyle}>
            <div>
              <div style={sectionEyebrowStyle}>Dina pass</div>
              <div style={sectionTitleStyle}>Välj pass att redigera</div>
            </div>
            <div style={summaryBadgeStyle}>{passKeys.length} pass</div>
          </div>

          {passKeys.length === 0 ? (
            <p style={mutedTextStyle}>Inga pass finns ännu. Skapa ditt första pass.</p>
          ) : (
            <div style={{ ...passGridStyle, gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(180px, 1fr))" }}>
              {passKeys.map((passKey) => {
                const workout = activeWorkouts[passKey]
                const isSelected = selectedTemplateCode === passKey

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
                    <div style={passCardTitleStyle}>{workout.label}</div>
                    <div style={passCardMetaStyle}>{(workout.exercises || []).length} övningar</div>
                    <div
                      style={{
                        ...chipStyle,
                        backgroundColor: isSelected ? "#c62828" : "#f3f4f6",
                        color: isSelected ? "#ffffff" : "#4b5563",
                      }}
                    >
                      {isSelected ? "Valt pass" : "Markera pass"}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </section>

        {currentWorkout && (
          <section style={panelStyle}>
            <div style={panelHeaderStyle}>
              <div>
                <div style={sectionEyebrowStyle}>Valt pass</div>
                <div style={sectionTitleStyle}>{currentWorkout.label}</div>
              </div>
              <button type="button" onClick={openEditView} style={{ ...buttonStyle, width: isMobile ? "100%" : "auto" }}>
                Redigera pass
              </button>
            </div>

            <div style={selectedPassInfoStyle}>
              <div style={selectedPassMetricStyle}>
                <div style={selectedPassMetricLabelStyle}>Övningar</div>
                <div style={selectedPassMetricValueStyle}>{exerciseCount}</div>
              </div>

              {currentWorkout.info ? (
                <div style={selectedPassDescriptionStyle}>{currentWorkout.info}</div>
              ) : (
                <div style={selectedPassEmptyStyle}>Ingen passinfo tillagd ännu.</div>
              )}

              <div style={selectedPassExerciseListCardStyle}>
                <div style={selectedPassMetricLabelStyle}>Övningar i passet</div>

                {exerciseCount > 0 ? (
                  <div style={selectedPassExerciseListStyle}>
                    {(currentWorkout.exercises || []).map((exercise, index) => (
                      <div key={`${exercise.id || exercise.name}-${index}`} style={selectedPassExerciseItemStyle}>
                        <span style={selectedPassExerciseIndexStyle}>{index + 1}</span>
                        <span>{exercise.name}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={selectedPassEmptyStyle}>Inga övningar tillagda ännu.</div>
                )}
              </div>
            </div>
          </section>
        )}
      </div>
    </>
  )
}

const topBarStyle = {
  marginBottom: "12px",
}

const overviewHeaderStyle = {
  marginBottom: "16px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "12px",
  flexWrap: "wrap",
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
  flexWrap: "wrap",
}

const editorHeaderStyle = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "12px",
  flexWrap: "wrap",
}

const editorActionsStyle = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
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

const formStackStyle = {
  display: "grid",
  gap: "10px",
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

const passCardTitleStyle = {
  fontSize: "15px",
  fontWeight: "800",
  color: "#18202b",
  marginBottom: "6px",
}

const passCardMetaStyle = {
  fontSize: "13px",
  color: "#6b7280",
  marginBottom: "8px",
}

const chipStyle = {
  display: "inline-flex",
  padding: "5px 9px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: "800",
}

const selectedPassInfoStyle = {
  display: "grid",
  gap: "12px",
}

const selectedPassMetricStyle = {
  padding: "14px",
  borderRadius: "16px",
  backgroundColor: "#fff7f7",
  border: "1px solid #f0dada",
}

const selectedPassMetricLabelStyle = {
  marginBottom: "4px",
  fontSize: "12px",
  color: "#991b1b",
  fontWeight: "800",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
}

const selectedPassMetricValueStyle = {
  fontSize: "24px",
  fontWeight: "900",
  color: "#18202b",
}

const selectedPassDescriptionStyle = {
  fontSize: "14px",
  color: "#18202b",
  lineHeight: 1.6,
}

const selectedPassExerciseListCardStyle = {
  padding: "14px",
  borderRadius: "16px",
  border: "1px solid #f0e5e5",
  backgroundColor: "#fffdfd",
}

const selectedPassExerciseListStyle = {
  display: "grid",
  gap: "8px",
}

const selectedPassExerciseItemStyle = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  fontSize: "14px",
  color: "#18202b",
  fontWeight: "700",
}

const selectedPassExerciseIndexStyle = {
  width: "24px",
  height: "24px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "999px",
  backgroundColor: "#fff1f1",
  color: "#991b1b",
  fontSize: "12px",
  fontWeight: "800",
  flexShrink: 0,
}

const selectedPassEmptyStyle = {
  fontSize: "14px",
  color: "#9ca3af",
  fontStyle: "italic",
}

const addExercisePanelStyle = {
  display: "grid",
  gap: "10px",
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

const exerciseListStyle = {
  display: "grid",
  gap: "12px",
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

const exerciseButtonRowStyle = {
  display: "flex",
  gap: "8px",
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

const suggestionBoxStyle = {
  marginBottom: "12px",
  padding: "12px",
  borderRadius: "12px",
  border: "1px solid #ddd6fe",
  backgroundColor: "#f5f3ff",
  display: "grid",
  gap: "10px",
}

const suggestionTextStyle = {
  fontSize: "13px",
  color: "#4c1d95",
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
