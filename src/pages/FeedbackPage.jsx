import { useMemo, useState } from "react"

function FeedbackPage({
  feedbackItems,
  users,
  teams,
  isLoadingFeedback,
  updatingFeedbackId,
  handleRefreshFeedback,
  handleUpdateFeedbackStatus,
  cardTitleStyle,
  mutedTextStyle,
  secondaryButtonStyle,
  buttonStyle,
  isMobile,
}) {
  const [statusFilter, setStatusFilter] = useState("open")
  const [sortMode, setSortMode] = useState("newest")
  const [copiedFeedbackId, setCopiedFeedbackId] = useState(null)

  const userMap = (users || []).reduce((acc, entry) => {
    acc[entry.id] = entry
    return acc
  }, {})

  const teamMap = (teams || []).reduce((acc, team) => {
    acc[team.id] = team.name
    return acc
  }, {})

  const visibleItems = useMemo(() => {
    const filteredItems =
      statusFilter === "all"
        ? feedbackItems
        : feedbackItems.filter((item) => (item.status || "open") === statusFilter)

    const items = filteredItems.slice()

    if (sortMode === "oldest") {
      items.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      return items
    }

    if (sortMode === "status") {
      const statusOrder = {
        open: 0,
        future: 1,
        done: 2,
        wont_do: 3,
      }

      items.sort((a, b) => {
        const statusDiff = (statusOrder[a.status || "open"] ?? 99) - (statusOrder[b.status || "open"] ?? 99)
        if (statusDiff !== 0) return statusDiff
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
      return items
    }

    items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    return items
  }, [feedbackItems, statusFilter, sortMode])

  const statusCounts = feedbackItems.reduce(
    (acc, item) => {
      acc[item.status || "open"] = (acc[item.status || "open"] || 0) + 1
      return acc
    },
    {
      open: 0,
      future: 0,
      done: 0,
      wont_do: 0,
    }
  )

  const handleCopyFeedback = async (item) => {
    const author = userMap[item.user_id]
    const summary = [
      `Inskickat: ${formatFeedbackDate(item.created_at)}`,
      `Status: ${getStatusLabel(item.status || "open")}`,
      `Från: ${author?.full_name || "Okänd användare"} (@${author?.username || "-"})`,
      `Roll: ${getRoleLabel(author?.role)}`,
      `Lag: ${teamMap[item.team_id] || "Inget lag"}`,
      "",
      item.body,
    ].join("\n")

    try {
      await navigator.clipboard.writeText(summary)
      setCopiedFeedbackId(item.id)
      window.setTimeout(() => {
        setCopiedFeedbackId((current) => (current === item.id ? null : current))
      }, 2000)
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <div style={wrapStyle}>
      <div style={topBarStyle(isMobile)}>
        <div>
          <div style={cardTitleStyle}>Feedback från appen</div>
          <p style={mutedTextStyle}>
            Här samlas all feedback som skickas in från spelare, tränare och huvudadmin.
          </p>
        </div>

        <button type="button" onClick={handleRefreshFeedback} style={secondaryButtonStyle}>
          Ladda om
        </button>
      </div>

      <div style={filterCardStyle}>
        <div style={filterRowStyle(isMobile)}>
          <div style={filterGroupStyle}>
            <div style={filterLabelStyle}>Status</div>
            <div style={chipRowStyle}>
              {[
                { key: "all", label: `Alla (${feedbackItems.length})` },
                { key: "open", label: `Öppna (${statusCounts.open})` },
                { key: "future", label: `Framtida (${statusCounts.future})` },
                { key: "done", label: `Klara (${statusCounts.done})` },
                { key: "wont_do", label: `Görs inte (${statusCounts.wont_do})` },
              ].map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setStatusFilter(option.key)}
                  style={{
                    ...filterChipStyle,
                    ...(statusFilter === option.key ? activeFilterChipStyle : {}),
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div style={filterGroupStyle}>
            <div style={filterLabelStyle}>Sortera</div>
            <div style={chipRowStyle}>
              {[
                { key: "newest", label: "Nyast först" },
                { key: "oldest", label: "Äldst först" },
                { key: "status", label: "Efter status" },
              ].map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setSortMode(option.key)}
                  style={{
                    ...filterChipStyle,
                    ...(sortMode === option.key ? activeFilterChipStyle : {}),
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={listWrapStyle}>
        {isLoadingFeedback ? (
          <p style={mutedTextStyle}>Laddar feedback...</p>
        ) : visibleItems.length === 0 ? (
          <p style={mutedTextStyle}>Ingen feedback matchar det valda filtret.</p>
        ) : (
          visibleItems.map((item) => {
            const author = userMap[item.user_id]
            const status = item.status || "open"
            const isUpdating = updatingFeedbackId === item.id

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

                  <div style={feedbackHeaderAsideStyle}>
                    <div
                      style={{
                        ...statusBadgeStyle,
                        ...getStatusBadgeStyle(status),
                      }}
                    >
                      {getStatusLabel(status)}
                    </div>
                    <div style={feedbackDateStyle}>{formatFeedbackDate(item.created_at)}</div>
                    {item.status_updated_at && (
                      <div style={statusUpdatedStyle}>
                        Uppdaterad {formatFeedbackDate(item.status_updated_at)}
                      </div>
                    )}
                  </div>
                </div>

                <div style={feedbackBodyWrapStyle}>
                  <div style={feedbackBodyStyle}>{item.body}</div>
                </div>

                <div style={actionsWrapStyle}>
                  <div style={statusButtonGroupStyle}>
                    {[
                      { key: "open", label: "Öppen" },
                      { key: "future", label: "Framtida åtgärd" },
                      { key: "done", label: "Klar" },
                      { key: "wont_do", label: "Görs inte" },
                    ].map((option) => (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => handleUpdateFeedbackStatus(item.id, option.key)}
                        disabled={isUpdating}
                        style={{
                          ...(status === option.key ? buttonStyle : secondaryButtonStyle),
                          padding: "10px 12px",
                          opacity: isUpdating ? 0.7 : 1,
                          cursor: isUpdating ? "default" : "pointer",
                        }}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopyFeedback(item)}
                    style={secondaryButtonStyle}
                  >
                    {copiedFeedbackId === item.id ? "Kopierad" : "Kopiera text"}
                  </button>
                </div>
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

function getStatusLabel(status) {
  if (status === "done") return "Klar"
  if (status === "future") return "Framtida åtgärd"
  if (status === "wont_do") return "Görs inte"
  return "Öppen"
}

function getStatusBadgeStyle(status) {
  if (status === "done") {
    return {
      backgroundColor: "#ecfdf3",
      color: "#166534",
    }
  }

  if (status === "future") {
    return {
      backgroundColor: "#eff6ff",
      color: "#1d4ed8",
    }
  }

  if (status === "wont_do") {
    return {
      backgroundColor: "#f3f4f6",
      color: "#374151",
    }
  }

  return {
    backgroundColor: "#fff1f1",
    color: "#991b1b",
  }
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

const filterCardStyle = {
  padding: "16px",
  borderRadius: "18px",
  border: "1px solid #efe2e2",
  backgroundColor: "#fffdfd",
}

const filterRowStyle = (isMobile) => ({
  display: "grid",
  gap: "16px",
  gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
})

const filterGroupStyle = {
  display: "grid",
  gap: "8px",
}

const filterLabelStyle = {
  fontSize: "12px",
  fontWeight: "800",
  color: "#7f1d1d",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
}

const chipRowStyle = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
}

const filterChipStyle = {
  padding: "8px 12px",
  borderRadius: "999px",
  border: "1px solid #ecd6d6",
  backgroundColor: "#ffffff",
  color: "#18202b",
  cursor: "pointer",
  fontSize: "13px",
  fontWeight: "800",
}

const activeFilterChipStyle = {
  backgroundColor: "#fff1f1",
  borderColor: "#c62828",
  color: "#991b1b",
}

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

const feedbackHeaderAsideStyle = {
  display: "grid",
  gap: "6px",
  justifyItems: "end",
}

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

const statusBadgeStyle = {
  display: "inline-flex",
  padding: "6px 10px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: "800",
}

const feedbackDateStyle = {
  fontSize: "12px",
  color: "#6b7280",
  fontWeight: "700",
  whiteSpace: "nowrap",
}

const statusUpdatedStyle = {
  fontSize: "12px",
  color: "#9ca3af",
}

const feedbackBodyWrapStyle = {
  padding: "14px",
  borderRadius: "14px",
  backgroundColor: "#ffffff",
  border: "1px solid #f1e3e3",
}

const feedbackBodyStyle = {
  fontSize: "14px",
  color: "#18202b",
  lineHeight: 1.65,
  whiteSpace: "pre-wrap",
  userSelect: "text",
  WebkitUserSelect: "text",
}

const actionsWrapStyle = {
  marginTop: "12px",
  display: "grid",
  gap: "12px",
}

const statusButtonGroupStyle = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
}

export default FeedbackPage
