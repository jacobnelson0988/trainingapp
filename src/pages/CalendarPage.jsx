import { useMemo, useState } from "react"
import {
  bodyTextStyleToken,
  fieldLabelStyleToken,
  redesignLineSoft,
  redesignSurfaceSoft,
  sectionTitleStyleToken,
} from "../ui/redesignTokens"
import { getPlayerTrainingTheme, resolvePlayerTrainingThemeKey } from "../ui/playerTrainingThemes"

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

const formatPlayerDayTitle = (value) =>
  new Date(value).toLocaleDateString("sv-SE", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })

const formatPlayerWeekRange = (days) => {
  if (!Array.isArray(days) || days.length === 0) return ""

  const firstDate = new Date(days[0].key)
  const lastDate = new Date(days[days.length - 1].key)
  const sameMonth = firstDate.getMonth() === lastDate.getMonth()

  if (sameMonth) {
    return `${firstDate.getDate()}-${lastDate.getDate()} ${lastDate.toLocaleDateString("sv-SE", {
      month: "long",
    })}`
  }

  return `${firstDate.getDate()} ${firstDate.toLocaleDateString("sv-SE", {
    month: "short",
  })} - ${lastDate.getDate()} ${lastDate.toLocaleDateString("sv-SE", {
    month: "short",
  })}`
}

const formatCompactWeekRange = (days) => {
  if (!Array.isArray(days) || days.length === 0) return ""

  const firstDate = new Date(days[0].key)
  const lastDate = new Date(days[days.length - 1].key)
  const sameMonth = firstDate.getMonth() === lastDate.getMonth()

  if (sameMonth) {
    return `${firstDate.getDate()} - ${lastDate.getDate()}`
  }

  return `${firstDate.getDate()} ${firstDate.toLocaleDateString("sv-SE", {
    month: "short",
  })} - ${lastDate.getDate()} ${lastDate.toLocaleDateString("sv-SE", {
    month: "short",
  })}`
}

const formatPlayerMonthLabel = (value) =>
  new Date(value).toLocaleDateString("sv-SE", {
    month: "long",
    year: "numeric",
  })

const formatPlayerDateOnly = (value) =>
  new Date(value).toLocaleDateString("sv-SE", {
    month: "long",
    day: "numeric",
  })

const getPlayerDayLetter = (value) =>
  new Date(value)
    .toLocaleDateString("sv-SE", { weekday: "short" })
    .replace(".", "")
    .slice(0, 1)
    .toUpperCase()

const getEntryDurationMinutes = (entry) => {
  const start = new Date(entry?.starts_at).getTime()
  const end = new Date(entry?.ends_at).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return ""

  const durationMinutes = Math.max(1, Math.round((end - start) / 60000))
  return `${durationMinutes} min`
}

const getMatchingWorkout = (entry, workouts) =>
  Object.entries(workouts || {}).find(
    ([, workout]) => String(workout.id || "") === String(entry?.workout_template_id || "")
  )?.[1] || null

const getPlayerEntryTypeLabel = (entry, matchedWorkout) => {
  if (entry?.is_external === true && entry?.activity_kind === "handball") {
    return "Handboll"
  }

  if (entry?.activity_kind === "template_workout") {
    if (matchedWorkout?.workoutKind === "running") return "Löppass"
    if (matchedWorkout?.workoutKind === "prehab") return "Skadeförebyggande"
    if (matchedWorkout?.workoutKind === "gym" && matchedWorkout?.gymPassType === "shared") {
      return "Gemensamt gympass"
    }
    if (matchedWorkout?.workoutKind === "gym") return "Gympass"
    return "Pass"
  }

  if (entry?.activity_kind === "free_activity") {
    return (
      FREE_ACTIVITY_OPTIONS.find((option) => option.value === entry?.free_activity_type)?.label ||
      "Fri aktivitet"
    )
  }

  if (entry?.activity_kind === "custom") return "Egen aktivitet"
  if (entry?.activity_kind === "handball") return "Handboll"
  return "Aktivitet"
}

const getPlayerEntryBadgeLabel = (entry, matchedWorkout) => {
  if (entry?.is_external === true && entry?.activity_kind === "handball") return "HB"
  if (entry?.activity_kind === "custom") return "EGEN"
  if (entry?.activity_kind === "free_activity") return "FRI"
  if (matchedWorkout?.workoutKind === "running") return "LÖP"
  if (matchedWorkout?.workoutKind === "prehab") return "PRE"
  if (matchedWorkout?.workoutKind === "gym" && matchedWorkout?.gymPassType === "shared") return "TEAM"
  if (matchedWorkout?.workoutKind === "gym") return "GYM"
  return "PASS"
}

const getPlayerEntryThemeKey = (entry, matchedWorkout) =>
  resolvePlayerTrainingThemeKey({
    workoutKind: matchedWorkout?.workoutKind,
    activityKind: entry?.activity_kind,
    freeActivityType: entry?.free_activity_type,
  })

const getPlayerEntryBadgeTheme = (entry, matchedWorkout) => {
  const theme = getPlayerTrainingTheme(getPlayerEntryThemeKey(entry, matchedWorkout))

  return {
    backgroundColor: theme.badgeBackground,
    color: theme.badgeColor,
  }
}

const getPlayerDayActivityDotColor = (entry, workouts) => {
  if (entry?.is_external === true && entry?.activity_kind === "handball") {
    return getPlayerTrainingTheme("other").dotColor
  }

  const status = entry?.current_user_link?.completion_status || "planned"
  if (status === "completed") return "#1a1814"
  if (status === "skipped") return "#c2410c"

  const matchedWorkout = entry?.activity_kind === "template_workout" ? getMatchingWorkout(entry, workouts) : null
  return getPlayerTrainingTheme(getPlayerEntryThemeKey(entry, matchedWorkout)).dotColor
}

const getIsoWeekNumber = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""

  const normalized = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNumber = normalized.getUTCDay() || 7
  normalized.setUTCDate(normalized.getUTCDate() + 4 - dayNumber)
  const yearStart = new Date(Date.UTC(normalized.getUTCFullYear(), 0, 1))
  return Math.ceil((((normalized - yearStart) / 86400000) + 1) / 7)
}

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
  entry?.is_external !== true &&
  (role === "coach" || (role === "player" && entry?.current_user_link?.assignment_source === "self"))

const isSharedTemplateEntry = (entry, workouts) => {
  if (entry?.activity_kind !== "template_workout") return false

  const matchingWorkout = Object.entries(workouts || {}).find(
    ([, workout]) => String(workout.id || "") === String(entry.workout_template_id || "")
  )?.[1]

  return matchingWorkout?.workoutKind === "gym" && matchingWorkout?.gymPassType === "shared"
}

