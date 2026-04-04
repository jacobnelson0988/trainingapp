function PlayersPage({
  isLoadingPlayers,
  players,
  selectedPlayer,
  setSelectedPlayer,
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
  handleAssignPassToPlayer,
  handleUnassignPassFromPlayer,
}) {
  const allPassKeys = Object.keys(activeWorkouts)
  const assignedPassSet = new Set(assignedPassCodes || [])

  return (
    <>
      <h3 style={cardTitleStyle}>Mina spelare</h3>

      {isLoadingPlayers ? (
        <p style={mutedTextStyle}>Laddar spelare...</p>
      ) : players.length === 0 ? (
        <p style={mutedTextStyle}>Inga spelare skapade ännu</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #e5e7eb", textAlign: "left" }}>
                <th style={{ padding: "10px 8px" }}>Användarnamn</th>
                <th style={{ padding: "10px 8px" }}>Förnamn</th>
                <th style={{ padding: "10px 8px" }}>Efternamn</th>
                <th style={{ padding: "10px 8px" }}>Senaste pass</th>
                <th style={{ padding: "10px 8px" }}>Totalt antal pass</th>
                <th style={{ padding: "10px 8px" }}>Kommentar</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player) => {
                const names = (player.full_name || "").trim().split(/\s+/)
                const firstName = names[0] || ""
                const lastName = names.slice(1).join(" ")

                return (
                  <tr
                    key={player.id}
                    style={{
                      borderBottom: "1px solid #f1f5f9",
                      cursor: "pointer",
                      backgroundColor: selectedPlayer?.id === player.id ? "#f9fafb" : "transparent",
                    }}
                    onClick={() => setSelectedPlayer(player)}
                  >
                    <td style={{ padding: "10px 8px", color: "#374151" }}>{player.username}</td>
                    <td style={{ padding: "10px 8px", color: "#111827" }}>{firstName}</td>
                    <td style={{ padding: "10px 8px", color: "#111827" }}>{lastName}</td>
                    <td style={{ padding: "10px 8px", color: "#6b7280" }}>{player.latestPass || "-"}</td>
                    <td style={{ padding: "10px 8px", color: "#6b7280" }}>{player.totalPasses ?? 0}</td>
                    <td style={{ padding: "10px 8px" }}>
                      <input
                        type="text"
                        value={commentDrafts[player.id] ?? ""}
                        placeholder="Skriv kommentar"
                        onChange={(e) => handleCommentChange(player.id, e.target.value)}
                        onBlur={() => handleCommentSave(player.id)}
                        style={{
                          ...inputStyle,
                          width: "100%",
                          minWidth: "140px",
                          padding: "8px 10px",
                          fontSize: "13px",
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {selectedPlayer && (
        <div
          style={{
            marginTop: "16px",
            padding: "14px",
            border: "1px solid #e5e7eb",
            borderRadius: "10px",
            backgroundColor: "#f9fafb",
          }}
        >
          <h3 style={cardTitleStyle}>Vald spelare</h3>

          <div style={{ fontSize: "14px", color: "#111827", marginBottom: "6px" }}>
            <strong>Namn:</strong> {selectedPlayer.full_name}
          </div>

          <div style={{ fontSize: "14px", color: "#374151", marginBottom: "6px" }}>
            <strong>Användarnamn:</strong> {selectedPlayer.username}
          </div>

          <div style={{ fontSize: "14px", color: "#374151", marginBottom: "6px" }}>
            <strong>Senaste pass:</strong> {selectedPlayer.latestPass || "-"}
          </div>

          <div style={{ fontSize: "14px", color: "#374151", marginBottom: "6px" }}>
            <strong>Totalt antal pass:</strong> {selectedPlayer.totalPasses ?? 0}
          </div>

          <div style={{ fontSize: "14px", color: "#374151", marginBottom: "12px" }}>
            <strong>Kommentar:</strong> {selectedPlayer.comment || "-"}
          </div>

          <div style={{ marginTop: "12px" }}>
            <h3 style={cardTitleStyle}>Tilldelade pass</h3>

            <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
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
                    padding: "10px 14px",
                    borderRadius: "10px",
                    border: "1px solid #d1d5db",
                    backgroundColor: assignedPassSet.has(passKey) ? "#111827" : "#ffffff",
                    color: assignedPassSet.has(passKey) ? "#ffffff" : "#111827",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "700",
                  }}
                >
                  {assignedPassSet.has(passKey) ? `Tilldelad: ${activeWorkouts[passKey].label}` : `Tilldela ${activeWorkouts[passKey].label}`}
                </button>
              ))}
            </div>

            <h3 style={cardTitleStyle}>Individuella mål per övning</h3>

            {isLoadingTargets ? (
              <p style={mutedTextStyle}>Laddar individuella mål...</p>
            ) : assignedPassCodes.length === 0 ? (
              <p style={mutedTextStyle}>Tilldela minst ett pass för att kunna sätta mål på övningarna.</p>
            ) : (
              <div>
                {assignedPassCodes.map((passKey) => (
                  <div
                    key={passKey}
                    style={{
                      marginBottom: "16px",
                      padding: "14px",
                      border: "1px solid #e5e7eb",
                      borderRadius: "12px",
                      backgroundColor: "#f9fafb",
                    }}
                  >
                    <div style={{ marginBottom: "12px" }}>
                      <strong>{activeWorkouts[passKey]?.label || passKey}</strong>
                    </div>

                    {(activeWorkouts[passKey]?.exercises || []).map((exercise) => {
                      const draft = {
                        target_reps_mode: exercise.defaultRepsMode || "fixed",
                        ...((targetDrafts[passKey] || {})[exercise.name] || {}),
                      }

                      return (
                        <div
                          key={`${passKey}-${exercise.name}`}
                          style={{
                            border: "1px solid #e5e7eb",
                            borderRadius: "10px",
                            padding: "12px",
                            marginBottom: "10px",
                            backgroundColor: "#ffffff",
                          }}
                        >
                          <div style={{ marginBottom: "8px" }}>
                            <strong>{exercise.name}</strong>
                            <div style={{ fontSize: "13px", color: "#6b7280" }}>
                              {exercise.guide}
                            </div>
                          </div>

                          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "8px" }}>
                            <input
                              type="number"
                              placeholder="Set"
                              value={draft.target_sets ?? ""}
                              onChange={(e) => handleTargetDraftChange(passKey, exercise.name, "target_sets", e.target.value)}
                              style={inputStyle}
                            />
                            <input
                              type="number"
                              placeholder="Reps"
                              disabled={draft.target_reps_mode === "max"}
                              value={draft.target_reps ?? ""}
                              onChange={(e) => handleTargetDraftChange(passKey, exercise.name, "target_reps", e.target.value)}
                              style={{ ...inputStyle, opacity: draft.target_reps_mode === "max" ? 0.5 : 1 }}
                            />
                            <button
                              type="button"
                              onClick={() =>
                                handleTargetDraftChange(
                                  passKey,
                                  exercise.name,
                                  "target_reps_mode",
                                  draft.target_reps_mode === "max" ? "fixed" : "max"
                                )
                              }
                              style={{
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
                            {exercise.type === "weight_reps" && (
                              <input
                                type="number"
                                placeholder="Vikt"
                                value={draft.target_weight ?? ""}
                                onChange={(e) => handleTargetDraftChange(passKey, exercise.name, "target_weight", e.target.value)}
                                style={inputStyle}
                              />
                            )}
                          </div>

                          <input
                            type="text"
                            placeholder="Kommentar / teknikfokus"
                            value={draft.target_comment ?? ""}
                            onChange={(e) => handleTargetDraftChange(passKey, exercise.name, "target_comment", e.target.value)}
                            style={{ ...inputStyle, width: "100%" }}
                          />
                        </div>
                      )
                    })}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={handleSaveTargets}
                  disabled={isSavingTargets}
                  style={{
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
                  {isSavingTargets ? "Sparar..." : "Spara individuella mål"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export default PlayersPage
