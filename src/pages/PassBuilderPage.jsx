import { useEffect, useMemo, useState } from "react"

const exerciseNavigationCategoryOrder = [
  "Axlar",
  "Ben",
  "Biceps",
  "Bröst",
  "Kondition",
  "Mage",
  "Rygg",
  "Triceps",
  "Armar",
  "Lats",
  "Säte",
  "Baksida lår",
  "Balans",
  "Rotation",
  "Rörlighet",
  "Helkropp",
  "Övrigt",
]

const normalizeExerciseSearchValue = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[åä]/g, "a")
    .replace(/ö/g, "o")
    .replace(/[\s\-_]+/g, "")
    .replace(/[^a-z0-9]/g, "")

const normalizeExerciseNavigationCategory = (value) => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")

  const lookup = {
    axlar: "Axlar",
    ben: "Ben",
    biceps: "Biceps",
    brost: "Bröst",
    kondition: "Kondition",
    mage: "Mage",
    bal: "Mage",
    rygg: "Rygg",
    triceps: "Triceps",
    armar: "Armar",
    lats: "Lats",
    sate: "Säte",
    baksidalar: "Baksida lår",
    baksida_lar: "Baksida lår",
    balans: "Balans",
    rotation: "Rotation",
    rorlighet: "Rörlighet",
    helkropp: "Helkropp",
    ovrigt: "Övrigt",
  }

  const compact = normalized.replace(/[^a-z0-9]+/g, "")
  return lookup[compact] || ""
}

const getExerciseNavigationCategory = (exercise) => {
  const explicitCategory = normalizeExerciseNavigationCategory(exercise?.navigation_category)
  if (explicitCategory) return explicitCategory

  const muscleGroups = Array.isArray(exercise?.muscle_groups) ? exercise.muscle_groups : []
  const firstGroup = muscleGroups[0]

  if (firstGroup === "Bål") return "Mage"
  if (firstGroup) return normalizeExerciseNavigationCategory(firstGroup) || firstGroup
  if (muscleGroups.includes("Kondition") || exercise?.exercise_type === "seconds_only") return "Kondition"
  return "Övrigt"
}

const buildRunningWorkoutSummary = (workoutKind, runningType, runningConfig) => {
  if (workoutKind !== "running") return ""

  if (runningType === "intervals") {
    const count = runningConfig?.intervals_count ? `${runningConfig.intervals_count} intervaller` : null
    const time = runningConfig?.interval_time ? `${runningConfig.interval_time}/intervall` : null
    return [count, time].filter(Boolean).join(" • ") || "Intervaller"
  }

  const distance =
    runningConfig?.running_distance != null && runningConfig?.running_distance !== ""
      ? `${runningConfig.running_distance} km`
      : null
  const time = runningConfig?.running_time || null
  return [distance, time].filter(Boolean).join(" • ") || "Distans"
}