const buildGroupDraftFromEntry = (entry) =>
  (entry?.groups || []).map((group, index) => ({
    id: group.id || `group-${index + 1}`,
    name: group.name || `Grupp ${index + 1}`,
    player_ids: (group.members || []).map((member) => member.player_id),
  }))

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
  externalCalendarSource,
  externalCalendarFeedUrl,
  onExternalCalendarFeedUrlChange,
  externalCalendarEnabled,
  onExternalCalendarEnabledChange,
  onSaveExternalCalendarSource,
  isSavingExternalCalendarSource,
  onSyncExternalCalendar,
  isSyncingExternalCalendar,
  isSavingGroups,
  onSaveEntryGroups,
}) {
  const [editingEntry, setEditingEntry] = useState(null)
  const [draft, setDraft] = useState(() => createEmptyDraft(role))
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [expandedPlayerDayKey, setExpandedPlayerDayKey] = useState(null)
  const [isExternalCalendarPageOpen, setIsExternalCalendarPageOpen] = useState(false)
  const [groupEditorEntryId, setGroupEditorEntryId] = useState(null)
  const [groupDrafts, setGroupDrafts] = useState([])

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

  const weekRangeLabel = useMemo(() => formatPlayerWeekRange(weekDays), [weekDays])
  const weekNumber = useMemo(() => getIsoWeekNumber(weekDays[0]?.key), [weekDays])
  const externalCalendarLastSyncedLabel = externalCalendarSource?.last_synced_at
    ? new Date(externalCalendarSource.last_synced_at).toLocaleString("sv-SE")
    : "Aldrig"

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

  const defaultPlayerDayKey = useMemo(() => {
    const todayKey = getTodayInput()
    return weekDays.find((day) => day.key === todayKey)?.key || weekDays[0]?.key || null
  }, [weekDays])

  const activePlayerDayKey = weekDays.some((day) => day.key === expandedPlayerDayKey)
    ? expandedPlayerDayKey
    : defaultPlayerDayKey

  const activePlayerDay = weekDays.find((day) => day.key === activePlayerDayKey) || null
  const activePlayerDayEntries = activePlayerDay ? entriesByDay[activePlayerDay.key] || [] : []
  const playerMonthLabel = activePlayerDay?.key ? formatPlayerMonthLabel(activePlayerDay.key) : ""
  const playerCompactWeekRange = formatCompactWeekRange(weekDays)

  const resetDraft = () => {
    setDraft(createEmptyDraft(role))
    setEditingEntry(null)
    setIsCreateOpen(false)
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
    setIsCreateOpen(false)
    setEditingEntry(entry)
    setDraft(buildDraftFromEntry(entry, role, workouts))
  }

  const handleOpenCreate = () => {
    setEditingEntry(null)
    setDraft(createEmptyDraft(role))
    setIsCreateOpen((prev) => !prev)
  }

  const handlePlayerSkip = async (entry) => {
    const playerLinkId = entry?.current_user_link?.id
    if (!playerLinkId) return

    const confirmed = window.confirm(
      `Är du säker på att du vill hoppa över "${entry.title}"?`
    )

    if (!confirmed) return

    await onUpdateEntryStatus(playerLinkId, "skipped")
  }

  const handleOpenGroupEditor = (entry) => {
    if (!entry?.id) return

    if (groupEditorEntryId === entry.id) {
      setGroupEditorEntryId(null)
      setGroupDrafts([])
      return
    }

    setEditingEntry(null)
    setGroupEditorEntryId(entry.id)
    setGroupDrafts(buildGroupDraftFromEntry(entry))
  }

  const handleAddGroupDraft = () => {
    setGroupDrafts((prev) => [
      ...prev,
      {
        id: `group-${crypto.randomUUID()}`,
        name: `Grupp ${prev.length + 1}`,
        player_ids: [],
      },
    ])
  }

  const handleGroupNameChange = (groupId, value) => {
    setGroupDrafts((prev) =>
      prev.map((group) => (group.id === groupId ? { ...group, name: value } : group))
    )
  }

  const handleRemoveGroupDraft = (groupId) => {
    setGroupDrafts((prev) => prev.filter((group) => group.id !== groupId))
  }

  const handleAssignPlayerToGroup = (playerId, nextGroupId) => {
    setGroupDrafts((prev) =>
      prev.map((group) => {
        const filteredPlayerIds = group.player_ids.filter((id) => id !== playerId)

        if (group.id !== nextGroupId) {
          return {
            ...group,
            player_ids: filteredPlayerIds,
          }
        }

        return {
          ...group,
          player_ids: nextGroupId ? [...filteredPlayerIds, playerId] : filteredPlayerIds,
        }
      })
    )
  }

  const handleClearGroups = () => {
    setGroupDrafts([])
  }

  const handleSaveGroupEditor = async (entry) => {
    const result = await onSaveEntryGroups?.(entry, groupDrafts)
    if (result?.ok) {
      setGroupEditorEntryId(null)
      setGroupDrafts([])
    }
  }

  const renderActivityForm = () => (
    <div style={role === "player" ? playerFormCardStyle : formCardStyle}>
      <div style={role === "player" ? playerFormTitleRowStyle : formTitleRowStyle}>
        <div>
          <div style={role === "player" ? playerFormTitleStyle : formTitleStyle}>
            {editingEntry
              ? "Redigera aktivitet"
              : role === "coach"
              ? "Ny aktivitet"
              : "Lägg till aktivitet"}
          </div>
          <div style={role === "player" ? playerFormTextStyle : formTextStyle}>
            {editingEntry
              ? "Ändringarna gäller den här kalenderposten direkt."
              : role === "coach"
              ? "Lägg till en aktivitet för hela laget eller utvalda spelare."
              : "Lägg in en egen aktivitet direkt i veckan."}
          </div>
        </div>

        <button type="button" onClick={resetDraft} style={role === "player" ? playerGhostButtonStyle : ghostButtonStyle}>
          Stäng
        </button>
      </div>

      <div style={role === "player" ? playerFormGridStyle(isMobile) : formGridStyle(isMobile)}>
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
          <div style={{ ...editHintStyle, gridColumn: "1 / -1" }}>
            Den här redigeringen gäller bara den valda kalenderposten, inte hela serien.
          </div>
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

      <div style={formActionsStyle}>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmittingCreate || isSavingActivity}
          style={primaryButtonStyle}
        >
          {editingEntry
            ? isSavingActivity
              ? "Sparar..."
              : "Spara ändringar"
            : isSubmittingCreate
            ? "Sparar..."
            : "Spara aktivitet"}
        </button>
        <button type="button" onClick={resetDraft} style={secondaryButtonStyleCompact}>
          Avbryt
        </button>
      </div>
    </div>
  )

  if (role === "player") {
    const hasComposeView = isCreateOpen || Boolean(editingEntry)

    return (
      <div style={playerCalendarPageStyle}>
        {hasComposeView ? (
          <div style={playerCalendarComposeWrapStyle}>
            <button type="button" onClick={resetDraft} style={playerCalendarBackButtonStyle}>
              ← Tillbaka till veckan
            </button>
            <div style={playerCalendarComposeIntroStyle}>
              <div style={playerCalendarMonoLabelStyle}>{editingEntry ? "Redigera" : "Ny aktivitet"}</div>
              <div style={playerCalendarComposeTitleStyle}>
                {editingEntry ? "Ändra din aktivitet." : "Lägg in något i kalendern."}
              </div>
              <div style={playerCalendarComposeTextStyle}>
                Skapa en egen aktivitet direkt i veckan. Tränarplanerade pass ligger kvar som fasta planeringsobjekt.
              </div>
            </div>
            {renderActivityForm()}
          </div>
        ) : isLoading ? (
          <div style={playerCalendarLoadingStyle}>Laddar kalender...</div>
        ) : (
          <div style={playerCalendarShellStyle}>
            <div style={playerCalendarHeroStyle}>
              <div style={playerCalendarMockHeaderStyle(isMobile)}>
                <div>
                  <div style={playerCalendarMonoLabelStyle}>{playerMonthLabel}</div>
                  <div style={playerCalendarMockWeekTitleRowStyle(isMobile)}>
                    <div style={playerCalendarMockWeekNumberStyle}>v.{weekNumber}</div>
                    <div style={playerCalendarMockWeekRangeStyle}>{playerCompactWeekRange}</div>
                  </div>
                </div>
                <div style={playerCalendarMockNavStyle}>
                  <button type="button" onClick={onPreviousWeek} style={playerCalendarIconButtonStyle} aria-label="Föregående vecka">
                    ‹
                  </button>
                  <button type="button" onClick={onGoToToday} style={playerCalendarTodayButtonStyle}>
                    Idag
                  </button>
                  <button type="button" onClick={onNextWeek} style={playerCalendarIconButtonStyle} aria-label="Nästa vecka">
                    ›
                  </button>
                </div>
              </div>

              <div style={playerCalendarStripStyle}>
                {weekDays.map((day) => {
                  const dayEntries = entriesByDay[day.key] || []
                  const isSelected = day.key === activePlayerDayKey

                  return (
                    <button
                      key={day.key}
                      type="button"
                      onClick={() => setExpandedPlayerDayKey(day.key)}
                      style={playerCalendarStripDayButtonStyle(isSelected)}
                    >
                      <div style={playerCalendarStripDayLetterStyle(isSelected)}>{getPlayerDayLetter(day.key)}</div>
                      <div style={playerCalendarStripDayNumberStyle(isSelected)}>
                        {new Date(day.key).getDate()}
                      </div>
                      <div style={playerCalendarStripDotRowStyle}>
                        {dayEntries.length > 0
                          ? dayEntries.slice(0, 3).map((entry) => (
                              <span
                                key={`${day.key}-${entry.id}`}
                                style={playerCalendarStripDotStyle({
                                  isSelected,
                                  color: getPlayerDayActivityDotColor(entry, workouts),
                                  isEmpty: false,
                                })}
                              />
                            ))
                          : (
                            <span
                              style={playerCalendarStripDotStyle({
                                isSelected,
                                color: "#d8cbbb",
                                isEmpty: true,
                              })}
                            />
                          )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            <div style={playerCalendarDetailHeaderStyle(isMobile)}>
              <div>
                <div style={playerCalendarMonoLabelStyle}>
                  {activePlayerDay?.key
                    ? new Date(activePlayerDay.key).toLocaleDateString("sv-SE", { weekday: "long" })
                    : ""}
                </div>
                <div style={playerCalendarDetailDateStyle}>
                  {activePlayerDay?.key ? formatPlayerDateOnly(activePlayerDay.key) : "Ingen dag vald"}
                </div>
              </div>
              <div style={playerCalendarDetailCountStyle}>
                {activePlayerDayEntries.length} {activePlayerDayEntries.length === 1 ? "pass" : "pass"}
              </div>
            </div>

            {activePlayerDayEntries.length === 0 ? (
              <div style={playerCalendarEmptyPromptStyle}>
                <div style={playerCalendarEmptyPromptTitleStyle}>Tomt den här dagen.</div>
                <div style={playerCalendarEmptyPromptTextStyle}>
                  Lägg till en egen aktivitet om du vill planera något här.
                </div>
                <button type="button" onClick={handleOpenCreate} style={playerCalendarEmptyPromptButtonStyle}>
                  Lägg till aktivitet
                </button>
              </div>
            ) : (
              <div style={playerCalendarAgendaListStyle}>
                {activePlayerDayEntries.map((entry) => {
                  const matchedWorkout = entry.activity_kind === "template_workout" ? getMatchingWorkout(entry, workouts) : null
                  const themeKey = getPlayerEntryThemeKey(entry, matchedWorkout)
                  const typeLabel = getPlayerEntryTypeLabel(entry, matchedWorkout)
                  const badgeLabel = getPlayerEntryBadgeLabel(entry, matchedWorkout)
                  const badgeTheme = getPlayerEntryBadgeTheme(entry, matchedWorkout)
                  const isImportedHandball = entry?.is_external === true && entry?.activity_kind === "handball"
                  const canEditEntry = getCanEditEntry(entry, role)
                  const status = entry.current_user_link?.completion_status || "planned"
                  const statusTheme = STATUS_COLORS[status] || STATUS_COLORS.planned
                  const sourceLabel =
                    entry?.current_user_link?.assignment_source === "self" ? "Egen aktivitet" : "Coachplanerat"
                  const durationLabel = getEntryDurationMinutes(entry)

                  return (
                    <div key={entry.id} style={playerCalendarAgendaItemStyle}>
                      <button
                        type="button"
                        onClick={() => !isImportedHandball && onOpenEntry(entry)}
                        disabled={isImportedHandball}
                        style={playerCalendarAgendaCardButtonStyle(themeKey, isImportedHandball)}
                      >
                        <div style={{ ...playerCalendarAgendaBadgeStyle, ...badgeTheme }}>{badgeLabel}</div>
                        <div style={playerCalendarAgendaContentStyle}>
                          <div style={playerCalendarAgendaTitleStyle}>{entry.title}</div>
                          <div style={playerCalendarAgendaMetaStyle}>
                            {typeLabel}
                            {entry.location ? ` • ${entry.location}` : ""}
                          </div>
                        </div>
                        <div style={playerCalendarAgendaAsideStyle}>
                          {durationLabel ? (
                            <div style={playerCalendarAgendaDurationStyle}>{durationLabel}</div>
                          ) : null}
                          <div
                            style={{
                              ...playerCalendarAgendaStatusStyle,
                              backgroundColor: isImportedHandball ? "rgba(26, 24, 20, 0.08)" : statusTheme.background,
                              color: isImportedHandball ? "#6f6659" : statusTheme.color,
                            }}
                          >
                            {isImportedHandball ? "Handboll" : statusLabelMap[status] || "Planerad"}
                          </div>
                        </div>
                      </button>

                      <div style={playerCalendarAgendaFooterStyle}>
                        <div style={playerCalendarAgendaSourceStyle}>{isImportedHandball ? "Lagets kalender" : sourceLabel}</div>
                        {!isImportedHandball ? (
                          <div style={playerCalendarAgendaActionsStyle(isMobile)}>
                            <button type="button" onClick={() => onOpenEntry(entry)} style={playerCalendarMicroPrimaryButtonStyle}>
                              {entry.activity_kind === "template_workout" ? "Starta" : "Öppna"}
                            </button>

                            {entry.current_user_link && entry.current_user_link.completion_status === "skipped" ? (
                              <button
                                type="button"
                                onClick={() => onUpdateEntryStatus(entry.current_user_link.id, "planned")}
                                disabled={updatingEntryStatusId === entry.current_user_link.id}
                                style={playerCalendarMicroButtonStyle}
                              >
                                Återställ
                              </button>
                            ) : null}

                            {entry.current_user_link &&
                            entry.current_user_link.completion_status !== "completed" &&
                            entry.current_user_link.completion_status !== "skipped" ? (
                              <button
                                type="button"
                                onClick={() => handlePlayerSkip(entry)}
                                disabled={updatingEntryStatusId === entry.current_user_link.id}
                                style={playerCalendarMicroButtonStyle}
                              >
                                Hoppa över
                              </button>
                            ) : null}

                            {canEditEntry ? (
                              <button
                                type="button"
                                onClick={() => handleStartEdit(entry)}
                                style={playerCalendarMicroButtonStyle}
                              >
                                Redigera
                              </button>
                            ) : null}

                            {canEditEntry ? (
                              <button
                                type="button"
                                onClick={() => onCancelActivity(entry)}
                                disabled={isCancellingActivity}
                                style={playerCalendarMicroDangerButtonStyle}
                              >
                                Ta bort
                              </button>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <div style={playerCalendarBottomActionWrapStyle}>
              <button type="button" onClick={handleOpenCreate} style={playerCalendarBottomActionButtonStyle}>
                + Ny aktivitet
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  const hasCoachDetailView = isCreateOpen || Boolean(editingEntry) || isExternalCalendarPageOpen

  return (
    <div style={playerCalendarPageStyle}>
      <div style={playerCalendarHeroStyle}>
        <div style={playerCalendarHeroTopRowStyle(isMobile)}>
          <div>
            <div style={playerCalendarMonoLabelStyle}>Kalender</div>
            <div style={playerCalendarTitleStyle}>{isExternalCalendarPageOpen ? "Synka med kalender" : "Kalender"}</div>
          </div>
          {!hasCoachDetailView ? (
            <div style={coachCalendarActionStackStyle(isMobile)}>
              <button
                type="button"
                onClick={() => setIsExternalCalendarPageOpen(true)}
                style={playerCalendarSecondaryButtonStyle}
              >
                Synka med kalender
              </button>
            </div>
          ) : null}
        </div>

        {!isExternalCalendarPageOpen ? (
          <div style={playerCalendarToolbarStyle(isMobile)}>
            <div>
              <div style={playerCalendarWeekLabelStyle}>Veckovy</div>
              <div style={playerCalendarWeekRangeRowStyle}>
                <div style={playerCalendarWeekRangeStyle}>{weekRangeLabel}</div>
                <div style={playerCalendarWeekNumberStyle}>Vecka {weekNumber}</div>
              </div>
            </div>
            <div style={playerCalendarNavRowStyle(isMobile)}>
              <button type="button" onClick={onPreviousWeek} style={playerCalendarSecondaryButtonStyle}>
                Föregående
              </button>
              <button type="button" onClick={onGoToToday} style={playerCalendarSecondaryButtonStyle}>
                Idag
              </button>
              <button type="button" onClick={onNextWeek} style={playerCalendarSecondaryButtonStyle}>
                Nästa
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {isExternalCalendarPageOpen ? (
        <div style={playerCalendarComposeWrapStyle}>
          <button
            type="button"
            onClick={() => setIsExternalCalendarPageOpen(false)}
            style={playerCalendarBackButtonStyle}
          >
            ← Tillbaka till veckan
          </button>
          <div style={playerCalendarComposeIntroStyle}>
            <div style={playerCalendarMonoLabelStyle}>Kalendersynk</div>
            <div style={playerCalendarComposeTitleStyle}>Koppla laget.se</div>
            <div style={playerCalendarComposeTextStyle}>
              Klistra in lagets kalenderlänk och spara den här. Därefter kan du synka in kommande handbollspass till appen.
            </div>
          </div>

          <div style={externalCalendarAdminCardStyle}>
            <div style={externalCalendarAdminGridStyle(isMobile)}>
              <label style={fieldStyle}>
                <span style={fieldLabelStyle}>Kalenderlänk</span>
                <input
                  type="text"
                  value={externalCalendarFeedUrl}
                  onChange={(event) => onExternalCalendarFeedUrlChange(event.target.value)}
                  placeholder="webcal://cal.laget.se/dittlag.ics"
                  style={inputStyle}
                />
              </label>

              <label style={{ ...fieldStyle, justifyContent: "flex-end" }}>
                <span style={fieldLabelStyle}>Automatisk sync</span>
                <select
                  value={externalCalendarEnabled ? "enabled" : "disabled"}
                  onChange={(event) => onExternalCalendarEnabledChange(event.target.value === "enabled")}
                  style={inputStyle}
                >
                  <option value="enabled">Aktiv</option>
                  <option value="disabled">Avstängd</option>
                </select>
              </label>
            </div>

            <div style={externalCalendarAdminMetaStyle}>
              <span>Senast synkad: {externalCalendarLastSyncedLabel}</span>
              {externalCalendarSource?.last_sync_status ? (
                <span>Status: {externalCalendarSource.last_sync_status}</span>
              ) : null}
            </div>

            {externalCalendarSource?.last_sync_error ? (
              <div style={externalCalendarAdminErrorStyle}>{externalCalendarSource.last_sync_error}</div>
            ) : null}

            <div style={playerActionsWrapStyle}>
              <button
                type="button"
                onClick={onSaveExternalCalendarSource}
                disabled={isSavingExternalCalendarSource}
                style={{
                  ...playerCalendarSecondaryButtonStyle,
                  opacity: isSavingExternalCalendarSource ? 0.7 : 1,
                }}
              >
                {isSavingExternalCalendarSource ? "Sparar..." : "Spara kalender"}
              </button>
              <button
                type="button"
                onClick={onSyncExternalCalendar}
                disabled={!externalCalendarSource?.feed_url || isSyncingExternalCalendar}
                style={{
                  ...playerCalendarPrimaryButtonStyle,
                  opacity: !externalCalendarSource?.feed_url || isSyncingExternalCalendar ? 0.7 : 1,
                }}
              >
                {isSyncingExternalCalendar ? "Synkar..." : "Synka nu"}
              </button>
            </div>
          </div>
        </div>
      ) : isCreateOpen || editingEntry ? (
        <div style={playerCalendarComposeWrapStyle}>
          <button type="button" onClick={resetDraft} style={playerCalendarBackButtonStyle}>
            ← Tillbaka till veckan
          </button>
          <div style={playerCalendarComposeIntroStyle}>
            <div style={playerCalendarMonoLabelStyle}>{editingEntry ? "Redigera" : "Ny aktivitet"}</div>
            <div style={playerCalendarComposeTitleStyle}>
              {editingEntry ? "Ändra kalenderpost." : "Lägg in något i kalendern."}
            </div>
            <div style={playerCalendarComposeTextStyle}>
              Planera veckan för laget och håll alla aktiviteter samlade i samma flöde.
            </div>
          </div>
          {renderActivityForm()}
        </div>
      ) : isLoading ? (
        <div style={playerCalendarLoadingStyle}>Laddar kalender...</div>
      ) : (
        <div style={playerCalendarShellStyle}>
          <div style={playerCalendarHeroStyle}>
            <div style={playerCalendarMockHeaderStyle(isMobile)}>
              <div>
                <div style={playerCalendarMonoLabelStyle}>{playerMonthLabel}</div>
                <div style={playerCalendarMockWeekTitleRowStyle(isMobile)}>
                  <div style={playerCalendarMockWeekNumberStyle}>v.{weekNumber}</div>
                  <div style={playerCalendarMockWeekRangeStyle}>{playerCompactWeekRange}</div>
                </div>
              </div>
              <div style={playerCalendarMockNavStyle}>
                <button type="button" onClick={onPreviousWeek} style={playerCalendarIconButtonStyle} aria-label="Föregående vecka">
                  ‹
                </button>
                <button type="button" onClick={onGoToToday} style={playerCalendarTodayButtonStyle}>
                  Idag
                </button>
                <button type="button" onClick={onNextWeek} style={playerCalendarIconButtonStyle} aria-label="Nästa vecka">
                  ›
                </button>
              </div>
            </div>

            <div style={playerCalendarStripStyle}>
              {weekDays.map((day) => {
                const dayEntries = entriesByDay[day.key] || []
                const isSelected = day.key === activePlayerDayKey

                return (
                  <button
                    key={day.key}
                    type="button"
                    onClick={() => setExpandedPlayerDayKey(day.key)}
                    style={playerCalendarStripDayButtonStyle(isSelected)}
                  >
                    <div style={playerCalendarStripDayLetterStyle(isSelected)}>{getPlayerDayLetter(day.key)}</div>
                    <div style={playerCalendarStripDayNumberStyle(isSelected)}>{new Date(day.key).getDate()}</div>
                    <div style={playerCalendarStripDotRowStyle}>
                      {dayEntries.length > 0
                        ? dayEntries.slice(0, 3).map((entry) => (
                            <span
                              key={`${day.key}-${entry.id}`}
                              style={playerCalendarStripDotStyle({
                                isSelected,
                                color: getPlayerDayActivityDotColor(entry, workouts),
                                isEmpty: false,
                              })}
                            />
                          ))
                        : (
                          <span
                            style={playerCalendarStripDotStyle({
                              isSelected,
                              color: "#d8cbbb",
                              isEmpty: true,
                            })}
                          />
                        )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div style={playerCalendarDetailHeaderStyle(isMobile)}>
            <div>
              <div style={playerCalendarMonoLabelStyle}>
                {activePlayerDay?.key
                  ? new Date(activePlayerDay.key).toLocaleDateString("sv-SE", { weekday: "long" })
                  : ""}
              </div>
              <div style={playerCalendarDetailDateStyle}>
                {activePlayerDay?.key ? formatPlayerDateOnly(activePlayerDay.key) : "Ingen dag vald"}
              </div>
            </div>
            <div style={playerCalendarDetailCountStyle}>
              {activePlayerDayEntries.length} {activePlayerDayEntries.length === 1 ? "pass" : "pass"}
            </div>
          </div>

          {activePlayerDayEntries.length === 0 ? (
            <div style={playerCalendarEmptyPromptStyle}>
              <div style={playerCalendarEmptyPromptTitleStyle}>Tomt den här dagen.</div>
              <div style={playerCalendarEmptyPromptTextStyle}>
                Planera ett pass eller synka in kalenderhändelser för att fylla dagen.
              </div>
            </div>
          ) : (
            <div style={playerCalendarAgendaListStyle}>
              {activePlayerDayEntries.map((entry) => {
                const matchedWorkout = entry.activity_kind === "template_workout" ? getMatchingWorkout(entry, workouts) : null
                const typeLabel = getPlayerEntryTypeLabel(entry, matchedWorkout)
                const badgeLabel = getPlayerEntryBadgeLabel(entry, matchedWorkout)
                const badgeTheme = getPlayerEntryBadgeTheme(entry, matchedWorkout)
                const status = entry.current_user_link?.completion_status || "planned"
                const statusTheme = STATUS_COLORS[status] || STATUS_COLORS.planned
                const isEditingThisEntry = editingEntry?.id === entry.id
                const isImportedHandball = entry?.is_external === true && entry?.activity_kind === "handball"
                const themeKey = getPlayerEntryThemeKey(entry, matchedWorkout)
                const durationLabel = getEntryDurationMinutes(entry)
                const coachSummaryText = isImportedHandball
                  ? `${entry.player_links.length} spelare • importerat från laget.se`
                  : `${entry.player_links.length} spelare${
                      entry.summary.completed > 0 ? ` • ${entry.summary.completed} klara` : ""
                    }${entry.summary.skipped > 0 ? ` • ${entry.summary.skipped} hoppade över` : ""}${
                      entry.groups?.length > 0 ? ` • ${entry.groups.length} grupper` : ""
                    }`

                return (
                  <div key={entry.id} style={playerCalendarAgendaItemStyle}>
                    <article style={coachCalendarAgendaCardStyle}>
                      <div style={playerCalendarAgendaCardButtonStyle(themeKey, true)}>
                        <div style={{ ...playerCalendarAgendaBadgeStyle, ...badgeTheme }}>{badgeLabel}</div>
                        <div style={playerCalendarAgendaContentStyle}>
                          <div style={playerCalendarAgendaTitleStyle}>{entry.title}</div>
                          <div style={playerCalendarAgendaMetaStyle}>
                            {typeLabel}
                            {entry.location ? ` • ${entry.location}` : ""}
                          </div>
                          {entry.description ? (
                            <div style={coachCalendarAgendaDescriptionStyle}>{entry.description}</div>
                          ) : null}
                        </div>
                        <div style={playerCalendarAgendaAsideStyle}>
                          {durationLabel ? (
                            <div style={playerCalendarAgendaDurationStyle}>{durationLabel}</div>
                          ) : null}
                          <div
                            style={{
                              ...playerCalendarAgendaStatusStyle,
                              backgroundColor: isImportedHandball ? "#f3f4f6" : statusTheme.background,
                              color: isImportedHandball ? "#6b7280" : statusTheme.color,
                            }}
                          >
                            {isImportedHandball ? "Handboll" : statusLabelMap[status] || "Planerad"}
                          </div>
                        </div>
                      </div>

                      <div style={playerCalendarAgendaFooterStyle}>
                        <div style={coachMetaTextStyle}>{coachSummaryText}</div>
                        {entry.player_links.length > 0 ? (
                          <div style={playerChipWrapStyle}>
                            {entry.player_links.slice(0, isMobile ? 4 : 3).map((link) => (
                              <span key={link.id} style={playerChipStyle}>
                                {link.player_name}
                              </span>
                            ))}
                            {entry.player_links.length > (isMobile ? 4 : 3) ? (
                              <span style={playerChipMutedStyle}>
                                +{entry.player_links.length - (isMobile ? 4 : 3)}
                              </span>
                            ) : null}
                          </div>
                        ) : null}

                        {!isImportedHandball ? (
                          <div style={coachCalendarCardActionsStyle(isMobile)}>
                            <button type="button" onClick={() => handleStartEdit(entry)} style={playerCalendarMicroButtonStyle}>
                              {isEditingThisEntry ? "Redigerar" : "Redigera"}
                            </button>
                            <button
                              type="button"
                              onClick={() => onCancelActivity(entry)}
                              disabled={isCancellingActivity}
                              style={playerCalendarMicroDangerButtonStyle}
                            >
                              Ställ in
                            </button>
                            {isSharedTemplateEntry(entry, workouts) ? (
                              <button
                                type="button"
                                onClick={() => handleOpenGroupEditor(entry)}
                                style={playerCalendarMicroButtonStyle}
                              >
                                {groupEditorEntryId === entry.id ? "Stäng grupper" : "Hantera grupper"}
                              </button>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </article>

                    {groupEditorEntryId === entry.id ? (
                      <div style={inlineComposerStyle}>
                        <div style={groupEditorCardStyle}>
                          <div style={groupEditorHeaderStyle}>
                            <div>
                              <div style={formTitleStyle}>Grupper för detta pass</div>
                              <div style={groupEditorHintStyle}>
                                Gäller bara den här planerade aktiviteten. Om inga grupper sparas visas ingen
                                gruppinfo för spelarna.
                              </div>
                            </div>
                            <button type="button" onClick={handleClearGroups} style={ghostButtonStyle}>
                              Rensa
                            </button>
                          </div>

                          {groupDrafts.length === 0 ? (
                            <div style={groupEditorEmptyStyle}>
                              Inga grupper skapade ännu. Lägg till minst en grupp om spelarna ska se gruppindelning
                              för det här passet.
                            </div>
                          ) : (
                            <div style={groupListStyle}>
                              {groupDrafts.map((group, index) => (
                                <div key={group.id} style={groupCardStyle}>
                                  <div style={groupCardHeaderStyle}>
                                    <label style={{ ...fieldStyle, margin: 0, flex: 1 }}>
                                      <span style={fieldLabelStyle}>Gruppnamn</span>
                                      <input
                                        type="text"
                                        value={group.name}
                                        onChange={(event) => handleGroupNameChange(group.id, event.target.value)}
                                        style={inputStyle}
                                        placeholder={`Grupp ${index + 1}`}
                                      />
                                    </label>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveGroupDraft(group.id)}
                                      style={dangerButtonCompactStyle}
                                    >
                                      Ta bort
                                    </button>
                                  </div>
                                  <div style={groupSizeTextStyle}>{group.player_ids.length} spelare</div>
                                </div>
                              ))}
                            </div>
                          )}

                          <div style={groupAssignmentsWrapStyle}>
                            <div style={fieldLabelStyle}>Tilldelning per spelare</div>
                            <div style={groupAssignmentListStyle}>
                              {(entry.player_links || []).map((link) => {
                                const assignedGroupId =
                                  groupDrafts.find((group) => group.player_ids.includes(link.player_id))?.id || ""

                                return (
                                  <div key={link.id} style={groupAssignmentRowStyle(isMobile)}>
                                    <div style={groupAssignmentPlayerNameStyle}>{link.player_name}</div>
                                    <select
                                      value={assignedGroupId}
                                      onChange={(event) => handleAssignPlayerToGroup(link.player_id, event.target.value)}
                                      style={inputStyle}
                                    >
                                      <option value="">Ingen grupp</option>
                                      {groupDrafts.map((group) => (
                                        <option key={`${link.id}-${group.id}`} value={group.id}>
                                          {group.name || "Namnlös grupp"}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                )
                              })}
                            </div>
                          </div>

                          <div style={formActionsStyle}>
                            <button type="button" onClick={handleAddGroupDraft} style={secondaryButtonStyleCompact}>
                              Ny grupp
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveGroupEditor(entry)}
                              disabled={isSavingGroups}
                              style={primaryButtonCompactStyle}
                            >
                              {isSavingGroups ? "Sparar..." : "Spara grupper"}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          )}

          <div style={playerCalendarBottomActionWrapStyle}>
            <button type="button" onClick={handleOpenCreate} style={playerCalendarBottomActionButtonStyle}>
              + Ny aktivitet
            </button>
          </div>
        </div>
      )}
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
  marginTop: "8px",
  marginBottom: 0,
  fontFamily: '"Manrope", sans-serif',
  fontSize: "clamp(38px, 10vw, 60px)",
  lineHeight: 0.92,
  fontWeight: 700,
  letterSpacing: "-0.04em",
  color: "#1a1814",
}

const managementPageEyebrowStyle = {
  fontFamily: '"IBM Plex Mono", "SFMono-Regular", Consolas, monospace',
  fontSize: "11px",
  fontWeight: 700,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "#6f6659",
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

const weekColumnStyle = {
  display: "grid",
  gap: "12px",
}

const composerWrapStyle = {
  marginBottom: "14px",
}

const inlineComposerStyle = {
  marginTop: "8px",
}

const weekGridStyle = (isMobile) => ({
  display: "grid",
  gridTemplateColumns: isMobile ? "1fr" : "repeat(7, minmax(0, 1fr))",
  gap: "10px",
  alignItems: "start",
})

const dayCardStyle = {
  padding: "14px",
  borderRadius: "22px",
  border: "1px solid rgba(26, 24, 20, 0.12)",
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.82) 0%, rgba(243,239,230,0.74) 100%)",
  boxShadow: "0 14px 30px rgba(26, 24, 20, 0.06)",
  minHeight: "100%",
}

const dayHeaderStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "10px",
  marginBottom: "10px",
}

const dayTitleStyle = {
  fontSize: "15px",
  fontWeight: 800,
  color: "#1a1814",
}

const dayCountStyle = {
  minWidth: "28px",
  height: "28px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "999px",
  backgroundColor: "rgba(26, 24, 20, 0.08)",
  color: "#6f6659",
  fontSize: "11px",
  fontWeight: 800,
}

const emptyStateStyle = {
  padding: "24px",
  borderRadius: "22px",
  border: "1px dashed rgba(26, 24, 20, 0.18)",
  color: "#6f6659",
  backgroundColor: "rgba(255, 255, 255, 0.42)",
}

const dayEmptyStyle = {
  padding: "6px 2px 2px",
  color: "#8a8173",
  fontSize: "13px",
}

const eventStackStyle = {
  display: "grid",
  gap: "8px",
}

const eventWrapStyle = {
  display: "grid",
  gap: "8px",
}

const eventCardStyle = {
  padding: "12px",
  borderRadius: "18px",
  backgroundColor: "rgba(255, 255, 255, 0.4)",
  border: "1px solid rgba(26, 24, 20, 0.12)",
}

const eventTopRowStyle = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "12px",
}

const eventTitleStyle = {
  fontSize: "13px",
  fontWeight: 800,
  color: "#1a1814",
}

const eventMetaStyle = {
  marginTop: "3px",
  fontSize: "12px",
  color: "#6f6659",
}

const eventDescriptionStyle = {
  marginTop: "8px",
  fontSize: "12px",
  lineHeight: 1.45,
  color: "#534b40",
}

const statusBadgeStyle = {
  padding: "5px 8px",
  borderRadius: "999px",
  fontSize: "11px",
  fontWeight: 800,
  whiteSpace: "nowrap",
}

const coachMetaWrapStyle = {
  marginTop: "12px",
}

const coachMetaTextStyle = {
  fontSize: "12px",
  color: "#6f6659",
}

const playerChipWrapStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: "5px",
  marginTop: "8px",
}

const playerChipStyle = {
  padding: "4px 8px",
  borderRadius: "999px",
  backgroundColor: "rgba(26, 24, 20, 0.08)",
  color: "#3f382f",
  fontSize: "11px",
  fontWeight: 700,
}

const playerChipMutedStyle = {
  padding: "4px 8px",
  borderRadius: "999px",
  backgroundColor: "rgba(217, 74, 31, 0.1)",
  color: "#991b1b",
  fontSize: "11px",
  fontWeight: 800,
}

const playerActionsWrapStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: "6px",
  marginTop: "10px",
}

const formCardStyle = {
  padding: "0 0 18px",
  borderRadius: 0,
  border: "none",
  borderBottom: `1px solid ${redesignLineSoft}`,
  background: "transparent",
  boxShadow: "none",
}

const formTitleRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  alignItems: "flex-start",
}

const formTitleStyle = {
  ...sectionTitleStyleToken,
  fontSize: "clamp(24px, 6vw, 34px)",
}

const formTextStyle = {
  marginTop: "6px",
  ...bodyTextStyleToken,
  color: "#6f6659",
}

const formGridStyle = (isMobile) => ({
  display: "grid",
  gap: "12px",
  marginTop: "16px",
  gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
})

const fieldStyle = {
  display: "grid",
  gap: "6px",
}

const fieldLabelStyle = {
  ...fieldLabelStyleToken,
}

const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: "16px",
  border: `1px solid ${redesignLineSoft}`,
  backgroundColor: redesignSurfaceSoft,
  color: "#1a1814",
  fontSize: "15px",
  fontFamily: '"Manrope", sans-serif',
  boxSizing: "border-box",
}

const toggleStyle = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  fontSize: "14px",
  color: "#3f382f",
  fontWeight: 700,
}

const editHintStyle = {
  padding: "12px 14px",
  borderRadius: "14px",
  backgroundColor: "rgba(217, 74, 31, 0.08)",
  border: "1px solid rgba(217, 74, 31, 0.14)",
  color: "#9a3412",
  fontSize: "13px",
  lineHeight: 1.5,
}

const playerSelectionStyle = {
  display: "grid",
  gap: "8px",
  maxHeight: "180px",
  overflowY: "auto",
  padding: "10px",
  borderRadius: "16px",
  border: "1px solid rgba(26, 24, 20, 0.12)",
  backgroundColor: "rgba(255, 255, 255, 0.42)",
}

const playerCheckboxStyle = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  fontSize: "14px",
  color: "#3f382f",
}

const primaryButtonStyle = {
  border: "none",
  borderRadius: "16px",
  padding: "12px 16px",
  background: "linear-gradient(135deg, #d94a1f 0%, #b93617 100%)",
  color: "#ffffff",
  fontSize: "15px",
  fontWeight: 800,
  fontFamily: '"Manrope", sans-serif',
  cursor: "pointer",
  boxShadow: "0 14px 26px rgba(217, 74, 31, 0.18)",
}

const primaryButtonCompactStyle = {
  ...primaryButtonStyle,
  padding: "9px 12px",
  borderRadius: "12px",
  fontSize: "12px",
}

const secondaryButtonStyle = {
  border: "1px solid rgba(26, 24, 20, 0.12)",
  borderRadius: "16px",
  padding: "12px 14px",
  backgroundColor: "rgba(255, 255, 255, 0.4)",
  color: "#1a1814",
  fontSize: "15px",
  fontWeight: 700,
  fontFamily: '"Manrope", sans-serif',
  cursor: "pointer",
}

const secondaryButtonStyleCompact = {
  ...secondaryButtonStyle,
  padding: "9px 12px",
  borderRadius: "12px",
  fontSize: "12px",
}

const dangerButtonStyle = {
  border: "1px solid rgba(185, 28, 28, 0.16)",
  borderRadius: "16px",
  padding: "12px 14px",
  backgroundColor: "rgba(185, 28, 28, 0.06)",
  color: "#b91c1c",
  fontSize: "15px",
  fontWeight: 700,
  fontFamily: '"Manrope", sans-serif',
  cursor: "pointer",
}

const dangerButtonCompactStyle = {
  ...dangerButtonStyle,
  padding: "9px 12px",
  borderRadius: "12px",
  fontSize: "12px",
}

const ghostButtonStyle = {
  border: "none",
  backgroundColor: "transparent",
  color: "#6f6659",
  fontSize: "13px",
  fontWeight: 800,
  fontFamily: '"Manrope", sans-serif',
  cursor: "pointer",
  padding: "2px 0",
}

const formActionsStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
  marginTop: "16px",
}

const externalCalendarAdminCardStyle = {
  marginBottom: "16px",
  padding: "18px",
  borderRadius: "24px",
  border: "1px solid rgba(26, 24, 20, 0.12)",
  background:
    "radial-gradient(circle at top left, rgba(217, 74, 31, 0.07), transparent 28%), linear-gradient(180deg, rgba(255,255,255,0.72), rgba(243,239,230,0.82))",
  boxShadow: "0 18px 34px rgba(26, 24, 20, 0.08)",
}

const externalCalendarAdminHeaderStyle = (isMobile) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: isMobile ? "stretch" : "flex-start",
  flexDirection: isMobile ? "column" : "row",
  gap: "12px",
  marginBottom: "14px",
})

const externalCalendarAdminGridStyle = (isMobile) => ({
  display: "grid",
  gap: "12px",
  gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1.7fr) minmax(220px, 0.7fr)",
})

const externalCalendarSyncIntroStyle = {
  display: "grid",
  gap: "6px",
  marginBottom: "16px",
}

const externalCalendarAdminMetaStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: "10px",
  marginTop: "12px",
  fontSize: "13px",
  color: "#5b6475",
  fontWeight: 700,
}

const externalCalendarAdminErrorStyle = {
  marginTop: "12px",
  padding: "10px 12px",
  borderRadius: "12px",
  backgroundColor: "#fff1f2",
  border: "1px solid #fecdd3",
  color: "#9f1239",
  fontSize: "13px",
  fontWeight: 700,
}

const playerCalendarPageStyle = {
  display: "grid",
  gap: "16px",
}

const playerCalendarHeroStyle = {
  display: "grid",
  gap: "14px",
}

const playerCalendarHeroTopRowStyle = (isMobile) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: isMobile ? "stretch" : "flex-start",
  flexDirection: isMobile ? "column" : "row",
  gap: "16px",
})

const playerCalendarMonoLabelStyle = {
  fontFamily: '"IBM Plex Mono", "SFMono-Regular", Consolas, monospace',
  fontSize: "11px",
  fontWeight: 700,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "#6f6659",
}

const playerCalendarTitleStyle = {
  marginTop: "8px",
  fontFamily: '"Manrope", sans-serif',
  fontSize: "clamp(38px, 10vw, 60px)",
  lineHeight: 0.92,
  fontWeight: 700,
  letterSpacing: "-0.04em",
  color: "#1a1814",
}

const playerCalendarToolbarStyle = (isMobile) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: isMobile ? "stretch" : "center",
  flexDirection: isMobile ? "column" : "row",
  gap: "12px",
})

const coachCalendarActionStackStyle = (isMobile) => ({
  display: "grid",
  gap: "8px",
  width: isMobile ? "100%" : "auto",
})

const playerCalendarWeekLabelStyle = {
  fontSize: "12px",
  fontWeight: 800,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "#7c6f63",
}

const playerCalendarWeekRangeStyle = {
  marginTop: "4px",
  fontSize: "22px",
  fontWeight: 900,
  color: "#1f2937",
}

const playerCalendarWeekRangeRowStyle = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  flexWrap: "wrap",
}

const playerCalendarWeekNumberStyle = {
  padding: "5px 10px",
  borderRadius: "999px",
  backgroundColor: "#fff4ea",
  color: "#9a3412",
  fontSize: "12px",
  fontWeight: 800,
}

const playerCalendarNavRowStyle = (isMobile) => ({
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  width: isMobile ? "100%" : "auto",
})

const playerCalendarComposeWrapStyle = {
  display: "grid",
  gap: "16px",
}

const playerCalendarBackButtonStyle = {
  border: "none",
  backgroundColor: "transparent",
  color: "#1f2937",
  fontSize: "14px",
  fontWeight: 800,
  cursor: "pointer",
  padding: 0,
  justifySelf: "start",
}

const playerCalendarComposeIntroStyle = {
  display: "grid",
  gap: "8px",
}

const playerCalendarComposeTitleStyle = {
  fontSize: "34px",
  lineHeight: 1,
  fontWeight: 900,
  color: "#1c1917",
}

const playerCalendarComposeTextStyle = {
  maxWidth: "640px",
  fontSize: "15px",
  lineHeight: 1.6,
  color: "#5b6475",
}

const playerCalendarLoadingStyle = {
  padding: "32px 24px",
  borderRadius: "24px",
  border: "1px solid rgba(164, 106, 60, 0.14)",
  backgroundColor: "#fffdfa",
  color: "#6b7280",
  fontSize: "15px",
}

const playerCalendarShellStyle = {
  display: "grid",
  gap: "18px",
  paddingBottom: "118px",
}

const playerCalendarMockHeaderStyle = (isMobile) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: isMobile ? "stretch" : "flex-start",
  flexDirection: isMobile ? "column" : "row",
  gap: "16px",
})

const playerCalendarMockWeekTitleRowStyle = (isMobile) => ({
  display: "flex",
  alignItems: "baseline",
  gap: "12px",
  flexWrap: "wrap",
  marginTop: "10px",
  flexDirection: isMobile ? "column" : "row",
})

const playerCalendarMockWeekNumberStyle = {
  fontFamily: '"Manrope", sans-serif',
  fontSize: "clamp(42px, 12vw, 64px)",
  lineHeight: 0.9,
  fontWeight: 700,
  letterSpacing: "-0.05em",
  color: "#1a1814",
}

const playerCalendarMockWeekRangeStyle = {
  fontSize: "30px",
  lineHeight: 1,
  fontWeight: 500,
  color: "#8a8173",
}

const playerCalendarMockNavStyle = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
}

const playerCalendarIconButtonStyle = {
  width: "46px",
  height: "46px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "14px",
  border: "1px solid rgba(164, 106, 60, 0.18)",
  backgroundColor: "#fffdfa",
  color: "#1f2937",
  fontSize: "24px",
  lineHeight: 1,
  cursor: "pointer",
  boxShadow: "0 6px 16px rgba(15, 23, 42, 0.04)",
}

const playerCalendarTodayButtonStyle = {
  border: "1px solid rgba(164, 106, 60, 0.18)",
  borderRadius: "14px",
  padding: "0 18px",
  height: "46px",
  backgroundColor: "#fffdfa",
  color: "#1a1814",
  fontSize: "15px",
  fontWeight: 700,
  fontFamily: '"Manrope", sans-serif',
  cursor: "pointer",
  boxShadow: "0 6px 16px rgba(15, 23, 42, 0.04)",
}

const playerCalendarStripStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
  gap: "10px",
}

const playerCalendarStripDayButtonStyle = (isSelected) => ({
  display: "grid",
  justifyItems: "center",
  gap: "6px",
  padding: isSelected ? "12px 6px 10px" : "8px 4px 8px",
  border: isSelected ? "none" : "1px solid transparent",
  borderRadius: "16px",
  backgroundColor: isSelected ? "#1a1814" : "transparent",
  color: isSelected ? "#fffaf5" : "#1a1814",
  cursor: "pointer",
  minHeight: "98px",
})

const playerCalendarStripDayLetterStyle = (isSelected) => ({
  fontSize: "11px",
  fontWeight: 700,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: isSelected ? "rgba(255, 250, 245, 0.76)" : "#8a8173",
})

const playerCalendarStripDayNumberStyle = (isSelected) => ({
  fontFamily: '"Manrope", sans-serif',
  fontSize: "24px",
  lineHeight: 1,
  fontWeight: isSelected ? 700 : 500,
  color: isSelected ? "#fffaf5" : "#1a1814",
})

const playerCalendarStripDotRowStyle = {
  minHeight: "10px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "5px",
}

const playerCalendarStripDotStyle = ({ isSelected, color, isEmpty }) => ({
  width: "8px",
  height: "8px",
  borderRadius: "999px",
  backgroundColor: isEmpty ? "transparent" : color,
  border: isEmpty
    ? `1px solid ${isSelected ? "rgba(255, 250, 245, 0.48)" : "#d8cbbb"}`
    : `1px solid ${isSelected ? "#1a1814" : color}`,
})

const playerCalendarDetailHeaderStyle = (isMobile) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: isMobile ? "flex-start" : "flex-end",
  flexDirection: isMobile ? "column" : "row",
  gap: "10px",
})

const playerCalendarDetailDateStyle = {
  marginTop: "6px",
  fontFamily: '"Manrope", sans-serif',
  fontSize: "clamp(34px, 9vw, 50px)",
  lineHeight: 0.95,
  fontWeight: 700,
  letterSpacing: "-0.05em",
  color: "#1a1814",
  textTransform: "capitalize",
}

const playerCalendarDetailCountStyle = {
  fontFamily: '"IBM Plex Mono", "SFMono-Regular", Consolas, monospace',
  fontSize: "13px",
  fontWeight: 700,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "#8a8173",
}

const playerCalendarAgendaListStyle = {
  display: "grid",
  gap: "14px",
}

const playerCalendarAgendaItemStyle = {
  display: "grid",
  gap: "8px",
}

const playerCalendarAgendaCardButtonStyle = (themeKey = "strength", isDisabled) => {
  const theme = getPlayerTrainingTheme(themeKey)

  return {
    width: "100%",
    display: "grid",
    gridTemplateColumns: "64px minmax(0, 1fr) auto",
    alignItems: "center",
    gap: "14px",
    padding: "16px 18px",
    borderRadius: "16px",
    border: `1px solid ${theme.softBorder}`,
    background: theme.softBackground,
    color: theme.softText,
    textAlign: "left",
    cursor: isDisabled ? "default" : "pointer",
    boxShadow: theme.softShadow,
    opacity: isDisabled ? 0.92 : 1,
  }
}

const playerCalendarAgendaBadgeStyle = {
  width: "58px",
  height: "58px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "18px",
  fontSize: "12px",
  fontWeight: 900,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
}

const playerCalendarAgendaContentStyle = {
  minWidth: 0,
}

const playerCalendarAgendaTitleStyle = {
  fontSize: "17px",
  lineHeight: 1.08,
  fontWeight: 900,
  color: "#1c1917",
}

const playerCalendarAgendaMetaStyle = {
  marginTop: "6px",
  fontSize: "14px",
  lineHeight: 1.4,
  color: "#5b6475",
}

const playerCalendarAgendaAsideStyle = {
  display: "grid",
  justifyItems: "end",
  gap: "10px",
}

const playerCalendarAgendaDurationStyle = {
  fontFamily: '"IBM Plex Mono", "SFMono-Regular", Consolas, monospace',
  fontSize: "13px",
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "#8a8173",
}

const playerCalendarAgendaStatusStyle = {
  padding: "6px 10px",
  borderRadius: "999px",
  fontSize: "11px",
  fontWeight: 800,
  whiteSpace: "nowrap",
}

const playerCalendarAgendaFooterStyle = {
  display: "grid",
  gap: "8px",
  padding: "0 6px",
}

const playerCalendarAgendaSourceStyle = {
  fontSize: "12px",
  fontWeight: 700,
  color: "#8a8173",
}

const coachCalendarAgendaCardStyle = {
  display: "grid",
  gap: "8px",
}

const coachCalendarAgendaDescriptionStyle = {
  marginTop: "8px",
  fontSize: "13px",
  lineHeight: 1.5,
  color: "#5b6475",
}

const playerCalendarAgendaActionsStyle = (isMobile) => ({
  display: "flex",
  flexWrap: "wrap",
  gap: "6px",
  flexDirection: isMobile ? "row" : "row",
})

const coachCalendarCardActionsStyle = (isMobile) => ({
  display: "flex",
  flexWrap: "wrap",
  gap: "6px",
  flexDirection: isMobile ? "row" : "row",
})

const coachCalendarDetailActionsStyle = (isMobile) => ({
  display: "grid",
  gap: "10px",
  justifyItems: isMobile ? "start" : "end",
})

const coachCalendarInlineActionsStyle = (isMobile) => ({
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  justifyContent: isMobile ? "flex-start" : "flex-end",
})

const playerCalendarMicroPrimaryButtonStyle = {
  border: "none",
  borderRadius: "14px",
  padding: "8px 12px",
  backgroundColor: "#d94a1f",
  color: "#fffdf8",
  fontSize: "12px",
  fontWeight: 800,
  cursor: "pointer",
}

const playerCalendarMicroButtonStyle = {
  border: "1px solid rgba(164, 106, 60, 0.18)",
  borderRadius: "14px",
  padding: "8px 12px",
  backgroundColor: "#ffffff",
  color: "#1f2937",
  fontSize: "12px",
  fontWeight: 700,
  cursor: "pointer",
}

const playerCalendarMicroDangerButtonStyle = {
  border: "1px solid #f3c6c6",
  borderRadius: "14px",
  padding: "8px 12px",
  backgroundColor: "#fff5f5",
  color: "#b91c1c",
  fontSize: "12px",
  fontWeight: 700,
  cursor: "pointer",
}

const coachCalendarGhostActionStyle = {
  border: "1px solid rgba(164, 106, 60, 0.18)",
  borderRadius: "999px",
  padding: "10px 14px",
  backgroundColor: "#fffdfa",
  color: "#1a1814",
  fontSize: "13px",
  fontWeight: 800,
  cursor: "pointer",
}

const playerCalendarEmptyPromptStyle = {
  padding: "24px",
  borderRadius: "28px",
  border: "1px solid rgba(164, 106, 60, 0.14)",
  background: "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(248,242,234,0.88) 100%)",
  boxShadow: "0 12px 24px rgba(15, 23, 42, 0.04)",
}

const playerCalendarEmptyPromptTitleStyle = {
  fontSize: "22px",
  lineHeight: 1,
  fontWeight: 900,
  color: "#1c1917",
}

const playerCalendarEmptyPromptTextStyle = {
  marginTop: "8px",
  maxWidth: "420px",
  fontSize: "14px",
  lineHeight: 1.6,
  color: "#5b6475",
}

const playerCalendarEmptyPromptButtonStyle = {
  marginTop: "18px",
  border: "1px solid rgba(164, 106, 60, 0.18)",
  borderRadius: "14px",
  padding: "10px 14px",
  backgroundColor: "#fffdfa",
  color: "#1a1814",
  fontSize: "13px",
  fontWeight: 800,
  cursor: "pointer",
}

const coachCalendarEmptyActionsStyle = (isMobile) => ({
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  flexDirection: isMobile ? "column" : "row",
  alignItems: isMobile ? "stretch" : "center",
  marginTop: "18px",
})

const playerCalendarBottomActionWrapStyle = {
  position: "sticky",
  bottom: "12px",
  paddingTop: "8px",
}

const playerCalendarBottomActionButtonStyle = {
  width: "100%",
  border: "none",
  borderRadius: "16px",
  padding: "18px 20px",
  background: "linear-gradient(135deg, #e5541f 0%, #cf4318 100%)",
  color: "#fffdf8",
  fontSize: "18px",
  fontWeight: 800,
  fontFamily: '"Manrope", sans-serif',
  cursor: "pointer",
  boxShadow: "0 18px 36px rgba(217, 74, 31, 0.26)",
}

const playerCalendarWeekListStyle = {
  display: "grid",
  gap: "12px",
}

const playerCalendarDaySectionStyle = {
  display: "grid",
  gap: "8px",
  padding: "11px 13px",
  borderRadius: "16px",
  backgroundColor: "#fffdfa",
  border: "1px solid rgba(164, 106, 60, 0.14)",
  boxShadow: "0 6px 14px rgba(15, 23, 42, 0.035)",
}

const playerCalendarDayHeaderButtonStyle = {
  width: "100%",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  padding: 0,
  border: "none",
  background: "transparent",
  textAlign: "left",
  cursor: "pointer",
}

const playerCalendarDayHeaderStyle = {
  display: "grid",
  gap: "2px",
  minWidth: 0,
}

const playerCalendarDayHeaderMetaStyle = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  flex: "0 0 auto",
}

const playerCalendarDayKickerStyle = {
  fontSize: "10px",
  fontWeight: 800,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "#8b7e73",
}

const playerCalendarDayTitleStyle = {
  marginTop: "1px",
  fontSize: "16px",
  fontWeight: 900,
  color: "#1f2937",
  textTransform: "capitalize",
}

const playerCalendarDayCountStyle = {
  minWidth: "30px",
  height: "30px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "999px",
  backgroundColor: "#fff0e5",
  color: "#b45309",
  fontSize: "12px",
  fontWeight: 900,
}

const playerCalendarDayChevronStyle = (isExpanded) => ({
  color: "#8b7e73",
  fontSize: "16px",
  fontWeight: 900,
  lineHeight: 1,
  transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
  transition: "transform 160ms ease",
})

const playerCalendarEmptyDayStyle = {
  display: "none",
}

const playerCalendarEntryListStyle = {
  display: "grid",
  gap: "8px",
}

const playerCalendarEntryCardStyle = {
  padding: "12px",
  borderRadius: "14px",
  border: "1px solid rgba(164, 106, 60, 0.14)",
  boxShadow: "0 6px 16px rgba(15, 23, 42, 0.03)",
}

const playerCalendarEntryTopRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  alignItems: "center",
  flexWrap: "wrap",
}

const playerCalendarEntrySourceWrapStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
}

const playerCalendarSourceDotStyle = (isOwnedByPlayer) => ({
  width: "10px",
  height: "10px",
  borderRadius: "999px",
  backgroundColor: isOwnedByPlayer ? "#d97706" : "#b91c1c",
})

const playerCalendarEntrySourceStyle = {
  fontSize: "11px",
  fontWeight: 800,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "#7c6f63",
}

const playerCalendarStatusStyle = {
  padding: "6px 10px",
  borderRadius: "999px",
  fontSize: "11px",
  fontWeight: 800,
  whiteSpace: "nowrap",
}

const playerCalendarEntryTitleStyle = {
  marginTop: "7px",
  fontSize: "16px",
  fontWeight: 900,
  lineHeight: 1.08,
  color: "#1c1917",
}

const playerCalendarEntryMetaStyle = {
  marginTop: "6px",
  fontSize: "12px",
  fontWeight: 700,
  color: "#5b6475",
}

const playerCalendarEntryDescriptionStyle = {
  marginTop: "8px",
  fontSize: "12px",
  lineHeight: 1.45,
  color: "#4b5563",
}

const playerCalendarEntryActionRowStyle = (isMobile) => ({
  display: "flex",
  gap: "6px",
  flexWrap: "wrap",
  marginTop: "10px",
  flexDirection: isMobile ? "column" : "row",
})

const playerCalendarPrimaryButtonStyle = {
  border: "none",
  borderRadius: "14px",
  padding: "10px 14px",
  backgroundColor: "#d94a1f",
  color: "#fffdf8",
  fontSize: "13px",
  fontWeight: 800,
  cursor: "pointer",
  boxShadow: "0 8px 18px rgba(217, 74, 31, 0.18)",
}

const playerCalendarSecondaryButtonStyle = {
  border: "1px solid rgba(164, 106, 60, 0.18)",
  borderRadius: "14px",
  padding: "10px 14px",
  backgroundColor: "#ffffff",
  color: "#1f2937",
  fontSize: "13px",
  fontWeight: 800,
  cursor: "pointer",
}

const playerCalendarDangerButtonStyle = {
  border: "1px solid #f3c6c6",
  borderRadius: "14px",
  padding: "10px 14px",
  backgroundColor: "#fff5f5",
  color: "#b91c1c",
  fontSize: "13px",
  fontWeight: 800,
  cursor: "pointer",
}

const playerFormCardStyle = {
  padding: "22px",
  borderRadius: "28px",
  border: "1px solid rgba(164, 106, 60, 0.14)",
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(248,242,234,0.96) 100%)",
  boxShadow: "0 18px 34px rgba(15, 23, 42, 0.06)",
}

const playerFormTitleRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  alignItems: "flex-start",
}

const playerFormTitleStyle = {
  fontSize: "28px",
  lineHeight: 1,
  fontWeight: 900,
  color: "#1c1917",
}

const playerFormTextStyle = {
  marginTop: "8px",
  fontSize: "15px",
  lineHeight: 1.65,
  color: "#5b6475",
  maxWidth: "580px",
}

const playerFormGridStyle = (isMobile) => ({
  display: "grid",
  gap: "14px",
  marginTop: "18px",
  gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
})

const playerGhostButtonStyle = {
  border: "none",
  backgroundColor: "transparent",
  color: "#7c6f63",
  fontSize: "13px",
  fontWeight: 800,
  cursor: "pointer",
  padding: "2px 0",
}

const groupEditorCardStyle = {
  padding: "16px",
  borderRadius: "18px",
  border: "1px solid #ece5e5",
  backgroundColor: "#fffefe",
}

const groupEditorHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "12px",
}

const groupEditorHintStyle = {
  marginTop: "6px",
  fontSize: "13px",
  lineHeight: 1.55,
  color: "#6b7280",
}

const groupEditorEmptyStyle = {
  marginTop: "14px",
  padding: "12px 14px",
  borderRadius: "14px",
  border: "1px dashed #d7dee7",
  backgroundColor: "#fcfcfd",
  color: "#6b7280",
  fontSize: "13px",
  lineHeight: 1.5,
}

const groupListStyle = {
  display: "grid",
  gap: "10px",
  marginTop: "14px",
}

const groupCardStyle = {
  padding: "12px",
  borderRadius: "14px",
  border: "1px solid #ece5e5",
  backgroundColor: "#fffdfd",
}

const groupCardHeaderStyle = {
  display: "flex",
  gap: "10px",
  alignItems: "flex-end",
}

const groupSizeTextStyle = {
  marginTop: "8px",
  fontSize: "12px",
  fontWeight: 700,
  color: "#6b7280",
}

const groupAssignmentsWrapStyle = {
  marginTop: "16px",
}

const groupAssignmentListStyle = {
  display: "grid",
  gap: "10px",
  marginTop: "8px",
}

const groupAssignmentRowStyle = (isMobile) => ({
  display: "grid",
  gap: "10px",
  alignItems: "center",
  gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1fr) minmax(220px, 280px)",
})

const groupAssignmentPlayerNameStyle = {
  fontSize: "14px",
  fontWeight: 700,
  color: "#111827",
}

export default CalendarPage
