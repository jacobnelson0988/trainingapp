import { useEffect, useState } from "react"
import { getExerciseProtocolConfig, getExerciseProtocolStep } from "../utils/exerciseProtocols"

const repRangeOptions = [
  { key: "1_3", label: "1-3 reps" },
  { key: "4_5", label: "4-5 reps" },
  { key: "6_10", label: "6-10 reps" },
  { key: "11_15", label: "11-15 reps" },
  { key: "16_20", label: "16-20 reps" },
]

const FREE_ACTIVITY_LABELS = {
  running: "Löpning",
  football: "Fotboll",
  orienteering: "Orientering",
}

const formatDisplayPassName = (passName, workoutKind, runningOrigin, freeActivityType = "running") => {
  if (workoutKind === "running" && runningOrigin !== "assigned") {
    const rawFreePassName = String(passName || "").trim()
    if (rawFreePassName) {
      const withoutTechnicalSuffix = rawFreePassName.replace(/_[a-f0-9]{8}$/i, "")
      return withoutTechnicalSuffix.replace(/_/g, " ")
    }

    return FREE_ACTIVITY_LABELS[freeActivityType] || "Egen aktivitet"
  }

  const raw = String(passName || "").trim()
  if (!raw) return "Pass"

  const withoutTechnicalSuffix = raw.replace(/_[a-f0-9]{8}$/i, "")
  return withoutTechnicalSuffix.replace(/_/g, " ")
}