function PassBuilderPage({
  activeWorkouts,
  selectedTemplateCode,
  setSelectedTemplateCode,
  newPassName,
  setNewPassName,
  newPassInfo,
  setNewPassInfo,
  newPassWarmupCardio,
  setNewPassWarmupCardio,
  newPassWarmupTechnique,
  setNewPassWarmupTechnique,
  newPassWorkoutKind,
  setNewPassWorkoutKind,
  newPassRunningType,
  setNewPassRunningType,
  newPassRunningIntervalTime,
  setNewPassRunningIntervalTime,
  newPassRunningIntervalsCount,
  setNewPassRunningIntervalsCount,
  newPassRunningDistance,
  setNewPassRunningDistance,
  newPassRunningTime,
  setNewPassRunningTime,
  newWarmupTemplateName,
  setNewWarmupTemplateName,
  handleCreatePass,
  isCreatingPass,
  renamePassName,
  setRenamePassName,
  renamePassInfo,
  setRenamePassInfo,
  renamePassWarmupCardio,
  setRenamePassWarmupCardio,
  renamePassWarmupTechnique,
  setRenamePassWarmupTechnique,
  renamePassWorkoutKind,
  setRenamePassWorkoutKind,
  renamePassRunningType,
  setRenamePassRunningType,
  renamePassRunningIntervalTime,
  setRenamePassRunningIntervalTime,
  renamePassRunningIntervalsCount,
  setRenamePassRunningIntervalsCount,
  renamePassRunningDistance,
  setRenamePassRunningDistance,
  renamePassRunningTime,
  setRenamePassRunningTime,
  renameWarmupTemplateName,
  setRenameWarmupTemplateName,
  warmupTemplates,
  isSavingWarmupTemplate,
  applyWarmupTemplateToCreate,
  applyWarmupTemplateToEdit,
  saveCreateWarmupTemplate,
  saveEditWarmupTemplate,
  exercisesFromDB,
  selectedExerciseId,
  setSelectedExerciseId,
  handleAddExerciseToPass,
  handleAddAlternativeExerciseToPassExercise,
  handleRemoveAlternativeExerciseFromPassExercise,
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
  const [activeEditSection, setActiveEditSection] = useState("content")
  const [expandedExerciseId, setExpandedExerciseId] = useState(null)
  const [exerciseSearchValue, setExerciseSearchValue] = useState("")
  const [selectedExerciseCategory, setSelectedExerciseCategory] = useState("alla")
  const [selectedAlternativeExerciseByRow, setSelectedAlternativeExerciseByRow] = useState({})
  const currentWorkout = activeWorkouts?.[selectedTemplateCode]
  const passKeys = Object.keys(activeWorkouts || {})
  const exerciseCount = currentWorkout?.exercises?.length || 0

  useEffect(() => {
    if (view === "edit" && !currentWorkout) {
      setView("overview")
    }
  }, [currentWorkout, view])

  useEffect(() => {
    if (view !== "edit" || activeEditSection !== "content") return

    const firstExerciseId = currentWorkout?.exercises?.[0]?.id || null

    setExpandedExerciseId((current) => {
      if (!firstExerciseId) return null
      const stillExists = (currentWorkout?.exercises || []).some(
        (exercise) => String(exercise.id) === String(current)
      )
      return stillExists ? current : firstExerciseId
    })
  }, [activeEditSection, currentWorkout, view])

  const openCreateView = () => {
    setNewPassName("")
    setNewPassInfo("")
    setNewPassWarmupCardio("")
    setNewPassWarmupTechnique("")
    setNewPassWorkoutKind("gym")
    setNewPassRunningType("intervals")
    setNewPassRunningIntervalTime("")
    setNewPassRunningIntervalsCount("")
    setNewPassRunningDistance("")
    setNewPassRunningTime("")
    setNewWarmupTemplateName("")
    setView("create")
  }

  const openEditView = () => {
    if (!selectedTemplateCode) return
    resetPassEditorState(selectedTemplateCode)
    setActiveEditSection("content")
    setExpandedExerciseId(currentWorkout?.exercises?.[0]?.id || null)
    setSelectedAlternativeExerciseByRow({})
    setExerciseSearchValue("")
    setSelectedExerciseCategory("alla")
    setView("edit")
  }

  const goToOverview = () => {
    resetPassEditorState(selectedTemplateCode)
    setSelectedExerciseId("")
    setSelectedAlternativeExerciseByRow({})
    setExerciseSearchValue("")
    setSelectedExerciseCategory("alla")
    setExpandedExerciseId(null)
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

  const handleSelectedAlternativeChange = (rowId, value) => {
    setSelectedAlternativeExerciseByRow((prev) => ({
      ...prev,
      [rowId]: value,
    }))
  }

  const handleAddAlternative = async (rowId) => {
    const selectedAlternativeId = selectedAlternativeExerciseByRow[rowId]
    const didAdd = await handleAddAlternativeExerciseToPassExercise(rowId, selectedAlternativeId)

    if (didAdd) {
      setSelectedAlternativeExerciseByRow((prev) => ({
        ...prev,
        [rowId]: "",
      }))
    }
  }

  const handleAddExerciseAndOpen = async () => {
    const addedRowId = await handleAddExerciseToPass()

    if (addedRowId && addedRowId !== true) {
      setActiveEditSection("content")
      setExpandedExerciseId(addedRowId)
    }
  }

  const getExerciseDisplayName = (exercise) => exercise?.displayName || exercise?.display_name || exercise?.name || ""

  const visibleExerciseCategories = useMemo(() => {
    const counts = (exercisesFromDB || []).reduce((acc, exercise) => {
      const category = getExerciseNavigationCategory(exercise)
      acc[category] = (acc[category] || 0) + 1
      return acc
    }, {})

    return Object.entries(counts)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => {
        const orderA = exerciseNavigationCategoryOrder.indexOf(a.label)
        const orderB = exerciseNavigationCategoryOrder.indexOf(b.label)
        const safeOrderA = orderA === -1 ? 999 : orderA
        const safeOrderB = orderB === -1 ? 999 : orderB
        if (safeOrderA !== safeOrderB) return safeOrderA - safeOrderB
        return a.label.localeCompare(b.label, "sv")
      })
  }, [exercisesFromDB])

  const visibleExercisesForPicker = useMemo(() => {
    const normalizedSearch = normalizeExerciseSearchValue(exerciseSearchValue.trim())

    return (exercisesFromDB || []).filter((exercise) => {
      const navigationCategory = getExerciseNavigationCategory(exercise)
      const haystack = [
        getExerciseDisplayName(exercise),
        exercise?.name,
        navigationCategory,
        ...(Array.isArray(exercise?.aliases) ? exercise.aliases : []),
        ...(Array.isArray(exercise?.muscle_groups) ? exercise.muscle_groups : []),
      ]
        .map((entry) => normalizeExerciseSearchValue(entry))
        .join(" ")

      const matchesSearch = !normalizedSearch || haystack.includes(normalizedSearch)
      const matchesCategory =
        normalizedSearch ||
        selectedExerciseCategory === "alla" ||
        navigationCategory === selectedExerciseCategory

      return matchesSearch && matchesCategory
    })
  }, [exerciseSearchValue, exercisesFromDB, selectedExerciseCategory])

  const hasActiveExerciseSearch = Boolean(exerciseSearchValue.trim())
  const isShowingExerciseCategoryOverview =
    !hasActiveExerciseSearch && selectedExerciseCategory === "alla"

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
            <div>
              <div style={fieldLabelStyle}>Namn på passet</div>
              <input
                type="text"
                value={newPassName}
                onChange={(e) => setNewPassName(e.target.value)}
                style={{ ...inputStyle, width: "100%" }}
              />
            </div>

            <div>
              <div style={fieldLabelStyle}>Kort intro till spelaren</div>
              <div style={fieldHintStyle}>Visas innan passet startar.</div>
              <textarea
                rows={4}
                value={newPassInfo}
                onChange={(e) => setNewPassInfo(e.target.value)}
                style={{ ...inputStyle, ...textareaStyle, width: "100%" }}
              />
            </div>

            <div style={subSectionStyle}>
              <div style={sectionTitleStyle}>Passupplägg</div>
              <div>
                <div style={fieldLabelStyle}>Typ av pass</div>
                <select
                  value={newPassWorkoutKind}
                  onChange={(e) => setNewPassWorkoutKind(e.target.value)}
                  style={{ ...inputStyle, width: "100%" }}
                >
                  <option value="gym">Gympass</option>
                  <option value="running">Löppass</option>
                </select>
              </div>

              {newPassWorkoutKind === "running" && (
                <>
                  <div>
                    <div style={fieldLabelStyle}>Typ av löppass</div>
                    <select
                      value={newPassRunningType}
                      onChange={(e) => setNewPassRunningType(e.target.value)}
                      style={{ ...inputStyle, width: "100%" }}
                    >
                      <option value="intervals">Intervaller</option>
                      <option value="distance">Distans</option>
                    </select>
                  </div>

                  {newPassRunningType === "intervals" ? (
                    <div style={targetGridStyle}>
                      <div>
                        <div style={fieldLabelStyle}>Tid per intervall</div>
                        <input
                          type="text"
                          value={newPassRunningIntervalTime}
                          onChange={(e) => setNewPassRunningIntervalTime(e.target.value)}
                          style={{ ...inputStyle, width: "100%" }}
                        />
                      </div>
                      <div>
                        <div style={fieldLabelStyle}>Antal intervaller</div>
                        <input
                          type="number"
                          value={newPassRunningIntervalsCount}
                          onChange={(e) => setNewPassRunningIntervalsCount(e.target.value)}
                          style={{ ...inputStyle, width: "100%" }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div style={targetGridStyle}>
                      <div>
                        <div style={fieldLabelStyle}>Distans (km)</div>
                        <input
                          type="text"
                          value={newPassRunningDistance}
                          onChange={(e) => setNewPassRunningDistance(e.target.value)}
                          style={{ ...inputStyle, width: "100%" }}
                        />
                      </div>
                      <div>
                        <div style={fieldLabelStyle}>Måltid</div>
                        <input
                          type="text"
                          value={newPassRunningTime}
                          onChange={(e) => setNewPassRunningTime(e.target.value)}
                          style={{ ...inputStyle, width: "100%" }}
                        />
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div style={subSectionStyle}>
              <div style={sectionTitleStyle}>Uppvärmning</div>
              <div>
                <div style={fieldLabelStyle}>Pulsdel</div>
                <textarea
                  rows={3}
                  value={newPassWarmupCardio}
                  onChange={(e) => setNewPassWarmupCardio(e.target.value)}
                  style={{ ...inputStyle, ...textareaStyle, width: "100%" }}
                />
              </div>
              <div>
                <div style={fieldLabelStyle}>Teknikdel</div>
                <div style={fieldHintStyle}>Skriv gärna en övning eller ett moment per rad.</div>
                <textarea
                  rows={4}
                  value={newPassWarmupTechnique}
                  onChange={(e) => setNewPassWarmupTechnique(e.target.value)}
                  style={{ ...inputStyle, ...textareaStyle, width: "100%" }}
                />
              </div>
            </div>

            <div style={subSectionStyle}>
              <div style={sectionTitleStyle}>Uppvärmningsmallar</div>
              <div style={warmupTemplateListStyle}>
                {(warmupTemplates || []).map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => applyWarmupTemplateToCreate(template.id)}
                    style={{ ...secondaryButtonStyle, width: isMobile ? "100%" : "auto" }}
                  >
                    Använd {template.name}
                  </button>
                ))}
              </div>
              <div style={warmupTemplateSaveRowStyle(isMobile)}>
                <div style={{ flex: 1 }}>
                  <div style={fieldLabelStyle}>Namn på mallen</div>
                  <input
                    type="text"
                    value={newWarmupTemplateName}
                    onChange={(e) => setNewWarmupTemplateName(e.target.value)}
                    style={{ ...inputStyle, width: "100%" }}
                  />
                </div>
                <button
                  type="button"
                  onClick={saveCreateWarmupTemplate}
                  disabled={isSavingWarmupTemplate}
                  style={{ ...secondaryButtonStyle, width: isMobile ? "100%" : "auto" }}
                >
                  {isSavingWarmupTemplate ? "Sparar..." : "Spara som mall"}
                </button>
              </div>
            </div>

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
            <div style={editSectionTabsStyle(isMobile)}>
              {[
                { key: "passinfo", label: "Passinfo" },
                ...(renamePassWorkoutKind !== "running" ? [{ key: "warmup", label: "Uppvärmning" }] : []),
                ...(renamePassWorkoutKind !== "running" ? [{ key: "add", label: "Lägg till" }] : []),
                ...(renamePassWorkoutKind !== "running" ? [{ key: "content", label: "Innehåll" }] : []),
              ].map((section) => (
                <button
                  key={section.key}
                  type="button"
                  onClick={() => setActiveEditSection(section.key)}
                  style={{
                    ...editSectionButtonStyle,
                    ...(activeEditSection === section.key ? editSectionButtonActiveStyle : {}),
                    width: isMobile ? "100%" : "auto",
                  }}
                >
                  {section.label}
                </button>
              ))}
            </div>
          </section>

          {activeEditSection === "passinfo" && (
          <section style={panelStyle}>
            <div style={sectionEyebrowStyle}>Passinfo</div>
            <div style={formStackStyle}>
              <div>
                <div style={fieldLabelStyle}>Namn på passet</div>
                <input
                  type="text"
                  value={renamePassName}
                  onChange={(e) => setRenamePassName(e.target.value)}
                  style={{ ...inputStyle, width: "100%" }}
                />
              </div>

              <div>
                <div style={fieldLabelStyle}>Kort intro till spelaren</div>
                <textarea
                  rows={4}
                  value={renamePassInfo}
                  onChange={(e) => setRenamePassInfo(e.target.value)}
                  style={{ ...inputStyle, ...textareaStyle, width: "100%" }}
                />
              </div>

              <div>
                <div style={fieldLabelStyle}>Typ av pass</div>
                <select
                  value={renamePassWorkoutKind}
                  onChange={(e) => setRenamePassWorkoutKind(e.target.value)}
                  style={{ ...inputStyle, width: "100%" }}
                >
                  <option value="gym">Gympass</option>
                  <option value="running">Löppass</option>
                </select>
              </div>

              {renamePassWorkoutKind === "running" && (
                <>
                  <div>
                    <div style={fieldLabelStyle}>Typ av löppass</div>
                    <select
                      value={renamePassRunningType}
                      onChange={(e) => setRenamePassRunningType(e.target.value)}
                      style={{ ...inputStyle, width: "100%" }}
                    >
                      <option value="intervals">Intervaller</option>
                      <option value="distance">Distans</option>
                    </select>
                  </div>

                  {renamePassRunningType === "intervals" ? (
                    <div style={targetGridStyle}>
                      <div>
                        <div style={fieldLabelStyle}>Tid per intervall</div>
                        <input
                          type="text"
                          value={renamePassRunningIntervalTime}
                          onChange={(e) => setRenamePassRunningIntervalTime(e.target.value)}
                          style={{ ...inputStyle, width: "100%" }}
                        />
                      </div>
                      <div>
                        <div style={fieldLabelStyle}>Antal intervaller</div>
                        <input
                          type="number"
                          value={renamePassRunningIntervalsCount}
                          onChange={(e) => setRenamePassRunningIntervalsCount(e.target.value)}
                          style={{ ...inputStyle, width: "100%" }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div style={targetGridStyle}>
                      <div>
                        <div style={fieldLabelStyle}>Distans (km)</div>
                        <input
                          type="text"
                          value={renamePassRunningDistance}
                          onChange={(e) => setRenamePassRunningDistance(e.target.value)}
                          style={{ ...inputStyle, width: "100%" }}
                        />
                      </div>
                      <div>
                        <div style={fieldLabelStyle}>Måltid</div>
                        <input
                          type="text"
                          value={renamePassRunningTime}
                          onChange={(e) => setRenamePassRunningTime(e.target.value)}
                          style={{ ...inputStyle, width: "100%" }}
                        />
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>
          )}

          {renamePassWorkoutKind !== "running" && activeEditSection === "warmup" && (
          <section style={panelStyle}>
            <div style={sectionEyebrowStyle}>Uppvärmning</div>
            <div style={formStackStyle}>
              <div>
                <div style={fieldLabelStyle}>Pulsdel</div>
                <textarea
                  rows={3}
                  value={renamePassWarmupCardio}
                  onChange={(e) => setRenamePassWarmupCardio(e.target.value)}
                  style={{ ...inputStyle, ...textareaStyle, width: "100%" }}
                />
              </div>

              <div>
                <div style={fieldLabelStyle}>Teknikdel</div>
                <div style={fieldHintStyle}>Skriv gärna en övning eller ett moment per rad.</div>
                <textarea
                  rows={4}
                  value={renamePassWarmupTechnique}
                  onChange={(e) => setRenamePassWarmupTechnique(e.target.value)}
                  style={{ ...inputStyle, ...textareaStyle, width: "100%" }}
                />
              </div>

              <div style={warmupTemplateListStyle}>
                {(warmupTemplates || []).map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => applyWarmupTemplateToEdit(template.id)}
                    style={{ ...secondaryButtonStyle, width: isMobile ? "100%" : "auto" }}
                  >
                    Använd {template.name}
                  </button>
                ))}
              </div>

              <div style={warmupTemplateSaveRowStyle(isMobile)}>
                <div style={{ flex: 1 }}>
                  <div style={fieldLabelStyle}>Namn på mallen</div>
                  <input
                    type="text"
                    value={renameWarmupTemplateName}
                    onChange={(e) => setRenameWarmupTemplateName(e.target.value)}
                    style={{ ...inputStyle, width: "100%" }}
                  />
                </div>
                <button
                  type="button"
                  onClick={saveEditWarmupTemplate}
                  disabled={isSavingWarmupTemplate}
                  style={{ ...secondaryButtonStyle, width: isMobile ? "100%" : "auto" }}
                >
                  {isSavingWarmupTemplate ? "Sparar..." : "Spara som mall"}
                </button>
              </div>
            </div>
          </section>
          )}

          {renamePassWorkoutKind !== "running" && activeEditSection === "add" && (
          <section style={panelStyle}>
            <div style={panelHeaderStyle}>
              <div>
                <div style={sectionEyebrowStyle}>Övningar</div>
                <div style={sectionTitleStyle}>Lägg till övning i passet</div>
              </div>
              <div style={summaryBadgeStyle}>{exerciseCount} övningar</div>
            </div>

            <div style={addExercisePanelStyle}>
              <input
                type="text"
                placeholder="Sök övning i hela banken"
                value={exerciseSearchValue}
                onChange={(e) => setExerciseSearchValue(e.target.value)}
                style={{ ...inputStyle, width: "100%" }}
              />

              {isShowingExerciseCategoryOverview ? (
                <div
                  style={{
                    display: "grid",
                    gap: "10px",
                    gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
                  }}
                >
                  {visibleExerciseCategories.map((category) => (
                    <button
                      key={category.label}
                      type="button"
                      onClick={() => {
                        setSelectedExerciseCategory(category.label)
                        setSelectedExerciseId("")
                      }}
                      style={exercisePickerCategoryCardStyle}
                    >
                      <div>
                        <div style={exercisePickerCategoryTitleStyle}>{category.label}</div>
                        <div style={exercisePickerCategoryHintStyle}>Visa övningar i kategorin</div>
                      </div>
                      <div style={summaryBadgeStyle}>{category.count}</div>
                    </button>
                  ))}
                </div>
              ) : (
                <div style={{ display: "grid", gap: "10px" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: isMobile ? "stretch" : "center",
                      flexDirection: isMobile ? "column" : "row",
                      gap: "10px",
                    }}
                  >
                    <div style={{ fontSize: "13px", color: "#64748b" }}>
                      {hasActiveExerciseSearch
                        ? `Sökresultat i hela banken (${visibleExercisesForPicker.length})`
                        : `${selectedExerciseCategory} (${visibleExercisesForPicker.length})`}
                    </div>

                    {!hasActiveExerciseSearch && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedExerciseCategory("alla")
                          setSelectedExerciseId("")
                        }}
                        style={{ ...secondaryButtonStyle, width: isMobile ? "100%" : "auto" }}
                      >
                        Tillbaka till kategorier
                      </button>
                    )}
                  </div>

                  {visibleExercisesForPicker.length === 0 ? (
                    <div style={exercisePickerEmptyStyle}>
                      {hasActiveExerciseSearch
                        ? "Ingen övning matchar din sökning."
                        : "Inga övningar finns i den här kategorin."}
                    </div>
                  ) : (
                    <div style={{ display: "grid", gap: "8px" }}>
                      {visibleExercisesForPicker.map((exercise) => {
                        const isSelected = String(selectedExerciseId) === String(exercise.id)

                        return (
                          <button
                            key={exercise.id}
                            type="button"
                            onClick={() => setSelectedExerciseId(String(exercise.id))}
                            style={{
                              ...exercisePickerRowStyle,
                              border: isSelected ? "2px solid #c62828" : "1px solid #ece5e5",
                              backgroundColor: isSelected ? "#fff7f7" : "#ffffff",
                            }}
                          >
                            <div>
                              <div style={exercisePickerRowTitleStyle}>{getExerciseDisplayName(exercise)}</div>
                              <div style={exercisePickerRowMetaStyle}>
                                {getExerciseNavigationCategory(exercise)}
                                {Array.isArray(exercise.muscle_groups) && exercise.muscle_groups.length > 0
                                  ? ` • ${exercise.muscle_groups.join(", ")}`
                                  : ""}
                              </div>
                            </div>
                            <div style={exercisePickerRowSelectStyle}>
                              {isSelected ? "Vald" : "Välj"}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleAddExerciseAndOpen}
                    disabled={isSavingPassExercise || !selectedTemplateCode || !selectedExerciseId}
                    style={{
                      ...buttonStyle,
                      width: isMobile ? "100%" : "auto",
                      opacity: isSavingPassExercise || !selectedTemplateCode || !selectedExerciseId ? 0.7 : 1,
                    }}
                  >
                    {isSavingPassExercise ? "Lägger till..." : "Lägg till vald övning"}
                  </button>
                </div>
              )}
            </div>
          </section>
          )}

          {renamePassWorkoutKind !== "running" && activeEditSection === "content" && (
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
                  const selectedAlternativeId = selectedAlternativeExerciseByRow[exercise.id] || ""
                  const availableAlternativeExercises = (exercisesFromDB || []).filter(
                    (candidate) =>
                      String(candidate.id) !== String(exercise.exerciseId) &&
                      !(exercise.alternativeExercises || []).some(
                        (alternative) => String(alternative.exerciseId) === String(candidate.id)
                      )
                  )
                  const isExpanded = String(expandedExerciseId) === String(exercise.id)

                  return (
                    <div key={`${exercise.name}-${index}`} style={exerciseEditorCardStyle}>
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedExerciseId((current) =>
                            String(current) === String(exercise.id) ? null : exercise.id
                          )
                        }
                        style={exerciseAccordionButtonStyle}
                      >
                        <div>
                          <div style={exerciseOrderStyle}>Övning {index + 1}</div>
                          <div style={exerciseNameStyle}>{getExerciseDisplayName(exercise)}</div>
                        </div>
                        <div style={exerciseAccordionMetaStyle}>
                          <div style={exerciseAccordionSummaryStyle}>
                            {draft.targetSets || "–"} set •{" "}
                            {draft.targetRepsMode === "max"
                              ? "MAX"
                              : draft.targetReps || "–"} reps
                          </div>
                          <div style={exerciseAccordionChevronStyle}>{isExpanded ? "−" : "+"}</div>
                        </div>
                      </button>

                      {isExpanded && (
                        <>
                          <div style={exerciseEditorHeaderStyle}>
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
                            Lämna instruktionen tom om övningen ska använda standardtexten från övningsbanken.
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
                            <div>
                              <div style={fieldLabelStyle}>Instruktion i just det här passet</div>
                              <textarea
                                rows={3}
                                value={draft.guide}
                                onChange={(e) => handlePassExerciseDraftChange(exercise.id, "guide", e.target.value)}
                                style={{ ...inputStyle, ...textareaStyle, width: "100%", minHeight: "84px" }}
                              />
                            </div>

                            <div style={{ ...targetGridStyle, gridTemplateColumns: isMobile ? "1fr" : "92px 92px auto" }}>
                              <div>
                                <div style={fieldLabelStyle}>Set</div>
                                <input
                                  type="number"
                                  value={draft.targetSets}
                                  onChange={(e) => handlePassExerciseDraftChange(exercise.id, "targetSets", e.target.value)}
                                  style={{ ...inputStyle, width: "100%" }}
                                />
                              </div>

                              <div>
                                <div style={fieldLabelStyle}>Reps</div>
                                <input
                                  type="number"
                                  value={draft.targetReps}
                                  disabled={draft.targetRepsMode === "max"}
                                  onChange={(e) => handlePassExerciseDraftChange(exercise.id, "targetReps", e.target.value)}
                                  style={{
                                    ...inputStyle,
                                    width: "100%",
                                    opacity: draft.targetRepsMode === "max" ? 0.5 : 1,
                                  }}
                                />
                              </div>

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

                            <div style={alternativeBlockStyle}>
                              <div style={alternativeBlockHeaderStyle}>
                                <div style={alternativeBlockTitleStyle}>Alternativa övningar</div>
                                <div style={alternativeBlockHintStyle}>
                                  Lägg till alternativ som spelaren kan välja mellan i passet.
                                </div>
                              </div>

                              {(exercise.alternativeExercises || []).length > 0 ? (
                                <div style={alternativeListStyle}>
                                  {exercise.alternativeExercises.map((alternative) => (
                                    <div key={alternative.id} style={alternativeRowStyle}>
                                      <div>
                                        <div style={alternativeNameStyle}>{getExerciseDisplayName(alternative)}</div>
                                        <div style={alternativeMetaStyle}>Alternativ till {getExerciseDisplayName(exercise)}</div>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleRemoveAlternativeExerciseFromPassExercise(alternative.id)
                                        }
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
                                  ))}
                                </div>
                              ) : (
                                <div style={alternativeEmptyStyle}>Inga alternativa övningar tillagda ännu.</div>
                              )}

                              <div style={alternativeAddRowStyle(isMobile)}>
                                <select
                                  value={selectedAlternativeId}
                                  onChange={(e) => handleSelectedAlternativeChange(exercise.id, e.target.value)}
                                  style={{ ...inputStyle, width: "100%" }}
                                >
                                  <option value="">Välj alternativ övning</option>
                                  {availableAlternativeExercises.map((candidate) => (
                                    <option key={`${exercise.id}-${candidate.id}`} value={candidate.id}>
                                      {getExerciseDisplayName(candidate)}
                                    </option>
                                  ))}
                                </select>

                                <button
                                  type="button"
                                  onClick={() => handleAddAlternative(exercise.id)}
                                  disabled={isSavingPassExercise || !selectedAlternativeId}
                                  style={{
                                    ...secondaryButtonStyle,
                                    width: isMobile ? "100%" : "auto",
                                    opacity: isSavingPassExercise || !selectedAlternativeId ? 0.7 : 1,
                                    cursor:
                                      isSavingPassExercise || !selectedAlternativeId ? "default" : "pointer",
                                  }}
                                >
                                  {isSavingPassExercise ? "Sparar..." : "Lägg till alternativ"}
                                </button>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </section>
          )}
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
        <section style={summaryStripStyle(isMobile)}>
          <div style={summaryStatCardStyle}>
            <div style={summaryStatLabelStyle}>Pass totalt</div>
            <div style={{ ...summaryStatValueStyle, color: "#dc2626" }}>{passKeys.length}</div>
          </div>
          <div style={summaryStatCardStyle}>
            <div style={summaryStatLabelStyle}>Gympass</div>
            <div style={summaryStatValueStyle}>
              {passKeys.filter((key) => activeWorkouts[key]?.workoutKind !== "running").length}
            </div>
          </div>
          <div style={summaryStatCardStyle}>
            <div style={summaryStatLabelStyle}>Löppass</div>
            <div style={summaryStatValueStyle}>
              {passKeys.filter((key) => activeWorkouts[key]?.workoutKind === "running").length}
            </div>
          </div>
        </section>

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
                    <div style={passCardMetaStyle}>
                      {workout.workoutKind === "running"
                        ? `Löppass • ${buildRunningWorkoutSummary(
                            workout.workoutKind,
                            workout.runningType,
                            workout.runningConfig
                          )}`
                        : `${(workout.exercises || []).length} övningar`}
                    </div>
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
                <div style={selectedPassMetricLabelStyle}>
                  {currentWorkout.workoutKind === "running" ? "Typ" : "Övningar"}
                </div>
                <div style={selectedPassMetricValueStyle}>
                  {currentWorkout.workoutKind === "running" ? "Löpning" : exerciseCount}
                </div>
              </div>

              {currentWorkout.info ? (
                <div style={selectedPassDescriptionStyle}>{currentWorkout.info}</div>
              ) : (
                <div style={selectedPassEmptyStyle}>Ingen passinfo tillagd ännu.</div>
              )}

              <div style={selectedPassExerciseListCardStyle}>
                <div style={selectedPassMetricLabelStyle}>
                  {currentWorkout.workoutKind === "running" ? "Löppass" : "Övningar i passet"}
                </div>

                {currentWorkout.workoutKind === "running" ? (
                  <div style={selectedPassDescriptionStyle}>
                    {buildRunningWorkoutSummary(
                      currentWorkout.workoutKind,
                      currentWorkout.runningType,
                      currentWorkout.runningConfig
                    )}
                  </div>
                ) : exerciseCount > 0 ? (
                  <div style={selectedPassExerciseListStyle}>
                    {(currentWorkout.exercises || []).map((exercise, index) => (
                      <div key={`${exercise.id || exercise.name}-${index}`} style={selectedPassExerciseItemStyle}>
                        <span style={selectedPassExerciseIndexStyle}>{index + 1}</span>
                        <span>{getExerciseDisplayName(exercise)}</span>
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

const summaryStripStyle = (isMobile) => ({
  display: "grid",
  gap: "10px",
  gridTemplateColumns: isMobile ? "repeat(3, minmax(0, 1fr))" : "repeat(3, minmax(0, 1fr))",
})

const summaryStatCardStyle = {
  padding: "14px 12px",
  borderRadius: "18px",
  border: "1px solid rgba(15, 23, 42, 0.08)",
  backgroundColor: "#ffffff",
  boxShadow: "0 12px 28px rgba(15, 23, 42, 0.04)",
}

const summaryStatLabelStyle = {
  marginBottom: "6px",
  fontSize: "11px",
  fontWeight: "800",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#6b7280",
}

const summaryStatValueStyle = {
  fontSize: "28px",
  lineHeight: 1,
  fontWeight: "900",
  color: "#111827",
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

const exercisePickerCategoryCardStyle = {
  width: "100%",
  padding: "16px 18px",
  borderRadius: "16px",
  border: "1px solid #ece5e5",
  backgroundColor: "#ffffff",
  boxShadow: "0 10px 24px rgba(24, 32, 43, 0.04)",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  textAlign: "left",
  cursor: "pointer",
}

const exercisePickerCategoryTitleStyle = {
  fontSize: "15px",
  fontWeight: "800",
  color: "#18202b",
}

const exercisePickerCategoryHintStyle = {
  fontSize: "12px",
  color: "#64748b",
  marginTop: "4px",
}

const exercisePickerEmptyStyle = {
  padding: "16px 18px",
  borderRadius: "16px",
  border: "1px solid #ece5e5",
  backgroundColor: "#ffffff",
  color: "#64748b",
}

const exercisePickerRowStyle = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: "16px",
  backgroundColor: "#ffffff",
  boxShadow: "0 10px 24px rgba(24, 32, 43, 0.04)",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  textAlign: "left",
  cursor: "pointer",
}

const exercisePickerRowTitleStyle = {
  fontSize: "15px",
  fontWeight: "800",
  color: "#18202b",
}

const exercisePickerRowMetaStyle = {
  fontSize: "12px",
  color: "#64748b",
  marginTop: "4px",
}

const exercisePickerRowSelectStyle = {
  fontSize: "12px",
  fontWeight: "700",
  color: "#991b1b",
  whiteSpace: "nowrap",
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

const editSectionTabsStyle = (isMobile) => ({
  display: "flex",
  gap: "8px",
  flexDirection: isMobile ? "column" : "row",
  flexWrap: "wrap",
})

const editSectionButtonStyle = {
  padding: "10px 14px",
  borderRadius: "999px",
  border: "1px solid #dbe5ef",
  backgroundColor: "#ffffff",
  color: "#566173",
  fontSize: "13px",
  fontWeight: "800",
  cursor: "pointer",
}

const editSectionButtonActiveStyle = {
  backgroundColor: "#fff1f1",
  borderColor: "#efc7c7",
  color: "#991b1b",
}

const sectionEyebrowStyle = {
  marginBottom: "6px",
  fontSize: "11px",
  fontWeight: "800",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#991b1b",
}

const fieldLabelStyle = {
  marginBottom: "8px",
  fontSize: "13px",
  fontWeight: "800",
  color: "#18202b",
}

const fieldHintStyle = {
  marginBottom: "8px",
  fontSize: "12px",
  lineHeight: 1.5,
  color: "#64748b",
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

const subSectionStyle = {
  display: "grid",
  gap: "10px",
  padding: "12px",
  borderRadius: "16px",
  border: "1px solid #efe5e5",
  backgroundColor: "#fffdfd",
}

const warmupTemplateListStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
}

const warmupTemplateSaveRowStyle = (isMobile) => ({
  display: "grid",
  gap: "10px",
  gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1fr) auto",
})

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

const exerciseAccordionButtonStyle = {
  width: "100%",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  padding: 0,
  border: "none",
  background: "transparent",
  textAlign: "left",
  cursor: "pointer",
}

const exerciseAccordionMetaStyle = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  flexShrink: 0,
}

const exerciseAccordionSummaryStyle = {
  fontSize: "12px",
  color: "#6b7280",
  fontWeight: "700",
}

const exerciseAccordionChevronStyle = {
  width: "34px",
  height: "34px",
  borderRadius: "12px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "#fff1f1",
  color: "#b61e24",
  fontSize: "22px",
  fontWeight: "700",
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

const alternativeBlockStyle = {
  display: "grid",
  gap: "12px",
  marginTop: "4px",
  padding: "14px",
  borderRadius: "14px",
  border: "1px solid #dbe5ef",
  backgroundColor: "#f8fafc",
}

const alternativeBlockHeaderStyle = {
  display: "grid",
  gap: "4px",
}

const alternativeBlockTitleStyle = {
  fontSize: "14px",
  fontWeight: "800",
  color: "#18202b",
}

const alternativeBlockHintStyle = {
  fontSize: "13px",
  color: "#64748b",
  lineHeight: 1.5,
}

const alternativeListStyle = {
  display: "grid",
  gap: "8px",
}

const alternativeRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "10px",
  padding: "10px 12px",
  borderRadius: "12px",
  backgroundColor: "#ffffff",
  border: "1px solid #e2e8f0",
  flexWrap: "wrap",
}

const alternativeNameStyle = {
  fontSize: "14px",
  fontWeight: "800",
  color: "#18202b",
}

const alternativeMetaStyle = {
  fontSize: "12px",
  color: "#64748b",
  marginTop: "4px",
}

const alternativeEmptyStyle = {
  fontSize: "13px",
  color: "#64748b",
}

const alternativeAddRowStyle = (isMobile) => ({
  display: "grid",
  gap: "10px",
  gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1fr) auto",
})

const textareaStyle = {
  resize: "vertical",
  minHeight: "104px",
  fontFamily: "inherit",
}

export default PassBuilderPage
