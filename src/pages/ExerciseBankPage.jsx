import { useEffect, useMemo, useState } from "react"

const normalizeExerciseSearchValue = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[åä]/g, "a")
    .replace(/ö/g, "o")
    .replace(/[\s\-_]+/g, "")
    .replace(/[^a-z0-9]/g, "")

const getExerciseDisplayName = (exercise) =>
  exercise?.display_name || exercise?.displayName || exercise?.name || ""

const muscleGroupOptions = [
  "Helkropp",
  "Ben",
  "Baksida lår",
  "Säte",
  "Bröst",
  "Rygg",
  "Lats",
  "Armar",
  "Axlar",
  "Biceps",
  "Triceps",
  "Bål",
  "Balans",
  "Rotation",
  "Explosivitet",
  "Grepp",
  "Kondition",
  "Rörlighet",
]

const exerciseCategoryOptions = [
  { key: "alla", label: "Alla" },
  { key: "styrka", label: "Styrka" },
  { key: "bal", label: "Bål" },
  { key: "overkropp", label: "Överkropp" },
  { key: "underkropp", label: "Underkropp" },
  { key: "rorlighet_kontroll", label: "Rörlighet / kontroll" },
  { key: "kondition_tid", label: "Kondition / tid" },
]

const normalizeExercisePrimaryCategory = (value) => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")

  if (normalized === "bal") return "bal"
  if (normalized === "overkropp") return "overkropp"
  if (normalized === "underkropp") return "underkropp"
  if (normalized === "rorlighet_kontroll" || normalized === "rorlighetkontroll") return "rorlighet_kontroll"
  if (normalized === "kondition_tid" || normalized === "konditiontid") return "kondition_tid"
  if (normalized === "styrka") return "styrka"

  return ""
}

const deriveExercisePrimaryCategory = (exercise) => {
  const explicitCategory = normalizeExercisePrimaryCategory(exercise?.primary_category)
  if (explicitCategory) return explicitCategory

  const muscleGroups = Array.isArray(exercise?.muscle_groups) ? exercise.muscle_groups : []
  const exerciseType = exercise?.exercise_type || ""

  if (muscleGroups.includes("Bål")) return "bal"
  if (muscleGroups.some((group) => ["Balans", "Rotation", "Rörlighet"].includes(group))) {
    return "rorlighet_kontroll"
  }
  if (exerciseType === "seconds_only" || muscleGroups.includes("Kondition")) return "kondition_tid"
  if (muscleGroups.some((group) => ["Ben", "Säte", "Baksida lår"].includes(group))) return "underkropp"
  if (
    muscleGroups.some((group) =>
      ["Bröst", "Rygg", "Lats", "Axlar", "Armar", "Biceps", "Triceps"].includes(group)
    )
  ) {
    return "overkropp"
  }
  if (exerciseType === "weight_reps") return "styrka"

  return "styrka"
}

const getExercisePrimaryCategoryLabel = (value) =>
  exerciseCategoryOptions.find((option) => option.key === value)?.label || "Styrka"

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

const getExerciseNavigationCategory = (exercise) => {
  const muscleGroups = Array.isArray(exercise?.muscle_groups) ? exercise.muscle_groups : []
  const firstGroup = muscleGroups[0]

  if (firstGroup === "Bål") return "Mage"
  if (firstGroup) return firstGroup
  if (muscleGroups.includes("Kondition") || exercise?.exercise_type === "seconds_only") return "Kondition"
  return "Övrigt"
}

