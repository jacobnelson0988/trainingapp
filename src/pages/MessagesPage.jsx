import { useEffect, useMemo, useState } from "react"

function MessagesPage({
  role,
  currentUserId,
  recipients,
  selectedRecipientIds,
  setSelectedRecipientIds,
  onToggleRecipient,
  messageSubject,
  setMessageSubject,
  messageBody,
  setMessageBody,
  handleSendMessage,
  handleMarkMessagesRead,
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
  const [view, setView] = useState("inbox")
  const [selectedThreadKey, setSelectedThreadKey] = useState(null)
  const [isRecipientPickerOpen, setIsRecipientPickerOpen] = useState(false)

  const teamMap = (teams || []).reduce((acc, team) => {
    acc[team.id] = team.name
    return acc
  }, {})

  const threads = useMemo(() => {
    const groups = new Map()

    ;(messages || []).forEach((message) => {
      const participants = dedupeProfiles([message.sender, ...(message.recipients || [])])
      const participantIds = participants.map((participant) => participant.id).filter(Boolean).sort()
      const threadKey = `${participantIds.join(":")}::${String(message.subject || "").trim().toLowerCase()}`
      const otherParticipants = participants.filter((participant) => participant.id !== currentUserId)

      if (!groups.has(threadKey)) {
        groups.set(threadKey, {
          key: threadKey,
          subject: message.subject || "(Utan ämne)",
          senderName: message.sender?.full_name || "Okänd",
          otherParticipants,
          replyRecipientIds: otherParticipants.map((participant) => participant.id),
          messages: [],
          unreadCount: 0,
          latestAt: message.created_at,
        })
      }

      const thread = groups.get(threadKey)
      thread.messages.push(message)
      thread.unreadCount += message.hasUnread ? 1 : 0

      if (new Date(message.created_at).getTime() > new Date(thread.latestAt).getTime()) {
        thread.latestAt = message.created_at
        thread.senderName = message.sender?.full_name || thread.senderName
        thread.subject = message.subject || thread.subject
      }
    })

    return Array.from(groups.values())
      .map((thread) => ({
        ...thread,
        messages: thread.messages
          .slice()
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
      }))
      .sort((a, b) => new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime())
  }, [messages, currentUserId])

  const activeThread = threads.find((thread) => thread.key === selectedThreadKey) || null
  const selectedRecipients = recipients.filter((recipient) => selectedRecipientIds.includes(recipient.id))
  const totalUnreadCount = threads.reduce((sum, thread) => sum + (thread.unreadCount || 0), 0)

  useEffect(() => {
    if (view !== "thread") return
    if (!activeThread) {
      setView("inbox")
      return
    }

    setSelectedRecipientIds(activeThread.replyRecipientIds)
    setMessageSubject(activeThread.subject || "")
    handleMarkMessagesRead(activeThread.messages.map((message) => message.id))
  }, [
    activeThread,
    handleMarkMessagesRead,
    setMessageSubject,
    setSelectedRecipientIds,
    view,
  ])

  const openInbox = () => {
    setView("inbox")
    setSelectedThreadKey(null)
    setIsRecipientPickerOpen(false)
    setSelectedRecipientIds([])
    setMessageSubject("")
    setMessageBody("")
  }

  const openComposer = () => {
    setView("compose")
    setSelectedThreadKey(null)
    setIsRecipientPickerOpen(false)
    setSelectedRecipientIds([])
    setMessageSubject("")
    setMessageBody("")
  }

  const openThread = (thread) => {
    setSelectedThreadKey(thread.key)
    setView("thread")
    setIsRecipientPickerOpen(false)
    setMessageBody("")
  }

  return (
    <div style={pageWrapStyle}>
      <div style={introCardStyle}>
        <div style={introEyebrowStyle}>Tränarvy</div>
        <div style={introTitleStyle}>Meddelanden</div>
        <div style={introTextStyle}>
          Samla all kommunikation i ett tydligt flöde. Samma lugna kort, samma spacing och bättre läsbarhet på mobil.
        </div>

        <div style={introStatsGridStyle(isMobile)}>
          <div style={introStatCardStyle}>
            <div style={introStatLabelStyle}>Trådar</div>
            <div style={{ ...introStatValueStyle, color: "#dc2626" }}>{threads.length}</div>
          </div>
          <div style={introStatCardStyle}>
            <div style={introStatLabelStyle}>Olästa</div>
            <div style={introStatValueStyle}>{totalUnreadCount}</div>
          </div>
          <div style={introStatCardStyle}>
            <div style={introStatLabelStyle}>Mottagare</div>
            <div style={introStatValueStyle}>{recipients.length}</div>
          </div>
        </div>
      </div>

      <div style={sectionLabelStyle}>Kommunikation</div>
      <div style={wrapStyle}>
      {view === "inbox" && (
        <>
          <div style={headerStyle(isMobile)}>
            <button type="button" onClick={openComposer} style={buttonStyle}>
              Nytt meddelande
            </button>
            <button type="button" onClick={handleRefreshMessages} style={secondaryButtonStyle}>
              Uppdatera
            </button>
          </div>

          <div style={cardStyle}>
            <div style={cardTitleStyle}>Inkorg</div>
            {isLoadingMessages ? (
              <p style={mutedTextStyle}>Laddar meddelanden...</p>
            ) : threads.length === 0 ? (
              <p style={mutedTextStyle}>Inga meddelanden ännu.</p>
            ) : (
              <div style={inboxListStyle}>
                {threads.map((thread) => (
                  <button
                    key={thread.key}
                    type="button"
                    onClick={() => openThread(thread)}
                    style={inboxRowStyle(isMobile)}
                  >
                    <div style={inboxSenderStyle}>{thread.senderName}</div>
                    <div style={inboxSubjectStyle}>{thread.subject || "(Utan ämne)"}</div>
                    <div style={inboxMetaStyle}>
                      {thread.unreadCount > 0 && <span style={unreadBadgeStyle}>{thread.unreadCount}</span>}
                      <span>{formatMessageDate(thread.latestAt)}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {view === "compose" && (
        <>
          <div style={headerStyle(isMobile)}>
            <button type="button" onClick={openInbox} style={secondaryButtonStyle}>
              Tillbaka
            </button>
          </div>

          <div style={cardStyle}>
            <div style={cardTitleStyle}>Nytt meddelande</div>

            <div style={fieldLabelStyle}>Mottagare</div>
            <button
              type="button"
              onClick={() => setIsRecipientPickerOpen((prev) => !prev)}
              style={pickerButtonStyle}
            >
              <span>
                {selectedRecipients.length
                  ? selectedRecipients.map((recipient) => recipient.full_name).join(", ")
                  : "Välj mottagare"}
              </span>
              <span>{isRecipientPickerOpen ? "−" : "+"}</span>
            </button>

            {isRecipientPickerOpen && (
              <div style={pickerMenuStyle}>
                {recipients.length === 0 ? (
                  <div style={pickerEmptyStyle}>Inga mottagare tillgängliga</div>
                ) : (
                  recipients.map((recipient) => {
                    const isSelected = selectedRecipientIds.includes(recipient.id)
                    return (
                      <button
                        key={recipient.id}
                        type="button"
                        onClick={() => onToggleRecipient(recipient.id)}
                        style={{
                          ...pickerOptionStyle,
                          ...(isSelected ? pickerOptionActiveStyle : {}),
                        }}
                      >
                        <div style={pickerOptionNameStyle}>{recipient.full_name}</div>
                        <div style={pickerOptionMetaStyle}>
                          {role === "player"
                            ? getRoleLabel(recipient.role)
                            : `${getRoleLabel(recipient.role)}${
                                teamMap[recipient.team_id] ? ` • ${teamMap[recipient.team_id]}` : ""
                              }`}
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            )}

            <div style={fieldLabelStyle}>Ämne</div>
            <input
              type="text"
              value={messageSubject}
              onChange={(event) => setMessageSubject(event.target.value)}
              placeholder="Skriv ämne"
              style={{ ...inputStyle, width: "100%", marginBottom: "14px" }}
            />

            <div style={fieldLabelStyle}>Meddelande</div>
            <textarea
              rows={6}
              value={messageBody}
              onChange={(event) => setMessageBody(event.target.value)}
              placeholder="Skriv ditt meddelande här"
              style={{ ...inputStyle, ...textareaStyle }}
            />

            <div style={actionsStyle}>
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
        </>
      )}

      {view === "thread" && activeThread && (
        <>
          <div style={headerStyle(isMobile)}>
            <button type="button" onClick={openInbox} style={secondaryButtonStyle}>
              Tillbaka till inkorg
            </button>
          </div>

          <div style={cardStyle}>
            <div style={threadSubjectStyle}>{activeThread.subject || "(Utan ämne)"}</div>
            <div style={threadInfoStyle}>{formatThreadParticipantNames(activeThread.otherParticipants)}</div>

            <div style={chatListStyle}>
              {activeThread.messages.map((message) => {
                const isOwn = message.sender_id === currentUserId

                return (
                  <div
                    key={message.id}
                    style={{
                      ...chatRowStyle,
                      justifyContent: isOwn ? "flex-end" : "flex-start",
                    }}
                  >
                    <div
                      style={{
                        ...chatBubbleStyle,
                        ...(isOwn ? ownBubbleStyle : incomingBubbleStyle),
                      }}
                    >
                      <div style={chatAuthorStyle}>{isOwn ? "Du" : message.sender?.full_name || "Okänd"}</div>
                      <div style={chatTextStyle}>{message.body}</div>
                      <div style={chatDateStyle}>{formatMessageDate(message.created_at)}</div>
                    </div>
                  </div>
                )
              })}
            </div>

            <textarea
              rows={4}
              value={messageBody}
              onChange={(event) => setMessageBody(event.target.value)}
              placeholder="Skriv svar här"
              style={{ ...inputStyle, ...textareaStyle, minHeight: "110px" }}
            />

            <div style={actionsStyle}>
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
                {isSendingMessage ? "Skickar..." : "Skicka svar"}
              </button>
            </div>
          </div>
        </>
      )}
      </div>
    </div>
  )
}

function getRoleLabel(role) {
  if (role === "head_admin") return "Huvudadmin"
  if (role === "coach") return "Tränare"
  return "Spelare"
}

function dedupeProfiles(entries) {
  return (entries || []).filter(
    (entry, index, arr) =>
      entry?.id && arr.findIndex((candidate) => candidate?.id === entry.id) === index
  )
}

function formatThreadParticipantNames(participants) {
  if (!participants?.length) return "Okänd mottagare"
  return participants.map((participant) => participant.full_name).join(", ")
}

function formatMessageDate(value) {
  if (!value) return "-"
  return new Date(value).toLocaleString("sv-SE", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const pageWrapStyle = {
  width: "100%",
  minWidth: 0,
  overflowX: "hidden",
}

const wrapStyle = {
  display: "grid",
  gap: "16px",
  width: "100%",
  minWidth: 0,
}

const introCardStyle = {
  marginBottom: "18px",
  padding: "20px",
  borderRadius: "24px",
  border: "1px solid rgba(15, 23, 42, 0.08)",
  background: "linear-gradient(180deg, #ffffff 0%, #fbf7f7 100%)",
  boxShadow: "0 18px 40px rgba(15, 23, 42, 0.06)",
}

const introEyebrowStyle = {
  marginBottom: "8px",
  fontSize: "12px",
  fontWeight: "800",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#991b1b",
}

const introTitleStyle = {
  marginBottom: "6px",
  fontSize: "24px",
  fontWeight: "900",
  color: "#111827",
}

const introTextStyle = {
  marginBottom: "16px",
  fontSize: "14px",
  lineHeight: 1.6,
  color: "#6b7280",
}

const sectionLabelStyle = {
  marginBottom: "10px",
  fontSize: "12px",
  fontWeight: "800",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#6b7280",
}

const introStatsGridStyle = (isMobile) => ({
  display: "grid",
  gap: "10px",
  gridTemplateColumns: isMobile ? "repeat(3, minmax(0, 1fr))" : "repeat(3, minmax(0, 1fr))",
})

const introStatCardStyle = {
  padding: "14px 12px",
  borderRadius: "18px",
  border: "1px solid rgba(15, 23, 42, 0.08)",
  backgroundColor: "#ffffff",
}

const introStatLabelStyle = {
  marginBottom: "6px",
  fontSize: "11px",
  fontWeight: "800",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#6b7280",
}

const introStatValueStyle = {
  fontSize: "28px",
  lineHeight: 1,
  fontWeight: "900",
  color: "#111827",
}

const headerStyle = (isMobile) => ({
  display: "flex",
  gap: "10px",
  flexDirection: isMobile ? "column" : "row",
})

const cardStyle = {
  padding: "18px",
  borderRadius: "20px",
  border: "1px solid #f0dcdc",
  backgroundColor: "#fffdfd",
  boxShadow: "0 16px 30px rgba(24, 32, 43, 0.05)",
  minWidth: 0,
  overflow: "hidden",
}

const inboxListStyle = {
  display: "grid",
}

const inboxRowStyle = (isMobile) => ({
  display: "grid",
  gridTemplateColumns: isMobile ? "minmax(0, 1fr)" : "minmax(0, 1.1fr) minmax(0, 1.3fr) auto",
  gap: "12px",
  alignItems: "center",
  padding: "10px 0",
  borderBottom: "1px solid #f1e4e4",
  background: "transparent",
  borderLeft: "none",
  borderRight: "none",
  borderTop: "none",
  textAlign: "left",
  cursor: "pointer",
  minWidth: 0,
})

const inboxSenderStyle = {
  fontSize: "14px",
  fontWeight: "800",
  color: "#18202b",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
}

const inboxSubjectStyle = {
  fontSize: "14px",
  color: "#374151",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
}

const inboxMetaStyle = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  flexWrap: "wrap",
  fontSize: "12px",
  color: "#6b7280",
  fontWeight: "700",
}

const unreadBadgeStyle = {
  minWidth: "20px",
  height: "20px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "0 6px",
  borderRadius: "999px",
  backgroundColor: "#c62828",
  color: "#ffffff",
  fontSize: "11px",
  fontWeight: "800",
}

const fieldLabelStyle = {
  marginBottom: "8px",
  fontSize: "12px",
  fontWeight: "800",
  color: "#7f1d1d",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
}

const pickerButtonStyle = {
  width: "100%",
  marginBottom: "10px",
  padding: "12px 14px",
  borderRadius: "14px",
  border: "1px solid #e9dada",
  backgroundColor: "#ffffff",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  fontSize: "14px",
  color: "#18202b",
  cursor: "pointer",
  textAlign: "left",
}

const pickerMenuStyle = {
  marginBottom: "14px",
  border: "1px solid #ece5e5",
  borderRadius: "16px",
  backgroundColor: "#ffffff",
  overflow: "hidden",
}

const pickerEmptyStyle = {
  padding: "12px 14px",
  fontSize: "14px",
  color: "#6b7280",
}

const pickerOptionStyle = {
  width: "100%",
  padding: "12px 14px",
  border: "none",
  borderBottom: "1px solid #f3e7e7",
  backgroundColor: "#ffffff",
  textAlign: "left",
  cursor: "pointer",
}

const pickerOptionActiveStyle = {
  backgroundColor: "#fff1f1",
}

const pickerOptionNameStyle = {
  fontSize: "14px",
  fontWeight: "800",
  color: "#18202b",
  marginBottom: "4px",
}

const pickerOptionMetaStyle = {
  fontSize: "12px",
  color: "#6b7280",
}

const textareaStyle = {
  width: "100%",
  minHeight: "140px",
  resize: "vertical",
  fontFamily: "inherit",
}

const actionsStyle = {
  marginTop: "14px",
  display: "flex",
  justifyContent: "flex-end",
}

const threadSubjectStyle = {
  marginBottom: "6px",
  fontSize: "20px",
  fontWeight: "900",
  color: "#18202b",
}

const threadInfoStyle = {
  marginBottom: "14px",
  fontSize: "13px",
  color: "#6b7280",
}

const chatListStyle = {
  display: "grid",
  gap: "10px",
  marginBottom: "14px",
  minWidth: 0,
}

const chatRowStyle = {
  display: "flex",
}

const chatBubbleStyle = {
  maxWidth: "82%",
  padding: "12px 14px",
  borderRadius: "18px",
  border: "1px solid #efe2e2",
  minWidth: 0,
  overflowWrap: "anywhere",
}

const ownBubbleStyle = {
  backgroundColor: "#fff1f1",
  borderColor: "#f0d1d1",
}

const incomingBubbleStyle = {
  backgroundColor: "#ffffff",
}

const chatAuthorStyle = {
  fontSize: "12px",
  fontWeight: "800",
  color: "#991b1b",
  marginBottom: "6px",
}

const chatTextStyle = {
  fontSize: "14px",
  color: "#18202b",
  lineHeight: 1.6,
  whiteSpace: "pre-wrap",
}

const chatDateStyle = {
  marginTop: "8px",
  fontSize: "11px",
  color: "#6b7280",
  fontWeight: "700",
}

export default MessagesPage
