import { useMemo, useState } from "react"
import CreateUserPage from "./CreateUserPage"

function UsersAdminPage({
  users,
  teams,
  isLoadingUsers,
  newUserName,
  setNewUserName,
  newUserPassword,
  setNewUserPassword,
  newUserRole,
  setNewUserRole,
  selectedTeamId,
  setSelectedTeamId,
  handleCreateUser,
  isCreatingUser,
  createdUser,
  updatingUserTeamId,
  resettingPasswordUserId,
  repairingLoginUserId,
  deletingUserId,
  archivingPlayerId,
  deletingPlayerId,
  handleChangeUserTeam,
  handleResetUserPassword,
  handleRepairUserLogin,
  handleDeleteUser,
  handleArchivePlayer,
  handleDeletePlayer,
  cardTitleStyle,
  mutedTextStyle,
  inputStyle,
  buttonStyle,
  isMobile,
}) {
  const [searchValue, setSearchValue] = useState("")
  const [sortKey, setSortKey] = useState("name")
  const [teamFilter, setTeamFilter] = useState("all")
  const [roleFilter, setRoleFilter] = useState("all")
  const [passwordDrafts, setPasswordDrafts] = useState({})
  const [expandedUserId, setExpandedUserId] = useState(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [showArchivedPlayers, setShowArchivedPlayers] = useState(false)

  const teamMap = Object.fromEntries((teams || []).map((team) => [team.id, team.name]))

  const filteredUsers = useMemo(() => {
    const base = (users || [])
      .filter((entry) => {
        const haystack = `${entry.full_name} ${entry.username} ${entry.role} ${teamMap[entry.team_id] || ""}`.toLowerCase()
        return haystack.includes(searchValue.trim().toLowerCase())
      })
      .filter((entry) => (teamFilter === "all" ? true : (entry.team_id || "") === teamFilter))
      .filter((entry) => (roleFilter === "all" ? true : entry.role === roleFilter))
      .filter((entry) => (entry.role !== "player" ? true : showArchivedPlayers || !entry.is_archived))

    const sorted = base.slice()

    sorted.sort((a, b) => {
      if (sortKey === "team") {
        const teamA = teamMap[a.team_id] || ""
        const teamB = teamMap[b.team_id] || ""
        return teamA.localeCompare(teamB, "sv") || a.full_name.localeCompare(b.full_name, "sv")
      }

      if (sortKey === "role") {
        const order = { head_admin: 0, coach: 1, player: 2 }
        return (order[a.role] ?? 99) - (order[b.role] ?? 99) || a.full_name.localeCompare(b.full_name, "sv")
      }

      if (sortKey === "username") {
        return a.username.localeCompare(b.username, "sv")
      }

      return a.full_name.localeCompare(b.full_name, "sv")
    })

    return sorted
  }, [roleFilter, searchValue, showArchivedPlayers, sortKey, teamFilter, teamMap, users])

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
          <h3 style={{ ...cardTitleStyle, marginBottom: "4px" }}>Användare</h3>
          <p style={mutedTextStyle}>
            Se alla användare, sortera listan och öppna en rad för fler åtgärder.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateOpen((prev) => !prev)}
          style={{ ...buttonStyle, width: isMobile ? "100%" : "auto" }}
        >
          {isCreateOpen ? "Stäng" : "Ny användare"}
        </button>
      </div>

      {isCreateOpen && (
        <div style={createWrapStyle}>
          <CreateUserPage
            isHeadAdmin={true}
            teams={teams}
            currentTeamId=""
            newUserName={newUserName}
            setNewUserName={setNewUserName}
            newUserPassword={newUserPassword}
            setNewUserPassword={setNewUserPassword}
            newUserRole={newUserRole}
            setNewUserRole={setNewUserRole}
            selectedTeamId={selectedTeamId}
            setSelectedTeamId={setSelectedTeamId}
            handleCreateUser={handleCreateUser}
            isCreatingUser={isCreatingUser}
            createdUser={createdUser}
            inputStyle={inputStyle}
            buttonStyle={buttonStyle}
            cardTitleStyle={cardTitleStyle}
            isMobile={isMobile}
            importedPlayers={[]}
            importFileName=""
            isParsingImportFile={false}
            handlePlayerImportFile={() => {}}
            handleImportPlayers={() => {}}
            isImportingPlayers={false}
            importResults={[]}
          />
        </div>
      )}

      <div style={toolbarStyle(isMobile)}>
        <input
          type="text"
          placeholder="Sök användare"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          style={{ ...inputStyle, width: "100%" }}
        />

        <select
          value={teamFilter}
          onChange={(e) => setTeamFilter(e.target.value)}
          style={{ ...inputStyle, width: isMobile ? "100%" : "220px" }}
        >
          <option value="all">Filter: Alla lag</option>
          {(teams || []).map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          style={{ ...inputStyle, width: isMobile ? "100%" : "220px" }}
        >
          <option value="all">Filter: Alla roller</option>
          <option value="head_admin">Huvudadmin</option>
          <option value="coach">Tränare</option>
          <option value="player">Spelare</option>
        </select>

        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value)}
          style={{ ...inputStyle, width: isMobile ? "100%" : "220px" }}
        >
          <option value="name">Sortera: Namn</option>
          <option value="team">Sortera: Lag</option>
          <option value="role">Sortera: Roll</option>
          <option value="username">Sortera: Användarnamn</option>
        </select>
      </div>

      <label style={archiveToggleStyle}>
        <input
          type="checkbox"
          checked={showArchivedPlayers}
          onChange={(e) => setShowArchivedPlayers(e.target.checked)}
        />
        <span>Visa arkiverade spelare</span>
      </label>

      {isLoadingUsers ? (
        <p style={mutedTextStyle}>Laddar användare...</p>
      ) : (
        <div style={listWrapStyle}>
          {filteredUsers.map((entry) => {
            const isExpanded = expandedUserId === entry.id

            return (
              <div key={entry.id}>
                <button
                  type="button"
                  onClick={() => setExpandedUserId(isExpanded ? null : entry.id)}
                  style={userRowStyle(isMobile)}
                >
                  <div style={userRowNameStyle}>{entry.full_name}</div>
                  <div style={userRowMetaStyle}>@{entry.username}</div>
                  <div style={userRowMetaStyle}>{roleLabel(entry.role)}</div>
                  <div style={userRowMetaStyle}>
                    {teamMap[entry.team_id] || "Inget lag"}
                    {entry.role === "player" && entry.is_archived ? " • Arkiverad" : ""}
                  </div>
                </button>

                {isExpanded && (
                  <div style={expandedPanelStyle}>
                    <div style={actionGroupStyle}>
                      <div style={actionLabelStyle}>Lag</div>
                      {entry.role !== "head_admin" ? (
                        <div style={inlineActionStyle(isMobile)}>
                          <select
                            value={entry.team_id || ""}
                            onChange={(e) => handleChangeUserTeam(entry.id, e.target.value)}
                            style={selectStyle}
                            disabled={updatingUserTeamId === entry.id}
                          >
                            <option value="">Välj lag</option>
                            {(teams || []).map((team) => (
                              <option key={team.id} value={team.id}>
                                {team.name}
                              </option>
                            ))}
                          </select>
                          <div style={helperTextStyle}>
                            {updatingUserTeamId === entry.id ? "Uppdaterar..." : "Byt lag direkt"}
                          </div>
                        </div>
                      ) : (
                        <div style={helperTextStyle}>Huvudadmin ligger utanför vanlig laghantering</div>
                      )}
                    </div>

                    {entry.role !== "head_admin" && (
                      <>
                        <div style={actionGroupStyle}>
                          <div style={actionLabelStyle}>Lösenord</div>
                          <div style={inlineActionStyle(isMobile)}>
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
                              style={smallPrimaryButtonStyle}
                              disabled={resettingPasswordUserId === entry.id}
                            >
                              {resettingPasswordUserId === entry.id ? "Sparar..." : "Sätt nytt lösenord"}
                            </button>
                          </div>
                        </div>

                        <div style={actionGroupStyle}>
                          <div style={actionLabelStyle}>Övrigt</div>
                          <div style={inlineActionStyle(isMobile)}>
                            <button
                              type="button"
                              onClick={() => handleRepairUserLogin(entry.id)}
                              style={smallSecondaryButtonStyle}
                              disabled={repairingLoginUserId === entry.id}
                            >
                              {repairingLoginUserId === entry.id ? "Reparerar..." : "Reparera login"}
                            </button>
                            {entry.role === "player" && !entry.is_archived && (
                              <button
                                type="button"
                                onClick={() => handleArchivePlayer(entry.id, entry.full_name)}
                                style={smallSecondaryButtonStyle}
                                disabled={archivingPlayerId === entry.id}
                              >
                                {archivingPlayerId === entry.id ? "Arkiverar..." : "Arkivera"}
                              </button>
                            )}
                            {entry.role === "player" ? (
                              <button
                                type="button"
                                onClick={() => handleDeletePlayer(entry.id, entry.full_name)}
                                style={dangerButtonStyle}
                                disabled={deletingPlayerId === entry.id}
                              >
                                {deletingPlayerId === entry.id ? "Tar bort..." : "Ta bort spelare"}
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleDeleteUser(entry.id, entry.full_name)}
                                style={dangerButtonStyle}
                                disabled={deletingUserId === entry.id}
                              >
                                {deletingUserId === entry.id ? "Tar bort..." : "Ta bort användare"}
                              </button>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })}
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

const createWrapStyle = {
  marginBottom: "16px",
  padding: "16px",
  borderRadius: "18px",
  border: "1px solid #ece5e5",
  backgroundColor: "#fffdfd",
}

const toolbarStyle = (isMobile) => ({
  display: "grid",
  gap: "10px",
  gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1fr) 220px 220px 220px",
  marginBottom: "14px",
})

const archiveToggleStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  marginBottom: "14px",
  fontSize: "14px",
  fontWeight: "700",
  color: "#374151",
}

const listWrapStyle = {
  display: "grid",
  gap: "8px",
}

const userRowStyle = (isMobile) => ({
  width: "100%",
  display: "grid",
  gridTemplateColumns: isMobile
    ? "minmax(0, 1fr) minmax(0, 1fr)"
    : "minmax(0, 1.3fr) minmax(0, 1fr) minmax(0, 0.9fr) minmax(0, 1fr)",
  gap: "10px",
  alignItems: "center",
  padding: "10px 12px",
  borderRadius: "14px",
  border: "1px solid #ece5e5",
  backgroundColor: "#ffffff",
  textAlign: "left",
  cursor: "pointer",
})

const userRowNameStyle = {
  fontSize: "14px",
  fontWeight: "800",
  color: "#18202b",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
}

const userRowMetaStyle = {
  fontSize: "13px",
  color: "#6b7280",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
}

const expandedPanelStyle = {
  marginTop: "6px",
  padding: "14px",
  borderRadius: "16px",
  border: "1px solid #ece5e5",
  backgroundColor: "#fffdfd",
}

const actionGroupStyle = {
  marginBottom: "14px",
}

const actionLabelStyle = {
  marginBottom: "8px",
  fontSize: "12px",
  fontWeight: "800",
  color: "#7f1d1d",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
}

const inlineActionStyle = (isMobile) => ({
  display: "flex",
  flexDirection: isMobile ? "column" : "row",
  gap: "8px",
  alignItems: isMobile ? "stretch" : "center",
  flexWrap: "wrap",
})

const selectStyle = {
  minWidth: "190px",
  padding: "10px 12px",
  borderRadius: "12px",
  border: "1px solid #e9dada",
  backgroundColor: "#ffffff",
  fontSize: "13px",
  color: "#18202b",
}

const passwordInputStyle = {
  minWidth: "190px",
  padding: "10px 12px",
  borderRadius: "12px",
  border: "1px solid #eadfdf",
  backgroundColor: "#fffefe",
  fontSize: "13px",
  color: "#18202b",
}

const helperTextStyle = {
  fontSize: "12px",
  color: "#6b7280",
}

const smallPrimaryButtonStyle = {
  padding: "10px 14px",
  borderRadius: "12px",
  border: "none",
  backgroundColor: "#18202b",
  color: "#ffffff",
  fontSize: "13px",
  fontWeight: "800",
  cursor: "pointer",
}

const smallSecondaryButtonStyle = {
  padding: "10px 14px",
  borderRadius: "12px",
  border: "1px solid #d6d3f5",
  backgroundColor: "#f5f3ff",
  color: "#4338ca",
  fontSize: "13px",
  fontWeight: "800",
  cursor: "pointer",
}

const dangerButtonStyle = {
  padding: "10px 14px",
  borderRadius: "12px",
  border: "1px solid #fecaca",
  backgroundColor: "#fef2f2",
  color: "#b91c1c",
  fontSize: "13px",
  fontWeight: "800",
  cursor: "pointer",
}

export default UsersAdminPage
