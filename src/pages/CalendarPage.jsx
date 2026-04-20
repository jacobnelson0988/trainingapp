import { useMemo, useState } from "react"

const ACTIVITY_KIND_OPTIONS = [
  { value: "template_workout", label: "Passmall" },
  { value: "free_activity", label: "Fri aktivitet" },
  { value: "handball", label: "Handboll" },
  { value: "custom", label: "Egen aktivitet" },
]

const FREE_ACTIVITY_OPTIONS = [
  { value: "running", label: "Löpning" },
  { value: "football", label: "Fotboll" },
  { value: "orienteering", label: "Orientering" },
  { value: "swimming", label: "Simning" },
  { value: "racket_sport", label: "Racketsport" },
  { value: "handball", label: "Handboll" },
  { value: "custom", label: "Egen aktivitet" },
]

const STATUS_COLORS = {
  planned: { background: "#eef4ff", color: "#1d4ed8" },
  completed: { background: "#ecfdf5", color: "#0f766e" },
  skipped: { background: "#fff7ed", color: "#c2410c" },
  cancelled: { background: "#f3f4f6", color: "#6b7280" },
}

const statusLabelMap = {
  planned: "Planerad",
  completed: "Klar",
  skipped: "Hoppad",
  cancelled: "Inställd",
}

const getTodayInput = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

const getDefaultTimeInput = () => {
  const now = new Date()
  now.setHours(17, 0, 0, 0)
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
}

const addDays = (date, days) => {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

const getStartOfWeek = (value) => {
  const date = new Date(value)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + diff)
  return date
}

const toDayKey = (value) => {
  const date = new Date(value)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

const formatDayLabel = (value) =>
  new Date(value).toLocaleDateString("sv-SE", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })

const formatTime = (value) =>
  new Date(value).toLocaleTimeString("sv-SE", {
    hour: "2-digit",
    minute: "2-digit",
  })

const getDateInputFromValue = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return getTodayInput()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

