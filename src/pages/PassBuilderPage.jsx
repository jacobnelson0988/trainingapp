import { useEffect, useMemo, useState } from "react"
import { getExerciseProtocolConfig, isProtocolExercise } from "../utils/exerciseProtocols"

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

const parseHrgAlias = (alias) => {
  const match = String(alias || "")
    .trim()
    .match(/^(Axelkontroll|Knäkontroll)\s+([1-6])([A-E])$/i)

  if (!match) return null

  const program = match[1][0].toUpperCase() + match[1].slice(1).toLowerCase()
  const blockNumber = Number(match[2])
  const letter = match[3].toUpperCase()

  return {
    program,
    blockNumber,
    letter,
    position: `${blockNumber}${letter}`,
  }
}

const getExerciseHrgEntries = (exercise) => {
  const seen = new Set()

  return (Array.isArray(exercise?.aliases) ? exercise.aliases : [])
    .map((alias) => parseHrgAlias(alias))
    .filter(Boolean)
    .filter((entry) => {
      const key = `${entry.program}:${entry.position}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

const buildHrgProgramSummaries = (exercises) => {
  const programMap = new Map()

  ;(exercises || []).forEach((exercise) => {
    getExerciseHrgEntries(exercise).forEach((entry) => {
      const programBlocks = programMap.get(entry.program) || new Map()
      const block = programBlocks.get(entry.blockNumber) || {
        blockNumber: entry.blockNumber,
        positions: {},
      }

      if (!block.positions[entry.letter]) {
        block.positions[entry.letter] = exercise
      }

      programBlocks.set(entry.blockNumber, block)
      programMap.set(entry.program, programBlocks)
    })
  })

  return Array.from(programMap.entries())
    .map(([program, blocks]) => {
      const normalizedBlocks = Array.from(blocks.values())
        .sort((a, b) => a.blockNumber - b.blockNumber)
        .map((block) => {
          const baseExercise = block.positions.A || null
          const alternativeExercises = ["B", "C", "D", "E"]
            .map((letter) => block.positions[letter])
            .filter(Boolean)
            .filter(
              (exercise, index, list) =>
                list.findIndex((candidate) => String(candidate.id) === String(exercise.id)) === index
            )

          return {
            blockNumber: block.blockNumber,
            baseExercise,
            alternativeExercises,
          }
        })
        .filter((block) => block.baseExercise)

      return {
        program,
        blocks: normalizedBlocks,
        baseCount: normalizedBlocks.length,
        alternativeCount: normalizedBlocks.reduce(
          (total, block) => total + block.alternativeExercises.length,
          0
        ),
      }
    })
    .filter((program) => program.blocks.length > 0)
    .sort((a, b) => a.program.localeCompare(b.program, "sv"))
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

const getWorkoutKindLabel = (workoutKind) => {
  if (workoutKind === "running") return "Löppass"
  if (workoutKind === "prehab") return "Skadeförebyggande"
  return "Gympass"
}

const getDraftTargetRepsValue = (exercise, passExerciseDrafts) => {
  const draft = passExerciseDrafts?.[exercise.id]
  if (draft?.targetReps !== undefined) return draft.targetReps
  if (exercise.targetRepsText) return exercise.targetRepsText
  if (exercise.targetRepsMin != null && exercise.targetRepsMax != null) {
    return `${exercise.targetRepsMin}-${exercise.targetRepsMax}`
  }
  if (exercise.targetReps != null) return String(exercise.targetReps)
  return ""
}

const getExerciseMeasurementLabel = (exerciseType) =>
  exerciseType === "seconds_only" ? "Sekunder" : "Reps"

const getExerciseMeasurementShortLabel = (exerciseType) =>
  exerciseType === "seconds_only" ? "sek" : "reps"

const getExercisePerSideSuffix = (executionSide) => {
  if (executionSide === "single_leg") return "per ben"
  if (executionSide === "single_arm") return "per hand"
  return ""
}

const getExerciseMeasurementLabelWithSide = (exerciseType, executionSide) => {
  const suffix = getExercisePerSideSuffix(executionSide)
  return suffix ? `${getExerciseMeasurementLabel(exerciseType)} (${suffix})` : getExerciseMeasurementLabel(exerciseType)
}

const getExerciseExecutionHint = (exerciseType, executionSide) => {
  const unitLabel = exerciseType === "seconds_only" ? "sekunder" : "reps"

  if (executionSide === "single_leg") {
    return `Värdet gäller per ben. 10 betyder 10 ${unitLabel} vänster + 10 ${unitLabel} höger.`
  }

  if (executionSide === "single_arm") {
    return `Värdet gäller per hand. 10 betyder 10 ${unitLabel} vänster + 10 ${unitLabel} höger.`
  }

  return ""
}

const REP_RANGE_BUCKETS = [
  { key: "1_3", label: "1-3 reps", min: 1, max: 3 },
  { key: "4_5", label: "4-5 reps", min: 4, max: 5 },
  { key: "6_10", label: "6-10 reps", min: 6, max: 10 },
  { key: "11_15", label: "11-15 reps", min: 11, max: 15 },
  { key: "16_20", label: "16-20 reps", min: 16, max: 20 },
]

const getRepRangeValue = (bucket) => `${bucket.min}-${bucket.max}`

const getRepRangeHintBucket = (rawValue) => {
  const value = String(rawValue || "").trim()
  if (!value) return null

  const compact = value.replace(/\s+/g, "")
  const rangeMatch = compact.match(/^(\d+)-(\d+)$/)
  const numericValue = rangeMatch ? Number(rangeMatch[2]) : Number(compact)

  if (!Number.isFinite(numericValue) || numericValue <= 0) return null

  return (
    REP_RANGE_BUCKETS.find((bucket) => numericValue >= bucket.min && numericValue <= bucket.max) ||
    (numericValue < REP_RANGE_BUCKETS[0].min
      ? REP_RANGE_BUCKETS[0]
      : REP_RANGE_BUCKETS[REP_RANGE_BUCKETS.length - 1])
  )
}

const getSelectedStandardRepRangeValue = (rawValue) => {
  const value = String(rawValue || "").trim().replace(/\s+/g, "")
  if (!value) return ""

  const exactBucket = REP_RANGE_BUCKETS.find((bucket) => value === getRepRangeValue(bucket))
  return exactBucket ? exactBucket.key : ""
}

function PassBuilderPage({
  activeWorkouts,
  players,
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
  handleAddHrgProgramToPass,
  handleAddAlternativeExerciseToPassExercise,
  handleRemoveAlternativeExerciseFromPassExercise,
  isSavingPassExercise,
  passExerciseDrafts,
  handlePassExerciseDraftChange,
  handleSavePassExercises,
  handleRemoveExerciseFromPass,
  handleMoveExerciseInPass,
  handleDeletePass,
  handleAssignPassToPlayers,
  handleSavePassAssignmentsToPlayers,
  passAssignmentPlayerIdsByPass,
  resetPassEditorState,
  cardTitleStyle,
  secondaryButtonStyle,
  mutedTextStyle,
  inputStyle,
  buttonStyle,
  isMobile,
}) {
  const [view, setView] = useState("overview")
  const [activeEditSection, setActiveEditSection] = useState("exercises")
  const [editingExerciseId, setEditingExerciseId] = useState(null)
  const [showExercisePicker, setShowExercisePicker] = useState(false)
  const [expandedAlternativesId, setExpandedAlternativesId] = useState(null)
  const [exerciseSearchValue, setExerciseSearchValue] = useState("")
  const [selectedExerciseCategory, setSelectedExerciseCategory] = useState("alla")
  const [selectedAlternativeExerciseByRow, setSelectedAlternativeExerciseByRow] = useState({})
  const [selectedCreateWarmupTemplateId, setSelectedCreateWarmupTemplateId] = useState("")
  const [selectedEditWarmupTemplateId, setSelectedEditWarmupTemplateId] = useState("")
  const [isAssignMenuOpen, setIsAssignMenuOpen] = useState(false)
  const [selectedAssignPlayerIds, setSelectedAssignPlayerIds] = useState([])
  const currentWorkout = activeWorkouts?.[selectedTemplateCode]
  const passKeys = Object.keys(activeWorkouts || {})
  const exerciseCount = currentWorkout?.exercises?.length || 0
  const assignablePlayers = useMemo(
    () =>
      (players || [])
        .filter((player) => player?.role === "player" && !player?.is_archived)
        .sort((a, b) =>
          String(a?.full_name || a?.username || "").localeCompare(String(b?.full_name || b?.username || ""), "sv")
        ),
    [players]
  )

  useEffect(() => {
    if (view === "edit" && !currentWorkout) {
      setView("overview")
    }
  }, [currentWorkout, view])

  useEffect(() => {
    setIsAssignMenuOpen(false)
    setSelectedAssignPlayerIds([])
  }, [selectedTemplateCode])

  useEffect(() => {
    if (!isAssignMenuOpen || !selectedTemplateCode) return
    setSelectedAssignPlayerIds(passAssignmentPlayerIdsByPass?.[selectedTemplateCode] || [])
  }, [isAssignMenuOpen, selectedTemplateCode, passAssignmentPlayerIdsByPass])

  useEffect(() => {
    if (view !== "edit" || activeEditSection !== "exercises") return

    setEditingExerciseId((current) => {
      const exercises = currentWorkout?.exercises || []
      if (exercises.length === 0) return null
      if (!current) return null
      const stillExists = exercises.some((e) => String(e.id) === String(current))
      return stillExists ? current : null
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
    setSelectedCreateWarmupTemplateId("")
    setView("create")
  }

  const openEditView = () => {
    if (!selectedTemplateCode) return
    resetPassEditorState(selectedTemplateCode)
    setActiveEditSection("exercises")
    setEditingExerciseId(null)
    setShowExercisePicker(false)
    setExpandedAlternativesId(null)
    setSelectedAlternativeExerciseByRow({})
    setSelectedEditWarmupTemplateId("")
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
    setEditingExerciseId(null)
    setShowExercisePicker(false)
    setExpandedAlternativesId(null)
    setSelectedCreateWarmupTemplateId("")
    setSelectedEditWarmupTemplateId("")
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
      setShowExercisePicker(false)
      setEditingExerciseId(addedRowId)
      setExpandedAlternativesId(null)
    }
  }

  const handleQuickAddHrgProgram = async (programName) => {
    const focusedRowId = await handleAddHrgProgramToPass(programName)

    if (focusedRowId && focusedRowId !== true) {
      setShowExercisePicker(false)
      setEditingExerciseId(focusedRowId)
      setExpandedAlternativesId(null)
      setSelectedExerciseId("")
    }
  }

  const toggleAssignPlayer = (playerId) => {
    setSelectedAssignPlayerIds((current) =>
      current.includes(playerId) ? current.filter((id) => id !== playerId) : [...current, playerId]
    )
  }

  const handleSaveAssignmentSelection = async () => {
    const didAssign = await handleSavePassAssignmentsToPlayers(
      selectedTemplateCode,
      selectedAssignPlayerIds,
      assignablePlayers.map((player) => player.id)
    )

    if (didAssign) {
      setIsAssignMenuOpen(false)
    }
  }

  const handleSelectAllPlayersForAssignment = () => {
    setSelectedAssignPlayerIds(assignablePlayers.map((player) => player.id))
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
  const availableHrgPrograms = useMemo(
    () => buildHrgProgramSummaries(exercisesFromDB),
    [exercisesFromDB]
  )
  const assignedPlayerIdsForSelectedPass = passAssignmentPlayerIdsByPass?.[selectedTemplateCode] || []
  const hasAssignmentSelectionChanged =
    selectedAssignPlayerIds.length !== assignedPlayerIdsForSelectedPass.length ||
    selectedAssignPlayerIds.some((playerId) => !assignedPlayerIdsForSelectedPass.includes(playerId))

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
                  <option value="prehab">Skadeförebyggande</option>
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
              <select
                value={selectedCreateWarmupTemplateId}
                onChange={(e) => {
                  const templateId = e.target.value
                  setSelectedCreateWarmupTemplateId(templateId)
                  if (templateId) {
                    applyWarmupTemplateToCreate(templateId)
                    setSelectedCreateWarmupTemplateId("")
                  }
                }}
                style={{ ...inputStyle, width: "100%", marginBottom: "12px" }}
              >
                <option value="">Välj uppvärmningsmall</option>
                {(warmupTemplates || []).map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
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
                ...(renamePassWorkoutKind !== "running" ? [{ key: "exercises", label: "Övningar" }] : []),
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
                  <option value="prehab">Skadeförebyggande</option>
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

              <select
                value={selectedEditWarmupTemplateId}
                onChange={(e) => {
                  const templateId = e.target.value
                  setSelectedEditWarmupTemplateId(templateId)
                  if (templateId) {
                    applyWarmupTemplateToEdit(templateId)
                    setSelectedEditWarmupTemplateId("")
                  }
                }}
                style={{ ...inputStyle, width: "100%", marginBottom: "12px" }}
              >
                <option value="">Välj uppvärmningsmall</option>
                {(warmupTemplates || []).map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>

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

          {renamePassWorkoutKind !== "running" && activeEditSection === "exercises" && (
          <section style={panelStyle}>
            <div style={panelHeaderStyle}>
              <div>
                <div style={sectionEyebrowStyle}>Övningar</div>
                <div style={sectionTitleStyle}>Hantera övningarna i passet</div>
              </div>
              <div style={summaryBadgeStyle}>{exerciseCount} övningar</div>
            </div>

            <div style={exercisesMasterDetailStyle(isMobile)}>

              {/* LEFT PANEL: Compact exercise list */}
              {(!isMobile || (!editingExerciseId && !showExercisePicker)) && (
                <div style={exercisesListPanelStyle(isMobile)}>
                  {exerciseCount === 0 ? (
                    <div style={emptyStateStyle}>
                      <div style={emptyStateTitleStyle}>Passet är tomt</div>
                      <div style={mutedTextStyle}>Lägg till en övning för att komma igång.</div>
                    </div>
                  ) : (
                    <div style={exerciseCompactListStyle}>
                      {(currentWorkout.exercises || []).map((exercise, index) => {
                        const draft = {
                          targetSets: exercise.targetSets ?? "",
                          targetReps: getDraftTargetRepsValue(exercise, passExerciseDrafts),
                          targetRepsMode: exercise.targetRepsMode || "fixed",
                          ...(passExerciseDrafts?.[exercise.id] || {}),
                        }
                        const isSelected = String(editingExerciseId) === String(exercise.id)

                        return (
                          <div
                            key={`${exercise.name}-${index}`}
                            style={{
                              ...exerciseCompactRowStyle,
                              backgroundColor: isSelected ? "#fff1f1" : "#ffffff",
                              border: isSelected ? "2px solid #c62828" : "1px solid #e5e7eb",
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setEditingExerciseId(exercise.id)
                                setShowExercisePicker(false)
                                setExpandedAlternativesId(null)
                              }}
                              style={exerciseCompactRowButtonStyle}
                            >
                              <div style={exerciseCompactIndexStyle}>{index + 1}</div>
                              <div style={exerciseCompactInfoStyle}>
                                <div style={exerciseCompactNameStyle}>{getExerciseDisplayName(exercise)}</div>
                                <div style={exerciseCompactMetaStyle}>
                                  {draft.targetSets || "–"} set •{" "}
                                  {draft.targetRepsMode === "max" ? "MAX" : draft.targetReps || "–"}{" "}
                                  {getExerciseMeasurementShortLabel(exercise.type)}
                                </div>
                              </div>
                            </button>
                            <div style={exerciseCompactActionsStyle}>
                              <button
                                type="button"
                                onClick={() => handleMoveExerciseInPass(exercise.id, "up")}
                                style={exerciseIconButtonStyle}
                                title="Flytta upp"
                              >↑</button>
                              <button
                                type="button"
                                onClick={() => handleMoveExerciseInPass(exercise.id, "down")}
                                style={exerciseIconButtonStyle}
                                title="Flytta ner"
                              >↓</button>
                              <button
                                type="button"
                                onClick={() => handleRemoveExerciseFromPass(exercise.id)}
                                style={{ ...exerciseIconButtonStyle, color: "#b91c1c" }}
                                title="Ta bort"
                              >✕</button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setShowExercisePicker(true)
                      setEditingExerciseId(null)
                      setExerciseSearchValue("")
                      setSelectedExerciseCategory("alla")
                      setSelectedExerciseId("")
                    }}
                    style={{ ...buttonStyle, width: "100%" }}
                  >
                    + Lägg till övning
                  </button>
                </div>
              )}

              {/* RIGHT PANEL: Picker or Editor */}
              {(!isMobile || editingExerciseId || showExercisePicker) && (
                <div style={exercisesEditorPanelStyle(isMobile)}>

                  {isMobile && (
                    <button
                      type="button"
                      onClick={() => { setEditingExerciseId(null); setShowExercisePicker(false) }}
                      style={{ ...secondaryButtonStyle, marginBottom: "14px" }}
                    >
                      ← Tillbaka till listan
                    </button>
                  )}

                  {showExercisePicker ? (
                    <div style={{ display: "grid", gap: "12px" }}>
                      <div style={sectionTitleStyle}>Lägg till övning</div>

                      {availableHrgPrograms.length > 0 && (
                        <div style={hrgQuickAddCardStyle}>
                          <div style={hrgQuickAddHeaderStyle}>
                            <div style={fieldLabelStyle}>Snabbval HRG</div>
                            <div style={hrgQuickAddHintStyle}>
                              Lägger in A-övningarna som huvudövningar och B-E som alternativ.
                            </div>
                          </div>

                          <div style={hrgQuickAddGridStyle(isMobile)}>
                            {availableHrgPrograms.map((program) => (
                              <button
                                key={program.program}
                                type="button"
                                onClick={() => handleQuickAddHrgProgram(program.program)}
                                disabled={isSavingPassExercise || !selectedTemplateCode}
                                style={{
                                  ...hrgQuickAddButtonStyle,
                                  opacity:
                                    isSavingPassExercise || !selectedTemplateCode ? 0.7 : 1,
                                }}
                              >
                                <div style={hrgQuickAddTitleStyle}>{program.program}</div>
                                <div style={hrgQuickAddMetaStyle}>
                                  {program.baseCount} block • {program.alternativeCount} alternativ
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

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
                              width: "100%",
                              opacity: isSavingPassExercise || !selectedTemplateCode || !selectedExerciseId ? 0.7 : 1,
                            }}
                          >
                            {isSavingPassExercise ? "Lägger till..." : "Lägg till vald övning"}
                          </button>
                        </div>
                      )}
                    </div>
                  ) : editingExerciseId ? (() => {
                    const exercise = (currentWorkout?.exercises || []).find(
                      (e) => String(e.id) === String(editingExerciseId)
                    )
                    if (!exercise) return null

                    const draft = {
                      guide: exercise.guide || "",
                      targetSets: exercise.targetSets ?? "",
                      targetReps: getDraftTargetRepsValue(exercise, passExerciseDrafts),
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
                    const isAlternativesExpanded = String(expandedAlternativesId) === String(exercise.id)
                    const protocolConfig = getExerciseProtocolConfig(exercise)
                    const isProtocol = isProtocolExercise(exercise)
                    const repRangeHintBucket =
                      draft.targetRepsMode === "max" || exercise.type === "seconds_only" || isProtocol
                        ? null
                        : getRepRangeHintBucket(draft.targetReps)
                    const selectedStandardRepRange =
                      draft.targetRepsMode === "max" || exercise.type === "seconds_only" || isProtocol
                        ? ""
                        : getSelectedStandardRepRangeValue(draft.targetReps)

                    return (
                      <div style={formStackStyle}>
                        <div style={exerciseEditorTitleStyle}>
                          {getExerciseDisplayName(exercise)}
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

                        <div>
                          <div style={fieldLabelStyle}>
                            Instruktion{" "}
                            <span style={fieldHintInlineStyle}>(lämna tom för standardtext från övningsbanken)</span>
                          </div>
                          <textarea
                            rows={3}
                            value={draft.guide}
                            onChange={(e) => handlePassExerciseDraftChange(exercise.id, "guide", e.target.value)}
                            style={{ ...inputStyle, ...textareaStyle, width: "100%", minHeight: "84px" }}
                          />
                        </div>

                        {isProtocol ? (
                          <div
                            style={{
                              padding: "14px",
                              borderRadius: "16px",
                              border: "1px solid #f1d3d3",
                              backgroundColor: "#fff7f7",
                              display: "grid",
                              gap: "10px",
                            }}
                          >
                            <div style={{ ...fieldLabelStyle, marginBottom: 0 }}>Fast protokoll</div>
                            <div style={{ ...mutedTextStyle, fontSize: "13px" }}>
                              Den här övningen använder fasta block i spelarläget och styrs inte av vanliga set och reps.
                            </div>
                            <div style={{ display: "grid", gap: "8px" }}>
                              {(protocolConfig?.steps || []).map((step) => (
                                <div
                                  key={`${exercise.id}-${step.order}`}
                                  style={{
                                    padding: "10px 12px",
                                    borderRadius: "12px",
                                    border: "1px solid #eadfdf",
                                    backgroundColor: "#ffffff",
                                    fontSize: "14px",
                                    color: "#18202b",
                                    fontWeight: "700",
                                  }}
                                >
                                  {step.summary}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
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
                              <div style={fieldLabelStyle}>
                                {getExerciseMeasurementLabelWithSide(exercise.type, exercise.executionSide)}
                              </div>
                              <input
                                type="text"
                                value={draft.targetReps}
                                disabled={draft.targetRepsMode === "max"}
                                onChange={(e) => handlePassExerciseDraftChange(exercise.id, "targetReps", e.target.value)}
                                style={{
                                  ...inputStyle,
                                  width: "100%",
                                  opacity: draft.targetRepsMode === "max" ? 0.5 : 1,
                                }}
                              />
                              {exercise.executionSide && exercise.executionSide !== "standard" && (
                                <div style={{ ...mutedTextStyle, marginTop: "6px", fontSize: "12px" }}>
                                  {getExerciseExecutionHint(exercise.type, exercise.executionSide)}
                                </div>
                              )}
                              {repRangeHintBucket && (
                                <div style={{ ...mutedTextStyle, marginTop: "6px", fontSize: "12px" }}>
                                  Tolkas som standardintervall {repRangeHintBucket.label} för målvikt och framtida
                                  rekommendationer.
                                </div>
                              )}
                              {exercise.type !== "seconds_only" && (
                                <div style={{ marginTop: "8px" }}>
                                  <div style={{ ...fieldLabelStyle, marginBottom: "4px" }}>Snabbval rep-range</div>
                                  <select
                                    value={selectedStandardRepRange}
                                    disabled={draft.targetRepsMode === "max"}
                                    onChange={(e) => {
                                      const nextBucket = REP_RANGE_BUCKETS.find(
                                        (bucket) => bucket.key === e.target.value
                                      )
                                      handlePassExerciseDraftChange(
                                        exercise.id,
                                        "targetReps",
                                        nextBucket ? getRepRangeValue(nextBucket) : ""
                                      )
                                    }}
                                    style={{
                                      ...inputStyle,
                                      width: "100%",
                                      opacity: draft.targetRepsMode === "max" ? 0.5 : 1,
                                    }}
                                  >
                                    <option value="">Skriv fritt eller välj standardintervall</option>
                                    {REP_RANGE_BUCKETS.map((bucket) => (
                                      <option key={bucket.key} value={bucket.key}>
                                        {bucket.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              )}
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
                        )}

                        <div style={alternativeBlockStyle}>
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedAlternativesId((current) =>
                                String(current) === String(exercise.id) ? null : exercise.id
                              )
                            }
                            style={alternativesAccordionButtonStyle}
                          >
                            <div style={alternativeBlockTitleStyle}>
                              Alternativa övningar ({(exercise.alternativeExercises || []).length})
                            </div>
                            <div style={alternativesAccordionChevronStyle}>
                              {isAlternativesExpanded ? "−" : "+"}
                            </div>
                          </button>

                          {isAlternativesExpanded && (
                            <>
                              <div style={alternativeBlockHintStyle}>
                                Lägg till alternativ som spelaren kan välja mellan i passet.
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
                                    cursor: isSavingPassExercise || !selectedAlternativeId ? "default" : "pointer",
                                  }}
                                >
                                  {isSavingPassExercise ? "Sparar..." : "Lägg till alternativ"}
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })() : (
                    <div style={exercisesEditorEmptyStyle}>
                      <div style={exercisesEditorEmptyTextStyle}>
                        Välj en övning i listan för att redigera, eller lägg till en ny övning.
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
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
              {passKeys.filter((key) => (activeWorkouts[key]?.workoutKind || "gym") === "gym").length}
            </div>
          </div>
          <div style={summaryStatCardStyle}>
            <div style={summaryStatLabelStyle}>Skadeförebyggande</div>
            <div style={summaryStatValueStyle}>
              {passKeys.filter((key) => activeWorkouts[key]?.workoutKind === "prehab").length}
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
                  <div
                    key={passKey}
                    style={{
                      ...selectedPassInlineCardStyle,
                      border: isSelected ? "2px solid #c62828" : "1px solid #e5e7eb",
                      backgroundColor: isSelected ? "#fff7f7" : "#ffffff",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedTemplateCode(isSelected ? "" : passKey)}
                      style={passCardButtonStyle}
                    >
                      <div style={passCardHeaderStyle}>
                        <div>
                          <div style={passCardTitleStyle}>{workout.label}</div>
                          <div style={passCardMetaStyle}>
                            {workout.workoutKind === "running"
                              ? `Löppass • ${buildRunningWorkoutSummary(
                                  workout.workoutKind,
                                  workout.runningType,
                                  workout.runningConfig
                                )}`
                              : `${getWorkoutKindLabel(workout.workoutKind)} • ${(workout.exercises || []).length} övningar`}
                          </div>
                        </div>
                        <div
                          style={{
                            ...chipStyle,
                            backgroundColor: isSelected ? "#c62828" : "#f3f4f6",
                            color: isSelected ? "#ffffff" : "#4b5563",
                          }}
                        >
                          {isSelected ? "Öppet" : "Öppna"}
                        </div>
                      </div>
                    </button>

                    {isSelected ? (
                      <div style={selectedPassInlineContentStyle}>
                        <div style={panelHeaderStyle}>
                          <div>
                            <div style={sectionEyebrowStyle}>Valt pass</div>
                            <div style={sectionTitleStyle}>{workout.label}</div>
                          </div>
                          <div style={selectedPassActionsStyle(isMobile)}>
                            <button
                              type="button"
                              onClick={() => setIsAssignMenuOpen((current) => !current)}
                              style={{ ...secondaryButtonStyle, width: isMobile ? "100%" : "auto" }}
                            >
                              {isAssignMenuOpen ? "Stäng tilldelning" : "Tilldela pass"}
                            </button>
                            <button
                              type="button"
                              onClick={openEditView}
                              style={{ ...buttonStyle, width: isMobile ? "100%" : "auto" }}
                            >
                              Redigera pass
                            </button>
                          </div>
                        </div>

                        <div style={selectedPassInfoStyle}>
                          <div style={selectedPassMetricStyle}>
                            <div style={selectedPassMetricLabelStyle}>Kategori</div>
                            <div style={selectedPassMetricValueStyle}>{getWorkoutKindLabel(workout.workoutKind)}</div>
                          </div>

                          <div style={selectedPassMetricStyle}>
                            <div style={selectedPassMetricLabelStyle}>
                              {workout.workoutKind === "running" ? "Typ" : "Övningar"}
                            </div>
                            <div style={selectedPassMetricValueStyle}>
                              {workout.workoutKind === "running" ? "Löpning" : (workout.exercises || []).length}
                            </div>
                          </div>

                          {workout.info ? (
                            <div style={selectedPassDescriptionStyle}>{workout.info}</div>
                          ) : (
                            <div style={selectedPassEmptyStyle}>Ingen passinfo tillagd ännu.</div>
                          )}

                          <div style={selectedPassExerciseListCardStyle}>
                            <div style={selectedPassMetricLabelStyle}>
                              {workout.workoutKind === "running" ? "Löppass" : "Övningar i passet"}
                            </div>

                            {workout.workoutKind === "running" ? (
                              <div style={selectedPassDescriptionStyle}>
                                {buildRunningWorkoutSummary(
                                  workout.workoutKind,
                                  workout.runningType,
                                  workout.runningConfig
                                )}
                              </div>
                            ) : (workout.exercises || []).length > 0 ? (
                              <div style={selectedPassExerciseListStyle}>
                                {(workout.exercises || []).map((exercise, index) => (
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

                          {isAssignMenuOpen ? (
                            <div style={assignmentPanelStyle}>
                              <div style={assignmentPanelHeaderStyle(isMobile)}>
                                <div>
                                  <div style={selectedPassMetricLabelStyle}>Tilldela till spelare</div>
                                  <div style={assignmentHelperTextStyle}>
                                    Markerade spelare har passet. Kryssa ur och spara för att ta bort tilldelningen.
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={handleSelectAllPlayersForAssignment}
                                  style={{ ...buttonStyle, width: isMobile ? "100%" : "auto" }}
                                  disabled={assignablePlayers.length === 0}
                                >
                                  Välj alla
                                </button>
                              </div>

                              {assignablePlayers.length === 0 ? (
                                <div style={selectedPassEmptyStyle}>Det finns inga aktiva spelare att tilldela passet till.</div>
                              ) : (
                                <>
                                  <div style={assignmentPickerStyle}>
                                    {assignablePlayers.map((player) => {
                                      const isChecked = selectedAssignPlayerIds.includes(player.id)

                                      return (
                                        <label
                                          key={player.id}
                                          style={{
                                            ...assignmentPlayerRowStyle,
                                            borderColor: isChecked ? "#c62828" : "#e5e7eb",
                                            backgroundColor: isChecked ? "#fff7f7" : "#ffffff",
                                          }}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => toggleAssignPlayer(player.id)}
                                          />
                                          <span style={assignmentPlayerNameStyle}>
                                            {player.full_name || player.username}
                                          </span>
                                        </label>
                                      )
                                    })}
                                  </div>

                                  <div style={assignmentFooterStyle(isMobile)}>
                                    <div style={assignmentHelperTextStyle}>
                                      {selectedAssignPlayerIds.length === 0
                                        ? "Inga spelare valda ännu."
                                        : `${selectedAssignPlayerIds.length} spelare markerade.`}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={handleSaveAssignmentSelection}
                                      style={{ ...buttonStyle, width: isMobile ? "100%" : "auto" }}
                                      disabled={!hasAssignmentSelectionChanged}
                                    >
                                      Spara
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
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

const hrgQuickAddCardStyle = {
  padding: "14px 16px",
  borderRadius: "16px",
  border: "1px solid rgba(198, 40, 40, 0.12)",
  backgroundColor: "#fff7f7",
  display: "grid",
  gap: "12px",
}

const hrgQuickAddHeaderStyle = {
  display: "grid",
  gap: "4px",
}

const hrgQuickAddHintStyle = {
  fontSize: "12px",
  color: "#7f1d1d",
}

const hrgQuickAddGridStyle = (isMobile) => ({
  display: "grid",
  gap: "10px",
  gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
})

const hrgQuickAddButtonStyle = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: "14px",
  border: "1px solid rgba(198, 40, 40, 0.16)",
  backgroundColor: "#ffffff",
  display: "grid",
  gap: "4px",
  textAlign: "left",
  cursor: "pointer",
}

const hrgQuickAddTitleStyle = {
  fontSize: "15px",
  fontWeight: "800",
  color: "#18202b",
}

const hrgQuickAddMetaStyle = {
  fontSize: "12px",
  color: "#64748b",
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
  width: "100%",
  border: "none",
  background: "transparent",
  padding: "14px",
  textAlign: "left",
  cursor: "pointer",
}

const selectedPassInlineCardStyle = {
  borderRadius: "16px",
  backgroundColor: "#ffffff",
  overflow: "hidden",
}

const passCardHeaderStyle = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "12px",
}

const selectedPassInlineContentStyle = {
  display: "grid",
  gap: "12px",
  padding: "0 14px 14px",
  borderTop: "1px solid #f0dada",
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

const selectedPassActionsStyle = (isMobile) => ({
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  width: isMobile ? "100%" : "auto",
  flexDirection: isMobile ? "column" : "row",
})

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

const assignmentPanelStyle = {
  padding: "14px",
  borderRadius: "16px",
  border: "1px solid #f0dada",
  backgroundColor: "#fffafa",
  display: "grid",
  gap: "12px",
}

const assignmentPanelHeaderStyle = (isMobile) => ({
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "10px",
  flexWrap: "wrap",
  flexDirection: isMobile ? "column" : "row",
})

const assignmentHelperTextStyle = {
  fontSize: "13px",
  color: "#6b7280",
  lineHeight: 1.5,
}

const assignmentPickerStyle = {
  display: "grid",
  gap: "8px",
  maxHeight: "260px",
  overflowY: "auto",
  paddingRight: "2px",
}

const assignmentPlayerRowStyle = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding: "12px 14px",
  borderRadius: "14px",
  border: "1px solid #e5e7eb",
  cursor: "pointer",
}

const assignmentPlayerNameStyle = {
  fontSize: "14px",
  fontWeight: "700",
  color: "#18202b",
}

const assignmentFooterStyle = (isMobile) => ({
  display: "flex",
  alignItems: isMobile ? "stretch" : "center",
  justifyContent: "space-between",
  gap: "10px",
  flexWrap: "wrap",
  flexDirection: isMobile ? "column" : "row",
})

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

const exercisesMasterDetailStyle = (isMobile) => ({
  display: "grid",
  gridTemplateColumns: isMobile ? "1fr" : "260px 1fr",
  border: "1px solid #e5e7eb",
  borderRadius: "16px",
  overflow: "hidden",
})

const exercisesListPanelStyle = (isMobile) => ({
  display: "grid",
  gap: "10px",
  padding: "14px",
  borderRight: isMobile ? "none" : "1px solid #e5e7eb",
  borderBottom: isMobile ? "1px solid #e5e7eb" : "none",
  backgroundColor: "#fafafa",
  alignContent: "start",
})

const exercisesEditorPanelStyle = (isMobile) => ({
  padding: isMobile ? "14px" : "20px",
  backgroundColor: "#ffffff",
  minWidth: 0,
})

const exerciseCompactListStyle = {
  display: "grid",
  gap: "6px",
}

const exerciseCompactRowStyle = {
  display: "flex",
  alignItems: "center",
  borderRadius: "12px",
  overflow: "hidden",
}

const exerciseCompactRowButtonStyle = {
  flex: 1,
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding: "10px",
  border: "none",
  background: "transparent",
  textAlign: "left",
  cursor: "pointer",
  minWidth: 0,
}

const exerciseCompactIndexStyle = {
  width: "22px",
  height: "22px",
  flexShrink: 0,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "999px",
  backgroundColor: "#fff1f1",
  color: "#991b1b",
  fontSize: "11px",
  fontWeight: "800",
}

const exerciseCompactInfoStyle = {
  minWidth: 0,
}

const exerciseCompactNameStyle = {
  fontSize: "13px",
  fontWeight: "800",
  color: "#18202b",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
}

const exerciseCompactMetaStyle = {
  fontSize: "11px",
  color: "#6b7280",
  marginTop: "2px",
}

const exerciseCompactActionsStyle = {
  display: "flex",
  gap: "2px",
  padding: "0 6px",
  flexShrink: 0,
}

const exerciseIconButtonStyle = {
  width: "28px",
  height: "28px",
  borderRadius: "8px",
  border: "1px solid #e5e7eb",
  backgroundColor: "#ffffff",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "13px",
  cursor: "pointer",
  color: "#374151",
}

const exerciseEditorTitleStyle = {
  fontSize: "18px",
  fontWeight: "900",
  color: "#18202b",
  paddingBottom: "12px",
  borderBottom: "1px solid #e5e7eb",
  marginBottom: "2px",
}

const fieldHintInlineStyle = {
  fontSize: "11px",
  fontWeight: "600",
  color: "#9ca3af",
}

const alternativesAccordionButtonStyle = {
  width: "100%",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: 0,
  border: "none",
  background: "transparent",
  cursor: "pointer",
  textAlign: "left",
}

const alternativesAccordionChevronStyle = {
  width: "24px",
  height: "24px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "8px",
  backgroundColor: "#e2e8f0",
  color: "#64748b",
  fontSize: "16px",
  fontWeight: "700",
  flexShrink: 0,
}

const exercisesEditorEmptyStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "32px 16px",
  minHeight: "200px",
}

const exercisesEditorEmptyTextStyle = {
  fontSize: "14px",
  color: "#9ca3af",
  textAlign: "center",
  lineHeight: 1.6,
}

export default PassBuilderPage
