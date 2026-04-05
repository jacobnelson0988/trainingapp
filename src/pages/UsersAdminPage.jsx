import { useState } from "react"

function UsersAdminPage({ users, teams, isLoadingUsers, cardTitleStyle, mutedTextStyle, isMobile }) {
  const [searchValue, setSearchValue] = useState("")
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
              <div>
                <div style={userNameStyle}>{entry.full_name}</div>
                <div style={userMetaStyle}>@{entry.username}</div>
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
