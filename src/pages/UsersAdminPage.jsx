import { useState } from "react"

function UsersAdminPage({
  users,
  teams,
  isLoadingUsers,
  updatingUserTeamId,
  resettingPasswordUserId,
  repairingLoginUserId,
  handleChangeUserTeam,
  handleResetUserPassword,
  handleRepairUserLogin,
  cardTitleStyle,
  mutedTextStyle,
  isMobile,
}) {
  const [searchValue, setSearchValue] = useState("")
  const [passwordDrafts, setPasswordDrafts] = useState({})
  const teamMap = Object.fromEntries((teams || []).map((team) => [team.id, team.name]))

  const filteredUsers = (users || []).filter((entry) => {
    const haystack = `${entry.full_name} ${entry.username} ${entry.role} ${teamMap[entry.team_id] || ""}`.toLowerCase()
    return haystack.includes(searchValue.trim().toLowerCase())
  })

  return (
    <>
      <h3 style={cardTitleStyle}>Alla användare</h3>
      <p style={{ ...mutedTextStyle, marginBottom: "14px" }}>
        Huvudadmin ser alla användare, roller och vilket lag de tillhör.
      </p>

      <input
        type="text"
        placeholder="Sök användare"
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
        style={searchInputStyle}
      />

      {isLoadingUsers ? (
        <p style={mutedTextStyle}>Laddar användare...</p>
      ) : (
        <div style={{ display: "grid", gap: "10px" }}>
          {filteredUsers.map((entry) => (
            <div key={entry.id} style={userCardStyle(isMobile)}>
              <div style={{ flex: 1 }}>
                <div style={userNameStyle}>{entry.full_name}</div>
                <div style={userMetaStyle}>@{entry.username}</div>
                {entry.role !== "head_admin" && (
                  <>
                    <div style={userTeamControlWrapStyle(isMobile)}>
                      <select
                        value={entry.team_id || ""}
                        onChange={(e) => handleChangeUserTeam(entry.id, e.target.value)}
                        style={teamSelectStyle}
                        disabled={updatingUserTeamId === entry.id}
                      >
                        <option value="">Välj lag</option>
                        {(teams || []).map((team) => (
                          <option key={team.id} value={team.id}>
                            {team.name}
                          </option>
                        ))}
                      </select>
                      <span style={teamHelpTextStyle}>
                        {updatingUserTeamId === entry.id ? "Uppdaterar..." : "Byt lag"}
                      </span>
                    </div>

                    <div style={passwordControlWrapStyle(isMobile)}>
                      <input
                        type="text"
                        placeholder="Nytt lösenord"
                        value={passwordDrafts[entry.id] || ""}
                        onChange={(e) =>
                          setPasswordDrafts((prev) => ({
                            ...prev,
                            [entry.id]: e.target.value,
                          }))
                        }
                        style={passwordInputStyle}
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          await handleResetUserPassword(entry.id, passwordDrafts[entry.id] || "")
                          setPasswordDrafts((prev) => ({ ...prev, [entry.id]: "" }))
                        }}
                        style={passwordButtonStyle}
                        disabled={resettingPasswordUserId === entry.id}
                      >
                        {resettingPasswordUserId === entry.id ? "Sparar..." : "Sätt nytt lösenord"}
                      </button>
                    </div>

                    <div style={loginRepairWrapStyle}>
                      <button
                        type="button"
                        onClick={() => handleRepairUserLogin(entry.id)}
                        style={repairButtonStyle}
                        disabled={repairingLoginUserId === entry.id}
                      >
                        {repairingLoginUserId === entry.id ? "Reparerar..." : "Reparera login"}
                      </button>
                    </div>
                  </>
                )}
              </div>
              <div style={userBadgeWrapStyle}>
                <span style={roleBadgeStyle}>{roleLabel(entry.role)}</span>
                <span style={teamBadgeStyle}>{teamMap[entry.team_id] || "Inget lag"}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

const roleLabel = (role) => {
  if (role === "head_admin") return "Huvudadmin"
  if (role === "coach") return "Tränare"
  return "Spelare"
}

const searchInputStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: "14px",
  border: "1px solid #e9dada",
  fontSize: "14px",
  marginBottom: "14px",
  boxSizing: "border-box",
}

const userCardStyle = (isMobile) => ({
  padding: "14px",
  borderRadius: "16px",
  border: "1px solid #ece5e5",
  backgroundColor: "#ffffff",
  display: "flex",
  justifyContent: "space-between",
  alignItems: isMobile ? "flex-start" : "center",
  gap: "12px",
  flexDirection: isMobile ? "column" : "row",
})

const userNameStyle = {
  fontSize: "15px",
  fontWeight: "800",
  color: "#18202b",
}

const userMetaStyle = {
  fontSize: "13px",
  color: "#6b7280",
  marginTop: "4px",
}

const userBadgeWrapStyle = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
}

const userTeamControlWrapStyle = (isMobile) => ({
  marginTop: "10px",
  display: "flex",
  flexDirection: isMobile ? "column" : "row",
  gap: "8px",
  alignItems: isMobile ? "stretch" : "center",
})

const teamSelectStyle = {
  minWidth: "180px",
  padding: "10px 12px",
  borderRadius: "12px",
  border: "1px solid #dcd7f8",
  backgroundColor: "#f8f7ff",
  fontSize: "13px",
  color: "#18202b",
}

const teamHelpTextStyle = {
  fontSize: "12px",
  color: "#6b7280",
  fontWeight: "700",
}

const passwordControlWrapStyle = (isMobile) => ({
  marginTop: "10px",
  display: "flex",
  flexDirection: isMobile ? "column" : "row",
  gap: "8px",
  alignItems: isMobile ? "stretch" : "center",
})

const passwordInputStyle = {
  minWidth: "180px",
  padding: "10px 12px",
  borderRadius: "12px",
  border: "1px solid #eadfdf",
  backgroundColor: "#fffefe",
  fontSize: "13px",
  color: "#18202b",
}

const passwordButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "10px 14px",
  borderRadius: "12px",
  border: "none",
  backgroundColor: "#18202b",
  color: "#ffffff",
  fontSize: "13px",
  fontWeight: "800",
  cursor: "pointer",
}

const loginRepairWrapStyle = {
  marginTop: "8px",
}

const repairButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "9px 12px",
  borderRadius: "12px",
  border: "1px solid #d6d3f5",
  backgroundColor: "#f5f3ff",
  color: "#4338ca",
  fontSize: "13px",
  fontWeight: "800",
  cursor: "pointer",
}

const roleBadgeStyle = {
  display: "inline-flex",
  padding: "6px 10px",
  borderRadius: "999px",
  backgroundColor: "#fff4f4",
  color: "#991b1b",
  fontSize: "12px",
  fontWeight: "800",
}

const teamBadgeStyle = {
  display: "inline-flex",
  padding: "6px 10px",
  borderRadius: "999px",
  backgroundColor: "#eef2ff",
  color: "#3730a3",
  fontSize: "12px",
  fontWeight: "800",
}

export default UsersAdminPage
