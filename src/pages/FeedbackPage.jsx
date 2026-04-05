function FeedbackPage({
  feedbackItems,
  users,
  teams,
  isLoadingFeedback,
  handleRefreshFeedback,
  cardTitleStyle,
  mutedTextStyle,
  secondaryButtonStyle,
  isMobile,
}) {
  const userMap = (users || []).reduce((acc, entry) => {
    acc[entry.id] = entry
    return acc
  }, {})

  const teamMap = (teams || []).reduce((acc, team) => {
    acc[team.id] = team.name
    return acc
  }, {})

  return (
    <div style={wrapStyle}>
      <div style={topBarStyle(isMobile)}>
        <div>
          <div style={cardTitleStyle}>Beta-feedback</div>
          <p style={mutedTextStyle}>
            Här samlas all feedback som skickas in från spelare, tränare och huvudadmin.
          </p>
        </div>

        <button type="button" onClick={handleRefreshFeedback} style={secondaryButtonStyle}>
          Ladda om
        </button>
      </div>

      <div style={listWrapStyle}>
        {isLoadingFeedback ? (
          <p style={mutedTextStyle}>Laddar feedback...</p>
        ) : feedbackItems.length === 0 ? (
          <p style={mutedTextStyle}>Ingen feedback har skickats in ännu.</p>
        ) : (
          feedbackItems.map((item) => {
            const author = userMap[item.user_id]
            return (
              <div key={item.id} style={feedbackCardStyle}>
                <div style={feedbackHeaderStyle(isMobile)}>
                  <div>
                    <div style={feedbackAuthorStyle}>
                      {author?.full_name || "Okänd användare"}
                    </div>
                    <div style={feedbackMetaStyle}>
                      @{author?.username || "-"} • {getRoleLabel(author?.role)}
                      {teamMap[item.team_id] ? ` • ${teamMap[item.team_id]}` : ""}
                    </div>
                  </div>

                  <div style={feedbackDateStyle}>{formatFeedbackDate(item.created_at)}</div>
                </div>

                <div style={feedbackBodyStyle}>{item.body}</div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

function getRoleLabel(role) {
  if (role === "head_admin") return "Huvudadmin"
  if (role === "coach") return "Tränare"
  if (role === "player") return "Spelare"
  return "Okänd roll"
}

function formatFeedbackDate(value) {
  if (!value) return "-"
  return new Date(value).toLocaleString("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const wrapStyle = {
  display: "grid",
  gap: "16px",
}

const topBarStyle = (isMobile) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: isMobile ? "stretch" : "flex-start",
  flexDirection: isMobile ? "column" : "row",
  gap: "12px",
})

const listWrapStyle = {
  display: "grid",
  gap: "12px",
}

const feedbackCardStyle = {
  padding: "16px",
  borderRadius: "18px",
  border: "1px solid #efe2e2",
  background: "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(255,250,250,0.96))",
}

const feedbackHeaderStyle = (isMobile) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: isMobile ? "flex-start" : "center",
  flexDirection: isMobile ? "column" : "row",
  gap: "10px",
  marginBottom: "10px",
})

const feedbackAuthorStyle = {
  fontSize: "15px",
  fontWeight: "900",
  color: "#18202b",
  marginBottom: "4px",
}

const feedbackMetaStyle = {
  fontSize: "12px",
  color: "#566173",
  lineHeight: 1.5,
}

const feedbackDateStyle = {
  fontSize: "12px",
  color: "#6b7280",
  fontWeight: "700",
  whiteSpace: "nowrap",
}

const feedbackBodyStyle = {
  fontSize: "14px",
  color: "#18202b",
  lineHeight: 1.65,
  whiteSpace: "pre-wrap",
}

export default FeedbackPage