const getTimeInputFromValue = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return getDefaultTimeInput()
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`
}

const createEmptyDraft = (role) => ({
  activity_kind: "template_workout",
  workout_template_id: "",
  template_label: "",
  title: "",
  description: "",
  free_activity_type: "",
  location: "",
  date: getTodayInput(),
  start_time: getDefaultTimeInput(),
  duration_minutes: "75",
  is_recurring: false,
  recurrence_until: "",
  target_mode: role === "coach" ? "team" : "self",
  player_ids: [],
})

const buildDraftFromEntry = (entry, role, workouts) => {
  const durationMinutes = Math.max(
    1,
    Math.round((new Date(entry.ends_at).getTime() - new Date(entry.starts_at).getTime()) / 60000)
  )

  const matchingWorkout = Object.entries(workouts || {}).find(
    ([, workout]) => String(workout.id || "") === String(entry.workout_template_id || "")
  )?.[1]

  return {
    activity_kind: entry.activity_kind,
    workout_template_id: entry.workout_template_id ? String(entry.workout_template_id) : "",
    template_label: matchingWorkout?.label || entry.title || "",
    title: entry.activity_kind === "template_workout" ? "" : entry.title || "",
    description: entry.description || "",
    free_activity_type:
      entry.activity_kind === "free_activity"
        ? entry.free_activity_type || ""
        : entry.activity_kind === "handball"
        ? "handball"
        : entry.activity_kind === "custom"
        ? "custom"
        : "",
    location: entry.location || "",
    date: getDateInputFromValue(entry.starts_at),
    start_time: getTimeInputFromValue(entry.starts_at),
    duration_minutes: String(durationMinutes),
    is_recurring: false,
    recurrence_until: "",
    target_mode: role === "coach" ? "selected" : "self",
    player_ids: (entry.player_links || []).map((link) => link.player_id),
  }
}

const buildCreatePayload = (draft, role) => {
  const durationMinutes = Number(draft.duration_minutes)
  const startDate = draft.date ? new Date(`${draft.date}T${draft.start_time || "00:00"}`) : null

  if (!startDate || Number.isNaN(startDate.getTime())) {
    return { error: "Välj ett giltigt datum och en giltig starttid." }
  }

  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    return { error: "Ange längden i minuter." }
  }

  const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000)
  const title =
    draft.activity_kind === "template_workout"
      ? draft.template_label || ""
      : String(draft.title || "").trim()

  if (!title) {
    return { error: "Ange en titel eller välj ett pass." }
  }

  if (draft.activity_kind === "template_workout" && !draft.workout_template_id) {
    return { error: "Välj vilket pass som ska planeras." }
  }

  if (draft.activity_kind === "free_activity" && !draft.free_activity_type) {
    return { error: "Välj vilken fri aktivitet det gäller." }
  }

  if (role === "coach" && draft.target_mode === "selected" && (!draft.player_ids || draft.player_ids.length === 0)) {
    return { error: "Välj minst en spelare eller använd hela laget." }
  }

  if (draft.is_recurring && !draft.recurrence_until) {
    return { error: "Välj slutdatum för den återkommande serien." }
  }

  return {
    error: null,
    payload: {
      title,
      description: String(draft.description || "").trim(),
      activity_kind: draft.activity_kind,
      workout_template_id: draft.workout_template_id || null,
      free_activity_type:
        draft.activity_kind === "free_activity"
          ? draft.free_activity_type
          : draft.activity_kind === "handball"
          ? "handball"
          : draft.activity_kind === "custom"
          ? "custom"
          : null,
      location: String(draft.location || "").trim() || null,
      starts_at: startDate.toISOString(),
      ends_at: endDate.toISOString(),
      is_recurring: Boolean(draft.is_recurring),
      recurrence_until: draft.is_recurring ? draft.recurrence_until : null,
      target_mode: role === "coach" ? draft.target_mode : "self",
      player_ids: role === "coach" && draft.target_mode === "selected" ? draft.player_ids : [],
    },
  }
}

const getCanEditEntry = (entry, role) =>
  role === "coach" || (role === "player" && entry?.current_user_link?.assignment_source === "self")

function CalendarPage({
  role,
  isMobile,
  teamName,
  entries,
  players,
  workouts,
  weekStart,
  isLoading,
  isSubmittingCreate,
  isSavingActivity,
  isCancellingActivity,
  updatingEntryStatusId,
  onPreviousWeek,
  onNextWeek,
  onGoToToday,
  onCreateActivity,
  onSaveActivity,
  onCancelActivity,
  onOpenEntry,
  onUpdateEntryStatus,
}) {
  const [editingEntry, setEditingEntry] = useState(null)
  const [draft, setDraft] = useState(() => createEmptyDraft(role))

  const workoutOptions = useMemo(
    () =>
      Object.entries(workouts || {})
        .map(([key, workout]) => ({
          value: String(workout.id || key),
          label: workout.label || key,
        }))
        .sort((a, b) => a.label.localeCompare(b.label, "sv")),
    [workouts]
  )

  const weekDays = useMemo(() => {
    const start = getStartOfWeek(weekStart)
    return Array.from({ length: 7 }, (_, index) => {
      const date = addDays(start, index)
      return {
        key: toDayKey(date),
        label: formatDayLabel(date),
      }
    })
  }, [weekStart])

  const entriesByDay = useMemo(() => {
    const grouped = {}
    weekDays.forEach((day) => {
      grouped[day.key] = []
    })

    ;(entries || []).forEach((entry) => {
      const key = toDayKey(entry.starts_at)
      if (!grouped[key]) {
        grouped[key] = []
      }
      grouped[key].push(entry)
    })

    Object.values(grouped).forEach((dayEntries) => {
      dayEntries.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
    })

    return grouped
  }, [entries, weekDays])

  const resetDraft = () => {
    setDraft(createEmptyDraft(role))
    setEditingEntry(null)
  }

  const handleDraftChange = (field, value) => {
    setDraft((prev) => ({ ...prev, [field]: value }))
  }

  const handleTemplateChange = (templateId) => {
    const selectedTemplate = workoutOptions.find((option) => option.value === templateId)
    setDraft((prev) => ({
      ...prev,
      workout_template_id: templateId,
      template_label: selectedTemplate?.label || "",
      title: prev.activity_kind === "template_workout" ? selectedTemplate?.label || "" : prev.title,
    }))
  }

  const handlePlayerToggle = (playerId) => {
    setDraft((prev) => ({
      ...prev,
      player_ids: prev.player_ids.includes(playerId)
        ? prev.player_ids.filter((id) => id !== playerId)
        : [...prev.player_ids, playerId],
    }))
  }

  const handleSubmit = async () => {
    const { error, payload } = buildCreatePayload(draft, role)
    if (error) {
      const handler = editingEntry ? onSaveActivity : onCreateActivity
      handler?.({ error })
      return
    }

    const result = editingEntry
      ? await onSaveActivity(editingEntry, payload)
      : await onCreateActivity(payload)

    if (result?.ok) {
      resetDraft()
    }
  }

  const handleStartEdit = (entry) => {
    setEditingEntry(entry)
    setDraft(buildDraftFromEntry(entry, role, workouts))
  }

  return (
    <div>
      <div style={headerStyle(isMobile)}>
        <div>
          <div style={titleStyle}>Kalender</div>
          <div style={subStyle}>
            {role === "coach" ? `Planera veckan för ${teamName}.` : "Se dina planerade aktiviteter för veckan."}
          </div>
        </div>
        <div style={weekActionsStyle(isMobile)}>
          <button type="button" onClick={onPreviousWeek} style={secondaryButtonStyle}>
            Föregående
          </button>
          <button type="button" onClick={onGoToToday} style={secondaryButtonStyle}>
            Idag
          </button>
          <button type="button" onClick={onNextWeek} style={secondaryButtonStyle}>
            Nästa
          </button>
        </div>
      </div>

      <div style={layoutStyle(isMobile)}>
        <div style={weekColumnStyle}>
          {isLoading ? (
            <div style={emptyStateStyle}>Laddar kalender...</div>
          ) : (
            weekDays.map((day) => (
              <section key={day.key} style={dayCardStyle}>
                <div style={dayHeaderStyle}>
                  <div style={dayTitleStyle}>{day.label}</div>
                  <div style={dayCountStyle}>{entriesByDay[day.key]?.length || 0}</div>
                </div>

                {(entriesByDay[day.key] || []).length === 0 ? (
                  <div style={dayEmptyStyle}>Inget planerat.</div>
                ) : (
                  <div style={eventStackStyle}>
                    {(entriesByDay[day.key] || []).map((entry) => {
                      const status = entry.current_user_link?.completion_status || "planned"
                      const statusTheme = STATUS_COLORS[status] || STATUS_COLORS.planned

                      return (
                        <div key={entry.id} style={eventCardStyle}>
                          <div style={eventTopRowStyle}>
                            <div>
                              <div style={eventTitleStyle}>{entry.title}</div>
                              <div style={eventMetaStyle}>
                                {formatTime(entry.starts_at)}-{formatTime(entry.ends_at)}
                                {entry.location ? ` • ${entry.location}` : ""}
                              </div>
                            </div>
                            <div
                              style={{
                                ...statusBadgeStyle,
                                backgroundColor: statusTheme.background,
                                color: statusTheme.color,
                              }}
                            >
                              {statusLabelMap[status] || "Planerad"}
                            </div>
                          </div>

                          {entry.description ? <div style={eventDescriptionStyle}>{entry.description}</div> : null}

                          {role === "coach" ? (
                            <div style={coachMetaWrapStyle}>
                              <div style={coachMetaTextStyle}>
                                {entry.player_links.length} spelare
                                {entry.summary.completed > 0 ? ` • ${entry.summary.completed} klara` : ""}
                                {entry.summary.skipped > 0 ? ` • ${entry.summary.skipped} hoppade över` : ""}
                              </div>
                              {entry.player_links.length > 0 ? (
                                <div style={playerChipWrapStyle}>
                                  {entry.player_links.slice(0, 8).map((link) => (
                                    <span key={link.id} style={playerChipStyle}>
                                      {link.player_name}
                                    </span>
                                  ))}
                                </div>
                              ) : null}
                              <div style={playerActionsWrapStyle}>
                                <button type="button" onClick={() => handleStartEdit(entry)} style={secondaryButtonStyle}>
                                  Redigera
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onCancelActivity(entry)}
                                  disabled={isCancellingActivity}
                                  style={dangerButtonStyle}
                                >
                                  Ställ in
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div style={playerActionsWrapStyle}>
                              <button type="button" onClick={() => onOpenEntry(entry)} style={primaryButtonStyle}>
                                {entry.activity_kind === "template_workout" ? "Starta" : "Öppna"}
                              </button>
                              {entry.current_user_link && entry.current_user_link.completion_status !== "completed" ? (
                                <button
                                  type="button"
                                  onClick={() => onUpdateEntryStatus(entry.current_user_link.id, "skipped")}
                                  disabled={updatingEntryStatusId === entry.current_user_link.id}
                                  style={secondaryButtonStyle}
                                >
                                  Hoppa över
                                </button>
                              ) : null}
                              {entry.current_user_link && entry.current_user_link.completion_status === "skipped" ? (
                                <button
                                  type="button"
                                  onClick={() => onUpdateEntryStatus(entry.current_user_link.id, "planned")}
                                  disabled={updatingEntryStatusId === entry.current_user_link.id}
                                  style={secondaryButtonStyle}
                                >
                                  Återställ
                                </button>
                              ) : null}
                              {getCanEditEntry(entry, role) ? (
                                <button type="button" onClick={() => handleStartEdit(entry)} style={secondaryButtonStyle}>
                                  Redigera
                                </button>
                              ) : null}
                              {getCanEditEntry(entry, role) ? (
                                <button
                                  type="button"
                                  onClick={() => onCancelActivity(entry)}
                                  disabled={isCancellingActivity}
                                  style={dangerButtonStyle}
                                >
                                  Ta bort
                                </button>
                              ) : null}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>
            ))
          )}
        </div>

        <div style={formCardStyle}>
          <div style={formTitleStyle}>
            {editingEntry
              ? "Redigera aktivitet"
              : role === "coach"
              ? "Planera aktivitet"
              : "Lägg till egen aktivitet"}
          </div>
          <div style={formTextStyle}>
            {editingEntry
              ? "Du ändrar den valda kalenderposten direkt i den här veckan."
              : role === "coach"
              ? "Skapa engångsaktiviteter eller återkommande veckoserier för hela laget eller utvalda spelare."
              : "Lägg in sådant du själv planerar att göra och få det i samma veckovy."}
          </div>

          <div style={formGridStyle}>
            <label style={fieldStyle}>
              <span style={fieldLabelStyle}>Typ</span>
              <select
                value={draft.activity_kind}
                onChange={(event) => handleDraftChange("activity_kind", event.target.value)}
                style={inputStyle}
              >
                {ACTIVITY_KIND_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            {draft.activity_kind === "template_workout" ? (
              <label style={fieldStyle}>
                <span style={fieldLabelStyle}>Pass</span>
                <select
                  value={draft.workout_template_id}
                  onChange={(event) => handleTemplateChange(event.target.value)}
                  style={inputStyle}
                >
                  <option value="">Välj pass</option>
                  {workoutOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label style={fieldStyle}>
                <span style={fieldLabelStyle}>Titel</span>
                <input
                  type="text"
                  value={draft.title}
                  onChange={(event) => handleDraftChange("title", event.target.value)}
                  style={inputStyle}
                  placeholder="T.ex. Extra handboll eller återhämtning"
                />
              </label>
            )}

            {draft.activity_kind === "free_activity" ? (
              <label style={fieldStyle}>
                <span style={fieldLabelStyle}>Aktivitet</span>
                <select
                  value={draft.free_activity_type}
                  onChange={(event) => handleDraftChange("free_activity_type", event.target.value)}
                  style={inputStyle}
                >
                  <option value="">Välj aktivitet</option>
                  {FREE_ACTIVITY_OPTIONS.filter((option) => option.value !== "custom").map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <label style={fieldStyle}>
              <span style={fieldLabelStyle}>Datum</span>
              <input
                type="date"
                value={draft.date}
                onChange={(event) => handleDraftChange("date", event.target.value)}
                style={inputStyle}
              />
            </label>

            <label style={fieldStyle}>
              <span style={fieldLabelStyle}>Starttid</span>
              <input
                type="time"
                value={draft.start_time}
                onChange={(event) => handleDraftChange("start_time", event.target.value)}
                style={inputStyle}
              />
            </label>

            <label style={fieldStyle}>
              <span style={fieldLabelStyle}>Längd</span>
              <input
                type="number"
                min="1"
                value={draft.duration_minutes}
                onChange={(event) => handleDraftChange("duration_minutes", event.target.value)}
                style={inputStyle}
                placeholder="Minuter"
              />
            </label>

            <label style={fieldStyle}>
              <span style={fieldLabelStyle}>Plats</span>
              <input
                type="text"
                value={draft.location}
                onChange={(event) => handleDraftChange("location", event.target.value)}
                style={inputStyle}
                placeholder="T.ex. Ekvallen eller gymmet"
              />
            </label>

            <label style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
              <span style={fieldLabelStyle}>Beskrivning</span>
              <textarea
                rows={3}
                value={draft.description}
                onChange={(event) => handleDraftChange("description", event.target.value)}
                style={{ ...inputStyle, minHeight: 92, resize: "vertical" }}
                placeholder="Kort anteckning om vad som ska göras."
              />
            </label>

            {!editingEntry ? (
              <>
                <label style={toggleStyle}>
                  <input
                    type="checkbox"
                    checked={draft.is_recurring}
                    onChange={(event) => handleDraftChange("is_recurring", event.target.checked)}
                  />
                  <span>Återkom varje vecka</span>
                </label>

                {draft.is_recurring ? (
                  <label style={fieldStyle}>
                    <span style={fieldLabelStyle}>Slutdatum</span>
                    <input
                      type="date"
                      value={draft.recurrence_until}
                      onChange={(event) => handleDraftChange("recurrence_until", event.target.value)}
                      style={inputStyle}
                    />
                  </label>
                ) : null}
              </>
            ) : (
              <div style={editHintStyle}>Den här redigeringen gäller bara den valda kalenderposten, inte hela serien.</div>
            )}

            {role === "coach" ? (
              <>
                <label style={fieldStyle}>
                  <span style={fieldLabelStyle}>Målgrupp</span>
                  <select
                    value={draft.target_mode}
                    onChange={(event) => handleDraftChange("target_mode", event.target.value)}
                    style={inputStyle}
                  >
                    <option value="team">Hela laget</option>
                    <option value="selected">Utvalda spelare</option>
                  </select>
                </label>

                {draft.target_mode === "selected" ? (
                  <div style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
                    <span style={fieldLabelStyle}>Spelare</span>
                    <div style={playerSelectionStyle}>
                      {(players || []).map((player) => (
                        <label key={player.id} style={playerCheckboxStyle}>
                          <input
                            type="checkbox"
                            checked={draft.player_ids.includes(player.id)}
                            onChange={() => handlePlayerToggle(player.id)}
                          />
                          <span>{player.full_name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            ) : null}
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmittingCreate || isSavingActivity}
            style={{ ...primaryButtonStyle, width: "100%", marginTop: 16 }}
          >
            {editingEntry ? (isSavingActivity ? "Sparar..." : "Spara ändringar") : isSubmittingCreate ? "Sparar..." : "Spara aktivitet"}
          </button>
          {editingEntry ? (
            <button
              type="button"
              onClick={resetDraft}
              style={{ ...secondaryButtonStyle, width: "100%", marginTop: 10 }}
            >
              Avbryt redigering
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

const headerStyle = (isMobile) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: isMobile ? "stretch" : "center",
  flexDirection: isMobile ? "column" : "row",
  gap: "12px",
  marginBottom: "18px",
})

const titleStyle = {
  fontSize: "28px",
  fontWeight: 900,
  color: "#111827",
}

const subStyle = {
  marginTop: "6px",
  fontSize: "14px",
  lineHeight: 1.6,
  color: "#6b7280",
}

const weekActionsStyle = (isMobile) => ({
  display: "flex",
  gap: "8px",
  width: isMobile ? "100%" : "auto",
  flexWrap: "wrap",
})

const layoutStyle = (isMobile) => ({
  display: "grid",
  gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1.7fr) minmax(320px, 0.95fr)",
  gap: "16px",
  alignItems: "start",
})

const weekColumnStyle = {
  display: "grid",
  gap: "12px",
}

const dayCardStyle = {
  padding: "14px",
  borderRadius: "18px",
  border: "1px solid #ece5e5",
  backgroundColor: "#fffefe",
}

const dayHeaderStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "10px",
  marginBottom: "10px",
}

const dayTitleStyle = {
  fontSize: "16px",
  fontWeight: 900,
  color: "#111827",
}

const dayCountStyle = {
  minWidth: "28px",
  height: "28px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "999px",
  backgroundColor: "#fff1f1",
  color: "#b61e24",
  fontSize: "12px",
  fontWeight: 900,
}

const emptyStateStyle = {
  padding: "24px",
  borderRadius: "18px",
  border: "1px dashed #d1d5db",
  color: "#6b7280",
  backgroundColor: "#ffffff",
}

const dayEmptyStyle = {
  padding: "8px 2px 2px",
  color: "#9ca3af",
  fontSize: "14px",
}

const eventStackStyle = {
  display: "grid",
  gap: "10px",
}

const eventCardStyle = {
  padding: "14px",
  borderRadius: "16px",
  backgroundColor: "#fcfbfb",
  border: "1px solid #f0e7e7",
}

const eventTopRowStyle = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "12px",
}

const eventTitleStyle = {
  fontSize: "15px",
  fontWeight: 900,
  color: "#111827",
}

const eventMetaStyle = {
  marginTop: "4px",
  fontSize: "13px",
  color: "#6b7280",
}

const eventDescriptionStyle = {
  marginTop: "10px",
  fontSize: "14px",
  lineHeight: 1.55,
  color: "#4b5563",
}

const statusBadgeStyle = {
  padding: "6px 10px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: 800,
  whiteSpace: "nowrap",
}

const coachMetaWrapStyle = {
  marginTop: "12px",
}

const coachMetaTextStyle = {
  fontSize: "13px",
  color: "#6b7280",
}

const playerChipWrapStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: "6px",
  marginTop: "10px",
}

const playerChipStyle = {
  padding: "6px 10px",
  borderRadius: "999px",
  backgroundColor: "#f4f4f5",
  color: "#374151",
  fontSize: "12px",
  fontWeight: 700,
}

const playerActionsWrapStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
  marginTop: "12px",
}

const formCardStyle = {
  padding: "16px",
  borderRadius: "22px",
  border: "1px solid #ece5e5",
  backgroundColor: "#fffefe",
  boxShadow: "0 16px 32px rgba(15, 23, 42, 0.06)",
}

const formTitleStyle = {
  fontSize: "18px",
  fontWeight: 900,
  color: "#111827",
}

const formTextStyle = {
  marginTop: "6px",
  fontSize: "14px",
  lineHeight: 1.6,
  color: "#6b7280",
}

const formGridStyle = {
  display: "grid",
  gap: "12px",
  marginTop: "16px",
}

const fieldStyle = {
  display: "grid",
  gap: "6px",
}

const fieldLabelStyle = {
  fontSize: "13px",
  fontWeight: 800,
  color: "#374151",
}

const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: "14px",
  border: "1px solid #e5d9d9",
  backgroundColor: "#ffffff",
  color: "#111827",
  fontSize: "14px",
  boxSizing: "border-box",
}

const toggleStyle = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  fontSize: "14px",
  color: "#374151",
  fontWeight: 700,
}

const editHintStyle = {
  padding: "12px 14px",
  borderRadius: "14px",
  backgroundColor: "#fff7ed",
  border: "1px solid #fed7aa",
  color: "#9a3412",
  fontSize: "13px",
  lineHeight: 1.5,
}

const playerSelectionStyle = {
  display: "grid",
  gap: "8px",
  maxHeight: "220px",
  overflowY: "auto",
  padding: "10px",
  borderRadius: "14px",
  border: "1px solid #ece5e5",
  backgroundColor: "#fffdfd",
}

const playerCheckboxStyle = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  fontSize: "14px",
  color: "#374151",
}

const primaryButtonStyle = {
  border: "none",
  borderRadius: "14px",
  padding: "12px 16px",
  background: "linear-gradient(135deg, #c62828 0%, #991b1b 100%)",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: 800,
  cursor: "pointer",
}

const secondaryButtonStyle = {
  border: "1px solid #e5d9d9",
  borderRadius: "14px",
  padding: "12px 14px",
  backgroundColor: "#ffffff",
  color: "#374151",
  fontSize: "14px",
  fontWeight: 700,
  cursor: "pointer",
}

const dangerButtonStyle = {
  border: "1px solid #f3c6c6",
  borderRadius: "14px",
  padding: "12px 14px",
  backgroundColor: "#fff5f5",
  color: "#b91c1c",
  fontSize: "14px",
  fontWeight: 700,
  cursor: "pointer",
}

export default CalendarPage
