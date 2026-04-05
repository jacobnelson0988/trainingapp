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
  const [selectedThreadKey, setSelectedThreadKey] = useState(null)
  const [isComposerOpen, setIsComposerOpen] = useState(false)
  const teamMap = (teams || []).reduce((acc, team) => {
    acc[team.id] = team.name
    return acc
  }, {})

  const threads = useMemo(() => {
    const groups = new Map()

    ;(messages || []).forEach((message) => {
      const participants = dedupeProfiles([message.sender, ...(message.recipients || [])])
      const participantIds = participants.map((participant) => participant.id).filter(Boolean).sort()
      const threadKey = participantIds.join(":") || message.id
      const otherParticipants = participants.filter((participant) => participant.id !== currentUserId)

      if (!groups.has(threadKey)) {
        groups.set(threadKey, {
          key: threadKey,
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

  const activeThread = threads.find((thread) => thread.key === selectedThreadKey) || null

  useEffect(() => {
    if (!threads.length) {
      setSelectedThreadKey(null)
      return
    }

    if (selectedThreadKey && threads.some((thread) => thread.key === selectedThreadKey)) {
      return
    }

    setSelectedThreadKey(threads[0].key)
  }, [selectedThreadKey, threads])

  useEffect(() => {
    if (!activeThread) return

    setSelectedRecipientIds(activeThread.replyRecipientIds)
    handleMarkMessagesRead(activeThread.messages.map((message) => message.id))
  }, [activeThread, handleMarkMessagesRead, setSelectedRecipientIds])

  const openComposer = () => {
    setIsComposerOpen((prev) => !prev)
    setSelectedThreadKey(null)
    setSelectedRecipientIds([])
    setMessageBody("")
  }

  const openThread = (thread) => {
    setIsComposerOpen(false)
    setSelectedThreadKey(thread.key)
    setMessageBody("")
  }

  return (
    <div style={wrapStyle}>
      <div style={headerStyle(isMobile)}>
        <div>
          <div style={cardTitleStyle}>Meddelanden</div>
          <p style={mutedTextStyle}>{getIntroText(role)}</p>
        </div>

        <div style={headerActionsStyle}>
          <button type="button" onClick={openComposer} style={buttonStyle}>
            {isComposerOpen ? "Stäng" : "Nytt meddelande"}
          </button>
          <button type="button" onClick={handleRefreshMessages} style={secondaryButtonStyle}>
            Ladda om
          </button>
        </div>
      </div>

      {isComposerOpen && (
        <div style={cardStyle}>
          <div style={sectionTitleStyle}>Nytt meddelande</div>

          {recipients.length === 0 ? (
            <p style={mutedTextStyle}>Det finns inga mottagare att skriva till ännu.</p>
          ) : (
            <div style={recipientListStyle}>
              {recipients.map((recipient) => {
                const isSelected = selectedRecipientIds.includes(recipient.id)

                return (
                  <button
                    key={recipient.id}
                    type="button"
                    onClick={() => onToggleRecipient(recipient.id)}
                    style={{
                      ...recipientButtonStyle,
                      ...(isSelected ? selectedRecipientButtonActiveStyle : {}),
                    }}
                  >
                    <div style={recipientNameStyle}>{recipient.full_name}</div>
                    <div style={recipientMetaStyle}>
                      {role === "player"
                        ? getRoleLabel(recipient.role)
                        : `${getRoleLabel(recipient.role)}${
                            teamMap[recipient.team_id] ? ` • ${teamMap[recipient.team_id]}` : ""
                          }`}
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          <textarea
            rows={4}
            value={messageBody}
            onChange={(event) => setMessageBody(event.target.value)}
            placeholder="Skriv ditt meddelande här"
            style={{ ...inputStyle, ...textareaStyle }}
          />

          <div style={composerActionsStyle}>
            <div style={mutedTextStyle}>
              {selectedRecipientIds.length ? `${selectedRecipientIds.length} mottagare valda` : "Ingen mottagare vald"}
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
      )}

      <div style={cardStyle}>
        <div style={sectionTitleStyle}>Tidigare chattar</div>

        {isLoadingMessages ? (
          <p style={mutedTextStyle}>Laddar meddelanden...</p>
        ) : threads.length === 0 ? (
          <p style={mutedTextStyle}>Inga chattar ännu.</p>
        ) : (
          <div style={threadListStyle}>
            {threads.map((thread) => {
              const isActive = activeThread?.key === thread.key
              const lastMessage = thread.messages[thread.messages.length - 1]

              return (
                <button
                  key={thread.key}
                  type="button"
                  onClick={() => openThread(thread)}
                  style={{
                    ...threadButtonStyle,
                    ...(isActive ? threadButtonActiveStyle : {}),
                  }}
                >
                  <div style={threadTopRowStyle}>
                    <div style={threadTitleStyle}>{formatThreadParticipantNames(thread.otherParticipants)}</div>
                    <div style={threadTopMetaStyle}>
                      {thread.unreadCount > 0 && <div style={unreadBadgeStyle}>{thread.unreadCount}</div>}
                      <div style={threadDateStyle}>{formatMessageDate(thread.latestAt)}</div>
                    </div>
                  </div>

                  <div style={threadSnippetStyle}>{lastMessage?.body || ""}</div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {activeThread && !isComposerOpen && (
        <div style={cardStyle}>
          <div style={sectionTitleStyle}>{formatThreadParticipantNames(activeThread.otherParticipants)}</div>
          <div style={threadMetaStyle}>{formatThreadRoles(activeThread.otherParticipants)}</div>

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
                    <div style={chatAuthorStyle}>
                      {isOwn ? "Du" : message.sender?.full_name || "Okänd"}
                    </div>
                    <div style={chatTextStyle}>{message.body}</div>
                    <div style={chatDateStyle}>{formatMessageDate(message.created_at)}</div>
                  </div>
                </div>
              )
            })}
          </div>

          <textarea
            rows={3}
            value={messageBody}
            onChange={(event) => setMessageBody(event.target.value)}
            placeholder="Skriv svar här"
            style={{ ...inputStyle, ...textareaStyle, minHeight: "100px" }}
          />

          <div style={replyActionsStyle}>
            <button
              type="button"
              onClick={handleSendMessage}
              disabled={isSendingMessage}
              style={{
                ...buttonStyle,
                width: isMobile ? "100%" : "auto",
                opacity: isSendingMessage ? 0.7 : 1,
                cursor: isSendingMessage ? "default" : "pointer",
              }}
            >
              {isSendingMessage ? "Skickar..." : "Skicka svar"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function getIntroText(role) {
  if (role === "player") return "Skriv till tränare och följ dina chattar här."
  if (role === "coach") return "Skriv till laget och följ dina chattar här."
  return "Följ och skriv meddelanden här."
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
  if (!participants?.length) return "Okänd chatt"
  return participants.map((participant) => participant.full_name).join(", ")
}

function formatThreadRoles(participants) {
  if (!participants?.length) return ""
  return participants.map((participant) => getRoleLabel(participant.role)).join(" • ")
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

const wrapStyle = {
  display: "grid",
  gap: "16px",
}

const headerStyle = (isMobile) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: isMobile ? "stretch" : "flex-start",
  flexDirection: isMobile ? "column" : "row",
  gap: "12px",
})

const headerActionsStyle = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
}

const cardStyle = {
  padding: "18px",
  borderRadius: "20px",
  border: "1px solid #f0dcdc",
  background: "#fffdfd",
}

const sectionTitleStyle = {
  marginBottom: "10px",
  fontSize: "18px",
  fontWeight: "900",
  color: "#18202b",
}

const recipientListStyle = {
  display: "grid",
  gap: "10px",
  marginBottom: "14px",
}

const recipientButtonStyle = {
  padding: "12px 14px",
  borderRadius: "16px",
  border: "1px solid #ecdede",
  backgroundColor: "#ffffff",
  textAlign: "left",
  cursor: "pointer",
}

const recipientButtonActiveStyle = {
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

const textareaStyle = {
  width: "100%",
  minHeight: "120px",
  resize: "vertical",
  fontFamily: "inherit",
}

const composerActionsStyle = {
  marginTop: "12px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  flexWrap: "wrap",
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

const threadButtonActiveStyle = {
  border: "2px solid #c62828",
  background: "linear-gradient(180deg, rgba(255,244,244,1), rgba(255,250,250,0.98))",
}

const threadTopRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: "10px",
  alignItems: "flex-start",
  marginBottom: "6px",
}

const threadTitleStyle = {
  fontSize: "15px",
  fontWeight: "900",
  color: "#18202b",
}

const threadTopMetaStyle = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  flexShrink: 0,
}

const unreadBadgeStyle = {
  minWidth: "22px",
  height: "22px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "0 7px",
  borderRadius: "999px",
  backgroundColor: "#c62828",
  color: "#ffffff",
  fontSize: "12px",
  fontWeight: "800",
}

const threadDateStyle = {
  fontSize: "12px",
  color: "#6b7280",
  fontWeight: "700",
}

const threadSnippetStyle = {
  fontSize: "13px",
  color: "#566173",
  lineHeight: 1.5,
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
}

const threadMetaStyle = {
  fontSize: "12px",
  color: "#6b7280",
  marginBottom: "12px",
}

const chatListStyle = {
  display: "grid",
  gap: "10px",
  marginBottom: "14px",
}

const chatRowStyle = {
  display: "flex",
}

const chatBubbleStyle = {
  maxWidth: "82%",
  padding: "12px 14px",
  borderRadius: "18px",
  border: "1px solid #efe2e2",
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

const replyActionsStyle = {
  marginTop: "12px",
  display: "flex",
  justifyContent: "flex-end",
}

export default MessagesPage
