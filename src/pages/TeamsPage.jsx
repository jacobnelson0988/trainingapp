import { useState } from "react"

function TeamsPage({
  teams,
  users,
  newTeamName,
  setNewTeamName,
  handleCreateTeam,
  handleDeleteTeam,
  isCreatingTeam,
  deletingTeamId,
  cardTitleStyle,
  inputStyle,
  buttonStyle,
  secondaryButtonStyle,
  mutedTextStyle,
  isMobile,
}) {
  const [expandedTeamIds, setExpandedTeamIds] = useState([])

  const toggleTeam = (teamId) => {
    setExpandedTeamIds((prev) =>
      prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId]
    )
  }

  return (
    <>
      <h3 style={cardTitleStyle}>Lag</h3>
      <p style={{ ...mutedTextStyle, marginBottom: "14px" }}>
        Skapa lag och se hur många tränare och spelare som är kopplade till varje lag.
      </p>

      <div style={createCardStyle}>
        <div style={{ display: "flex", gap: "8px", flexDirection: isMobile ? "column" : "row" }}>
          <div style={{ flex: 1 }}>
            <div style={{ marginBottom: "8px", fontSize: "14px", fontWeight: "800", color: "#18202b" }}>
              Namn på lag
            </div>
            <input
              type="text"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              style={{ ...inputStyle, width: "100%" }}
            />
          </div>
          <button
            type="button"
            onClick={handleCreateTeam}
            disabled={isCreatingTeam}
            style={{ ...buttonStyle, width: isMobile ? "100%" : "auto", opacity: isCreatingTeam ? 0.7 : 1 }}
          >
            {isCreatingTeam ? "Skapar..." : "Skapa lag"}
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gap: "10px", marginTop: "14px" }}>
        {(teams || []).map((team) => {
          const relatedUsers = (users || []).filter((entry) => entry.team_id === team.id)
          const coachCount = relatedUsers.filter((entry) => entry.role === "coach").length
          const playerCount = relatedUsers.filter((entry) => entry.role === "player").length
          const isExpanded = expandedTeamIds.includes(team.id)

          return (
            <div key={team.id} style={teamCardStyle}>
              <button
                type="button"
                onClick={() => toggleTeam(team.id)}
                style={teamToggleButtonStyle}
              >
                <div>
                  <div style={teamNameStyle}>{team.name}</div>
                  <div style={teamMetaStyle}>{coachCount} tränare • {playerCount} spelare</div>
                </div>
                <div style={teamToggleIconStyle}>{isExpanded ? "−" : "+"}</div>
              </button>

              {isExpanded && (
                <div style={teamUsersWrapStyle}>
                  <div style={teamActionsRowStyle(isMobile)}>
                    <button
                      type="button"
                      onClick={() => handleDeleteTeam(team)}
                      disabled={deletingTeamId === team.id}
                      style={{
                        ...secondaryButtonStyle,
                        width: isMobile ? "100%" : "auto",
                        color: "#b91c1c",
                        borderColor: "#fecaca",
                        opacity: deletingTeamId === team.id ? 0.7 : 1,
                      }}
                    >
                      {deletingTeamId === team.id ? "Tar bort..." : "Ta bort lag"}
                    </button>
                  </div>

                  {relatedUsers.length === 0 ? (
                    <div style={emptyUsersStyle}>Inga användare i laget ännu.</div>
                  ) : (
                    relatedUsers.map((entry) => (
                      <div key={entry.id} style={teamUserRowStyle(isMobile)}>
                        <div>
                          <div style={teamUserNameStyle}>{entry.full_name}</div>
                          <div style={teamUserMetaStyle}>@{entry.username}</div>
                        </div>
                        <span style={roleBadgeStyle(entry.role)}>
                          {entry.role === "coach"
                            ? "Tränare"
                            : entry.role === "head_admin"
                              ? "Huvudadmin"
                              : "Spelare"}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}

const createCardStyle = {
  padding: "16px",
  borderRadius: "16px",
  border: "1px solid #ece5e5",
  backgroundColor: "#fffdfd",
}

const teamCardStyle = {
  padding: "14px",
  borderRadius: "16px",
  border: "1px solid #ece5e5",
  backgroundColor: "#ffffff",
}

const teamToggleButtonStyle = {
  width: "100%",
  background: "transparent",
  border: "none",
  padding: 0,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  cursor: "pointer",
  textAlign: "left",
}

const teamNameStyle = {
  fontSize: "15px",
  fontWeight: "800",
  color: "#18202b",
}

const teamMetaStyle = {
  marginTop: "4px",
  fontSize: "13px",
  color: "#6b7280",
}

const teamToggleIconStyle = {
  width: "30px",
  height: "30px",
  borderRadius: "999px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "#f8eaea",
  color: "#991b1b",
  fontSize: "20px",
  fontWeight: "700",
  flexShrink: 0,
}

const teamUsersWrapStyle = {
  marginTop: "12px",
  display: "grid",
  gap: "8px",
}

const teamActionsRowStyle = (isMobile) => ({
  display: "flex",
  justifyContent: "flex-end",
  marginBottom: "4px",
  flexDirection: isMobile ? "column" : "row",
})

const teamUserRowStyle = (isMobile) => ({
  padding: "12px",
  borderRadius: "14px",
  border: "1px solid #efe7e7",
  backgroundColor: "#fffdfd",
  display: "flex",
  justifyContent: "space-between",
  alignItems: isMobile ? "flex-start" : "center",
  gap: "10px",
  flexDirection: isMobile ? "column" : "row",
})

const teamUserNameStyle = {
  fontSize: "14px",
  fontWeight: "800",
  color: "#18202b",
}

const teamUserMetaStyle = {
  marginTop: "4px",
  fontSize: "12px",
  color: "#6b7280",
}

const roleBadgeStyle = (role) => ({
  display: "inline-flex",
  padding: "6px 10px",
  borderRadius: "999px",
  backgroundColor: role === "coach" ? "#fff4f4" : role === "head_admin" ? "#fff7ed" : "#eef2ff",
  color: role === "coach" ? "#991b1b" : role === "head_admin" ? "#9a3412" : "#3730a3",
  fontSize: "12px",
  fontWeight: "800",
})

const emptyUsersStyle = {
  padding: "12px",
  borderRadius: "14px",
  border: "1px dashed #e6dede",
  color: "#6b7280",
  fontSize: "13px",
  backgroundColor: "#fffdfd",
}

export default TeamsPage
