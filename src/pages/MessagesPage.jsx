import { useEffect, useMemo, useState } from "react"

function MessagesPage({
  role,
  currentUserId,
  recipients,
  selectedRecipientIds,
  setSelectedRecipientIds,
  onToggleRecipient,
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
  const [selectedThreadKey, setSelectedThreadKey] = useState("new")
  const teamMap = (teams || []).reduce((acc, team) => {
    acc[team.id] = team.name
    return acc
  }, {})

  const threads = useMemo(() => {
    const groups = new Map()

    ;(messages || []).forEach((message) => {
      const participants = dedupeProfiles([
        message.sender,
        ...(message.recipients || []),
      ])
      const participantIds = participants.map((participant) => participant.id).filter(Boolean).sort()
      const threadKey = participantIds.join(":") || message.id
      const otherParticipants = participants.filter((participant) => participant.id !== currentUserId)

      if (!groups.has(threadKey)) {
        groups.set(threadKey, {
          key: threadKey,
          participants,
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

  const activeThread =
    selectedThreadKey === "new"
      ? null
      : threads.find((thread) => thread.key === selectedThreadKey) || null

  useEffect(() => {
    if (!threads.length) {
      setSelectedThreadKey("new")
      return
    }

    if (selectedThreadKey === "new") {
      return
    }

    const exists = threads.some((thread) => thread.key === selectedThreadKey)
    if (!exists) {
      setSelectedThreadKey(threads[0].key)
    }
  }, [selectedThreadKey, threads])

  useEffect(() => {
    if (!activeThread) return

    setSelectedRecipientIds(activeThread.replyRecipientIds)
    handleMarkMessagesRead(activeThread.messages.map((message) => message.id))
  }, [activeThread, handleMarkMessagesRead, setSelectedRecipientIds])

  const startNewThread = () => {
    setSelectedThreadKey("new")
    setSelectedRecipientIds([])
    setMessageBody("")
  }

  const openThread = (thread) => {
    setSelectedThreadKey(thread.key)
  }

  const threadRecipientLabel = activeThread
    ? formatThreadParticipantNames(activeThread.otherParticipants)
    : selectedRecipientIds.length
    ? formatThreadParticipantNames(
        recipients.filter((recipient) => selectedRecipientIds.includes(recipient.id))
      )
    : ""

  return (
    <div style={wrapStyle}>
      <div style={topBarStyle}>
        <div>
          <div style={cardTitleStyle}>Meddelanden</div>
          <p style={mutedTextStyle}>{getIntroText(role)}</p>
        </div>

        <div style={topBarActionsStyle}>
          <button type="button" onClick={startNewThread} style={secondaryButtonStyle}>
            Ny chatt
          </button>
          <button type="button" onClick={handleRefreshMessages} style={secondaryButtonStyle}>
            Ladda om
          </button>
        </div>
      </div>

      <div style={messagesLayoutStyle(isMobile)}>
        <div style={threadsPanelStyle}>
          <div style={sectionEyebrowStyle}>Chattar</div>
          {isLoadingMessages ? (
            <p style={mutedTextStyle}>Laddar meddelanden...</p>
          ) : threads.length === 0 ? (
            <p style={mutedTextStyle}>Inga chattar ännu.</p>
          ) : (
            <div style={threadListStyle}>
              {threads.map((thread) => {
                const lastMessage = thread.messages[thread.messages.length - 1]
                const isActive = activeThread?.key === thread.key

                return (
                  <button
                    key={thread.key}
                    type="button"
                    onClick={() => openThread(thread)}
                    style={{
                      ...threadButtonStyle,
                      ...(isActive ? activeThreadButtonStyle : {}),
                    }}
                  >
                    <div style={threadTopRowStyle}>
                      <div style={threadTitleStyle}>
                        {formatThreadParticipantNames(thread.otherParticipants)}
                      </div>
                      {thread.unreadCount > 0 && (
                        <div style={threadUnreadBadgeStyle}>{thread.unreadCount}</div>
                      )}
                    </div>

                    <div style={threadMetaStyle}>
                      {formatThreadRoles(thread.otherParticipants)}
                    </div>
                    <div style={threadSnippetStyle}>{lastMessage?.body || ""}</div>
                    <div style={threadDateStyle}>{formatMessageDate(thread.latestAt)}</div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div style={chatPanelStyle}>
          <div style={composerCardStyle}>
            <div style={sectionEyebrowStyle}>
              {activeThread ? "Svar i chatt" : "Nytt meddelande"}
            </div>

            {activeThread ? (
              <div style={activeThreadSummaryStyle}>
                <div style={activeThreadTitleStyle}>{threadRecipientLabel}</div>
                <div style={recipientMetaStyle}>
                  {formatThreadRoles(activeThread.otherParticipants)}
                </div>
              </div>
            ) : (
              <>
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
                            {role === "player"
                              ? getRoleLabel(recipient.role)
                              : `@${recipient.username} • ${getRoleLabel(recipient.role)}${
                                  teamMap[recipient.team_id] ? ` • ${teamMap[recipient.team_id]}` : ""
                                }`}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </>
            )}

            <div style={{ ...sectionEyebrowStyle, marginTop: "16px" }}>
              {activeThread ? "Skriv svar" : "Meddelande"}
            </div>
            <textarea
              rows={5}
              value={messageBody}
              onChange={(event) => setMessageBody(event.target.value)}
              placeholder={activeThread ? "Skriv ditt svar här" : "Skriv ditt meddelande här"}
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
                {isSendingMessage ? "Skickar..." : activeThread ? "Skicka svar" : "Starta chatt"}
              </button>
            </div>
          </div>

          <div style={listCardStyle}>
            <div style={sectionEyebrowStyle}>
              {activeThread ? "Aktiv chatt" : "Välj en chatt"}
            </div>
            {!activeThread ? (
              <p style={mutedTextStyle}>
                Välj en chatt för att läsa historiken eller tryck på `Ny chatt` för att starta en ny.
              </p>
            ) : (
              <div style={chatMessagesStyle}>
                {activeThread.messages.map((message) => {
                  const isOwn = message.sender_id === currentUserId

                  return (
                    <div
                      key={message.id}
                      style={{
                        ...chatBubbleWrapStyle,
                        justifyContent: isOwn ? "flex-end" : "flex-start",
                      }}
                    >
                      <div
                        style={{
                          ...chatBubbleStyle,
                          ...(isOwn ? ownChatBubbleStyle : incomingChatBubbleStyle),
                        }}
                      >
                        <div style={chatBubbleAuthorStyle}>
                          {isOwn
                            ? "Du"
                            : `${message.sender?.full_name || "Okänd"}${
                                role === "player" ? "" : ` (@${message.sender?.username || "-"})`
                              }`}
                        </div>
                        <div style={chatBubbleBodyStyle}>{message.body}</div>
                        <div style={chatBubbleDateStyle}>{formatMessageDate(message.created_at)}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function getIntroText(role) {
  if (role === "player") {
    return "Skriv till en eller flera tränare i ditt lag och följ svaren i chattar."
  }

  if (role === "coach") {
    return "Skriv till spelare och tränare i ditt lag eller direkt till huvudadmin i chattar."
  }

  return "Skriv till användare i organisationen och följ hela samtal i chattar."
}

function getRoleLabel(role) {
  if (role === "head_admin") return "Huvudadmin"
  if (role === "coach") return "Tränare"
  return "Spelare"
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

function dedupeProfiles(entries) {
  return (entries || []).filter(
    (entry, index, arr) =>
      entry?.id && arr.findIndex((candidate) => candidate?.id === entry.id) === index
  )
}

function formatThreadParticipantNames(participants) {
  if (!participants?.length) return "Okänd chatt"
  return participants.map((participant) => participant.full_name).join(", ")
}

function formatThreadRoles(participants) {
  if (!participants?.length) return ""
  return participants.map((participant) => getRoleLabel(participant.role)).join(" • ")
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

const topBarActionsStyle = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
}

const messagesLayoutStyle = (isMobile) => ({
  display: "grid",
  gap: "16px",
  gridTemplateColumns: isMobile ? "1fr" : "320px minmax(0, 1fr)",
  alignItems: "start",
})

const threadsPanelStyle = {
  padding: "18px",
  borderRadius: "20px",
  border: "1px solid #f0dcdc",
  background: "#fffdfd",
}

const chatPanelStyle = {
  display: "grid",
  gap: "16px",
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

const threadListStyle = {
  display: "grid",
  gap: "10px",
}

const threadButtonStyle = {
  padding: "14px",
  borderRadius: "16px",
  border: "1px solid #ecdede",
  backgroundColor: "#ffffff",
  textAlign: "left",
  cursor: "pointer",
}

const activeThreadButtonStyle = {
  border: "2px solid #c62828",
  background: "linear-gradient(180deg, rgba(255,244,244,1), rgba(255,250,250,0.98))",
}

const threadTopRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: "8px",
  alignItems: "flex-start",
  marginBottom: "6px",
}

const threadTitleStyle = {
  fontSize: "15px",
  fontWeight: "900",
  color: "#18202b",
}

const threadUnreadBadgeStyle = {
  minWidth: "24px",
  height: "24px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "0 8px",
  borderRadius: "999px",
  backgroundColor: "#c62828",
  color: "#ffffff",
  fontSize: "12px",
  fontWeight: "800",
}

const threadMetaStyle = {
  fontSize: "12px",
  color: "#566173",
  lineHeight: 1.5,
  marginBottom: "6px",
}

const threadSnippetStyle = {
  fontSize: "13px",
  color: "#18202b",
  lineHeight: 1.5,
  marginBottom: "8px",
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
}

const threadDateStyle = {
  fontSize: "12px",
  color: "#6b7280",
  fontWeight: "700",
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

const activeThreadSummaryStyle = {
  padding: "12px 14px",
  borderRadius: "16px",
  border: "1px solid #efe2e2",
  backgroundColor: "#fffdfd",
}

const activeThreadTitleStyle = {
  fontSize: "16px",
  fontWeight: "900",
  color: "#18202b",
  marginBottom: "4px",
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

const chatMessagesStyle = {
  display: "grid",
  gap: "10px",
}

const chatBubbleWrapStyle = {
  display: "flex",
}

const chatBubbleStyle = {
  maxWidth: "80%",
  padding: "12px 14px",
  borderRadius: "18px",
  border: "1px solid #efe2e2",
}

const ownChatBubbleStyle = {
  backgroundColor: "#fff1f1",
  borderColor: "#f0d1d1",
}

const incomingChatBubbleStyle = {
  backgroundColor: "#ffffff",
}

const chatBubbleAuthorStyle = {
  fontSize: "12px",
  fontWeight: "800",
  color: "#991b1b",
  marginBottom: "6px",
}

const chatBubbleBodyStyle = {
  fontSize: "14px",
  color: "#18202b",
  lineHeight: 1.6,
  whiteSpace: "pre-wrap",
}

const chatBubbleDateStyle = {
  marginTop: "8px",
  fontSize: "11px",
  color: "#6b7280",
  fontWeight: "700",
}

export default MessagesPage
