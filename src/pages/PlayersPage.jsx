import { useState } from "react"

function PlayersPage({
  role,
  setCoachView,
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
  handleAssignAllPassesToPlayer,
  handleClearAssignedPassesFromPlayer,
  isUpdatingPassAssignments,
  buttonStyle,
  isMobile,
}) {
  const [searchValue, setSearchValue] = useState("")
  const allPassKeys = Object.keys(activeWorkouts)
  const assignedPassSet = new Set(assignedPassCodes || [])

  const filteredPlayers = players.filter((player) => {
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
          <div style={summaryLabelStyle}>Användarnamn</div>
          <div style={summaryValueStyle}>@{player.username}</div>
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
        ) : (
          <div>
            {assignedPassCodes.map((passKey) => (
            <div
              key={passKey}
              style={{
                marginBottom: "16px",
                padding: "16px",
                border: "1px solid #ece5e5",
                borderRadius: "16px",
                backgroundColor: "#ffffff",
              }}
            >
                <div style={{ marginBottom: "12px", fontWeight: "800", color: "#18202b" }}>
                  {activeWorkouts[passKey]?.label || passKey}
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
                        border: "1px solid #ece5e5",
                        borderRadius: "10px",
                        padding: "12px",
                        marginBottom: "10px",
                        backgroundColor: "#fffdfd",
                      }}
                    >
                      <div style={{ marginBottom: "8px" }}>
                        <strong>{exercise.name}</strong>
                        <div style={{ fontSize: "13px", color: "#6b7280" }}>
                          {exercise.guide}
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
                          placeholder="Set"
                          value={draft.target_sets ?? ""}
                          onChange={(e) => handleTargetDraftChange(passKey, exercise.name, "target_sets", e.target.value)}
                          style={{ ...inputStyle, width: isMobile ? "100%" : undefined }}
                        />
                        <input
                          type="number"
                          placeholder="Reps"
                          disabled={draft.target_reps_mode === "max"}
                          value={draft.target_reps ?? ""}
                          onChange={(e) => handleTargetDraftChange(passKey, exercise.name, "target_reps", e.target.value)}
                          style={{ ...inputStyle, width: isMobile ? "100%" : undefined, opacity: draft.target_reps_mode === "max" ? 0.5 : 1 }}
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
                        {exercise.type === "weight_reps" && (
                          <input
                            type="number"
                            placeholder="Vikt"
                            value={draft.target_weight ?? ""}
                            onChange={(e) => handleTargetDraftChange(passKey, exercise.name, "target_weight", e.target.value)}
                            style={{ ...inputStyle, width: isMobile ? "100%" : undefined }}
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
              {isSavingTargets ? "Sparar..." : "Spara individuella mål"}
            </button>
          </div>
        )}
      </div>
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
          <h3 style={{ ...cardTitleStyle, marginBottom: "4px" }}>Mina spelare</h3>
          <p style={mutedTextStyle}>
            Sök fram spelare snabbt och redigera direkt under vald rad eller kort.
          </p>
        </div>

        {role === "coach" && (
          <button
            type="button"
            onClick={() => setCoachView("createPlayer")}
            style={{ ...buttonStyle, width: isMobile ? "100%" : "auto" }}
          >
            Ny spelare
          </button>
        )}
      </div>

      <input
        type="text"
        placeholder="Sök spelare"
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
        style={{ ...inputStyle, width: "100%", marginBottom: "14px" }}
      />

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
                  <span style={mobilePlayerMetaPillStyle}>@{player.username}</span>
                  <span style={mobilePlayerMetaPillStyle}>Senaste: {player.latestPass || "-"}</span>
                  <span style={mobilePlayerMetaPillStyle}>{player.totalPasses ?? 0} pass</span>
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
                <th style={tableHeadStyle}>Användarnamn</th>
                <th style={tableHeadStyle}>Förnamn</th>
                <th style={tableHeadStyle}>Efternamn</th>
                <th style={tableHeadStyle}>Senaste pass</th>
                <th style={tableHeadStyle}>Totalt antal pass</th>
              </tr>
            </thead>
            <tbody>
              {filteredPlayers.map((player) => {
                const names = (player.full_name || "").trim().split(/\s+/)
                const firstName = names[0] || ""
                const lastName = names.slice(1).join(" ")
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
                        {player.username}
                      </td>
                      <td style={tableCellStyle}>{firstName}</td>
                      <td style={tableCellStyle}>{lastName}</td>
                      <td style={tableCellStyle}>{player.latestPass || "-"}</td>
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

export default PlayersPage
