function TeamsPage({
  teams,
  users,
  newTeamName,
  setNewTeamName,
  handleCreateTeam,
  isCreatingTeam,
  cardTitleStyle,
  inputStyle,
  buttonStyle,
  mutedTextStyle,
  isMobile,
}) {
  return (
    <>
      <h3 style={cardTitleStyle}>Lag</h3>
      <p style={{ ...mutedTextStyle, marginBottom: "14px" }}>
        Skapa lag och se hur många tränare och spelare som är kopplade till varje lag.
      </p>

      <div style={createCardStyle}>
        <div style={{ display: "flex", gap: "8px", flexDirection: isMobile ? "column" : "row" }}>
          <input
            type="text"
            placeholder="Namn på lag"
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
            style={{ ...inputStyle, width: "100%" }}
          />
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

          return (
            <div key={team.id} style={teamCardStyle}>
              <div style={teamNameStyle}>{team.name}</div>
              <div style={teamMetaStyle}>{coachCount} tränare • {playerCount} spelare</div>
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

export default TeamsPage