function PlayersPage({
  role,
  setCoachView,
  isLoadingPlayers,
  players,
  showArchivedPlayers,
  setShowArchivedPlayers,
  archivingPlayerId,
  handleArchivePlayer,
  teamCoaches,
  selectedPlayer,
  setSelectedPlayer,
  updatingGoalAvailabilityIds,
  handleSetIndividualGoalsEnabled,
  commentDrafts,
  handleCommentChange,
  handleCommentSave,
  mutedTextStyle,
  cardTitleStyle,
  inputStyle,
  activeWorkouts,
  assignedPassCodes,
  isLoadingTargets,
  targetDrafts,
  handleTargetDraftChange,
  handleSaveTargets,
  isSavingTargets,
  selectedPlayerHistory,
  selectedPlayerCompletedSessions,
  isLoadingSelectedPlayerHistory,
  targetChangeRequests,
  isLoadingTargetChangeRequests,
  targetChangeRequestReviewDrafts,
  updatingTargetChangeRequestId,
  handleSetTargetChangeReviewDraft,
  handleReviewTargetChangeRequest,
  exerciseGoalDrafts,
  selectedPlayerExerciseGoals,
  handleExerciseGoalDraftChange,
  handleExerciseGoalRepRangeWeightDraftChange,
  handlePrefillExerciseGoalFromHistory,
  handleSaveExerciseGoals,
  isSavingExerciseGoals,
  handleAssignPassToPlayer,
  handleUnassignPassFromPlayer,
  handleAssignAllPassesToPlayer,
  handleClearAssignedPassesFromPlayer,
  isUpdatingPassAssignments,
  buttonStyle,
  isMobile,
}) {
  const [searchValue, setSearchValue] = useState("")
  const [selectedCompletedSessionId, setSelectedCompletedSessionId] = useState("")
  const [selectedTargetExerciseByPass, setSelectedTargetExerciseByPass] = useState({})
  const [selectedWorkoutByPlayer, setSelectedWorkoutByPlayer] = useState({})
  const [bulkSelectedPlayerIds, setBulkSelectedPlayerIds] = useState([])
  const [activeEditorSection, setActiveEditorSection] = useState("passes")
  const [activeUtilityPanel, setActiveUtilityPanel] = useState("")
  const getExerciseDisplayName = (exercise) => exercise?.displayName || exercise?.display_name || exercise?.name || ""
  const allPassKeys = Object.keys(activeWorkouts)
  const assignedPassSet = new Set(assignedPassCodes || [])

  const handleSelectedTargetExerciseChange = (passKey, exerciseName) => {
    setSelectedTargetExerciseByPass((prev) => ({
      ...prev,
      [passKey]: exerciseName,
    }))
  }

  const handleSelectedWorkoutChange = (playerId, passKey) => {
    setSelectedWorkoutByPlayer((prev) => ({
      ...prev,
      [playerId]: passKey,
    }))
  }

  const handleToggleBulkSelectedPlayer = (playerId) => {
    setBulkSelectedPlayerIds((prev) =>
      prev.includes(playerId) ? prev.filter((id) => id !== playerId) : [...prev, playerId]
    )
  }

  const filteredPlayers = players.filter((player) => {
    if (!showArchivedPlayers && player.is_archived) {
      return false
    }

    const haystack = `${player.full_name} ${player.username} ${player.latestPass}`.toLowerCase()
    return haystack.includes(searchValue.trim().toLowerCase())
  })

  const activePlayerCount = players.filter((player) => !player.is_archived).length
  const archivedPlayerCount = players.filter((player) => player.is_archived).length
  const historyModeCount = players.filter((player) => player.individual_goals_enabled === false).length
  const openRequestCount = targetChangeRequests.length

  useEffect(() => {
    const firstSessionId = selectedPlayerCompletedSessions?.[0]?.session_id || ""
    setSelectedCompletedSessionId((current) => {
      if (current && selectedPlayerCompletedSessions?.some((session) => session.session_id === current)) {
        return current
      }
      return firstSessionId
    })
  }, [selectedPlayer?.id, selectedPlayerCompletedSessions])

  useEffect(() => {
    if (activeUtilityPanel === "requests" && openRequestCount === 0) {
      setActiveUtilityPanel("")
    }
  }, [activeUtilityPanel, openRequestCount])

  useEffect(() => {
    if (selectedPlayer?.id) {
      setActiveUtilityPanel("players")
    }
  }, [selectedPlayer?.id])

  const renderEditorSectionButton = (key, label) => {
    const isActive = activeEditorSection === key

    return (
      <button
        type="button"
        onClick={() => setActiveEditorSection(key)}
        style={{
          ...editorSectionButtonStyle,
          ...(isActive ? editorSectionButtonActiveStyle : {}),
          width: isMobile ? "100%" : "auto",
        }}
      >
        {label}
      </button>
    )
  }

  const renderPlayerEditor = (player) => (
    <div
      style={{
        marginTop: "12px",
        padding: "16px",
        border: "1px solid #ece5e5",
        borderRadius: "16px",
        backgroundColor: "#fffdfd",
      }}
    >
      <div style={editorSummaryCardStyle}>
        <div>
          <div style={editorSummaryTitleStyle}>{player.full_name}</div>
          <div style={editorSummaryMetaStyle}>
            @{player.username} • {player.totalPasses ?? 0} loggade pass
            {player.lastSignInAt
              ? ` • senast inloggad ${new Date(player.lastSignInAt).toLocaleDateString("sv-SE")}`
              : ""}
          </div>
        </div>
        <div style={editorSummaryBadgeStyle}>
          {player.individual_goals_enabled === false ? "Historikläge" : "Individuella mål"}
        </div>
      </div>

      <div style={playerActionBarStyle(isMobile)}>
        {player.is_archived ? (
          <div style={archivedStatusBadgeStyle}>
            Arkiverad{player.archived_at ? ` • ${new Date(player.archived_at).toLocaleDateString("sv-SE")}` : ""}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => handleArchivePlayer(player.id, player.full_name)}
            disabled={archivingPlayerId === player.id}
            style={{
              ...archiveButtonStyle,
              width: isMobile ? "100%" : "auto",
              opacity: archivingPlayerId === player.id ? 0.7 : 1,
              cursor: archivingPlayerId === player.id ? "default" : "pointer",
            }}
          >
            {archivingPlayerId === player.id ? "Arkiverar..." : "Arkivera"}
          </button>
        )}

        <button
          type="button"
          onClick={() =>
            handleSetIndividualGoalsEnabled([player.id], player.individual_goals_enabled === false)
          }
          disabled={updatingGoalAvailabilityIds.includes(player.id)}
          style={{
            ...quickActionButtonStyle,
            width: isMobile ? "100%" : "auto",
            opacity: updatingGoalAvailabilityIds.includes(player.id) ? 0.7 : 1,
            cursor: updatingGoalAvailabilityIds.includes(player.id) ? "default" : "pointer",
          }}
        >
          {updatingGoalAvailabilityIds.includes(player.id)
            ? "Sparar..."
            : player.individual_goals_enabled === false
            ? "Aktivera individuella mål"
            : "Stäng av individuella mål"}
        </button>
      </div>

      {player.is_archived && (
        <div style={archivedInfoCardStyle}>
          Den här spelaren är arkiverad och döljs normalt från aktiva listor. Historiken finns kvar,
          men pass och mål ska inte längre ändras för spelaren.
        </div>
      )}

      {!player.is_archived && (
        <>
      <div style={editorSectionTabsStyle(isMobile)}>
        {renderEditorSectionButton("overview", "Översikt")}
        {renderEditorSectionButton("passes", "Pass")}
        {renderEditorSectionButton("targets", "Mål")}
        {renderEditorSectionButton("history", "Historik")}
      </div>

      {activeEditorSection === "overview" && (
      <div style={editorSectionCardStyle}>
        <div style={sectionHeaderCompactStyle}>
          <div style={sectionTitleCompactStyle}>Översikt</div>
          <div style={sectionMetaCompactStyle}>Snabba ändringar för spelaren</div>
        </div>

        <div style={{ marginBottom: "14px" }}>
        <div style={{ fontSize: "14px", fontWeight: "800", color: "#18202b", marginBottom: "8px" }}>
          Kommentar
        </div>
        <input
          type="text"
          value={commentDrafts[player.id] ?? ""}
          placeholder="Skriv kommentar"
          onChange={(e) => handleCommentChange(player.id, e.target.value)}
          onBlur={() => handleCommentSave(player.id)}
          style={{ ...inputStyle, width: "100%" }}
        />
        </div>

        <div style={editorOverviewGridStyle(isMobile)}>
          <div style={miniStatCardStyle}>
            <div style={miniStatLabelStyle}>Senaste pass</div>
            <div style={miniStatValueStyle}>{player.latestPass || "-"}</div>
          </div>
          <div style={miniStatCardStyle}>
            <div style={miniStatLabelStyle}>Tilldelade pass</div>
            <div style={miniStatValueStyle}>{assignedPassCodes.length}</div>
          </div>
        </div>
      </div>
      )}

      {activeEditorSection === "passes" && (
      <div style={editorSectionCardStyle}>
        <div style={sectionHeaderCompactStyle}>
          <div style={sectionTitleCompactStyle}>Tilldelade pass</div>
          <div style={sectionMetaCompactStyle}>Välj vilka pass spelaren ska se</div>
        </div>
        <div
          style={{
            marginBottom: "12px",
            padding: "12px 14px",
            borderRadius: "12px",
            backgroundColor: "#fff7f7",
            border: "1px solid #f0dada",
          }}
        >
          <div style={{ fontSize: "14px", fontWeight: "800", color: "#18202b", marginBottom: "4px" }}>
            {assignedPassCodes.length} av {allPassKeys.length} pass tilldelade
          </div>
          <div style={{ fontSize: "13px", color: "#6b7280" }}>
            Välj pass nedan för att lägga till eller ta bort dem direkt för {player.full_name}.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
            marginBottom: "14px",
          }}
        >
          <button
            type="button"
            onClick={handleAssignAllPassesToPlayer}
            disabled={isUpdatingPassAssignments || allPassKeys.length === 0}
            style={{
              ...quickActionButtonStyle,
              opacity: isUpdatingPassAssignments || allPassKeys.length === 0 ? 0.7 : 1,
              cursor: isUpdatingPassAssignments || allPassKeys.length === 0 ? "default" : "pointer",
              width: isMobile ? "100%" : "auto",
            }}
          >
            Tilldela alla pass
          </button>
          <button
            type="button"
            onClick={handleClearAssignedPassesFromPlayer}
            disabled={isUpdatingPassAssignments || assignedPassCodes.length === 0}
            style={{
              ...quickActionButtonStyle,
              backgroundColor: "#ffffff",
              color: "#991b1b",
              border: "1px solid #efc7c7",
              opacity: isUpdatingPassAssignments || assignedPassCodes.length === 0 ? 0.7 : 1,
              cursor: isUpdatingPassAssignments || assignedPassCodes.length === 0 ? "default" : "pointer",
              width: isMobile ? "100%" : "auto",
            }}
          >
            Rensa alla pass
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gap: "10px",
            marginBottom: "16px",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(180px, 1fr))",
          }}
        >
          {allPassKeys.map((passKey) => (
            <button
              key={passKey}
              type="button"
              onClick={() =>
                assignedPassSet.has(passKey)
                  ? handleUnassignPassFromPlayer(passKey)
                  : handleAssignPassToPlayer(passKey)
              }
            style={{
              padding: "14px",
              borderRadius: "14px",
                border: assignedPassSet.has(passKey) ? "2px solid #c62828" : "1px solid #e5e7eb",
                backgroundColor: assignedPassSet.has(passKey) ? "#fff7f7" : "#ffffff",
                color: "#111827",
                cursor: isUpdatingPassAssignments ? "default" : "pointer",
                fontSize: "14px",
                fontWeight: "700",
                textAlign: "left",
                opacity: isUpdatingPassAssignments ? 0.7 : 1,
              }}
              disabled={isUpdatingPassAssignments}
            >
              <div style={{ fontSize: "15px", fontWeight: "800", marginBottom: "6px" }}>
                {activeWorkouts[passKey].label}
              </div>
              <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "8px" }}>
                {(activeWorkouts[passKey].exercises || []).length} övningar
              </div>
              <div
                style={{
                  display: "inline-flex",
                  padding: "5px 9px",
                  borderRadius: "999px",
                  backgroundColor: assignedPassSet.has(passKey) ? "#c62828" : "#f3f4f6",
                  color: assignedPassSet.has(passKey) ? "#ffffff" : "#4b5563",
                  fontSize: "12px",
                  fontWeight: "800",
                }}
              >
                {assignedPassSet.has(passKey) ? "Tilldelat" : "Ej tilldelat"}
              </div>
            </button>
          ))}
        </div>
      </div>
      )}

      {activeEditorSection === "targets" && (
      <div style={editorSectionCardStyle}>
        <div style={sectionHeaderCompactStyle}>
          <div style={sectionTitleCompactStyle}>Individuella mål per övning</div>
          <div style={sectionMetaCompactStyle}>Visa mindre först, välj sedan pass och övning</div>
        </div>
        {isLoadingTargets ? (
          <p style={mutedTextStyle}>Laddar individuella mål...</p>
        ) : assignedPassCodes.length === 0 ? (
          <p style={mutedTextStyle}>Tilldela minst ett pass för att kunna sätta mål på övningarna.</p>
        ) : player.individual_goals_enabled === false ? (
          <div style={archivedInfoCardStyle}>
            Individuella mål är avstängda för den här spelaren. Rekommendationer i passet baseras nu bara
            på tidigare lyft och historik.
          </div>
        ) : (
          <div>
            {(() => {
              const selectedPassKey =
                Object.prototype.hasOwnProperty.call(selectedWorkoutByPlayer, player.id)
                  ? selectedWorkoutByPlayer[player.id]
                  : ""
              const passExercises = selectedPassKey ? activeWorkouts[selectedPassKey]?.exercises || [] : []
              const selectedExerciseName =
                selectedTargetExerciseByPass[selectedPassKey] ||
                passExercises[0]?.name ||
                ""
              const selectedExercise = passExercises.find((exercise) => exercise.name === selectedExerciseName)
              const draft = selectedExercise
                ? {
                    target_reps_mode: selectedExercise.defaultRepsMode || "fixed",
                    ...((targetDrafts[selectedPassKey] || {})[selectedExercise.name] || {}),
                  }
                : null

              return (
                <div
                  style={{
                    marginBottom: "16px",
                    padding: "16px",
                    border: "1px solid #e2e8f0",
                    borderRadius: "16px",
                    backgroundColor: "#ffffff",
                  }}
                >
                  <div style={{ marginBottom: "12px" }}>
                    <div style={{ fontSize: "12px", fontWeight: "800", color: "#46607a", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Välj pass
                    </div>
                    <select
                      value={selectedPassKey}
                      onChange={(e) => handleSelectedWorkoutChange(player.id, e.target.value)}
                      style={{ ...inputStyle, width: "100%" }}
                    >
                      <option value="">Välj pass</option>
                      {assignedPassCodes.map((passKey) => (
                        <option key={passKey} value={passKey}>
                          {activeWorkouts[passKey]?.label || passKey}
                        </option>
                      ))}
                    </select>
                  </div>

                  {!selectedPassKey ? (
                    <div style={mutedTextStyle}>Välj ett pass för att visa och redigera individuella mål.</div>
                  ) : (
                    <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "14px" }}>
                      {(activeWorkouts[selectedPassKey]?.exercises || []).length} övningar. Välj en övning och sätt bara individuella reps, vikt eller kommentar här.
                    </div>
                  )}

                  {selectedPassKey && passExercises.length === 0 ? (
                    <div style={mutedTextStyle}>Det här passet har inga styrkeövningar att sätta individuella mål på.</div>
                  ) : selectedPassKey ? (
                    <>
                      <div
                        style={{
                          marginBottom: "14px",
                          padding: "14px",
                          borderRadius: "14px",
                          border: "1px solid #dbe5ef",
                          backgroundColor: "#f8fafc",
                        }}
                      >
                        <div style={{ fontSize: "12px", fontWeight: "800", color: "#46607a", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          Välj övning
                        </div>
                        <select
                          value={selectedExerciseName}
                          onChange={(e) => handleSelectedTargetExerciseChange(selectedPassKey, e.target.value)}
                          style={{ ...inputStyle, width: "100%" }}
                        >
                          {passExercises.map((exercise) => (
                            <option key={`${selectedPassKey}-${exercise.name}`} value={exercise.name}>
                              {getExerciseDisplayName(exercise)}
                            </option>
                          ))}
                        </select>
                      </div>

                      {selectedExercise && draft && (
                        <div
                          key={`${selectedPassKey}-${selectedExercise.name}`}
                          style={{
                            border: "1px solid #e2e8f0",
                            borderRadius: "14px",
                            padding: "14px",
                            marginBottom: "10px",
                            backgroundColor: "#ffffff",
                          }}
                        >
                          <div style={{ marginBottom: "10px" }}>
                            <strong>{getExerciseDisplayName(selectedExercise)}</strong>
                            <div style={{ fontSize: "13px", color: "#64748b", marginTop: "4px" }}>
                              Den här rutan används bara för avvikelser från standardpasset. Lämna fälten tomma om spelaren ska följa passets vanliga upplägg.
                            </div>
                          </div>

                          <div
                            style={{
                              display: "flex",
                              gap: "8px",
                              flexWrap: "wrap",
                              marginBottom: "8px",
                              flexDirection: isMobile ? "column" : "row",
                            }}
                          >
                            <input
                              type="text"
                              placeholder="Reps eller range"
                              disabled={draft.target_reps_mode === "max"}
                              value={draft.target_reps ?? ""}
                              onChange={(e) =>
                                handleTargetDraftChange(selectedPassKey, selectedExercise.name, "target_reps", e.target.value)
                              }
                              style={{ ...inputStyle, width: isMobile ? "100%" : undefined, opacity: draft.target_reps_mode === "max" ? 0.5 : 1 }}
                            />
                            <button
                              type="button"
                              onClick={() =>
                                handleTargetDraftChange(
                                  selectedPassKey,
                                  selectedExercise.name,
                                  "target_reps_mode",
                                  draft.target_reps_mode === "max" ? "fixed" : "max"
                                )
                              }
                              style={{
                                width: isMobile ? "100%" : "auto",
                                padding: "10px 14px",
                                borderRadius: "10px",
                                border: "1px solid #d1d5db",
                                backgroundColor: draft.target_reps_mode === "max" ? "#111827" : "#ffffff",
                                color: draft.target_reps_mode === "max" ? "#ffffff" : "#111827",
                                cursor: "pointer",
                                fontSize: "14px",
                                fontWeight: "700",
                              }}
                            >
                              {draft.target_reps_mode === "max" ? "MAX" : "Fast"}
                            </button>
                            {selectedExercise.type === "weight_reps" && (
                              <input
                                type="number"
                                placeholder="Vikt"
                                value={draft.target_weight ?? ""}
                                onChange={(e) =>
                                  handleTargetDraftChange(selectedPassKey, selectedExercise.name, "target_weight", e.target.value)
                                }
                                style={{ ...inputStyle, width: isMobile ? "100%" : undefined }}
                              />
                            )}
                          </div>

                          {draft.target_reps_mode !== "max" && (
                            <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "10px" }}>
                              Skriv till exempel <strong>8</strong> eller <strong>6-10</strong>.
                            </div>
                          )}

                          <input
                            type="text"
                            placeholder="Kommentar / teknikfokus"
                            value={draft.target_comment ?? ""}
                            onChange={(e) =>
                              handleTargetDraftChange(selectedPassKey, selectedExercise.name, "target_comment", e.target.value)
                            }
                            style={{ ...inputStyle, width: "100%" }}
                          />
                        </div>
                      )}
                    </>
                  ) : null}
                </div>
              )
            })()}

            <button
              type="button"
              onClick={handleSaveTargets}
              disabled={isSavingTargets}
              style={{
                width: isMobile ? "100%" : "auto",
                padding: "10px 14px",
                borderRadius: "10px",
                border: "none",
                backgroundColor: "#111827",
                color: "#ffffff",
                cursor: isSavingTargets ? "default" : "pointer",
                fontSize: "14px",
                fontWeight: "700",
                opacity: isSavingTargets ? 0.7 : 1,
              }}
            >
              {isSavingTargets ? "Sparar..." : "Spara mål"}
            </button>
      </div>
        )}
      </div>
      )}

      {activeEditorSection === "history" && (
      <div style={editorSectionCardStyle}>
        <div style={sectionHeaderCompactStyle}>
          <div style={sectionTitleCompactStyle}>Historik och personliga mål</div>
          <div style={sectionMetaCompactStyle}>Bygg mål utifrån spelarens verkliga historik</div>
        </div>
        {player.individual_goals_enabled === false ? (
          <div style={archivedInfoCardStyle}>
            Personliga övningsmål är avstängda. Träningsrekommendationer byggs nu i stället på spelarens egen historik.
          </div>
        ) : isLoadingSelectedPlayerHistory ? (
          <p style={mutedTextStyle}>Laddar historik...</p>
        ) : (
          <div>
            <div style={historyViewerCardStyle}>
              <div style={sectionHeaderCompactStyle}>
                <div style={sectionTitleCompactStyle}>Genomförda pass</div>
                <div style={sectionMetaCompactStyle}>Bläddra i samma kortvy som spelaren ser</div>
              </div>

              {selectedPlayerCompletedSessions.length === 0 ? (
                <p style={mutedTextStyle}>Ingen passhistorik finns ännu för spelaren.</p>
              ) : (
                <>
                  <div style={historySessionPickerStyle}>
                    {selectedPlayerCompletedSessions.map((session) => {
                      const isSelected = selectedCompletedSessionId === session.session_id

                      return (
                        <button
                          key={session.session_id}
                          type="button"
                          onClick={() => setSelectedCompletedSessionId(session.session_id)}
                          style={{
                            ...historySessionButtonStyle,
                            borderColor: isSelected ? "#c62828" : historySessionButtonStyle.borderColor,
                            backgroundColor: isSelected ? "#fff7f7" : historySessionButtonStyle.backgroundColor,
                          }}
                        >
                          <div style={historySessionButtonTitleStyle}>
                            {formatDisplayPassName(
                              session.pass_name,
                              session.workout_kind,
                              session.running_origin,
                              session.free_activity_type
                            )}
                          </div>
                          <div style={historySessionButtonMetaStyle}>
                            {new Date(session.created_at).toLocaleDateString("sv-SE")}
                          </div>
                        </button>
                      )
                    })}
                  </div>

                  {(() => {
                    const selectedSession =
                      selectedPlayerCompletedSessions.find((session) => session.session_id === selectedCompletedSessionId) ||
                      selectedPlayerCompletedSessions[0]

                    if (!selectedSession) return null

                    return (
                      <div>
                        <div style={historySessionSummaryStyle}>
                          <div>
                            <div style={historySessionSummaryTitleStyle}>
                              {formatDisplayPassName(
                                selectedSession.pass_name,
                                selectedSession.workout_kind,
                                selectedSession.running_origin,
                                selectedSession.free_activity_type
                              )}
                            </div>
                            <div style={historySessionSummaryMetaStyle}>
                              {new Date(selectedSession.created_at).toLocaleDateString("sv-SE")}
                              {selectedSession.running_summary ? ` • ${selectedSession.running_summary}` : ""}
                            </div>
                          </div>
                        </div>

                        {selectedSession.workout_kind === "running" ? (
                          <div style={historySessionRunningCardStyle}>
                            <div>{selectedSession.running_summary || "Aktivitet genomförd"}</div>
                            {selectedSession.pass_comment ? (
                              <div style={{ marginTop: "10px", color: "#475569", lineHeight: 1.5 }}>
                                <strong>Kommentar:</strong> {selectedSession.pass_comment}
                              </div>
                            ) : null}
                          </div>
                        ) : (
                            <div style={historyExerciseCardsViewportStyle}>
                              <div style={historyExerciseCardsTrackStyle}>
                                {selectedSession.exercises.map((exercise) => {
                                  const protocolConfig =
                                    exercise.protocolConfig || getExerciseProtocolConfig(exercise)

                                  return (
                                    <div key={`${selectedSession.session_id}-${exercise.name}`} style={historyExerciseCardStyle}>
                                      <div style={historyExerciseCardTitleStyle}>{exercise.displayName}</div>
                                      <div style={historyExerciseCardSubStyle}>
                                        {protocolConfig ? `${exercise.sets.length} block klara` : `${exercise.sets.length} set loggade`}
                                      </div>

                                      <div style={historySetListStyle}>
                                        {exercise.sets.map((setEntry, setIndex) => {
                                          const protocolStep = protocolConfig
                                            ? getExerciseProtocolStep(exercise, setEntry.setNumber || setIndex + 1)
                                            : null

                                          return (
                                            <div
                                              key={`${selectedSession.session_id}-${exercise.name}-${setEntry.setNumber || setIndex}`}
                                              style={historySetCardStyle}
                                            >
                                              <div style={historySetTitleStyle}>
                                                {protocolStep?.label || `Set ${setEntry.setNumber || setIndex + 1}`}
                                              </div>

                                              {setEntry.setType === "warmup" && (
                                                <div style={historySetWarmupBadgeStyle}>Uppvärmning</div>
                                              )}

                                              {protocolStep ? (
                                                <div style={{ display: "grid", gap: "6px" }}>
                                                  <div style={{ fontSize: "15px", fontWeight: "800", color: "#18202b" }}>
                                                    {protocolStep.summary}
                                                  </div>
                                                  <div style={historySetMetaValueStyle}>Klart</div>
                                                  {setEntry.comment && (
                                                    <div style={{ fontSize: "13px", color: "#64748b", lineHeight: 1.5 }}>
                                                      Kommentar: {setEntry.comment}
                                                    </div>
                                                  )}
                                                </div>
                                              ) : (
                                                <div style={historySetMetaGridStyle}>
                                                  <div style={historySetMetaItemStyle}>
                                                    <div style={historySetMetaLabelStyle}>Vikt</div>
                                                    <div style={historySetMetaValueStyle}>
                                                      {setEntry.weight ? `${setEntry.weight} kg` : "—"}
                                                    </div>
                                                  </div>
                                                  <div style={historySetMetaItemStyle}>
                                                    <div style={historySetMetaLabelStyle}>Reps</div>
                                                    <div style={historySetMetaValueStyle}>{setEntry.reps || "—"}</div>
                                                  </div>
                                                  <div style={historySetMetaItemStyle}>
                                                    <div style={historySetMetaLabelStyle}>Tid</div>
                                                    <div style={historySetMetaValueStyle}>
                                                      {setEntry.seconds ? `${setEntry.seconds} sek` : "—"}
                                                    </div>
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          )
                                        })}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                        )}
                      </div>
                    )
                  })()}
                </>
              )}
            </div>

            {selectedPlayerHistory.length === 0 ? (
              <p style={mutedTextStyle}>Ingen övningshistorik finns ännu för spelaren.</p>
            ) : (
            <div style={{ display: "grid", gap: "12px", marginBottom: "14px" }}>
              {selectedPlayerHistory.map((entry) => {
                const draft = exerciseGoalDrafts[entry.exercise_id] || {}
                const existingGoal = selectedPlayerExerciseGoals[entry.exercise_id]

                return (
                  <div
                    key={entry.exercise_id}
                    style={{
                      padding: "14px",
                      border: "1px solid #e2e8f0",
                      borderRadius: "14px",
                      backgroundColor: "#ffffff",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: isMobile ? "flex-start" : "center",
                        gap: "10px",
                        flexDirection: isMobile ? "column" : "row",
                        marginBottom: "10px",
                      }}
                    >
                      <div>
                        <div style={{ marginBottom: "4px", fontWeight: "800", color: "#18202b" }}>
                          {entry.exercise_display_name}
                        </div>
                        <div style={{ fontSize: "13px", color: "#64748b" }}>
                          {entry.entry_count} loggade pass
                          {entry.latest_entry?.created_at
                            ? ` • senast ${new Date(entry.latest_entry.created_at).toLocaleDateString("sv-SE")}`
                            : ""}
                        </div>
                      </div>

                      <div
                        style={{
                          display: "inline-flex",
                          padding: "5px 10px",
                          borderRadius: "999px",
                          backgroundColor: existingGoal ? "#ecfdf3" : "#f3f4f6",
                          color: existingGoal ? "#166534" : "#4b5563",
                          fontSize: "12px",
                          fontWeight: "800",
                        }}
                      >
                        {existingGoal ? "Befintligt mål" : "Förslag från historik"}
                      </div>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gap: "10px",
                        gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
                        marginBottom: "12px",
                      }}
                    >
                      <div style={historyStatCardStyle}>
                        <div style={historyStatLabelStyle}>Senaste pass</div>
                        <div style={historyStatValueStyle}>
                          {entry.latest_entry?.top_weight != null
                            ? `${entry.latest_entry.top_weight} kg`
                            : entry.latest_entry?.top_reps
                            ? `${entry.latest_entry.top_reps} reps`
                            : entry.latest_entry?.top_seconds
                            ? `${entry.latest_entry.top_seconds} sek`
                            : "-"}
                        </div>
                        <div style={historyStatMetaStyle}>
                          {[
                            `Set: ${entry.latest_entry?.set_count || 0}`,
                            entry.latest_entry?.top_reps ? `Reps: ${entry.latest_entry.top_reps}` : null,
                            entry.latest_entry?.top_seconds ? `Tid: ${entry.latest_entry.top_seconds} sek` : null,
                          ]
                            .filter(Boolean)
                            .join(" • ")}
                        </div>
                      </div>

                      <div style={historyStatCardStyle}>
                        <div style={historyStatLabelStyle}>Bästa noterade vikt</div>
                        <div style={historyStatValueStyle}>
                          {entry.best_weight_entry?.top_weight != null
                            ? `${entry.best_weight_entry.top_weight} kg`
                            : "-"}
                        </div>
                        <div style={historyStatMetaStyle}>
                          {[
                            `Set: ${entry.best_weight_entry?.set_count || 0}`,
                            entry.best_weight_entry?.top_reps ? `Reps: ${entry.best_weight_entry.top_reps}` : null,
                            entry.best_weight_entry?.top_seconds
                              ? `Tid: ${entry.best_weight_entry.top_seconds} sek`
                              : null,
                          ]
                            .filter(Boolean)
                            .join(" • ")}
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gap: "8px",
                        gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
                        marginBottom: "8px",
                      }}
                    >
                      <input
                        type="number"
                        placeholder="Mål set"
                        value={draft.target_sets ?? ""}
                        onChange={(e) =>
                          handleExerciseGoalDraftChange(entry.exercise_id, "target_sets", e.target.value)
                        }
                        style={{ ...inputStyle, width: "100%" }}
                      />
                      <input
                        type="number"
                        placeholder="Mål reps"
                        value={draft.target_reps ?? ""}
                        onChange={(e) =>
                          handleExerciseGoalDraftChange(entry.exercise_id, "target_reps", e.target.value)
                        }
                        style={{ ...inputStyle, width: "100%" }}
                      />
                    </div>

                    <div style={{ marginBottom: "10px" }}>
                      <div
                        style={{
                          marginBottom: "8px",
                          fontSize: "13px",
                          fontWeight: "800",
                          color: "#18202b",
                        }}
                      >
                        Målvikter per repsintervall
                      </div>
                      <div
                        style={{
                          display: "grid",
                          gap: "8px",
                          gridTemplateColumns: isMobile ? "1fr" : "repeat(5, minmax(0, 1fr))",
                        }}
                      >
                        {repRangeOptions.map((option) => (
                          <div
                            key={`${entry.exercise_id}-${option.key}`}
                            style={{
                              padding: "10px",
                              borderRadius: "12px",
                              border: "1px solid #e2e8f0",
                              backgroundColor: "#f8fafc",
                            }}
                          >
                            <div
                              style={{
                                marginBottom: "6px",
                                fontSize: "12px",
                                fontWeight: "800",
                                color: "#64748b",
                              }}
                            >
                              {option.label}
                            </div>
                            <input
                              type="number"
                              placeholder="kg"
                              value={draft.rep_range_weights?.[option.key] ?? ""}
                              onChange={(e) =>
                                handleExerciseGoalRepRangeWeightDraftChange(
                                  entry.exercise_id,
                                  option.key,
                                  e.target.value
                                )
                              }
                              style={{ ...inputStyle, width: "100%" }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <input
                      type="text"
                      placeholder="Kommentar"
                      value={draft.comment ?? ""}
                      onChange={(e) =>
                        handleExerciseGoalDraftChange(entry.exercise_id, "comment", e.target.value)
                      }
                      style={{ ...inputStyle, width: "100%", marginBottom: "10px" }}
                    />

                    <button
                      type="button"
                      onClick={() => handlePrefillExerciseGoalFromHistory(entry.exercise_id)}
                      style={{ ...quickActionButtonStyle, width: isMobile ? "100%" : "auto" }}
                    >
                      Fyll från historik
                    </button>
                  </div>
                )
              })}
            </div>
            )}

            <button
              type="button"
              onClick={handleSaveExerciseGoals}
              disabled={isSavingExerciseGoals}
              style={{
                width: isMobile ? "100%" : "auto",
                padding: "10px 14px",
                borderRadius: "10px",
                border: "none",
                backgroundColor: "#111827",
                color: "#ffffff",
                cursor: isSavingExerciseGoals ? "default" : "pointer",
                fontSize: "14px",
                fontWeight: "700",
                opacity: isSavingExerciseGoals ? 0.7 : 1,
              }}
            >
              {isSavingExerciseGoals ? "Sparar..." : "Spara personliga övningsmål"}
            </button>
          </div>
        )}
      </div>
      )}
        </>
      )}
    </div>
  )

  return (
    <div style={pageWrapStyle}>
      <div style={pageHeaderStyle}>
        <div style={pageHeaderCopyStyle}>
          <div style={pageEyebrowStyle}>Tränarvy</div>
          <h3 style={{ ...cardTitleStyle, marginBottom: "4px", fontSize: "24px" }}>
            {role === "coach" ? "Spelare" : "Mina spelare"}
          </h3>
          <p style={{ ...mutedTextStyle, margin: 0 }}>
            Öppna en spelare direkt i listan och jobba vidare i samma flöde utan onödig scroll.
          </p>
        </div>

        {role === "coach" && (
          <button
            type="button"
            onClick={() => setCoachView("createPlayer")}
            style={{ ...buttonStyle, width: isMobile ? "100%" : "auto" }}
          >
            Ny användare
          </button>
        )}
      </div>

      <div style={coachSummaryGridStyle(isMobile)}>
        <div style={coachSummaryCardStyle}>
          <div style={coachSummaryLabelStyle}>Aktiva</div>
          <div style={{ ...coachSummaryValueStyle, color: "#c62828" }}>{activePlayerCount}</div>
        </div>
        <div style={coachSummaryCardStyle}>
          <div style={coachSummaryLabelStyle}>Arkiverade</div>
          <div style={coachSummaryValueStyle}>{archivedPlayerCount}</div>
        </div>
        <div style={coachSummaryCardStyle}>
          <div style={coachSummaryLabelStyle}>Historikläge</div>
          <div style={coachSummaryValueStyle}>{historyModeCount}</div>
        </div>
      </div>

      <div style={utilityGridStyle(isMobile)}>
        <button
          type="button"
          onClick={() => setActiveUtilityPanel((current) => (current === "players" ? "" : "players"))}
          style={{
            ...utilityButtonStyle,
            ...(activeUtilityPanel === "players" ? utilityButtonActiveStyle : {}),
          }}
        >
          <div style={utilityButtonTopStyle}>
            <div style={utilityButtonTitleStyle}>Spelarlista</div>
            <div style={utilityBadgeStyle(false)}>{filteredPlayers.length}</div>
          </div>
          <div style={utilityButtonMetaStyle}>Öppna lagets spelare direkt under knappen</div>
        </button>

        {activeUtilityPanel === "players" && (
          <div style={isMobile ? inlineUtilityPanelStyle : { ...inlineUtilityPanelStyle, gridColumn: "1 / -1" }}>
            <div style={inlineUtilityPanelHeaderStyle}>
              <div>
                <div style={inlineUtilityPanelTitleStyle}>Spelare</div>
                <div style={inlineUtilityPanelMetaStyle}>
                  Öppna en spelare direkt i listan. Själva redigeringen ligger kvar inline i samma kort.
                </div>
              </div>
            </div>

            <div style={listToolbarStyle(isMobile)}>
              <input
                type="text"
                placeholder="Sök spelare"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                style={{ ...inputStyle, width: "100%" }}
              />

              <label style={archivedToggleWrapStyle}>
                <input
                  type="checkbox"
                  checked={showArchivedPlayers}
                  onChange={(e) => setShowArchivedPlayers(e.target.checked)}
                />
                <span>Visa arkiverade</span>
              </label>
            </div>

            <div style={listHeaderRowStyle}>
              <div style={{ ...cardTitleStyle, fontSize: "18px", marginBottom: 0 }}>Spelare</div>
              <div style={listHeaderMetaStyle}>{filteredPlayers.length} i listan</div>
            </div>

            {isLoadingPlayers ? (
              <p style={mutedTextStyle}>Laddar spelare...</p>
            ) : filteredPlayers.length === 0 ? (
              <p style={mutedTextStyle}>Inga spelare matchar sökningen</p>
            ) : (
              <div style={{ display: "grid", gap: "10px" }}>
                {filteredPlayers.map((player) => (
                  <div
                    key={player.id}
                    style={{
                      padding: "14px",
                      borderRadius: "16px",
                      border: selectedPlayer?.id === player.id ? "2px solid #c62828" : "1px solid #e5e7eb",
                      backgroundColor: "#ffffff",
                      boxShadow:
                        selectedPlayer?.id === player.id
                          ? "0 12px 24px rgba(198, 40, 40, 0.08)"
                          : "0 8px 18px rgba(24, 32, 43, 0.04)",
                    }}
                  >
                    <div style={playerCardTopRowStyle}>
                      <label style={playerBulkSelectStyle}>
                        <input
                          type="checkbox"
                          checked={bulkSelectedPlayerIds.includes(player.id)}
                          onChange={() => handleToggleBulkSelectedPlayer(player.id)}
                        />
                        <span>Välj</span>
                      </label>

                      <button
                        type="button"
                        onClick={() => setSelectedPlayer(selectedPlayer?.id === player.id ? null : player)}
                        style={{
                          ...playerExpandButtonStyle,
                          color: selectedPlayer?.id === player.id ? "#991b1b" : "#6b7280",
                        }}
                      >
                        {selectedPlayer?.id === player.id ? "−" : "+"}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedPlayer(selectedPlayer?.id === player.id ? null : player)}
                      style={playerCardButtonStyle}
                    >
                      <div style={playerCardNameStyle}>
                        {player.full_name}
                        {player.is_archived ? " • arkiverad" : ""}
                      </div>
                      <div style={playerCardMetaStyle}>
                        @{player.username}
                        {player.latestPass && player.latestPass !== "-" ? ` • ${player.latestPass}` : ""}
                      </div>
                    </button>

                    {selectedPlayer?.id === player.id && renderPlayerEditor(player)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {role === "coach" && (
          <button
            type="button"
            onClick={() => setActiveUtilityPanel((current) => (current === "requests" ? "" : "requests"))}
            style={{
              ...utilityButtonStyle,
              ...(activeUtilityPanel === "requests" ? utilityButtonActiveStyle : {}),
            }}
          >
            <div style={utilityButtonTopStyle}>
              <div style={utilityButtonTitleStyle}>Målrequests</div>
              <div style={utilityBadgeStyle(openRequestCount > 0)}>{openRequestCount}</div>
            </div>
            <div style={utilityButtonMetaStyle}>Öppna och svara direkt under knappen</div>
          </button>
        )}

        {role === "coach" && (
          <button
            type="button"
            onClick={() => setActiveUtilityPanel((current) => (current === "coaches" ? "" : "coaches"))}
            style={{
              ...utilityButtonStyle,
              ...(activeUtilityPanel === "coaches" ? utilityButtonActiveStyle : {}),
            }}
          >
            <div style={utilityButtonTopStyle}>
              <div style={utilityButtonTitleStyle}>Lagets ledare</div>
              <div style={utilityBadgeStyle(false)}>{teamCoaches?.length || 0}</div>
            </div>
            <div style={utilityButtonMetaStyle}>Visa tränare i laget inline</div>
          </button>
        )}

        {filteredPlayers.length > 0 && (
          <button
            type="button"
            onClick={() => setActiveUtilityPanel((current) => (current === "bulk" ? "" : "bulk"))}
            style={{
              ...utilityButtonStyle,
              ...(activeUtilityPanel === "bulk" ? utilityButtonActiveStyle : {}),
            }}
          >
            <div style={utilityButtonTopStyle}>
              <div style={utilityButtonTitleStyle}>Snabbval</div>
              <div style={utilityBadgeStyle(bulkSelectedPlayerIds.length > 0)}>{bulkSelectedPlayerIds.length}</div>
            </div>
            <div style={utilityButtonMetaStyle}>Ändra målstyrning för flera spelare samtidigt</div>
          </button>
        )}
      </div>

      {activeUtilityPanel === "requests" && role === "coach" && (
        <div style={inlineUtilityPanelStyle}>
          <div style={inlineUtilityPanelHeaderStyle}>
            <div>
              <div style={inlineUtilityPanelTitleStyle}>Öppna målrequests</div>
              <div style={inlineUtilityPanelMetaStyle}>Hantera spelarens önskemål direkt här.</div>
            </div>
          </div>

          {isLoadingTargetChangeRequests ? (
            <p style={mutedTextStyle}>Laddar requests...</p>
          ) : targetChangeRequests.length === 0 ? (
            <p style={{ ...mutedTextStyle, margin: 0 }}>Inga öppna requests just nu.</p>
          ) : (
            <div style={{ display: "grid", gap: "10px" }}>
              {targetChangeRequests.map((request) => {
                const reviewWeight = targetChangeRequestReviewDrafts[request.id] ?? ""
                const linkedPlayer = players.find((player) => player.id === request.player_id) || null
                const isUpdating = updatingTargetChangeRequestId === request.id

                return (
                  <div key={request.id} style={inlineRequestCardStyle}>
                    <div style={inlineRequestHeaderStyle(isMobile)}>
                      <div>
                        <div style={inlineRequestTitleStyle}>
                          {request.player_name} • {request.exercise_name}
                        </div>
                        <div style={inlineRequestMetaStyle}>
                          {request.request_type === "increase"
                            ? "Vill höja målvikt"
                            : request.request_type === "decrease"
                            ? "Vill sänka målvikt"
                            : "Vill att målvikt ses över"}
                          {` • ${repRangeOptions.find((option) => option.key === request.rep_range_key)?.label || request.rep_range_key}`}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => linkedPlayer && setSelectedPlayer(linkedPlayer)}
                        style={{ ...quickActionButtonStyle, width: isMobile ? "100%" : "auto" }}
                      >
                        Öppna spelare
                      </button>
                    </div>

                    <div style={inlineRequestStatsGridStyle(isMobile)}>
                      <div style={historyStatCardStyle}>
                        <div style={historyStatLabelStyle}>Nuvarande mål</div>
                        <div style={historyStatValueStyle}>
                          {request.current_target_weight != null ? `${request.current_target_weight} kg` : "-"}
                        </div>
                      </div>
                      <div style={historyStatCardStyle}>
                        <div style={historyStatLabelStyle}>Senaste logg</div>
                        <div style={historyStatValueStyle}>
                          {request.latest_logged_weight != null ? `${request.latest_logged_weight} kg` : "-"}
                        </div>
                        <div style={historyStatMetaStyle}>{request.latest_logged_reps_text || ""}</div>
                      </div>
                      <div style={historyStatCardStyle}>
                        <div style={historyStatLabelStyle}>Skickad</div>
                        <div style={historyStatValueStyle}>
                          {new Date(request.created_at).toLocaleDateString("sv-SE")}
                        </div>
                      </div>
                    </div>

                    {request.comment ? (
                      <div style={inlineRequestCommentStyle}>
                        <strong>Kommentar:</strong> {request.comment}
                      </div>
                    ) : null}

                    <div style={inlineRequestActionsStyle(isMobile)}>
                      <input
                        type="number"
                        placeholder="Ny målvikt"
                        value={reviewWeight}
                        onChange={(e) => handleSetTargetChangeReviewDraft(request.id, e.target.value)}
                        style={{ ...inputStyle, width: isMobile ? "100%" : "140px" }}
                      />
                      <button
                        type="button"
                        onClick={() => handleReviewTargetChangeRequest(request, "approved")}
                        disabled={isUpdating}
                        style={{
                          ...quickActionButtonStyle,
                          width: isMobile ? "100%" : "auto",
                          opacity: isUpdating ? 0.7 : 1,
                        }}
                      >
                        {isUpdating ? "Sparar..." : "Godkänn"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReviewTargetChangeRequest(request, "rejected")}
                        disabled={isUpdating}
                        style={{
                          ...quickActionButtonStyle,
                          width: isMobile ? "100%" : "auto",
                          backgroundColor: "#ffffff",
                          color: "#991b1b",
                          border: "1px solid #efc7c7",
                          opacity: isUpdating ? 0.7 : 1,
                        }}
                      >
                        Avslå
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {activeUtilityPanel === "coaches" && role === "coach" && (
        <div style={inlineUtilityPanelStyle}>
          <div style={inlineUtilityPanelHeaderStyle}>
            <div>
              <div style={inlineUtilityPanelTitleStyle}>Lagets ledare</div>
              <div style={inlineUtilityPanelMetaStyle}>Här ser du tränarna som hör till laget.</div>
            </div>
          </div>

          {teamCoaches?.length ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {teamCoaches.map((coach) => (
                <div key={coach.id} style={coachChipStyle}>
                  <div style={coachChipNameStyle}>{coach.full_name}</div>
                  <div style={coachChipMetaStyle}>@{coach.username}</div>
                </div>
              ))}
            </div>
          ) : (
            <p style={mutedTextStyle}>Inga andra tränare finns i laget ännu.</p>
          )}
        </div>
      )}

      {activeUtilityPanel === "bulk" && filteredPlayers.length > 0 && (
        <div style={inlineUtilityPanelStyle}>
          <div style={inlineUtilityPanelHeaderStyle}>
            <div>
              <div style={inlineUtilityPanelTitleStyle}>Snabbval för flera spelare</div>
              <div style={inlineUtilityPanelMetaStyle}>
                {bulkSelectedPlayerIds.length > 0
                  ? `${bulkSelectedPlayerIds.length} spelare valda för målstyrning`
                  : "Markera spelare i listan och ändra läge här."}
              </div>
            </div>
          </div>

          <div style={bulkActionButtonsStyle(isMobile)}>
            <button
              type="button"
              onClick={() => handleSetIndividualGoalsEnabled(bulkSelectedPlayerIds, false)}
              disabled={bulkSelectedPlayerIds.length === 0}
              style={{
                ...quickActionButtonStyle,
                opacity: bulkSelectedPlayerIds.length === 0 ? 0.7 : 1,
                cursor: bulkSelectedPlayerIds.length === 0 ? "default" : "pointer",
                width: isMobile ? "100%" : "auto",
              }}
            >
              Stäng av mål
            </button>
            <button
              type="button"
              onClick={() => handleSetIndividualGoalsEnabled(bulkSelectedPlayerIds, true)}
              disabled={bulkSelectedPlayerIds.length === 0}
              style={{
                ...quickActionButtonStyle,
                backgroundColor: "#ffffff",
                color: "#18202b",
                opacity: bulkSelectedPlayerIds.length === 0 ? 0.7 : 1,
                cursor: bulkSelectedPlayerIds.length === 0 ? "default" : "pointer",
                width: isMobile ? "100%" : "auto",
              }}
            >
              Aktivera mål
            </button>
          </div>
        </div>
      )}

    </div>
  )
}

const pageWrapStyle = {
  width: "100%",
  minWidth: 0,
  overflowX: "hidden",
}

const pageHeaderStyle = {
  marginBottom: "16px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "12px",
  flexWrap: "wrap",
}

const pageHeaderCopyStyle = {
  display: "grid",
  gap: "4px",
}

const pageEyebrowStyle = {
  fontSize: "12px",
  fontWeight: "800",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#991b1b",
}

const coachSummaryGridStyle = (isMobile) => ({
  display: "grid",
  gap: "10px",
  gridTemplateColumns: isMobile ? "repeat(3, minmax(0, 1fr))" : "repeat(3, minmax(0, 1fr))",
  marginBottom: "14px",
})

const coachSummaryCardStyle = {
  padding: "13px 12px",
  borderRadius: "16px",
  border: "1px solid rgba(15, 23, 42, 0.08)",
  backgroundColor: "#ffffff",
  boxShadow: "0 12px 28px rgba(15, 23, 42, 0.04)",
}

const coachSummaryLabelStyle = {
  marginBottom: "6px",
  fontSize: "11px",
  fontWeight: "800",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#6b7280",
}

const coachSummaryValueStyle = {
  fontSize: "24px",
  fontWeight: "900",
  lineHeight: 1,
  color: "#111827",
}

const utilityGridStyle = (isMobile) => ({
  display: "grid",
  gap: "10px",
  gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
  marginBottom: "10px",
})

const utilityButtonStyle = {
  padding: "14px",
  borderRadius: "16px",
  border: "1px solid #ece5e5",
  backgroundColor: "#ffffff",
  textAlign: "left",
  cursor: "pointer",
  boxShadow: "0 10px 24px rgba(24, 32, 43, 0.04)",
}

const utilityButtonActiveStyle = {
  borderColor: "#efc7c7",
  backgroundColor: "#fff7f7",
}

const utilityButtonTopStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "10px",
  marginBottom: "6px",
}

const utilityButtonTitleStyle = {
  fontSize: "15px",
  fontWeight: "900",
  color: "#18202b",
}

const utilityButtonMetaStyle = {
  fontSize: "13px",
  lineHeight: 1.5,
  color: "#6b7280",
}

const utilityBadgeStyle = (isActive) => ({
  minWidth: "28px",
  height: "28px",
  padding: "0 8px",
  borderRadius: "999px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: isActive ? "#c62828" : "#f3f4f6",
  color: isActive ? "#ffffff" : "#4b5563",
  fontSize: "12px",
  fontWeight: "800",
})

const inlineUtilityPanelStyle = {
  marginBottom: "14px",
  padding: "14px",
  borderRadius: "16px",
  border: "1px solid #ece5e5",
  backgroundColor: "#fffdfd",
}

const inlineUtilityPanelHeaderStyle = {
  marginBottom: "12px",
}

const inlineUtilityPanelTitleStyle = {
  fontSize: "16px",
  fontWeight: "900",
  color: "#18202b",
  marginBottom: "4px",
}

const inlineUtilityPanelMetaStyle = {
  fontSize: "13px",
  color: "#64748b",
}

const inlineRequestCardStyle = {
  padding: "12px",
  borderRadius: "14px",
  border: "1px solid #f0dada",
  backgroundColor: "#ffffff",
}

const inlineRequestHeaderStyle = (isMobile) => ({
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  alignItems: isMobile ? "flex-start" : "center",
  flexDirection: isMobile ? "column" : "row",
  marginBottom: "8px",
})

const inlineRequestTitleStyle = {
  fontSize: "15px",
  fontWeight: "800",
  color: "#18202b",
}

const inlineRequestMetaStyle = {
  fontSize: "12px",
  color: "#6b7280",
  marginTop: "4px",
}

const inlineRequestStatsGridStyle = (isMobile) => ({
  display: "grid",
  gap: "8px",
  gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))",
  marginBottom: "10px",
})

const inlineRequestCommentStyle = {
  marginBottom: "10px",
  fontSize: "13px",
  color: "#334155",
  lineHeight: 1.5,
}

const inlineRequestActionsStyle = (isMobile) => ({
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  alignItems: "center",
  flexDirection: isMobile ? "column" : "row",
})

const quickActionButtonStyle = {
  padding: "10px 14px",
  borderRadius: "10px",
  border: "1px solid #d1d5db",
  backgroundColor: "#111827",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: "700",
}

const bulkActionCardStyle = (isMobile) => ({
  marginBottom: "14px",
  padding: "14px 16px",
  borderRadius: "16px",
  border: "1px solid #ece5e5",
  backgroundColor: "#fffdfd",
  display: "flex",
  justifyContent: "space-between",
  alignItems: isMobile ? "stretch" : "center",
  flexDirection: isMobile ? "column" : "row",
  gap: "12px",
})

const bulkActionTitleStyle = {
  fontSize: "15px",
  fontWeight: "800",
  color: "#18202b",
  marginBottom: "4px",
}

const bulkActionMetaStyle = {
  fontSize: "13px",
  color: "#6b7280",
}

const bulkActionButtonsStyle = (isMobile) => ({
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  width: isMobile ? "100%" : "auto",
})

const mobilePlayerMetaPillStyle = {
  display: "inline-flex",
  padding: "5px 9px",
  borderRadius: "999px",
  backgroundColor: "#f8f0f0",
  color: "#4b5563",
  fontSize: "12px",
  fontWeight: "700",
}

const mobileArchivedPillStyle = {
  display: "inline-flex",
  padding: "5px 9px",
  borderRadius: "999px",
  backgroundColor: "#fff1f1",
  color: "#991b1b",
  fontSize: "12px",
  fontWeight: "800",
}

const playerCardTopRowStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "10px",
  marginBottom: "8px",
}

const playerBulkSelectStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  fontSize: "12px",
  fontWeight: "800",
  color: "#6b7280",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
}

const playerExpandButtonStyle = {
  width: "28px",
  height: "28px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "999px",
  border: "1px solid #f0d3d3",
  backgroundColor: "#ffffff",
  fontSize: "18px",
  fontWeight: "900",
  cursor: "pointer",
  flexShrink: 0,
}

const playerCardMainButtonStyle = {
  width: "100%",
  textAlign: "left",
  background: "transparent",
  border: "none",
  padding: 0,
  cursor: "pointer",
}

const listToolbarStyle = (isMobile) => ({
  display: "grid",
  gap: "10px",
  gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1fr) auto",
  alignItems: "center",
  marginBottom: "14px",
})

const listHeaderRowStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  marginBottom: "10px",
  flexWrap: "wrap",
}

const listHeaderMetaStyle = {
  fontSize: "13px",
  fontWeight: "700",
  color: "#6b7280",
}

const archivedToggleWrapStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  marginBottom: "14px",
  fontSize: "14px",
  fontWeight: "700",
  color: "#374151",
}

const playerActionBarStyle = (isMobile) => ({
  display: "flex",
  gap: "10px",
  flexDirection: isMobile ? "column" : "row",
  flexWrap: "wrap",
  marginBottom: "14px",
})

const archiveButtonStyle = {
  padding: "10px 14px",
  borderRadius: "12px",
  border: "1px solid #dbe5ef",
  backgroundColor: "#ffffff",
  color: "#18202b",
  fontSize: "14px",
  fontWeight: "800",
}

const archivedStatusBadgeStyle = {
  display: "inline-flex",
  padding: "8px 12px",
  borderRadius: "999px",
  backgroundColor: "#fff1f1",
  color: "#991b1b",
  fontSize: "13px",
  fontWeight: "800",
}

const archivedInfoCardStyle = {
  marginBottom: "14px",
  padding: "12px 14px",
  borderRadius: "14px",
  border: "1px solid #f0dada",
  backgroundColor: "#fff7f7",
  color: "#7f1d1d",
  fontSize: "13px",
  lineHeight: 1.6,
  fontWeight: "700",
}

const editorSummaryCardStyle = {
  marginBottom: "14px",
  padding: "14px 16px",
  borderRadius: "16px",
  border: "1px solid #ece5e5",
  backgroundColor: "#ffffff",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "10px",
  flexWrap: "wrap",
}

const editorSummaryTitleStyle = {
  fontSize: "18px",
  fontWeight: "900",
  color: "#18202b",
  marginBottom: "4px",
}

const editorSummaryMetaStyle = {
  fontSize: "13px",
  color: "#64748b",
}

const editorSummaryBadgeStyle = {
  display: "inline-flex",
  padding: "6px 10px",
  borderRadius: "999px",
  backgroundColor: "#fff7f7",
  color: "#991b1b",
  fontSize: "12px",
  fontWeight: "800",
}

const editorSectionTabsStyle = (isMobile) => ({
  display: "flex",
  gap: "8px",
  flexDirection: isMobile ? "column" : "row",
  flexWrap: "wrap",
  marginBottom: "14px",
})

const editorSectionButtonStyle = {
  padding: "10px 14px",
  borderRadius: "999px",
  border: "1px solid #dbe5ef",
  backgroundColor: "#ffffff",
  color: "#566173",
  fontSize: "13px",
  fontWeight: "800",
  cursor: "pointer",
}

const editorSectionButtonActiveStyle = {
  backgroundColor: "#fff1f1",
  borderColor: "#efc7c7",
  color: "#991b1b",
}

const editorSectionCardStyle = {
  marginTop: "12px",
}

const sectionHeaderCompactStyle = {
  marginBottom: "12px",
}

const sectionTitleCompactStyle = {
  fontSize: "16px",
  fontWeight: "900",
  color: "#18202b",
  marginBottom: "4px",
}

const sectionMetaCompactStyle = {
  fontSize: "13px",
  color: "#64748b",
}

const editorOverviewGridStyle = (isMobile) => ({
  display: "grid",
  gap: "10px",
  gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
})

const miniStatCardStyle = {
  padding: "12px",
  borderRadius: "14px",
  border: "1px solid #e5e7eb",
  backgroundColor: "#ffffff",
}

const miniStatLabelStyle = {
  fontSize: "12px",
  fontWeight: "800",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: "#6b7280",
  marginBottom: "6px",
}

const miniStatValueStyle = {
  fontSize: "16px",
  fontWeight: "800",
  color: "#18202b",
}

const coachChipStyle = {
  display: "grid",
  gap: "2px",
  padding: "10px 12px",
  borderRadius: "14px",
  backgroundColor: "#fff1f1",
  border: "1px solid #f0dada",
}

const coachChipNameStyle = {
  fontSize: "14px",
  fontWeight: "800",
  color: "#18202b",
}

const coachChipMetaStyle = {
  fontSize: "12px",
  color: "#6b7280",
}

const historyStatCardStyle = {
  padding: "12px",
  borderRadius: "12px",
  backgroundColor: "#f8fafc",
  border: "1px solid #dbe5ef",
}

const historyStatLabelStyle = {
  fontSize: "12px",
  fontWeight: "800",
  color: "#46607a",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  marginBottom: "6px",
}

const historyStatValueStyle = {
  fontSize: "18px",
  fontWeight: "800",
  color: "#18202b",
  marginBottom: "4px",
}

const historyStatMetaStyle = {
  fontSize: "13px",
  color: "#64748b",
}

const historyViewerCardStyle = {
  marginBottom: "16px",
  padding: "14px",
  borderRadius: "16px",
  border: "1px solid #e2e8f0",
  backgroundColor: "#f8fbff",
}

const historySessionPickerStyle = {
  display: "grid",
  gap: "10px",
  marginBottom: "14px",
}

const historySessionButtonStyle = {
  padding: "12px 14px",
  borderRadius: "14px",
  border: "1px solid #e2e8f0",
  backgroundColor: "#ffffff",
  textAlign: "left",
  cursor: "pointer",
}

const historySessionButtonTitleStyle = {
  fontSize: "14px",
  fontWeight: "800",
  color: "#18202b",
  marginBottom: "4px",
}

const historySessionButtonMetaStyle = {
  fontSize: "12px",
  color: "#64748b",
}

const historySessionSummaryStyle = {
  marginBottom: "12px",
  padding: "12px 14px",
  borderRadius: "14px",
  backgroundColor: "#ffffff",
  border: "1px solid #e2e8f0",
}

const historySessionSummaryTitleStyle = {
  fontSize: "16px",
  fontWeight: "900",
  color: "#18202b",
  marginBottom: "4px",
}

const historySessionSummaryMetaStyle = {
  fontSize: "13px",
  color: "#64748b",
}

const historySessionRunningCardStyle = {
  padding: "14px",
  borderRadius: "14px",
  border: "1px solid #e2e8f0",
  backgroundColor: "#ffffff",
  color: "#18202b",
  fontSize: "14px",
  fontWeight: "700",
}

const historyExerciseCardsViewportStyle = {
  width: "100%",
  overflowX: "auto",
  WebkitOverflowScrolling: "touch",
  scrollSnapType: "x mandatory",
}

const historyExerciseCardsTrackStyle = {
  display: "grid",
  gridAutoFlow: "column",
  gridAutoColumns: "100%",
  gap: "12px",
}

const historyExerciseCardStyle = {
  width: "100%",
  minWidth: 0,
  padding: "14px",
  borderRadius: "16px",
  border: "1px solid #e2e8f0",
  backgroundColor: "#ffffff",
  scrollSnapAlign: "start",
}

const historyExerciseCardTitleStyle = {
  fontSize: "16px",
  fontWeight: "900",
  color: "#18202b",
  marginBottom: "4px",
}

const historyExerciseCardSubStyle = {
  fontSize: "13px",
  color: "#64748b",
  marginBottom: "10px",
}

const historySetListStyle = {
  display: "grid",
  gap: "10px",
}

const historySetCardStyle = {
  padding: "12px",
  borderRadius: "14px",
  border: "1px solid #edf2f7",
  backgroundColor: "#f8fafc",
}

const historySetTitleStyle = {
  fontSize: "13px",
  fontWeight: "800",
  color: "#18202b",
  marginBottom: "8px",
}

const historySetWarmupBadgeStyle = {
  display: "inline-flex",
  marginBottom: "8px",
  padding: "5px 8px",
  borderRadius: "999px",
  backgroundColor: "#fff7ed",
  color: "#b45309",
  fontSize: "11px",
  fontWeight: "800",
}

const historySetMetaGridStyle = {
  display: "grid",
  gap: "8px",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
}

const historySetMetaItemStyle = {
  display: "grid",
  gap: "4px",
}

const historySetMetaLabelStyle = {
  fontSize: "11px",
  fontWeight: "800",
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  color: "#64748b",
}

const historySetMetaValueStyle = {
  fontSize: "14px",
  fontWeight: "800",
  color: "#18202b",
}

export default PlayersPage
