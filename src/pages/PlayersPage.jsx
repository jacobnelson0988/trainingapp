import { useState } from "react"

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
  isLoadingSelectedPlayerHistory,
  exerciseGoalDrafts,
  selectedPlayerExerciseGoals,
  handleExerciseGoalDraftChange,
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
  const [selectedTargetExerciseByPass, setSelectedTargetExerciseByPass] = useState({})
  const [selectedWorkoutByPlayer, setSelectedWorkoutByPlayer] = useState({})
  const [bulkSelectedPlayerIds, setBulkSelectedPlayerIds] = useState([])
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
      <div
        style={{
          display: "grid",
          gap: "10px",
          gridTemplateColumns: isMobile ? "1fr" : "repeat(4, minmax(0, 1fr))",
          marginBottom: "14px",
        }}
      >
        <div style={summaryCardStyle}>
          <div style={summaryLabelStyle}>Namn</div>
          <div style={summaryValueStyle}>{player.full_name}</div>
        </div>
        <div style={summaryCardStyle}>
          <div style={summaryLabelStyle}>Målstyrning</div>
          <div style={summaryValueStyle}>
            {player.individual_goals_enabled === false ? "Historikbaserad" : "Individuella mål"}
          </div>
        </div>
        <div style={summaryCardStyle}>
          <div style={summaryLabelStyle}>Senaste pass</div>
          <div style={summaryValueStyle}>{player.latestPass || "-"}</div>
        </div>
        <div style={summaryCardStyle}>
          <div style={summaryLabelStyle}>Totalt antal pass</div>
          <div style={summaryValueStyle}>{player.totalPasses ?? 0}</div>
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

      <div style={{ marginTop: "12px" }}>
        <h3 style={cardTitleStyle}>Tilldelade pass</h3>
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

        <h3 style={cardTitleStyle}>Individuella mål per övning</h3>

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
                selectedWorkoutByPlayer[player.id] ||
                assignedPassCodes[0] ||
                ""
              const passExercises = activeWorkouts[selectedPassKey]?.exercises || []
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
                      {assignedPassCodes.map((passKey) => (
                        <option key={passKey} value={passKey}>
                          {activeWorkouts[passKey]?.label || passKey}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "14px" }}>
                    {(activeWorkouts[selectedPassKey]?.exercises || []).length} övningar. Välj en övning och sätt bara individuella reps, vikt eller kommentar här.
                  </div>

                  {passExercises.length === 0 ? (
                    <div style={mutedTextStyle}>Det här passet har inga styrkeövningar att sätta individuella mål på.</div>
                  ) : (
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
                              type="number"
                              placeholder="Reps"
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
                  )}
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

      <div style={{ marginTop: "18px" }}>
        <h3 style={cardTitleStyle}>Historik och personliga mål per övning</h3>
        <p style={{ ...mutedTextStyle, marginBottom: "12px" }}>
          Använd spelarens historik som grund och spara ett separat personligt mål per övning.
        </p>

        {player.individual_goals_enabled === false ? (
          <div style={archivedInfoCardStyle}>
            Personliga övningsmål är avstängda. Träningsrekommendationer byggs nu i stället på spelarens egen historik.
          </div>
        ) : isLoadingSelectedPlayerHistory ? (
          <p style={mutedTextStyle}>Laddar historik...</p>
        ) : selectedPlayerHistory.length === 0 ? (
          <p style={mutedTextStyle}>Ingen historik finns ännu för spelaren.</p>
        ) : (
          <div>
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
                            : entry.latest_entry?.top_reps || entry.latest_entry?.top_seconds || "-"}
                        </div>
                        <div style={historyStatMetaStyle}>
                          {entry.latest_entry?.top_reps
                            ? `${entry.latest_entry.top_reps} reps`
                            : entry.latest_entry?.top_seconds
                            ? `${entry.latest_entry.top_seconds} sek`
                            : `${entry.latest_entry?.set_count || 0} set`}
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
                          {entry.best_weight_entry?.top_reps
                            ? `${entry.best_weight_entry.top_reps} reps`
                            : entry.best_weight_entry?.top_seconds
                            ? `${entry.best_weight_entry.top_seconds} sek`
                            : `${entry.best_weight_entry?.set_count || 0} set`}
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gap: "8px",
                        gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))",
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
                      <input
                        type="number"
                        placeholder="Mål vikt"
                        value={draft.target_weight ?? ""}
                        onChange={(e) =>
                          handleExerciseGoalDraftChange(entry.exercise_id, "target_weight", e.target.value)
                        }
                        style={{ ...inputStyle, width: "100%" }}
                      />
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
        </>
      )}
    </div>
  )

  return (
    <>
      <div
        style={{
          marginBottom: "14px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: isMobile ? "stretch" : "center",
          gap: "12px",
          flexDirection: isMobile ? "column" : "row",
        }}
      >
        <div>
          <h3 style={{ ...cardTitleStyle, marginBottom: "4px" }}>
            {role === "coach" ? "Användare i laget" : "Mina spelare"}
          </h3>
          <p style={mutedTextStyle}>
            {role === "coach"
              ? "Se lagets spelare och ledare. Spelare kan öppnas för pass och individuella mål."
              : "Sök fram spelare snabbt och redigera direkt under vald rad eller kort."}
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

      {role === "coach" && (
        <div
          style={{
            marginBottom: "16px",
            padding: "14px",
            borderRadius: "16px",
            border: "1px solid #ece5e5",
            backgroundColor: "#fffdfd",
          }}
        >
          <div style={{ ...cardTitleStyle, fontSize: "18px", marginBottom: "8px" }}>Lagets ledare</div>
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

      <input
        type="text"
        placeholder={role === "coach" ? "Sök spelare" : "Sök spelare"}
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
        style={{ ...inputStyle, width: "100%", marginBottom: "14px" }}
      />

      <label style={archivedToggleWrapStyle}>
        <input
          type="checkbox"
          checked={showArchivedPlayers}
          onChange={(e) => setShowArchivedPlayers(e.target.checked)}
        />
        <span>Visa arkiverade</span>
      </label>

      {filteredPlayers.length > 0 && (
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "14px" }}>
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
            Stäng av mål för valda
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
            Aktivera mål för valda
          </button>
        </div>
      )}

      <div style={{ ...cardTitleStyle, fontSize: "18px", marginBottom: "10px" }}>Spelare</div>

      {isLoadingPlayers ? (
        <p style={mutedTextStyle}>Laddar spelare...</p>
      ) : filteredPlayers.length === 0 ? (
        <p style={mutedTextStyle}>Inga spelare matchar sökningen</p>
      ) : isMobile ? (
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
              <label style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                <input
                  type="checkbox"
                  checked={bulkSelectedPlayerIds.includes(player.id)}
                  onChange={() => handleToggleBulkSelectedPlayer(player.id)}
                />
                <span style={{ fontSize: "12px", fontWeight: "800", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Markera för bulkändring
                </span>
              </label>
              <button
                type="button"
                onClick={() => setSelectedPlayer(selectedPlayer?.id === player.id ? null : player)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  background: "transparent",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                }}
              >
                <div style={{ fontSize: "16px", fontWeight: "800", color: "#111827", marginBottom: "6px" }}>
                  {player.full_name}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "8px" }}>
                  <span style={mobilePlayerMetaPillStyle}>Senaste: {player.latestPass || "-"}</span>
                  <span style={mobilePlayerMetaPillStyle}>{player.totalPasses ?? 0} pass</span>
                  <span style={mobilePlayerMetaPillStyle}>
                    {player.individual_goals_enabled === false ? "Historikläge" : "Individuella mål"}
                  </span>
                  {player.is_archived && <span style={mobileArchivedPillStyle}>Arkiverad</span>}
                </div>
                <div style={{ fontSize: "12px", color: "#6b7280", fontWeight: "700" }}>
                  {selectedPlayer?.id === player.id ? "Tryck igen för att stänga" : "Tryck för att visa detaljer"}
                </div>
              </button>

              {selectedPlayer?.id === player.id && renderPlayerEditor(player)}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 8px", fontSize: "14px" }}>
            <thead>
              <tr style={{ textAlign: "left" }}>
                <th style={tableHeadStyle}>Val</th>
                <th style={tableHeadStyle}>Namn</th>
                <th style={tableHeadStyle}>Senaste pass</th>
                <th style={tableHeadStyle}>Målstyrning</th>
                <th style={tableHeadStyle}>Totalt antal pass</th>
              </tr>
            </thead>
            <tbody>
              {filteredPlayers.map((player) => {
                const isSelected = selectedPlayer?.id === player.id

                return (
                  <>
                    <tr
                      key={player.id}
                      style={{
                        cursor: "pointer",
                        backgroundColor: "#ffffff",
                      }}
                      onClick={() => setSelectedPlayer(isSelected ? null : player)}
                    >
                      <td style={{ ...tableCellStyle, borderTopLeftRadius: "12px", borderBottomLeftRadius: "12px", borderLeft: isSelected ? "2px solid #c62828" : "1px solid #e5e7eb" }}>
                        <input
                          type="checkbox"
                          checked={bulkSelectedPlayerIds.includes(player.id)}
                          onChange={(event) => {
                            event.stopPropagation()
                            handleToggleBulkSelectedPlayer(player.id)
                          }}
                        />
                      </td>
                      <td style={tableCellStyle}>
                        <div>{player.full_name}</div>
                        {player.is_archived && <div style={desktopArchivedMetaStyle}>Arkiverad</div>}
                      </td>
                      <td style={tableCellStyle}>{player.latestPass || "-"}</td>
                      <td style={tableCellStyle}>
                        {player.individual_goals_enabled === false ? "Historikläge" : "Individuella mål"}
                      </td>
                      <td style={{ ...tableCellStyle, borderTopRightRadius: "12px", borderBottomRightRadius: "12px", borderRight: isSelected ? "2px solid #c62828" : "1px solid #e5e7eb" }}>
                        {player.totalPasses ?? 0}
                      </td>
                    </tr>
                    {isSelected && (
                      <tr key={`${player.id}-editor`}>
                        <td colSpan={5} style={{ padding: 0 }}>
                          {renderPlayerEditor(player)}
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

const tableHeadStyle = {
  padding: "8px 12px",
  color: "#6b7280",
  fontSize: "12px",
  fontWeight: "800",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
}

const tableCellStyle = {
  padding: "14px 12px",
  backgroundColor: "#ffffff",
  borderTop: "1px solid #e5e7eb",
  borderBottom: "1px solid #e5e7eb",
  color: "#18202b",
}

const quickActionButtonStyle = {
  padding: "10px 14px",
  borderRadius: "10px",
  border: "1px solid #d1d5db",
  backgroundColor: "#111827",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: "700",
}

const summaryCardStyle = {
  padding: "12px",
  borderRadius: "14px",
  border: "1px solid #f0e5e5",
  backgroundColor: "#ffffff",
}

const summaryLabelStyle = {
  marginBottom: "4px",
  fontSize: "12px",
  color: "#6b7280",
  fontWeight: "800",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
}

const summaryValueStyle = {
  fontSize: "14px",
  color: "#18202b",
  fontWeight: "800",
}

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

const desktopArchivedMetaStyle = {
  marginTop: "4px",
  fontSize: "11px",
  fontWeight: "800",
  color: "#991b1b",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
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

const deleteButtonStyle = {
  padding: "10px 14px",
  borderRadius: "12px",
  border: "1px solid #efc7c7",
  backgroundColor: "#fff1f1",
  color: "#991b1b",
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

export default PlayersPage
