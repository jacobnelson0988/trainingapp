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
  uiVariant,
}) {
  const isPlayer = role === "player"
  const useRedesignVariant = isPlayer || uiVariant === "coach"
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

  const resolvedPageHeaderStyle = useRedesignVariant ? playerPageHeaderStyle : pageHeaderStyle
  const resolvedPageHeaderCopyStyle = useRedesignVariant ? playerPageHeaderCopyStyle : pageHeaderCopyStyle
  const resolvedPageEyebrowStyle = useRedesignVariant ? playerPageEyebrowStyle : pageEyebrowStyle
  const resolvedIntroTitleStyle = useRedesignVariant ? playerIntroTitleStyle : introTitleStyle
  const resolvedIntroStatsGridStyle = useRedesignVariant ? playerIntroStatsGridStyle : introStatsGridStyle
  const resolvedIntroStatCardStyle = useRedesignVariant ? playerIntroStatCardStyle : introStatCardStyle
  const resolvedIntroStatLabelStyle = useRedesignVariant ? playerIntroStatLabelStyle : introStatLabelStyle
  const resolvedIntroStatValueStyle = useRedesignVariant ? playerIntroStatValueStyle : introStatValueStyle
  const resolvedWrapStyle = useRedesignVariant ? playerWrapStyle : wrapStyle
  const resolvedHeaderStyle = useRedesignVariant ? playerHeaderStyle : headerStyle
  const resolvedCardStyle = useRedesignVariant ? playerCardStyle : cardStyle
  const resolvedInboxListStyle = useRedesignVariant ? playerInboxListStyle : inboxListStyle
  const resolvedInboxRowStyle = useRedesignVariant ? playerInboxRowStyle : inboxRowStyle
  const resolvedInboxSenderStyle = useRedesignVariant ? playerInboxSenderStyle : inboxSenderStyle
  const resolvedInboxSubjectStyle = useRedesignVariant ? playerInboxSubjectStyle : inboxSubjectStyle
  const resolvedInboxMetaStyle = useRedesignVariant ? playerInboxMetaStyle : inboxMetaStyle
  const resolvedUnreadBadgeStyle = useRedesignVariant ? playerUnreadBadgeStyle : unreadBadgeStyle
  const resolvedFieldLabelStyle = useRedesignVariant ? playerFieldLabelStyle : fieldLabelStyle
  const resolvedPickerButtonStyle = useRedesignVariant ? playerPickerButtonStyle : pickerButtonStyle
  const resolvedPickerMenuStyle = useRedesignVariant ? playerPickerMenuStyle : pickerMenuStyle
  const resolvedPickerEmptyStyle = useRedesignVariant ? playerPickerEmptyStyle : pickerEmptyStyle
  const resolvedPickerOptionStyle = useRedesignVariant ? playerPickerOptionStyle : pickerOptionStyle
  const resolvedPickerOptionActiveStyle = useRedesignVariant ? playerPickerOptionActiveStyle : pickerOptionActiveStyle
  const resolvedPickerOptionNameStyle = useRedesignVariant ? playerPickerOptionNameStyle : pickerOptionNameStyle
  const resolvedPickerOptionMetaStyle = useRedesignVariant ? playerPickerOptionMetaStyle : pickerOptionMetaStyle
  const resolvedActionsStyle = useRedesignVariant ? playerActionsStyle : actionsStyle
  const resolvedThreadSubjectStyle = useRedesignVariant ? playerThreadSubjectStyle : threadSubjectStyle
  const resolvedThreadInfoStyle = useRedesignVariant ? playerThreadInfoStyle : threadInfoStyle
  const resolvedChatListStyle = useRedesignVariant ? playerChatListStyle : chatListStyle
  const resolvedChatBubbleStyle = useRedesignVariant ? playerChatBubbleStyle : chatBubbleStyle
  const resolvedOwnBubbleStyle = useRedesignVariant ? playerOwnBubbleStyle : ownBubbleStyle
  const resolvedIncomingBubbleStyle = useRedesignVariant ? playerIncomingBubbleStyle : incomingBubbleStyle
  const resolvedChatAuthorStyle = useRedesignVariant ? playerChatAuthorStyle : chatAuthorStyle
  const resolvedChatTextStyle = useRedesignVariant ? playerChatTextStyle : chatTextStyle
  const resolvedChatDateStyle = useRedesignVariant ? playerChatDateStyle : chatDateStyle
  const resolvedCardTitleStyle = useRedesignVariant ? playerSectionTitleStyle : cardTitleStyle
  const resolvedMutedTextStyle = useRedesignVariant ? playerMutedTextStyle : mutedTextStyle
  const resolvedInputStyle = useRedesignVariant ? { ...inputStyle, ...playerInputStyle } : inputStyle
  const resolvedButtonStyle = useRedesignVariant ? { ...buttonStyle, ...playerButtonStyle } : buttonStyle
  const resolvedSecondaryButtonStyle = useRedesignVariant
    ? { ...secondaryButtonStyle, ...playerSecondaryButtonStyle }
    : secondaryButtonStyle

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
      <div style={resolvedPageHeaderStyle}>
        <div style={resolvedPageHeaderCopyStyle}>
          <div style={resolvedPageEyebrowStyle}>Meddelanden</div>
          <div style={resolvedIntroTitleStyle}>Meddelanden</div>
        </div>
      </div>

      <div style={resolvedIntroStatsGridStyle(isMobile)}>
        <div style={resolvedIntroStatCardStyle}>
          <div style={resolvedIntroStatLabelStyle}>Trådar</div>
          <div
            style={{
              ...resolvedIntroStatValueStyle,
              color: useRedesignVariant ? playerAccent : "#dc2626",
            }}
          >
            {threads.length}
          </div>
        </div>
        <div style={resolvedIntroStatCardStyle}>
          <div style={resolvedIntroStatLabelStyle}>Olästa</div>
          <div style={resolvedIntroStatValueStyle}>{totalUnreadCount}</div>
        </div>
        <div style={resolvedIntroStatCardStyle}>
          <div style={resolvedIntroStatLabelStyle}>Mottagare</div>
          <div style={resolvedIntroStatValueStyle}>{recipients.length}</div>
        </div>
      </div>

      <div style={resolvedWrapStyle}>
      {view === "inbox" && (
        <>
          <div style={resolvedHeaderStyle(isMobile)}>
            <button type="button" onClick={openComposer} style={resolvedButtonStyle}>
              Nytt meddelande
            </button>
            <button type="button" onClick={handleRefreshMessages} style={resolvedSecondaryButtonStyle}>
              Uppdatera
            </button>
          </div>

          <div style={resolvedCardStyle}>
            <div style={resolvedCardTitleStyle}>Inkorg</div>
            {isLoadingMessages ? (
              <p style={resolvedMutedTextStyle}>Laddar meddelanden...</p>
            ) : threads.length === 0 ? (
              <p style={resolvedMutedTextStyle}>Inga meddelanden ännu.</p>
            ) : (
              <div style={resolvedInboxListStyle}>
                {threads.map((thread) => (
                  <button
                    key={thread.key}
                    type="button"
                    onClick={() => openThread(thread)}
                    style={resolvedInboxRowStyle(isMobile)}
                  >
                    <div style={resolvedInboxSenderStyle}>{thread.senderName}</div>
                    <div style={resolvedInboxSubjectStyle}>{thread.subject || "(Utan ämne)"}</div>
                    <div style={resolvedInboxMetaStyle}>
                      {thread.unreadCount > 0 && <span style={resolvedUnreadBadgeStyle}>{thread.unreadCount}</span>}
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
          <div style={resolvedHeaderStyle(isMobile)}>
            <button type="button" onClick={openInbox} style={resolvedSecondaryButtonStyle}>
              Tillbaka
            </button>
          </div>

          <div style={resolvedCardStyle}>
            <div style={resolvedCardTitleStyle}>Nytt meddelande</div>

            <div style={resolvedFieldLabelStyle}>Mottagare</div>
            <button
              type="button"
              onClick={() => setIsRecipientPickerOpen((prev) => !prev)}
              style={resolvedPickerButtonStyle}
            >
              <span>
                {selectedRecipients.length
                  ? selectedRecipients.map((recipient) => recipient.full_name).join(", ")
                  : "Välj mottagare"}
              </span>
              <span>{isRecipientPickerOpen ? "−" : "+"}</span>
            </button>

            {isRecipientPickerOpen && (
              <div style={resolvedPickerMenuStyle}>
                {recipients.length === 0 ? (
                  <div style={resolvedPickerEmptyStyle}>Inga mottagare tillgängliga</div>
                ) : (
                  recipients.map((recipient) => {
                    const isSelected = selectedRecipientIds.includes(recipient.id)
                    return (
                      <button
                        key={recipient.id}
                        type="button"
                        onClick={() => onToggleRecipient(recipient.id)}
                        style={{
                          ...resolvedPickerOptionStyle,
                          ...(isSelected ? resolvedPickerOptionActiveStyle : {}),
                        }}
                      >
                        <div style={resolvedPickerOptionNameStyle}>{recipient.full_name}</div>
                        <div style={resolvedPickerOptionMetaStyle}>
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

            <div style={resolvedFieldLabelStyle}>Ämne</div>
            <input
              type="text"
              value={messageSubject}
              onChange={(event) => setMessageSubject(event.target.value)}
              placeholder="Skriv ämne"
              style={{ ...resolvedInputStyle, width: "100%", marginBottom: "14px" }}
            />

            <div style={resolvedFieldLabelStyle}>Meddelande</div>
            <textarea
              rows={6}
              value={messageBody}
              onChange={(event) => setMessageBody(event.target.value)}
              placeholder="Skriv ditt meddelande här"
              style={{ ...resolvedInputStyle, ...textareaStyle }}
            />

            <div style={resolvedActionsStyle}>
              <button
                type="button"
                onClick={handleSendMessage}
                disabled={isSendingMessage}
                style={{
                  ...resolvedButtonStyle,
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
          <div style={resolvedHeaderStyle(isMobile)}>
            <button type="button" onClick={openInbox} style={resolvedSecondaryButtonStyle}>
              Tillbaka till inkorg
            </button>
          </div>

          <div style={resolvedCardStyle}>
            <div style={resolvedThreadSubjectStyle}>{activeThread.subject || "(Utan ämne)"}</div>
            <div style={resolvedThreadInfoStyle}>{formatThreadParticipantNames(activeThread.otherParticipants)}</div>

            <div style={resolvedChatListStyle}>
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
                        ...resolvedChatBubbleStyle,
                        ...(isOwn ? resolvedOwnBubbleStyle : resolvedIncomingBubbleStyle),
                      }}
                    >
                      <div
                        style={{
                          ...resolvedChatAuthorStyle,
                          color: useRedesignVariant && isOwn
                            ? "rgba(243, 239, 230, 0.76)"
                            : resolvedChatAuthorStyle.color,
                        }}
                      >
                        {isOwn ? "Du" : message.sender?.full_name || "Okänd"}
                      </div>
                      <div
                        style={{
                          ...resolvedChatTextStyle,
                          color: useRedesignVariant && isOwn ? playerPaper : resolvedChatTextStyle.color,
                        }}
                      >
                        {message.body}
                      </div>
                      <div
                        style={{
                          ...resolvedChatDateStyle,
                          color: useRedesignVariant && isOwn
                            ? "rgba(243, 239, 230, 0.72)"
                            : resolvedChatDateStyle.color,
                        }}
                      >
                        {formatMessageDate(message.created_at)}
                      </div>
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
              style={{ ...resolvedInputStyle, ...textareaStyle, minHeight: "110px" }}
            />

            <div style={resolvedActionsStyle}>
              <button
                type="button"
                onClick={handleSendMessage}
                disabled={isSendingMessage}
                style={{
                  ...resolvedButtonStyle,
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

const pageHeaderStyle = {
  marginBottom: "14px",
}

const pageHeaderCopyStyle = {
  display: "grid",
  gap: "4px",
}

const wrapStyle = {
  display: "grid",
  gap: "16px",
  width: "100%",
  minWidth: 0,
}

const pageEyebrowStyle = {
  fontFamily: '"IBM Plex Mono", "SFMono-Regular", Consolas, monospace',
  fontSize: "11px",
  fontWeight: 700,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "#6f6659",
}

const introTitleStyle = {
  marginBottom: 0,
  marginTop: "8px",
  fontFamily: '"Manrope", sans-serif',
  fontSize: "clamp(38px, 10vw, 60px)",
  lineHeight: 0.92,
  fontWeight: 700,
  letterSpacing: "-0.04em",
  color: "#1a1814",
}

const introTextStyle = {
  marginBottom: 0,
  fontSize: "14px",
  lineHeight: 1.6,
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

const playerPaper = "#f3efe6"
const playerInk = "#1a1814"
const playerInkSoft = "#6f6659"
const playerAccent = "#d94a1f"
const playerLine = "rgba(26, 24, 20, 0.14)"
const playerDisplayFont = '"Manrope", sans-serif'
const playerMonoFont = '"IBM Plex Mono", "SFMono-Regular", Consolas, monospace'

const playerPageHeaderStyle = {
  marginBottom: "12px",
}

const playerPageHeaderCopyStyle = {
  display: "grid",
  gap: "2px",
}

const playerPageEyebrowStyle = {
  fontFamily: playerMonoFont,
  fontSize: "11px",
  fontWeight: 700,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: playerInkSoft,
}

const playerIntroTitleStyle = {
  marginBottom: 0,
  marginTop: "8px",
  fontFamily: playerDisplayFont,
  fontSize: "clamp(38px, 10vw, 60px)",
  lineHeight: 0.92,
  fontWeight: 700,
  letterSpacing: "-0.04em",
  color: playerInk,
}

const playerIntroStatsGridStyle = (isMobile) => ({
  display: "grid",
  gap: "10px",
  gridTemplateColumns: isMobile ? "repeat(3, minmax(0, 1fr))" : "repeat(3, minmax(0, 1fr))",
  marginBottom: "14px",
})

const playerIntroStatCardStyle = {
  padding: "14px 12px",
  borderRadius: "18px",
  border: `1px solid ${playerLine}`,
  background: "rgba(255, 255, 255, 0.28)",
  boxShadow: "0 10px 24px rgba(75, 58, 38, 0.06)",
}

const playerIntroStatLabelStyle = {
  marginBottom: "6px",
  fontFamily: playerMonoFont,
  fontSize: "10px",
  fontWeight: "700",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: playerInkSoft,
}

const playerIntroStatValueStyle = {
  fontFamily: playerDisplayFont,
  fontSize: "32px",
  lineHeight: 0.95,
  fontWeight: 750,
  letterSpacing: "-0.05em",
  color: playerInk,
}

const playerWrapStyle = {
  display: "grid",
  gap: "14px",
  width: "100%",
  minWidth: 0,
}

const playerHeaderStyle = (isMobile) => ({
  display: "flex",
  gap: "10px",
  flexDirection: isMobile ? "column" : "row",
})

const playerCardStyle = {
  padding: "18px",
  borderRadius: "24px",
  border: `1px solid ${playerLine}`,
  background: "linear-gradient(180deg, rgba(255, 255, 255, 0.3), rgba(243, 239, 230, 0.6))",
  boxShadow: "0 18px 34px rgba(75, 58, 38, 0.08)",
  minWidth: 0,
  overflow: "hidden",
}

const playerSectionTitleStyle = {
  marginBottom: "14px",
  fontFamily: playerDisplayFont,
  fontSize: "clamp(26px, 7vw, 34px)",
  lineHeight: 0.95,
  fontWeight: 760,
  letterSpacing: "-0.05em",
  color: playerInk,
}

const playerMutedTextStyle = {
  margin: 0,
  fontSize: "14px",
  lineHeight: 1.6,
  color: playerInkSoft,
}

const playerInboxListStyle = {
  display: "grid",
  gap: "10px",
}

const playerInboxRowStyle = () => ({
  display: "grid",
  gap: "6px",
  padding: "14px 16px",
  borderRadius: "18px",
  border: `1px solid ${playerLine}`,
  background: "rgba(255, 255, 255, 0.3)",
  textAlign: "left",
  cursor: "pointer",
  minWidth: 0,
})

const playerInboxSenderStyle = {
  fontFamily: playerMonoFont,
  fontSize: "10px",
  fontWeight: "700",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: playerInkSoft,
}

const playerInboxSubjectStyle = {
  fontSize: "16px",
  lineHeight: 1.25,
  fontWeight: "800",
  color: playerInk,
  overflowWrap: "anywhere",
}

const playerInboxMetaStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "10px",
  flexWrap: "wrap",
  fontSize: "12px",
  color: playerInkSoft,
  fontWeight: "700",
}

const playerUnreadBadgeStyle = {
  minWidth: "22px",
  height: "22px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "0 7px",
  borderRadius: "999px",
  backgroundColor: playerInk,
  color: playerPaper,
  fontSize: "11px",
  fontWeight: "800",
}

const playerFieldLabelStyle = {
  marginBottom: "8px",
  fontFamily: playerMonoFont,
  fontSize: "10px",
  fontWeight: "700",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: playerInkSoft,
}

const playerInputStyle = {
  border: `1px solid ${playerLine}`,
  borderRadius: "16px",
  backgroundColor: "rgba(255, 255, 255, 0.75)",
  color: playerInk,
  boxShadow: "none",
}

const playerButtonStyle = {
  borderRadius: "16px",
  background: playerAccent,
  boxShadow: "0 14px 28px rgba(217, 74, 31, 0.18)",
}

const playerSecondaryButtonStyle = {
  borderRadius: "16px",
  border: `1px solid ${playerLine}`,
  backgroundColor: "rgba(255, 255, 255, 0.36)",
  color: playerInk,
  boxShadow: "none",
}

const playerPickerButtonStyle = {
  width: "100%",
  marginBottom: "10px",
  padding: "13px 14px",
  borderRadius: "16px",
  border: `1px solid ${playerLine}`,
  backgroundColor: "rgba(255, 255, 255, 0.72)",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  fontSize: "14px",
  color: playerInk,
  cursor: "pointer",
  textAlign: "left",
}

const playerPickerMenuStyle = {
  marginBottom: "14px",
  border: `1px solid ${playerLine}`,
  borderRadius: "18px",
  backgroundColor: "rgba(255, 255, 255, 0.82)",
  overflow: "hidden",
}

const playerPickerEmptyStyle = {
  padding: "12px 14px",
  fontSize: "14px",
  color: playerInkSoft,
}

const playerPickerOptionStyle = {
  width: "100%",
  padding: "12px 14px",
  border: "none",
  borderBottom: `1px solid ${playerLine}`,
  backgroundColor: "transparent",
  textAlign: "left",
  cursor: "pointer",
}

const playerPickerOptionActiveStyle = {
  backgroundColor: "rgba(217, 74, 31, 0.1)",
}

const playerPickerOptionNameStyle = {
  fontSize: "14px",
  fontWeight: "800",
  color: playerInk,
  marginBottom: "4px",
}

const playerPickerOptionMetaStyle = {
  fontSize: "12px",
  color: playerInkSoft,
}

const playerActionsStyle = {
  marginTop: "14px",
  display: "flex",
  justifyContent: "flex-end",
}

const playerThreadSubjectStyle = {
  marginBottom: "6px",
  fontFamily: playerDisplayFont,
  fontSize: "clamp(28px, 7vw, 36px)",
  lineHeight: 0.96,
  fontWeight: 760,
  letterSpacing: "-0.05em",
  color: playerInk,
}

const playerThreadInfoStyle = {
  marginBottom: "14px",
  fontFamily: playerMonoFont,
  fontSize: "10px",
  fontWeight: "700",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: playerInkSoft,
}

const playerChatListStyle = {
  display: "grid",
  gap: "10px",
  marginBottom: "14px",
  minWidth: 0,
}

const playerChatBubbleStyle = {
  maxWidth: "84%",
  padding: "12px 14px",
  borderRadius: "20px",
  border: `1px solid ${playerLine}`,
  minWidth: 0,
  overflowWrap: "anywhere",
}

const playerOwnBubbleStyle = {
  backgroundColor: playerInk,
  borderColor: playerInk,
}

const playerIncomingBubbleStyle = {
  backgroundColor: "rgba(255, 255, 255, 0.78)",
}

const playerChatAuthorStyle = {
  fontFamily: playerMonoFont,
  fontSize: "10px",
  fontWeight: "700",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: playerAccent,
  marginBottom: "6px",
}

const playerChatTextStyle = {
  fontSize: "14px",
  color: playerInk,
  lineHeight: 1.6,
  whiteSpace: "pre-wrap",
}

const playerChatDateStyle = {
  marginTop: "8px",
  fontSize: "11px",
  color: playerInkSoft,
  fontWeight: "700",
}


export default MessagesPage