function ExerciseBankPage({
  canManageExercises,
  canRequestExercises,
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
  newExerciseAliasesText,
  setNewExerciseAliasesText,
  newExerciseDisplayName,
  setNewExerciseDisplayName,
  newExercisePrimaryCategory,
  setNewExercisePrimaryCategory,
  editingExerciseId,
  isSavingExercise,
  handleCreateExercise,
  handleStartEditExercise,
  handleDeleteExercise,
  resetExerciseForm,
  importedExercises,
  exerciseImportFileName,
  isParsingExerciseImportFile,
  isImportingExercises,
  exerciseImportResults,
  handleExerciseImportFile,
  handleImportExercises,
  handleExportExercises,
  resetExerciseImport,
  exercisesFromDB,
  exerciseRequests,
  users,
  teams,
  isLoadingExerciseRequests,
  updatingExerciseRequestId,
  isSubmittingExerciseRequest,
  handleRefreshExerciseRequests,
  handleSubmitExerciseRequest,
  handleUpdateExerciseRequestStatus,
  inputStyle,
  buttonStyle,
  secondaryButtonStyle,
  mutedTextStyle,
  cardTitleStyle,
  isMobile,
}) {
  const [adminSection, setAdminSection] = useState("exercises")
  const [searchValue, setSearchValue] = useState("")
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("alla")
  const [selectedMuscleFilter, setSelectedMuscleFilter] = useState("Alla")
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false)
  const [expandedExerciseId, setExpandedExerciseId] = useState(null)
  const [isRequestFormOpen, setIsRequestFormOpen] = useState(false)
  const [requestName, setRequestName] = useState("")
  const [requestExerciseType, setRequestExerciseType] = useState("weight_reps")
  const [requestRepsMode, setRequestRepsMode] = useState("fixed")
  const [requestDescription, setRequestDescription] = useState("")
  const [requestEquipment, setRequestEquipment] = useState("")
  const [requestReferenceUrl, setRequestReferenceUrl] = useState("")
  const [requestMuscleGroups, setRequestMuscleGroups] = useState([])
  const [requestStatusFilter, setRequestStatusFilter] = useState("all")
  const [requestSortMode, setRequestSortMode] = useState("newest")
  const [exerciseImportInputKey, setExerciseImportInputKey] = useState(0)

  const userMap = useMemo(
    () =>
      (users || []).reduce((acc, entry) => {
        acc[entry.id] = entry
        return acc
      }, {}),
    [users]
  )

  const teamMap = useMemo(
    () =>
      (teams || []).reduce((acc, team) => {
        acc[team.id] = team.name
        return acc
      }, {}),
    [teams]
  )

  const filteredExercises = exercisesFromDB.filter((exercise) => {
    const exerciseMuscleGroups = Array.isArray(exercise.muscle_groups) ? exercise.muscle_groups : []
    const aliases = Array.isArray(exercise.aliases) ? exercise.aliases : []
    const normalizedSearch = normalizeExerciseSearchValue(searchValue.trim())
    const navigationCategory = getExerciseNavigationCategory(exercise)
    const searchFields = [
      exercise.name,
      exercise.display_name,
      navigationCategory,
      ...aliases,
      exercise.exercise_type,
      ...exerciseMuscleGroups,
    ]
    const normalizedHaystack = searchFields.map((entry) => normalizeExerciseSearchValue(entry)).join(" ")
    const matchesSearch =
      !normalizedSearch || normalizedHaystack.includes(normalizedSearch)
    const matchesCategory =
      normalizedSearch || selectedCategoryFilter === "alla" || navigationCategory === selectedCategoryFilter
    const matchesFilter =
      selectedMuscleFilter === "Alla" || exerciseMuscleGroups.includes(selectedMuscleFilter)

    return matchesSearch && matchesCategory && matchesFilter
  })

  const visibleNavigationCategories = useMemo(() => {
    const counts = exercisesFromDB.reduce((acc, exercise) => {
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

  const hasActiveSearch = Boolean(searchValue.trim())
  const isShowingCategoryOverview = !hasActiveSearch && selectedCategoryFilter === "alla"
  const selectedCategoryLabel = selectedCategoryFilter === "alla" ? "" : selectedCategoryFilter

  const visibleRequests = useMemo(() => {
    const filtered =
      requestStatusFilter === "all"
        ? exerciseRequests || []
        : (exerciseRequests || []).filter((item) => (item.status || "open") === requestStatusFilter)

    const next = filtered.slice()

    if (requestSortMode === "oldest") {
      next.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      return next
    }

    if (requestSortMode === "status") {
      const statusOrder = { open: 0, future: 1, done: 2, wont_do: 3 }
      next.sort((a, b) => {
        const statusDiff = (statusOrder[a.status || "open"] ?? 99) - (statusOrder[b.status || "open"] ?? 99)
        if (statusDiff !== 0) return statusDiff
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
      return next
    }

    next.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    return next
  }, [exerciseRequests, requestSortMode, requestStatusFilter])

  const requestStatusCounts = (exerciseRequests || []).reduce(
    (acc, item) => {
      acc[item.status || "open"] = (acc[item.status || "open"] || 0) + 1
      return acc
    },
    { open: 0, future: 0, done: 0, wont_do: 0 }
  )

  const exerciseTypeLabel = (type) => {
    if (type === "weight_reps") return "Vikt + reps"
    if (type === "seconds_only") return "Tid / sekunder"
    return "Kroppsvikt + reps"
  }

  const repsModeLabel = (mode) => {
    return mode === "max" ? "Till failure / max" : "Fast reps"
  }

  const toggleMuscleGroup = (group) => {
    setNewExerciseMuscleGroups((prev) =>
      prev.includes(group)
        ? prev.filter((item) => item !== group)
        : [...prev, group]
    )
  }

  const toggleRequestMuscleGroup = (group) => {
    setRequestMuscleGroups((prev) =>
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

  const clearExerciseImport = () => {
    resetExerciseImport()
    setExerciseImportInputKey((prev) => prev + 1)
  }

  const resetRequestForm = () => {
    setRequestName("")
    setRequestExerciseType("weight_reps")
    setRequestRepsMode("fixed")
    setRequestDescription("")
    setRequestEquipment("")
    setRequestReferenceUrl("")
    setRequestMuscleGroups([])
  }

  const closeRequestForm = () => {
    resetRequestForm()
    setIsRequestFormOpen(false)
  }

  const submitRequest = async () => {
    const didSave = await handleSubmitExerciseRequest({
      name: requestName,
      exercise_type: requestExerciseType,
      reps_mode: requestRepsMode,
      muscle_groups: requestMuscleGroups,
      description: requestDescription,
      equipment: requestEquipment,
      reference_url: requestReferenceUrl,
    })

    if (didSave) {
      closeRequestForm()
    }
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
        {canManageExercises
          ? "Hantera övningar för hela föreningen och gå till Requests för att behandla förslag från tränare."
          : canRequestExercises
          ? "Här ser du övningarna som kan användas i pass. Om något saknas kan du skicka en request till huvudadmin."
          : "Här ser du övningarna som kan användas när du bygger pass för ditt lag."}
      </p>

      {canManageExercises && (
        <div style={adminTabsWrapStyle}>
          <button
            type="button"
            onClick={() => setAdminSection("exercises")}
            style={{
              ...adminTabStyle,
              ...(adminSection === "exercises" ? activeAdminTabStyle : {}),
            }}
          >
            Övningar
          </button>
          <button
            type="button"
            onClick={() => setAdminSection("import")}
            style={{
              ...adminTabStyle,
              ...(adminSection === "import" ? activeAdminTabStyle : {}),
            }}
          >
            Import / Export
          </button>
          <button
            type="button"
            onClick={() => setAdminSection("requests")}
            style={{
              ...adminTabStyle,
              ...(adminSection === "requests" ? activeAdminTabStyle : {}),
            }}
          >
            Requests ({exerciseRequests.length})
          </button>
        </div>
      )}

      {canRequestExercises && (
        <div style={formCardStyle(isMobile)}>
          <div
            style={{
              ...sectionHeaderStyle,
              flexDirection: isMobile ? "column" : "row",
              alignItems: isMobile ? "stretch" : sectionHeaderStyle.alignItems,
            }}
          >
            <div>
              <div style={sectionEyebrowStyle}>Ny request</div>
              <div style={sectionTitleStyle}>Requesta ny övning</div>
            </div>

            <button
              type="button"
              onClick={() => setIsRequestFormOpen((prev) => !prev)}
              style={{ ...buttonStyle, width: isMobile ? "100%" : "auto", minHeight: "46px" }}
            >
              {isRequestFormOpen ? "Stäng formulär" : "Skicka request"}
            </button>
          </div>

          {isRequestFormOpen && (
            <>
              <input
                type="text"
                placeholder="Namn på övningen"
                value={requestName}
                onChange={(event) => setRequestName(event.target.value)}
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
                  value={requestExerciseType}
                  onChange={(event) => setRequestExerciseType(event.target.value)}
                  style={{ ...inputStyle, width: "100%" }}
                >
                  <option value="weight_reps">Vikt + reps</option>
                  <option value="reps_only">Kroppsvikt + reps</option>
                  <option value="seconds_only">Tid / sekunder</option>
                </select>

                <select
                  value={requestRepsMode}
                  onChange={(event) => setRequestRepsMode(event.target.value)}
                  style={{ ...inputStyle, width: "100%" }}
                >
                  <option value="fixed">Mål sätts i reps</option>
                  <option value="max">Mål sätts till failure / max</option>
                </select>
              </div>

              <div style={{ marginBottom: "12px" }}>
                <div style={fieldLabelStyle}>Primära muskelgrupper</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {muscleGroupOptions.map((group) => {
                    const isSelected = requestMuscleGroups.includes(group)

                    return (
                      <button
                        key={group}
                        type="button"
                        onClick={() => toggleRequestMuscleGroup(group)}
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
              </div>

              <textarea
                rows={3}
                placeholder="Kort beskrivning av övningen"
                value={requestDescription}
                onChange={(event) => setRequestDescription(event.target.value)}
                style={{ ...inputStyle, width: "100%", marginBottom: "10px", resize: "vertical", minHeight: "84px" }}
              />

              <input
                type="text"
                placeholder="Utrustning som behövs (valfritt)"
                value={requestEquipment}
                onChange={(event) => setRequestEquipment(event.target.value)}
                style={{ ...inputStyle, width: "100%", marginBottom: "10px" }}
              />

              <input
                type="url"
                placeholder="Referenslänk eller video (valfritt)"
                value={requestReferenceUrl}
                onChange={(event) => setRequestReferenceUrl(event.target.value)}
                style={{ ...inputStyle, width: "100%", marginBottom: "10px" }}
              />

              <div style={requestHelpTextStyle}>
                Extra fält som utrustning och referenslänk gör det enklare för huvudadmin att bygga in övningen rätt från början.
              </div>

              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={submitRequest}
                  style={{ ...buttonStyle, width: isMobile ? "100%" : "auto", minHeight: "48px" }}
                >
                  {isSubmittingExerciseRequest ? "Skickar..." : "Skicka request"}
                </button>

                <button
                  type="button"
                  onClick={closeRequestForm}
                  style={{ ...secondaryButtonStyle, width: isMobile ? "100%" : "auto", minHeight: "48px" }}
                >
                  Avbryt
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {canManageExercises && adminSection === "requests" ? (
        <div style={requestsWrapStyle}>
          <div style={requestsHeaderStyle(isMobile)}>
            <div>
              <div style={sectionTitleStyle}>Övningsrequests</div>
              <div style={requestMetaTextStyle}>
                Requests från tränare kan klarmarkeras, flyttas till framtida åtgärder eller avfärdas.
              </div>
            </div>

            <button
              type="button"
              onClick={handleRefreshExerciseRequests}
              style={secondaryButtonStyle}
            >
              Ladda om
            </button>
          </div>

          <div style={requestFilterCardStyle}>
            <div style={requestFilterRowStyle(isMobile)}>
              <div style={requestFilterGroupStyle}>
                <div style={filterLabelStyle}>Status</div>
                <div style={chipRowStyle}>
                  {[
                    { key: "all", label: `Alla (${exerciseRequests.length})` },
                    { key: "open", label: `Öppna (${requestStatusCounts.open})` },
                    { key: "future", label: `Framtida (${requestStatusCounts.future})` },
                    { key: "done", label: `Klara (${requestStatusCounts.done})` },
                    { key: "wont_do", label: `Avfärdade (${requestStatusCounts.wont_do})` },
                  ].map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setRequestStatusFilter(option.key)}
                      style={{
                        ...filterChipStyle,
                        ...(requestStatusFilter === option.key ? activeFilterChipStyle : {}),
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={requestFilterGroupStyle}>
                <div style={filterLabelStyle}>Sortera</div>
                <div style={chipRowStyle}>
                  {[
                    { key: "newest", label: "Nyast först" },
                    { key: "oldest", label: "Äldst först" },
                    { key: "status", label: "Efter status" },
                  ].map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setRequestSortMode(option.key)}
                      style={{
                        ...filterChipStyle,
                        ...(requestSortMode === option.key ? activeFilterChipStyle : {}),
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div style={requestListStyle}>
            {isLoadingExerciseRequests ? (
              <p style={mutedTextStyle}>Laddar requests...</p>
            ) : visibleRequests.length === 0 ? (
              <p style={mutedTextStyle}>Inga requests matchar det valda filtret.</p>
            ) : (
              visibleRequests.map((item) => {
                const author = userMap[item.requester_id]
                const isUpdating = updatingExerciseRequestId === item.id
                const status = item.status || "open"

                return (
                  <div key={item.id} style={requestCardStyle}>
                    <div style={requestCardHeaderStyle(isMobile)}>
                      <div>
                        <div style={requestTitleStyle}>{item.name}</div>
                        <div style={requestMetaTextStyle}>
                          {author?.full_name || "Okänd användare"}
                          {author?.username ? ` (@${author.username})` : ""}
                          {author?.role ? ` • ${getRoleLabel(author.role)}` : ""}
                          {teamMap[item.team_id] ? ` • ${teamMap[item.team_id]}` : ""}
                        </div>
                      </div>

                      <div style={requestHeaderAsideStyle}>
                        <div style={{ ...statusBadgeStyle, ...getStatusBadgeStyle(status) }}>
                          {getStatusLabel(status)}
                        </div>
                        <div style={requestDateStyle}>{formatRequestDate(item.created_at)}</div>
                        {item.status_updated_at && (
                          <div style={requestUpdatedStyle}>
                            Uppdaterad {formatRequestDate(item.status_updated_at)}
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={requestDetailRowStyle}>
                      <span style={requestDetailLabelStyle}>Typ</span>
                      <span style={requestDetailValueStyle}>{exerciseTypeLabel(item.exercise_type)}</span>
                    </div>
                    <div style={requestDetailRowStyle}>
                      <span style={requestDetailLabelStyle}>Repsläge</span>
                      <span style={requestDetailValueStyle}>{repsModeLabel(item.reps_mode)}</span>
                    </div>
                    <div style={requestDetailRowStyle}>
                      <span style={requestDetailLabelStyle}>Muskelgrupper</span>
                      <span style={requestDetailValueStyle}>
                        {(item.muscle_groups || []).join(", ") || "-"}
                      </span>
                    </div>
                    {item.equipment && (
                      <div style={requestDetailRowStyle}>
                        <span style={requestDetailLabelStyle}>Utrustning</span>
                        <span style={requestDetailValueStyle}>{item.equipment}</span>
                      </div>
                    )}
                    {item.reference_url && (
                      <div style={requestDetailRowStyle}>
                        <span style={requestDetailLabelStyle}>Referens</span>
                        <a href={item.reference_url} target="_blank" rel="noreferrer" style={requestLinkStyle}>
                          {item.reference_url}
                        </a>
                      </div>
                    )}

                    <div style={requestDescriptionWrapStyle}>
                      <div style={requestDescriptionLabelStyle}>Beskrivning</div>
                      <div style={requestDescriptionStyle}>{item.description}</div>
                    </div>

                    <div style={requestActionsWrapStyle}>
                      {[
                        { key: "open", label: "Öppen" },
                        { key: "future", label: "Framtida åtgärd" },
                        { key: "done", label: "Klar" },
                        { key: "wont_do", label: "Avfärda" },
                      ].map((option) => (
                        <button
                          key={option.key}
                          type="button"
                          onClick={() => handleUpdateExerciseRequestStatus(item.id, option.key)}
                          disabled={isUpdating}
                          style={{
                            ...(status === option.key ? buttonStyle : secondaryButtonStyle),
                            padding: "10px 12px",
                            opacity: isUpdating ? 0.7 : 1,
                            cursor: isUpdating ? "default" : "pointer",
                          }}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      ) : adminSection === "import" && canManageExercises ? (
        <div style={formCardStyle(isMobile)}>
          <div
            style={{
              ...sectionHeaderStyle,
              flexDirection: isMobile ? "column" : "row",
              alignItems: isMobile ? "stretch" : sectionHeaderStyle.alignItems,
            }}
          >
            <div>
              <div style={sectionEyebrowStyle}>Import / Export</div>
              <div style={sectionTitleStyle}>Hantera övningsbanken som JSON</div>
              <div style={importSectionSubtleTextStyle}>
                Exportera hela banken som backup eller importera en uppdaterad JSON-fil på samma ställe.
              </div>
            </div>
            <div style={importStatsWrapStyle}>
              <div style={countBadgeStyle}>{exercisesFromDB.length} övningar</div>
              <div style={countBadgeStyle}>{importedExercises.length} redo</div>
            </div>
          </div>

          <div style={importActionGridStyle(isMobile)}>
            <div style={importActionCardStyle}>
              <div style={importActionEyebrowStyle}>Export</div>
              <div style={importActionTitleStyle}>Ladda ner aktuell bank</div>
              <div style={importActionTextStyle}>
                Skapa en JSON-fil med hela den nuvarande övningsbanken. Bra som backup eller grund för ändringar.
              </div>
              <button
                type="button"
                onClick={handleExportExercises}
                style={{ ...secondaryButtonStyle, width: "100%", minHeight: "48px", marginTop: "14px" }}
              >
                Exportera JSON
              </button>
            </div>

            <div style={importActionCardStyle}>
              <div style={importActionEyebrowStyle}>Import</div>
              <div style={importActionTitleStyle}>Ladda upp uppdaterad bank</div>
              <div style={importActionTextStyle}>
                Accepterar en JSON-array eller ett objekt med <code>exercises</code>. Befintliga övningar med samma namn uppdateras.
              </div>

              <input
                key={exerciseImportInputKey}
                type="file"
                accept=".json,application/json"
                onChange={(event) => handleExerciseImportFile(event.target.files?.[0])}
                style={{ ...inputStyle, width: "100%", marginTop: "14px", marginBottom: "10px" }}
              />

              {exerciseImportFileName && (
                <div style={importFileMetaStyle}>
                  <strong>Vald fil:</strong> {exerciseImportFileName}
                </div>
              )}

              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "12px" }}>
                <button
                  type="button"
                  onClick={handleImportExercises}
                  disabled={
                    isParsingExerciseImportFile || isImportingExercises || importedExercises.length === 0
                  }
                  style={{
                    ...buttonStyle,
                    flex: 1,
                    minHeight: "48px",
                    opacity:
                      isParsingExerciseImportFile || isImportingExercises || importedExercises.length === 0
                        ? 0.7
                        : 1,
                    cursor:
                      isParsingExerciseImportFile || isImportingExercises || importedExercises.length === 0
                        ? "default"
                        : "pointer",
                  }}
                >
                  {isParsingExerciseImportFile
                    ? "Läser fil..."
                    : isImportingExercises
                    ? "Importerar..."
                    : "Importera JSON"}
                </button>

                <button
                  type="button"
                  onClick={clearExerciseImport}
                  style={{ ...secondaryButtonStyle, flex: 1, minHeight: "48px" }}
                >
                  Rensa
                </button>
              </div>
            </div>
          </div>

          {importedExercises.length > 0 && (
            <div style={importPreviewCardStyle}>
              <div style={importPreviewHeaderStyle(isMobile)}>
                <div>
                  <div style={importPreviewTitleStyle}>Förhandsgranskning</div>
                  <div style={importActionTextStyle}>
                    Kontrollera innehållet innan du skriver över banken.
                  </div>
                </div>
                <div style={countBadgeStyle}>{importedExercises.length} rader</div>
              </div>
              <div style={{ display: "grid", gap: "8px" }}>
                {importedExercises.slice(0, 8).map((exercise) => (
                  <div key={`${exercise.rowNumber}-${exercise.name}`} style={importPreviewRowStyle}>
                    <div style={{ fontWeight: "800", color: "#18202b" }}>{exercise.name || "Saknar namn"}</div>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>
                      {exerciseTypeLabel(exercise.exercise_type)}
                      {exercise.muscle_groups?.length ? ` • ${exercise.muscle_groups.join(", ")}` : ""}
                    </div>
                  </div>
                ))}
                {importedExercises.length > 8 && (
                  <div style={mutedTextStyle}>+ {importedExercises.length - 8} till i filen</div>
                )}
              </div>
            </div>
          )}

          {exerciseImportResults.length > 0 && (
            <div style={importResultsWrapStyle}>
              <div style={importPreviewTitleStyle}>Importresultat</div>
              <div style={{ display: "grid", gap: "8px" }}>
                {exerciseImportResults.map((result) => (
                  <div key={`import-result-${result.rowNumber}-${result.name}`} style={importResultRowStyle}>
                    <div style={{ fontWeight: "800", color: "#18202b" }}>{result.name || "Saknar namn"}</div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: result.success ? "#166534" : "#991b1b",
                      }}
                    >
                      {result.message}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          {canManageExercises && (
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
                  {(() => {
                    const parsedAliases = String(newExerciseAliasesText || "")
                      .split(/[\n,]+/)
                      .map((entry) => entry.trim())
                      .filter(Boolean)
                      .filter((entry, index, arr) => arr.findIndex((item) => item.toLowerCase() === entry.toLowerCase()) === index)
                      .filter((entry) => entry.toLowerCase() !== String(newExerciseName || "").trim().toLowerCase())
                    const displayNameOptions = [String(newExerciseName || "").trim(), ...parsedAliases].filter(Boolean)

                    return (
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
                      gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))",
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

                    <select
                      value={newExercisePrimaryCategory}
                      onChange={(e) => setNewExercisePrimaryCategory(e.target.value)}
                      style={{ ...inputStyle, width: "100%" }}
                    >
                      {exerciseCategoryOptions
                        .filter((option) => option.key !== "alla")
                        .map((option) => (
                          <option key={option.key} value={option.key}>
                            {option.label}
                          </option>
                        ))}
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

                  <textarea
                    rows={3}
                    placeholder="Alias, separerade med kommatecken eller en per rad"
                    value={newExerciseAliasesText}
                    onChange={(e) => setNewExerciseAliasesText(e.target.value)}
                    style={{ ...inputStyle, width: "100%", marginBottom: "10px", resize: "vertical", minHeight: "84px" }}
                  />

                  <select
                    value={newExerciseDisplayName}
                    onChange={(e) => setNewExerciseDisplayName(e.target.value)}
                    style={{ ...inputStyle, width: "100%", marginBottom: "10px" }}
                  >
                    <option value="">Visa huvudnamn i appen</option>
                    {displayNameOptions.map((option) => (
                      <option key={`create-display-${option}`} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>

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
                    )
                  })()}
                </>
              )}
            </div>
          )}

          <input
            type="text"
            placeholder="Sök övning"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            style={{ ...inputStyle, width: "100%", marginBottom: "12px" }}
          />

          {isShowingCategoryOverview ? (
            <div
              style={{
                display: "grid",
                gap: "10px",
                gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
                marginBottom: "14px",
              }}
            >
              {visibleNavigationCategories.map((category) => (
                <button
                  key={category.label}
                  type="button"
                  onClick={() => {
                    setSelectedCategoryFilter(category.label)
                    setExpandedExerciseId(null)
                  }}
                  style={{
                    width: "100%",
                    padding: isMobile ? "16px" : "18px",
                    borderRadius: isMobile ? "16px" : "18px",
                    border: "1px solid #ece5e5",
                    backgroundColor: "#ffffff",
                    boxShadow: "0 10px 24px rgba(24, 32, 43, 0.04)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "12px",
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "15px", fontWeight: "800", color: "#18202b" }}>
                      {category.label}
                    </div>
                    <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                      Visa övningar i kategorin
                    </div>
                  </div>
                  <div style={countBadgeStyle}>{category.count}</div>
                </button>
              ))}
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: isMobile ? "stretch" : "center",
                flexDirection: isMobile ? "column" : "row",
                gap: "10px",
                marginBottom: "12px",
              }}
            >
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                {!hasActiveSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategoryFilter("alla")
                      setExpandedExerciseId(null)
                    }}
                    style={secondaryButtonStyle}
                  >
                    Tillbaka till kategorier
                  </button>
                )}
                <div style={{ fontSize: "13px", color: "#64748b" }}>
                  {hasActiveSearch
                    ? `Sökresultat i hela övningsbanken (${filteredExercises.length})`
                    : `${selectedCategoryLabel} (${filteredExercises.length})`}
                </div>
              </div>
            </div>
          )}

          {!isShowingCategoryOverview && (
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
          )}

          {!isShowingCategoryOverview && (
            <div style={{ display: "grid", gap: "10px" }}>
              {filteredExercises.length === 0 ? (
                <div
                  style={{
                    padding: isMobile ? "16px" : "18px",
                    borderRadius: isMobile ? "16px" : "18px",
                    border: "1px solid #ece5e5",
                    backgroundColor: "#ffffff",
                    color: "#64748b",
                  }}
                >
                  {hasActiveSearch
                    ? "Ingen övning matchar din sökning."
                    : "Inga övningar finns i den här kategorin med nuvarande filter."}
                </div>
              ) : (
                filteredExercises.map((exercise) => {
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
                          {getExerciseDisplayName(exercise)}
                        </div>
                      </div>

                      {canManageExercises && exercise.display_name && exercise.display_name !== exercise.name && (
                        <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "6px" }}>
                          Grundnamn: {exercise.name}
                        </div>
                      )}

                      {canManageExercises && Array.isArray(exercise.aliases) && exercise.aliases.length > 0 && (
                        <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "6px" }}>
                          Alias: {exercise.aliases.join(", ")}
                        </div>
                      )}

                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "6px" }}>
                        <span style={categoryPillStyle}>
                          {getExercisePrimaryCategoryLabel(deriveExercisePrimaryCategory(exercise))}
                        </span>
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

                    {isExpanded && canManageExercises && (
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

                  {isEditing && canManageExercises && (
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

                      {(() => {
                        const parsedAliases = String(newExerciseAliasesText || "")
                          .split(/[\n,]+/)
                          .map((entry) => entry.trim())
                          .filter(Boolean)
                          .filter((entry, index, arr) => arr.findIndex((item) => item.toLowerCase() === entry.toLowerCase()) === index)
                          .filter((entry) => entry.toLowerCase() !== String(newExerciseName || "").trim().toLowerCase())
                        const displayNameOptions = [String(newExerciseName || "").trim(), ...parsedAliases].filter(Boolean)

                        return (
                          <>
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
                          gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))",
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

                        <select
                          value={newExercisePrimaryCategory}
                          onChange={(e) => setNewExercisePrimaryCategory(e.target.value)}
                          style={{ ...inputStyle, width: "100%" }}
                        >
                          {exerciseCategoryOptions
                            .filter((option) => option.key !== "alla")
                            .map((option) => (
                              <option key={option.key} value={option.key}>
                                {option.label}
                              </option>
                            ))}
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

                      <textarea
                        rows={3}
                        placeholder="Alias, separerade med kommatecken eller en per rad"
                        value={newExerciseAliasesText}
                        onChange={(e) => setNewExerciseAliasesText(e.target.value)}
                        style={{ ...inputStyle, width: "100%", resize: "vertical", minHeight: "84px" }}
                      />

                      <select
                        value={newExerciseDisplayName}
                        onChange={(e) => setNewExerciseDisplayName(e.target.value)}
                        style={{ ...inputStyle, width: "100%" }}
                      >
                        <option value="">Visa huvudnamn i appen</option>
                        {displayNameOptions.map((option) => (
                          <option key={`edit-display-${exercise.id}-${option}`} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>

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
                          </>
                        )
                      })()}
                    </div>
                  )}
                </button>
              )
                })
              )}
            </div>
          )}
        </>
      )}
    </>
  )
}

function getRoleLabel(role) {
  if (role === "head_admin") return "Huvudadmin"
  if (role === "coach") return "Tränare"
  if (role === "player") return "Spelare"
  return "Okänd roll"
}

function getStatusLabel(status) {
  if (status === "done") return "Klar"
  if (status === "future") return "Framtida åtgärd"
  if (status === "wont_do") return "Görs inte"
  return "Öppen"
}

function getStatusBadgeStyle(status) {
  if (status === "done") {
    return {
      backgroundColor: "#ecfdf3",
      color: "#166534",
    }
  }

  if (status === "future") {
    return {
      backgroundColor: "#eff6ff",
      color: "#1d4ed8",
    }
  }

  if (status === "wont_do") {
    return {
      backgroundColor: "#f3f4f6",
      color: "#374151",
    }
  }

  return {
    backgroundColor: "#fff1f1",
    color: "#991b1b",
  }
}

function formatRequestDate(value) {
  if (!value) return "-"
  return new Date(value).toLocaleString("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
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

const categoryPillStyle = {
  display: "inline-flex",
  padding: "4px 8px",
  borderRadius: "999px",
  backgroundColor: "#18202b",
  color: "#ffffff",
  fontSize: "12px",
  fontWeight: "800",
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

const importPreviewCardStyle = {
  marginTop: "12px",
  padding: "12px",
  borderRadius: "14px",
  backgroundColor: "#fff8f8",
  border: "1px solid #f2d7d7",
}

const importSectionSubtleTextStyle = {
  marginTop: "8px",
  fontSize: "13px",
  lineHeight: 1.6,
  color: "#566173",
  maxWidth: "560px",
}

const importStatsWrapStyle = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  justifyContent: "flex-end",
}

const importActionGridStyle = (isMobile) => ({
  display: "grid",
  gap: "12px",
  gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
  marginTop: "14px",
})

const importActionCardStyle = {
  padding: "14px",
  borderRadius: "16px",
  backgroundColor: "#fffdfd",
  border: "1px solid #f1dfdf",
  boxShadow: "0 8px 22px rgba(24, 32, 43, 0.04)",
}

const importActionEyebrowStyle = {
  marginBottom: "6px",
  fontSize: "11px",
  fontWeight: "800",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#991b1b",
}

const importActionTitleStyle = {
  marginBottom: "8px",
  fontSize: "16px",
  fontWeight: "800",
  color: "#18202b",
}

const importActionTextStyle = {
  fontSize: "13px",
  lineHeight: 1.6,
  color: "#566173",
}

const importFileMetaStyle = {
  fontSize: "13px",
  color: "#374151",
  padding: "10px 12px",
  borderRadius: "12px",
  backgroundColor: "#fff8f8",
  border: "1px solid #f2dede",
}

const importPreviewHeaderStyle = (isMobile) => ({
  display: "flex",
  alignItems: isMobile ? "stretch" : "flex-start",
  justifyContent: "space-between",
  flexDirection: isMobile ? "column" : "row",
  gap: "10px",
  marginBottom: "10px",
})

const importPreviewTitleStyle = {
  fontSize: "14px",
  fontWeight: "800",
  color: "#18202b",
}

const importPreviewRowStyle = {
  padding: "10px 12px",
  borderRadius: "12px",
  backgroundColor: "#ffffff",
  border: "1px solid #f0e4e4",
}

const importResultsWrapStyle = {
  display: "grid",
  gap: "8px",
  marginTop: "14px",
}

const importResultRowStyle = {
  padding: "10px 12px",
  borderRadius: "12px",
  backgroundColor: "#ffffff",
  border: "1px solid #ece5e5",
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

const adminTabsWrapStyle = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  marginBottom: "16px",
}

const adminTabStyle = {
  padding: "10px 14px",
  borderRadius: "12px",
  border: "1px solid #d8e3ef",
  backgroundColor: "#ffffff",
  color: "#18202b",
  fontSize: "14px",
  fontWeight: "800",
  cursor: "pointer",
}

const activeAdminTabStyle = {
  backgroundColor: "#18202b",
  color: "#ffffff",
  borderColor: "#18202b",
}

const requestHelpTextStyle = {
  marginBottom: "12px",
  fontSize: "13px",
  color: "#64748b",
  lineHeight: 1.5,
}

const requestsWrapStyle = {
  display: "grid",
  gap: "16px",
}

const requestsHeaderStyle = (isMobile) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: isMobile ? "stretch" : "flex-start",
  flexDirection: isMobile ? "column" : "row",
  gap: "12px",
})

const requestFilterCardStyle = {
  padding: "16px",
  borderRadius: "18px",
  border: "1px solid #e2e8f0",
  backgroundColor: "#ffffff",
}

const requestFilterRowStyle = (isMobile) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: isMobile ? "stretch" : "flex-start",
  flexDirection: isMobile ? "column" : "row",
  gap: "14px",
})

const requestFilterGroupStyle = {
  display: "grid",
  gap: "8px",
}

const filterLabelStyle = {
  fontSize: "12px",
  fontWeight: "800",
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
}

const chipRowStyle = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
}

const filterChipStyle = {
  padding: "8px 12px",
  borderRadius: "999px",
  border: "1px solid #d8e3ef",
  backgroundColor: "#ffffff",
  color: "#334155",
  fontSize: "13px",
  fontWeight: "700",
  cursor: "pointer",
}

const activeFilterChipStyle = {
  backgroundColor: "#18202b",
  color: "#ffffff",
  borderColor: "#18202b",
}

const requestListStyle = {
  display: "grid",
  gap: "12px",
}

const requestCardStyle = {
  padding: "16px",
  borderRadius: "18px",
  border: "1px solid #e2e8f0",
  backgroundColor: "#ffffff",
  boxShadow: "0 10px 24px rgba(24, 32, 43, 0.04)",
}

const requestCardHeaderStyle = (isMobile) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: isMobile ? "stretch" : "flex-start",
  flexDirection: isMobile ? "column" : "row",
  gap: "12px",
  marginBottom: "14px",
})

const requestHeaderAsideStyle = {
  display: "grid",
  gap: "6px",
  justifyItems: "end",
}

const requestTitleStyle = {
  fontSize: "18px",
  fontWeight: "900",
  color: "#18202b",
  marginBottom: "4px",
}

const requestMetaTextStyle = {
  fontSize: "13px",
  color: "#64748b",
  lineHeight: 1.5,
}

const statusBadgeStyle = {
  display: "inline-flex",
  padding: "6px 10px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: "800",
}

const requestDateStyle = {
  fontSize: "12px",
  color: "#64748b",
}

const requestUpdatedStyle = {
  fontSize: "12px",
  color: "#94a3b8",
}

const requestDetailRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  marginBottom: "8px",
}

const requestDetailLabelStyle = {
  fontSize: "13px",
  fontWeight: "800",
  color: "#46607a",
}

const requestDetailValueStyle = {
  fontSize: "13px",
  color: "#18202b",
  textAlign: "right",
}

const requestLinkStyle = {
  fontSize: "13px",
  color: "#1d4ed8",
  textAlign: "right",
  wordBreak: "break-word",
}

const requestDescriptionWrapStyle = {
  marginTop: "12px",
  padding: "12px 14px",
  borderRadius: "14px",
  backgroundColor: "#f8fafc",
  border: "1px solid #e2e8f0",
}

const requestDescriptionLabelStyle = {
  fontSize: "12px",
  fontWeight: "800",
  color: "#46607a",
  marginBottom: "6px",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
}

const requestDescriptionStyle = {
  fontSize: "14px",
  color: "#18202b",
  lineHeight: 1.6,
  whiteSpace: "pre-wrap",
}

const requestActionsWrapStyle = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  marginTop: "14px",
}

export default ExerciseBankPage
