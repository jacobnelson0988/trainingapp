function CoachHomePage({
  setCoachView,
  setSelectedPlayer,
  resetExerciseForm,
  mutedTextStyle,
  coachNavCardStyle,
  coachNavTitleStyle,
  coachNavTextStyle,
  isMobile,
  players,
  templatesFromDB,
  teamName,
}) {
  const activePlayers = (players || []).filter((p) => !p.is_archived)
  const passCount = (templatesFromDB || []).length

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const recentlyActive = activePlayers
    .filter((p) => p.lastSignInAt && new Date(p.lastSignInAt) >= sevenDaysAgo)
    .sort((a, b) => new Date(b.lastSignInAt) - new Date(a.lastSignInAt))
    .slice(0, 5)

  const inactivePlayers = activePlayers
    .filter((p) => {
      if (!p.lastSignInAt) return true
      return new Date(p.lastSignInAt) < sevenDaysAgo
    })
    .sort((a, b) => {
      if (!a.lastSignInAt) return -1
      if (!b.lastSignInAt) return 1
      return new Date(a.lastSignInAt) - new Date(b.lastSignInAt)
    })
    .slice(0, 5)

  const formatRelativeDate = (dateStr) => {
    if (!dateStr) return "Aldrig"
    const date = new Date(dateStr)
    const diffDays = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return "Idag"
    if (diffDays === 1) return "Igår"
    return `${diffDays} dagar sedan`
  }

  return (
    <>
      {/* Lagsammanfattning */}
      <div style={summaryRowStyle(isMobile)}>
        <div style={summaryCardStyle}>
          <div style={summaryNumberStyle}>{activePlayers.length}</div>
          <div style={{ ...mutedTextStyle, fontSize: "12px", marginTop: "2px" }}>Aktiva spelare</div>
        </div>
        <div style={summaryCardStyle}>
          <div style={summaryNumberStyle}>{passCount}</div>
          <div style={{ ...mutedTextStyle, fontSize: "12px", marginTop: "2px" }}>Pass tillgängliga</div>
        </div>
        <div style={summaryCardStyle}>
          <div style={summaryNumberStyle}>{recentlyActive.length}</div>
          <div style={{ ...mutedTextStyle, fontSize: "12px", marginTop: "2px" }}>Aktiva senaste 7 d</div>
        </div>
      </div>

      {/* Navigeringskort */}
      <p style={{ ...mutedTextStyle, marginBottom: "16px" }}>Välj vad du vill hantera.</p>

      <div style={{ display: "grid", gap: "12px", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))" }}>
        <button
          type="button"
          onClick={() => {
            setCoachView("players")
            setSelectedPlayer(null)
          }}
          style={{
            ...coachNavCardStyle,
            minHeight: isMobile ? "132px" : coachNavCardStyle.minHeight,
          }}
        >
          <div style={coachNavTopRowStyle}>
            <div style={coachNavTitleStyle}>Användare</div>
            <div style={coachNavArrowStyle}>→</div>
          </div>
          <div style={coachNavTextStyle}>Visa spelare och ledare i laget samt hantera spelarnas mål</div>
        </button>

        <button
          type="button"
          onClick={() => {
            setCoachView("exerciseBank")
            setSelectedPlayer(null)
            resetExerciseForm()
          }}
          style={{
            ...coachNavCardStyle,
            minHeight: isMobile ? "132px" : coachNavCardStyle.minHeight,
          }}
        >
          <div style={coachNavTopRowStyle}>
            <div style={coachNavTitleStyle}>Övningsbank</div>
            <div style={coachNavArrowStyle}>→</div>
          </div>
          <div style={coachNavTextStyle}>Visa övningar som kan användas i lagets pass</div>
        </button>

        <button
          type="button"
          onClick={() => {
            setCoachView("passBuilder")
            setSelectedPlayer(null)
            resetExerciseForm()
          }}
          style={{
            ...coachNavCardStyle,
            minHeight: isMobile ? "132px" : coachNavCardStyle.minHeight,
          }}
        >
          <div style={coachNavTopRowStyle}>
            <div style={coachNavTitleStyle}>Passhantering</div>
            <div style={coachNavArrowStyle}>→</div>
          </div>
          <div style={coachNavTextStyle}>Skapa och redigera pass för ditt eget lag</div>
        </button>

        <button
          type="button"
          onClick={() => {
            setCoachView("stats")
            setSelectedPlayer(null)
          }}
          style={{
            ...coachNavCardStyle,
            minHeight: isMobile ? "132px" : coachNavCardStyle.minHeight,
          }}
        >
          <div style={coachNavTopRowStyle}>
            <div style={coachNavTitleStyle}>Statistik</div>
            <div style={coachNavArrowStyle}>→</div>
          </div>
          <div style={coachNavTextStyle}>Följ viktutveckling per övning för en eller flera spelare</div>
        </button>

        <button
          type="button"
          onClick={() => {
            setCoachView("messages")
            setSelectedPlayer(null)
          }}
          style={{
            ...coachNavCardStyle,
            minHeight: isMobile ? "132px" : coachNavCardStyle.minHeight,
          }}
        >
          <div style={coachNavTopRowStyle}>
            <div style={coachNavTitleStyle}>Meddelanden</div>
            <div style={coachNavArrowStyle}>→</div>
          </div>
          <div style={coachNavTextStyle}>Skriv till laget, andra tränare eller huvudadmin</div>
        </button>
      </div>

      {/* Spelaraktivitet */}
      <div style={{ display: "grid", gap: "16px", marginTop: "28px", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))" }}>
        {/* Nyligen aktiva */}
        <div style={activityPanelStyle}>
          <div style={activityPanelTitleStyle}>Nyligen inloggade</div>
          {recentlyActive.length === 0 ? (
            <div style={{ ...mutedTextStyle, fontSize: "13px" }}>Inga spelare inloggade senaste 7 dagarna</div>
          ) : (
            recentlyActive.map((player) => (
              <button
                key={player.id}
                type="button"
                style={activityRowStyle}
                onClick={() => {
                  setSelectedPlayer(player)
                  setCoachView("players")
                }}
              >
                <div style={activityAvatarStyle(true)}>{(player.full_name || player.username || "?")[0].toUpperCase()}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={activityNameStyle}>{player.full_name || player.username}</div>
                  <div style={{ ...mutedTextStyle, fontSize: "12px" }}>Senaste pass: {player.latestPass || "-"}</div>
                </div>
                <div style={activityDateStyle(true)}>{formatRelativeDate(player.lastSignInAt)}</div>
              </button>
            ))
          )}
        </div>

        {/* Behöver träna */}
        <div style={activityPanelStyle}>
          <div style={activityPanelTitleStyle}>Behöver träna</div>
          {inactivePlayers.length === 0 ? (
            <div style={{ ...mutedTextStyle, fontSize: "13px" }}>Alla spelare har loggat in senaste 7 dagarna</div>
          ) : (
            inactivePlayers.map((player) => (
              <button
                key={player.id}
                type="button"
                style={activityRowStyle}
                onClick={() => {
                  setSelectedPlayer(player)
                  setCoachView("players")
                }}
              >
                <div style={activityAvatarStyle(false)}>{(player.full_name || player.username || "?")[0].toUpperCase()}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={activityNameStyle}>{player.full_name || player.username}</div>
                  <div style={{ ...mutedTextStyle, fontSize: "12px" }}>Senaste pass: {player.latestPass || "-"}</div>
                </div>
                <div style={activityDateStyle(false)}>{formatRelativeDate(player.lastSignInAt)}</div>
              </button>
            ))
          )}
        </div>
      </div>
    </>
  )
}

