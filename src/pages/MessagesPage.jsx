function MessagesPage({
  role,
  currentUserId,
  recipients,
  selectedRecipientIds,
  onToggleRecipient,
  messageBody,
  setMessageBody,
  handleSendMessage,
  isSendingMessage,
  messages,
  isLoadingMessages,
  handleRefreshMessages,
  teams,
  cardTitleStyle,
  mutedTextStyle,
  inputStyle,
  buttonStyle,
  secondaryButtonStyle,
  isMobile,
}) {
  const teamMap = (teams || []).reduce((acc, team) => {
    acc[team.id] = team.name
    return acc
  }, {})

  return (
    <div style={wrapStyle}>
      <div style={topBarStyle}>
        <div>
          <div style={cardTitleStyle}>Meddelanden</div>
          <p style={mutedTextStyle}>{getIntroText(role)}</p>
        </div>

        <button type="button" onClick={handleRefreshMessages} style={secondaryButtonStyle}>
          Ladda om
        </button>
      </div>

      <div style={composerCardStyle}>
        <div style={sectionEyebrowStyle}>Välj mottagare</div>
        {recipients.length === 0 ? (
          <p style={mutedTextStyle}>Det finns inga mottagare att skriva till ännu.</p>
        ) : (
          <div style={recipientGridStyle(isMobile)}>
            {recipients.map((recipient) => {
              const isSelected = selectedRecipientIds.includes(recipient.id)
              return (
                <button
                  key={recipient.id}
                  type="button"
                  onClick={() => onToggleRecipient(recipient.id)}
                  style={{
                    ...recipientButtonStyle,
                    ...(isSelected ? selectedRecipientButtonStyle : {}),
                  }}
                >
                  <div style={recipientNameStyle}>{recipient.full_name}</div>
                  <div style={recipientMetaStyle}>
                    @{recipient.username} • {getRoleLabel(recipient.role)}
                    {teamMap[recipient.team_id] ? ` • ${teamMap[recipient.team_id]}` : ""}
                  </div>
                </button>
              )
            })}
          </div>
        )}

        <div style={{ ...sectionEyebrowStyle, marginTop: "16px" }}>Meddelande</div>
        <textarea
          rows={5}
          value={messageBody}
          onChange={(event) => setMessageBody(event.target.value)}
          placeholder="Skriv ditt meddelande här"
          style={{ ...inputStyle, ...messageTextareaStyle }}
        />

        <div style={composerActionsStyle}>
          <div style={mutedTextStyle}>
            {selectedRecipientIds.length
              ? `${selectedRecipientIds.length} mottagare valda`
              : "Ingen mottagare vald"}
          </div>

          <button
            type="button"
            onClick={handleSendMessage}
            disabled={isSendingMessage}
            style={{
              ...buttonStyle,
              opacity: isSendingMessage ? 0.7 : 1,
              cursor: isSendingMessage ? "default" : "pointer",
            }}
          >
            {isSendingMessage ? "Skickar..." : "Skicka"}
          </button>
        </div>
      </div>

      <div style={listCardStyle}>
        <div style={sectionEyebrowStyle}>Historik</div>
        {isLoadingMessages ? (
          <p style={mutedTextStyle}>Laddar meddelanden...</p>
        ) : messages.length === 0 ? (
          <p style={mutedTextStyle}>Inga meddelanden ännu.</p>
        ) : (
          <div style={messageListStyle}>
            {messages.map((message) => (
              <div key={message.id} style={messageCardStyle}>
                <div style={messageHeaderStyle(isMobile)}>
                  <div>
                    <div
                      style={{
                        ...messageDirectionBadgeStyle,
                        ...(message.direction === "sent" ? sentBadgeStyle : receivedBadgeStyle),
                      }}
                    >
                      {message.direction === "sent" ? "Skickat" : "Mottaget"}
                    </div>
                    <div style={messagePeopleStyle}>
                      <strong>Från:</strong>{" "}
                      {message.sender_id === currentUserId
                        ? "Du"
                        : `${message.sender?.full_name || "Okänd"} (@${message.sender?.username || "-"})`}
                    </div>
                    <div style={messagePeopleStyle}>
                      <strong>Till:</strong>{" "}
                      {(message.recipients || []).length
                        ? message.recipients
                            .map((recipient) =>
                              recipient.id === currentUserId
                                ? "Du"
                                : `${recipient.full_name} (@${recipient.username})`
                            )
                            .join(", ")
                        : "-"}
                    </div>
                  </div>

                  <div style={messageDateStyle}>{formatMessageDate(message.created_at)}</div>
                </div>

                <div style={messageBodyStyle}>{message.body}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function getIntroText(role) {
  if (role === "player") {
    return "Skriv till en eller flera tränare i ditt lag."
  }

  if (role === "coach") {
    return "Skriv till spelare och tränare i ditt lag eller direkt till huvudadmin."
  }

  return "Skriv till användare i organisationen och håll koll på all kommunikation."
}

function getRoleLabel(role) {
  if (role === "head_admin") return "Huvudadmin"
  if (role === "coach") return "Tränare"
  return "Spelare"
}

function formatMessageDate(value) {
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

const topBarStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "12px",
  flexWrap: "wrap",
}

const composerCardStyle = {
  padding: "18px",
  borderRadius: "20px",
  border: "1px solid #f0dcdc",
  background: "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(255,249,249,0.96))",
}

const listCardStyle = {
  padding: "18px",
  borderRadius: "20px",
  border: "1px solid #f0dcdc",
  background: "#fffdfd",
}

const sectionEyebrowStyle = {
  marginBottom: "10px",
  fontSize: "12px",
  fontWeight: "800",
  color: "#991b1b",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
}

const recipientGridStyle = (isMobile) => ({
  display: "grid",
  gap: "10px",
  gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
})

const recipientButtonStyle = {
  padding: "14px",
  borderRadius: "16px",
  border: "1px solid #ecdede",
  backgroundColor: "#ffffff",
  textAlign: "left",
  cursor: "pointer",
}

const selectedRecipientButtonStyle = {
  border: "2px solid #c62828",
  background: "linear-gradient(180deg, rgba(255,244,244,1), rgba(255,250,250,0.98))",
}

const recipientNameStyle = {
  fontSize: "15px",
  fontWeight: "900",
  color: "#18202b",
  marginBottom: "4px",
}

const recipientMetaStyle = {
  fontSize: "12px",
  color: "#566173",
  lineHeight: 1.5,
}

const messageTextareaStyle = {
  width: "100%",
  minHeight: "130px",
  resize: "vertical",
  fontFamily: "inherit",
}

const composerActionsStyle = {
  marginTop: "12px",
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  alignItems: "center",
  flexWrap: "wrap",
}

const messageListStyle = {
  display: "grid",
  gap: "12px",
}

const messageCardStyle = {
  padding: "14px",
  borderRadius: "16px",
  border: "1px solid #efe2e2",
  backgroundColor: "#ffffff",
}

const messageHeaderStyle = (isMobile) => ({
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  alignItems: isMobile ? "flex-start" : "center",
  flexDirection: isMobile ? "column" : "row",
  marginBottom: "10px",
})

const messageDirectionBadgeStyle = {
  display: "inline-flex",
  padding: "6px 10px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: "800",
  marginBottom: "8px",
}

const sentBadgeStyle = {
  backgroundColor: "#fff1f1",
  color: "#991b1b",
}

const receivedBadgeStyle = {
  backgroundColor: "#eff6ff",
  color: "#1d4ed8",
}

const messagePeopleStyle = {
  fontSize: "13px",
  color: "#566173",
  lineHeight: 1.6,
}

const messageDateStyle = {
  fontSize: "12px",
  color: "#6b7280",
  fontWeight: "700",
  whiteSpace: "nowrap",
}

const messageBodyStyle = {
  fontSize: "14px",
  color: "#18202b",
  lineHeight: 1.65,
  whiteSpace: "pre-wrap",
}

export default MessagesPage