const summaryRowStyle = (isMobile) => ({
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: "10px",
  marginBottom: "24px",
})

const summaryCardStyle = {
  backgroundColor: "#fff8f8",
  border: "1px solid #f5e0e0",
  borderRadius: "12px",
  padding: "14px 12px",
  textAlign: "center",
}

const summaryNumberStyle = {
  fontSize: "26px",
  fontWeight: "800",
  color: "#991b1b",
  lineHeight: "1",
}

const coachNavTopRowStyle = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "10px",
}

const coachNavArrowStyle = {
  width: "32px",
  height: "32px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "999px",
  backgroundColor: "#fff1f1",
  color: "#991b1b",
  fontSize: "18px",
  fontWeight: "900",
  flexShrink: 0,
}

const activityPanelStyle = {
  backgroundColor: "#fff8f8",
  border: "1px solid #f5e0e0",
  borderRadius: "16px",
  padding: "16px",
  display: "flex",
  flexDirection: "column",
  gap: "8px",
}

const activityPanelTitleStyle = {
  fontSize: "13px",
  fontWeight: "700",
  color: "#991b1b",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  marginBottom: "4px",
}

const activityRowStyle = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  background: "none",
  border: "none",
  padding: "6px 0",
  cursor: "pointer",
  width: "100%",
  textAlign: "left",
  borderBottom: "1px solid #f5e0e0",
}

const activityAvatarStyle = (active) => ({
  width: "32px",
  height: "32px",
  borderRadius: "50%",
  backgroundColor: active ? "#fee2e2" : "#f3f4f6",
  color: active ? "#991b1b" : "#6b7280",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: "700",
  fontSize: "13px",
  flexShrink: 0,
})

const activityNameStyle = {
  fontSize: "14px",
  fontWeight: "600",
  color: "#1a1a1a",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
}

const activityDateStyle = (active) => ({
  fontSize: "12px",
  fontWeight: "600",
  color: active ? "#16a34a" : "#dc2626",
  flexShrink: 0,
})

export default CoachHomePage
