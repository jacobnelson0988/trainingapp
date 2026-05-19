import { useState, useEffect, useMemo, useRef } from "react"
import { supabase } from "./supabase"
import ExerciseBankPage from "./pages/ExerciseBankPage"
import PlayersPage from "./pages/PlayersPage"
import CreateUserPage from "./pages/CreateUserPage"
import CoachHomePage from "./pages/CoachHomePage"
import PassBuilderPage from "./pages/PassBuilderPage"
import UsersAdminPage from "./pages/UsersAdminPage"
import TeamsPage from "./pages/TeamsPage"
import AdminHomePage from "./pages/AdminHomePage"
import CalendarPage from "./pages/CalendarPage"
import MessagesPage from "./pages/MessagesPage"
import FeedbackPage from "./pages/FeedbackPage"
import GdprPage from "./pages/GdprPage"
import StatsPage from "./pages/StatsPage"
import ActiveRunningWorkout from "./player/workout/ActiveRunningWorkout"
import { playIntervalSignal } from "./app/device/intervalDevice"
import IntervalProgramEditor from "./running/IntervalProgramEditor"
import {
  createIntervalProgramDraft,
  formatSecondsAsClock,
  getIntervalProgramSummary,
  getRunningProgramFromTemplate,
  intervalProgramToLegacyFields,
  legacyRunningConfigToProgramDraft,
  normalizeIntervalProgramDraft,
  parseDurationToSeconds,
  storedProgramToDraft,
} from "./running/intervalPrograms"
import {
  bodyTextStyleToken,
  compactBodyTextStyleToken,
  fieldLabelStyleToken,
  flatSectionStyleToken,
  inputTextStyleToken,
  itemTitleStyleToken,
  mutedBodyTextStyleToken,
  pageEyebrowStyleToken,
  pageTitleStyleToken,
  redesignInk,
  redesignLine,
  redesignLineSoft,
  redesignMuted,
  redesignPaper,
  redesignSurface,
  redesignSurfaceSoft,
  sectionTitleStyleToken,
  subtleInsetStyleToken,
} from "./ui/redesignTokens"
import {
  getCategoryAccent,
  getPlayerTrainingTheme,
  resolvePlayerTrainingThemeKey,
} from "./ui/playerTrainingThemes"
import {
  getExerciseProtocolConfig,
  getExerciseProtocolStep,
  isProtocolExercise,
} from "./utils/exerciseProtocols"

const PASS_ASSIGNMENT_EXERCISE_NAME = "__PASS_ASSIGNMENT__"
const ACTIVE_TIMED_SET_COUNTDOWN_SECONDS = 3
const ACTIVE_TIMED_SET_DEFAULT_SIDE_SWITCH_SECONDS = 10

const normalizeExerciseSearchValue = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[åä]/g, "a")
    .replace(/ö/g, "o")
    .replace(/[\s\-_]+/g, "")
    .replace(/[^a-z0-9]/g, "")

const normalizeCalendarMatchValue = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[åä]/g, "a")
    .replace(/ö/g, "o")
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9 ]/g, "")

const normalizeLagetSeFeedInput = (value) => {
  const raw = String(value || "").trim()

  if (!raw) return ""

  if (/^webcal:\/\//i.test(raw)) {
    return raw.replace(/^webcal:\/\//i, "https://")
  }

  if (/^https?:\/\/cal\.laget\.se\/.+\.ics(?:\?.*)?$/i.test(raw)) {
    return raw
  }

  if (/^https?:\/\/(?:www\.)?laget\.se\/[^/]+/i.test(raw)) {
    try {
      const url = new URL(raw)
      const slug = url.pathname.split("/").filter(Boolean)[0]

      if (slug) {
        return `https://cal.laget.se/${slug}.ics`
      }
    } catch {
      return raw
    }
  }

  if (/^[a-z0-9_-]+$/i.test(raw)) {
    return `https://cal.laget.se/${raw}.ics`
  }

  return raw
}

const parseExerciseAliases = (value) => {
  const seen = new Set()

  return String(value || "")
    .split(/[\n,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .filter((entry) => {
      const key = entry.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

const getExerciseDisplayName = (exercise) =>
  exercise?.display_name || exercise?.displayName || exercise?.name || ""

const normalizeExerciseText = (value) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim()

const getExerciseTextSections = ({ description, guide }) => {
  const trimmedDescription = String(description || "").trim()
  const trimmedGuide = String(guide || "").trim()
  const normalizedDescription = normalizeExerciseText(trimmedDescription)
  const normalizedGuide = normalizeExerciseText(trimmedGuide)

  if (trimmedDescription && trimmedGuide && normalizedDescription === normalizedGuide) {
    return {
      primaryLabel: "Beskrivning",
      primaryText: trimmedDescription,
      secondaryLabel: "",
      secondaryText: "",
    }
  }

  if (trimmedDescription && trimmedGuide) {
    return {
      primaryLabel: "Beskrivning",
      primaryText: trimmedDescription,
      secondaryLabel: "Så gör du",
      secondaryText: trimmedGuide,
    }
  }

  if (trimmedDescription) {
    return {
      primaryLabel: "Beskrivning",
      primaryText: trimmedDescription,
      secondaryLabel: "",
      secondaryText: "",
    }
  }

  if (trimmedGuide) {
    return {
      primaryLabel: "Så gör du",
      primaryText: trimmedGuide,
      secondaryLabel: "",
      secondaryText: "",
    }
  }

  return {
    primaryLabel: "",
    primaryText: "",
    secondaryLabel: "",
    secondaryText: "",
  }
}

const parseHrgAlias = (alias) => {
  const match = String(alias || "")
    .trim()
    .match(/^(Axelkontroll|Knäkontroll)\s+([1-6])([A-E])$/i)

  if (!match) return null

  const program = match[1][0].toUpperCase() + match[1].slice(1).toLowerCase()
  const blockNumber = Number(match[2])
  const letter = match[3].toUpperCase()

  return {
    program,
    blockNumber,
    letter,
    position: `${blockNumber}${letter}`,
  }
}

const getExerciseHrgEntries = (exercise) => {
  const parsed = (Array.isArray(exercise?.aliases) ? exercise.aliases : [])
    .map((alias) => parseHrgAlias(alias))
    .filter(Boolean)

  const seen = new Set()
  return parsed.filter((entry) => {
    const key = `${entry.program}:${entry.position}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const buildHrgProgramBlocks = (exercises, programName) => {
  const blockMap = new Map()

  ;(exercises || []).forEach((exercise) => {
    getExerciseHrgEntries(exercise)
      .filter((entry) => entry.program === programName)
      .forEach((entry) => {
        const currentBlock = blockMap.get(entry.blockNumber) || {
          blockNumber: entry.blockNumber,
          positions: {},
        }

        if (!currentBlock.positions[entry.letter]) {
          currentBlock.positions[entry.letter] = exercise
        }

        blockMap.set(entry.blockNumber, currentBlock)
      })
  })

  return Array.from(blockMap.values())
    .sort((a, b) => a.blockNumber - b.blockNumber)
    .map((block) => {
      const baseExercise = block.positions.A || null
      const alternativeExercises = ["B", "C", "D", "E"]
        .map((letter) => block.positions[letter])
        .filter(Boolean)
        .filter(
          (exercise, index, list) =>
            list.findIndex((candidate) => String(candidate.id) === String(exercise.id)) === index
        )

      return {
        blockNumber: block.blockNumber,
        baseExercise,
        alternativeExercises,
      }
    })
    .filter((block) => block.baseExercise)
}

const parseLoggedNumber = (value) => {
  const normalized = String(value ?? "")
    .trim()
    .replace(",", ".")
  const parsed = Number.parseFloat(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

const normalizeExerciseExecutionSide = (value) => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")

  if (["single_leg", "enbens", "ett_ben", "per_ben", "unilateral_leg"].includes(normalized)) {
    return "single_leg"
  }

  if (["single_arm", "enhands", "enhand", "en_arm", "ett_arm", "per_arm", "per_hand", "unilateral_arm"].includes(normalized)) {
    return "single_arm"
  }

  return "standard"
}

const getExerciseMeasurementLabel = (exerciseType) =>
  exerciseType === "seconds_only" ? "Sekunder" : "Reps"

const getExercisePerSideSuffix = (executionSide, exerciseType = "reps_only") => {
  if (executionSide === "single_leg") {
    return exerciseType === "seconds_only" ? "per ben" : "per ben"
  }

  if (executionSide === "single_arm") {
    return exerciseType === "seconds_only" ? "per hand" : "per hand"
  }

  return ""
}

const getExerciseMeasurementPlaceholder = (exerciseType, executionSide) => {
  const baseLabel = getExerciseMeasurementLabel(exerciseType)
  const suffix = getExercisePerSideSuffix(executionSide, exerciseType)
  return suffix ? `${baseLabel} ${suffix}` : baseLabel
}

const getExerciseExecutionSideHint = (executionSide, exerciseType = "reps_only") => {
  const unitLabel = exerciseType === "seconds_only" ? "sekunder" : "reps"

  if (executionSide === "single_leg") {
    return `Värdet gäller per ben. Skriver du 10 betyder det 10 ${unitLabel} vänster + 10 ${unitLabel} höger.`
  }

  if (executionSide === "single_arm") {
    return `Värdet gäller per hand. Skriver du 10 betyder det 10 ${unitLabel} vänster + 10 ${unitLabel} höger.`
  }

  return ""
}

const buildProtocolInputRows = (exercise, workoutSessionId, exerciseIndex) => {
  const protocolConfig = getExerciseProtocolConfig(exercise)
  if (!protocolConfig) return []

  return protocolConfig.steps.map((step, stepIndex) => ({
    weight: "",
    reps: "",
    seconds: "",
    client_set_id: `protocol-${exerciseIndex}-${stepIndex}-${Date.now()}`,
    workout_session_id: workoutSessionId,
    protocolStepLabel: step.label,
    protocolTargetValue: step.targetValue,
    protocolTargetUnit: step.targetUnit,
    protocolIntensityPercent: step.intensityPercent,
    protocolCompleted: false,
  }))
}

const getTodayDateInputValue = () => new Date().toISOString().slice(0, 10)

const formatStopwatchTime = (elapsedMs) => {
  const totalSeconds = Math.max(0, Math.floor(Number(elapsedMs || 0) / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

const formatCalendarTime = (value) => {
  if (!value) return ""

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""

  return date.toLocaleTimeString("sv-SE", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

const formatTodayLabel = () =>
  new Date().toLocaleDateString("sv-SE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })

const getDateInputValueFromTimestamp = (value) => {
  if (!value) return getTodayDateInputValue()

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return getTodayDateInputValue()

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

const getWeekStartDateInputValue = (value = new Date()) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return getTodayDateInputValue()
  }

  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + diff)
  return getDateInputValueFromTimestamp(date)
}

const combineDateWithExistingTime = (dateValue, existingTimestamp) => {
  if (!dateValue) return null

  const sourceDate = existingTimestamp ? new Date(existingTimestamp) : new Date()
  const nextDate = new Date(dateValue)

  if (Number.isNaN(nextDate.getTime())) return null

  sourceDate.setFullYear(nextDate.getUTCFullYear(), nextDate.getUTCMonth(), nextDate.getUTCDate())
  return sourceDate.toISOString()
}

const FREE_ACTIVITY_OPTIONS = [
  { value: "running", label: "Löpning" },
  { value: "football", label: "Fotboll" },
  { value: "orienteering", label: "Orientering" },
  { value: "swimming", label: "Simning" },
  { value: "racket_sport", label: "Racketsport" },
  { value: "handball", label: "Handboll" },
  { value: "custom", label: "Egen aktivitet" },
]

const getFreeActivityLabel = (activityType) =>
  FREE_ACTIVITY_OPTIONS.find((option) => option.value === activityType)?.label || "Egen aktivitet"

const buildRunningProgramSummary = (session) => {
  const programSummary = getIntervalProgramSummary(
    session?.running_interval_execution || session?.running_interval_program || session?.interval_program
  )
  if (programSummary && programSummary !== "Inga intervallblock") return programSummary

  const legacyFields = intervalProgramToLegacyFields(
    session?.running_interval_execution || session?.running_interval_program || session?.interval_program
  )
  const intervalsCount = legacyFields.intervals_count
    ? `${legacyFields.intervals_count} intervaller`
    : session?.intervals_count
    ? `${session.intervals_count} intervaller`
    : null
  const intervalTime = legacyFields.interval_time || session?.interval_time || null
  return [intervalsCount, intervalTime ? `${intervalTime}/intervall` : null].filter(Boolean).join(" • ") || "Intervaller"
}

const buildRunningSummary = (session) => {
  if (!session) return ""

  const freeActivityType = session.free_activity_type || "running"

  if (freeActivityType !== "running") {
    return session.running_time || "Aktivitet loggad"
  }

  if (session.running_type === "intervals") {
    return buildRunningProgramSummary(session)
  }

  const distance = session.running_distance != null && session.running_distance !== ""
    ? `${session.running_distance} km`
    : null
  const runningTime = session.running_time || null
  const averagePulse = session.average_pulse ? `${session.average_pulse} bpm` : null

  return [distance, runningTime, averagePulse].filter(Boolean).join(" • ") || "Distans"
}

const getWorkoutKindLabel = (workoutKind) => {
  if (workoutKind === "running") return "Löppass"
  if (workoutKind === "prehab") return "Skadeförebyggande"
  return "Gympass"
}

const getGymPassTypeLabel = (gymPassType) => (gymPassType === "shared" ? "Gemensamt gympass" : "Individuellt gympass")

const PLAYER_HOME_THEME_PRIORITY = ["strength", "running", "prehab", "other"]

const getPreferredPlayerHomeThemeKey = (themeKeys = []) => {
  const uniqueThemeKeys = Array.from(new Set((themeKeys || []).filter(Boolean)))
  return PLAYER_HOME_THEME_PRIORITY.find((themeKey) => uniqueThemeKeys.includes(themeKey)) || uniqueThemeKeys[0] || null
}

const getPlayerCalendarEntryThemeKey = (entry, matchedWorkout = null) =>
  resolvePlayerTrainingThemeKey({
    workoutKind: matchedWorkout?.workoutKind,
    activityKind: entry?.activity_kind,
    freeActivityType: entry?.free_activity_type,
  })

const getCompletedSessionThemeKey = (session) => {
  if (session?.workout_kind === "running" && session?.running_origin === "free") {
    return session?.free_activity_type === "running" ? "running" : "other"
  }

  return resolvePlayerTrainingThemeKey({
    workoutKind: session?.workout_kind,
    freeActivityType: session?.free_activity_type,
  })
}

const getPlayerCalendarEntryTypeLabel = (entry, matchedWorkout = null) => {
  if (!entry) return "Aktivitet"

  if (entry.is_external && entry.activity_kind === "handball") return "Handboll"

  if (entry.activity_kind === "template_workout") {
    if (matchedWorkout?.workoutKind === "running") return "Löppass"
    if (matchedWorkout?.workoutKind === "prehab") return "Skadeförebyggande"
    if (matchedWorkout?.workoutKind === "gym" && matchedWorkout?.gymPassType === "shared") {
      return "Gemensamt gympass"
    }
    if (matchedWorkout?.workoutKind === "gym") return "Gympass"
    return "Pass"
  }

  if (entry.activity_kind === "free_activity") {
    return getFreeActivityLabel(entry.free_activity_type)
  }

  if (entry.activity_kind === "custom") return "Egen aktivitet"
  if (entry.activity_kind === "handball") return "Handboll"
  return "Aktivitet"
}

const getCalendarEntryDurationLabel = (entry) => {
  const start = new Date(entry?.starts_at).getTime()
  const end = new Date(entry?.ends_at).getTime()

  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return ""

  return `${Math.max(1, Math.round((end - start) / 60000))} min`
}

const getPlayerHomeWeekDayLetter = (dateKey) => {
  const date = new Date(`${dateKey}T00:00:00`)
  if (Number.isNaN(date.getTime())) return ""

  return date
    .toLocaleDateString("sv-SE", { weekday: "short" })
    .replace(".", "")
    .slice(0, 1)
    .toUpperCase()
}

const isSharedGymWorkout = (workout) =>
  workout?.workoutKind === "gym" && workout?.gymPassType === "shared"

const summarizeHistoryRowsByExercise = (rows) => {
  const grouped = new Map()

  ;(rows || []).forEach((row) => {
    const sessionId =
      row.workout_session_id ||
      `${String(row.created_at || "").slice(0, 19)}:${row.exercise || ""}:${row.pass_name || ""}`
    const exerciseName = String(row.exercise || "").trim()

    if (!exerciseName || row.workout_kind === "running" || row.set_type === "warmup") return

    const key = `${exerciseName}__${sessionId}`
    if (!grouped.has(key)) {
      grouped.set(key, {
        exercise_name: exerciseName,
        pass_name: row.pass_name || null,
        created_at: row.created_at,
        set_count: 0,
        top_weight: null,
        top_reps: null,
        top_seconds: null,
        comment: row.exercise_comment || row.pass_comment || "",
      })
    }

    const entry = grouped.get(key)
    entry.set_count += 1

    const weightValue = parseLoggedNumber(row.weight)
    if (weightValue != null && (entry.top_weight == null || weightValue > entry.top_weight)) {
      entry.top_weight = weightValue
      entry.top_reps = row.reps || entry.top_reps
    }

    if (entry.top_reps == null && row.reps) {
      entry.top_reps = row.reps
    }

    if (entry.top_seconds == null && row.seconds) {
      entry.top_seconds = row.seconds
    }

    if (!entry.comment && (row.exercise_comment || row.pass_comment)) {
      entry.comment = row.exercise_comment || row.pass_comment || ""
    }
  })

  const byExercise = {}

  Array.from(grouped.values()).forEach((entry) => {
    if (!byExercise[entry.exercise_name]) {
      byExercise[entry.exercise_name] = []
    }
    byExercise[entry.exercise_name].push(entry)
  })

  return Object.entries(byExercise)
    .map(([exerciseName, entries]) => ({
      exercise_name: exerciseName,
      entries: entries
        .slice()
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    }))
    .sort((a, b) => {
      const aDate = new Date(a.entries[0]?.created_at || 0).getTime()
      const bDate = new Date(b.entries[0]?.created_at || 0).getTime()
      return bDate - aDate
    })
}

const buildExerciseGoalPrefill = (historyEntry) => ({
  target_sets: historyEntry?.set_count ?? "",
  target_reps:
    historyEntry?.top_reps != null && Number.isFinite(Number(historyEntry.top_reps))
      ? Number(historyEntry.top_reps)
      : "",
  comment: historyEntry?.comment || "",
})

const REP_RANGE_BUCKETS = [
  { key: "1_3", label: "1-3", min: 1, max: 3 },
  { key: "4_5", label: "4-5", min: 4, max: 5 },
  { key: "6_10", label: "6-10", min: 6, max: 10 },
  { key: "11_15", label: "11-15", min: 11, max: 15 },
  { key: "16_20", label: "16-20", min: 16, max: 20 },
]

const createEmptyRepRangeWeights = () =>
  REP_RANGE_BUCKETS.reduce((acc, bucket) => {
    acc[bucket.key] = ""
    return acc
  }, {})

const normalizeRepRangeWeights = (weights) => ({
  ...createEmptyRepRangeWeights(),
  ...Object.entries(weights || {}).reduce((acc, [key, value]) => {
    acc[key] = value == null ? "" : String(value)
    return acc
  }, {}),
})

const getRepRangeBucketForReps = (repsValue) => {
  const reps = Number(repsValue)
  if (!Number.isFinite(reps) || reps <= 0) return null

  return (
    REP_RANGE_BUCKETS.find((bucket) => reps >= bucket.min && reps <= bucket.max) ||
    (reps < REP_RANGE_BUCKETS[0].min
      ? REP_RANGE_BUCKETS[0]
      : REP_RANGE_BUCKETS[REP_RANGE_BUCKETS.length - 1])
  )
}

const parseRepTargetRangeBounds = (target) => {
  if (!target) return null

  if (target.target_reps_min != null || target.target_reps_max != null) {
    return {
      min: target.target_reps_min != null ? Number(target.target_reps_min) : null,
      max: target.target_reps_max != null ? Number(target.target_reps_max) : null,
    }
  }

  if (target.target_reps != null && Number.isFinite(Number(target.target_reps))) {
    const value = Number(target.target_reps)
    return { min: value, max: value }
  }

  const rawText = String(target.target_reps_text || "").trim()
  const rangeMatch = rawText.replace(/\s+/g, "").match(/^(\d+)-(\d+)$/)
  if (rangeMatch) {
    return {
      min: Number(rangeMatch[1]),
      max: Number(rangeMatch[2]),
    }
  }

  if (rawText && Number.isFinite(Number(rawText))) {
    const value = Number(rawText)
    return { min: value, max: value }
  }

  return null
}

const getRepRangeBucketForTarget = (target) => {
  if (!target || target.target_reps_mode === "max") return null

  const bounds = parseRepTargetRangeBounds(target)
  if (!bounds) return null

  const representativeValue =
    bounds.max != null
      ? bounds.max
      : bounds.min != null
      ? bounds.min
      : null

  return representativeValue != null ? getRepRangeBucketForReps(representativeValue) : null
}

const buildRepRangeWeightsByExercise = (rows) =>
  (rows || []).reduce((acc, row) => {
    if (!row.exercise_id || !row.rep_range_key) return acc

    if (!acc[row.exercise_id]) {
      acc[row.exercise_id] = createEmptyRepRangeWeights()
    }

    acc[row.exercise_id][row.rep_range_key] =
      row.target_weight == null ? "" : String(row.target_weight)

    return acc
  }, {})

const getResolvedExerciseTargetWeight = ({
  exerciseId,
  repTarget,
  repTargetsByExercise,
}) => {
  const bucket = getRepRangeBucketForTarget(repTarget)
  const bucketWeight = bucket ? repTargetsByExercise?.[exerciseId]?.[bucket.key] : null

  if (bucketWeight !== undefined && bucketWeight !== null && bucketWeight !== "") {
    const numericValue = Number(bucketWeight)
    return Number.isFinite(numericValue) ? numericValue : bucketWeight
  }

  return null
}

const getRepRangeLabelByKey = (repRangeKey) =>
  REP_RANGE_BUCKETS.find((bucket) => bucket.key === repRangeKey)?.label || repRangeKey || "-"

const formatLoggedPassName = (passName, options = {}) => {
  const { workoutKind = "gym", runningOrigin = null, freeActivityType = "running" } = options

  const raw = String(passName || "").trim()
  if (workoutKind === "running" && runningOrigin !== "assigned") {
    if (raw) {
      const withoutTechnicalSuffix = raw.replace(/_[a-f0-9]{8}$/i, "")
      return withoutTechnicalSuffix.replace(/_/g, " ")
    }

    return getFreeActivityLabel(freeActivityType)
  }

  if (!raw) return "Pass"

  const withoutTechnicalSuffix = raw.replace(/_[a-f0-9]{8}$/i, "")
  return withoutTechnicalSuffix.replace(/_/g, " ")
}

const parseRepTargetInput = (value, mode = "fixed") => {
  const rawValue = String(value ?? "").trim()

  if (mode === "max") {
    return {
      target_reps: null,
      target_reps_min: null,
      target_reps_max: null,
      target_reps_text: null,
      target_reps_mode: "max",
    }
  }

  if (!rawValue) {
    return {
      target_reps: null,
      target_reps_min: null,
      target_reps_max: null,
      target_reps_text: null,
      target_reps_mode: "fixed",
    }
  }

  const normalized = rawValue.replace(/\s+/g, "")
  const rangeMatch = normalized.match(/^(\d+)-(\d+)$/)

  if (rangeMatch) {
    const minValue = Number(rangeMatch[1])
    const maxValue = Number(rangeMatch[2])

    if (Number.isFinite(minValue) && Number.isFinite(maxValue) && minValue <= maxValue) {
      return {
        target_reps: null,
        target_reps_min: minValue,
        target_reps_max: maxValue,
        target_reps_text: `${minValue}-${maxValue}`,
        target_reps_mode: "fixed",
      }
    }
  }

  const numericValue = Number(rawValue)

  if (Number.isFinite(numericValue)) {
    return {
      target_reps: numericValue,
      target_reps_min: null,
      target_reps_max: null,
      target_reps_text: null,
      target_reps_mode: "fixed",
    }
  }

  return {
    target_reps: null,
    target_reps_min: null,
    target_reps_max: null,
    target_reps_text: rawValue,
    target_reps_mode: "fixed",
  }
}

const buildExistingPassExerciseRepPayload = (row) => ({
  target_reps: row?.target_reps ?? null,
  target_reps_min: row?.target_reps_min ?? null,
  target_reps_max: row?.target_reps_max ?? null,
  target_reps_text: row?.target_reps_text ?? null,
  target_reps_mode: row?.target_reps_mode || "fixed",
})

const getRepTargetInputValue = (target) => {
  if (!target) return ""
  if (target.target_reps_mode === "max") return ""
  if (target.target_reps_text) return target.target_reps_text
  if (target.target_reps_min != null && target.target_reps_max != null) {
    return `${target.target_reps_min}-${target.target_reps_max}`
  }
  if (target.target_reps != null) return String(target.target_reps)
  return ""
}

const buildPassExerciseUpdateFromDraft = (row, draft = {}) => {
  if (!row) return null

  const hasGuideChange = draft.guide !== undefined
  const hasTargetSetsChange = draft.targetSets !== undefined
  const hasRepChange = draft.targetReps !== undefined || draft.targetRepsMode !== undefined

  if (!hasGuideChange && !hasTargetSetsChange && !hasRepChange) {
    return null
  }

  const nextGuide = hasGuideChange ? draft.guide?.trim() || "" : row.custom_guide || ""
  const repTargetPayload = hasRepChange
    ? parseRepTargetInput(draft.targetReps, draft.targetRepsMode)
    : buildExistingPassExerciseRepPayload(row)

  return {
    id: row.id,
    custom_guide: nextGuide || null,
    target_sets: hasTargetSetsChange
      ? draft.targetSets === ""
        ? null
        : Number(draft.targetSets)
      : row.target_sets,
    ...repTargetPayload,
  }
}

const mergePassExerciseRowWithDraft = (row, draft = {}) => {
  const update = buildPassExerciseUpdateFromDraft(row, draft)
  if (!update) return row

  return {
    ...row,
    custom_guide: update.custom_guide,
    target_sets: update.target_sets,
    target_reps: update.target_reps,
    target_reps_min: update.target_reps_min,
    target_reps_max: update.target_reps_max,
    target_reps_text: update.target_reps_text,
    target_reps_mode: update.target_reps_mode,
  }
}

const formatRepTargetValue = (target) => {
  if (!target) return "-"
  if (target.target_reps_mode === "max") return "max"
  if (target.target_reps_text) return target.target_reps_text
  if (target.target_reps_min != null && target.target_reps_max != null) {
    return `${target.target_reps_min}-${target.target_reps_max}`
  }
  if (target.target_reps != null) return String(target.target_reps)
  return "-"
}

const buildDefaultPassExerciseTarget = (exercise) => ({
  target_sets: exercise?.targetSets ?? null,
  target_reps: exercise?.targetReps ?? null,
  target_reps_min: exercise?.targetRepsMin ?? null,
  target_reps_max: exercise?.targetRepsMax ?? null,
  target_reps_text: exercise?.targetRepsText || null,
  target_reps_mode: exercise?.targetRepsMode || exercise?.defaultRepsMode || "fixed",
  target_comment: null,
})

const mergeExerciseTargetWithPassDefaults = (exercise, overrideTarget) => {
  const defaultTarget = buildDefaultPassExerciseTarget(exercise)
  if (!overrideTarget) return defaultTarget

  return {
    ...defaultTarget,
    ...overrideTarget,
    target_sets: overrideTarget.target_sets ?? defaultTarget.target_sets,
    target_reps: overrideTarget.target_reps ?? defaultTarget.target_reps,
    target_reps_min: overrideTarget.target_reps_min ?? defaultTarget.target_reps_min,
    target_reps_max: overrideTarget.target_reps_max ?? defaultTarget.target_reps_max,
    target_reps_text: overrideTarget.target_reps_text ?? defaultTarget.target_reps_text,
    target_reps_mode: overrideTarget.target_reps_mode || defaultTarget.target_reps_mode,
    target_comment: overrideTarget.target_comment ?? defaultTarget.target_comment,
  }
}

const buildPlayerExerciseProgress = (rows, exercises) =>
  summarizeHistoryRowsByExercise(rows || [])
    .map((exerciseHistory) => {
      const matchedExercise = findExerciseByLoggedName(exercises, exerciseHistory.exercise_name)
      const entriesAscending = exerciseHistory.entries
        .slice()
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

      const weightEntries = entriesAscending.filter((entry) => entry.top_weight != null)
      const repEntries = entriesAscending.filter((entry) => entry.top_reps != null)
      const latestEntry = exerciseHistory.entries[0] || null
      const bestWeightEntry =
        weightEntries.reduce((bestEntry, currentEntry) => {
          if (!bestEntry) return currentEntry
          return currentEntry.top_weight > bestEntry.top_weight ? currentEntry : bestEntry
        }, null) || null
      const bestRepEntry =
        repEntries.reduce((bestEntry, currentEntry) => {
          if (!bestEntry) return currentEntry
          return Number(currentEntry.top_reps || 0) > Number(bestEntry.top_reps || 0) ? currentEntry : bestEntry
        }, null) || null
      const exerciseType = matchedExercise?.exercise_type || "reps_only"
      const defaultRepsMode = matchedExercise?.default_reps_mode || matchedExercise?.defaultRepsMode || "fixed"
      const isRelevantForPlayerStats =
        exerciseType !== "seconds_only" &&
        (weightEntries.length > 0 || (defaultRepsMode === "max" && repEntries.length > 0))

      return {
        exercise_id: matchedExercise?.id || exerciseHistory.exercise_name,
        exercise_name: exerciseHistory.exercise_name,
        exercise_display_name: matchedExercise ? getExerciseDisplayName(matchedExercise) : exerciseHistory.exercise_name,
        exercise_type: exerciseType,
        default_reps_mode: defaultRepsMode,
        latest_entry: latestEntry,
        best_weight_entry: bestWeightEntry,
        best_rep_entry: bestRepEntry,
        entry_count: exerciseHistory.entries.length,
        has_weight_data: weightEntries.length > 0,
        has_rep_data: repEntries.length > 0,
        is_relevant_for_player_stats: isRelevantForPlayerStats,
        weight_entries: weightEntries.map((entry) => ({
          created_at: entry.created_at,
          top_weight: entry.top_weight,
          top_reps: entry.top_reps,
          pass_name: entry.pass_name || null,
          workout_kind: entry.workout_kind || null,
        })),
        rep_entries: repEntries.map((entry) => ({
          created_at: entry.created_at,
          top_weight: entry.top_weight,
          top_reps: entry.top_reps,
          pass_name: entry.pass_name || null,
          workout_kind: entry.workout_kind || null,
        })),
      }
    })
    .filter((entry) => entry.entry_count > 0)
    .sort((a, b) => {
      const aDate = new Date(a.latest_entry?.created_at || 0).getTime()
      const bDate = new Date(b.latest_entry?.created_at || 0).getTime()
      return bDate - aDate
    })

const buildCoachPlayerCompletedSessions = (rows, exercises) => {
  const sessionMap = new Map()

  ;(rows || []).forEach((row) => {
    const sessionId =
      row.workout_session_id ||
      `${String(row.created_at || "").slice(0, 19)}:${row.pass_name || ""}:${row.exercise || ""}`

    if (!sessionMap.has(sessionId)) {
      sessionMap.set(sessionId, {
        session_id: sessionId,
        created_at: row.created_at,
        pass_name: formatLoggedPassName(row.pass_name, {
          workoutKind: row.workout_kind,
          runningOrigin: row.running_origin,
          freeActivityType: row.free_activity_type,
        }),
        workout_kind: row.workout_kind || "gym",
        running_type: row.running_type || null,
        running_interval_execution: row.running_interval_execution || null,
        running_total_elapsed_seconds: row.running_total_elapsed_seconds ?? null,
        interval_time: row.interval_time || null,
        intervals_count: row.intervals_count ?? null,
        running_distance: row.running_distance ?? null,
        running_time: row.running_time || null,
        average_pulse: row.average_pulse ?? null,
        running_origin: row.running_origin || null,
        free_activity_type: row.free_activity_type || "running",
        exerciseMap: new Map(),
      })
    }

    const session = sessionMap.get(sessionId)

    if (row.workout_kind === "running") {
      return
    }

    const exerciseName = String(row.exercise || "").trim()
    if (!exerciseName) return

    if (!session.exerciseMap.has(exerciseName)) {
      const matchedExercise = findExerciseByLoggedName(exercises, exerciseName)
      const protocolConfig = getExerciseProtocolConfig(matchedExercise || { name: exerciseName })

      session.exerciseMap.set(exerciseName, {
        name: exerciseName,
        displayName: matchedExercise ? getExerciseDisplayName(matchedExercise) : exerciseName,
        type: matchedExercise?.exercise_type || "reps_only",
        protocolConfig,
        sets: [],
      })
    }

    session.exerciseMap.get(exerciseName).sets.push({
      setNumber: row.set_number ?? null,
      weight: row.weight,
      reps: row.reps,
      seconds: row.seconds,
      setType: row.set_type || "work",
      comment: row.exercise_comment || row.pass_comment || "",
    })
  })

  return Array.from(sessionMap.values())
    .map((session) => ({
      session_id: session.session_id,
      created_at: session.created_at,
      pass_name: session.pass_name,
      workout_kind: session.workout_kind,
      running_summary:
        session.workout_kind === "running"
          ? buildRunningSummary(session)
          : null,
      running_origin: session.running_origin || null,
      free_activity_type: session.free_activity_type || "running",
      exercises: Array.from(session.exerciseMap.values()).map((exercise) => ({
        ...exercise,
        sets: exercise.sets
          .slice()
          .sort((a, b) => Number(a.setNumber || 0) - Number(b.setNumber || 0)),
      })),
    }))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

const findExerciseByLoggedName = (exercises, exerciseName) => {
  const trimmedName = String(exerciseName || "").trim()
  if (!trimmedName) return null

  const exactMatch = (exercises || []).find((exercise) => exercise.name === trimmedName)
  if (exactMatch) return exactMatch

  const normalizedName = normalizeExerciseSearchValue(trimmedName)

  return (
    (exercises || []).find((exercise) => {
      const names = [
        exercise.name,
        exercise.display_name,
        exercise.displayName,
        ...(Array.isArray(exercise.aliases) ? exercise.aliases : []),
      ]

      return names.some((candidate) => normalizeExerciseSearchValue(candidate) === normalizedName)
    }) || null
  )
}

const normalizeExercisePrimaryCategory = (value) => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")

  if (normalized === "bål" || normalized === "bal") return "bal"
  if (normalized === "overkropp") return "overkropp"
  if (normalized === "underkropp") return "underkropp"
  if (normalized === "rorlighet_kontroll" || normalized === "rorlighetkontroll") return "rorlighet_kontroll"
  if (normalized === "kondition_tid" || normalized === "konditiontid") return "kondition_tid"
  if (normalized === "styrka") return "styrka"

  return ""
}

const exerciseNavigationCategoryOptions = [
  "Axlar",
  "Ben",
  "Biceps",
  "Bröst",
  "Kondition",
  "Mage",
  "Rygg",
  "Triceps",
  "Armar",
  "Lats",
  "Säte",
  "Baksida lår",
  "Balans",
  "Rotation",
  "Rörlighet",
  "Helkropp",
  "Övrigt",
]

const normalizeExerciseNavigationCategory = (value) => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")

  const lookup = {
    axlar: "Axlar",
    ben: "Ben",
    biceps: "Biceps",
    brost: "Bröst",
    kondition: "Kondition",
    mage: "Mage",
    bal: "Mage",
    rygg: "Rygg",
    triceps: "Triceps",
    armar: "Armar",
    lats: "Lats",
    sate: "Säte",
    baksidalar: "Baksida lår",
    baksida_lar: "Baksida lår",
    balans: "Balans",
    rotation: "Rotation",
    rorlighet: "Rörlighet",
    helkropp: "Helkropp",
    ovrigt: "Övrigt",
  }

  const compact = normalized.replace(/[^a-z0-9]+/g, "")
  return lookup[compact] || ""
}

const deriveExerciseNavigationCategory = (exercise) => {
  const explicitCategory = normalizeExerciseNavigationCategory(exercise?.navigation_category)
  if (explicitCategory) return explicitCategory

  const muscleGroups = Array.isArray(exercise?.muscle_groups) ? exercise.muscle_groups : []
  const firstGroup = muscleGroups[0]

  if (firstGroup === "Bål") return "Mage"

  const normalizedFirstGroup = normalizeExerciseNavigationCategory(firstGroup)
  if (normalizedFirstGroup) return normalizedFirstGroup

  if (muscleGroups.includes("Kondition") || exercise?.exercise_type === "seconds_only") return "Kondition"
  return "Övrigt"
}

const deriveExercisePrimaryCategory = (exercise) => {
  const explicitCategory = normalizeExercisePrimaryCategory(exercise?.primary_category)
  if (explicitCategory) return explicitCategory

  const muscleGroups = Array.isArray(exercise?.muscle_groups) ? exercise.muscle_groups : []
  const exerciseType = exercise?.exercise_type || ""

  if (muscleGroups.includes("Bål")) return "bal"
  if (muscleGroups.some((group) => ["Balans", "Rotation", "Rörlighet"].includes(group))) {
    return "rorlighet_kontroll"
  }
  if (exerciseType === "seconds_only" || muscleGroups.includes("Kondition")) return "kondition_tid"
  if (muscleGroups.some((group) => ["Ben", "Säte", "Baksida lår"].includes(group))) return "underkropp"
  if (
    muscleGroups.some((group) =>
      ["Bröst", "Rygg", "Lats", "Axlar", "Armar", "Biceps", "Triceps"].includes(group)
    )
  ) {
    return "overkropp"
  }
  if (exerciseType === "weight_reps") return "styrka"

  return "styrka"
}

const getExerciseExecutionOptions = (exercise) => {
  const baseOption = {
    optionKey: `base:${exercise.id || exercise.exerciseId || exercise.name}`,
    exerciseId: exercise.exerciseId,
    name: exercise.name,
    displayName: exercise.displayName || exercise.display_name || exercise.name,
    type: exercise.type || "reps_only",
    description: exercise.description || "",
    mediaUrl: exercise.mediaUrl || "",
    defaultRepsMode: exercise.defaultRepsMode || "fixed",
    executionSide: normalizeExerciseExecutionSide(exercise.executionSide),
    isBase: true,
  }

  const alternativeOptions = Array.isArray(exercise.alternativeExercises)
    ? exercise.alternativeExercises.map((alternative) => ({
        optionKey: `alt:${alternative.id || alternative.exerciseId || alternative.name}`,
        exerciseId: alternative.exerciseId,
        name: alternative.name,
        displayName: alternative.displayName || alternative.display_name || alternative.name,
        type: alternative.type || "reps_only",
        description: alternative.description || "",
        mediaUrl: alternative.mediaUrl || "",
        defaultRepsMode: alternative.defaultRepsMode || "fixed",
        executionSide: normalizeExerciseExecutionSide(alternative.executionSide),
        isBase: false,
      }))
    : []

  return [baseOption, ...alternativeOptions]
}

const getSelectedExerciseExecution = (exercise, selectedOptionKey) => {
  const options = getExerciseExecutionOptions(exercise)
  return options.find((option) => option.optionKey === selectedOptionKey) || options[0] || null
}

const getInitialGlobalView = () => {
  if (typeof window === "undefined") return "app"
  return window.location.pathname === "/gdpr" ? "gdpr" : "app"
}

const CUSTOM_RUNNING_WORKOUT_KEY = "__design_player_custom_running__"
const isCustomRunningWorkoutKey = (workoutKey) => workoutKey === CUSTOM_RUNNING_WORKOUT_KEY

function TrainingApp() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth <= 768 : false
  )
  const [user, setUser] = useState(null)
  const [workoutsFromDB, setWorkoutsFromDB] = useState({})
  const [customRunningWorkout, setCustomRunningWorkout] = useState(null)
  const activeWorkouts = useMemo(
    () =>
      customRunningWorkout
        ? {
            ...workoutsFromDB,
            [CUSTOM_RUNNING_WORKOUT_KEY]: customRunningWorkout,
          }
        : workoutsFromDB,
    [customRunningWorkout, workoutsFromDB]
  )
  const [profile, setProfile] = useState(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [players, setPlayers] = useState([])
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(false)
  const [teamCoaches, setTeamCoaches] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [isLoadingAllUsers, setIsLoadingAllUsers] = useState(false)
  const [updatingUserTeamId, setUpdatingUserTeamId] = useState(null)
  const [resettingPasswordUserId, setResettingPasswordUserId] = useState(null)
  const [repairingLoginUserId, setRepairingLoginUserId] = useState(null)
  const [deletingUserId, setDeletingUserId] = useState(null)
  const [archivingPlayerId, setArchivingPlayerId] = useState(null)
  const [deletingPlayerId, setDeletingPlayerId] = useState(null)
  const [showArchivedPlayers, setShowArchivedPlayers] = useState(false)
  const [isDeletingOwnAccount, setIsDeletingOwnAccount] = useState(false)
  const [accountPassword, setAccountPassword] = useState("")
  const [accountPasswordConfirm, setAccountPasswordConfirm] = useState("")
  const [isUpdatingOwnPassword, setIsUpdatingOwnPassword] = useState(false)
  const [teams, setTeams] = useState([])
  const [isLoadingTeams, setIsLoadingTeams] = useState(false)
  const [messageRecipients, setMessageRecipients] = useState([])
  const [selectedMessageRecipientIds, setSelectedMessageRecipientIds] = useState([])
  const [messages, setMessages] = useState([])
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [messageSubject, setMessageSubject] = useState("")
  const [messageBody, setMessageBody] = useState("")
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false)
  const [feedbackText, setFeedbackText] = useState("")
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false)
  const [feedbackItems, setFeedbackItems] = useState([])
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(false)
  const [updatingFeedbackId, setUpdatingFeedbackId] = useState(null)
  const [exerciseRequests, setExerciseRequests] = useState([])
  const [isLoadingExerciseRequests, setIsLoadingExerciseRequests] = useState(false)
  const [updatingExerciseRequestId, setUpdatingExerciseRequestId] = useState(null)
  const [isSubmittingExerciseRequest, setIsSubmittingExerciseRequest] = useState(false)
  const [newTeamName, setNewTeamName] = useState("")
  const [isCreatingTeam, setIsCreatingTeam] = useState(false)
  const [deletingTeamId, setDeletingTeamId] = useState(null)
  const [newPlayerName, setNewPlayerName] = useState("")
  const [newPlayerPassword, setNewPlayerPassword] = useState("")
  const [createdPlayer, setCreatedPlayer] = useState(null)
  const [isCreatingPlayer, setIsCreatingPlayer] = useState(false)
  const [newUserRole, setNewUserRole] = useState("player")
  const [selectedTeamId, setSelectedTeamId] = useState("")
  const [importedPlayers, setImportedPlayers] = useState([])
  const [importFileName, setImportFileName] = useState("")
  const [isParsingImportFile, setIsParsingImportFile] = useState(false)
  const [isImportingPlayers, setIsImportingPlayers] = useState(false)
  const [importResults, setImportResults] = useState([])
  const [coachView, setCoachView] = useState("home")
  const [playerView, setPlayerView] = useState("overview")
  const [playerOverviewPanel, setPlayerOverviewPanel] = useState(null)
  const [playerPassFamily, setPlayerPassFamily] = useState(null)
  const [playerRunningView, setPlayerRunningView] = useState(null)
  const [playerRunningPresets, setPlayerRunningPresets] = useState([])
  const [isLoadingPlayerRunningPresets, setIsLoadingPlayerRunningPresets] = useState(false)
  const [isSavingPlayerRunningPreset, setIsSavingPlayerRunningPreset] = useState(false)
  const [deletingPlayerRunningPresetId, setDeletingPlayerRunningPresetId] = useState(null)
  const [selectedPlayerRunningPresetId, setSelectedPlayerRunningPresetId] = useState("")
  const [playerRunningPresetName, setPlayerRunningPresetName] = useState("")
  const [playerRunningPresetDraft, setPlayerRunningPresetDraft] = useState(() => createIntervalProgramDraft())
  const [startDistanceShareLocation, setStartDistanceShareLocation] = useState(false)
  const [playerExerciseProgress, setPlayerExerciseProgress] = useState([])
  const [isLoadingPlayerExerciseProgress, setIsLoadingPlayerExerciseProgress] = useState(false)
  const [selectedPlayerStatsExerciseIds, setSelectedPlayerStatsExerciseIds] = useState([])
  const [playerStatsPickerValue, setPlayerStatsPickerValue] = useState("")
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [globalView, setGlobalView] = useState(getInitialGlobalView)
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [commentDrafts, setCommentDrafts] = useState({})
  const [selectedPlayerAssignedPasses, setSelectedPlayerAssignedPasses] = useState([])
  const [passAssignmentPlayerIdsByPass, setPassAssignmentPlayerIdsByPass] = useState({})
  const [isUpdatingPassAssignments, setIsUpdatingPassAssignments] = useState(false)
  const [assignedWorkoutCodes, setAssignedWorkoutCodes] = useState([])
  const [playerExerciseRepTargets, setPlayerExerciseRepTargets] = useState({})
  const [selectedTemplateCode, setSelectedTemplateCode] = useState("")
  const [newPassName, setNewPassName] = useState("")
  const [newPassInfo, setNewPassInfo] = useState("")
  const [newPassWarmupCardio, setNewPassWarmupCardio] = useState("")
  const [newPassWarmupTechnique, setNewPassWarmupTechnique] = useState("")
  const [newPassWorkoutKind, setNewPassWorkoutKind] = useState("gym")
  const [newPassGymPassType, setNewPassGymPassType] = useState("individual")
  const [newPassRunningType, setNewPassRunningType] = useState("intervals")
  const [newPassRunningIntervalProgram, setNewPassRunningIntervalProgram] = useState(() =>
    createIntervalProgramDraft()
  )
  const [newPassRunningDistance, setNewPassRunningDistance] = useState("")
  const [newPassRunningTime, setNewPassRunningTime] = useState("")
  const [newWarmupTemplateName, setNewWarmupTemplateName] = useState("")
  const [isCreatingPass, setIsCreatingPass] = useState(false)
  const [renamePassName, setRenamePassName] = useState("")
  const [renamePassInfo, setRenamePassInfo] = useState("")
  const [renamePassWarmupCardio, setRenamePassWarmupCardio] = useState("")
  const [renamePassWarmupTechnique, setRenamePassWarmupTechnique] = useState("")
  const [renamePassWorkoutKind, setRenamePassWorkoutKind] = useState("gym")
  const [renamePassGymPassType, setRenamePassGymPassType] = useState("individual")
  const [renamePassRunningType, setRenamePassRunningType] = useState("intervals")
  const [renamePassRunningIntervalProgram, setRenamePassRunningIntervalProgram] = useState(() =>
    createIntervalProgramDraft()
  )
  const [renamePassRunningDistance, setRenamePassRunningDistance] = useState("")
  const [renamePassRunningTime, setRenamePassRunningTime] = useState("")
  const [renameWarmupTemplateName, setRenameWarmupTemplateName] = useState("")
  const [selectedExerciseId, setSelectedExerciseId] = useState("")
  const [isSavingPassExercise, setIsSavingPassExercise] = useState(false)
  const [passExerciseDrafts, setPassExerciseDrafts] = useState({})
  const [warmupTemplates, setWarmupTemplates] = useState([])
  const [isSavingWarmupTemplate, setIsSavingWarmupTemplate] = useState(false)
  const [targetDrafts, setTargetDrafts] = useState({})
  const [isLoadingTargets, setIsLoadingTargets] = useState(false)
  const [isSavingTargets, setIsSavingTargets] = useState(false)
  const [playerTargets, setPlayerTargets] = useState({})
  const [isLoadingPlayerTargets, setIsLoadingPlayerTargets] = useState(false)
  const [expandedInfo, setExpandedInfo] = useState({})
  const [selectedWorkout, setSelectedWorkout] = useState(null)
  const [inputs, setInputs] = useState({})
  const [exercisesFromDB, setExercisesFromDB] = useState([])
  const [templatesFromDB, setTemplatesFromDB] = useState([])
  const [templateExercisesFromDB, setTemplateExercisesFromDB] = useState([])
  const [templateExerciseAlternativesFromDB, setTemplateExerciseAlternativesFromDB] = useState([])
  const [newExerciseName, setNewExerciseName] = useState("")
  const [newExerciseType, setNewExerciseType] = useState("weight_reps")
  const [newExerciseGuide, setNewExerciseGuide] = useState("")
  const [newExerciseDescription, setNewExerciseDescription] = useState("")
  const [newExerciseMediaUrl, setNewExerciseMediaUrl] = useState("")
  const [newExerciseDefaultRepsMode, setNewExerciseDefaultRepsMode] = useState("fixed")
  const [newExerciseExecutionSide, setNewExerciseExecutionSide] = useState("standard")
  const [newExerciseMuscleGroups, setNewExerciseMuscleGroups] = useState([])
  const [newExerciseAliasesText, setNewExerciseAliasesText] = useState("")
  const [newExerciseDisplayName, setNewExerciseDisplayName] = useState("")
  const [newExercisePrimaryCategory, setNewExercisePrimaryCategory] = useState("styrka")
  const [newExerciseNavigationCategory, setNewExerciseNavigationCategory] = useState("Övrigt")
  const [editingExerciseId, setEditingExerciseId] = useState(null)
  const [isSavingExercise, setIsSavingExercise] = useState(false)
  const [importedExercises, setImportedExercises] = useState([])
  const [exerciseImportFileName, setExerciseImportFileName] = useState("")
  const [isParsingExerciseImportFile, setIsParsingExerciseImportFile] = useState(false)
  const [isImportingExercises, setIsImportingExercises] = useState(false)
  const [exerciseImportResults, setExerciseImportResults] = useState([])
  const [latestWorkout, setLatestWorkout] = useState({})
  const [latestPassDates, setLatestPassDates] = useState({})
  const [status, setStatus] = useState("")
  const [currentSessionId, setCurrentSessionId] = useState(null)
  const [isWorkoutActive, setIsWorkoutActive] = useState(false)
  const [restStopwatchStartedAt, setRestStopwatchStartedAt] = useState(null)
  const [restStopwatchNow, setRestStopwatchNow] = useState(Date.now())
  const [isRestTimerVisible, setIsRestTimerVisible] = useState(true)
  const [activeTimedSetTimer, setActiveTimedSetTimer] = useState(null)
  const [editingLoggedSetKey, setEditingLoggedSetKey] = useState(null)
  const [focusedStepperInputKey, setFocusedStepperInputKey] = useState(null)
  const [activeExerciseIndex, setActiveExerciseIndex] = useState(0)
  const [selectedExerciseOptionKeys, setSelectedExerciseOptionKeys] = useState({})
  const [exerciseComments, setExerciseComments] = useState({})
  const [passComment, setPassComment] = useState("")
  const [lastFinishedWorkoutSummary, setLastFinishedWorkoutSummary] = useState(null)
  const [completedWorkoutSessions, setCompletedWorkoutSessions] = useState([])
  const [isLoadingCompletedWorkoutSessions, setIsLoadingCompletedWorkoutSessions] = useState(false)
  const [workoutDateDrafts, setWorkoutDateDrafts] = useState({})
  const [savingWorkoutDateSessionId, setSavingWorkoutDateSessionId] = useState(null)
  const [calendarWeekStart, setCalendarWeekStart] = useState(() => getWeekStartDateInputValue())
  const [calendarEntries, setCalendarEntries] = useState([])
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(false)
  const [isSubmittingCalendar, setIsSubmittingCalendar] = useState(false)
  const [isSavingCalendarActivity, setIsSavingCalendarActivity] = useState(false)
  const [isCancellingCalendarActivity, setIsCancellingCalendarActivity] = useState(false)
  const [calendarImportSource, setCalendarImportSource] = useState(null)
  const [calendarImportFeedUrl, setCalendarImportFeedUrl] = useState("")
  const [calendarImportEnabled, setCalendarImportEnabled] = useState(true)
  const [isSavingCalendarImportSource, setIsSavingCalendarImportSource] = useState(false)
  const [isSyncingCalendarImportSource, setIsSyncingCalendarImportSource] = useState(false)
  const [updatingCalendarEventPlayerId, setUpdatingCalendarEventPlayerId] = useState(null)
  const [isSavingCalendarGroups, setIsSavingCalendarGroups] = useState(false)
  const [activeCalendarEventPlayerId, setActiveCalendarEventPlayerId] = useState(null)
  const [activeCalendarGroup, setActiveCalendarGroup] = useState(null)
  const [isActiveCalendarGroupExpanded, setIsActiveCalendarGroupExpanded] = useState(false)
  const [pendingFreeActivityCalendarEvent, setPendingFreeActivityCalendarEvent] = useState(null)
  const [runningDraft, setRunningDraft] = useState({
    log_date: getTodayDateInputValue(),
    free_activity_type: "",
    custom_activity_title: "",
    running_type: "distance",
    interval_program: createIntervalProgramDraft(),
    interval_time: "",
    intervals_count: "",
    running_distance: "",
    running_time: "",
    average_pulse: "",
    comment: "",
  })
  const [isSavingRunningSession, setIsSavingRunningSession] = useState(false)
  const [isSavingFinishedRunningSummary, setIsSavingFinishedRunningSummary] = useState(false)
  const [selectedPlayerHistory, setSelectedPlayerHistory] = useState([])
  const [selectedPlayerCompletedSessions, setSelectedPlayerCompletedSessions] = useState([])
  const [selectedPlayerExerciseGoals, setSelectedPlayerExerciseGoals] = useState({})
  const [exerciseGoalDrafts, setExerciseGoalDrafts] = useState({})
  const [isLoadingSelectedPlayerHistory, setIsLoadingSelectedPlayerHistory] = useState(false)
  const [isSavingExerciseGoals, setIsSavingExerciseGoals] = useState(false)
  const [updatingGoalAvailabilityIds, setUpdatingGoalAvailabilityIds] = useState([])
  const [targetChangeRequests, setTargetChangeRequests] = useState([])
  const [isLoadingTargetChangeRequests, setIsLoadingTargetChangeRequests] = useState(false)
  const [updatingTargetChangeRequestId, setUpdatingTargetChangeRequestId] = useState(null)
  const [targetChangeRequestReviewDrafts, setTargetChangeRequestReviewDrafts] = useState({})
  const [activeTargetChangeRequestDraft, setActiveTargetChangeRequestDraft] = useState(null)
  const [isSubmittingTargetChangeRequest, setIsSubmittingTargetChangeRequest] = useState(false)
  const [activeRunningInput, setActiveRunningInput] = useState({
    interval_program: null,
    interval_time: "",
    intervals_count: "",
    running_distance: "",
    running_time: "",
    average_pulse: "",
    location_enabled: false,
  })
  const exerciseCarouselRef = useRef(null)
  const activeTimedCompletionKeyRef = useRef(null)
  const calendarAutoSyncInFlightRef = useRef(false)

  useEffect(() => {
    loadUser()
  }, [])

  useEffect(() => {
    const updateViewport = () => {
      setIsMobile(window.innerWidth <= 768)
    }

    updateViewport()
    window.addEventListener("resize", updateViewport)

    return () => window.removeEventListener("resize", updateViewport)
  }, [])

  useEffect(() => {
    if (user) {
      loadLatestData(user.id)
    }
  }, [user])

  useEffect(() => {
    if (!user || profile?.role !== "player") {
      setCompletedWorkoutSessions([])
      setPlayerExerciseProgress([])
      setSelectedPlayerStatsExerciseIds([])
      setPlayerStatsPickerValue("")
      return
    }

    loadCompletedWorkoutSessions(user.id)
    loadPlayerExerciseProgress(user.id)
  }, [user, profile?.role, exercisesFromDB])

  useEffect(() => {
    if (!isWorkoutActive || !restStopwatchStartedAt) return

    setRestStopwatchNow(Date.now())
    const intervalId = window.setInterval(() => {
      setRestStopwatchNow(Date.now())
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [isWorkoutActive, restStopwatchStartedAt])

  useEffect(() => {
    if (!activeTimedSetTimer) return

    const intervalId = window.setInterval(() => {
      setActiveTimedSetTimer((prev) =>
        prev
          ? {
              ...prev,
              now: Date.now(),
            }
          : prev
      )
    }, 250)

    return () => window.clearInterval(intervalId)
  }, [activeTimedSetTimer?.startedAt])

  useEffect(() => {
    if (!activeTimedSetTimer || !isWorkoutActive) return

    const durationMs = Math.max(0, Number(activeTimedSetTimer.durationSeconds || 0) * 1000)
    const elapsedMs = Math.max(
      0,
      (activeTimedSetTimer.now || Date.now()) - (activeTimedSetTimer.startedAt || 0)
    )
    const remainingMs = Math.max(0, durationMs - elapsedMs)

    if (
      activeTimedSetTimer.phase === "switch_rest" &&
      remainingMs > 0 &&
      remainingMs <= 3000 &&
      !activeTimedSetTimer.warningPlayed &&
      !activeTimedSetTimer.isCompleting
    ) {
      void playIntervalSignal("resume")
      setActiveTimedSetTimer((prev) =>
        prev &&
        prev.exerciseIndex === activeTimedSetTimer.exerciseIndex &&
        prev.setIndex === activeTimedSetTimer.setIndex &&
        prev.startedAt === activeTimedSetTimer.startedAt
          ? { ...prev, warningPlayed: true }
          : prev
      )
      return
    }

    if (remainingMs <= 0 && !activeTimedSetTimer.isCompleting) {
      void completeActiveTimedTimerPhase(activeTimedSetTimer)
    }
  }, [
    activeTimedSetTimer?.now,
    activeTimedSetTimer?.phase,
    activeTimedSetTimer?.warningPlayed,
    activeTimedSetTimer?.isCompleting,
    isWorkoutActive,
  ])

  useEffect(() => {
    if (isWorkoutActive) return
    activeTimedCompletionKeyRef.current = null
    setActiveTimedSetTimer(null)
  }, [isWorkoutActive])

  useEffect(() => {
    if (!isWorkoutActive) return
    setIsRestTimerVisible(true)
  }, [isWorkoutActive, selectedWorkout])

  useEffect(() => {
    if (isWorkoutActive) return
    setActiveCalendarGroup(null)
    setIsActiveCalendarGroupExpanded(false)
  }, [isWorkoutActive])

  useEffect(() => {
    if (!user || !profile || !["coach", "player"].includes(profile.role)) {
      setCalendarEntries([])
      return
    }

    loadCalendarEntries()
  }, [user, profile, calendarWeekStart, players])

  useEffect(() => {
    const handlePopState = () => {
      setGlobalView(window.location.pathname === "/gdpr" ? "gdpr" : "app")
      setIsMenuOpen(false)
    }

    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [])

  useEffect(() => {
    if (profile?.role === "coach") {
      loadPlayers()
    }
  }, [profile])

  useEffect(() => {
    if (profile?.role === "coach" && profile?.team_id) {
      loadCalendarImportSource(profile.team_id)
      return
    }

    setCalendarImportSource(null)
    setCalendarImportFeedUrl("")
    setCalendarImportEnabled(true)
  }, [profile?.role, profile?.team_id])

  useEffect(() => {
    if (profile?.role === "head_admin") {
      loadAllUsers()
      loadTeams()
    }
  }, [profile])

  useEffect(() => {
    if (profile?.role === "coach" || profile?.role === "player") {
      loadTeams()
    }

    if (profile?.role === "coach") {
      setSelectedTeamId(profile.team_id || "")
    }

    if (profile?.role === "head_admin") {
      setSelectedTeamId(profile.team_id || "")
    }
  }, [profile])

  useEffect(() => {
    if (!user || !profile) {
      setMessageRecipients([])
      setMessages([])
      setFeedbackItems([])
      setTargetChangeRequests([])
      return
    }

    loadMessageRecipients()
    loadMessages()

    if (profile.role === "head_admin") {
      loadFeedback()
      loadExerciseRequests()
    } else {
      setFeedbackItems([])
      setExerciseRequests([])
    }

    if (profile.role === "coach" || profile.role === "head_admin") {
      loadTargetChangeRequests()
    } else {
      setTargetChangeRequests([])
      setTargetChangeRequestReviewDrafts({})
    }
  }, [user, profile])

  useEffect(() => {
    setSelectedMessageRecipientIds((prev) =>
      prev.filter((recipientId) => messageRecipients.some((entry) => entry.id === recipientId))
    )
  }, [messageRecipients])

  useEffect(() => {
    if (selectedPlayer) {
      loadPlayerTargets(selectedPlayer.id)
      loadSelectedPlayerHistoryAndGoals(selectedPlayer.id)
    } else {
      setTargetDrafts({})
      setSelectedPlayerAssignedPasses([])
      setSelectedPlayerHistory([])
      setSelectedPlayerExerciseGoals({})
      setExerciseGoalDrafts({})
    }
  }, [selectedPlayer])

  useEffect(() => {
    if (selectedPlayer && exercisesFromDB.length > 0) {
      loadSelectedPlayerHistoryAndGoals(selectedPlayer.id)
    }
  }, [selectedPlayer, exercisesFromDB])

  useEffect(() => {
    if (profile?.role !== "coach") {
      setPassAssignmentPlayerIdsByPass({})
      return
    }

    const coachPlayerIds = players.filter((player) => player?.role === "player").map((player) => player.id)
    loadPassAssignmentPlayerIdsByPass(coachPlayerIds)
  }, [players, profile?.role])

  useEffect(() => {
    if (user) {
      loadCurrentUserTargets(user.id, selectedWorkout)
    } else {
      setPlayerTargets({})
      setAssignedWorkoutCodes([])
    }
  }, [user, selectedWorkout, profile?.individual_goals_enabled])

  useEffect(() => {
    if (!user || profile?.role !== "player") {
      setPlayerRunningPresets([])
      resetPlayerRunningPresetEditor()
      return
    }

    loadPlayerRunningPresets(user.id)
  }, [user, profile?.role])

  useEffect(() => {
    if (!user || profile?.role !== "player") return

    if (!selectedWorkout) {
      setLatestWorkout({})
      return
    }

    if (isCustomRunningWorkoutKey(selectedWorkout)) {
      setLatestWorkout({})
      return
    }

    loadLatestWorkoutForPass(selectedWorkout, user.id)
  }, [user, profile?.role, selectedWorkout])

  useEffect(() => {
    if (profile?.role !== "player") return
    if (!assignedWorkoutCodes.length) {
      if (!isCustomRunningWorkoutKey(selectedWorkout)) {
        setSelectedWorkout(null)
      }
      return
    }

    if (
      selectedWorkout &&
      !assignedWorkoutCodes.includes(selectedWorkout) &&
      !isCustomRunningWorkoutKey(selectedWorkout)
    ) {
      setSelectedWorkout(null)
    }
  }, [assignedWorkoutCodes, profile?.role, selectedWorkout])

  useEffect(() => {
    setActiveExerciseIndex(0)
  }, [selectedWorkout, isWorkoutActive])

  useEffect(() => {
    if (!isWorkoutActive) return

    const resetScrollPosition = () => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" })
      exerciseCarouselRef.current?.scrollTo?.({ left: 0, top: 0, behavior: "auto" })
      setActiveExerciseIndex(0)
    }

    const animationFrame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(resetScrollPosition)
    })

    return () => window.cancelAnimationFrame(animationFrame)
  }, [isWorkoutActive, selectedWorkout])

  useEffect(() => {
    if (!selectedTemplateCode || !templatesFromDB.length) return

    const selectedTemplate = templatesFromDB.find((template) => template.code === selectedTemplateCode)
    setRenamePassName(selectedTemplate?.label || "")
    setRenamePassInfo(selectedTemplate?.info || "")
    setRenamePassWarmupCardio(selectedTemplate?.warmup_cardio || "")
    setRenamePassWarmupTechnique(selectedTemplate?.warmup_technique || "")
    setRenamePassWorkoutKind(selectedTemplate?.workout_kind || "gym")
    setRenamePassGymPassType(selectedTemplate?.gym_pass_type || "individual")
    setRenamePassRunningType(selectedTemplate?.running_type || "intervals")
    setRenamePassRunningIntervalProgram(
      storedProgramToDraft(selectedTemplate?.running_interval_program, {
        interval_time: selectedTemplate?.running_interval_time,
        intervals_count: selectedTemplate?.running_intervals_count,
      })
    )
    setRenamePassRunningDistance(
      selectedTemplate?.running_distance != null ? String(selectedTemplate.running_distance) : ""
    )
    setRenamePassRunningTime(selectedTemplate?.running_time || "")
  }, [selectedTemplateCode, templatesFromDB])

  useEffect(() => {
    if (!templatesFromDB.length) {
      setSelectedTemplateCode("")
      return
    }

    const hasSelectedTemplate = templatesFromDB.some((template) => template.code === selectedTemplateCode)

    if (selectedTemplateCode && !hasSelectedTemplate) {
      setSelectedTemplateCode("")
    }
  }, [selectedTemplateCode, templatesFromDB])

  const loadExercises = async () => {
    const { data, error } = await supabase
      .from("exercises")
      .select("*")
      .order("name")

    if (error) {
      console.error("Error fetching exercises:", error)
      return
    }

    const activeExercises = (data || [])
      .filter((exercise) => exercise.is_active !== false)
      .sort((a, b) => getExerciseDisplayName(a).localeCompare(getExerciseDisplayName(b), "sv"))

    setExercisesFromDB(activeExercises)
  }

  useEffect(() => {
    loadExercises()
  }, [])

  useEffect(() => {
    const fetchTemplates = async () => {
      if (!profile) {
        setTemplatesFromDB([])
        return
      }

      if (profile.role === "head_admin") {
        setTemplatesFromDB([])
        return
      }

      if (!profile.team_id) {
        setTemplatesFromDB([])
        return
      }

      const { data, error } = await supabase
        .from("workout_templates")
        .select("*")
        .eq("team_id", profile.team_id)
        .order("label")

      if (error) {
        console.error("Error fetching templates:", error)
      } else {
        setTemplatesFromDB(data || [])
        console.log("Templates from DB:", data)
      }
    }

    fetchTemplates()
  }, [profile])

  useEffect(() => {
    const fetchTemplateExercises = async () => {
      if (!templatesFromDB.length) {
        setTemplateExercisesFromDB([])
        return
      }

      const { data, error } = await supabase
        .from("workout_template_exercises")
        .select(`
          id,
          sort_order,
          custom_guide,
          target_sets,
          target_reps,
          target_reps_min,
          target_reps_max,
          target_reps_mode,
          target_reps_text,
          target_duration_text,
          workout_template_id,
          exercise_id,
          workout_templates!inner ( code, label, team_id )
        `)
        .in("workout_template_id", templatesFromDB.map((template) => template.id))
        .order("sort_order")

      if (error) {
        console.error("Error fetching template exercises:", error)
      } else {
        setTemplateExercisesFromDB(data || [])
        console.log("Template exercises from DB:", data)
      }
    }

    fetchTemplateExercises()
  }, [templatesFromDB])

  useEffect(() => {
    const fetchTemplateExerciseAlternatives = async () => {
      if (!templateExercisesFromDB.length) {
        setTemplateExerciseAlternativesFromDB([])
        return
      }

      const { data, error } = await supabase
        .from("workout_template_exercise_alternatives")
        .select("id, workout_template_exercise_id, alternative_exercise_id")
        .in("workout_template_exercise_id", templateExercisesFromDB.map((row) => row.id))

      if (error) {
        console.error("Error fetching template exercise alternatives:", error)
      } else {
        setTemplateExerciseAlternativesFromDB(data || [])
      }
    }

    fetchTemplateExerciseAlternatives()
  }, [templateExercisesFromDB])

  useEffect(() => {
    const fetchWarmupTemplates = async () => {
      if (!profile?.team_id || profile.role === "head_admin") {
        setWarmupTemplates([])
        return
      }

      const { data, error } = await supabase
        .from("warmup_templates")
        .select("id, name, cardio, technique")
        .eq("team_id", profile.team_id)
        .order("name")

      if (error) {
        console.error("Error fetching warmup templates:", error)
      } else {
        setWarmupTemplates(data || [])
      }
    }

    fetchWarmupTemplates()
  }, [profile])

  useEffect(() => {
    if (!templatesFromDB.length) {
      setWorkoutsFromDB({})
      return
    }

    const mapped = templatesFromDB.reduce((acc, template) => {
      const relatedExercises = templateExercisesFromDB
        .filter((row) => row.workout_templates?.code === template.code)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((row) => {
          const matchedExercise = exercisesFromDB.find(
            (exercise) => String(exercise.id) === String(row.exercise_id)
          )
          const alternativeExercises = templateExerciseAlternativesFromDB
            .filter((alternative) => String(alternative.workout_template_exercise_id) === String(row.id))
            .map((alternative) => {
              const alternativeExercise = exercisesFromDB.find(
                (exercise) => String(exercise.id) === String(alternative.alternative_exercise_id)
              )

              return {
                id: alternative.id,
                exerciseId: alternative.alternative_exercise_id,
                name: alternativeExercise?.name || "",
                displayName: getExerciseDisplayName(alternativeExercise),
                type: alternativeExercise?.exercise_type || "reps_only",
                description: alternativeExercise?.description || "",
                mediaUrl: alternativeExercise?.media_url || "",
                defaultRepsMode: alternativeExercise?.default_reps_mode || "fixed",
                executionSide: alternativeExercise?.execution_side || "standard",
              }
            })

          const suggestedGuide =
            templateExercisesFromDB
              .slice()
              .reverse()
              .find(
                (candidate) =>
                  candidate.id !== row.id &&
                  String(candidate.exercise_id) === String(row.exercise_id) &&
                  (candidate.custom_guide || "").trim()
              )?.custom_guide || ""

          return {
            id: row.id,
            exerciseId: row.exercise_id,
            sortOrder: row.sort_order,
            name: matchedExercise?.name || "",
            displayName: getExerciseDisplayName(matchedExercise),
            type: matchedExercise?.exercise_type || "reps_only",
            guide: row.custom_guide || "",
            suggestedGuide,
            description: matchedExercise?.description || "",
            mediaUrl: matchedExercise?.media_url || "",
            defaultRepsMode: matchedExercise?.default_reps_mode || "fixed",
            executionSide: matchedExercise?.execution_side || "standard",
            targetSets: row.target_sets ?? null,
            targetReps: row.target_reps ?? null,
            targetRepsMin: row.target_reps_min ?? null,
            targetRepsMax: row.target_reps_max ?? null,
            targetRepsMode: row.target_reps_mode || "fixed",
            targetRepsText: row.target_reps_text || "",
            targetDurationText: row.target_duration_text || "",
            alternativeExercises,
            info: [],
          }
        })

      const intervalProgram = getRunningProgramFromTemplate(template)
      const legacyIntervalFields = intervalProgramToLegacyFields(intervalProgram)

      acc[template.code] = {
        id: template.id,
        label: template.label,
        info: template.info || "",
        workoutKind: template.workout_kind || "gym",
        gymPassType: template.gym_pass_type || "individual",
        runningType: template.running_type || "intervals",
        runningConfig: {
          intervalProgram,
          interval_time: legacyIntervalFields.interval_time || template.running_interval_time || "",
          intervals_count: legacyIntervalFields.intervals_count ?? template.running_intervals_count ?? null,
          running_distance: template.running_distance ?? null,
          running_time: template.running_time || "",
        },
        warmup: {
          cardio: template.warmup_cardio || "",
          technique: String(template.warmup_technique || "")
            .split("\n")
            .map((item) => item.trim())
            .filter(Boolean),
        },
        exercises: template.workout_kind === "running" ? [] : relatedExercises,
      }

      return acc
    }, {})

    setWorkoutsFromDB(mapped)
  }, [exercisesFromDB, templatesFromDB, templateExerciseAlternativesFromDB, templateExercisesFromDB])

  const fetchTargetsByPassForUser = async (userId) => {
  const { data, error } = await supabase
      .from("player_exercise_targets")
      .select(
        "pass_name, exercise_name, target_sets, target_reps, target_reps_min, target_reps_max, target_reps_text, target_reps_mode, target_comment"
      )
      .eq("player_id", userId)

    if (error) {
      return { error, targetsByPass: {}, assignedPasses: [] }
    }

    const targetsByPass = {}
    const nextAssignedPasses = new Set()

    ;(data || []).forEach((row) => {
      if (!row.pass_name) return

      nextAssignedPasses.add(row.pass_name)

      if (row.exercise_name === PASS_ASSIGNMENT_EXERCISE_NAME) {
        return
      }

      if (!targetsByPass[row.pass_name]) {
        targetsByPass[row.pass_name] = {}
      }

      targetsByPass[row.pass_name][row.exercise_name] = {
        target_sets: row.target_sets,
        target_reps: row.target_reps,
        target_reps_min: row.target_reps_min ?? null,
        target_reps_max: row.target_reps_max ?? null,
        target_reps_text: row.target_reps_text || null,
        target_reps_mode: row.target_reps_mode || "fixed",
        target_comment: row.target_comment,
      }
    })

    return {
      error: null,
      targetsByPass,
      assignedPasses: Array.from(nextAssignedPasses),
    }
  }

  const loadExerciseRepTargetsForPlayer = async (playerId) => {
    if (!playerId) return {}

    const { data, error } = await supabase
      .from("player_exercise_rep_targets")
      .select("exercise_id, rep_range_key, target_weight")
      .eq("player_id", playerId)

    if (error) {
      console.error(error)
      return {}
    }

    return buildRepRangeWeightsByExercise(data || [])
  }

  const loadCurrentUserTargets = async (userId, passName) => {
    setIsLoadingPlayerTargets(true)

    const { error, targetsByPass, assignedPasses } = await fetchTargetsByPassForUser(userId)

    if (error) {
      console.error(error)
      setPlayerTargets({})
      setAssignedWorkoutCodes([])
      setIsLoadingPlayerTargets(false)
      return
    }

    setAssignedWorkoutCodes(assignedPasses)
    setPlayerTargets(profile?.individual_goals_enabled === false ? {} : targetsByPass[passName] || {})
    setIsLoadingPlayerTargets(false)
  }

  const loadUser = async () => {
    setIsLoadingProfile(true)

    const { data, error } = await supabase.auth.getUser()

    if (error) {
      console.error(error)
      if (String(error.message || "").toLowerCase().includes("jwt")) {
        await supabase.auth.signOut()
        setUser(null)
        setProfile(null)
        setStatus("Din inloggning har gått ut. Logga in igen.")
      }
      setIsLoadingProfile(false)
      return
    }

    setUser(data.user)

    if (!data.user) {
      setProfile(null)
      setIsLoadingProfile(false)
      return
    }

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", data.user.id)
      .single()

    if (profileError) {
      console.error(profileError)
      setIsLoadingProfile(false)
      return
    }

    setProfile(profileData)
    setIsLoadingProfile(false)
  }

  const loadPlayers = async () => {
    setIsLoadingPlayers(true)

    let playerQuery = supabase
      .from("profiles")
      .select("id, full_name, username, role, comment, team_id, is_archived, archived_at, archived_by, individual_goals_enabled")
      .eq("role", "player")
      .order("full_name", { ascending: true })

    let coachQuery = supabase
      .from("profiles")
      .select("id, full_name, username, role, comment, team_id")
      .eq("role", "coach")
      .order("full_name", { ascending: true })

    if (profile?.team_id) {
      playerQuery = playerQuery.eq("team_id", profile.team_id)
      coachQuery = coachQuery.eq("team_id", profile.team_id)
    }

    const [{ data: profileData, error: profileError }, { data: coachData, error: coachError }] =
      await Promise.all([playerQuery, coachQuery])

    if (profileError || coachError) {
      console.error(profileError || coachError)
      setIsLoadingPlayers(false)
      return
    }

    const playerIds = (profileData || []).map((player) => player.id)
    let loginLookup = {}

    if (playerIds.length > 0) {
      const { data: loginData, error: loginError } = await supabase.functions.invoke("list-player-logins", {
        body: { player_ids: playerIds },
      })

      if (loginError) {
        console.error(loginError)
      } else {
        loginLookup = (loginData?.players || []).reduce((acc, entry) => {
          acc[entry.player_id] = entry.last_sign_in_at || null
          return acc
        }, {})
      }
    }

    const { data: logData, error: logError } = await supabase
      .from("workout_logs")
      .select("user_id, pass_name, created_at, workout_session_id, is_completed, workout_kind")
      .eq("is_completed", true)
      .neq("workout_kind", "running")
      .eq("set_type", "work")
      .not("workout_session_id", "is", null)
      .order("created_at", { ascending: false })

    if (logError) {
      console.error(logError)
      setPlayers((profileData || []).map((player) => ({
        ...player,
        latestPass: "-",
        totalPasses: 0,
        comment: "-",
      })))
      setTeamCoaches(coachData || [])
      setIsLoadingPlayers(false)
      return
    }

    const statsByUser = {}

    ;(logData || []).forEach((log) => {
      if (!statsByUser[log.user_id]) {
        statsByUser[log.user_id] = {
          latestPass: formatLoggedPassName(log.pass_name, {
            workoutKind: log.workout_kind,
          }),
          sessionIds: new Set(),
        }
      }

      if (log.workout_session_id) {
        statsByUser[log.user_id].sessionIds.add(log.workout_session_id)
      }
    })

    const enrichedPlayers = (profileData || []).map((player) => {
      const playerStats = statsByUser[player.id]

      return {
        ...player,
        latestPass: playerStats?.latestPass || "-",
        totalPasses: playerStats ? playerStats.sessionIds.size : 0,
        comment: player.comment || "",
        lastSignInAt: loginLookup[player.id] || null,
      }
    })

    setPlayers(enrichedPlayers)
    setTeamCoaches((coachData || []).filter((coach) => coach.id !== user?.id))
    setCommentDrafts(
      enrichedPlayers.reduce((acc, player) => {
        acc[player.id] = player.comment || ""
        return acc
      }, {})
    )
    setIsLoadingPlayers(false)
  }

  const loadAllUsers = async () => {
    setIsLoadingAllUsers(true)

    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, username, role, team_id, is_archived, archived_at, archived_by")
      .order("full_name", { ascending: true })

    if (error) {
      console.error(error)
      setIsLoadingAllUsers(false)
      return
    }

    setAllUsers(data || [])
    setIsLoadingAllUsers(false)
  }

  const loadTeams = async () => {
    setIsLoadingTeams(true)

    const { data, error } = await supabase
      .from("teams")
      .select("id, name")
      .order("name", { ascending: true })

    if (error) {
      console.error(error)
      setIsLoadingTeams(false)
      return
    }

    setTeams(data || [])
    setIsLoadingTeams(false)
  }

  const sortProfilesForMessaging = (entries) =>
    (entries || [])
      .slice()
      .sort((a, b) => {
        const roleOrder = {
          head_admin: 0,
          coach: 1,
          player: 2,
        }

        const roleDiff = (roleOrder[a.role] ?? 99) - (roleOrder[b.role] ?? 99)
        if (roleDiff !== 0) return roleDiff

        return String(a.full_name || a.username || "").localeCompare(
          String(b.full_name || b.username || ""),
          "sv"
        )
      })

  const loadMessageRecipients = async () => {
    if (!user || !profile) {
      setMessageRecipients([])
      return
    }

    if (profile.role === "player") {
      if (!profile.team_id) {
        setMessageRecipients([])
        return
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, username, role, team_id, is_archived")
        .eq("team_id", profile.team_id)
        .eq("role", "coach")
        .neq("id", user.id)

      if (error) {
        console.error(error)
        setMessageRecipients([])
        return
      }

      setMessageRecipients(sortProfilesForMessaging(data || []))
      return
    }

    if (profile.role === "coach") {
      const teamQuery = supabase
        .from("profiles")
        .select("id, full_name, username, role, team_id, is_archived")
        .neq("id", user.id)

      const scopedTeamQuery = profile.team_id
        ? teamQuery.eq("team_id", profile.team_id).in("role", ["coach", "player"])
        : teamQuery.in("role", ["coach", "player"]).limit(0)

      const [{ data: teamUsers, error: teamError }, { data: admins, error: adminError }] =
        await Promise.all([
          scopedTeamQuery,
          supabase
            .from("profiles")
            .select("id, full_name, username, role, team_id, is_archived")
            .eq("role", "head_admin"),
        ])

      if (teamError || adminError) {
        console.error(teamError || adminError)
        setMessageRecipients([])
        return
      }

      const deduped = [...(teamUsers || []), ...(admins || [])].filter(
        (entry, index, arr) => arr.findIndex((candidate) => candidate.id === entry.id) === index
      )

      setMessageRecipients(
        sortProfilesForMessaging(deduped.filter((entry) => entry.role !== "player" || !entry.is_archived))
      )
      return
    }

    if (profile.role === "head_admin") {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, username, role, team_id, is_archived")
        .neq("id", user.id)
        .order("full_name", { ascending: true })

      if (error) {
        console.error(error)
        setMessageRecipients([])
        return
      }

      setMessageRecipients(
        sortProfilesForMessaging((data || []).filter((entry) => entry.role !== "player" || !entry.is_archived))
      )
      return
    }

    setMessageRecipients([])
  }

  const loadMessages = async () => {
    if (!user) {
      setMessages([])
      return
    }

    setIsLoadingMessages(true)

    const [{ data: outgoingMessages, error: outgoingError }, { data: incomingRecipientRows, error: incomingError }] =
      await Promise.all([
        supabase
          .from("messages")
          .select("id")
          .eq("sender_id", user.id),
        supabase
          .from("message_recipients")
          .select("message_id")
          .eq("recipient_id", user.id),
      ])

    if (outgoingError || incomingError) {
      console.error(outgoingError || incomingError)
      setMessages([])
      setIsLoadingMessages(false)
      return
    }

    const messageIds = Array.from(
      new Set([
        ...(outgoingMessages || []).map((row) => row.id),
        ...(incomingRecipientRows || []).map((row) => row.message_id),
      ].filter(Boolean))
    )

    if (!messageIds.length) {
      setMessages([])
      setIsLoadingMessages(false)
      return
    }

    const [{ data: messageRows, error: messageError }, { data: recipientRows, error: recipientError }] =
      await Promise.all([
        supabase
          .from("messages")
          .select(`
            id,
            sender_id,
            subject,
            body,
            team_id,
            created_at,
            sender:profiles!messages_sender_id_fkey (
              id,
              full_name,
              username,
              role,
              team_id
            )
          `)
          .in("id", messageIds)
          .order("created_at", { ascending: false }),
        supabase
          .from("message_recipients")
          .select(`
            message_id,
            recipient_id,
            read_at,
            recipient:profiles!message_recipients_recipient_id_fkey (
              id,
              full_name,
              username,
              role,
              team_id
            )
          `)
          .in("message_id", messageIds),
      ])

    if (messageError || recipientError) {
      console.error(messageError || recipientError)
      setMessages([])
      setIsLoadingMessages(false)
      return
    }

    const recipientsByMessageId = (recipientRows || []).reduce((acc, row) => {
      if (!acc[row.message_id]) {
        acc[row.message_id] = []
      }

      if (row.recipient) {
        acc[row.message_id].push(row.recipient)
      }

      return acc
    }, {})

    setMessages(
      (messageRows || []).map((row) => ({
        ...row,
        recipients: sortProfilesForMessaging(recipientsByMessageId[row.id] || []),
        direction: row.sender_id === user.id ? "sent" : "received",
        currentUserReadAt:
          (recipientRows || []).find(
            (recipientRow) =>
              recipientRow.message_id === row.id && recipientRow.recipient_id === user.id
          )?.read_at || null,
        hasUnread:
          row.sender_id !== user.id &&
          !(recipientRows || []).find(
            (recipientRow) =>
              recipientRow.message_id === row.id && recipientRow.recipient_id === user.id
          )?.read_at,
      }))
    )
    setIsLoadingMessages(false)
  }

  const handleMarkMessagesRead = async (messageIds) => {
    const targetIds = Array.from(new Set((messageIds || []).filter(Boolean)))

    if (!user || !targetIds.length) return

    const unreadIds = targetIds.filter((messageId) =>
      messages.some(
        (message) =>
          message.id === messageId &&
          message.sender_id !== user.id &&
          !message.currentUserReadAt
      )
    )

    if (!unreadIds.length) return

    const readAt = new Date().toISOString()

    const { error } = await supabase
      .from("message_recipients")
      .update({ read_at: readAt })
      .eq("recipient_id", user.id)
      .in("message_id", unreadIds)

    if (error) {
      console.error(error)
      return
    }

    setMessages((prev) =>
      prev.map((message) =>
        unreadIds.includes(message.id)
          ? {
              ...message,
              currentUserReadAt: readAt,
              hasUnread: false,
            }
          : message
      )
    )
  }

  const handleToggleMessageRecipient = (recipientId) => {
    setSelectedMessageRecipientIds((prev) =>
      prev.includes(recipientId)
        ? prev.filter((entry) => entry !== recipientId)
        : [...prev, recipientId]
    )
  }

  const handleSendMessage = async () => {
    const trimmedSubject = messageSubject.trim()
    const trimmedBody = messageBody.trim()
    const uniqueRecipientIds = Array.from(new Set(selectedMessageRecipientIds.filter(Boolean)))

    if (!user || !profile) return

    if (!uniqueRecipientIds.length) {
      setStatus("Välj minst en mottagare")
      return
    }

    if (!trimmedSubject) {
      setStatus("Skriv ett ämne först")
      return
    }

    if (!trimmedBody) {
      setStatus("Skriv ett meddelande först")
      return
    }

    setIsSendingMessage(true)

    const { data: messageRow, error: messageError } = await supabase
      .from("messages")
      .insert({
        sender_id: user.id,
        subject: trimmedSubject,
        team_id: profile.team_id || null,
        body: trimmedBody,
      })
      .select("id")
      .single()

    if (messageError || !messageRow?.id) {
      console.error(messageError)
      setStatus(`Kunde inte skicka meddelandet${messageError?.message ? `: ${messageError.message}` : ""}`)
      setIsSendingMessage(false)
      return
    }

    const { error: recipientError } = await supabase
      .from("message_recipients")
      .insert(
        uniqueRecipientIds.map((recipientId) => ({
          message_id: messageRow.id,
          recipient_id: recipientId,
        }))
      )

    if (recipientError) {
      console.error(recipientError)
      await supabase.from("messages").delete().eq("id", messageRow.id)
      setStatus(`Kunde inte skicka meddelandet${recipientError.message ? `: ${recipientError.message}` : ""}`)
      setIsSendingMessage(false)
      return
    }

    setMessageSubject("")
    setMessageBody("")
    setSelectedMessageRecipientIds([])
    await loadMessages()
    setStatus("Meddelandet skickades ✅")
    setIsSendingMessage(false)
  }

  const loadFeedback = async () => {
    if (profile?.role !== "head_admin") {
      setFeedbackItems([])
      return
    }

    setIsLoadingFeedback(true)

    const { data, error } = await supabase
      .from("beta_feedback")
      .select("id, user_id, team_id, body, status, status_updated_at, created_at")
      .order("created_at", { ascending: false })

    if (error) {
      console.error(error)
      setFeedbackItems([])
      setIsLoadingFeedback(false)
      return
    }

    setFeedbackItems(data || [])
    setIsLoadingFeedback(false)
  }

  const loadExerciseRequests = async () => {
    if (profile?.role !== "head_admin") {
      setExerciseRequests([])
      return
    }

    setIsLoadingExerciseRequests(true)

    const { data, error } = await supabase
      .from("exercise_requests")
      .select(
        "id, requester_id, team_id, name, exercise_type, reps_mode, muscle_groups, description, equipment, reference_url, status, status_updated_at, created_at"
      )
      .order("created_at", { ascending: false })

    if (error) {
      console.error(error)
      setExerciseRequests([])
      setIsLoadingExerciseRequests(false)
      return
    }

    setExerciseRequests(data || [])
    setIsLoadingExerciseRequests(false)
  }

  const loadTargetChangeRequests = async () => {
    if (!profile || (profile.role !== "coach" && profile.role !== "head_admin")) {
      setTargetChangeRequests([])
      setTargetChangeRequestReviewDrafts({})
      return
    }

    setIsLoadingTargetChangeRequests(true)

    let query = supabase
      .from("player_target_change_requests")
      .select("*")
      .eq("status", "open")
      .order("created_at", { ascending: false })

    if (profile.role === "coach") {
      query = query.eq("team_id", profile.team_id || "")
    }

    const { data, error } = await query

    if (error) {
      console.error(error)
      setTargetChangeRequests([])
      setTargetChangeRequestReviewDrafts({})
      setIsLoadingTargetChangeRequests(false)
      return
    }

    const rows = data || []
    setTargetChangeRequests(rows)
    setTargetChangeRequestReviewDrafts((prev) =>
      rows.reduce((acc, request) => {
        acc[request.id] =
          prev[request.id] ??
          (request.current_target_weight != null ? String(request.current_target_weight) : "")
        return acc
      }, {})
    )
    setIsLoadingTargetChangeRequests(false)
  }

  const handleSubmitFeedback = async () => {
    const trimmedBody = feedbackText.trim()

    if (!user || !trimmedBody) {
      setStatus("Skriv din feedback först")
      return
    }

    setIsSubmittingFeedback(true)

    const { error } = await supabase
      .from("beta_feedback")
      .insert({
        user_id: user.id,
        team_id: profile?.team_id || null,
        body: trimmedBody,
      })

    if (error) {
      console.error(error)
      setStatus("Kunde inte spara feedback")
      setIsSubmittingFeedback(false)
      return
    }

    if (profile?.role === "head_admin") {
      await loadFeedback()
    }

    setFeedbackText("")
    setIsFeedbackOpen(false)
    setStatus("Feedback sparad ✅")
    setIsSubmittingFeedback(false)
  }

  const buildTargetChangeRequestDraft = (option, overrides = {}) => {
    if (!option) return null

    return {
      composer_key: option.composer_key,
      exercise_id: option.exercise_id,
      exercise_name: option.exercise_name,
      rep_range_key: option.rep_range_key,
      request_type: overrides.request_type || "increase",
      comment: overrides.comment || "",
      current_target_weight: option.current_target_weight,
      latest_logged_weight: option.latest_logged_weight,
      latest_logged_reps_text: option.latest_logged_reps_text || null,
    }
  }

  const handleSubmitTargetChangeRequest = async () => {
    if (!user || !profile || !activeTargetChangeRequestDraft) return false

    const trimmedComment = String(activeTargetChangeRequestDraft.comment || "").trim()

    setIsSubmittingTargetChangeRequest(true)

    const payload = {
      player_id: user.id,
      player_name: profile.full_name || profile.username || "Spelare",
      team_id: profile.team_id || null,
      exercise_id: activeTargetChangeRequestDraft.exercise_id,
      exercise_name: activeTargetChangeRequestDraft.exercise_name,
      rep_range_key: activeTargetChangeRequestDraft.rep_range_key,
      request_type: activeTargetChangeRequestDraft.request_type,
      current_target_weight: activeTargetChangeRequestDraft.current_target_weight,
      latest_logged_weight: activeTargetChangeRequestDraft.latest_logged_weight,
      latest_logged_reps_text: activeTargetChangeRequestDraft.latest_logged_reps_text || null,
      comment: trimmedComment || null,
    }

    const { data: existingRequest, error: existingRequestError } = await supabase
      .from("player_target_change_requests")
      .select("id")
      .eq("player_id", user.id)
      .eq("exercise_id", activeTargetChangeRequestDraft.exercise_id)
      .eq("rep_range_key", activeTargetChangeRequestDraft.rep_range_key)
      .eq("status", "open")
      .maybeSingle()

    if (existingRequestError) {
      console.error(existingRequestError)
      setStatus("Kunde inte kontrollera tidigare begäran")
      setIsSubmittingTargetChangeRequest(false)
      return false
    }

    const { error } = existingRequest
      ? await supabase
          .from("player_target_change_requests")
          .update(payload)
          .eq("id", existingRequest.id)
      : await supabase.from("player_target_change_requests").insert(payload)

    if (error) {
      console.error(error)
      setStatus("Kunde inte skicka begäran om målviktsändring")
      setIsSubmittingTargetChangeRequest(false)
      return false
    }

    setStatus("Begäran skickad till tränaren ✅")
    setActiveTargetChangeRequestDraft(null)
    setIsSubmittingTargetChangeRequest(false)
    return true
  }

  const handleSetTargetChangeReviewDraft = (requestId, value) => {
    setTargetChangeRequestReviewDrafts((prev) => ({
      ...prev,
      [requestId]: value,
    }))
  }

  const handleReviewTargetChangeRequest = async (request, nextStatus) => {
    if (!request?.id || !user?.id) return false

    setUpdatingTargetChangeRequestId(request.id)

    if (nextStatus === "approved") {
      const nextWeight = Number.parseFloat(
        String(targetChangeRequestReviewDrafts[request.id] ?? "").replace(",", ".")
      )

      if (!Number.isFinite(nextWeight) || nextWeight <= 0) {
        setStatus("Ange en giltig ny målvikt innan du godkänner")
        setUpdatingTargetChangeRequestId(null)
        return false
      }

      const { error: targetError } = await supabase
        .from("player_exercise_rep_targets")
        .upsert(
          {
            player_id: request.player_id,
            exercise_id: request.exercise_id,
            rep_range_key: request.rep_range_key,
            target_weight: nextWeight,
            updated_by: user.id,
            source: "manual_override",
          },
          { onConflict: "player_id,exercise_id,rep_range_key" }
        )

      if (targetError) {
        console.error(targetError)
        setStatus("Kunde inte uppdatera målvikten")
        setUpdatingTargetChangeRequestId(null)
        return false
      }
    }

    const resolvedTargetWeight =
      nextStatus === "approved"
        ? Number.parseFloat(String(targetChangeRequestReviewDrafts[request.id] ?? "").replace(",", "."))
        : null

    const { error } = await supabase
      .from("player_target_change_requests")
      .update({
        status: nextStatus,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
        resolved_target_weight: Number.isFinite(resolvedTargetWeight) ? resolvedTargetWeight : null,
      })
      .eq("id", request.id)

    if (error) {
      console.error(error)
      setStatus("Kunde inte uppdatera begäran")
      setUpdatingTargetChangeRequestId(null)
      return false
    }

    setStatus(nextStatus === "approved" ? "Begäran godkänd och målvikt uppdaterad ✅" : "Begäran avslagen")
    setUpdatingTargetChangeRequestId(null)
    await loadTargetChangeRequests()
    return true
  }

  const handleSubmitExerciseRequest = async (requestDraft) => {
    if (!user || !profile) return false

    const trimmedName = String(requestDraft?.name || "").trim()
    const trimmedDescription = String(requestDraft?.description || "").trim()
    const muscleGroups = Array.isArray(requestDraft?.muscle_groups)
      ? requestDraft.muscle_groups.filter(Boolean)
      : []

    if (!trimmedName) {
      setStatus("Ange namn på övningen")
      return false
    }

    if (!requestDraft?.exercise_type) {
      setStatus("Välj typ av övning")
      return false
    }

    if (!requestDraft?.reps_mode) {
      setStatus("Välj om övningen körs med fasta reps eller till failure")
      return false
    }

    if (!muscleGroups.length) {
      setStatus("Välj minst en primär muskelgrupp")
      return false
    }

    if (!trimmedDescription) {
      setStatus("Skriv en kort beskrivning av övningen")
      return false
    }

    setIsSubmittingExerciseRequest(true)

    const payload = {
      requester_id: user.id,
      team_id: profile.team_id || null,
      name: trimmedName,
      exercise_type: requestDraft.exercise_type,
      reps_mode: requestDraft.reps_mode,
      muscle_groups: muscleGroups,
      description: trimmedDescription,
      equipment: String(requestDraft?.equipment || "").trim() || null,
      reference_url: String(requestDraft?.reference_url || "").trim() || null,
    }

    const { data, error } = await supabase
      .from("exercise_requests")
      .insert(payload)
      .select(
        "id, requester_id, team_id, name, exercise_type, reps_mode, muscle_groups, description, equipment, reference_url, status, status_updated_at, created_at"
      )
      .single()

    if (error || !data) {
      console.error(error)
      setStatus("Kunde inte skicka övningsrequest")
      setIsSubmittingExerciseRequest(false)
      return false
    }

    const { data: headAdmins, error: headAdminError } = await supabase
      .from("profiles")
      .select("id, full_name, username")
      .eq("role", "head_admin")

    if (!headAdminError && headAdmins?.length) {
      const notificationSubject = `Ny övningsrequest: ${trimmedName}`
      const notificationBody = [
        `${profile.full_name || profile.username} har skickat in en ny request till övningsbanken.`,
        "",
        `Övning: ${trimmedName}`,
        `Typ: ${requestDraft.exercise_type}`,
        `Repsläge: ${requestDraft.reps_mode === "max" ? "Till failure / max" : "Fast reps"}`,
        `Muskelgrupper: ${muscleGroups.join(", ")}`,
        `Lag: ${teams.find((team) => team.id === profile.team_id)?.name || "Inget lag"}`,
        "",
        `Beskrivning: ${trimmedDescription}`,
        requestDraft?.equipment ? `Utrustning: ${String(requestDraft.equipment).trim()}` : "",
        requestDraft?.reference_url ? `Referens: ${String(requestDraft.reference_url).trim()}` : "",
      ]
        .filter(Boolean)
        .join("\n")

      const { data: messageRow, error: messageError } = await supabase
        .from("messages")
        .insert({
          sender_id: user.id,
          subject: notificationSubject,
          team_id: profile.team_id || null,
          body: notificationBody,
        })
        .select("id")
        .single()

      if (!messageError && messageRow?.id) {
        const recipientRows = headAdmins
          .filter((entry) => entry.id !== user.id)
          .map((entry) => ({
            message_id: messageRow.id,
            recipient_id: entry.id,
          }))

        if (recipientRows.length) {
          const { error: recipientError } = await supabase
            .from("message_recipients")
            .insert(recipientRows)

          if (recipientError) {
            console.error(recipientError)
          }
        }
      } else if (messageError) {
        console.error(messageError)
      }
    } else if (headAdminError) {
      console.error(headAdminError)
    }

    if (profile?.role === "head_admin") {
      setExerciseRequests((prev) => [data, ...prev])
    }

    setStatus("Övningsrequest skickad ✅")
    setIsSubmittingExerciseRequest(false)
    return true
  }

  const handleUpdateFeedbackStatus = async (feedbackId, nextStatus) => {
    if (!feedbackId || !nextStatus) return

    setUpdatingFeedbackId(feedbackId)

    const payload = {
      status: nextStatus,
      status_updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from("beta_feedback")
      .update(payload)
      .eq("id", feedbackId)
      .select("id, status, status_updated_at")
      .single()

    if (error || !data) {
      console.error(error)
      setStatus("Kunde inte uppdatera feedbackstatus")
      setUpdatingFeedbackId(null)
      return
    }

    setFeedbackItems((prev) =>
      prev.map((item) =>
        item.id === feedbackId
          ? {
              ...item,
              status: data.status,
              status_updated_at: data.status_updated_at,
            }
          : item
      )
    )
    setStatus("Feedbackstatus uppdaterad ✅")
    setUpdatingFeedbackId(null)
  }

  const handleUpdateExerciseRequestStatus = async (requestId, nextStatus) => {
    if (!requestId || !nextStatus) return

    setUpdatingExerciseRequestId(requestId)

    const payload = {
      status: nextStatus,
      status_updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from("exercise_requests")
      .update(payload)
      .eq("id", requestId)
      .select("id, status, status_updated_at")
      .single()

    if (error || !data) {
      console.error(error)
      setStatus("Kunde inte uppdatera requeststatus")
      setUpdatingExerciseRequestId(null)
      return
    }

    setExerciseRequests((prev) =>
      prev.map((item) =>
        item.id === requestId
          ? {
              ...item,
              status: data.status,
              status_updated_at: data.status_updated_at,
            }
          : item
      )
    )
    setStatus("Requeststatus uppdaterad ✅")
    setUpdatingExerciseRequestId(null)
  }

  const handleChangeUserTeam = async (userId, nextTeamId) => {
    if (!userId || !nextTeamId) {
      setStatus("Välj ett lag först")
      return
    }

    setUpdatingUserTeamId(userId)

    const { error } = await supabase
      .from("profiles")
      .update({ team_id: nextTeamId })
      .eq("id", userId)

    if (error) {
      console.error(error)
      setStatus("Kunde inte byta lag")
      setUpdatingUserTeamId(null)
      return
    }

    setAllUsers((prev) =>
      prev.map((entry) => (entry.id === userId ? { ...entry, team_id: nextTeamId } : entry))
    )
    setPlayers((prev) =>
      prev.map((entry) => (entry.id === userId ? { ...entry, team_id: nextTeamId } : entry))
    )
    setSelectedPlayer((prev) => (prev?.id === userId ? { ...prev, team_id: nextTeamId } : prev))
    loadMessageRecipients()
    setStatus("Lag uppdaterat ✅")
    setUpdatingUserTeamId(null)
  }

  const handleResetUserPassword = async (userId, nextPassword) => {
    if (!userId || !nextPassword.trim()) {
      setStatus("Ange ett nytt lösenord först")
      return
    }

    const accessToken = await ensureFreshSession()

    if (!accessToken) {
      return
    }

    setResettingPasswordUserId(userId)

    const { data, error } = await supabase.functions.invoke("reset-user-password", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: {
        user_id: userId,
        password: nextPassword.trim(),
      },
    })

    if (error) {
      console.error(error)
      setStatus(await getFunctionErrorMessage(error, "Kunde inte byta lösenord"))
      setResettingPasswordUserId(null)
      return
    }

    if (data?.error) {
      setStatus(data.error)
      setResettingPasswordUserId(null)
      return
    }

    setStatus("Lösenord uppdaterat ✅")
    setResettingPasswordUserId(null)
  }

  const handleUpdateOwnPassword = async () => {
    const nextPassword = accountPassword.trim()
    const confirmPassword = accountPasswordConfirm.trim()

    if (!nextPassword) {
      setStatus("Ange ett nytt lösenord först")
      return
    }

    if (nextPassword.length < 6) {
      setStatus("Lösenordet måste vara minst 6 tecken")
      return
    }

    if (nextPassword !== confirmPassword) {
      setStatus("Lösenorden matchar inte")
      return
    }

    setIsUpdatingOwnPassword(true)

    const { error } = await supabase.auth.updateUser({
      password: nextPassword,
    })

    if (error) {
      console.error(error)
      setStatus(error.message || "Kunde inte uppdatera ditt lösenord")
      setIsUpdatingOwnPassword(false)
      return
    }

    setAccountPassword("")
    setAccountPasswordConfirm("")
    setStatus("Ditt lösenord är uppdaterat ✅")
    setIsUpdatingOwnPassword(false)
  }

  const handleRepairUserLogin = async (userId) => {
    if (!userId) return

    const accessToken = await ensureFreshSession()

    if (!accessToken) {
      return
    }

    setRepairingLoginUserId(userId)

    const { data, error } = await supabase.functions.invoke("repair-user-login", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: {
        user_id: userId,
      },
    })

    if (error) {
      console.error(error)
      setStatus(await getFunctionErrorMessage(error, "Kunde inte reparera login"))
      setRepairingLoginUserId(null)
      return
    }

    if (data?.error) {
      setStatus(data.error)
      setRepairingLoginUserId(null)
      return
    }

    setStatus(`Login reparerat ✅ ${data?.email || ""}`.trim())
    setRepairingLoginUserId(null)
  }

  const handleDeleteUser = async (userId, fullName) => {
    if (!userId) return

    const confirmed = window.confirm(`Vill du ta bort ${fullName || "den här användaren"}?`)
    if (!confirmed) return

    const accessToken = await ensureFreshSession()

    if (!accessToken) {
      return
    }

    setDeletingUserId(userId)

    const { data, error } = await supabase.functions.invoke("delete-user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: {
        user_id: userId,
      },
    })

    if (error) {
      console.error(error)
      setStatus(await getFunctionErrorMessage(error, "Kunde inte ta bort användaren"))
      setDeletingUserId(null)
      return
    }

    if (data?.error) {
      setStatus(data.error)
      setDeletingUserId(null)
      return
    }

    setAllUsers((prev) => prev.filter((entry) => entry.id !== userId))
    setPlayers((prev) => prev.filter((entry) => entry.id !== userId))
    setTeamCoaches((prev) => prev.filter((entry) => entry.id !== userId))
    setMessageRecipients((prev) => prev.filter((entry) => entry.id !== userId))
    setSelectedPlayer((prev) => (prev?.id === userId ? null : prev))
    setStatus("Användare borttagen ✅")
    setDeletingUserId(null)
  }

  const navigateGlobalView = (nextView) => {
    setGlobalView(nextView)
    setIsMenuOpen(false)

    if (typeof window !== "undefined") {
      const nextPath = nextView === "gdpr" ? "/gdpr" : "/"
      if (window.location.pathname !== nextPath) {
        window.history.pushState({}, "", nextPath)
      }
    }
  }

  const refreshLifecycleData = async () => {
    const tasks = []

    if (profile?.role === "coach") {
      tasks.push(loadPlayers())
    }

    if (profile?.role === "head_admin") {
      tasks.push(loadAllUsers())
    }

    if (profile?.role === "coach" || profile?.role === "head_admin") {
      tasks.push(loadMessageRecipients())
    }

    await Promise.all(tasks)
  }

  const handleArchivePlayer = async (playerId, fullName) => {
    if (!playerId) return

    const confirmed = window.confirm(`Vill du arkivera ${fullName || "den här spelaren"}?`)
    if (!confirmed) return

    const sessionToken = await ensureFreshSession()
    if (!sessionToken) return

    setArchivingPlayerId(playerId)

    const { data, error } = await supabase.functions.invoke("archive-player", {
      headers: {
        Authorization: `Bearer ${sessionToken}`,
      },
      body: {
        player_id: playerId,
      },
    })

    if (error) {
      console.error(error)
      setStatus(await getFunctionErrorMessage(error, "Kunde inte arkivera spelaren"))
      setArchivingPlayerId(null)
      return
    }

    if (data?.error) {
      setStatus(data.error)
      setArchivingPlayerId(null)
      return
    }

    if (!showArchivedPlayers) {
      setSelectedPlayer((prev) => (prev?.id === playerId ? null : prev))
    }

    await refreshLifecycleData()
    setStatus("Spelare arkiverad ✅")
    setArchivingPlayerId(null)
  }

  const handleDeletePlayer = async (playerId, fullName, options = {}) => {
    if (!playerId) return

    const isSelfDelete = options?.isSelfDelete === true
    const firstPrompt = isSelfDelete
      ? "Vill du ta bort ditt konto permanent? All träningsdata kopplad till kontot tas bort."
      : `Vill du ta bort ${fullName || "den här spelaren"} permanent?`
    const secondPrompt = isSelfDelete
      ? "Det går inte att ångra. Bekräfta igen att du vill ta bort ditt konto."
      : `Bekräfta igen att ${fullName || "spelaren"} ska tas bort permanent.`

    if (!window.confirm(firstPrompt) || !window.confirm(secondPrompt)) {
      return
    }

    const sessionToken = await ensureFreshSession()
    if (!sessionToken) return

    if (isSelfDelete) {
      setIsDeletingOwnAccount(true)
    } else {
      setDeletingPlayerId(playerId)
    }

    const { data, error } = await supabase.functions.invoke("delete-player", {
      headers: {
        Authorization: `Bearer ${sessionToken}`,
      },
      body: {
        player_id: playerId,
      },
    })

    if (error) {
      console.error(error)
      setStatus(await getFunctionErrorMessage(error, "Kunde inte ta bort spelaren"))
      setDeletingPlayerId(null)
      setIsDeletingOwnAccount(false)
      return
    }

    if (data?.error) {
      setStatus(data.error)
      setDeletingPlayerId(null)
      setIsDeletingOwnAccount(false)
      return
    }

    if (isSelfDelete) {
      await supabase.auth.signOut()
      window.location.href = "/"
      return
    }

    setPlayers((prev) => prev.filter((entry) => entry.id !== playerId))
    setAllUsers((prev) => prev.filter((entry) => entry.id !== playerId))
    setMessageRecipients((prev) => prev.filter((entry) => entry.id !== playerId))
    setSelectedPlayer((prev) => (prev?.id === playerId ? null : prev))
    setStatus("Spelare borttagen ✅")
    setDeletingPlayerId(null)
  }

  const loadPlayerTargets = async (playerId) => {
    setIsLoadingTargets(true)

    const { data, error } = await supabase
      .from("player_exercise_targets")
      .select(
        "pass_name, exercise_name, target_sets, target_reps, target_reps_min, target_reps_max, target_reps_text, target_reps_mode, target_comment"
      )
      .eq("player_id", playerId)

    if (error) {
      console.error(error)
      setTargetDrafts({})
      setSelectedPlayerAssignedPasses([])
      setIsLoadingTargets(false)
      return
    }

    const draftMap = {}
    const assignedPasses = new Set()

    ;(data || []).forEach((row) => {
      if (!row.pass_name) return

      assignedPasses.add(row.pass_name)

      if (row.exercise_name === PASS_ASSIGNMENT_EXERCISE_NAME) {
        return
      }

      if (!draftMap[row.pass_name]) {
        draftMap[row.pass_name] = {}
      }

      draftMap[row.pass_name][row.exercise_name] = {
        target_sets: row.target_sets ?? "",
        target_reps: getRepTargetInputValue(row),
        target_reps_mode: row.target_reps_mode || "fixed",
        target_comment: row.target_comment ?? "",
      }
    })

    setTargetDrafts(draftMap)
    setSelectedPlayerAssignedPasses(Array.from(assignedPasses))
    setIsLoadingTargets(false)
  }

  const loadPassAssignmentPlayerIdsByPass = async (playerIdsOverride = null) => {
    const scopedPlayerIds = Array.from(
      new Set(
        (playerIdsOverride ||
          players.filter((player) => player?.role === "player").map((player) => player.id)
        ).filter(Boolean)
      )
    )

    if (scopedPlayerIds.length === 0) {
      setPassAssignmentPlayerIdsByPass({})
      return
    }

    const { data, error } = await supabase
      .from("player_exercise_targets")
      .select("player_id, pass_name")
      .eq("exercise_name", PASS_ASSIGNMENT_EXERCISE_NAME)
      .in("player_id", scopedPlayerIds)

    if (error) {
      console.error(error)
      setPassAssignmentPlayerIdsByPass({})
      return
    }

    const nextMap = {}

    ;(data || []).forEach((row) => {
      if (!row?.pass_name || !row?.player_id) return
      if (!nextMap[row.pass_name]) {
        nextMap[row.pass_name] = []
      }

      if (!nextMap[row.pass_name].includes(row.player_id)) {
        nextMap[row.pass_name].push(row.player_id)
      }
    })

    setPassAssignmentPlayerIdsByPass(nextMap)
  }

  const loadSelectedPlayerHistoryAndGoals = async (playerId) => {
    if (!playerId) {
      setSelectedPlayerHistory([])
      setSelectedPlayerCompletedSessions([])
      setSelectedPlayerExerciseGoals({})
      setExerciseGoalDrafts({})
      return
    }

    setIsLoadingSelectedPlayerHistory(true)

    const historyQuery = () =>
      supabase
        .from("workout_logs")
        .select(
          "workout_session_id, created_at, pass_name, exercise, set_number, weight, reps, seconds, set_type, exercise_comment, pass_comment, workout_kind, running_type, interval_time, intervals_count, running_distance, running_time, average_pulse, running_origin, free_activity_type, running_interval_execution, running_total_elapsed_seconds"
        )
        .eq("user_id", playerId)
        .eq("is_completed", true)
        .order("created_at", { ascending: false })

    let historyResult = await historyQuery()
    if (historyResult.error && isMissingRunningLogColumnsError(historyResult.error)) {
      historyResult = await supabase
        .from("workout_logs")
        .select(
          "workout_session_id, created_at, pass_name, exercise, set_number, weight, reps, seconds, set_type, exercise_comment, pass_comment, workout_kind, running_type, interval_time, intervals_count, running_distance, running_time, average_pulse, running_origin, free_activity_type"
        )
        .eq("user_id", playerId)
        .eq("is_completed", true)
        .order("created_at", { ascending: false })
    }

    const [{ data: goalRows, error: goalsError }, { data: repTargetRows, error: repTargetsError }] =
      await Promise.all([
        supabase
          .from("player_exercise_goals")
          .select("exercise_id, target_sets, target_reps, comment")
          .eq("player_id", playerId),
        supabase
          .from("player_exercise_rep_targets")
          .select("exercise_id, rep_range_key, target_weight")
          .eq("player_id", playerId),
      ])

    const { data: historyRows, error: historyError } = historyResult

    if (historyError || goalsError || repTargetsError) {
      console.error(historyError || goalsError || repTargetsError)
      setSelectedPlayerHistory([])
      setSelectedPlayerCompletedSessions([])
      setSelectedPlayerExerciseGoals({})
      setExerciseGoalDrafts({})
      setIsLoadingSelectedPlayerHistory(false)
      return
    }

    const repRangeWeightsByExerciseId = buildRepRangeWeightsByExercise(repTargetRows || [])

    const goalsByExerciseId = (goalRows || []).reduce((acc, row) => {
      acc[row.exercise_id] = {
        ...row,
        rep_range_weights: normalizeRepRangeWeights(repRangeWeightsByExerciseId[row.exercise_id]),
      }
      return acc
    }, {})

    Object.entries(repRangeWeightsByExerciseId).forEach(([exerciseId, repRangeWeights]) => {
      if (!goalsByExerciseId[exerciseId]) {
        goalsByExerciseId[exerciseId] = {
          exercise_id: exerciseId,
          target_sets: null,
          target_reps: null,
          comment: null,
          rep_range_weights: normalizeRepRangeWeights(repRangeWeights),
        }
        return
      }

      goalsByExerciseId[exerciseId] = {
        ...goalsByExerciseId[exerciseId],
        rep_range_weights: normalizeRepRangeWeights(repRangeWeights),
      }
    })

    const nextHistory = summarizeHistoryRowsByExercise(historyRows || [])
      .map((exerciseHistory) => {
        const matchedExercise = findExerciseByLoggedName(exercisesFromDB, exerciseHistory.exercise_name)
        if (!matchedExercise?.id) return null

        const latestEntry = exerciseHistory.entries[0] || null
        const bestWeightEntry =
          exerciseHistory.entries.find((entry) => entry.top_weight != null) || latestEntry || null
        const existingGoal =
          goalsByExerciseId[matchedExercise.id] ||
          (repRangeWeightsByExerciseId[matchedExercise.id]
            ? {
                exercise_id: matchedExercise.id,
                target_sets: null,
                target_reps: null,
                target_weight: null,
                comment: null,
                rep_range_weights: normalizeRepRangeWeights(repRangeWeightsByExerciseId[matchedExercise.id]),
              }
            : null)

        return {
          exercise_id: matchedExercise.id,
          exercise_name: matchedExercise.name,
          exercise_display_name: getExerciseDisplayName(matchedExercise),
          latest_entry: latestEntry,
          best_weight_entry: bestWeightEntry,
          entry_count: exerciseHistory.entries.length,
          existing_goal: existingGoal,
        }
      })
      .filter(Boolean)
    const nextCompletedSessions = buildCoachPlayerCompletedSessions(historyRows || [], exercisesFromDB)

    const historyByExerciseId = nextHistory.reduce((acc, entry) => {
      acc[entry.exercise_id] = entry
      return acc
    }, {})

    const draftExerciseIds = Array.from(
      new Set([...nextHistory.map((entry) => entry.exercise_id), ...Object.keys(goalsByExerciseId)])
    )

    const nextDrafts = draftExerciseIds.reduce((acc, exerciseId) => {
      const historyEntry = historyByExerciseId[exerciseId]
      const existingGoal = goalsByExerciseId[exerciseId] || historyEntry?.existing_goal || null
      const prefill = buildExerciseGoalPrefill(
        historyEntry?.best_weight_entry || historyEntry?.latest_entry || null
      )

      acc[exerciseId] = existingGoal
        ? {
            target_sets: existingGoal.target_sets ?? "",
            target_reps: existingGoal.target_reps ?? "",
            comment: existingGoal.comment ?? "",
            rep_range_weights: normalizeRepRangeWeights(existingGoal.rep_range_weights),
          }
        : {
            ...prefill,
            rep_range_weights: createEmptyRepRangeWeights(),
          }

      return acc
    }, {})

    setSelectedPlayerHistory(nextHistory)
    setSelectedPlayerCompletedSessions(nextCompletedSessions)
    setSelectedPlayerExerciseGoals(goalsByExerciseId)
    setExerciseGoalDrafts(nextDrafts)
    setIsLoadingSelectedPlayerHistory(false)
  }

  useEffect(() => {
    const loadCurrentPlayerRepTargets = async () => {
      if (!user?.id || profile?.role !== "player") {
        setPlayerExerciseRepTargets({})
        return
      }

      const nextTargets = await loadExerciseRepTargetsForPlayer(user.id)
      setPlayerExerciseRepTargets(nextTargets)
    }

    loadCurrentPlayerRepTargets()
  }, [user?.id, profile?.role])

  const loadCompletedWorkoutSessions = async (userId) => {
    if (!userId) {
      setCompletedWorkoutSessions([])
      setWorkoutDateDrafts({})
      return
    }

    setIsLoadingCompletedWorkoutSessions(true)

    let { data, error } = await supabase
      .from("workout_logs")
      .select(
        "workout_session_id, created_at, pass_name, exercise, set_number, set_type, is_completed, workout_kind, running_type, interval_time, intervals_count, running_distance, running_time, average_pulse, running_origin, free_activity_type, running_interval_execution, running_total_elapsed_seconds"
      )
      .eq("user_id", userId)
      .eq("is_completed", true)
      .order("created_at", { ascending: false })

    if (error && isMissingRunningLogColumnsError(error)) {
      ;({ data, error } = await supabase
        .from("workout_logs")
        .select(
          "workout_session_id, created_at, pass_name, exercise, set_number, set_type, is_completed, workout_kind, running_type, interval_time, intervals_count, running_distance, running_time, average_pulse, running_origin, free_activity_type"
        )
        .eq("user_id", userId)
        .eq("is_completed", true)
        .order("created_at", { ascending: false }))
    }

    if (error) {
      console.error(error)
      setCompletedWorkoutSessions([])
      setWorkoutDateDrafts({})
      setIsLoadingCompletedWorkoutSessions(false)
      return
    }

    const groupedSessions = new Map()

    ;(data || []).forEach((row) => {
      const sessionId =
        row.workout_session_id ||
        `${String(row.created_at || "").slice(0, 19)}:${row.pass_name || ""}:${row.exercise || ""}`

      if (!groupedSessions.has(sessionId)) {
        groupedSessions.set(sessionId, {
          session_id: sessionId,
          created_at: row.created_at,
          pass_name: formatLoggedPassName(row.pass_name, {
            workoutKind: row.workout_kind,
            runningOrigin: row.running_origin,
          }),
          workout_kind: row.workout_kind || "gym",
          running_type: row.running_type || null,
          running_interval_execution: row.running_interval_execution || null,
          running_total_elapsed_seconds: row.running_total_elapsed_seconds ?? null,
          interval_time: row.interval_time || null,
          intervals_count: row.intervals_count ?? null,
          running_distance: row.running_distance ?? null,
          running_time: row.running_time || null,
          average_pulse: row.average_pulse ?? null,
          running_origin: row.running_origin || null,
          free_activity_type: row.free_activity_type || "running",
          rows: [],
        })
      }

      groupedSessions.get(sessionId).rows.push(row)
    })

    const sessions = Array.from(groupedSessions.values())
      .map((session) => {
        const exerciseNames = Array.from(
          new Set(session.rows.map((row) => String(row.exercise || "").trim()).filter(Boolean))
        )

        return {
          ...session,
          exercise_names: exerciseNames,
          exercise_count:
            session.workout_kind === "running"
              ? 1
              : exerciseNames.length,
          summary:
            session.workout_kind === "running"
              ? buildRunningSummary(session)
              : exerciseNames.slice(0, 3).join(", "),
          session_label:
            formatLoggedPassName(session.pass_name, {
              workoutKind: session.workout_kind,
              runningOrigin: session.running_origin,
              freeActivityType: session.free_activity_type,
            }),
        }
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    setCompletedWorkoutSessions(sessions)
    setWorkoutDateDrafts(
      sessions.reduce((acc, session) => {
        acc[session.session_id] = String(session.created_at || "").slice(0, 10)
        return acc
      }, {})
    )
    setIsLoadingCompletedWorkoutSessions(false)
  }

  const loadPlayerExerciseProgress = async (userId) => {
    if (!userId) {
      setPlayerExerciseProgress([])
      setSelectedPlayerStatsExerciseIds([])
      setPlayerStatsPickerValue("")
      return
    }

    setIsLoadingPlayerExerciseProgress(true)

    const { data, error } = await supabase
      .from("workout_logs")
      .select(
        "workout_session_id, created_at, pass_name, exercise, set_number, weight, reps, seconds, set_type, exercise_comment, pass_comment, workout_kind"
      )
      .eq("user_id", userId)
      .eq("is_completed", true)
      .order("created_at", { ascending: false })

    if (error) {
      console.error(error)
      setPlayerExerciseProgress([])
      setSelectedPlayerStatsExerciseIds([])
      setPlayerStatsPickerValue("")
      setIsLoadingPlayerExerciseProgress(false)
      return
    }

    const nextProgress = buildPlayerExerciseProgress(data || [], exercisesFromDB)
    setPlayerExerciseProgress(nextProgress)
    setSelectedPlayerStatsExerciseIds((current) =>
      current.filter((exerciseId) => nextProgress.some((entry) => entry.exercise_id === exerciseId))
    )
    setPlayerStatsPickerValue((current) =>
      nextProgress.some((entry) => entry.exercise_id === current && entry.is_relevant_for_player_stats) ? current : ""
    )
    setIsLoadingPlayerExerciseProgress(false)
  }

  const generateSessionId = () => {
    return `session-${Date.now()}`
  }

  const generateSetId = (exerciseIndex, setIndex) => {
    return `set-${exerciseIndex}-${setIndex}-${Date.now()}`
  }

  const formatDate = (dateString) => {
    if (!dateString) return "Aldrig"
    return new Date(dateString).toLocaleDateString("sv-SE")
  }

  const formatDaysSince = (dateString) => {
    if (!dateString) return "aldrig kört"

    const now = new Date()
    const then = new Date(dateString)
    const diffMs = now.getTime() - then.getTime()
    const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))

    if (diffDays === 0) return "idag"
    if (diffDays === 1) return "1 dag sedan"
    return `${diffDays} dagar sedan`
  }

  const getDaysSinceNumber = (dateString) => {
    if (!dateString) return Number.POSITIVE_INFINITY

    const now = new Date()
    const then = new Date(dateString)
    return Math.max(0, Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24)))
  }

  const getPassStatus = (dateString) => {
    if (!dateString) {
      return {
        label: "Inte startat än",
        backgroundColor: "#f3f4f6",
        color: "#4b5563",
      }
    }

    const now = new Date()
    const then = new Date(dateString)
    const diffDays = Math.max(0, Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24)))

    if (diffDays === 0) {
      return {
        label: "Kört idag",
        backgroundColor: "#ecfdf3",
        color: "#166534",
      }
    }

    if (diffDays <= 3) {
      return {
        label: "Kört nyligen",
        backgroundColor: "#eff6ff",
        color: "#1d4ed8",
      }
    }

    if (diffDays <= 7) {
      return {
        label: "Dags snart igen",
        backgroundColor: "#fff7ed",
        color: "#c2410c",
      }
    }

    return {
      label: "Länge sedan",
      backgroundColor: "#fef2f2",
      color: "#b91c1c",
    }
  }

  const formatLatestSetValue = (exerciseType, set) => {
    if (!set) return "-"

    if (exerciseType === "weight_reps") {
      return `${set.weight ?? "-"} kg x ${set.reps ?? "-"} reps`
    }

    if (exerciseType === "reps_only") {
      return `${set.reps ?? "-"} reps`
    }

    return `${set.seconds ?? "-"} sek`
  }

  const isMissingWorkoutTemplateInfoColumnError = (error) => {
    const message = String(error?.message || "").toLowerCase()

    return (
      message.includes("info") &&
      (message.includes("column") ||
        message.includes("schema cache") ||
        message.includes("could not find"))
    )
  }

  const isMissingRunningLogColumnsError = (error) => {
    const message = String(error?.message || "").toLowerCase()

    return (
      (message.includes("running_interval_execution") ||
        message.includes("running_total_elapsed_seconds")) &&
      (message.includes("column") ||
        message.includes("schema cache") ||
        message.includes("could not find"))
    )
  }

  const stripExtendedRunningLogFields = (payload) => {
    const nextPayload = { ...payload }
    delete nextPayload.running_interval_execution
    delete nextPayload.running_total_elapsed_seconds
    return nextPayload
  }

  const saveRunningWorkoutLog = async (payload) => {
    let { error } = await supabase.from("workout_logs").insert(payload)

    if (error && isMissingRunningLogColumnsError(error)) {
      ;({ error } = await supabase
        .from("workout_logs")
        .insert(stripExtendedRunningLogFields(payload)))
    }

    return { error }
  }

  const resetPassEditorState = (templateCode = selectedTemplateCode) => {
    const selectedTemplate = templatesFromDB.find((template) => template.code === templateCode)

    setRenamePassName(selectedTemplate?.label || "")
    setRenamePassInfo(selectedTemplate?.info || "")
    setRenamePassWarmupCardio(selectedTemplate?.warmup_cardio || "")
    setRenamePassWarmupTechnique(selectedTemplate?.warmup_technique || "")
    setRenamePassWorkoutKind(selectedTemplate?.workout_kind || "gym")
    setRenamePassGymPassType(selectedTemplate?.gym_pass_type || "individual")
    setRenamePassRunningType(selectedTemplate?.running_type || "intervals")
    setRenamePassRunningIntervalProgram(
      storedProgramToDraft(selectedTemplate?.running_interval_program, {
        interval_time: selectedTemplate?.running_interval_time,
        intervals_count: selectedTemplate?.running_intervals_count,
      })
    )
    setRenamePassRunningDistance(
      selectedTemplate?.running_distance != null ? String(selectedTemplate.running_distance) : ""
    )
    setRenamePassRunningTime(selectedTemplate?.running_time || "")
    setRenameWarmupTemplateName("")
    setPassExerciseDrafts({})
    setSelectedExerciseId("")
  }

  const applyWarmupTemplateToCreate = (templateId) => {
    const template = warmupTemplates.find((entry) => entry.id === templateId)
    if (!template) return

    setNewPassWarmupCardio(template.cardio || "")
    setNewPassWarmupTechnique(template.technique || "")
    setStatus(`Uppvärmningsmall ${template.name} vald`)
  }

  const applyWarmupTemplateToEdit = (templateId) => {
    const template = warmupTemplates.find((entry) => entry.id === templateId)
    if (!template) return

    setRenamePassWarmupCardio(template.cardio || "")
    setRenamePassWarmupTechnique(template.technique || "")
    setStatus(`Uppvärmningsmall ${template.name} vald`)
  }

  const saveWarmupTemplate = async (name, cardio, technique, onSaved) => {
    if (!profile?.team_id) {
      setStatus("Kunde inte hitta lag för uppvärmningsmall")
      return
    }

    if (!name.trim()) {
      setStatus("Ange namn på uppvärmningsmallen")
      return
    }

    setIsSavingWarmupTemplate(true)

    const { data, error } = await supabase
      .from("warmup_templates")
      .upsert(
        {
          team_id: profile.team_id,
          name: name.trim(),
          cardio: cardio.trim() || null,
          technique: technique.trim() || null,
        },
        { onConflict: "team_id,name" }
      )
      .select("id, name, cardio, technique")
      .single()

    if (error) {
      console.error(error)
      setStatus(`Kunde inte spara uppvärmningsmall${error.message ? `: ${error.message}` : ""}`)
      setIsSavingWarmupTemplate(false)
      return
    }

    setWarmupTemplates((prev) =>
      [...prev.filter((entry) => entry.id !== data.id && entry.name !== data.name), data].sort((a, b) =>
        a.name.localeCompare(b.name, "sv")
      )
    )
    onSaved?.()
    setStatus("Uppvärmningsmall sparad ✅")
    setIsSavingWarmupTemplate(false)
  }

  const isVideoUrl = (url) => {
    return /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url || "")
  }

  const parseCsvLine = (line) => {
    const values = []
    let current = ""
    let inQuotes = false

    for (let i = 0; i < line.length; i += 1) {
      const char = line[i]
      const nextChar = line[i + 1]

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"'
          i += 1
        } else {
          inQuotes = !inQuotes
        }
        continue
      }

      if ((char === "," || char === ";") && !inQuotes) {
        values.push(current.trim())
        current = ""
        continue
      }

      current += char
    }

    values.push(current.trim())
    return values
  }

  const parseImportedPlayersFromRows = (rows) => {
    return rows
      .map((row, index) => {
        const normalizedEntries = Object.entries(row).reduce((acc, [key, value]) => {
          acc[normalizeImportHeader(key)] = String(value || "").trim()
          return acc
        }, {})

        const fullName =
          normalizedEntries.fullname ||
          normalizedEntries.namn ||
          normalizedEntries.fullstandigtnamn ||
          normalizedEntries.playername ||
          normalizedEntries.name ||
          ""

        const password =
          normalizedEntries.password ||
          normalizedEntries.losenord ||
          normalizedEntries.startlosenord ||
          normalizedEntries.passord ||
          ""

        return {
          rowNumber: index + 2,
          full_name: fullName,
          password,
        }
      })
      .filter((row) => row.full_name || row.password)
  }

  const parseCsvContent = (content) => {
    const lines = content
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .split("\n")
      .filter((line) => line.trim().length > 0)

    if (lines.length < 2) {
      return []
    }

    const headers = parseCsvLine(lines[0])

    return parseImportedPlayersFromRows(
      lines.slice(1).map((line) => {
        const values = parseCsvLine(line)

        return headers.reduce((acc, header, index) => {
          acc[header] = values[index] ?? ""
          return acc
        }, {})
      })
    )
  }

  const getCalendarWeekRange = () => {
    const start = new Date(`${calendarWeekStart}T00:00:00`)
    const end = new Date(start)
    end.setDate(end.getDate() + 7)
    return {
      startIso: start.toISOString(),
      endIso: end.toISOString(),
    }
  }

  const loadCalendarImportSource = async (teamId = profile?.team_id) => {
    if (profile?.role !== "coach" || !teamId) {
      setCalendarImportSource(null)
      setCalendarImportFeedUrl("")
      setCalendarImportEnabled(true)
      return null
    }

    const { data, error } = await supabase
      .from("external_calendar_sources")
      .select("id, team_id, created_by, provider, feed_url, is_enabled, last_synced_at, last_sync_status, last_sync_error")
      .eq("team_id", teamId)
      .eq("provider", "laget_se")
      .maybeSingle()

    if (error) {
      console.error(error)
      setCalendarImportSource(null)
      return null
    }

    setCalendarImportSource(data || null)
    setCalendarImportFeedUrl(data?.feed_url || "")
    setCalendarImportEnabled(data?.is_enabled ?? true)
    return data || null
  }

  const invokeLagetSeCalendarSync = async ({ force = false, silent = false } = {}) => {
    if (!user || !profile || !["coach", "player"].includes(profile.role)) {
      return { ok: false, skipped: "unauthorized" }
    }

    if (calendarAutoSyncInFlightRef.current) {
      return { ok: true, skipped: "in_flight" }
    }

    const accessToken = await ensureFreshSession()
    if (!accessToken) {
      return { ok: false, skipped: "missing_session" }
    }

    calendarAutoSyncInFlightRef.current = true
    if (force) {
      setIsSyncingCalendarImportSource(true)
    }

    try {
      const { data, error } = await supabase.functions.invoke("sync-laget-se-calendar", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: {
          force,
        },
      })

      if (error) {
        console.error(error)
        if (!silent) {
          setStatus(await getFunctionErrorMessage(error, "Kunde inte synka laget.se-kalendern"))
        }
        return { ok: false, error }
      }

      if (data?.error) {
        if (!silent) {
          setStatus(data.error)
        }
        return { ok: false, data }
      }

      if (profile.role === "coach") {
        await loadCalendarImportSource()
      }

      if (!silent) {
        if (data?.skipped === "no_source") {
          setStatus("Ingen laget.se-kalender är ansluten ännu")
        } else if (data?.skipped === "fresh") {
          setStatus("laget.se-kalendern är redan uppdaterad")
        } else if (data?.synced) {
          const summary = [
            data?.stats?.created ? `${data.stats.created} nya` : null,
            data?.stats?.updated ? `${data.stats.updated} uppdaterade` : null,
            data?.stats?.cancelled ? `${data.stats.cancelled} inställda` : null,
          ]
            .filter(Boolean)
            .join(" · ")

          setStatus(summary ? `laget.se synkad ✅ ${summary}` : "laget.se synkad ✅")
        }
      }

      return data || { ok: true }
    } finally {
      calendarAutoSyncInFlightRef.current = false
      if (force) {
        setIsSyncingCalendarImportSource(false)
      }
    }
  }

  const handleSaveCalendarImportSource = async () => {
    if (profile?.role !== "coach" || !profile?.team_id || !user?.id) {
      setStatus("Kunde inte spara laget.se-kalendern")
      return
    }

    const normalizedFeedUrl = normalizeLagetSeFeedInput(calendarImportFeedUrl)

    if (!normalizedFeedUrl) {
      setStatus("Klistra in en kalenderlänk från laget.se först")
      return
    }

    setIsSavingCalendarImportSource(true)

    const { data, error } = await supabase
      .from("external_calendar_sources")
      .upsert(
        {
          team_id: profile.team_id,
          created_by: user.id,
          provider: "laget_se",
          feed_url: normalizedFeedUrl,
          is_enabled: calendarImportEnabled,
        },
        { onConflict: "team_id,provider" }
      )
      .select("id, team_id, created_by, provider, feed_url, is_enabled, last_synced_at, last_sync_status, last_sync_error")
      .single()

    if (error) {
      console.error(error)
      setStatus("Kunde inte spara laget.se-kalendern")
      setIsSavingCalendarImportSource(false)
      return
    }

    setCalendarImportSource(data)
    setCalendarImportFeedUrl(data.feed_url || normalizedFeedUrl)
    setCalendarImportEnabled(data.is_enabled ?? true)
    setStatus("laget.se-kalender sparad ✅")
    setIsSavingCalendarImportSource(false)
  }

  const buildCalendarEntriesFromRows = (rows) =>
    (rows || [])
      .map((row) => {
        const playerLinks = (row.calendar_event_players || []).map((link) => ({
          id: link.id,
          player_id: link.player_id,
          completion_status: link.completion_status || "planned",
          assignment_source: link.assignment_source || "direct",
          linked_workout_session_id: link.linked_workout_session_id || null,
          completed_at: link.completed_at || null,
          player_name:
            link.player?.full_name ||
            link.player?.username ||
            players.find((player) => player.id === link.player_id)?.full_name ||
            "Spelare",
        }))
        const groups = (row.calendar_event_groups || [])
          .map((group) => ({
            id: group.id,
            name: group.name || "",
            sort_order: group.sort_order ?? 0,
            members: (group.calendar_event_group_members || []).map((member) => ({
              id: member.id,
              calendar_event_player_id: member.calendar_event_player_id,
              player_id: member.player_id,
              player_name: member.player_name || "Spelare",
            })),
          }))
          .sort((a, b) => {
            if ((a.sort_order ?? 0) !== (b.sort_order ?? 0)) {
              return (a.sort_order ?? 0) - (b.sort_order ?? 0)
            }

            return String(a.name || "").localeCompare(String(b.name || ""), "sv")
          })

        const summary = playerLinks.reduce(
          (acc, link) => {
            acc[link.completion_status] = (acc[link.completion_status] || 0) + 1
            return acc
          },
          { planned: 0, completed: 0, skipped: 0, cancelled: 0 }
        )

        return {
          id: row.id,
          series_id: row.series_id,
          title: row.title,
          description: row.description || "",
          activity_kind: row.activity_kind,
          workout_template_id: row.workout_template_id || null,
          free_activity_type: row.free_activity_type || null,
          location: row.location || "",
          starts_at: row.starts_at,
          ends_at: row.ends_at,
          is_cancelled: row.is_cancelled === true,
          is_external: row.is_external === true,
          external_provider: row.external_provider || null,
          external_source_id: row.external_source_id || null,
          external_event_uid: row.external_event_uid || null,
          groups,
          player_links: playerLinks,
          current_user_link: playerLinks.find((link) => link.player_id === user?.id) || null,
          summary,
        }
      })
      .map((entry) => {
        if (!entry.current_user_link?.id || !entry.groups.length) {
          return {
            ...entry,
            current_user_group: null,
          }
        }

        const currentUserGroup =
          entry.groups.find((group) =>
            group.members.some((member) => member.calendar_event_player_id === entry.current_user_link.id)
          ) || null

        return {
          ...entry,
          current_user_group: currentUserGroup,
        }
      })
      .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())

  const loadCalendarEntries = async () => {
    if (!profile?.team_id || !user || !["coach", "player"].includes(profile.role)) {
      setCalendarEntries([])
      return
    }

    setIsLoadingCalendar(true)

    await invokeLagetSeCalendarSync({ force: false, silent: true })

    const { startIso, endIso } = getCalendarWeekRange()

    let query = supabase
      .from("calendar_events")
      .select(`
        id,
        series_id,
        title,
        description,
        activity_kind,
        workout_template_id,
        free_activity_type,
        location,
        starts_at,
        ends_at,
        is_cancelled,
        is_external,
        external_provider,
        external_source_id,
        external_event_uid,
        calendar_event_groups (
          id,
          name,
          sort_order,
          calendar_event_group_members (
            id,
            calendar_event_player_id,
            player_id,
            player_name
          )
        ),
        calendar_event_players (
          id,
          player_id,
          assignment_source,
          completion_status,
          linked_workout_session_id,
          completed_at,
          player:profiles!calendar_event_players_player_id_fkey (
            id,
            full_name,
            username
          )
        )
      `)
      .eq("team_id", profile.team_id)
      .eq("is_cancelled", false)
      .gte("starts_at", startIso)
      .lt("starts_at", endIso)
      .order("starts_at", { ascending: true })

    if (profile.role === "player") {
      query = query.eq("calendar_event_players.player_id", user.id)
    }

    const { data, error } = await query

    if (error) {
      console.error(error)
      setCalendarEntries([])
      setIsLoadingCalendar(false)
      return
    }

    setCalendarEntries(buildCalendarEntriesFromRows(data || []))
    setIsLoadingCalendar(false)
  }

  const handleCreateCalendarActivity = async (payloadOrError) => {
    if (payloadOrError?.error) {
      setStatus(payloadOrError.error)
      return { ok: false }
    }

    if (!profile?.team_id || !user || !payloadOrError) {
      setStatus("Kunde inte skapa kalenderaktiviteten")
      return { ok: false }
    }

    const targetPlayerIds =
      profile.role === "coach"
        ? payloadOrError.target_mode === "selected"
          ? payloadOrError.player_ids
          : players.filter((player) => !player.is_archived).map((player) => player.id)
        : [user.id]

    if (!targetPlayerIds.length) {
      setStatus("Det finns inga spelare att lägga in aktiviteten för ännu")
      return { ok: false }
    }

    setIsSubmittingCalendar(true)

    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Stockholm"
    const recurrenceWeekdays = payloadOrError.is_recurring ? [new Date(payloadOrError.starts_at).getDay()] : null

    const { data: seriesRow, error: seriesError } = await supabase
      .from("calendar_series")
      .insert({
        team_id: profile.team_id,
        created_by: user.id,
        title: payloadOrError.title,
        description: payloadOrError.description || null,
        activity_kind: payloadOrError.activity_kind,
        workout_template_id: payloadOrError.workout_template_id,
        free_activity_type: payloadOrError.free_activity_type,
        location: payloadOrError.location,
        starts_at: payloadOrError.starts_at,
        ends_at: payloadOrError.ends_at,
        timezone,
        is_recurring: payloadOrError.is_recurring,
        recurrence_freq: payloadOrError.is_recurring ? "weekly" : null,
        recurrence_interval: payloadOrError.is_recurring ? 1 : null,
        recurrence_weekdays: recurrenceWeekdays,
        recurrence_until: payloadOrError.is_recurring ? payloadOrError.recurrence_until : null,
      })
      .select("id")
      .single()

    if (seriesError || !seriesRow?.id) {
      console.error(seriesError)
      setStatus(await getFunctionErrorMessage(seriesError, "Kunde inte skapa kalenderaktiviteten"))
      setIsSubmittingCalendar(false)
      return { ok: false }
    }

    const startsAt = new Date(payloadOrError.starts_at)
    const endsAt = new Date(payloadOrError.ends_at)
    const untilDate = payloadOrError.is_recurring
      ? new Date(`${payloadOrError.recurrence_until}T23:59:59`)
      : startsAt
    const eventRows = []

    let currentStart = new Date(startsAt)
    let currentEnd = new Date(endsAt)

    while (currentStart.getTime() <= untilDate.getTime()) {
      eventRows.push({
        series_id: seriesRow.id,
        team_id: profile.team_id,
        created_by: user.id,
        title: payloadOrError.title,
        description: payloadOrError.description || null,
        activity_kind: payloadOrError.activity_kind,
        workout_template_id: payloadOrError.workout_template_id,
        free_activity_type: payloadOrError.free_activity_type,
        location: payloadOrError.location,
        starts_at: currentStart.toISOString(),
        ends_at: currentEnd.toISOString(),
        timezone,
        source_date: currentStart.toISOString().slice(0, 10),
      })

      if (!payloadOrError.is_recurring) break

      currentStart = new Date(currentStart.getTime() + 7 * 24 * 60 * 60 * 1000)
      currentEnd = new Date(currentEnd.getTime() + 7 * 24 * 60 * 60 * 1000)
    }

    const { data: insertedEvents, error: eventsError } = await supabase
      .from("calendar_events")
      .insert(eventRows)
      .select("id")

    if (eventsError || !insertedEvents?.length) {
      console.error(eventsError)
      setStatus(await getFunctionErrorMessage(eventsError, "Kunde inte skapa kalenderhändelserna"))
      setIsSubmittingCalendar(false)
      return { ok: false }
    }

    const assignmentSource =
      profile.role === "coach"
        ? payloadOrError.target_mode === "selected"
          ? "direct"
          : "team"
        : "self"

    const playerRows = insertedEvents.flatMap((eventRow) =>
      targetPlayerIds.map((playerId) => ({
        calendar_event_id: eventRow.id,
        player_id: playerId,
        assignment_source: assignmentSource,
        completion_status: "planned",
      }))
    )

    const { error: playerError } = await supabase
      .from("calendar_event_players")
      .insert(playerRows)

    if (playerError) {
      console.error(playerError)
      setStatus(
        await getFunctionErrorMessage(
          playerError,
          "Kalenderaktiviteten skapades men spelarkopplingen misslyckades"
        )
      )
      setIsSubmittingCalendar(false)
      await loadCalendarEntries()
      return { ok: false }
    }

    setStatus("Kalenderaktivitet sparad ✅")
    setIsSubmittingCalendar(false)
    await loadCalendarEntries()
    return { ok: true }
  }

  const handleUpdateCalendarEventPlayerStatus = async (calendarEventPlayerId, nextStatus) => {
    if (!calendarEventPlayerId || !nextStatus) return

    setUpdatingCalendarEventPlayerId(calendarEventPlayerId)

    const { error } = await supabase
      .from("calendar_event_players")
      .update({
        completion_status: nextStatus,
        completed_at: nextStatus === "completed" ? new Date().toISOString() : null,
        linked_workout_session_id: nextStatus === "completed" ? undefined : null,
      })
      .eq("id", calendarEventPlayerId)

    if (error) {
      console.error(error)
      setStatus("Kunde inte uppdatera kalenderstatus")
      setUpdatingCalendarEventPlayerId(null)
      return
    }

    setUpdatingCalendarEventPlayerId(null)
    await loadCalendarEntries()
  }

  const handleSaveCalendarActivity = async (entry, payloadOrError) => {
    if (payloadOrError?.error) {
      setStatus(payloadOrError.error)
      return { ok: false }
    }

    if (!entry?.id || !payloadOrError) {
      setStatus("Kunde inte spara kalenderaktiviteten")
      return { ok: false }
    }

    if (entry.is_external) {
      setStatus("Importerade laget.se-pass kan inte redigeras i appen")
      return { ok: false }
    }

    setIsSavingCalendarActivity(true)

    const { error: updateError } = await supabase
      .from("calendar_events")
      .update({
        title: payloadOrError.title,
        description: payloadOrError.description || null,
        activity_kind: payloadOrError.activity_kind,
        workout_template_id: payloadOrError.workout_template_id,
        free_activity_type: payloadOrError.free_activity_type,
        location: payloadOrError.location,
        starts_at: payloadOrError.starts_at,
        ends_at: payloadOrError.ends_at,
      })
      .eq("id", entry.id)

    if (updateError) {
      console.error(updateError)
      setStatus("Kunde inte spara ändringen")
      setIsSavingCalendarActivity(false)
      return { ok: false }
    }

    if (profile?.role === "coach") {
      const existingLinks = Array.isArray(entry.player_links) ? entry.player_links : []
      const nextPlayerIds =
        payloadOrError.target_mode === "selected"
          ? payloadOrError.player_ids
          : players.filter((player) => !player.is_archived).map((player) => player.id)

      const removedLinkIds = existingLinks
        .filter((link) => !nextPlayerIds.includes(link.player_id))
        .map((link) => link.id)

      if (removedLinkIds.length > 0) {
        const { error: deleteError } = await supabase
          .from("calendar_event_players")
          .delete()
          .in("id", removedLinkIds)

        if (deleteError) {
          console.error(deleteError)
          setStatus("Spelarkopplingarna kunde inte uppdateras helt")
          setIsSavingCalendarActivity(false)
          await loadCalendarEntries()
          return { ok: false }
        }
      }

      const existingPlayerIds = existingLinks.map((link) => link.player_id)
      const playerRowsToInsert = nextPlayerIds
        .filter((playerId) => !existingPlayerIds.includes(playerId))
        .map((playerId) => ({
          calendar_event_id: entry.id,
          player_id: playerId,
          assignment_source: payloadOrError.target_mode === "selected" ? "direct" : "team",
          completion_status: "planned",
        }))

      if (playerRowsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from("calendar_event_players")
          .insert(playerRowsToInsert)

        if (insertError) {
          console.error(insertError)
          setStatus("Nya spelare kunde inte läggas till i aktiviteten")
          setIsSavingCalendarActivity(false)
          await loadCalendarEntries()
          return { ok: false }
        }
      }
    }

    setStatus("Kalenderaktivitet uppdaterad ✅")
    setIsSavingCalendarActivity(false)
    await loadCalendarEntries()
    return { ok: true }
  }

  const handleSaveCalendarEntryGroups = async (entry, nextGroups) => {
    if (!entry?.id) {
      setStatus("Kunde inte spara grupperna")
      return { ok: false }
    }

    const matchedWorkout =
      entry.activity_kind === "template_workout"
        ? Object.values(activeWorkouts || {}).find(
            (workout) => String(workout.id || "") === String(entry.workout_template_id || "")
          )
        : null

    if (!isSharedGymWorkout(matchedWorkout)) {
      setStatus("Grupper används bara för gemensamma gympass")
      return { ok: false }
    }

    const cleanedGroups = (nextGroups || [])
      .map((group, index) => ({
        name: String(group?.name || "").trim() || `Grupp ${index + 1}`,
        sort_order: index + 1,
        player_ids: Array.from(new Set((group?.player_ids || []).filter(Boolean))),
      }))
      .filter((group) => group.name)

    const playerLinkByPlayerId = (entry.player_links || []).reduce((acc, link) => {
      acc[link.player_id] = link
      return acc
    }, {})

    setIsSavingCalendarGroups(true)

    const { error: deleteError } = await supabase
      .from("calendar_event_groups")
      .delete()
      .eq("calendar_event_id", entry.id)

    if (deleteError) {
      console.error(deleteError)
      setStatus("Kunde inte rensa tidigare grupper")
      setIsSavingCalendarGroups(false)
      return { ok: false }
    }

    if (cleanedGroups.length === 0) {
      setStatus("Grupper borttagna från aktiviteten ✅")
      setIsSavingCalendarGroups(false)
      await loadCalendarEntries()
      return { ok: true }
    }

    const { data: insertedGroups, error: insertGroupsError } = await supabase
      .from("calendar_event_groups")
      .insert(
        cleanedGroups.map((group) => ({
          calendar_event_id: entry.id,
          name: group.name,
          sort_order: group.sort_order,
        }))
      )
      .select("id, sort_order")

    if (insertGroupsError || !insertedGroups?.length) {
      console.error(insertGroupsError)
      setStatus("Kunde inte spara grupperna")
      setIsSavingCalendarGroups(false)
      return { ok: false }
    }

    const insertedGroupBySortOrder = insertedGroups.reduce((acc, group) => {
      acc[group.sort_order] = group.id
      return acc
    }, {})

    const assignedPlayerIds = new Set()
    const memberRows = cleanedGroups.flatMap((group) => {
      const groupId = insertedGroupBySortOrder[group.sort_order]
      if (!groupId) return []

      return group.player_ids
        .map((playerId) => {
          if (assignedPlayerIds.has(playerId)) return null

          const playerLink = playerLinkByPlayerId[playerId]
          if (!playerLink?.id) return null

          assignedPlayerIds.add(playerId)

          return {
            calendar_event_group_id: groupId,
            calendar_event_player_id: playerLink.id,
            player_id: playerLink.player_id,
            player_name: playerLink.player_name || "Spelare",
          }
        })
        .filter(Boolean)
    })

    if (memberRows.length > 0) {
      const { error: insertMembersError } = await supabase
        .from("calendar_event_group_members")
        .insert(memberRows)

      if (insertMembersError) {
        console.error(insertMembersError)
        setStatus("Grupperna sparades men spelare kunde inte kopplas helt")
        setIsSavingCalendarGroups(false)
        await loadCalendarEntries()
        return { ok: false }
      }
    }

    setStatus("Grupper sparade för aktiviteten ✅")
    setIsSavingCalendarGroups(false)
    await loadCalendarEntries()
    return { ok: true }
  }

  const handleCancelCalendarActivity = async (entry) => {
    if (!entry?.id) return { ok: false }

    if (entry.is_external) {
      setStatus("Importerade laget.se-pass kan inte ändras i appen")
      return { ok: false }
    }

    const confirmLabel =
      profile?.role === "coach"
        ? `Vill du ställa in "${entry.title}"?`
        : `Vill du ta bort "${entry.title}" från kalendern?`

    if (!window.confirm(confirmLabel)) {
      return { ok: false }
    }

    setIsCancellingCalendarActivity(true)

    const { error: eventError } = await supabase
      .from("calendar_events")
      .update({ is_cancelled: true })
      .eq("id", entry.id)

    if (eventError) {
      console.error(eventError)
      setStatus("Kunde inte ställa in aktiviteten")
      setIsCancellingCalendarActivity(false)
      return { ok: false }
    }

    if (entry.player_links?.length) {
      const { error: linkError } = await supabase
        .from("calendar_event_players")
        .update({ completion_status: "cancelled" })
        .eq("calendar_event_id", entry.id)

      if (linkError) {
        console.error(linkError)
      }
    }

    setStatus(profile?.role === "coach" ? "Aktiviteten är inställd ✅" : "Aktiviteten togs bort ✅")
    setIsCancellingCalendarActivity(false)
    await loadCalendarEntries()
    return { ok: true }
  }

  const markCalendarEventPlayerCompleted = async (calendarEventPlayerId, workoutSessionId) => {
    if (!calendarEventPlayerId) return

    const { error } = await supabase
      .from("calendar_event_players")
      .update({
        completion_status: "completed",
        linked_workout_session_id: workoutSessionId,
        completed_at: new Date().toISOString(),
      })
      .eq("id", calendarEventPlayerId)

    if (error) {
      console.error(error)
      return
    }

    await loadCalendarEntries()
  }

  const handleOpenCalendarEntry = async (entry) => {
    if (!entry) return

    if (entry.is_external && entry.activity_kind === "handball") {
      navigatePlayerSection("calendar")
      return
    }

    if (entry.activity_kind === "template_workout") {
      const matchedWorkout = Object.entries(activeWorkouts || {}).find(
        ([, workout]) => String(workout.id) === String(entry.workout_template_id)
      )

      if (!matchedWorkout?.[0]) {
        setStatus("Det här passet kunde inte hittas i appen")
        return
      }

      await startWorkout(matchedWorkout[0], {
        calendarEventPlayerId: entry.current_user_link?.id || null,
        calendarEntry: entry,
      })
      return
    }

    const freeActivityType =
      entry.activity_kind === "handball"
        ? "handball"
        : entry.activity_kind === "custom"
        ? "custom"
        : entry.free_activity_type || "running"

    setPendingFreeActivityCalendarEvent({
      id: entry.current_user_link?.id || null,
      title: entry.title,
    })
    setRunningDraft({
      log_date: getDateInputValueFromTimestamp(entry.starts_at),
      free_activity_type: freeActivityType,
      custom_activity_title: freeActivityType === "custom" ? entry.title : "",
      running_type: "distance",
      interval_time: "",
      intervals_count: "",
      running_distance: "",
      running_time: "",
      average_pulse: "",
      comment: entry.description || "",
    })
    setPlayerOverviewPanel("running")
    setPlayerView("activity")
    setStatus(`Förifyllde aktivitet från kalendern: ${entry.title}`)
  }

  const loadLatestData = async (userId) => {
    const { data, error } = await supabase
      .from("workout_logs")
      .select("*")
      .eq("user_id", userId)
      .eq("is_completed", true)
      .neq("workout_kind", "running")
      .eq("set_type", "work")
      .not("workout_session_id", "is", null)
      .not("pass_name", "is", null)
      .order("created_at", { ascending: false })

    if (error) {
      console.error(error)
      return
    }

    const latestDatePerPass = {}
    const latestSessionPerPass = {}

    data.forEach((row) => {
      if (!latestDatePerPass[row.pass_name]) {
        latestDatePerPass[row.pass_name] = row.created_at
      }

      if (!latestSessionPerPass[row.pass_name]) {
        latestSessionPerPass[row.pass_name] = row.workout_session_id
      }
    })

    setLatestPassDates(latestDatePerPass)

    if (selectedWorkout) {
      const latestSessionId = latestSessionPerPass[selectedWorkout]
      const groupedLatestWorkout = {}

      data.forEach((row) => {
        if (row.pass_name !== selectedWorkout) return
        if (row.workout_session_id !== latestSessionId) return

        if (!groupedLatestWorkout[row.exercise]) {
          groupedLatestWorkout[row.exercise] = []
        }

        groupedLatestWorkout[row.exercise].push(row)
      })

      Object.keys(groupedLatestWorkout).forEach((exerciseName) => {
        groupedLatestWorkout[exerciseName].sort((a, b) => a.set_number - b.set_number)
      })

      setLatestWorkout(groupedLatestWorkout)
    }
  }

  const loadLatestWorkoutForPass = async (workoutKey, userId) => {
    const { data, error } = await supabase
      .from("workout_logs")
      .select("*")
      .eq("user_id", userId)
      .eq("pass_name", workoutKey)
      .eq("is_completed", true)
      .neq("workout_kind", "running")
      .eq("set_type", "work")
      .not("workout_session_id", "is", null)
      .order("created_at", { ascending: false })

    if (error) {
      console.error(error)
      return
    }

    const latestSessionId = data[0]?.workout_session_id
    const groupedLatestWorkout = {}

    data.forEach((row) => {
      if (row.workout_session_id !== latestSessionId) return

      if (!groupedLatestWorkout[row.exercise]) {
        groupedLatestWorkout[row.exercise] = []
      }

      groupedLatestWorkout[row.exercise].push(row)
    })

    Object.keys(groupedLatestWorkout).forEach((exerciseName) => {
      groupedLatestWorkout[exerciseName].sort((a, b) => a.set_number - b.set_number)
    })

    setLatestWorkout(groupedLatestWorkout)
  }

  const startWorkout = async (workoutKey, options = {}) => {
    if (!user) return

    const newSessionId = generateSessionId()
    const workout = activeWorkouts[workoutKey]
    if (!workout || !Array.isArray(workout.exercises)) {
      setStatus("Kunde inte starta passet")
      return
    }
    if (profile?.role === "player" && isSharedGymWorkout(workout) && !options.calendarEventPlayerId) {
      setStatus("Gemensamma gympass startas från kalendern")
      navigatePlayerSection("calendar")
      return
    }
    const { error, targetsByPass, assignedPasses } = await fetchTargetsByPassForUser(user.id)

    if (error) {
      console.error(error)
      setStatus("Kunde inte läsa dagens mål för passet")
      return
    }

    const workoutTargets = targetsByPass[workoutKey] || {}
    setAssignedWorkoutCodes(assignedPasses)
    setPlayerTargets(workoutTargets)

    setSelectedWorkout(workoutKey)
    setCurrentSessionId(newSessionId)
    setIsWorkoutActive(true)
    setExpandedInfo({})
    setLastFinishedWorkoutSummary(null)
    setActiveTargetChangeRequestDraft(null)
    setEditingLoggedSetKey(null)
    setFocusedStepperInputKey(null)
    setActiveCalendarEventPlayerId(options.calendarEventPlayerId || null)
    setActiveCalendarGroup(options.calendarEntry?.current_user_group || null)
    setIsActiveCalendarGroupExpanded(false)
    setPendingFreeActivityCalendarEvent(null)
    setActiveTimedSetTimer(null)

    if (workout.workoutKind === "running") {
      setRestStopwatchStartedAt(null)
      setActiveRunningInput({
        interval_program: workout.runningConfig?.intervalProgram || null,
        interval_time: workout.runningConfig?.interval_time || "",
        intervals_count:
          workout.runningConfig?.intervals_count != null
            ? String(workout.runningConfig.intervals_count)
            : "",
        running_distance:
          workout.runningConfig?.running_distance != null
            ? String(workout.runningConfig.running_distance)
            : "",
        running_time: workout.runningConfig?.running_time || "",
        average_pulse: "",
        location_enabled: false,
      })
      setInputs({})
      setSelectedExerciseOptionKeys({})
      setExerciseComments({})
      setPassComment("")
      setPlayerView("workout")
      setStatus(`${workout.label} startat`)
      return
    }

    const defaultInputs = {}
    const defaultExerciseComments = {}
    const defaultExerciseOptionKeys = {}
    workout.exercises.forEach((exercise, index) => {
      const protocolInputs = isProtocolExercise(exercise)
        ? buildProtocolInputRows(exercise, newSessionId, index)
        : null
      const targetSetCount = Math.max(
        1,
        Number(workoutTargets[exercise.name]?.target_sets ?? exercise.targetSets) || 1
      )
      defaultExerciseOptionKeys[index] = getExerciseExecutionOptions(exercise)[0]?.optionKey || ""
      defaultInputs[index] =
        protocolInputs && protocolInputs.length > 0
          ? protocolInputs
          : Array.from({ length: targetSetCount }, (_, setIndex) => ({
              weight: "",
              reps: "",
              seconds: "",
              left_seconds: "",
              right_seconds: "",
              active_side: "",
              side_input_seconds: "",
              switch_seconds: String(ACTIVE_TIMED_SET_DEFAULT_SIDE_SWITCH_SECONDS),
              is_logged: false,
              set_type: "work",
              client_set_id: generateSetId(index, setIndex),
              workout_session_id: newSessionId,
            }))
      defaultExerciseComments[index] = ""
    })

    setInputs(defaultInputs)
    setSelectedExerciseOptionKeys(defaultExerciseOptionKeys)
    setExerciseComments(defaultExerciseComments)
    setPassComment("")
    setRestStopwatchStartedAt(Date.now())
    setRestStopwatchNow(Date.now())
    setPlayerView("workout")
    setStatus(`${workout.label} startat`)

    await loadLatestWorkoutForPass(workoutKey, user.id)
  }

  const resetRestStopwatch = () => {
    const now = Date.now()
    setRestStopwatchStartedAt(now)
    setRestStopwatchNow(now)
  }

  const parseStepperNumber = (value) => {
    if (value == null || value === "") return null
    const normalized = String(value).replace(",", ".").trim()
    const parsed = Number.parseFloat(normalized)
    return Number.isFinite(parsed) ? parsed : null
  }

  const formatStepperValue = (value) => {
    if (!Number.isFinite(Number(value))) return ""
    const numericValue = Number(value)
    if (Number.isInteger(numericValue)) return String(numericValue)
    return numericValue.toFixed(1).replace(/\.0$/, "")
  }

  const getRepresentativeTargetValue = (target) => {
    const bounds = parseRepTargetRangeBounds(target)
    if (!bounds) return null
    return bounds.max != null ? bounds.max : bounds.min != null ? bounds.min : null
  }

  const isBilateralTimedExercise = (selectedExercise) =>
    selectedExercise?.type === "seconds_only" &&
    ["single_leg", "single_arm"].includes(selectedExercise?.executionSide || "standard")

  const doesSetHaveRequiredFields = (exerciseType, set, executionSide = "standard") => {
    if (!set) return false

    if (exerciseType === "weight_reps") {
      return Boolean(set.weight && set.reps)
    }

    if (exerciseType === "reps_only") {
      return Boolean(set.reps)
    }

    if (exerciseType === "seconds_only" && ["single_leg", "single_arm"].includes(executionSide)) {
      return Boolean(set.left_seconds && set.right_seconds)
    }

    if (exerciseType === "seconds_only") {
      return Boolean(set.seconds)
    }

    return false
  }

  const isSetCompleteForExercise = (exerciseType, set, executionSide = "standard") =>
    Boolean(set?.is_logged) && doesSetHaveRequiredFields(exerciseType, set, executionSide)

  const getNextPendingSetIndex = (exerciseType, sets, executionSide = "standard") =>
    (sets || []).findIndex((set) => !isSetCompleteForExercise(exerciseType, set, executionSide))

  const isTimedSetTimerRunning = (exerciseIndex, setIndex, side = null) =>
    Boolean(
      activeTimedSetTimer &&
        activeTimedSetTimer.exerciseIndex === exerciseIndex &&
        activeTimedSetTimer.setIndex === setIndex &&
        (side == null || (activeTimedSetTimer.side || null) === side)
    )

  const getTimedSetElapsedMs = (exerciseIndex, setIndex, side = null) =>
    isTimedSetTimerRunning(exerciseIndex, setIndex, side)
      ? Math.max(0, (activeTimedSetTimer?.now || 0) - (activeTimedSetTimer?.startedAt || 0))
      : 0

  const getTimedSetRemainingMs = (exerciseIndex, setIndex, side = null) => {
    if (!isTimedSetTimerRunning(exerciseIndex, setIndex, side)) return 0

    const durationMs = Math.max(0, Number(activeTimedSetTimer?.durationSeconds || 0) * 1000)
    if (!durationMs) return 0

    return Math.max(0, durationMs - getTimedSetElapsedMs(exerciseIndex, setIndex, side))
  }

  const getTimedSetRemainingSeconds = (exerciseIndex, setIndex, side = null) =>
    Math.max(0, Math.ceil(getTimedSetRemainingMs(exerciseIndex, setIndex, side) / 1000))

  const startTimedSetTimer = (
    exerciseIndex,
    setIndex,
    side = null,
    durationSeconds = 0,
    options = {}
  ) => {
    const resolvedDurationSeconds = parseStepperNumber(durationSeconds)

    if (resolvedDurationSeconds == null || resolvedDurationSeconds <= 0) {
      setStatus("Välj sekunder först")
      return false
    }

    const now = Date.now()
    activeTimedCompletionKeyRef.current = null
    setActiveTimedSetTimer({
      exerciseIndex,
      setIndex,
      side: side || null,
      nextSide: options.nextSide || null,
      mode: options.mode || (side ? "bilateral" : "standard"),
      phase: "countdown",
      durationSeconds: ACTIVE_TIMED_SET_COUNTDOWN_SECONDS,
      workSeconds: resolvedDurationSeconds,
      switchSeconds:
        parseStepperNumber(options.switchSeconds) ??
        ACTIVE_TIMED_SET_DEFAULT_SIDE_SWITCH_SECONDS,
      startedAt: now,
      now,
      warningPlayed: false,
      isCompleting: false,
    })
    void playIntervalSignal("resume")
    return true
  }

  const stopTimedSetTimer = () => {
    if (!activeTimedSetTimer) return null

    const elapsedMs = Math.max(
      0,
      (activeTimedSetTimer.now || Date.now()) - activeTimedSetTimer.startedAt
    )
    const durationSeconds =
      activeTimedSetTimer.phase === "work"
        ? parseStepperNumber(activeTimedSetTimer.workSeconds)
        : parseStepperNumber(activeTimedSetTimer.durationSeconds)
    const elapsedSeconds = Math.max(1, Math.round(elapsedMs / 1000))
    const loggedSeconds =
      durationSeconds != null && durationSeconds > 0
        ? Math.min(durationSeconds, elapsedSeconds)
        : elapsedSeconds

    setActiveTimedSetTimer(null)
    return loggedSeconds
  }

  const clearTimedSetTimer = () => {
    activeTimedCompletionKeyRef.current = null
    setActiveTimedSetTimer(null)
  }

  const getSuggestedWeightForSet = (sets, setIndex, latestExerciseTopSet) => {
    const previousLoggedSet = (sets || [])
      .slice(0, setIndex)
      .reverse()
      .find((set) => set?.weight)

    if (previousLoggedSet?.weight) return parseStepperNumber(previousLoggedSet.weight)
    if (latestExerciseTopSet?.weight != null) return parseStepperNumber(latestExerciseTopSet.weight)
    return null
  }

  const updateSetDraft = (exerciseIndex, setIndex, updater) => {
    const currentRows = inputs[exerciseIndex] || []
    const nextRows = currentRows.slice()
    const previousSet = nextRows[setIndex] || {}
    const nextSet =
      typeof updater === "function"
        ? updater(previousSet)
        : {
            ...previousSet,
            ...updater,
          }

    nextRows[setIndex] = nextSet
    setInputs((prev) => ({
      ...prev,
      [exerciseIndex]: nextRows,
    }))
    return nextSet
  }

  const adjustSetNumericField = (exerciseIndex, setIndex, field, delta, fallbackValue = 0) => {
    const currentSet = inputs[exerciseIndex]?.[setIndex] || {}
    const baseValue = parseStepperNumber(currentSet[field])
    const fallbackNumericValue = parseStepperNumber(fallbackValue)
    const step =
      field === "weight"
        ? 2.5
        : field === "seconds" || field === "side_input_seconds" || field === "switch_seconds"
        ? 5
        : 1
    const nextNumericValue = Math.max(
      0,
      (baseValue != null ? baseValue : fallbackNumericValue != null ? fallbackNumericValue : 0) +
        delta * step
    )

    updateSetDraft(exerciseIndex, setIndex, {
      [field]: formatStepperValue(nextNumericValue),
      set_type: currentSet.set_type || "work",
      workout_session_id: currentSessionId,
      client_set_id: currentSet.client_set_id || generateSetId(exerciseIndex, setIndex),
    })
  }

  const handleLogSetAndStartRest = async (
    exerciseIndex,
    setIndex,
    selectedExercise,
    defaults = {}
  ) => {
    if (!isWorkoutActive || !currentSessionId || !selectedWorkout || !selectedExercise) return

    const currentRows = inputs[exerciseIndex] || []
    const currentSet = currentRows[setIndex] || {}
    const nextSet = {
      ...currentSet,
      weight:
        selectedExercise.type === "weight_reps"
          ? currentSet.weight || (defaults.weight != null ? formatStepperValue(defaults.weight) : "")
          : currentSet.weight || "",
      reps:
        selectedExercise.type === "weight_reps" || selectedExercise.type === "reps_only"
          ? currentSet.reps || (defaults.reps != null ? formatStepperValue(defaults.reps) : "")
          : currentSet.reps || "",
      seconds:
        selectedExercise.type === "seconds_only"
          ? currentSet.seconds || (defaults.seconds != null ? formatStepperValue(defaults.seconds) : "")
          : currentSet.seconds || "",
      is_logged: true,
      set_type: currentSet.set_type || "work",
      workout_session_id: currentSessionId,
      client_set_id: currentSet.client_set_id || generateSetId(exerciseIndex, setIndex),
    }

    if (
      !doesSetHaveRequiredFields(
        selectedExercise.type,
        nextSet,
        selectedExercise.executionSide || "standard"
      )
    ) {
      setStatus("Fyll i setet först")
      return
    }

    const nextRows = currentRows.slice()
    nextRows[setIndex] = nextSet
    setInputs((prev) => ({
      ...prev,
      [exerciseIndex]: nextRows,
    }))

    await saveSet(exerciseIndex, selectedExercise, setIndex, nextSet)
    resetRestStopwatch()
  }

  const handleSaveEditedLoggedSet = async (exerciseIndex, setIndex, selectedExercise) => {
    if (!isWorkoutActive || !currentSessionId || !selectedWorkout || !selectedExercise) return

    const currentRows = inputs[exerciseIndex] || []
    const currentSet = currentRows[setIndex] || {}
    const nextSet = {
      ...currentSet,
      weight: currentSet.weight || "",
      reps: currentSet.reps || "",
      seconds: currentSet.seconds || "",
      is_logged: true,
      set_type: currentSet.set_type || "work",
      workout_session_id: currentSessionId,
      client_set_id: currentSet.client_set_id || generateSetId(exerciseIndex, setIndex),
    }

    if (
      !doesSetHaveRequiredFields(
        selectedExercise.type,
        nextSet,
        selectedExercise.executionSide || "standard"
      )
    ) {
      setStatus("Fyll i setet först")
      return
    }

    const nextRows = currentRows.slice()
    nextRows[setIndex] = nextSet
    setInputs((prev) => ({
      ...prev,
      [exerciseIndex]: nextRows,
    }))

    await saveSet(exerciseIndex, selectedExercise, setIndex, nextSet)
    setEditingLoggedSetKey(null)
  }

  const handleTimedSetPrimaryAction = async (
    exerciseIndex,
    setIndex,
    selectedExercise,
    fallbackSeconds = 0
  ) => {
    const currentSet = inputs[exerciseIndex]?.[setIndex] || {}

    if (isTimedSetTimerRunning(exerciseIndex, setIndex)) {
      const elapsedSeconds = stopTimedSetTimer()
      if (activeTimedSetTimer?.phase === "work" && elapsedSeconds != null) {
        await handleLogSetAndStartRest(exerciseIndex, setIndex, selectedExercise, {
          seconds: elapsedSeconds ?? fallbackSeconds,
        })
      } else {
        setStatus("Timer avbruten")
      }
      return
    }

    const selectedSeconds =
      parseStepperNumber(currentSet.seconds) ?? parseStepperNumber(fallbackSeconds) ?? null
    const didStartTimer = startTimedSetTimer(exerciseIndex, setIndex, null, selectedSeconds)
    if (didStartTimer) setStatus("Timer startar om 3 sekunder")
  }

  const handleSelectBilateralTimedSide = (
    exerciseIndex,
    setIndex,
    side,
    fallbackSeconds = 0
  ) => {
    const currentSet = inputs[exerciseIndex]?.[setIndex] || {}
    const sideField = side === "right" ? "right_seconds" : "left_seconds"
    const existingSideValue = currentSet[sideField]
    const suggestedValue =
      existingSideValue ||
      currentSet.side_input_seconds ||
      (fallbackSeconds != null ? formatStepperValue(fallbackSeconds) : "")

    updateSetDraft(exerciseIndex, setIndex, {
      active_side: side,
      side_input_seconds: suggestedValue,
      set_type: currentSet.set_type || "work",
      workout_session_id: currentSessionId,
      client_set_id: currentSet.client_set_id || generateSetId(exerciseIndex, setIndex),
    })
    setStatus(side === "left" ? "Vänster vald" : "Höger vald")
  }

  const handleAdvanceBilateralTimedSet = async (
    exerciseIndex,
    setIndex,
    selectedExercise,
    fallbackSeconds = 0,
    loggedSeconds = null
  ) => {
    if (!isWorkoutActive || !currentSessionId || !selectedWorkout || !selectedExercise) return

    const currentRows = inputs[exerciseIndex] || []
    const currentSet = currentRows[setIndex] || {}
    const activeSide = currentSet.active_side || ""

    if (!activeSide || activeSide === "done") {
      setStatus("Välj sida först")
      return
    }

    const resolvedSideValue =
      parseStepperNumber(loggedSeconds) ??
      parseStepperNumber(currentSet.side_input_seconds) ??
      parseStepperNumber(
        activeSide === "right" ? currentSet.right_seconds : currentSet.left_seconds
      ) ??
      parseStepperNumber(fallbackSeconds)

    if (resolvedSideValue == null || resolvedSideValue <= 0) {
      setStatus("Välj sekunder först")
      return
    }

    const otherSide = activeSide === "left" ? "right" : "left"
    const activeField = activeSide === "left" ? "left_seconds" : "right_seconds"
    const otherField = otherSide === "left" ? "left_seconds" : "right_seconds"
    const updatedActiveSeconds = formatStepperValue(resolvedSideValue)
    const otherSeconds = parseStepperNumber(currentSet[otherField])

    if (otherSeconds == null || otherSeconds <= 0) {
      clearTimedSetTimer()
      updateSetDraft(exerciseIndex, setIndex, {
        [activeField]: updatedActiveSeconds,
        active_side: otherSide,
        side_input_seconds:
          currentSet[otherField] ||
          (fallbackSeconds != null ? formatStepperValue(fallbackSeconds) : ""),
        is_logged: false,
        set_type: currentSet.set_type || "work",
        workout_session_id: currentSessionId,
        client_set_id: currentSet.client_set_id || generateSetId(exerciseIndex, setIndex),
      })
      setStatus(activeSide === "left" ? "Vänster sida loggad" : "Höger sida loggad")
      return
    }

    const nextSet = {
      ...currentSet,
      [activeField]: updatedActiveSeconds,
      active_side: "done",
      side_input_seconds: "",
      seconds: formatStepperValue(
        Math.min(
          parseStepperNumber(activeSide === "left" ? updatedActiveSeconds : currentSet.left_seconds) ?? 0,
          parseStepperNumber(activeSide === "right" ? updatedActiveSeconds : currentSet.right_seconds) ?? 0
        )
      ),
      is_logged: true,
      set_type: currentSet.set_type || "work",
      workout_session_id: currentSessionId,
      client_set_id: currentSet.client_set_id || generateSetId(exerciseIndex, setIndex),
    }

    const nextRows = currentRows.slice()
    nextRows[setIndex] = nextSet
    setInputs((prev) => ({
      ...prev,
      [exerciseIndex]: nextRows,
    }))

    clearTimedSetTimer()
    await saveSet(exerciseIndex, selectedExercise, setIndex, nextSet)
    resetRestStopwatch()
  }

  const handleBilateralTimedPrimaryAction = async (
    exerciseIndex,
    setIndex,
    selectedExercise,
    fallbackSeconds = 0
  ) => {
    const currentSet = inputs[exerciseIndex]?.[setIndex] || {}

    if (isTimedSetTimerRunning(exerciseIndex, setIndex)) {
      clearTimedSetTimer()
      setStatus("Timer avbruten")
      return
    }

    const selectedSeconds =
      parseStepperNumber(currentSet.side_input_seconds) ?? parseStepperNumber(fallbackSeconds) ?? null
    const switchSeconds =
      parseStepperNumber(currentSet.switch_seconds) ?? ACTIVE_TIMED_SET_DEFAULT_SIDE_SWITCH_SECONDS
    const startSide = currentSet.left_seconds ? "right" : "left"
    const didStartTimer = startTimedSetTimer(exerciseIndex, setIndex, startSide, selectedSeconds, {
      mode: "bilateral",
      switchSeconds,
    })
    if (didStartTimer) {
      updateSetDraft(exerciseIndex, setIndex, {
        active_side: startSide,
        side_input_seconds:
          currentSet.side_input_seconds ||
          (selectedSeconds != null ? formatStepperValue(selectedSeconds) : ""),
        switch_seconds: formatStepperValue(switchSeconds),
        set_type: currentSet.set_type || "work",
        workout_session_id: currentSessionId,
        client_set_id: currentSet.client_set_id || generateSetId(exerciseIndex, setIndex),
      })
      setStatus("Timer startar om 3 sekunder")
    }
  }

  const doesActiveTimedTimerMatch = (currentTimer, referenceTimer) =>
    Boolean(
      currentTimer &&
        referenceTimer &&
        currentTimer.exerciseIndex === referenceTimer.exerciseIndex &&
        currentTimer.setIndex === referenceTimer.setIndex &&
        currentTimer.startedAt === referenceTimer.startedAt &&
        currentTimer.phase === referenceTimer.phase
    )

  const getActiveTimedTimerCompletionKey = (timer) =>
    timer
      ? [
          timer.exerciseIndex,
          timer.setIndex,
          timer.startedAt,
          timer.phase,
          timer.side || "",
          timer.nextSide || "",
        ].join(":")
      : ""

  const markTimedTimerCompleting = (timer) => {
    const completionKey = getActiveTimedTimerCompletionKey(timer)
    if (!completionKey || activeTimedCompletionKeyRef.current === completionKey) return false

    activeTimedCompletionKeyRef.current = completionKey

    setActiveTimedSetTimer((prev) => {
      if (!doesActiveTimedTimerMatch(prev, timer)) return prev
      return { ...prev, isCompleting: true }
    })

    return true
  }

  const completeActiveTimedTimerPhase = async (timer) => {
    if (!timer || !markTimedTimerCompleting(timer)) return

    const workoutExercise = activeWorkouts[selectedWorkout]?.exercises?.[timer.exerciseIndex]
    const selectedExercise = workoutExercise
      ? getSelectedExerciseExecution(workoutExercise, selectedExerciseOptionKeys[timer.exerciseIndex])
      : null
    const currentRows = inputs[timer.exerciseIndex] || []
    const currentSet = currentRows[timer.setIndex] || {}
    const workSeconds = parseStepperNumber(timer.workSeconds)
    const switchSeconds =
      parseStepperNumber(timer.switchSeconds) ?? ACTIVE_TIMED_SET_DEFAULT_SIDE_SWITCH_SECONDS

    if (timer.phase === "countdown") {
      await playIntervalSignal("start")
      const now = Date.now()
      activeTimedCompletionKeyRef.current = null
      setActiveTimedSetTimer((prev) =>
        doesActiveTimedTimerMatch(prev, timer)
          ? {
              ...prev,
              phase: "work",
              durationSeconds: workSeconds || 1,
              startedAt: now,
              now,
              warningPlayed: false,
              isCompleting: false,
            }
          : prev
      )
      return
    }

    if (!workoutExercise || !selectedExercise || workSeconds == null || workSeconds <= 0) {
      clearTimedSetTimer()
      return
    }

    if (timer.mode !== "bilateral") {
      await playIntervalSignal("finish")
      clearTimedSetTimer()
      await handleLogSetAndStartRest(timer.exerciseIndex, timer.setIndex, selectedExercise, {
        seconds: workSeconds,
      })
      return
    }

    if (timer.phase === "switch_rest") {
      await playIntervalSignal("start")
      const now = Date.now()
      const nextSide = timer.nextSide || "right"
      updateSetDraft(timer.exerciseIndex, timer.setIndex, {
        active_side: nextSide,
        side_input_seconds: formatStepperValue(workSeconds),
        switch_seconds: formatStepperValue(switchSeconds),
        set_type: currentSet.set_type || "work",
        workout_session_id: currentSessionId,
        client_set_id: currentSet.client_set_id || generateSetId(timer.exerciseIndex, timer.setIndex),
      })
      activeTimedCompletionKeyRef.current = null
      setActiveTimedSetTimer((prev) =>
        doesActiveTimedTimerMatch(prev, timer)
          ? {
              ...prev,
              phase: "work",
              side: nextSide,
              nextSide: null,
              durationSeconds: workSeconds,
              startedAt: now,
              now,
              warningPlayed: false,
              isCompleting: false,
            }
          : prev
      )
      return
    }

    const activeSide = timer.side || "left"
    const otherSide = activeSide === "left" ? "right" : "left"
    const activeField = activeSide === "left" ? "left_seconds" : "right_seconds"
    const otherField = otherSide === "left" ? "left_seconds" : "right_seconds"
    const updatedActiveSeconds = formatStepperValue(workSeconds)
    const existingOtherSeconds = parseStepperNumber(currentSet[otherField])

    if (existingOtherSeconds == null || existingOtherSeconds <= 0) {
      updateSetDraft(timer.exerciseIndex, timer.setIndex, {
        [activeField]: updatedActiveSeconds,
        active_side: otherSide,
        side_input_seconds: updatedActiveSeconds,
        switch_seconds: formatStepperValue(switchSeconds),
        is_logged: false,
        set_type: currentSet.set_type || "work",
        workout_session_id: currentSessionId,
        client_set_id: currentSet.client_set_id || generateSetId(timer.exerciseIndex, timer.setIndex),
      })

      await playIntervalSignal("rest")
      const now = Date.now()
      activeTimedCompletionKeyRef.current = null
      setActiveTimedSetTimer((prev) =>
        doesActiveTimedTimerMatch(prev, timer)
          ? {
              ...prev,
              phase: "switch_rest",
              side: null,
              nextSide: otherSide,
              durationSeconds: switchSeconds,
              startedAt: now,
              now,
              warningPlayed: false,
              isCompleting: false,
            }
          : prev
      )
      return
    }

    const nextSet = {
      ...currentSet,
      [activeField]: updatedActiveSeconds,
      active_side: "done",
      side_input_seconds: "",
      switch_seconds: formatStepperValue(switchSeconds),
      seconds: formatStepperValue(
        Math.min(
          parseStepperNumber(activeSide === "left" ? updatedActiveSeconds : currentSet.left_seconds) ?? workSeconds,
          parseStepperNumber(activeSide === "right" ? updatedActiveSeconds : currentSet.right_seconds) ?? workSeconds
        )
      ),
      is_logged: true,
      set_type: currentSet.set_type || "work",
      workout_session_id: currentSessionId,
      client_set_id: currentSet.client_set_id || generateSetId(timer.exerciseIndex, timer.setIndex),
    }
    const nextRows = currentRows.slice()
    nextRows[timer.setIndex] = nextSet

    setInputs((prev) => ({
      ...prev,
      [timer.exerciseIndex]: nextRows,
    }))

    await playIntervalSignal("finish")
    clearTimedSetTimer()
    await saveSet(timer.exerciseIndex, selectedExercise, timer.setIndex, nextSet)
    resetRestStopwatch()
  }

  const finishWorkout = async () => {
    if (!currentSessionId || !selectedWorkout || !user) return

    const calendarEventPlayerId = activeCalendarEventPlayerId

    if (activeWorkouts[selectedWorkout]?.workoutKind === "running") {
      const activeRunningWorkout = activeWorkouts[selectedWorkout]
      const runningDistanceValue = String(activeRunningInput.running_distance || "").trim()
      const runningTimeValue = String(activeRunningInput.running_time || "").trim()
      const averagePulseValue = String(activeRunningInput.average_pulse || "").trim()
      const passCommentValue = passComment.trim()
      const normalizedIntervalProgram =
        activeRunningWorkout.runningType === "intervals"
          ? normalizeIntervalProgramDraft(activeRunningInput.interval_program) ||
            activeRunningWorkout.runningConfig?.intervalProgram
          : null
      const legacyIntervalFields = intervalProgramToLegacyFields(normalizedIntervalProgram)
      const runningTotalElapsedSeconds = parseDurationToSeconds(activeRunningInput.running_time)
      const finishedSummary = {
        label: activeRunningWorkout.label,
        kind: "Löppass",
        meta: buildRunningSummary({
          running_type: activeRunningWorkout.runningType,
          interval_program: normalizedIntervalProgram,
          interval_time: legacyIntervalFields.interval_time || activeRunningWorkout.runningConfig?.interval_time,
          intervals_count:
            legacyIntervalFields.intervals_count ?? activeRunningWorkout.runningConfig?.intervals_count,
          running_distance: runningDistanceValue ? parseLoggedNumber(runningDistanceValue) : null,
          running_time: runningTimeValue || null,
          average_pulse: averagePulseValue ? Number(averagePulseValue) : null,
        }),
        highlightLabel: activeRunningWorkout.runningType === "distance" ? "Sammanfattning" : "Loggat",
        highlightValue:
          activeRunningWorkout.runningType === "distance"
            ? "Justera distans, tid eller puls om du vill."
            : "Löpningen är sparad",
        workoutKind: "running",
        sessionId: currentSessionId,
        runningType: activeRunningWorkout.runningType || "intervals",
        intervalProgram: normalizedIntervalProgram,
        legacyIntervalTime: legacyIntervalFields.interval_time,
        legacyIntervalsCount: legacyIntervalFields.intervals_count,
        draft: {
          running_distance: runningDistanceValue,
          running_time: runningTimeValue,
          average_pulse: averagePulseValue,
          pass_comment: passCommentValue,
        },
      }
      const { error } = await saveRunningWorkoutLog({
        client_set_id: `running-${currentSessionId}`,
        user_id: user.id,
        workout_session_id: currentSessionId,
        pass_name: activeRunningWorkout.label,
        exercise: "Löpning",
        set_number: 1,
        is_completed: true,
        workout_kind: "running",
        running_origin: activeRunningWorkout.runningOrigin || "assigned",
        free_activity_type:
          activeRunningWorkout.runningOrigin === "free" ? "running" : null,
        running_type: activeRunningWorkout.runningType || "intervals",
        running_interval_execution:
          activeRunningWorkout.runningType === "intervals" ? normalizedIntervalProgram : null,
        running_total_elapsed_seconds: runningTotalElapsedSeconds || null,
        interval_time:
          activeRunningWorkout.runningType === "intervals"
            ? legacyIntervalFields.interval_time
            : null,
        intervals_count:
          activeRunningWorkout.runningType === "intervals"
            ? legacyIntervalFields.intervals_count
            : null,
        running_distance: runningDistanceValue
          ? parseLoggedNumber(runningDistanceValue)
          : null,
        running_time: runningTimeValue || null,
        average_pulse: averagePulseValue
          ? Number(averagePulseValue)
          : null,
        pass_comment: passCommentValue || null,
        calendar_event_player_id: calendarEventPlayerId,
      })

      if (error) {
        console.error(error)
        setStatus("Kunde inte avsluta löppasset")
        return
      }

      setIsWorkoutActive(false)
      setLastFinishedWorkoutSummary(finishedSummary)
      setCurrentSessionId(null)
      setCustomRunningWorkout(null)
      setInputs({})
      setSelectedExerciseOptionKeys({})
      setExerciseComments({})
      setPassComment("")
      setRestStopwatchStartedAt(null)
      setActiveTargetChangeRequestDraft(null)
      setActiveCalendarEventPlayerId(null)
      setActiveRunningInput({
        interval_program: null,
        interval_time: "",
        intervals_count: "",
        running_distance: "",
        running_time: "",
        average_pulse: "",
        location_enabled: false,
      })
      setPlayerView("overview")
      setStatus(`${activeRunningWorkout.label} avslutat`)
      await markCalendarEventPlayerCompleted(calendarEventPlayerId, currentSessionId)
      await loadCompletedWorkoutSessions(user.id)
      await loadLatestData(user.id)
      return
    }

    const activeExercises = activeWorkouts[selectedWorkout]?.exercises || []
    const activeWorkout = activeWorkouts[selectedWorkout]
    const loggedSetCount = activeExercises.reduce((total, exercise, exerciseIndex) => {
      const selectedExercise = getSelectedExerciseExecution(
        exercise,
        selectedExerciseOptionKeys[exerciseIndex]
      )
      const exerciseInputs = inputs[exerciseIndex] || []

      if (isProtocolExercise(selectedExercise || exercise)) {
      return total + exerciseInputs.filter((set) => set?.protocolCompleted).length
      }

      return total + exerciseInputs.filter((set) =>
        isSetCompleteForExercise(
          selectedExercise?.type || exercise.type,
          set,
          selectedExercise?.executionSide || "standard"
        )
      ).length
    }, 0)
    const bestWeightSet = activeExercises
      .flatMap((exercise, exerciseIndex) => {
        const selectedExercise = getSelectedExerciseExecution(
          exercise,
          selectedExerciseOptionKeys[exerciseIndex]
        )

        return (inputs[exerciseIndex] || []).map((set) => ({
          exerciseName:
            selectedExercise?.displayName ||
            selectedExercise?.name ||
            exercise.displayName ||
            exercise.name,
          weight: parseLoggedNumber(set?.weight),
          reps: set?.reps,
        }))
      })
      .filter((set) => set.weight != null)
      .sort((a, b) => b.weight - a.weight)[0]
    const finishedSummary = {
      label: activeWorkout?.label || "Pass",
      kind: "Gympass",
      meta: `${activeExercises.length} övningar · ${loggedSetCount} set`,
      highlightLabel: bestWeightSet ? "Tyngsta lyftet idag" : "Passet är sparat",
      highlightValue: bestWeightSet
        ? `${bestWeightSet.exerciseName} · ${bestWeightSet.weight} kg${
            bestWeightSet.reps ? ` × ${bestWeightSet.reps}` : ""
          }`
        : "Snyggt jobbat. Passet finns i historiken.",
    }
    const commentWrites = activeExercises
      .map((exercise, exerciseIndex) => {
        const selectedExercise = getSelectedExerciseExecution(
          exercise,
          selectedExerciseOptionKeys[exerciseIndex]
        )
        const exerciseInputs = inputs[exerciseIndex] || []
        const firstSet = isProtocolExercise(selectedExercise || exercise)
          ? exerciseInputs.find((set) => set?.protocolCompleted) || null
          : exerciseInputs[0]

        if (!firstSet) return null
        if (!String(exerciseComments[exerciseIndex] || "").trim()) return null
        if (!selectedExercise) return null

        return supabase.from("workout_logs").upsert(
          {
            client_set_id: firstSet.client_set_id,
            user_id: user.id,
            workout_session_id: currentSessionId,
            pass_name: selectedWorkout,
            is_completed: false,
            workout_kind: "gym",
            exercise: selectedExercise.name,
            set_number: 1,
            weight: firstSet.weight || null,
            reps: firstSet.reps || null,
            seconds: firstSet.seconds || null,
            exercise_comment: exerciseComments[exerciseIndex].trim(),
            calendar_event_player_id: calendarEventPlayerId,
          },
          { onConflict: "client_set_id" }
        )
      })
      .filter(Boolean)

    if (commentWrites.length > 0) {
      const commentResults = await Promise.all(commentWrites)
      const commentError = commentResults.find((result) => result.error)?.error

      if (commentError) {
        console.error(commentError)
        setStatus(`Kunde inte spara övningskommentarer${commentError.message ? `: ${commentError.message}` : ""}`)
        return
      }
    }

    const { error } = await supabase
      .from("workout_logs")
      .update({ is_completed: true, pass_comment: passComment.trim() || null })
      .eq("workout_session_id", currentSessionId)
      .eq("user_id", user.id)

    if (error) {
      console.error(error)
      setStatus("Kunde inte avsluta pass")
      return
    }

    setIsWorkoutActive(false)
    setLastFinishedWorkoutSummary(finishedSummary)
    setCurrentSessionId(null)
    setCustomRunningWorkout(null)
    setInputs({})
    setSelectedExerciseOptionKeys({})
    setExerciseComments({})
    setPassComment("")
    setRestStopwatchStartedAt(null)
    setActiveTargetChangeRequestDraft(null)
    setActiveCalendarEventPlayerId(null)
    setPlayerView("overview")
    setStatus(`${activeWorkouts[selectedWorkout].label} avslutat`)

    await markCalendarEventPlayerCompleted(calendarEventPlayerId, currentSessionId)
    if (!isCustomRunningWorkoutKey(selectedWorkout)) {
      await loadLatestWorkoutForPass(selectedWorkout, user.id)
    }
    await loadLatestData(user.id)
  }

  const cancelWorkout = async () => {
    if (!currentSessionId || !selectedWorkout || !user) return

    const nextPlayerView = activeCalendarEventPlayerId ? "calendar" : "pass"

    const workoutLabel = activeWorkouts[selectedWorkout]?.label || "passet"
    const shouldCancel = window.confirm(
      `Vill du avbryta ${workoutLabel}? Eventuella påbörjade set i det här passet tas bort.`
    )

    if (!shouldCancel) return

    const { error } = await supabase
      .from("workout_logs")
      .delete()
      .eq("workout_session_id", currentSessionId)
      .eq("user_id", user.id)

    if (error) {
      console.error(error)
      setStatus("Kunde inte avbryta passet")
      return
    }

    setIsWorkoutActive(false)
    setCurrentSessionId(null)
    setCustomRunningWorkout(null)
    setInputs({})
    setSelectedExerciseOptionKeys({})
    setExerciseComments({})
    setPassComment("")
    setLastFinishedWorkoutSummary(null)
    setRestStopwatchStartedAt(null)
    setExpandedInfo({})
    setActiveTargetChangeRequestDraft(null)
    setActiveCalendarEventPlayerId(null)
    setActiveRunningInput({
      interval_time: "",
      intervals_count: "",
      running_distance: "",
      running_time: "",
      average_pulse: "",
    })
    setPlayerView(nextPlayerView)
    setStatus(`${workoutLabel} avbrutet`)
  }

  const handleAddSet = (exerciseIndex) => {
    if (!isWorkoutActive || !currentSessionId || !selectedWorkout) return

    const exercise = activeWorkouts[selectedWorkout]?.exercises?.[exerciseIndex]
    if (isProtocolExercise(exercise)) return

    const current = inputs[exerciseIndex] || []

    setInputs({
      ...inputs,
      [exerciseIndex]: [
        ...current,
        {
          weight: "",
          reps: "",
          seconds: "",
          left_seconds: "",
          right_seconds: "",
          active_side: "",
          side_input_seconds: "",
          switch_seconds: String(ACTIVE_TIMED_SET_DEFAULT_SIDE_SWITCH_SECONDS),
          is_logged: false,
          set_type: "work",
          client_set_id: generateSetId(exerciseIndex, current.length),
          workout_session_id: currentSessionId,
        },
      ],
    })
  }

  const handleRemoveSet = (exerciseIndex, setIndex) => {
    const exercise = activeWorkouts[selectedWorkout]?.exercises?.[exerciseIndex]
    if (isProtocolExercise(exercise)) return

    const current = inputs[exerciseIndex] || []
    const updated = current.filter((_, index) => index !== setIndex)

    setInputs({
      ...inputs,
      [exerciseIndex]: updated,
    })
  }

  const saveSet = async (exerciseIndex, selectedExercise, setIndex, set) => {
    if (!user) return
    const exerciseComment =
      exerciseIndex != null && exerciseIndex >= 0 ? exerciseComments[exerciseIndex] || null : null

    const { error } = await supabase.from("workout_logs").upsert(
      {
        client_set_id: set.client_set_id,
        user_id: user.id,
        workout_session_id: set.workout_session_id,
        pass_name: selectedWorkout,
        is_completed: false,
        workout_kind: "gym",
        exercise: selectedExercise.name,
        set_number: setIndex + 1,
        set_type: set.set_type || "work",
        weight: set.weight || null,
        reps: set.reps || null,
        seconds: set.seconds || null,
        exercise_comment: exerciseComment,
        calendar_event_player_id: activeCalendarEventPlayerId,
      },
      { onConflict: "client_set_id" }
    )

    if (error) {
      console.error(error)
      setStatus("Fel vid sparning")
    } else {
      setStatus("Sparat ✅")
    }
  }

  const deleteLoggedSet = async (clientSetId) => {
    if (!clientSetId) return

    const { error } = await supabase
      .from("workout_logs")
      .delete()
      .eq("client_set_id", clientSetId)

    if (error) {
      console.error(error)
      setStatus("Kunde inte uppdatera protokollet")
      return false
    }

    return true
  }

  const handleProtocolStepToggle = async (exerciseIndex, stepIndex) => {
    if (!isWorkoutActive || !currentSessionId || !selectedWorkout || !user) return

    const exercise = activeWorkouts[selectedWorkout]?.exercises?.[exerciseIndex]
    const selectedExercise = exercise
      ? getSelectedExerciseExecution(exercise, selectedExerciseOptionKeys[exerciseIndex])
      : null
    const protocolConfig = getExerciseProtocolConfig(selectedExercise || exercise)

    if (!exercise || !selectedExercise || !protocolConfig) return

    const current = inputs[exerciseIndex] || []
    const targetStep = protocolConfig.steps[stepIndex]
    const targetSet = current[stepIndex]

    if (!targetStep || !targetSet) return

    const isCompleted = Boolean(targetSet.protocolCompleted)
    const nextRows = current.slice()

    if (isCompleted) {
      const deleted = await deleteLoggedSet(targetSet.client_set_id)
      if (!deleted) return

      nextRows[stepIndex] = {
        ...targetSet,
        reps: "",
        seconds: "",
        protocolCompleted: false,
      }

      setInputs((prev) => ({
        ...prev,
        [exerciseIndex]: nextRows,
      }))
      setStatus("Block borttaget")
      return
    }

    const nextSet = {
      ...targetSet,
      reps: targetStep.targetUnit === "shots" ? String(targetStep.targetValue) : targetSet.reps || "",
      seconds: targetStep.targetUnit === "seconds" ? String(targetStep.targetValue) : targetSet.seconds || "",
      set_type: "work",
      protocolCompleted: true,
      workout_session_id: currentSessionId,
    }

    nextRows[stepIndex] = nextSet
    setInputs((prev) => ({
      ...prev,
      [exerciseIndex]: nextRows,
    }))

    await saveSet(exerciseIndex, selectedExercise, stepIndex, nextSet)
  }

  const handleChange = (exerciseIndex, setIndex, field, value) => {
    if (!isWorkoutActive || !currentSessionId || !selectedWorkout) return

    const current = inputs[exerciseIndex] || []
    const updated = [...current]
    const exercise = activeWorkouts[selectedWorkout].exercises[exerciseIndex]
    const selectedExercise = getSelectedExerciseExecution(
      exercise,
      selectedExerciseOptionKeys[exerciseIndex]
    )

    if (isProtocolExercise(selectedExercise || exercise)) return

    updated[setIndex] = {
      ...updated[setIndex],
      [field]: value,
      set_type: updated[setIndex]?.set_type || "work",
      workout_session_id: currentSessionId,
      client_set_id:
        updated[setIndex]?.client_set_id ||
        generateSetId(exerciseIndex, setIndex),
    }

    setInputs({
      ...inputs,
      [exerciseIndex]: updated,
    })
  }

  const handleStepperFieldFocus = (event) => {
    const inputKey = event.currentTarget.dataset.stepperInputKey || null
    setFocusedStepperInputKey(inputKey)
    window.requestAnimationFrame(() => {
      event.currentTarget.select()
    })
  }

  const handleStepperFieldBlur = () => {
    setFocusedStepperInputKey(null)
  }

  const handleStepperFieldKeyDown = (event) => {
    if (event.key !== "Enter") return
    event.preventDefault()
    event.stopPropagation()
    event.nativeEvent?.stopImmediatePropagation?.()
    event.currentTarget.blur()
  }

  const handleStepperFieldKeyUp = (event) => {
    if (event.key !== "Enter") return
    event.preventDefault()
    event.stopPropagation()
    event.nativeEvent?.stopImmediatePropagation?.()
  }

  const handleExerciseCommentChange = (exerciseIndex, value) => {
    setExerciseComments((prev) => ({
      ...prev,
      [exerciseIndex]: value,
    }))
  }

  const handleExerciseCommentSave = async (exerciseIndex) => {
    if (!isWorkoutActive || !currentSessionId || !selectedWorkout || !user) return

    const exercise = activeWorkouts[selectedWorkout]?.exercises?.[exerciseIndex]
    const selectedExercise = exercise
      ? getSelectedExerciseExecution(exercise, selectedExerciseOptionKeys[exerciseIndex])
      : null
    const exerciseInputs = inputs[exerciseIndex] || []
    const firstSet = isProtocolExercise(selectedExercise || exercise)
      ? exerciseInputs.find((set) => set?.protocolCompleted) || null
      : exerciseInputs[0]

    if (!exercise || !selectedExercise || !firstSet) return

    const { error } = await supabase.from("workout_logs").upsert(
      {
        client_set_id: firstSet.client_set_id,
        user_id: user.id,
        workout_session_id: currentSessionId,
        pass_name: selectedWorkout,
        is_completed: false,
        workout_kind: "gym",
        exercise: selectedExercise.name,
        set_number: 1,
        set_type: firstSet.set_type || "work",
        weight: firstSet.weight || null,
        reps: firstSet.reps || null,
        seconds: firstSet.seconds || null,
        exercise_comment: exerciseComments[exerciseIndex]?.trim() || null,
        calendar_event_player_id: activeCalendarEventPlayerId,
      },
      { onConflict: "client_set_id" }
    )

    if (error) {
      console.error(error)
      setStatus(`Kunde inte spara övningskommentar${error.message ? `: ${error.message}` : ""}`)
      return
    }

    setStatus("Övningskommentar sparad ✅")
  }

  const handleCommentChange = (playerId, value) => {
    setCommentDrafts((prev) => ({
      ...prev,
      [playerId]: value,
    }))
  }

  const handleCommentSave = async (playerId) => {
    const commentValue = commentDrafts[playerId] || ""

    const { error } = await supabase
      .from("profiles")
      .update({ comment: commentValue })
      .eq("id", playerId)

    if (error) {
      console.error(error)
      setStatus("Kunde inte spara kommentar")
      return
    }

    setPlayers((prev) =>
      prev.map((player) =>
        player.id === playerId ? { ...player, comment: commentValue } : player
      )
    )

    setSelectedPlayer((prev) =>
      prev?.id === playerId ? { ...prev, comment: commentValue } : prev
    )

    setStatus("Kommentar sparad ✅")
  }

  const handleSetIndividualGoalsEnabled = async (playerIds, enabled) => {
    const ids = Array.isArray(playerIds)
      ? playerIds.filter(Boolean)
      : playerIds
      ? [playerIds]
      : []

    if (ids.length === 0) return

    setUpdatingGoalAvailabilityIds(ids)

    const { error } = await supabase
      .from("profiles")
      .update({ individual_goals_enabled: enabled })
      .in("id", ids)

    if (error) {
      console.error(error)
      setStatus("Kunde inte uppdatera inställningen för individuella mål")
      setUpdatingGoalAvailabilityIds([])
      return
    }

    setPlayers((prev) =>
      prev.map((player) =>
        ids.includes(player.id) ? { ...player, individual_goals_enabled: enabled } : player
      )
    )
    setSelectedPlayer((prev) =>
      prev && ids.includes(prev.id) ? { ...prev, individual_goals_enabled: enabled } : prev
    )
    setStatus(
      enabled
        ? "Individuella mål aktiverade ✅"
        : "Individuella mål avstängda ✅"
    )
    setUpdatingGoalAvailabilityIds([])
  }

  const resetRunningDraft = (overrides = {}) => {
    setRunningDraft({
      log_date: getTodayDateInputValue(),
      free_activity_type: "",
      custom_activity_title: "",
      running_type: "distance",
      interval_program: createIntervalProgramDraft(),
      interval_time: "",
      intervals_count: "",
      running_distance: "",
      running_time: "",
      average_pulse: "",
      comment: "",
      ...overrides,
    })
  }

  const loadPlayerRunningPresets = async (userId) => {
    if (!userId) return

    setIsLoadingPlayerRunningPresets(true)

    const { data, error } = await supabase
      .from("player_running_presets")
      .select("id, name, running_interval_program, created_at, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })

    if (error) {
      console.error(error)
      setIsLoadingPlayerRunningPresets(false)
      return
    }

    setPlayerRunningPresets(data || [])
    setIsLoadingPlayerRunningPresets(false)
  }

  const resetPlayerRunningPresetEditor = () => {
    setSelectedPlayerRunningPresetId("")
    setPlayerRunningPresetName("")
    setPlayerRunningPresetDraft(createIntervalProgramDraft())
  }

  const handleSelectPlayerRunningPreset = (presetId) => {
    const preset = playerRunningPresets.find((entry) => String(entry.id) === String(presetId))

    if (!preset) {
      resetPlayerRunningPresetEditor()
      return
    }

    setSelectedPlayerRunningPresetId(String(preset.id))
    setPlayerRunningPresetName(preset.name || "")
    setPlayerRunningPresetDraft(storedProgramToDraft(preset.running_interval_program))
  }

  const handleSavePlayerRunningPreset = async () => {
    if (!user) return

    const presetName = String(playerRunningPresetName || "").trim()
    if (!presetName) {
      setStatus("Skriv namn på ditt intervallpass")
      return
    }

    const normalizedProgram = normalizeIntervalProgramDraft(playerRunningPresetDraft)
    if (!normalizedProgram) {
      setStatus("Lägg in minst ett giltigt intervallblock")
      return
    }

    setIsSavingPlayerRunningPreset(true)

    const payload = {
      user_id: user.id,
      name: presetName,
      running_interval_program: normalizedProgram,
    }

    const query = selectedPlayerRunningPresetId
      ? supabase
          .from("player_running_presets")
          .update(payload)
          .eq("id", selectedPlayerRunningPresetId)
          .eq("user_id", user.id)
          .select("id, name, running_interval_program, created_at, updated_at")
          .single()
      : supabase
          .from("player_running_presets")
          .insert(payload)
          .select("id, name, running_interval_program, created_at, updated_at")
          .single()

    const { data, error } = await query

    if (error) {
      console.error(error)
      setStatus("Kunde inte spara det egna intervallpasset")
      setIsSavingPlayerRunningPreset(false)
      return
    }

    setPlayerRunningPresets((prev) =>
      [...prev.filter((entry) => String(entry.id) !== String(data.id)), data].sort((a, b) =>
        String(b.updated_at || "").localeCompare(String(a.updated_at || ""))
      )
    )
    setSelectedPlayerRunningPresetId(String(data.id))
    setPlayerRunningPresetDraft(storedProgramToDraft(data.running_interval_program))
    setStatus("Eget intervallpass sparat ✅")
    setIsSavingPlayerRunningPreset(false)
  }

  const handleDeletePlayerRunningPreset = async (presetId) => {
    if (!user || !presetId) return

    const preset = playerRunningPresets.find((entry) => String(entry.id) === String(presetId))
    const confirmed = window.confirm(`Vill du ta bort ${preset?.name || "detta pass"}?`)
    if (!confirmed) return

    setDeletingPlayerRunningPresetId(String(presetId))

    const { error } = await supabase
      .from("player_running_presets")
      .delete()
      .eq("id", presetId)
      .eq("user_id", user.id)

    if (error) {
      console.error(error)
      setStatus("Kunde inte ta bort det egna passet")
      setDeletingPlayerRunningPresetId(null)
      return
    }

    setPlayerRunningPresets((prev) => prev.filter((entry) => String(entry.id) !== String(presetId)))
    if (String(selectedPlayerRunningPresetId) === String(presetId)) {
      resetPlayerRunningPresetEditor()
    }
    setStatus("Eget intervallpass borttaget ✅")
    setDeletingPlayerRunningPresetId(null)
  }

  const handleFinishedRunningSummaryDraftChange = (field, value) => {
    setLastFinishedWorkoutSummary((prev) =>
      prev?.workoutKind === "running"
        ? {
            ...prev,
            draft: {
              ...(prev.draft || {}),
              [field]: value,
            },
          }
        : prev
    )
  }

  const handleSaveFinishedRunningSummary = async () => {
    if (!user || !lastFinishedWorkoutSummary?.sessionId || lastFinishedWorkoutSummary.workoutKind !== "running") {
      return
    }

    const draft = lastFinishedWorkoutSummary.draft || {}
    setIsSavingFinishedRunningSummary(true)

    const payload = {
      running_distance: String(draft.running_distance || "").trim()
        ? parseLoggedNumber(draft.running_distance)
        : null,
      running_time: String(draft.running_time || "").trim() || null,
      average_pulse: String(draft.average_pulse || "").trim()
        ? Number(draft.average_pulse)
        : null,
      pass_comment: String(draft.pass_comment || "").trim() || null,
    }

    const { error } = await supabase
      .from("workout_logs")
      .update(payload)
      .eq("user_id", user.id)
      .eq("workout_session_id", lastFinishedWorkoutSummary.sessionId)

    if (error) {
      console.error(error)
      setStatus("Kunde inte spara sammanfattningen")
      setIsSavingFinishedRunningSummary(false)
      return
    }

    setLastFinishedWorkoutSummary((prev) =>
      prev
        ? {
            ...prev,
            meta: buildRunningSummary({
              running_type: prev.runningType,
              interval_program: prev.intervalProgram,
              interval_time: prev.legacyIntervalTime,
              intervals_count: prev.legacyIntervalsCount,
              running_distance: payload.running_distance,
              running_time: payload.running_time,
              average_pulse: payload.average_pulse,
            }),
            draft: {
              ...draft,
              running_distance:
                payload.running_distance != null ? String(payload.running_distance).replace(".", ",") : "",
              running_time: payload.running_time || "",
              average_pulse: payload.average_pulse != null ? String(payload.average_pulse) : "",
              pass_comment: payload.pass_comment || "",
            },
          }
        : prev
    )
    setStatus("Löppasset uppdaterat ✅")
    setIsSavingFinishedRunningSummary(false)
    await loadCompletedWorkoutSessions(user.id)
    await loadLatestData(user.id)
  }

  const startCustomRunningWorkout = ({
    label,
    runningType,
    runningConfig,
    passCommentValue = "",
    statusMessage,
  }) => {
    const newSessionId = generateSessionId()
    const intervalProgram =
      runningType === "intervals"
        ? normalizeIntervalProgramDraft(runningConfig?.intervalProgram) ||
          getRunningProgramFromTemplate({
            running_interval_program: runningConfig?.intervalProgram,
            running_interval_time: runningConfig?.interval_time,
            running_intervals_count: runningConfig?.intervals_count,
          })
        : null
    const legacyFields = intervalProgramToLegacyFields(intervalProgram)
    const customWorkout = {
      id: CUSTOM_RUNNING_WORKOUT_KEY,
      label,
      workoutKind: "running",
      runningType,
      runningOrigin: "free",
      runningConfig: {
        intervalProgram,
        interval_time: legacyFields.interval_time || "",
        intervals_count: legacyFields.intervals_count ?? null,
        running_distance: runningConfig?.running_distance ?? null,
        running_time: runningConfig?.running_time || "",
      },
      exercises: [],
      warmup: null,
    }

    setCustomRunningWorkout(customWorkout)
    setSelectedWorkout(CUSTOM_RUNNING_WORKOUT_KEY)
    setCurrentSessionId(newSessionId)
    setIsWorkoutActive(true)
    setExpandedInfo({})
    setLastFinishedWorkoutSummary(null)
    setActiveTargetChangeRequestDraft(null)
    setEditingLoggedSetKey(null)
    setFocusedStepperInputKey(null)
    setActiveCalendarEventPlayerId(null)
    setActiveCalendarGroup(null)
    setIsActiveCalendarGroupExpanded(false)
    setPendingFreeActivityCalendarEvent(null)
    setActiveTimedSetTimer(null)
    setRestStopwatchStartedAt(null)
    setInputs({})
    setSelectedExerciseOptionKeys({})
    setExerciseComments({})
    setPassComment(passCommentValue)
    setActiveRunningInput({
      interval_program: intervalProgram,
      interval_time: legacyFields.interval_time || "",
      intervals_count: legacyFields.intervals_count != null ? String(legacyFields.intervals_count) : "",
      running_distance:
        runningConfig?.running_distance != null ? String(runningConfig.running_distance) : "",
      running_time: runningConfig?.running_time || "",
      average_pulse: "",
      location_enabled: Boolean(runningConfig?.shareLocationEnabled),
    })
    setPlayerView("workout")
    setStatus(statusMessage || `${label} startat`)
  }

  const handleRunningDraftChange = (field, value) => {
    setRunningDraft((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleActiveRunningInputChange = (field, value) => {
    setActiveRunningInput((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSaveRunningSession = async () => {
    if (!user) return
    if (!runningDraft.free_activity_type) {
      setStatus("Välj vilken aktivitet du vill registrera")
      return
    }
    if (!runningDraft.log_date) {
      setStatus("Välj ett giltigt datum för aktiviteten")
      return
    }

    if (
      runningDraft.free_activity_type === "custom" &&
      !String(runningDraft.custom_activity_title || "").trim()
    ) {
      setStatus("Skriv vad den egna aktiviteten heter")
      return
    }

    const createdAt = combineDateWithExistingTime(runningDraft.log_date, new Date().toISOString())
    if (!createdAt) {
      setStatus("Välj ett giltigt datum för aktiviteten")
      return
    }

    setIsSavingRunningSession(true)

    const workoutSessionId = generateSessionId()
    const freeActivityType = runningDraft.free_activity_type || "running"
    const activityLabel =
      freeActivityType === "custom"
        ? String(runningDraft.custom_activity_title || "").trim()
        : pendingFreeActivityCalendarEvent?.title || getFreeActivityLabel(freeActivityType)
    const isFreeRunning = freeActivityType === "running"
    const normalizedIntervalProgram =
      isFreeRunning && runningDraft.running_type === "intervals"
        ? normalizeIntervalProgramDraft(runningDraft.interval_program) ||
          normalizeIntervalProgramDraft(
            legacyRunningConfigToProgramDraft({
              interval_time: runningDraft.interval_time,
              intervals_count: runningDraft.intervals_count,
            })
          )
        : null
    const legacyIntervalFields = intervalProgramToLegacyFields(normalizedIntervalProgram)
    const runningTotalElapsedSeconds = parseDurationToSeconds(runningDraft.running_time)

    if (isFreeRunning && runningDraft.running_type === "intervals" && !normalizedIntervalProgram) {
      setStatus("Lägg in minst ett giltigt intervallblock")
      setIsSavingRunningSession(false)
      return
    }

    const payload = {
      client_set_id: `running-${workoutSessionId}`,
      user_id: user.id,
      workout_session_id: workoutSessionId,
      pass_name: activityLabel,
      exercise: activityLabel,
      set_number: 1,
      is_completed: true,
      created_at: createdAt,
      workout_kind: "running",
      running_origin: "free",
      free_activity_type: freeActivityType,
      running_type: isFreeRunning ? runningDraft.running_type : "distance",
      running_interval_execution:
        isFreeRunning && runningDraft.running_type === "intervals" ? normalizedIntervalProgram : null,
      running_total_elapsed_seconds:
        isFreeRunning ? runningTotalElapsedSeconds || null : runningTotalElapsedSeconds || null,
      interval_time:
        isFreeRunning && runningDraft.running_type === "intervals"
          ? legacyIntervalFields.interval_time
          : null,
      intervals_count:
        isFreeRunning && runningDraft.running_type === "intervals"
          ? legacyIntervalFields.intervals_count
          : null,
      running_distance:
        isFreeRunning && runningDraft.running_type === "distance" && String(runningDraft.running_distance || "").trim()
          ? parseLoggedNumber(runningDraft.running_distance)
          : null,
      running_time:
        String(runningDraft.running_time || "").trim()
          ? String(runningDraft.running_time || "").trim()
          : null,
      average_pulse:
        isFreeRunning && runningDraft.running_type === "distance" && String(runningDraft.average_pulse || "").trim()
          ? Number(runningDraft.average_pulse)
          : null,
      weight: null,
      reps: null,
      seconds: null,
      exercise_comment: null,
      pass_comment: String(runningDraft.comment || "").trim() || null,
      calendar_event_player_id: pendingFreeActivityCalendarEvent?.id || null,
    }

    const { error } = await saveRunningWorkoutLog(payload)

    if (error) {
      console.error(error)
      setStatus("Kunde inte spara aktiviteten")
      setIsSavingRunningSession(false)
      return
    }

    resetRunningDraft()
    setPlayerRunningView(null)
    setPlayerView(pendingFreeActivityCalendarEvent?.id ? "calendar" : playerView)
    await markCalendarEventPlayerCompleted(pendingFreeActivityCalendarEvent?.id, workoutSessionId)
    setPendingFreeActivityCalendarEvent(null)
    setStatus(`${activityLabel} sparat ✅`)
    setIsSavingRunningSession(false)
    await loadCompletedWorkoutSessions(user.id)
    await loadLatestData(user.id)
  }

  const handleWorkoutDateDraftChange = (sessionId, value) => {
    setWorkoutDateDrafts((prev) => ({
      ...prev,
      [sessionId]: value,
    }))
  }

  const handleSaveWorkoutDate = async (session) => {
    if (!user || !session?.session_id) return

    const nextDate = workoutDateDrafts[session.session_id]
    if (!nextDate) {
      setStatus("Välj ett giltigt datum")
      return
    }

    const updatedTimestamp = combineDateWithExistingTime(nextDate, session.created_at)
    if (!updatedTimestamp) {
      setStatus("Välj ett giltigt datum")
      return
    }

    setSavingWorkoutDateSessionId(session.session_id)

    const { error } = await supabase
      .from("workout_logs")
      .update({ created_at: updatedTimestamp })
      .eq("user_id", user.id)
      .eq("workout_session_id", session.session_id)

    if (error) {
      console.error(error)
      setStatus("Kunde inte uppdatera datumet")
      setSavingWorkoutDateSessionId(null)
      return
    }

    setStatus("Träningsdatum uppdaterat ✅")
    setSavingWorkoutDateSessionId(null)
    await loadCompletedWorkoutSessions(user.id)
    await loadLatestData(user.id)
    if (selectedWorkout) {
      await loadLatestWorkoutForPass(selectedWorkout, user.id)
    }
  }

  const handleExerciseGoalDraftChange = (exerciseId, field, value) => {
    setExerciseGoalDrafts((prev) => ({
      ...prev,
      [exerciseId]: {
        ...(prev[exerciseId] || {}),
        [field]: value,
      },
    }))
  }

  const handleExerciseGoalRepRangeWeightDraftChange = (exerciseId, repRangeKey, value) => {
    setExerciseGoalDrafts((prev) => ({
      ...prev,
      [exerciseId]: {
        ...(prev[exerciseId] || {}),
        rep_range_weights: {
          ...normalizeRepRangeWeights(prev[exerciseId]?.rep_range_weights),
          [repRangeKey]: value,
        },
      },
    }))
  }

  const handlePrefillExerciseGoalFromHistory = (exerciseId) => {
    const historyItem = selectedPlayerHistory.find((entry) => entry.exercise_id === exerciseId)
    if (!historyItem) return

    const sourceEntry = historyItem.best_weight_entry || historyItem.latest_entry
    const repRangeBucket = getRepRangeBucketForReps(sourceEntry?.top_reps)

    setExerciseGoalDrafts((prev) => ({
      ...prev,
      [exerciseId]: {
        ...buildExerciseGoalPrefill(sourceEntry),
        rep_range_weights: repRangeBucket
          ? {
              ...normalizeRepRangeWeights(prev[exerciseId]?.rep_range_weights),
              [repRangeBucket.key]:
                sourceEntry?.top_weight != null ? String(sourceEntry.top_weight) : "",
            }
          : normalizeRepRangeWeights(prev[exerciseId]?.rep_range_weights),
      },
    }))
  }

  const handleSaveExerciseGoals = async () => {
    if (!selectedPlayer) return

    const hasRepRangeWeightValue = (draft) =>
      Object.values(normalizeRepRangeWeights(draft.rep_range_weights)).some(
        (value) => value !== "" && value != null
      )

    const hasBaseExerciseGoalValue = (draft) =>
      (draft.target_sets !== "" && draft.target_sets != null) ||
      (draft.target_reps !== "" && draft.target_reps != null) ||
      Boolean(String(draft.comment || "").trim())

    const rows = Object.entries(exerciseGoalDrafts)
      .filter(([_, draft]) => hasBaseExerciseGoalValue(draft))
      .map(([exerciseId, draft]) => ({
        player_id: selectedPlayer.id,
        exercise_id: exerciseId,
        target_sets: draft.target_sets === "" ? null : Number(draft.target_sets),
        target_reps: draft.target_reps === "" ? null : Number(draft.target_reps),
        target_weight: null,
        comment: String(draft.comment || "").trim() || null,
      }))

    setIsSavingExerciseGoals(true)

    const deleteExerciseIds = Object.entries(exerciseGoalDrafts)
      .filter(([_, draft]) => !hasBaseExerciseGoalValue(draft))
      .map(([exerciseId]) => exerciseId)

    if (deleteExerciseIds.length > 0) {
      const { error: deleteError } = await supabase
        .from("player_exercise_goals")
        .delete()
        .eq("player_id", selectedPlayer.id)
        .in("exercise_id", deleteExerciseIds)

      if (deleteError) {
        console.error(deleteError)
        setStatus("Kunde inte uppdatera personliga övningsmål")
        setIsSavingExerciseGoals(false)
        return
      }
    }

    if (rows.length > 0) {
      const { error } = await supabase
        .from("player_exercise_goals")
        .upsert(rows, { onConflict: "player_id,exercise_id" })

      if (error) {
        console.error(error)
        setStatus("Kunde inte spara personliga övningsmål")
        setIsSavingExerciseGoals(false)
        return
      }
    }

    const draftedExerciseIds = Object.keys(exerciseGoalDrafts)

    if (draftedExerciseIds.length > 0) {
      const { error: deleteRepTargetsError } = await supabase
        .from("player_exercise_rep_targets")
        .delete()
        .eq("player_id", selectedPlayer.id)
        .in("exercise_id", draftedExerciseIds)

      if (deleteRepTargetsError) {
        console.error(deleteRepTargetsError)
        setStatus("Kunde inte uppdatera målvikter per repsintervall")
        setIsSavingExerciseGoals(false)
        return
      }
    }

    const repRangeRows = Object.entries(exerciseGoalDrafts).flatMap(([exerciseId, draft]) =>
      Object.entries(normalizeRepRangeWeights(draft.rep_range_weights))
        .filter(([_, value]) => value !== "" && value != null)
        .map(([repRangeKey, value]) => ({
          player_id: selectedPlayer.id,
          exercise_id: exerciseId,
          rep_range_key: repRangeKey,
          target_weight: Number(value),
          updated_by: user?.id || null,
          source: "coach",
        }))
    )

    if (repRangeRows.length > 0) {
      const { error: repRangeError } = await supabase
        .from("player_exercise_rep_targets")
        .upsert(repRangeRows, { onConflict: "player_id,exercise_id,rep_range_key" })

      if (repRangeError) {
        console.error(repRangeError)
        setStatus("Kunde inte spara målvikter per repsintervall")
        setIsSavingExerciseGoals(false)
        return
      }
    }

    setStatus("Personliga övningsmål sparade ✅")
    setIsSavingExerciseGoals(false)
    await loadSelectedPlayerHistoryAndGoals(selectedPlayer.id)
  }

  const getFunctionErrorMessage = async (error, fallbackMessage) => {
    if (error?.context && typeof error.context.clone === "function") {
      try {
        const payload = await error.context.clone().json()
        if (payload?.step && payload?.error) return `${payload.step}: ${payload.error}`
        if (payload?.error) return payload.error
        if (payload?.message) return payload.message
      } catch {
        // Ignore parse failures and use the fallback path below.
      }
    }

    return error?.message || fallbackMessage
  }

  const ensureFreshSession = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      setStatus("Du behöver logga in igen")
      return null
    }

    const { error } = await supabase.auth.refreshSession()

    if (error) {
      console.error(error)
      await supabase.auth.signOut()
      setUser(null)
      setProfile(null)
      setStatus("Din inloggning har gått ut. Logga in igen.")
      return null
    }

    const {
      data: { session: refreshedSession },
    } = await supabase.auth.getSession()

    return refreshedSession?.access_token || null
  }

  const handleCreatePlayer = async (e) => {
    e.preventDefault()
    setStatus("")
    setCreatedPlayer(null)

    if (!newPlayerName.trim() || !newPlayerPassword.trim()) {
      setStatus("Fyll i namn och startlösenord")
      return
    }

    const targetRole =
      newUserRole === "head_admin" && profile?.role === "head_admin"
        ? "head_admin"
        : newUserRole === "coach" && (profile?.role === "head_admin" || profile?.role === "coach")
        ? "coach"
        : "player"
    const targetTeamId =
      targetRole === "head_admin"
        ? null
        : profile?.role === "head_admin"
        ? selectedTeamId
        : profile?.team_id

    if (targetRole !== "head_admin" && !targetTeamId) {
      setStatus("Välj lag först")
      return
    }

    const accessToken = await ensureFreshSession()

    if (!accessToken) {
      return
    }

    setIsCreatingPlayer(true)

    const { data, error } = await supabase.functions.invoke("create-player", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: {
        full_name: newPlayerName.trim(),
        password: newPlayerPassword.trim(),
        role: targetRole,
        team_id: targetTeamId || null,
      },
    })

    if (error) {
      console.error(error)
      setStatus(await getFunctionErrorMessage(error, "Kunde inte skapa spelare"))
      setIsCreatingPlayer(false)
      return
    }

    if (data?.error) {
      setStatus(data.error)
      setIsCreatingPlayer(false)
      return
    }

    setCreatedPlayer(data)
    setStatus(
      targetRole === "head_admin"
        ? "Huvudadmin skapad ✅"
        : targetRole === "coach"
        ? "Tränare skapad ✅"
        : "Spelare skapad ✅"
    )
    setNewPlayerName("")
    setNewPlayerPassword("")
    setNewUserRole("player")
    setIsCreatingPlayer(false)
    loadPlayers()
    loadAllUsers()
    loadMessageRecipients()
    setCoachView(profile?.role === "head_admin" ? "users" : "players")
  }

  const normalizeImportHeader = (value) => {
    return String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "")
  }

  const normalizeExerciseImportType = (value) => {
    const normalized = normalizeImportHeader(value)

    if (["weightreps", "viktreps", "weight", "weight_rep", "weightrepsonly"].includes(normalized)) {
      return "weight_reps"
    }

    if (["secondsonly", "seconds", "sekunder", "tid", "time"].includes(normalized)) {
      return "seconds_only"
    }

    return "reps_only"
  }

  const normalizeExerciseImportRepsMode = (value) => {
    const normalized = normalizeImportHeader(value)
    return ["max", "failure", "tillfailure", "tillmax"].includes(normalized) ? "max" : "fixed"
  }

  const parseExerciseImportMuscleGroups = (value) => {
    if (Array.isArray(value)) {
      return value.map((entry) => String(entry || "").trim()).filter(Boolean)
    }

    return String(value || "")
      .split(/[\n,;|]+/)
      .map((entry) => entry.trim())
      .filter(Boolean)
  }

  const parseImportedExercisesFromJson = (rawValue) => {
    const rows = Array.isArray(rawValue)
      ? rawValue
      : Array.isArray(rawValue?.exercises)
      ? rawValue.exercises
      : Array.isArray(rawValue?.items)
      ? rawValue.items
      : Array.isArray(rawValue?.data)
      ? rawValue.data
      : []

    return rows
      .map((row, index) => {
        const normalizedEntries = Object.entries(row || {}).reduce((acc, [key, value]) => {
          acc[normalizeImportHeader(key)] = value
          return acc
        }, {})

        const name = String(
          normalizedEntries.name ||
            normalizedEntries.namn ||
            normalizedEntries.ovning ||
            normalizedEntries.exercise ||
            normalizedEntries.exercisename ||
            ""
        ).trim()

        const aliasesSource =
          normalizedEntries.aliases ||
          normalizedEntries.alias ||
          normalizedEntries.synonyms ||
          normalizedEntries.alternativenames ||
          ""

        const aliases = parseExerciseAliases(
          Array.isArray(aliasesSource) ? aliasesSource.join(",") : aliasesSource
        ).filter((alias) => alias.toLowerCase() !== name.toLowerCase())

        const allowedDisplayNames = [name, ...aliases].filter(Boolean)
        const requestedDisplayName = String(
          normalizedEntries.displayname ||
            normalizedEntries.display_name ||
            normalizedEntries.visningsnamn ||
            normalizedEntries.visanamn ||
            ""
        ).trim()

        return {
          rowNumber: index + 1,
          name,
          exercise_type: normalizeExerciseImportType(
            normalizedEntries.exercisetype || normalizedEntries.exercise_type || normalizedEntries.type
          ),
          default_reps_mode: normalizeExerciseImportRepsMode(
            normalizedEntries.defaultrepsmode ||
              normalizedEntries.default_reps_mode ||
              normalizedEntries.repsmode ||
              normalizedEntries.repmodus
          ),
          description: String(normalizedEntries.description || normalizedEntries.beskrivning || "").trim(),
          guide: String(normalizedEntries.guide || normalizedEntries.instruktion || normalizedEntries.instructions || "").trim(),
          media_url: String(
            normalizedEntries.mediaurl ||
              normalizedEntries.media_url ||
              normalizedEntries.videourl ||
              normalizedEntries.video ||
              normalizedEntries.referenceurl ||
              normalizedEntries.reference_url ||
              ""
          ).trim(),
          muscle_groups: parseExerciseImportMuscleGroups(
            normalizedEntries.musclegroups ||
              normalizedEntries.muscle_groups ||
              normalizedEntries.muskelgrupper
          ),
          aliases,
          display_name: allowedDisplayNames.includes(requestedDisplayName) ? requestedDisplayName : "",
          primary_category:
            normalizeExercisePrimaryCategory(
              normalizedEntries.primarycategory ||
                normalizedEntries.primary_category ||
                normalizedEntries.category ||
                normalizedEntries.kategori ||
                normalizedEntries.flik
            ) || "",
        }
      })
      .filter((exercise) => {
        return (
          exercise.name ||
          exercise.description ||
          exercise.guide ||
          exercise.media_url ||
          exercise.aliases.length > 0
        )
      })
  }

  const buildExercisePayload = (exercise) => {
    const exerciseName = String(exercise.name || "").trim()
    const parsedAliases = parseExerciseAliases(exercise.aliases).filter(
      (alias) => alias.toLowerCase() !== exerciseName.toLowerCase()
    )
    const allowedDisplayNames = [exerciseName, ...parsedAliases]
    const nextDisplayName = allowedDisplayNames.includes(String(exercise.display_name || "").trim())
      ? String(exercise.display_name || "").trim()
      : ""
    const nextExerciseType = normalizeExerciseImportType(exercise.exercise_type)

    return {
      name: exerciseName,
      exercise_type: nextExerciseType,
      guide: String(exercise.guide || "").trim() || null,
      description: String(exercise.description || "").trim() || null,
      media_url: String(exercise.media_url || "").trim() || null,
      default_reps_mode:
        nextExerciseType === "seconds_only"
          ? "fixed"
          : normalizeExerciseImportRepsMode(exercise.default_reps_mode),
      execution_side: normalizeExerciseExecutionSide(
        exercise.execution_side || exercise.executionSide || exercise.unilateral_mode
      ),
      muscle_groups: parseExerciseImportMuscleGroups(exercise.muscle_groups),
      aliases: parsedAliases,
      display_name: nextDisplayName || null,
      primary_category:
        normalizeExercisePrimaryCategory(exercise.primary_category) ||
        deriveExercisePrimaryCategory({
          exercise_type: nextExerciseType,
          muscle_groups: parseExerciseImportMuscleGroups(exercise.muscle_groups),
        }),
      navigation_category:
        normalizeExerciseNavigationCategory(exercise.navigation_category) ||
        deriveExerciseNavigationCategory({
          navigation_category: exercise.navigation_category,
          exercise_type: nextExerciseType,
          muscle_groups: parseExerciseImportMuscleGroups(exercise.muscle_groups),
        }),
    }
  }

  const handlePlayerImportFile = async (file) => {
    if (!file) return

    setStatus("")
    setImportResults([])
    setIsParsingImportFile(true)

    try {
      const isCsv = file.name.toLowerCase().endsWith(".csv")
      let parsedRows = []

      if (isCsv) {
        const text = await file.text()
        parsedRows = parseCsvContent(text)
      } else {
        const XLSX = await import("xlsx")
        const buffer = await file.arrayBuffer()
        const workbook = XLSX.read(buffer, { type: "array" })
        const firstSheetName = workbook.SheetNames[0]

        if (!firstSheetName) {
          setStatus("Kunde inte läsa någon flik i filen")
          setImportedPlayers([])
          setImportFileName("")
          return
        }

        const sheet = workbook.Sheets[firstSheetName]
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" })
        parsedRows = parseImportedPlayersFromRows(rows)
      }

      if (parsedRows.length === 0) {
        setStatus("Filen innehåller inga spelare att importera")
        setImportedPlayers([])
        setImportFileName(file.name)
        return
      }

      setImportedPlayers(parsedRows)
      setImportFileName(file.name)
      setStatus(`${parsedRows.length} spelare redo för import`)
    } catch (error) {
      console.error(error)
      setStatus("Kunde inte läsa filen")
      setImportedPlayers([])
      setImportFileName("")
    } finally {
      setIsParsingImportFile(false)
    }
  }

  const handleExerciseImportFile = async (file) => {
    if (!file) return

    setStatus("")
    setExerciseImportResults([])
    setIsParsingExerciseImportFile(true)

    try {
      const rawText = await file.text()
      const parsedJson = JSON.parse(rawText)
      const parsedRows = parseImportedExercisesFromJson(parsedJson)

      if (parsedRows.length === 0) {
        setStatus("JSON-filen innehåller inga övningar att importera")
        setImportedExercises([])
        setExerciseImportFileName(file.name)
        return
      }

      setImportedExercises(parsedRows)
      setExerciseImportFileName(file.name)
      setStatus(`${parsedRows.length} övningar redo för import`)
    } catch (error) {
      console.error(error)
      setStatus("Kunde inte läsa JSON-filen")
      setImportedExercises([])
      setExerciseImportFileName("")
    } finally {
      setIsParsingExerciseImportFile(false)
    }
  }

  const resetExerciseImport = () => {
    setImportedExercises([])
    setExerciseImportFileName("")
    setExerciseImportResults([])
  }

  const handleSelectedExerciseOptionChange = (exerciseIndex, optionKey) => {
    setSelectedExerciseOptionKeys((prev) => ({
      ...prev,
      [exerciseIndex]: optionKey,
    }))
  }

  const handleImportPlayers = async () => {
    if (!importedPlayers.length) {
      setStatus("Ladda upp en fil först")
      return
    }

    const accessToken = await ensureFreshSession()

    if (!accessToken) {
      return
    }

    setIsImportingPlayers(true)
    setStatus("")

    const results = []

    for (const player of importedPlayers) {
      if (!player.full_name || !player.password) {
        results.push({
          ...player,
          success: false,
          message: "Saknar namn eller lösenord",
        })
        continue
      }

      const { data, error } = await supabase.functions.invoke("create-player", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: {
          full_name: player.full_name,
          password: player.password,
          role: "player",
          team_id: profile?.team_id,
        },
      })

      if (error || data?.error) {
        results.push({
          ...player,
          success: false,
          message: data?.error || (await getFunctionErrorMessage(error, "Kunde inte skapa spelare")),
        })
        continue
      }

      results.push({
        ...player,
        success: true,
        username: data.username,
        email: data.email,
        message: "Skapad",
      })
    }

    setImportResults(results)
    setIsImportingPlayers(false)

    const successCount = results.filter((result) => result.success).length
    const failedCount = results.length - successCount

    if (successCount > 0) {
      await loadPlayers()
    }

    setStatus(
      failedCount > 0
        ? `${successCount} spelare skapade, ${failedCount} misslyckades`
        : `${successCount} spelare skapade ✅`
    )
  }

  const handleCreateTeam = async () => {
    setStatus("")

    if (!newTeamName.trim()) {
      setStatus("Ange namn på lag")
      return
    }

    setIsCreatingTeam(true)

    const { data, error } = await supabase
      .from("teams")
      .insert({ name: newTeamName.trim() })
      .select()
      .single()

    if (error) {
      console.error(error)
      setStatus("Kunde inte skapa lag")
      setIsCreatingTeam(false)
      return
    }

    setTeams((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name, "sv")))
    setNewTeamName("")
    setStatus("Lag skapat ✅")
    setIsCreatingTeam(false)
  }

  const handleDeleteTeam = async (team) => {
    if (!team?.id) return

    const relatedUsers = (allUsers || []).filter(
      (entry) => entry.team_id === team.id && entry.role !== "head_admin"
    )

    if (relatedUsers.length > 0) {
      setStatus("Laget kan inte tas bort så länge spelare eller tränare är kopplade till det")
      return
    }

    const [{ count: workoutTemplateCount, error: workoutTemplateError }, { count: warmupTemplateCount, error: warmupTemplateError }] =
      await Promise.all([
        supabase
          .from("workout_templates")
          .select("*", { count: "exact", head: true })
          .eq("team_id", team.id),
        supabase
          .from("warmup_templates")
          .select("*", { count: "exact", head: true })
          .eq("team_id", team.id),
      ])

    if (workoutTemplateError || warmupTemplateError) {
      console.error(workoutTemplateError || warmupTemplateError)
      setStatus("Kunde inte kontrollera om laget kan tas bort")
      return
    }

    if ((workoutTemplateCount || 0) > 0 || (warmupTemplateCount || 0) > 0) {
      setStatus("Laget kan inte tas bort så länge det fortfarande har pass eller uppvärmningsmallar")
      return
    }

    const confirmed = window.confirm(`Vill du ta bort laget ${team.name}?`)
    if (!confirmed) return

    setDeletingTeamId(team.id)

    const { error } = await supabase.from("teams").delete().eq("id", team.id)

    if (error) {
      console.error(error)
      setStatus("Kunde inte ta bort lag")
      setDeletingTeamId(null)
      return
    }

    setTeams((prev) => prev.filter((entry) => entry.id !== team.id))
    setAllUsers((prev) =>
      prev.map((entry) =>
        entry.team_id === team.id && entry.role === "head_admin"
          ? { ...entry, team_id: null }
          : entry
      )
    )
    setSelectedTeamId((prev) => (prev === team.id ? "" : prev))
    setStatus("Lag borttaget ✅")
    setDeletingTeamId(null)
  }

  const handleTargetDraftChange = (passName, exerciseName, field, value) => {
    setTargetDrafts((prev) => ({
      ...prev,
      [passName]: {
        ...(prev[passName] || {}),
        [exerciseName]: {
          ...((prev[passName] || {})[exerciseName] || {}),
          [field]: value,
        },
      },
    }))
  }

  const handleSaveTargets = async () => {
    if (!selectedPlayer) return

    setIsSavingTargets(true)

    const rows = selectedPlayerAssignedPasses.flatMap((passName) => {
      const exercises = activeWorkouts[passName]?.exercises || []

      return exercises.map((exercise) => {
        const draft = targetDrafts[passName]?.[exercise.name] || {}
        const repTargetPayload = parseRepTargetInput(draft.target_reps, draft.target_reps_mode)

        return {
          player_id: selectedPlayer.id,
          pass_name: passName,
          exercise_name: exercise.name,
          target_sets: draft.target_sets === "" ? null : Number(draft.target_sets),
          ...repTargetPayload,
          target_weight: null,
          target_comment: draft.target_comment || null,
        }
      })
    })

    if (rows.length === 0) {
      setStatus("Det finns inga övningar med individuella mål i de tilldelade passen")
      setIsSavingTargets(false)
      return
    }

    const { error } = await supabase
      .from("player_exercise_targets")
      .upsert(rows, { onConflict: "player_id,pass_name,exercise_name" })

    if (error) {
      console.error(error)
      setStatus("Kunde inte spara individuella mål")
      setIsSavingTargets(false)
      return
    }

    setStatus("Individuella mål sparade ✅")
    setIsSavingTargets(false)
    await loadPlayerTargets(selectedPlayer.id)
  }

  const buildPassAssignmentRowsForPlayer = (playerId, passName) => {
    const exercises = activeWorkouts[passName]?.exercises || []

    return [
      {
        player_id: playerId,
        pass_name: passName,
        exercise_name: PASS_ASSIGNMENT_EXERCISE_NAME,
        target_sets: null,
        target_reps: null,
        target_reps_min: null,
        target_reps_max: null,
        target_reps_text: null,
        target_reps_mode: "fixed",
        target_weight: null,
        target_comment: null,
      },
      ...exercises.map((exercise) => ({
        player_id: playerId,
        pass_name: passName,
        exercise_name: exercise.name,
        target_sets: null,
        target_reps: null,
        target_reps_min: null,
        target_reps_max: null,
        target_reps_text: null,
        target_reps_mode: exercise.defaultRepsMode || "fixed",
        target_weight: null,
        target_comment: null,
      })),
    ]
  }

  const handleAssignPassToPlayer = async (passName) => {
    if (!selectedPlayer) return

    const rows = buildPassAssignmentRowsForPlayer(selectedPlayer.id, passName)

    setIsUpdatingPassAssignments(true)

    const { error } = await supabase
      .from("player_exercise_targets")
      .upsert(rows, { onConflict: "player_id,pass_name,exercise_name" })

    if (error) {
      console.error(error)
      setStatus("Kunde inte tilldela pass")
      setIsUpdatingPassAssignments(false)
      return
    }

    setStatus(`${activeWorkouts[passName]?.label || passName} tilldelat ✅`)
    await loadPlayerTargets(selectedPlayer.id)
    setIsUpdatingPassAssignments(false)
  }

  const handleAssignPassToPlayers = async (passName, playerIds, options = {}) => {
    const validPlayerIds = Array.from(new Set((playerIds || []).filter(Boolean)))

    if (!passName || validPlayerIds.length === 0) {
      setStatus("Välj minst en spelare att tilldela passet till")
      return false
    }

    const rows = validPlayerIds.flatMap((playerId) => buildPassAssignmentRowsForPlayer(playerId, passName))

    setIsUpdatingPassAssignments(true)

    const { error } = await supabase
      .from("player_exercise_targets")
      .upsert(rows, { onConflict: "player_id,pass_name,exercise_name" })

    if (error) {
      console.error(error)
      setStatus("Kunde inte tilldela pass")
      setIsUpdatingPassAssignments(false)
      return false
    }

    const passLabel = activeWorkouts[passName]?.label || passName
    const successMessage = options.allPlayers
      ? `${passLabel} tilldelat till alla spelare ✅`
      : `${passLabel} tilldelat till ${validPlayerIds.length} spelare ✅`

    setStatus(successMessage)

    if (selectedPlayer && validPlayerIds.includes(selectedPlayer.id)) {
      await loadPlayerTargets(selectedPlayer.id)
    }

    await loadPassAssignmentPlayerIdsByPass(validPlayerIds)

    setIsUpdatingPassAssignments(false)
    return true
  }

  const handleSavePassAssignmentsToPlayers = async (passName, selectedPlayerIds, scopePlayerIds) => {
    const validScopePlayerIds = Array.from(new Set((scopePlayerIds || []).filter(Boolean)))
    const nextSelectedPlayerIds = Array.from(new Set((selectedPlayerIds || []).filter(Boolean)))

    if (!passName || validScopePlayerIds.length === 0) {
      setStatus("Det finns inga spelare att uppdatera för det här passet")
      return false
    }

    const playerIdsToKeepAssigned = nextSelectedPlayerIds.filter((playerId) => validScopePlayerIds.includes(playerId))
    const playerIdsToRemove = validScopePlayerIds.filter((playerId) => !playerIdsToKeepAssigned.includes(playerId))

    setIsUpdatingPassAssignments(true)

    if (playerIdsToRemove.length > 0) {
      const { error: deleteError } = await supabase
        .from("player_exercise_targets")
        .delete()
        .eq("pass_name", passName)
        .in("player_id", playerIdsToRemove)

      if (deleteError) {
        console.error(deleteError)
        setStatus("Kunde inte uppdatera passtilldelningarna")
        setIsUpdatingPassAssignments(false)
        return false
      }
    }

    if (playerIdsToKeepAssigned.length > 0) {
      const rows = playerIdsToKeepAssigned.flatMap((playerId) => buildPassAssignmentRowsForPlayer(playerId, passName))

      const { error: upsertError } = await supabase
        .from("player_exercise_targets")
        .upsert(rows, { onConflict: "player_id,pass_name,exercise_name" })

      if (upsertError) {
        console.error(upsertError)
        setStatus("Kunde inte uppdatera passtilldelningarna")
        setIsUpdatingPassAssignments(false)
        return false
      }
    }

    const passLabel = activeWorkouts[passName]?.label || passName

    if (playerIdsToKeepAssigned.length === 0) {
      setStatus(`${passLabel} borttaget från alla markerade spelare ✅`)
    } else {
      setStatus(`Tilldelningar sparade för ${passLabel} ✅`)
    }

    if (selectedPlayer && validScopePlayerIds.includes(selectedPlayer.id)) {
      await loadPlayerTargets(selectedPlayer.id)
    }

    await loadPassAssignmentPlayerIdsByPass(validScopePlayerIds)
    setIsUpdatingPassAssignments(false)
    return true
  }

  const handleUnassignPassFromPlayer = async (passName) => {
    if (!selectedPlayer) return

    setIsUpdatingPassAssignments(true)

    const { error } = await supabase
      .from("player_exercise_targets")
      .delete()
      .eq("player_id", selectedPlayer.id)
      .eq("pass_name", passName)

    if (error) {
      console.error(error)
      setStatus("Kunde inte ta bort passtilldelning")
      setIsUpdatingPassAssignments(false)
      return
    }

    setStatus(`${activeWorkouts[passName]?.label || passName} borttaget ✅`)
    await loadPlayerTargets(selectedPlayer.id)
    await loadPassAssignmentPlayerIdsByPass()
    setIsUpdatingPassAssignments(false)
  }

  const handleAssignAllPassesToPlayer = async () => {
    if (!selectedPlayer) return

    const passRows = Object.entries(activeWorkouts).flatMap(([passName, workout]) =>
      [
        {
          player_id: selectedPlayer.id,
          pass_name: passName,
          exercise_name: PASS_ASSIGNMENT_EXERCISE_NAME,
          target_sets: null,
          target_reps: null,
          target_reps_min: null,
          target_reps_max: null,
          target_reps_text: null,
          target_reps_mode: "fixed",
          target_weight: null,
          target_comment: null,
        },
        ...(workout.exercises || []).map((exercise) => {
          const draft = targetDrafts[passName]?.[exercise.name] || {}
          const repTargetPayload = parseRepTargetInput(
            draft.target_reps,
            draft.target_reps_mode || exercise.defaultRepsMode || "fixed"
          )

          return {
            player_id: selectedPlayer.id,
            pass_name: passName,
            exercise_name: exercise.name,
            target_sets:
              draft.target_sets === "" || draft.target_sets == null ? null : Number(draft.target_sets),
            ...repTargetPayload,
            target_weight: null,
            target_comment: draft.target_comment || null,
          }
        }),
      ]
    )

    if (passRows.length === 0) {
      setStatus("Det finns inga pass med övningar att tilldela")
      return
    }

    setIsUpdatingPassAssignments(true)

    const { error } = await supabase
      .from("player_exercise_targets")
      .upsert(passRows, { onConflict: "player_id,pass_name,exercise_name" })

    if (error) {
      console.error(error)
      setStatus("Kunde inte tilldela alla pass")
      setIsUpdatingPassAssignments(false)
      return
    }

    setStatus(`Alla pass tilldelade till ${selectedPlayer.full_name} ✅`)
    await loadPlayerTargets(selectedPlayer.id)
    setIsUpdatingPassAssignments(false)
  }

  const handleClearAssignedPassesFromPlayer = async () => {
    if (!selectedPlayer) return

    const confirmed = window.confirm(
      `Vill du ta bort alla passtilldelningar för ${selectedPlayer.full_name}? Alla individuella mål försvinner också.`
    )

    if (!confirmed) return

    setIsUpdatingPassAssignments(true)

    const { error } = await supabase
      .from("player_exercise_targets")
      .delete()
      .eq("player_id", selectedPlayer.id)

    if (error) {
      console.error(error)
      setStatus("Kunde inte rensa passtilldelningarna")
      setIsUpdatingPassAssignments(false)
      return
    }

    setStatus(`Alla pass borttagna för ${selectedPlayer.full_name} ✅`)
    await loadPlayerTargets(selectedPlayer.id)
    setIsUpdatingPassAssignments(false)
  }

  const resetExerciseForm = () => {
    setNewExerciseName("")
    setNewExerciseType("weight_reps")
    setNewExerciseGuide("")
    setNewExerciseDescription("")
    setNewExerciseMediaUrl("")
    setNewExerciseDefaultRepsMode("fixed")
    setNewExerciseExecutionSide("standard")
    setNewExerciseMuscleGroups([])
    setNewExerciseAliasesText("")
    setNewExerciseDisplayName("")
    setNewExercisePrimaryCategory("styrka")
    setNewExerciseNavigationCategory("Övrigt")
    setEditingExerciseId(null)
  }

  const handleStartEditExercise = (exercise) => {
    setNewExerciseName(exercise.name || "")
    setNewExerciseType(exercise.exercise_type || "weight_reps")
    setNewExerciseGuide(exercise.guide || "")
    setNewExerciseDescription(exercise.description || "")
    setNewExerciseMediaUrl(exercise.media_url || "")
    setNewExerciseDefaultRepsMode(exercise.default_reps_mode || "fixed")
    setNewExerciseExecutionSide(normalizeExerciseExecutionSide(exercise.execution_side))
    setNewExerciseMuscleGroups(Array.isArray(exercise.muscle_groups) ? exercise.muscle_groups : [])
    setNewExerciseAliasesText(Array.isArray(exercise.aliases) ? exercise.aliases.join(", ") : "")
    setNewExerciseDisplayName(exercise.display_name || "")
    setNewExercisePrimaryCategory(deriveExercisePrimaryCategory(exercise))
    setNewExerciseNavigationCategory(deriveExerciseNavigationCategory(exercise))
    setEditingExerciseId(exercise.id)
    setCoachView("exerciseBank")
    setStatus("Redigerar övning")
  }

  const handleCreateExercise = async () => {
    setStatus("")

    if (!newExerciseName.trim()) {
      setStatus("Fyll i namn på övning")
      return
    }

    setIsSavingExercise(true)
    const payload = buildExercisePayload({
      name: newExerciseName,
      exercise_type: newExerciseType,
      guide: newExerciseGuide,
      description: newExerciseDescription,
      media_url: newExerciseMediaUrl,
      default_reps_mode: newExerciseDefaultRepsMode,
      execution_side: newExerciseExecutionSide,
      muscle_groups: newExerciseMuscleGroups,
      aliases: newExerciseAliasesText,
      display_name: newExerciseDisplayName,
      primary_category: newExercisePrimaryCategory,
      navigation_category: newExerciseNavigationCategory,
    })

    const query = editingExerciseId
      ? supabase.from("exercises").update(payload).eq("id", editingExerciseId).select().single()
      : supabase.from("exercises").insert(payload).select().single()

    const { data, error } = await query

    if (error) {
      console.error(error)
      const errorMessage = String(error.message || "").toLowerCase()
      const missingExerciseColumns =
        errorMessage.includes("muscle_groups") ||
        errorMessage.includes("description") ||
        errorMessage.includes("media_url") ||
        errorMessage.includes("execution_side") ||
        errorMessage.includes("primary_category") ||
        errorMessage.includes("navigation_category")

      setStatus(
        missingExerciseColumns
          ? "Kunde inte spara övning. Kör SQL-ändringarna i Supabase först för muscle_groups, description, media_url, execution_side, primary_category och navigation_category."
          : `${editingExerciseId ? "Kunde inte uppdatera övning" : "Kunde inte spara övning"}${error.message ? `: ${error.message}` : ""}`
      )
      setIsSavingExercise(false)
      return
    }

    setExercisesFromDB((prev) => {
      const withoutCurrent = prev.filter((exercise) => exercise.id !== data.id)
      return [...withoutCurrent, data].sort((a, b) =>
        getExerciseDisplayName(a).localeCompare(getExerciseDisplayName(b), "sv")
      )
    })

    resetExerciseForm()
    setStatus(editingExerciseId ? "Övning uppdaterad ✅" : "Övning sparad ✅")
    setIsSavingExercise(false)
  }

  const handleImportExercises = async () => {
    if (!importedExercises.length) {
      setStatus("Ladda upp en JSON-fil först")
      return
    }

    setIsImportingExercises(true)
    setStatus("")

    const existingExercisesByName = new Map(
      exercisesFromDB.map((exercise) => [String(exercise.name || "").trim().toLowerCase(), exercise])
    )
    const results = []
    let hasMissingColumnError = false

    for (const exercise of importedExercises) {
      if (!exercise.name) {
        results.push({
          ...exercise,
          success: false,
          message: "Saknar namn på övning",
        })
        continue
      }

      const payload = buildExercisePayload(exercise)
      const existingExercise = existingExercisesByName.get(payload.name.toLowerCase())
      const query = existingExercise
        ? supabase.from("exercises").update(payload).eq("id", existingExercise.id).select().single()
        : supabase.from("exercises").insert(payload).select().single()
      const { data, error } = await query

      if (error) {
        console.error(error)
        const errorMessage = String(error.message || "").toLowerCase()
        if (
          errorMessage.includes("muscle_groups") ||
          errorMessage.includes("description") ||
          errorMessage.includes("media_url") ||
          errorMessage.includes("execution_side") ||
          errorMessage.includes("navigation_category")
        ) {
          hasMissingColumnError = true
        }

        results.push({
          ...exercise,
          success: false,
          message: error.message || "Kunde inte spara övningen",
        })
        continue
      }

      if (data) {
        existingExercisesByName.set(payload.name.toLowerCase(), data)
      }

      results.push({
        ...exercise,
        success: true,
        message: existingExercise ? "Uppdaterad" : "Importerad",
      })
    }

    setExerciseImportResults(results)
    setIsImportingExercises(false)

    const successCount = results.filter((entry) => entry.success).length
    const failedCount = results.length - successCount

    if (successCount > 0) {
      await loadExercises()
    }

    if (hasMissingColumnError) {
      setStatus(
        "Importen stoppades delvis. Kör SQL-ändringarna i Supabase först för muscle_groups, description, media_url, execution_side och navigation_category."
      )
      return
    }

    setStatus(
      failedCount > 0
        ? `${successCount} övningar importerade, ${failedCount} misslyckades`
        : `${successCount} övningar importerade ✅`
    )
  }

  const handleExportExercises = () => {
    const exportRows = exercisesFromDB
      .slice()
      .sort((a, b) => getExerciseDisplayName(a).localeCompare(getExerciseDisplayName(b), "sv"))

    const json = JSON.stringify(exportRows, null, 2)
    const blob = new Blob([json], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    const dateLabel = new Date().toISOString().slice(0, 10)

    link.href = url
    link.download = `exercise-bank-${dateLabel}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    setStatus("Övningsbanken exporterad ✅")
  }

  const handleDeleteExercise = async (exerciseId) => {
    const confirmDelete = window.confirm("Vill du ta bort denna övning?")
    if (!confirmDelete) return

    const { error } = await supabase
      .from("exercises")
      .update({ is_active: false })
      .eq("id", exerciseId)

    if (error) {
      console.error(error)
      setStatus("Kunde inte ta bort övning")
      return
    }

    setExercisesFromDB((prev) => prev.filter((ex) => ex.id !== exerciseId))
    setStatus("Övning arkiverad ✅")
  }

  const handleAddExerciseToPass = async () => {
    setStatus("")

    if (!selectedExerciseId) {
      setStatus("Välj en övning")
      return false
    }

    const selectedTemplate = templatesFromDB.find((template) => template.code === selectedTemplateCode)
    const selectedExercise = exercisesFromDB.find(
      (exercise) => String(exercise.id) === String(selectedExerciseId)
    )

    if (!selectedTemplate || !selectedExercise) {
      setStatus("Kunde inte hitta pass eller övning")
      return false
    }

    const existingRowsForTemplate = templateExercisesFromDB.filter(
      (row) => row.workout_templates?.code === selectedTemplateCode
    )

    const alreadyExists = existingRowsForTemplate.some(
      (row) => String(row.exercise_id) === String(selectedExerciseId)
    )

    if (alreadyExists) {
      setStatus("Övningen finns redan i passet")
      return false
    }

    const nextSortOrder =
      existingRowsForTemplate.length > 0
        ? Math.max(...existingRowsForTemplate.map((row) => row.sort_order || 0)) + 1
        : 1

    setIsSavingPassExercise(true)

    const insertPayload = {
      workout_template_id: selectedTemplate.id,
      exercise_id: selectedExerciseId,
      sort_order: nextSortOrder,
      custom_guide: null,
    }

    const selectedExerciseRecord = exercisesFromDB.find(
      (exercise) => String(exercise.id) === String(selectedExerciseId)
    )

    const { data, error } = await supabase
      .from("workout_template_exercises")
      .insert(insertPayload)
      .select(`
        id,
        sort_order,
        custom_guide,
        target_sets,
        target_reps,
        target_reps_min,
        target_reps_max,
        target_reps_mode,
        target_reps_text,
        target_duration_text,
        workout_template_id,
        exercise_id
      `)
      .single()

    if (error) {
      console.error(error)
      setStatus(
        `Kunde inte lägga till övning i passet${error.message ? `: ${error.message}` : ""}`
      )
      setIsSavingPassExercise(false)
      return false
    }

    setTemplateExercisesFromDB((prev) => [
      ...prev,
      {
        ...data,
        workout_templates: {
          code: selectedTemplate.code,
          label: selectedTemplate.label,
        },
        exercises: {
          name: selectedExerciseRecord?.name || "",
          exercise_type: selectedExerciseRecord?.exercise_type || "reps_only",
          guide: selectedExerciseRecord?.guide || "",
          description: selectedExerciseRecord?.description || "",
          media_url: selectedExerciseRecord?.media_url || "",
          default_reps_mode: selectedExerciseRecord?.default_reps_mode || "fixed",
          execution_side: selectedExerciseRecord?.execution_side || "standard",
        },
      },
    ])
    setSelectedExerciseId("")
    setStatus("Övning tillagd i passet ✅")
    setIsSavingPassExercise(false)
    return data?.id || true
  }

  const handlePassExerciseDraftChange = (rowId, field, value) => {
    setPassExerciseDrafts((prev) => ({
      ...prev,
      [rowId]: {
        ...(prev[rowId] || {}),
        [field]: value,
      },
    }))
  }

  const handleAddAlternativeExerciseToPassExercise = async (passExerciseId, alternativeExerciseId) => {
    setStatus("")

    if (!passExerciseId || !alternativeExerciseId) {
      setStatus("Välj en alternativ övning")
      return false
    }

    const passExerciseRow = templateExercisesFromDB.find((row) => String(row.id) === String(passExerciseId))

    if (!passExerciseRow) {
      setStatus("Kunde inte hitta passövningen")
      return false
    }

    if (String(passExerciseRow.exercise_id) === String(alternativeExerciseId)) {
      setStatus("Alternativ övning kan inte vara samma som huvudövningen")
      return false
    }

    const alreadyExists = templateExerciseAlternativesFromDB.some(
      (row) =>
        String(row.workout_template_exercise_id) === String(passExerciseId) &&
        String(row.alternative_exercise_id) === String(alternativeExerciseId)
    )

    if (alreadyExists) {
      setStatus("Den alternativa övningen finns redan")
      return false
    }

    setIsSavingPassExercise(true)

    const { data, error } = await supabase
      .from("workout_template_exercise_alternatives")
      .insert({
        workout_template_exercise_id: passExerciseId,
        alternative_exercise_id: alternativeExerciseId,
      })
      .select("id, workout_template_exercise_id, alternative_exercise_id")
      .single()

    if (error) {
      console.error(error)
      setStatus(`Kunde inte lägga till alternativ övning${error.message ? `: ${error.message}` : ""}`)
      setIsSavingPassExercise(false)
      return false
    }

    setTemplateExerciseAlternativesFromDB((prev) => [...prev, data])
    setStatus("Alternativ övning tillagd ✅")
    setIsSavingPassExercise(false)
    return true
  }

  const handleRemoveAlternativeExerciseFromPassExercise = async (alternativeRowId) => {
    setStatus("")

    if (!alternativeRowId) return false

    setIsSavingPassExercise(true)

    const { error } = await supabase
      .from("workout_template_exercise_alternatives")
      .delete()
      .eq("id", alternativeRowId)

    if (error) {
      console.error(error)
      setStatus(`Kunde inte ta bort alternativ övning${error.message ? `: ${error.message}` : ""}`)
      setIsSavingPassExercise(false)
      return false
    }

    setTemplateExerciseAlternativesFromDB((prev) =>
      prev.filter((row) => String(row.id) !== String(alternativeRowId))
    )
    setStatus("Alternativ övning borttagen ✅")
    setIsSavingPassExercise(false)
    return true
  }

  const handleAddHrgProgramToPass = async (programName) => {
    setStatus("")

    const selectedTemplate = templatesFromDB.find((template) => template.code === selectedTemplateCode)

    if (!selectedTemplate) {
      setStatus("Välj först ett pass")
      return false
    }

    const programBlocks = buildHrgProgramBlocks(exercisesFromDB, programName)

    if (programBlocks.length === 0) {
      setStatus(`Kunde inte hitta ${programName} i övningsbanken`)
      return false
    }

    const existingRowsForTemplate = templateExercisesFromDB
      .filter((row) => row.workout_templates?.code === selectedTemplateCode)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))

    const templateRowIds = new Set(existingRowsForTemplate.map((row) => String(row.id)))
    const existingAlternativeRows = templateExerciseAlternativesFromDB.filter((row) =>
      templateRowIds.has(String(row.workout_template_exercise_id))
    )

    const existingRowByExerciseId = new Map(
      existingRowsForTemplate.map((row) => [String(row.exercise_id), row])
    )
    const existingMainExerciseIds = new Set(existingRowsForTemplate.map((row) => String(row.exercise_id)))
    const existingAlternativeKeys = new Set(
      existingAlternativeRows.map(
        (row) => `${row.workout_template_exercise_id}:${row.alternative_exercise_id}`
      )
    )
    const existingAlternativeExerciseIds = new Set(
      existingAlternativeRows.map((row) => String(row.alternative_exercise_id))
    )

    let nextSortOrder =
      existingRowsForTemplate.length > 0
        ? Math.max(...existingRowsForTemplate.map((row) => row.sort_order || 0)) + 1
        : 1

    let addedBaseCount = 0
    let addedAlternativeCount = 0
    let focusedRowId = null
    const newTemplateRows = []
    const newAlternativeRows = []

    setIsSavingPassExercise(true)

    try {
      for (const block of programBlocks) {
        const baseExercise = block.baseExercise
        const baseExerciseId = String(baseExercise.id)
        let baseRow = existingRowByExerciseId.get(baseExerciseId)

        if (!baseRow) {
          const { data, error } = await supabase
            .from("workout_template_exercises")
            .insert({
              workout_template_id: selectedTemplate.id,
              exercise_id: baseExercise.id,
              sort_order: nextSortOrder,
              custom_guide: null,
            })
            .select(`
              id,
              sort_order,
              custom_guide,
              target_sets,
              target_reps,
              target_reps_min,
              target_reps_max,
              target_reps_mode,
              target_reps_text,
              target_duration_text,
              workout_template_id,
              exercise_id
            `)
            .single()

          if (error) {
            throw new Error(
              `Kunde inte lägga till ${getExerciseDisplayName(baseExercise)} i passet${
                error.message ? `: ${error.message}` : ""
              }`
            )
          }

          baseRow = {
            ...data,
            workout_templates: {
              code: selectedTemplate.code,
              label: selectedTemplate.label,
            },
            exercises: {
              name: baseExercise.name || "",
              exercise_type: baseExercise.exercise_type || "reps_only",
              guide: baseExercise.guide || "",
              description: baseExercise.description || "",
              media_url: baseExercise.media_url || "",
              default_reps_mode: baseExercise.default_reps_mode || "fixed",
              execution_side: baseExercise.execution_side || "standard",
            },
          }

          newTemplateRows.push(baseRow)
          existingRowByExerciseId.set(baseExerciseId, baseRow)
          existingMainExerciseIds.add(baseExerciseId)
          nextSortOrder += 1
          addedBaseCount += 1
        }

        if (!focusedRowId) {
          focusedRowId = baseRow.id
        }

        for (const alternativeExercise of block.alternativeExercises) {
          const alternativeExerciseId = String(alternativeExercise.id)

          if (alternativeExerciseId === baseExerciseId) continue
          if (existingMainExerciseIds.has(alternativeExerciseId)) continue
          if (existingAlternativeExerciseIds.has(alternativeExerciseId)) continue

          const alternativeKey = `${baseRow.id}:${alternativeExercise.id}`
          if (existingAlternativeKeys.has(alternativeKey)) continue

          const { data, error } = await supabase
            .from("workout_template_exercise_alternatives")
            .insert({
              workout_template_exercise_id: baseRow.id,
              alternative_exercise_id: alternativeExercise.id,
            })
            .select("id, workout_template_exercise_id, alternative_exercise_id")
            .single()

          if (error) {
            throw new Error(
              `Kunde inte lägga till alternativet ${getExerciseDisplayName(alternativeExercise)}${
                error.message ? `: ${error.message}` : ""
              }`
            )
          }

          newAlternativeRows.push(data)
          existingAlternativeKeys.add(alternativeKey)
          existingAlternativeExerciseIds.add(alternativeExerciseId)
          addedAlternativeCount += 1
        }
      }

      if (newTemplateRows.length > 0) {
        setTemplateExercisesFromDB((prev) => [...prev, ...newTemplateRows])
      }

      if (newAlternativeRows.length > 0) {
        setTemplateExerciseAlternativesFromDB((prev) => [...prev, ...newAlternativeRows])
      }

      if (addedBaseCount === 0 && addedAlternativeCount === 0) {
        setStatus(`${programName} finns redan i passet`)
        return focusedRowId || true
      }

      setStatus(
        `${programName} tillagt ✅ ${addedBaseCount} huvudövningar och ${addedAlternativeCount} alternativ`
      )

      return focusedRowId || true
    } catch (error) {
      console.error(error)
      setStatus(error.message || `Kunde inte lägga till ${programName}`)
      return false
    } finally {
      setIsSavingPassExercise(false)
    }
  }

  const handleSavePassExercises = async () => {
    const selectedTemplate = templatesFromDB.find((template) => template.code === selectedTemplateCode)
    if (!selectedTemplate) {
      setStatus("Kunde inte hitta valt pass")
      return false
    }

    const hasRenameChange =
      !!renamePassName.trim() &&
      renamePassName.trim() !== selectedTemplate.label
    const nextInfoValue = renamePassInfo.trim()
    const nextWarmupCardioValue = renamePassWarmupCardio.trim()
    const nextWarmupTechniqueValue = renamePassWarmupTechnique.trim()
    const nextWorkoutKind = renamePassWorkoutKind || "gym"
    const nextGymPassType = renamePassGymPassType || "individual"
    const nextRunningType = renamePassRunningType || "intervals"
    const normalizedRenameIntervalProgram = normalizeIntervalProgramDraft(renamePassRunningIntervalProgram)
    const renameLegacyIntervalFields = intervalProgramToLegacyFields(normalizedRenameIntervalProgram)
    const nextRunningDistance = renamePassRunningDistance.trim()
    const nextRunningTime = renamePassRunningTime.trim()
    const hasInfoChange = nextInfoValue !== (selectedTemplate.info || "")
    const hasWarmupCardioChange = nextWarmupCardioValue !== (selectedTemplate.warmup_cardio || "")
    const hasWarmupTechniqueChange =
      nextWarmupTechniqueValue !== (selectedTemplate.warmup_technique || "")
    const hasWorkoutKindChange = nextWorkoutKind !== (selectedTemplate.workout_kind || "gym")
    const hasGymPassTypeChange = nextGymPassType !== (selectedTemplate.gym_pass_type || "individual")
    const hasRunningConfigChange =
      nextRunningType !== (selectedTemplate.running_type || "intervals") ||
      JSON.stringify(normalizedRenameIntervalProgram || null) !==
        JSON.stringify(getRunningProgramFromTemplate(selectedTemplate) || null) ||
      nextRunningDistance !==
        String(selectedTemplate.running_distance != null ? selectedTemplate.running_distance : "") ||
      nextRunningTime !== (selectedTemplate.running_time || "")
    const updates = Object.entries(passExerciseDrafts).flatMap(([rowId, draft]) => {
      const existingRow = templateExercisesFromDB.find((row) => String(row.id) === String(rowId))
      const update = buildPassExerciseUpdateFromDraft(existingRow, draft)
      return update ? [update] : []
    })

    if (nextWorkoutKind === "running" && nextRunningType === "intervals" && !normalizedRenameIntervalProgram) {
      setStatus("Lägg in minst ett giltigt intervallblock")
      return false
    }

    if (
      !hasRenameChange &&
      !hasInfoChange &&
      !hasWarmupCardioChange &&
      !hasWarmupTechniqueChange &&
      !hasWorkoutKindChange &&
      !hasGymPassTypeChange &&
      !hasRunningConfigChange &&
      updates.length === 0
    ) {
      setStatus("Inga passändringar att spara")
      return true
    }

    setStatus("")
    let missingInfoColumn = false

    if (
      hasRenameChange ||
      hasInfoChange ||
      hasWarmupCardioChange ||
      hasWarmupTechniqueChange ||
      hasWorkoutKindChange ||
      hasGymPassTypeChange ||
      hasRunningConfigChange
    ) {
      let { data, error } = await supabase
        .from("workout_templates")
        .update({
          label: hasRenameChange ? renamePassName.trim() : selectedTemplate.label,
          info: nextInfoValue || null,
          warmup_cardio: nextWarmupCardioValue || null,
          warmup_technique: nextWarmupTechniqueValue || null,
          workout_kind: nextWorkoutKind,
          gym_pass_type: nextWorkoutKind === "gym" ? nextGymPassType : null,
          running_type: nextWorkoutKind === "running" ? nextRunningType : null,
          running_interval_program:
            nextWorkoutKind === "running" && nextRunningType === "intervals"
              ? normalizedRenameIntervalProgram
              : null,
          running_interval_time:
            nextWorkoutKind === "running" && nextRunningType === "intervals"
              ? renameLegacyIntervalFields.interval_time
              : null,
          running_intervals_count:
            nextWorkoutKind === "running" && nextRunningType === "intervals"
              ? renameLegacyIntervalFields.intervals_count
              : null,
          running_distance:
            nextWorkoutKind === "running" && nextRunningType === "distance" && nextRunningDistance
              ? parseLoggedNumber(nextRunningDistance)
              : null,
          running_time: nextWorkoutKind === "running" ? nextRunningTime || null : null,
        })
        .eq("id", selectedTemplate.id)
        .select()
        .single()

      if (error && isMissingWorkoutTemplateInfoColumnError(error)) {
        missingInfoColumn = true
        ;({ data, error } = await supabase
          .from("workout_templates")
          .update({
            label: hasRenameChange ? renamePassName.trim() : selectedTemplate.label,
            warmup_cardio: nextWarmupCardioValue || null,
            warmup_technique: nextWarmupTechniqueValue || null,
            workout_kind: nextWorkoutKind,
            gym_pass_type: nextWorkoutKind === "gym" ? nextGymPassType : null,
            running_type: nextWorkoutKind === "running" ? nextRunningType : null,
            running_interval_program:
              nextWorkoutKind === "running" && nextRunningType === "intervals"
                ? normalizedRenameIntervalProgram
                : null,
            running_interval_time:
              nextWorkoutKind === "running" && nextRunningType === "intervals"
                ? renameLegacyIntervalFields.interval_time
                : null,
            running_intervals_count:
              nextWorkoutKind === "running" && nextRunningType === "intervals"
                ? renameLegacyIntervalFields.intervals_count
                : null,
            running_distance:
              nextWorkoutKind === "running" && nextRunningType === "distance" && nextRunningDistance
                ? parseLoggedNumber(nextRunningDistance)
                : null,
            running_time: nextWorkoutKind === "running" ? nextRunningTime || null : null,
          })
          .eq("id", selectedTemplate.id)
          .select()
          .single())
      }

      if (error) {
        console.error(error)
        setStatus("Kunde inte spara passet")
        return false
      }

      setTemplatesFromDB((prev) =>
        prev.map((template) => (template.id === data.id ? data : template))
      )

      setWorkoutsFromDB((prev) => {
        const next = { ...prev }

        if (data.code && next[data.code]) {
          const nextIntervalProgram = getRunningProgramFromTemplate(data)
          const nextLegacyIntervalFields = intervalProgramToLegacyFields(nextIntervalProgram)
          next[data.code] = {
            ...next[data.code],
            label: data.label,
            info: data.info || "",
            workoutKind: data.workout_kind || "gym",
            gymPassType: data.gym_pass_type || "individual",
            runningType: data.running_type || "intervals",
            runningConfig: {
              intervalProgram: nextIntervalProgram,
              interval_time: nextLegacyIntervalFields.interval_time || data.running_interval_time || "",
              intervals_count: nextLegacyIntervalFields.intervals_count ?? data.running_intervals_count ?? null,
              running_distance: data.running_distance ?? null,
              running_time: data.running_time || "",
            },
            warmup: {
              cardio: data.warmup_cardio || "",
              technique: String(data.warmup_technique || "")
                .split("\n")
                .map((item) => item.trim())
                .filter(Boolean),
            },
          }
        }

        return next
      })
    }

    if (updates.length === 0) {
      resetPassEditorState(selectedTemplate.code)
      setStatus(
        missingInfoColumn
          ? "Passnamn sparat, men passinfo kräver att nya SQL-migrationen körs i Supabase"
          : "Pass sparat ✅"
      )
      return true
    }

    const updateResults = await Promise.all(
      updates.map(({ id, ...payload }) =>
        supabase.from("workout_template_exercises").update(payload).eq("id", id)
      )
    )

    const error = updateResults.find((result) => result.error)?.error

    if (error) {
      console.error(error)
      setStatus(`Kunde inte spara passändringar${error.message ? `: ${error.message}` : ""}`)
      return false
    }

    setTemplateExercisesFromDB((prev) =>
      prev.map((row) => {
        const draft = passExerciseDrafts[row.id]

        if (!draft) return row

        return mergePassExerciseRowWithDraft(row, draft)
      })
    )

    resetPassEditorState(selectedTemplate.code)
    setStatus(
      missingInfoColumn
        ? "Övningar sparade, men passinfo kräver att nya SQL-migrationen körs i Supabase"
        : "Pass sparat ✅"
    )
    return true
  }

  const handleRemoveExerciseFromPass = async (rowId) => {
    setStatus("")

    const confirmed = window.confirm("Vill du ta bort övningen från passet?")
    if (!confirmed) return

    const { error } = await supabase
      .from("workout_template_exercises")
      .delete()
      .eq("id", rowId)

    if (error) {
      console.error(error)
      setStatus("Kunde inte ta bort övning från passet")
      return
    }

    setTemplateExercisesFromDB((prev) => prev.filter((row) => row.id !== rowId))
    setPassExerciseDrafts((prev) => {
      const next = { ...prev }
      delete next[rowId]
      return next
    })
    setStatus("Övning borttagen från passet ✅")
  }

  const handleMoveExerciseInPass = async (rowId, direction) => {
    setStatus("")

    const currentRows = templateExercisesFromDB
      .filter((row) => row.workout_templates?.code === selectedTemplateCode)
      .sort((a, b) => a.sort_order - b.sort_order)

    const currentIndex = currentRows.findIndex((row) => row.id === rowId)
    if (currentIndex === -1) return

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1
    if (targetIndex < 0 || targetIndex >= currentRows.length) return

    const currentRow = currentRows[currentIndex]
    const targetRow = currentRows[targetIndex]

    const [{ error: firstError }, { error: secondError }] = await Promise.all([
      supabase
        .from("workout_template_exercises")
        .update({ sort_order: targetRow.sort_order })
        .eq("id", currentRow.id),
      supabase
        .from("workout_template_exercises")
        .update({ sort_order: currentRow.sort_order })
        .eq("id", targetRow.id),
    ])

    const error = firstError || secondError

    if (error) {
      console.error(error)
      setStatus("Kunde inte ändra ordning på övning")
      return
    }

    setTemplateExercisesFromDB((prev) =>
      prev.map((row) => {
        if (row.id === currentRow.id) {
          return { ...row, sort_order: targetRow.sort_order }
        }
        if (row.id === targetRow.id) {
          return { ...row, sort_order: currentRow.sort_order }
        }
        return row
      })
    )

    setStatus("Ordning uppdaterad ✅")
  }

  const handleCreatePass = async () => {
    setStatus("")

    if (!newPassName.trim()) {
      setStatus("Fyll i namn på pass")
      return false
    }

    const normalizedNewIntervalProgram = normalizeIntervalProgramDraft(newPassRunningIntervalProgram)
    const newLegacyIntervalFields = intervalProgramToLegacyFields(normalizedNewIntervalProgram)

    if (newPassWorkoutKind === "running" && newPassRunningType === "intervals" && !normalizedNewIntervalProgram) {
      setStatus("Lägg in minst ett giltigt intervallblock")
      return false
    }

    setIsCreatingPass(true)

    const normalizedCode = newPassName
      .trim()
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")

    if (!normalizedCode) {
      setStatus("Kunde inte skapa giltig passkod")
      setIsCreatingPass(false)
      return false
    }

    const alreadyExists = templatesFromDB.some(
      (template) => template.label.trim().toLowerCase() === newPassName.trim().toLowerCase()
    )

    if (alreadyExists) {
      setStatus("Det finns redan ett pass med det namnet")
      setIsCreatingPass(false)
      return false
    }

    const internalCode = `${normalizedCode}_${crypto.randomUUID().slice(0, 8).toUpperCase()}`

    let { data, error } = await supabase
      .from("workout_templates")
      .insert({
        code: internalCode,
        label: newPassName.trim(),
        info: newPassInfo.trim() || null,
        warmup_cardio: newPassWarmupCardio.trim() || null,
        warmup_technique: newPassWarmupTechnique.trim() || null,
        workout_kind: newPassWorkoutKind || "gym",
        gym_pass_type: (newPassWorkoutKind || "gym") === "gym" ? newPassGymPassType || "individual" : null,
        running_type: newPassWorkoutKind === "running" ? newPassRunningType : null,
        running_interval_program:
          newPassWorkoutKind === "running" && newPassRunningType === "intervals"
            ? normalizedNewIntervalProgram
            : null,
        running_interval_time:
          newPassWorkoutKind === "running" && newPassRunningType === "intervals"
            ? newLegacyIntervalFields.interval_time
            : null,
        running_intervals_count:
          newPassWorkoutKind === "running" && newPassRunningType === "intervals"
            ? newLegacyIntervalFields.intervals_count
            : null,
        running_distance:
          newPassWorkoutKind === "running" && newPassRunningType === "distance" && newPassRunningDistance.trim()
            ? parseLoggedNumber(newPassRunningDistance)
            : null,
        running_time: newPassWorkoutKind === "running" ? newPassRunningTime.trim() || null : null,
        team_id: profile?.team_id,
      })
      .select()
      .single()

    let missingInfoColumn = false

    if (error && isMissingWorkoutTemplateInfoColumnError(error)) {
      missingInfoColumn = true
      ;({ data, error } = await supabase
        .from("workout_templates")
        .insert({
          code: internalCode,
          label: newPassName.trim(),
          warmup_cardio: newPassWarmupCardio.trim() || null,
          warmup_technique: newPassWarmupTechnique.trim() || null,
          workout_kind: newPassWorkoutKind || "gym",
          gym_pass_type: (newPassWorkoutKind || "gym") === "gym" ? newPassGymPassType || "individual" : null,
          running_type: newPassWorkoutKind === "running" ? newPassRunningType : null,
          running_interval_program:
            newPassWorkoutKind === "running" && newPassRunningType === "intervals"
              ? normalizedNewIntervalProgram
              : null,
          running_interval_time:
            newPassWorkoutKind === "running" && newPassRunningType === "intervals"
              ? newLegacyIntervalFields.interval_time
              : null,
          running_intervals_count:
            newPassWorkoutKind === "running" && newPassRunningType === "intervals"
              ? newLegacyIntervalFields.intervals_count
              : null,
          running_distance:
            newPassWorkoutKind === "running" && newPassRunningType === "distance" && newPassRunningDistance.trim()
              ? parseLoggedNumber(newPassRunningDistance)
              : null,
          running_time: newPassWorkoutKind === "running" ? newPassRunningTime.trim() || null : null,
          team_id: profile?.team_id,
        })
        .select()
        .single())
    }

    if (error) {
      console.error(error)
      setStatus("Kunde inte skapa pass")
      setIsCreatingPass(false)
      return false
    }

    setTemplatesFromDB((prev) => [...prev, data].sort((a, b) => a.label.localeCompare(b.label, "sv")))
    setNewPassName("")
    setNewPassInfo("")
    setNewPassWarmupCardio("")
    setNewPassWarmupTechnique("")
    setNewPassWorkoutKind("gym")
    setNewPassGymPassType("individual")
    setNewPassRunningType("intervals")
    setNewPassRunningIntervalProgram(createIntervalProgramDraft())
    setNewPassRunningDistance("")
    setNewPassRunningTime("")
    setNewWarmupTemplateName("")
    setSelectedTemplateCode(data.code)
    resetPassEditorState(data.code)
    setStatus(
      missingInfoColumn
        ? "Pass skapat, men passinfo kräver att nya SQL-migrationen körs i Supabase"
        : "Pass skapat ✅"
    )
    setIsCreatingPass(false)
    return true
  }

  const handleDeleteSelectedPass = async () => {
    setStatus("")

    const selectedTemplate = templatesFromDB.find((template) => template.code === selectedTemplateCode)

    if (!selectedTemplate) {
      setStatus("Kunde inte hitta valt pass")
      return false
    }

    const confirmed = window.confirm(`Vill du ta bort ${selectedTemplate.label}?`)
    if (!confirmed) return false

    const relatedRowIds = templateExercisesFromDB
      .filter((row) => row.workout_template_id === selectedTemplate.id)
      .map((row) => row.id)

    if (relatedRowIds.length > 0) {
      const { error: exercisesError } = await supabase
        .from("workout_template_exercises")
        .delete()
        .in("id", relatedRowIds)

      if (exercisesError) {
        console.error(exercisesError)
        setStatus("Kunde inte ta bort övningarna i passet")
        return false
      }
    }

    const { error } = await supabase
      .from("workout_templates")
      .delete()
      .eq("id", selectedTemplate.id)

    if (error) {
      console.error(error)
      setStatus("Kunde inte ta bort passet")
      return false
    }

    setTemplateExercisesFromDB((prev) =>
      prev.filter((row) => row.workout_template_id !== selectedTemplate.id)
    )
    setTemplatesFromDB((prev) => prev.filter((template) => template.id !== selectedTemplate.id))
    setPassExerciseDrafts({})
    setSelectedExerciseId("")
    setRenamePassName("")
    setRenamePassInfo("")
    setStatus("Pass borttaget ✅")
    return true
  }

  const handleRenamePass = async (templateId, newLabel, newInfo) => {
    setStatus("")

    if (!newLabel.trim()) {
      setStatus("Ange ett namn")
      return
    }

    const { data, error } = await supabase
      .from("workout_templates")
      .update({ label: newLabel.trim(), info: newInfo.trim() || null })
      .eq("id", templateId)
      .select()
      .single()

    if (error) {
      console.error(error)
      setStatus("Kunde inte byta namn")
      return
    }

    setTemplatesFromDB((prev) =>
      prev.map((t) => (t.id === templateId ? data : t))
    )

    setWorkoutsFromDB((prev) => {
      const next = { ...prev }

      if (data.code && next[data.code]) {
        next[data.code] = {
          ...next[data.code],
          label: data.label,
          info: data.info || "",
        }
      }

      return next
    })

    setStatus("Pass uppdaterat ✅")
  }

  const handleRenameSelectedPass = async () => {
    const selectedTemplate = templatesFromDB.find((template) => template.code === selectedTemplateCode)
    if (!selectedTemplate) {
      setStatus("Kunde inte hitta valt pass")
      return
    }

    await handleRenamePass(selectedTemplate.id, renamePassName, renamePassInfo)
  }

  const saveCreateWarmupTemplate = async () => {
    await saveWarmupTemplate(
      newWarmupTemplateName,
      newPassWarmupCardio,
      newPassWarmupTechnique,
      () => setNewWarmupTemplateName("")
    )
  }

  const saveEditWarmupTemplate = async () => {
    await saveWarmupTemplate(
      renameWarmupTemplateName,
      renamePassWarmupCardio,
      renamePassWarmupTechnique,
      () => setRenameWarmupTemplateName("")
    )
  }

  const scrollToExerciseCard = (index) => {
    if (!exerciseCarouselRef.current) return

    const cards = exerciseCarouselRef.current.querySelectorAll("[data-exercise-card='true']")
    const targetCard = cards[index]

    if (!targetCard) return

    exerciseCarouselRef.current.scrollTo({
      left: targetCard.offsetLeft,
      behavior: "smooth",
    })
    setActiveExerciseIndex(index)
  }

  if (!user) {
    return <div style={pageStyle}>Laddar användare...</div>
  }

  if (isLoadingProfile || !profile) {
    return <div style={pageStyle}>Laddar...</div>
  }

  const visibleWorkouts =
    profile?.role === "coach" || profile?.role === "head_admin"
      ? activeWorkouts
      : assignedWorkoutCodes.reduce((acc, passCode) => {
          if (activeWorkouts[passCode]) {
            acc[passCode] = activeWorkouts[passCode]
          }
          return acc
        }, {})

  const currentWorkoutTargets = profile?.individual_goals_enabled === false ? {} : playerTargets || {}
  const sortedVisibleWorkoutEntries = Object.entries(visibleWorkouts).sort(([keyA, workoutA], [keyB, workoutB]) => {
    const daysA = getDaysSinceNumber(latestPassDates[keyA])
    const daysB = getDaysSinceNumber(latestPassDates[keyB])

    if (daysA !== daysB) {
      return daysB - daysA
    }

    return workoutA.label.localeCompare(workoutB.label, "sv")
  })
  const playerWorkoutEntriesByFamily = {
    strength: sortedVisibleWorkoutEntries.filter(
      ([, workout]) => workout.workoutKind === "gym" && workout.gymPassType !== "shared"
    ),
    running: sortedVisibleWorkoutEntries.filter(([, workout]) => workout.workoutKind === "running"),
    prehab: sortedVisibleWorkoutEntries.filter(([, workout]) => workout.workoutKind === "prehab"),
  }
  const playerFamilyCounts = {
    strength: playerWorkoutEntriesByFamily.strength.length,
    running: playerWorkoutEntriesByFamily.running.length,
    prehab: playerWorkoutEntriesByFamily.prehab.length,
  }
  const selectedPlayerPassEntries = playerPassFamily
    ? playerWorkoutEntriesByFamily[playerPassFamily] || []
    : []
  const recommendedPlayerPassCount =
    playerPassFamily === "strength" ? 1 : playerPassFamily === "running" ? 0 : 2
  const recommendedPlayerPassEntries = selectedPlayerPassEntries.slice(0, recommendedPlayerPassCount)
  const shelfPlayerPassEntries = selectedPlayerPassEntries.slice(recommendedPlayerPassEntries.length)
  const shouldShowPlayerPassList =
    playerPassFamily && (playerPassFamily !== "running" || playerRunningView === "startAssigned")
  const playerPassFamilyTitle =
    playerPassFamily === "strength"
      ? "Styrketräning"
      : playerPassFamily === "running"
      ? playerRunningView === "start"
        ? "Starta pass"
        : playerRunningView === "startDistance"
        ? "Distans"
        : playerRunningView === "startIntervals"
        ? "Intervaller"
        : playerRunningView === "startAssigned"
        ? "Färdiga intervaller"
        : playerRunningView === "startOwn"
        ? "Egna pass"
        : playerRunningView === "log"
        ? "Registrera i efterhand"
        : playerRunningView === "logDistance"
        ? "Registrera distans"
        : playerRunningView === "logIntervals"
        ? "Registrera intervaller"
        : "Löpning"
      : playerPassFamily === "prehab"
      ? "Skadeförebyggande"
      : "Träning"
  const activeWorkoutData = selectedWorkout ? activeWorkouts[selectedWorkout] || null : null
  const activeWorkoutThemeKey = activeWorkoutData
    ? resolvePlayerTrainingThemeKey({ workoutKind: activeWorkoutData.workoutKind })
    : playerPassFamily || "strength"
  const activeWorkoutAccent = getCategoryAccent(activeWorkoutThemeKey)
  const isRunningWorkoutActive = activeWorkoutData?.workoutKind === "running"
  const activeWorkoutWarmupTechnique = Array.isArray(activeWorkoutData?.warmup?.technique)
    ? activeWorkoutData.warmup.technique
        .map((item) => String(item || "").trim())
        .filter(Boolean)
    : []
  const activeWorkoutWarmup = {
    cardio: String(activeWorkoutData?.warmup?.cardio || "").trim(),
    technique: activeWorkoutWarmupTechnique,
  }
  const hasActiveWorkoutWarmup = Boolean(
    activeWorkoutWarmup.cardio || activeWorkoutWarmup.technique.length
  )
  const activeWorkoutExercises = Array.isArray(activeWorkoutData?.exercises)
    ? activeWorkoutData.exercises
    : []
  const activeWorkoutExerciseCount = isRunningWorkoutActive ? 1 : activeWorkoutExercises.length
  const restStopwatchElapsedMs =
    isWorkoutActive && !isRunningWorkoutActive && restStopwatchStartedAt
      ? restStopwatchNow - restStopwatchStartedAt
      : 0

  const unreadMessageCount = messages.filter((message) => message.hasUnread).length

  const coachTabs = [
    { key: "home", label: "Översikt" },
    { key: "calendar", label: "Kalender" },
    { key: "players", label: "Användare" },
    { key: "stats", label: "Statistik" },
    { key: "exerciseBank", label: "Övningar" },
    { key: "passBuilder", label: "Pass" },
    {
      key: "messages",
      label: unreadMessageCount ? `Meddelanden (${unreadMessageCount})` : "Meddelanden",
    },
  ]

  const playerTabs = [
    { key: "overview", label: "Översikt" },
    { key: "calendar", label: "Kalender" },
    { key: "pass", label: "Pass" },
    { key: "stats", label: "Statistik" },
    {
      key: "messages",
      label: unreadMessageCount ? `Meddelanden (${unreadMessageCount})` : "Meddelanden",
    },
  ]

  const activeWorkoutSlideCount = activeWorkoutExerciseCount + 1 + (hasActiveWorkoutWarmup ? 1 : 0)
  const warmupSlideOffset = hasActiveWorkoutWarmup ? 1 : 0
  const isWarmupSlideActive = hasActiveWorkoutWarmup && activeExerciseIndex === 0
  const isFinishSlideActive = activeExerciseIndex === activeWorkoutSlideCount - 1
  const activeWorkoutExercisePosition = Math.min(
    Math.max(activeExerciseIndex - warmupSlideOffset + 1, 1),
    Math.max(activeWorkoutExerciseCount, 1)
  )
  const activeWorkoutProgressSummary = isWarmupSlideActive
    ? "Uppvärmning"
    : isFinishSlideActive
    ? "Avslut"
    : isRunningWorkoutActive
    ? "Löppass"
    : `Övning ${activeWorkoutExercisePosition} / ${activeWorkoutExerciseCount}`
  const activeWorkoutProgressSegments = Array.from({ length: Math.max(activeWorkoutSlideCount, 1) }, (_, index) => ({
    key: index,
    isComplete: index < activeExerciseIndex,
    isCurrent: index === activeExerciseIndex,
  }))
  const assignedCompletedSessions = completedWorkoutSessions.filter(
    (session) => !(session.workout_kind === "running" && session.running_origin !== "assigned")
  )
  const ownRunningSessions = completedWorkoutSessions.filter(
    (session) => session.workout_kind === "running" && session.running_origin !== "assigned"
  )
  const todayDateInput = getTodayDateInputValue()
  const activeWorkoutsById = new Map(
    Object.values(activeWorkouts || {})
      .filter((workout) => workout?.id != null)
      .map((workout) => [String(workout.id), workout])
  )
  const playerCalendarEntries =
    profile?.role === "player"
      ? calendarEntries.map((entry) => {
          const currentStatus = entry.current_user_link?.completion_status

          if (entry.is_external && entry.activity_kind === "handball") {
            return entry
          }

          if (
            currentStatus === "completed" ||
            currentStatus === "cancelled" ||
            !entry.current_user_link?.id
          ) {
            return entry
          }

          const entryDate = getDateInputValueFromTimestamp(entry.starts_at)
          const matchedWorkout =
            entry.activity_kind === "template_workout"
              ? activeWorkoutsById.get(String(entry.workout_template_id || "")) || null
              : null

          const candidateNames = [entry.title, matchedWorkout?.label || ""]
            .map((value) => normalizeCalendarMatchValue(value))
            .filter(Boolean)

          const matchedSession = completedWorkoutSessions.find((session) => {
            if (getDateInputValueFromTimestamp(session.created_at) !== entryDate) return false

            const sessionNames = [session.pass_name, session.session_label]
              .map((value) => normalizeCalendarMatchValue(value))
              .filter(Boolean)

            return candidateNames.some((candidate) => sessionNames.includes(candidate))
          })

          if (!matchedSession) {
            return entry
          }

          return {
            ...entry,
            current_user_link: {
              ...entry.current_user_link,
              completion_status: "completed",
              completed_at: entry.current_user_link.completed_at || matchedSession.created_at,
              linked_workout_session_id:
                entry.current_user_link.linked_workout_session_id || matchedSession.session_id,
            },
          }
        })
      : calendarEntries
  const todaysPlayerCalendarEntries = playerCalendarEntries.filter(
    (entry) =>
      !entry.is_cancelled &&
      getDateInputValueFromTimestamp(entry.starts_at) === todayDateInput &&
      (!entry.current_user_link || entry.current_user_link.completion_status !== "completed")
  )
  const primaryTodayCalendarEntry = todaysPlayerCalendarEntries[0] || null
  const primaryTodayMatchedWorkout =
    primaryTodayCalendarEntry?.activity_kind === "template_workout"
      ? activeWorkoutsById.get(String(primaryTodayCalendarEntry.workout_template_id || "")) || null
      : null
  const currentWeekStart = getWeekStartDateInputValue()
  const playerHomeWeekDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(`${currentWeekStart}T00:00:00`)
    date.setDate(date.getDate() + index)
    return getDateInputValueFromTimestamp(date)
  })
  const playerHomeWeekDayDetailsByDate = playerHomeWeekDays.reduce((acc, dateKey) => {
    const dayCompletedSessions = completedWorkoutSessions.filter(
      (session) => getDateInputValueFromTimestamp(session.created_at) === dateKey
    )
    const dayCalendarEntries = playerCalendarEntries.filter(
      (entry) => !entry.is_cancelled && getDateInputValueFromTimestamp(entry.starts_at) === dateKey
    )

    const plannedEntries = dayCalendarEntries.filter((entry) => {
      const status = entry.current_user_link?.completion_status || "planned"
      return status !== "completed" && status !== "cancelled" && status !== "skipped"
    })
    const completedEntries = dayCalendarEntries.filter(
      (entry) => entry.current_user_link?.completion_status === "completed"
    )

    const plannedThemeKey = getPreferredPlayerHomeThemeKey(
      plannedEntries.map((entry) =>
        getPlayerCalendarEntryThemeKey(
          entry,
          entry.activity_kind === "template_workout"
            ? activeWorkoutsById.get(String(entry.workout_template_id || "")) || null
            : null
        )
      )
    )

    const completedThemeKey = getPreferredPlayerHomeThemeKey([
      ...dayCompletedSessions.map((session) => getCompletedSessionThemeKey(session)),
      ...completedEntries.map((entry) =>
        getPlayerCalendarEntryThemeKey(
          entry,
          entry.activity_kind === "template_workout"
            ? activeWorkoutsById.get(String(entry.workout_template_id || "")) || null
            : null
        )
      ),
    ])

    const isToday = dateKey === todayDateInput
    const hasRemainingToday = isToday && plannedEntries.length > 0

    let state = "empty"
    let themeKey = null
    let source = null

    if (hasRemainingToday) {
      state = "today_planned"
      themeKey = plannedThemeKey || "strength"
      source = "planned"
    } else if (completedThemeKey) {
      state = "completed"
      themeKey = completedThemeKey
      source = "completed"
    } else if (plannedThemeKey) {
      state = "planned"
      themeKey = plannedThemeKey
      source = "planned"
    } else if (isToday) {
      state = "today_empty"
    }

    acc[dateKey] = {
      dateKey,
      isToday,
      source,
      state,
      themeKey,
    }

    return acc
  }, {})
  const activeWorkoutTargetRequestOptions =
    !isRunningWorkoutActive && profile?.individual_goals_enabled !== false
      ? activeWorkoutExercises.flatMap((exercise, exerciseIndex) => {
          const selectedExercise = getSelectedExerciseExecution(
            exercise,
            selectedExerciseOptionKeys[exerciseIndex]
          )
          const protocolConfig = getExerciseProtocolConfig(selectedExercise || exercise)

          if (protocolConfig) return []

          const currentTarget = mergeExerciseTargetWithPassDefaults(
            exercise,
            currentWorkoutTargets[exercise.name]
          )
          const repRangeBucket = getRepRangeBucketForTarget(currentTarget)
          const resolvedTargetWeight = getResolvedExerciseTargetWeight({
            exerciseId: selectedExercise?.exerciseId || exercise.exerciseId,
            repTarget: currentTarget,
            repTargetsByExercise: playerExerciseRepTargets,
          })

          if (
            selectedExercise?.type !== "weight_reps" ||
            resolvedTargetWeight == null ||
            !repRangeBucket
          ) {
            return []
          }

          const latestExerciseSets = selectedExercise ? latestWorkout[selectedExercise.name] || [] : []
          const latestExerciseTopSet = latestExerciseSets[latestExerciseSets.length - 1]

          return [
            {
              composer_key: `${selectedExercise?.exerciseId || exercise.exerciseId}:${repRangeBucket.key}`,
              exercise_id: selectedExercise?.exerciseId || exercise.exerciseId,
              exercise_name:
                selectedExercise?.displayName ||
                selectedExercise?.name ||
                exercise.displayName ||
                exercise.name,
              rep_range_key: repRangeBucket.key,
              rep_range_label: getRepRangeLabelByKey(repRangeBucket.key),
              current_target_weight: resolvedTargetWeight,
              latest_logged_weight: latestExerciseTopSet?.weight
                ? parseLoggedNumber(latestExerciseTopSet.weight)
                : null,
              latest_logged_reps_text:
                latestExerciseTopSet?.reps != null && latestExerciseTopSet?.reps !== ""
                  ? `${latestExerciseTopSet.reps} reps`
                  : latestExerciseTopSet?.seconds
                  ? `${latestExerciseTopSet.seconds} sek`
                  : null,
            },
          ]
        })
      : []
  const selectedActiveTargetRequestOption =
    activeWorkoutTargetRequestOptions.find(
      (option) => option.composer_key === activeTargetChangeRequestDraft?.composer_key
    ) || null

  const headAdminTabs = [
    { key: "home", label: "Översikt" },
    { key: "users", label: "Användare" },
    { key: "teams", label: "Lag" },
    { key: "stats", label: "Statistik" },
    { key: "exerciseBank", label: "Övningar" },
    {
      key: "messages",
      label: unreadMessageCount ? `Meddelanden (${unreadMessageCount})` : "Meddelanden",
    },
    { key: "feedback", label: "Feedback" },
  ]

  const managementTabs = profile?.role === "head_admin" ? headAdminTabs : coachTabs
  const coachBottomTabs = [
    { key: "home", label: "Hem", icon: "home" },
    { key: "calendar", label: "Kalender", icon: "calendar" },
    { key: "players", label: "Spelare", icon: "players" },
    { key: "passBuilder", label: "Pass", icon: "pass" },
    { key: "messages", label: "Meddelanden", icon: "messages" },
    { key: "stats", label: "Statistik", icon: "stats" },
  ]
  const showCoachBottomNav = profile?.role === "coach" && isMobile
  const adminBottomTabs = [
    { key: "home", label: "Hem", icon: "home" },
    { key: "users", label: "Användare", icon: "players" },
    { key: "teams", label: "Lag", icon: "teams" },
    { key: "messages", label: "Meddelanden", icon: "messages" },
    { key: "feedback", label: "Feedback", icon: "feedback" },
  ]
  const playerBottomTabs = [
    { key: "overview", label: "Hem", icon: "home" },
    { key: "calendar", label: "Kalender", icon: "calendar" },
    { key: "history", label: "Historik", icon: "pass" },
    { key: "stats", label: "Statistik", icon: "stats" },
    { key: "messages", label: "Meddelanden", icon: "messages" },
  ]
  const showAdminBottomNav = profile?.role === "head_admin" && isMobile && globalView === "app"
  const showPlayerBottomNav =
    profile?.role === "player" && isMobile && globalView === "app" && !isWorkoutActive
  const usePlayerRedesignShell = profile?.role === "player" && globalView === "app"
  const useManagementRedesignRole = profile?.role === "coach" || profile?.role === "head_admin"
  const useManagementRedesignShell =
    useManagementRedesignRole && globalView === "app"
  const useManagementFlatLayout = useManagementRedesignShell
  const resolvedCardTitleStyle = useManagementRedesignRole ? managementCardTitleStyle : cardTitleStyle
  const resolvedMutedTextStyle = useManagementRedesignRole ? managementMutedTextStyle : mutedTextStyle
  const resolvedInputStyle = useManagementRedesignRole ? managementInputStyle : inputStyle
  const resolvedButtonStyle = useManagementRedesignRole ? managementButtonStyle : buttonStyle
  const resolvedSecondaryButtonStyle = useManagementRedesignRole
    ? managementSecondaryButtonStyle
    : secondaryButtonStyle
  const teamName = teams.find((team) => team.id === profile?.team_id)?.name || "Inget lag"
  const statisticsPlayers =
    profile?.role === "head_admin"
      ? (allUsers || []).filter((entry) => entry.role === "player")
      : (players || []).filter((entry) => entry.role === "player")
  const coachName = profile?.full_name?.trim()?.split(" ")[0] || "tränare"
  const activePlayerCount = (players || []).filter(
    (entry) => entry.role === "player" && entry.is_archived !== true
  ).length
  const coachPassCount = templatesFromDB.length
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const activeSevenDayCount = (players || []).filter((entry) => {
    if (!entry.lastSignInAt || entry.is_archived === true) return false
    const lastSignInTime = new Date(entry.lastSignInAt).getTime()
    return Number.isFinite(lastSignInTime) && lastSignInTime >= sevenDaysAgo
  }).length
  const totalUsersCount = allUsers.length
  const totalTeamsCount = teams.length
  const playerFirstName = profile?.full_name?.trim()?.split(" ")[0] || "spelare"
  const latestAssignedSession = assignedCompletedSessions[0] || null
  const latestOwnRunningSession = ownRunningSessions[0] || null
  const selectablePlayerStatsExercises = playerExerciseProgress
    .filter((entry) => entry.is_relevant_for_player_stats)
    .slice()
    .sort((a, b) =>
      String(a.exercise_display_name || "").localeCompare(String(b.exercise_display_name || ""), "sv")
    )
  const selectedPlayerStatsExercises = selectedPlayerStatsExerciseIds
    .map((exerciseId) =>
      selectablePlayerStatsExercises.find((entry) => entry.exercise_id === exerciseId) || null
    )
    .filter(Boolean)
  const unselectedPlayerStatsExercises = selectablePlayerStatsExercises.filter(
    (entry) => !selectedPlayerStatsExerciseIds.includes(entry.exercise_id)
  )
  const handleTogglePlayerStatsExercise = (exerciseId) => {
    setSelectedPlayerStatsExerciseIds((current) =>
      current.includes(exerciseId)
        ? current.filter((entry) => entry !== exerciseId)
        : [...current, exerciseId]
    )
  }
  const handleAddPlayerStatsExercise = (exerciseId) => {
    if (!exerciseId) return

    setSelectedPlayerStatsExerciseIds((current) =>
      current.includes(exerciseId) ? current : [...current, exerciseId]
    )
    setPlayerStatsPickerValue("")
  }
  const navigateCoachSection = (tabKey) => {
    setCoachView(tabKey)
    if (tabKey !== "players") {
      setSelectedPlayer(null)
    }
    if (tabKey !== "exerciseBank") {
      resetExerciseForm()
    }
  }
  const navigatePlayerSection = (tabKey) => {
    if (tabKey === "account") {
      navigateGlobalView("account")
      return
    }

    navigateGlobalView("app")
    setPlayerView(tabKey)
  }
  const openPlayerPassFamily = (familyKey) => {
    setPlayerPassFamily(familyKey)
    setPlayerRunningView(null)
    setSelectedWorkout(null)
    setCustomRunningWorkout(null)
    setPlayerOverviewPanel(null)
    navigatePlayerSection("pass")
  }
  const openPlayerRunningView = (viewKey) => {
    setPlayerRunningView(viewKey)
    setSelectedWorkout(null)
    setCustomRunningWorkout(null)

    if (viewKey === "startDistance") {
      setStartDistanceShareLocation(false)
    }

    if (viewKey === "startOwn") {
      resetPlayerRunningPresetEditor()
    }

    if (viewKey === "logDistance" || viewKey === "logIntervals") {
      resetRunningDraft({
        log_date: getTodayDateInputValue(),
        free_activity_type: "running",
        running_type: viewKey === "logIntervals" ? "intervals" : "distance",
      })
      setPendingFreeActivityCalendarEvent(null)
    }
  }
  const openRunningDraftPanel = (panelKey) => {
    const nextDraft = {
      log_date: runningDraft.log_date || getTodayDateInputValue(),
      free_activity_type: panelKey === "running" ? "" : "running",
      custom_activity_title: "",
      running_type: panelKey === "ownInterval" ? "intervals" : "distance",
      interval_program: createIntervalProgramDraft(),
      interval_time: "",
      intervals_count: "",
      running_distance: "",
      running_time: "",
      average_pulse: "",
      comment: "",
    }

    setRunningDraft((prev) => ({
      ...prev,
      ...nextDraft,
    }))
    setPendingFreeActivityCalendarEvent(null)
    setPlayerOverviewPanel(panelKey)
    setPlayerView("activity")
  }
  const startOwnIntervalWorkout = async () => {
    const presetName = String(playerRunningPresetName || "").trim() || "Eget intervallpass"
    const normalizedProgram = normalizeIntervalProgramDraft(playerRunningPresetDraft)

    if (!normalizedProgram) {
      setStatus("Lägg in minst ett giltigt intervallblock först")
      return
    }

    startCustomRunningWorkout({
      label: presetName,
      runningType: "intervals",
      runningConfig: {
        intervalProgram: normalizedProgram,
      },
      statusMessage: `${presetName} startat`,
    })
  }
  const startOwnDistanceWorkout = () => {
    startCustomRunningWorkout({
      label: "Distanspass",
      runningType: "distance",
      runningConfig: {
        running_distance: null,
        running_time: "",
        shareLocationEnabled: startDistanceShareLocation,
      },
      statusMessage: "Distanspass startat",
    })
  }
  const goBackFromPlayerRunningView = () => {
    if (playerRunningView === "startDistance" || playerRunningView === "startIntervals") {
      setPlayerRunningView("start")
      setSelectedWorkout(null)
      return
    }

    if (playerRunningView === "startAssigned" || playerRunningView === "startOwn") {
      setPlayerRunningView("startIntervals")
      setSelectedWorkout(null)
      return
    }

    if (playerRunningView === "logDistance" || playerRunningView === "logIntervals") {
      setPlayerRunningView("log")
      setSelectedWorkout(null)
      return
    }

    if (playerRunningView === "start" || playerRunningView === "log") {
      setPlayerRunningView(null)
      setSelectedWorkout(null)
    }
  }
  const getPlayerPassDisplayType = (workout) => {
    if (workout.workoutKind === "running") return getWorkoutKindLabel(workout.workoutKind)
    if (workout.workoutKind === "prehab") return "Skadeförebyggande"
    return getGymPassTypeLabel(workout.gymPassType)
  }
  const getPlayerPassSummary = (workout) => {
    if (workout.workoutKind === "running") {
      return buildRunningSummary({
        running_type: workout.runningType,
        interval_program: workout.runningConfig?.intervalProgram,
        interval_time: workout.runningConfig?.interval_time,
        intervals_count: workout.runningConfig?.intervals_count,
        running_distance: workout.runningConfig?.running_distance,
        running_time: workout.runningConfig?.running_time,
      })
    }

    return `${workout.exercises.length} övningar`
  }
  const latestCompletedSessionByThemeKey = completedWorkoutSessions.reduce((acc, session) => {
    const themeKey = getCompletedSessionThemeKey(session)
    if (!themeKey) return acc

    const current = acc[themeKey]
    const sessionTimestamp = new Date(session.created_at || 0).getTime()
    const currentTimestamp = current ? new Date(current.created_at || 0).getTime() : 0

    if (!current || sessionTimestamp > currentTimestamp) {
      acc[themeKey] = session
    }

    return acc
  }, {})
  const playerHomeHasHero = Boolean(primaryTodayCalendarEntry)
  const playerHomeHeroThemeKey = primaryTodayCalendarEntry
    ? getPlayerCalendarEntryThemeKey(primaryTodayCalendarEntry, primaryTodayMatchedWorkout)
    : "strength"
  const playerHomeHeroAccent = getCategoryAccent(playerHomeHeroThemeKey)
  const playerHomeHeroTitle = primaryTodayCalendarEntry
    ? String(primaryTodayCalendarEntry.title || primaryTodayMatchedWorkout?.label || "").trim() || "Planerad aktivitet"
    : ""
  const playerHomeHeroSubtitle = primaryTodayCalendarEntry
    ? getPlayerCalendarEntryTypeLabel(primaryTodayCalendarEntry, primaryTodayMatchedWorkout)
    : ""
  const playerHomeHeroMeta = primaryTodayCalendarEntry
    ? [
        primaryTodayCalendarEntry.activity_kind === "template_workout" && primaryTodayMatchedWorkout
          ? getPlayerPassSummary(primaryTodayMatchedWorkout)
          : playerHomeHeroSubtitle,
        getCalendarEntryDurationLabel(primaryTodayCalendarEntry),
      ]
        .filter(Boolean)
        .join(" · ")
    : ""
  const playerHomeCategoryRows = [
    {
      key: "strength",
      label: "Styrketräning",
      meta: `Senast ${formatDaysSince(latestCompletedSessionByThemeKey.strength?.created_at)}`,
      onClick: () => openPlayerPassFamily("strength"),
    },
    {
      key: "running",
      label: "Löpning",
      meta: `Senast ${formatDaysSince(latestCompletedSessionByThemeKey.running?.created_at)}`,
      onClick: () => openPlayerPassFamily("running"),
    },
    {
      key: "prehab",
      label: "Skadeförebyggande",
      meta: `Senast ${formatDaysSince(latestCompletedSessionByThemeKey.prehab?.created_at)}`,
      onClick: () => openPlayerPassFamily("prehab"),
    },
    {
      key: "other",
      label: "Övrigt",
      meta: "Logga annan aktivitet",
      onClick: () => openRunningDraftPanel("running"),
    },
  ]
  const renderPlayerPassDetails = (key, workout, variant = "default") => (
    <div style={variant === "featured" ? playerFeaturedPassDetailsStyle : playerShelfPassDetailsStyle}>
      {workout.workoutKind === "running" ? (
        <div style={runningPassPreviewPanelStyle}>
          {workout.info ? (
            <div style={runningPassPreviewInstructionStyle}>
              <div style={passPreviewStatLabelStyle}>Instruktion</div>
              <div style={passPreviewInfoTextStyle}>{workout.info}</div>
            </div>
          ) : (
            <div style={runningPassPreviewInstructionStyle}>
              <div style={passPreviewStatLabelStyle}>Instruktion</div>
              <div style={passPreviewInfoTextStyle}>Öppna passet och följ upplägget direkt i loggningen.</div>
            </div>
          )}
        </div>
      ) : (
        <div style={passPreviewContentCardStyle}>
          {workout.info && (
            <div style={passPreviewInfoBlockStyle}>
              <div style={passPreviewStatLabelStyle}>Inför start</div>
              <div style={passPreviewInfoTextStyle}>{workout.info}</div>
            </div>
          )}

          {workout.exercises.length > 0 && (
            <div style={passPreviewListWrapStyle}>
              <div style={passPreviewExerciseStackStyle}>
                {workout.exercises.map((exercise, exerciseIndex) => (
                  <div key={exercise.id || exercise.name} style={passPreviewListItemStyle}>
                    <span style={passPreviewExerciseIndexStyle}>{exerciseIndex + 1}</span>
                    <span style={passPreviewExerciseNameStyle}>
                      {exercise.displayName || exercise.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {workout.exercises.length === 0 && (
            <div style={passPreviewEmptyStyle}>Inga övningar tillagda ännu</div>
          )}
        </div>
      )}

      <button
        onClick={() => startWorkout(key)}
        style={{ ...buttonStyle, ...playerPassStartButtonStyle(resolvePlayerTrainingThemeKey({ workoutKind: workout.workoutKind })), width: "100%" }}
      >
        Starta pass
      </button>
    </div>
  )
  const renderRecommendedPassCard = ([key, workout], index) => {
    const isSelected = selectedWorkout === key
    const passStatus = getPassStatus(latestPassDates[key])
    const themeKey = resolvePlayerTrainingThemeKey({ workoutKind: workout.workoutKind })

    return (
      <div key={key} style={playerFeaturedPassWrapStyle}>
        <button
          type="button"
          onClick={() => setSelectedWorkout((current) => (current === key ? null : key))}
          aria-pressed={isSelected}
          style={playerFeaturedPassCardStyle(themeKey)}
        >
          <div style={playerFeaturedPassMetaRowStyle(themeKey)}>
            <span>Rekommenderat {index + 1}</span>
            <span>{passStatus.label}</span>
          </div>
          <div style={playerFeaturedPassTitleStyle}>{workout.label}</div>
          <div style={playerFeaturedPassSummaryStyle(themeKey)}>{getPlayerPassSummary(workout)}</div>
          <div style={playerFeaturedPassFooterStyle(themeKey)}>
            <span>{getPlayerPassDisplayType(workout)}</span>
            <span>{formatDaysSince(latestPassDates[key])}</span>
          </div>
        </button>
        {isSelected && renderPlayerPassDetails(key, workout, "featured")}
      </div>
    )
  }
  const renderShelfPassRow = ([key, workout]) => {
    const isSelected = selectedWorkout === key
    const passStatus = getPassStatus(latestPassDates[key])
    const themeKey = resolvePlayerTrainingThemeKey({ workoutKind: workout.workoutKind })

    return (
      <div key={key} style={playerShelfPassWrapStyle}>
        <button
          type="button"
          onClick={() => setSelectedWorkout((current) => (current === key ? null : key))}
          aria-pressed={isSelected}
          style={{
            ...playerShelfPassButtonStyle(themeKey),
            ...(isSelected ? playerShelfPassButtonActiveStyle(themeKey) : {}),
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={playerShelfPassTitleStyle}>{workout.label}</div>
            <div style={playerShelfPassMetaStyle}>
              {getPlayerPassDisplayType(workout)} · {getPlayerPassSummary(workout)} · {passStatus.label}
            </div>
          </div>
          <div style={playerShelfPassRightStyle}>
            <span>{formatDaysSince(latestPassDates[key])}</span>
            <span style={playerShelfPassExpandStyle}>{isSelected ? "−" : "+"}</span>
          </div>
        </button>
        {isSelected && renderPlayerPassDetails(key, workout)}
      </div>
    )
  }
  const playerHeaderSubtitle =
    profile?.role === "head_admin"
      ? "Skapa lag, lägg till tränare och få överblick över alla användare."
      : profile?.role === "coach"
      ? "Bygg pass, följ spelare och håll ihop träningen."
      : ""

  return (
    <div
      style={{
        ...pageStyle,
        ...(usePlayerRedesignShell
          ? playerShellPageStyle(isMobile)
          : useManagementRedesignShell
          ? managementShellPageStyle(isMobile)
          : {}),
        position: "relative",
        padding: isMobile
          ? `max(14px, env(safe-area-inset-top)) 12px ${
              showCoachBottomNav || showPlayerBottomNav
              || showAdminBottomNav
                ? "calc(104px + env(safe-area-inset-bottom))"
                : "calc(36px + env(safe-area-inset-bottom))"
            }`
          : pageStyle.padding,
      }}
    >
      {!usePlayerRedesignShell && !useManagementRedesignShell && (
        <div
          style={{
            ...headerStyle,
            flexDirection: isMobile ? "column" : "row",
            alignItems: isMobile ? "stretch" : headerStyle.alignItems,
            marginBottom: isMobile ? "14px" : headerStyle.marginBottom,
            gap: isMobile ? "12px" : headerStyle.gap,
          }}
        >
          <div style={{ flex: 1 }}>
            <p style={eyebrowStyle}>
              {profile?.role === "head_admin"
                ? "Huvudadmin"
                : profile?.role === "coach"
                ? "Coachläge"
                : "Spelarläge"}
            </p>
            {profile?.role !== "player" ? (
              <>
                <h1 style={{ ...appTitleStyle, fontSize: isMobile ? "2rem" : appTitleStyle.fontSize }}>
                  Starkare Gurra
                </h1>
                <p
                  style={{
                    ...appSubtitleStyle,
                    maxWidth: isMobile ? "100%" : appSubtitleStyle.maxWidth,
                    fontSize: isMobile ? "14px" : appSubtitleStyle.fontSize,
                  }}
                >
                  {playerHeaderSubtitle}
                </p>
              </>
            ) : null}
          </div>

          <div style={headerActionsWrapStyle(isMobile)}>
            <div style={menuWrapStyle}>
              <button
                type="button"
                onClick={() => setIsMenuOpen((prev) => !prev)}
                aria-label="Öppna meny"
                style={menuButtonStyle}
              >
                <span style={menuIconLineStyle} />
                <span style={menuIconLineStyle} />
                <span style={menuIconLineStyle} />
              </button>

              {isMenuOpen && (
                <div style={menuDropdownStyle(isMobile)}>
                  <button
                    type="button"
                    onClick={() => {
                      navigateGlobalView("app")
                      setIsFeedbackOpen(true)
                      setIsMenuOpen(false)
                    }}
                    style={menuItemButtonStyle}
                  >
                    Lämna feedback
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      navigateGlobalView("account")
                    }}
                    style={menuItemButtonStyle}
                  >
                    Mitt konto
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      navigateGlobalView("gdpr")
                    }}
                    style={menuItemButtonStyle}
                  >
                    Integritet
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      await supabase.auth.signOut()
                      window.location.reload()
                    }}
                    style={menuItemButtonStyle}
                  >
                    Logga ut
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {useManagementRedesignShell && (
        <div style={managementShellMenuWrapStyle(isMobile)}>
          <div style={menuWrapStyle}>
            <button
              type="button"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              aria-label="Öppna meny"
              style={managementShellMenuButtonStyle}
            >
              <span style={managementShellMenuIconLineStyle} />
              <span style={managementShellMenuIconLineStyle} />
              <span style={managementShellMenuIconLineStyle} />
            </button>

            {isMenuOpen && (
              <div style={menuDropdownStyle(isMobile)}>
                <button
                  type="button"
                  onClick={() => {
                    navigateGlobalView("app")
                    setIsFeedbackOpen(true)
                    setIsMenuOpen(false)
                  }}
                  style={menuItemButtonStyle}
                >
                  Lämna feedback
                </button>

                <button
                  type="button"
                  onClick={() => {
                    navigateGlobalView("account")
                  }}
                  style={menuItemButtonStyle}
                >
                  Mitt konto
                </button>

                <button
                  type="button"
                  onClick={() => {
                    navigateGlobalView("gdpr")
                  }}
                  style={menuItemButtonStyle}
                >
                  Integritet
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    await supabase.auth.signOut()
                    window.location.reload()
                  }}
                  style={menuItemButtonStyle}
                >
                  Logga ut
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {usePlayerRedesignShell && (
        <div style={playerShellMenuWrapStyle(isMobile)}>
          <div style={menuWrapStyle}>
            <button
              type="button"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              aria-label="Öppna meny"
              style={playerShellMenuButtonStyle}
            >
              <span style={playerShellMenuIconLineStyle} />
              <span style={playerShellMenuIconLineStyle} />
              <span style={playerShellMenuIconLineStyle} />
            </button>

            {isMenuOpen && (
              <div style={menuDropdownStyle(isMobile)}>
                <button
                  type="button"
                  onClick={() => {
                    navigateGlobalView("app")
                    setIsFeedbackOpen(true)
                    setIsMenuOpen(false)
                  }}
                  style={menuItemButtonStyle}
                >
                  Lämna feedback
                </button>

                <button
                  type="button"
                  onClick={() => {
                    navigateGlobalView("account")
                  }}
                  style={menuItemButtonStyle}
                >
                  Mitt konto
                </button>

                <button
                  type="button"
                  onClick={() => {
                    navigateGlobalView("gdpr")
                  }}
                  style={menuItemButtonStyle}
                >
                  Integritet
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    await supabase.auth.signOut()
                    window.location.reload()
                  }}
                  style={menuItemButtonStyle}
                >
                  Logga ut
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {isFeedbackOpen && (
        <div
          style={
            profile?.role === "player"
              ? { ...playerActivityPanelStyle, marginBottom: "16px" }
              : profile?.role === "coach" || profile?.role === "head_admin"
              ? managementFeedbackComposerCardStyle
              : feedbackComposerCardStyle
          }
        >
          {profile?.role === "player" ? (
            <>
              <div style={playerActivityPanelIntroStyle}>
                <div style={playerTodayMonoLabelStyle}>Feedback</div>
                <div style={playerActivityPanelTitleStyle}>Hjälp oss förbättra appen.</div>
                <div style={playerActivityHintStyle(isMobile)}>
                  Skriv gärna vad som var otydligt, vad som gick fel eller vad du vill se härnäst.
                </div>
              </div>

              <div style={{ ...playerActivityFieldFullStyle, marginTop: "14px" }}>
                <div style={playerActivityFieldLabelStyle}>Meddelande</div>
                <textarea
                  rows={4}
                  value={feedbackText}
                  onChange={(event) => setFeedbackText(event.target.value)}
                  placeholder="Skriv kort vad du vill skicka in"
                  style={{ ...playerActivityTextareaStyle, width: "100%", minHeight: "112px" }}
                />
              </div>

              <div style={{ ...feedbackComposerActionsStyle, marginTop: "14px" }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsFeedbackOpen(false)
                    setFeedbackText("")
                  }}
                  style={playerAccountGhostButtonStyle}
                >
                  Avbryt
                </button>
                <button
                  type="button"
                  onClick={handleSubmitFeedback}
                  disabled={isSubmittingFeedback}
                  style={{
                    ...playerActivitySubmitButtonStyle,
                    opacity: isSubmittingFeedback ? 0.7 : 1,
                    cursor: isSubmittingFeedback ? "default" : "pointer",
                  }}
                >
                  {isSubmittingFeedback ? "Sparar..." : "Skicka feedback"}
                </button>
              </div>
            </>
          ) : (
            <>
              <div style={useManagementRedesignShell ? managementCardTitleStyle : cardTitleStyle}>Skriv feedback</div>
              <p
                style={{
                  ...(useManagementRedesignShell ? managementMutedTextStyle : mutedTextStyle),
                  marginBottom: "12px",
                }}
              >
                Beskriv gärna vad du gjorde, vad som saknas eller vad som kan bli tydligare.
              </p>
              <div style={compactFieldLabelStyle}>Meddelande</div>
              <textarea
                rows={4}
                value={feedbackText}
                onChange={(event) => setFeedbackText(event.target.value)}
                placeholder="Skriv kort vad du vill skicka in"
                style={{
                  ...(useManagementRedesignShell ? managementInputStyle : inputStyle),
                  ...textareaStyle,
                  width: "100%",
                  marginBottom: "12px",
                }}
              />
              <div style={feedbackComposerActionsStyle}>
                <button
                  type="button"
                  onClick={() => {
                    setIsFeedbackOpen(false)
                    setFeedbackText("")
                  }}
                  style={useManagementRedesignShell ? managementSecondaryButtonStyle : secondaryButtonStyle}
                >
                  Avbryt
                </button>
                <button
                  type="button"
                  onClick={handleSubmitFeedback}
                  disabled={isSubmittingFeedback}
                  style={{
                    ...(useManagementRedesignShell ? managementButtonStyle : buttonStyle),
                    opacity: isSubmittingFeedback ? 0.7 : 1,
                    cursor: isSubmittingFeedback ? "default" : "pointer",
                  }}
                >
                  {isSubmittingFeedback ? "Sparar..." : "Skicka feedback"}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {globalView === "account" && (
        <div
          style={{
            ...(profile?.role === "player"
              ? playerAccountPanelStyle
              : profile?.role === "coach" || profile?.role === "head_admin"
              ? managementAccountPanelStyle
              : cardStyle),
            padding:
              profile?.role === "player"
                ? isMobile
                  ? "18px 16px"
                  : playerAccountPanelStyle.padding
                : profile?.role === "coach" || profile?.role === "head_admin"
                ? isMobile
                  ? "18px 16px"
                  : managementAccountPanelStyle.padding
                : isMobile
                ? "16px 14px"
                : cardStyle.padding,
            borderRadius:
              profile?.role === "player"
                ? isMobile
                  ? "24px"
                  : playerAccountPanelStyle.borderRadius
                : profile?.role === "coach" || profile?.role === "head_admin"
                ? isMobile
                  ? "24px"
                  : managementAccountPanelStyle.borderRadius
                : isMobile
                ? "20px"
                : cardStyle.borderRadius,
            marginBottom: isMobile ? "16px" : undefined,
          }}
        >
          <div style={accountHeaderStyle(isMobile)}>
            <div>
              {profile?.role === "player" ? (
                <>
                  <div style={playerTodayMonoLabelStyle}>Konto</div>
                  <div style={playerPassPageTitleStyle}>Mitt konto</div>
                </>
              ) : profile?.role === "coach" || profile?.role === "head_admin" ? (
                <>
                  <div style={managementMonoLabelStyle}>Konto</div>
                  <div style={managementPageTitleStyle}>Mitt konto</div>
                </>
              ) : (
                <div style={sectionTitleStyle}>Mitt konto</div>
              )}
            </div>

            <button
              type="button"
              onClick={() => navigateGlobalView("app")}
              style={{
                ...(profile?.role === "player"
                  ? playerAccountGhostButtonStyle
                  : profile?.role === "coach" || profile?.role === "head_admin"
                  ? managementSecondaryButtonStyle
                  : secondaryButtonStyle),
                width: isMobile ? "100%" : "auto",
              }}
            >
              Tillbaka
            </button>
          </div>

          <div style={accountGridStyle(isMobile)}>
            <div
              style={
                profile?.role === "player"
                  ? playerAccountInfoCardStyle
                  : profile?.role === "coach" || profile?.role === "head_admin"
                  ? managementAccountInfoCardStyle
                  : accountInfoCardStyle
              }
            >
              <div
                style={
                  profile?.role === "player"
                    ? playerAccountInfoLabelStyle
                    : profile?.role === "coach" || profile?.role === "head_admin"
                    ? managementAccountInfoLabelStyle
                    : accountInfoLabelStyle
                }
              >
                Namn
              </div>
              <div
                style={
                  profile?.role === "player"
                    ? playerAccountInfoValueStyle
                    : profile?.role === "coach" || profile?.role === "head_admin"
                    ? managementAccountInfoValueStyle
                    : accountInfoValueStyle
                }
              >
                {profile.full_name || "-"}
              </div>
            </div>

            <div
              style={
                profile?.role === "player"
                  ? playerAccountInfoCardStyle
                  : profile?.role === "coach" || profile?.role === "head_admin"
                  ? managementAccountInfoCardStyle
                  : accountInfoCardStyle
              }
            >
              <div
                style={
                  profile?.role === "player"
                    ? playerAccountInfoLabelStyle
                    : profile?.role === "coach" || profile?.role === "head_admin"
                    ? managementAccountInfoLabelStyle
                    : accountInfoLabelStyle
                }
              >
                Användarnamn
              </div>
              <div
                style={
                  profile?.role === "player"
                    ? playerAccountInfoValueStyle
                    : profile?.role === "coach" || profile?.role === "head_admin"
                    ? managementAccountInfoValueStyle
                    : accountInfoValueStyle
                }
              >
                @{profile.username || "-"}
              </div>
            </div>

            <div
              style={
                profile?.role === "player"
                  ? playerAccountInfoCardStyle
                  : profile?.role === "coach" || profile?.role === "head_admin"
                  ? managementAccountInfoCardStyle
                  : accountInfoCardStyle
              }
            >
              <div
                style={
                  profile?.role === "player"
                    ? playerAccountInfoLabelStyle
                    : profile?.role === "coach" || profile?.role === "head_admin"
                    ? managementAccountInfoLabelStyle
                    : accountInfoLabelStyle
                }
              >
                Roll
              </div>
              <div
                style={
                  profile?.role === "player"
                    ? playerAccountInfoValueStyle
                    : profile?.role === "coach" || profile?.role === "head_admin"
                    ? managementAccountInfoValueStyle
                    : accountInfoValueStyle
                }
              >
                {profile.role === "head_admin"
                  ? "Huvudadmin"
                  : profile.role === "coach"
                  ? "Tränare"
                  : "Spelare"}
              </div>
            </div>

            <div
              style={
                profile?.role === "player"
                  ? playerAccountInfoCardStyle
                  : profile?.role === "coach" || profile?.role === "head_admin"
                  ? managementAccountInfoCardStyle
                  : accountInfoCardStyle
              }
            >
              <div
                style={
                  profile?.role === "player"
                    ? playerAccountInfoLabelStyle
                    : profile?.role === "coach" || profile?.role === "head_admin"
                    ? managementAccountInfoLabelStyle
                    : accountInfoLabelStyle
                }
              >
                Lag
              </div>
              <div
                style={
                  profile?.role === "player"
                    ? playerAccountInfoValueStyle
                    : profile?.role === "coach" || profile?.role === "head_admin"
                    ? managementAccountInfoValueStyle
                    : accountInfoValueStyle
                }
              >
                {teamName}
              </div>
            </div>
          </div>

          <div style={accountActionGridStyle(isMobile)}>
            <button
              type="button"
              onClick={() => navigateGlobalView("gdpr")}
              style={{
                ...(profile?.role === "player"
                  ? playerAccountGhostButtonStyle
                  : profile?.role === "coach" || profile?.role === "head_admin"
                  ? managementSecondaryButtonStyle
                  : secondaryButtonStyle),
                width: isMobile ? "100%" : "auto",
              }}
            >
              Integritet
            </button>

            {profile?.role === "player" && (
              <button
                type="button"
                onClick={() => handleDeletePlayer(profile.id, profile.full_name, { isSelfDelete: true })}
                disabled={isDeletingOwnAccount}
                style={{
                  ...(profile?.role === "player" ? playerAccountDangerButtonStyle : dangerActionButtonStyle),
                  width: isMobile ? "100%" : "auto",
                  opacity: isDeletingOwnAccount ? 0.7 : 1,
                  cursor: isDeletingOwnAccount ? "default" : "pointer",
                }}
              >
                {isDeletingOwnAccount ? "Tar bort konto..." : "Ta bort mitt konto"}
              </button>
            )}
          </div>

          <div
            style={
              profile?.role === "player"
                ? playerAccountPasswordCardStyle
                : profile?.role === "coach" || profile?.role === "head_admin"
                ? managementAccountPasswordCardStyle
                : accountPasswordCardStyle
            }
          >
            <div
              style={
                profile?.role === "player"
                  ? playerAccountSectionTitleStyle
                  : profile?.role === "coach" || profile?.role === "head_admin"
                  ? managementAccountSectionTitleStyle
                  : accountPasswordTitleStyle
              }
            >
              Byt lösenord
            </div>
            <div
              style={
                profile?.role === "player"
                  ? playerAccountSectionTextStyle
                  : profile?.role === "coach" || profile?.role === "head_admin"
                  ? managementAccountSectionTextStyle
                  : accountPasswordTextStyle
              }
            >
              Byt lösenord direkt här. Gäller spelare, tränare och huvudadmin.
            </div>

            <div style={accountPasswordFormStyle(isMobile)}>
              <div style={{ width: "100%" }}>
                <div
                  style={
                    profile?.role === "player"
                      ? playerAccountFieldLabelStyle
                      : profile?.role === "coach" || profile?.role === "head_admin"
                      ? managementAccountFieldLabelStyle
                      : compactFieldLabelStyle
                  }
                >
                  Nytt lösenord
                </div>
                <input
                  type="password"
                  value={accountPassword}
                  onChange={(e) => setAccountPassword(e.target.value)}
                  style={{
                    ...(profile?.role === "player"
                      ? playerActivityInputStyle
                      : profile?.role === "coach" || profile?.role === "head_admin"
                      ? managementInputStyle
                      : inputStyle),
                    width: "100%",
                  }}
                />
              </div>
              <div style={{ width: "100%" }}>
                <div
                  style={
                    profile?.role === "player"
                      ? playerAccountFieldLabelStyle
                      : profile?.role === "coach" || profile?.role === "head_admin"
                      ? managementAccountFieldLabelStyle
                      : compactFieldLabelStyle
                  }
                >
                  Bekräfta nytt lösenord
                </div>
                <input
                  type="password"
                  value={accountPasswordConfirm}
                  onChange={(e) => setAccountPasswordConfirm(e.target.value)}
                  style={{
                    ...(profile?.role === "player"
                      ? playerActivityInputStyle
                      : profile?.role === "coach" || profile?.role === "head_admin"
                      ? managementInputStyle
                      : inputStyle),
                    width: "100%",
                  }}
                />
              </div>
              <button
                type="button"
                onClick={handleUpdateOwnPassword}
                disabled={isUpdatingOwnPassword}
                style={{
                  ...(profile?.role === "player"
                    ? playerActivitySubmitButtonStyle
                    : profile?.role === "coach" || profile?.role === "head_admin"
                    ? managementButtonStyle
                    : buttonStyle),
                  width: isMobile ? "100%" : "auto",
                  opacity: isUpdatingOwnPassword ? 0.7 : 1,
                  cursor: isUpdatingOwnPassword ? "default" : "pointer",
                }}
              >
                {isUpdatingOwnPassword ? "Sparar..." : "Byt mitt lösenord"}
              </button>
            </div>
          </div>

          <div
            style={
              profile?.role === "player"
                ? playerAccountWarningCardStyle
                : profile?.role === "coach" || profile?.role === "head_admin"
                ? managementAccountWarningCardStyle
                : accountWarningCardStyle
            }
          >
            <div
              style={
                profile?.role === "player"
                  ? playerAccountWarningTitleStyle
                  : profile?.role === "coach" || profile?.role === "head_admin"
                  ? managementAccountWarningTitleStyle
                  : accountWarningTitleStyle
              }
            >
              Radering av konto
            </div>
            <div
              style={
                profile?.role === "player"
                  ? playerAccountWarningTextStyle
                  : profile?.role === "coach" || profile?.role === "head_admin"
                  ? managementAccountWarningTextStyle
                  : accountWarningTextStyle
              }
            >
              Om du tar bort ditt konto raderas din profil och din träningshistorik permanent. Om du
              bara ska döljas från aktiva spelarlistor använder tränare eller huvudadmin arkivering.
            </div>
          </div>

        </div>
      )}

      {globalView === "gdpr" && (
        <GdprPage
          isMobile={isMobile}
          profile={profile}
          teamName={teamName}
          mutedTextStyle={resolvedMutedTextStyle}
          secondaryButtonStyle={resolvedSecondaryButtonStyle}
          buttonStyle={resolvedButtonStyle}
          uiVariant={useManagementRedesignShell ? "coach" : profile?.role === "player" ? "player" : "default"}
          onBack={() => navigateGlobalView("app")}
          onOpenAccount={() => navigateGlobalView("account")}
        />
      )}

      {globalView === "app" && (
        <>
      {(profile?.role === "coach" || profile?.role === "head_admin") && (
        <>
          {!showCoachBottomNav && !showAdminBottomNav && (
            <div
              style={{
                ...(useManagementRedesignShell ? managementTabsWrapStyle : coachTabsWrapStyle),
                flexWrap: isMobile
                  ? "nowrap"
                  : useManagementRedesignShell
                  ? managementTabsWrapStyle.flexWrap
                  : coachTabsWrapStyle.flexWrap,
                overflowX: isMobile ? "auto" : "visible",
                paddingBottom: isMobile ? "6px" : 0,
                marginInline: isMobile ? "-2px" : 0,
                WebkitOverflowScrolling: "touch",
                scrollSnapType: isMobile ? "x proximity" : "none",
                position: isMobile ? "sticky" : "static",
                top: isMobile ? "max(8px, env(safe-area-inset-top))" : "auto",
                zIndex: isMobile ? 5 : "auto",
                paddingTop: isMobile ? "4px" : 0,
                backdropFilter: isMobile ? "blur(14px)" : "none",
              }}
            >
              {managementTabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => navigateCoachSection(tab.key)}
                  style={{
                    ...(useManagementRedesignShell ? managementTabButtonStyle : coachTabButtonStyle),
                    flex: isMobile ? "0 0 auto" : undefined,
                    whiteSpace: "nowrap",
                    minHeight: isMobile ? "44px" : undefined,
                    scrollSnapAlign: isMobile ? "start" : "none",
                    ...(coachView === tab.key
                      ? useManagementRedesignShell
                        ? managementActiveTabButtonStyle
                        : activeCoachTabButtonStyle
                      : {}),
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          <div
            style={{
              ...(useManagementFlatLayout
                ? managementHomeViewportStyle
                : useManagementRedesignShell
                ? managementViewportPanelStyle
                : cardStyle),
              padding: isMobile
                ? useManagementFlatLayout
                  ? "0"
                  : useManagementRedesignShell
                  ? "18px 16px"
                  : "16px 14px"
                : useManagementFlatLayout
                ? "0"
                : useManagementRedesignShell
                ? managementViewportPanelStyle.padding
                : cardStyle.padding,
              borderRadius: isMobile
                ? useManagementFlatLayout
                  ? "0"
                  : "24px"
                : useManagementFlatLayout
                ? "0"
                : useManagementRedesignShell
                ? managementViewportPanelStyle.borderRadius
                : cardStyle.borderRadius,
              marginBottom: isMobile
                ? useManagementFlatLayout
                  ? "16px"
                  : "16px"
                : useManagementFlatLayout
                ? "16px"
                : useManagementRedesignShell
                ? managementViewportPanelStyle.marginBottom
                : cardStyle.marginBottom,
            }}
          >
            {coachView === "home" && (
              profile?.role === "head_admin" ? (
                <AdminHomePage
                  setCoachView={setCoachView}
                  totalUsers={totalUsersCount}
                  totalTeams={totalTeamsCount}
                  organizationLabel="Systemöversikt"
                  isMobile={isMobile}
                  uiVariant="coach"
                />
              ) : (
                <CoachHomePage
                  setCoachView={setCoachView}
                  setSelectedPlayer={setSelectedPlayer}
                  resetExerciseForm={resetExerciseForm}
                  coachName={coachName}
                  teamName={teamName}
                  activePlayerCount={activePlayerCount}
                  passCount={coachPassCount}
                  activeSevenDayCount={activeSevenDayCount}
                  openTargetChangeRequestCount={targetChangeRequests.length}
                  isMobile={isMobile}
                  uiVariant="coach"
                />
              )
            )}

            {coachView === "calendar" && profile?.role === "coach" && (
              <CalendarPage
                role={profile.role}
                isMobile={isMobile}
                teamName={teamName}
                entries={calendarEntries}
                players={players.filter((player) => !player.is_archived)}
                workouts={activeWorkouts}
                weekStart={calendarWeekStart}
                isLoading={isLoadingCalendar}
                isSubmittingCreate={isSubmittingCalendar}
                isSavingActivity={isSavingCalendarActivity}
                isCancellingActivity={isCancellingCalendarActivity}
                updatingEntryStatusId={updatingCalendarEventPlayerId}
                onPreviousWeek={() =>
                  setCalendarWeekStart((prev) =>
                    getDateInputValueFromTimestamp(new Date(`${prev}T00:00:00`).getTime() - 7 * 24 * 60 * 60 * 1000)
                  )
                }
                onNextWeek={() =>
                  setCalendarWeekStart((prev) =>
                    getDateInputValueFromTimestamp(new Date(`${prev}T00:00:00`).getTime() + 7 * 24 * 60 * 60 * 1000)
                  )
                }
                onGoToToday={() => setCalendarWeekStart(getWeekStartDateInputValue())}
                onCreateActivity={handleCreateCalendarActivity}
                onSaveActivity={handleSaveCalendarActivity}
                onCancelActivity={handleCancelCalendarActivity}
                onOpenEntry={handleOpenCalendarEntry}
                onUpdateEntryStatus={handleUpdateCalendarEventPlayerStatus}
                externalCalendarSource={calendarImportSource}
                externalCalendarFeedUrl={calendarImportFeedUrl}
                onExternalCalendarFeedUrlChange={setCalendarImportFeedUrl}
                externalCalendarEnabled={calendarImportEnabled}
                onExternalCalendarEnabledChange={setCalendarImportEnabled}
                onSaveExternalCalendarSource={handleSaveCalendarImportSource}
                isSavingExternalCalendarSource={isSavingCalendarImportSource}
                onSyncExternalCalendar={() => invokeLagetSeCalendarSync({ force: true, silent: false })}
                isSyncingExternalCalendar={isSyncingCalendarImportSource}
                isSavingGroups={isSavingCalendarGroups}
                onSaveEntryGroups={handleSaveCalendarEntryGroups}
                uiVariant="coach"
              />
            )}

            {coachView === "users" && profile?.role === "head_admin" && (
              <UsersAdminPage
                users={allUsers}
                teams={teams}
                isLoadingUsers={isLoadingAllUsers}
                newUserName={newPlayerName}
                setNewUserName={setNewPlayerName}
                newUserPassword={newPlayerPassword}
                setNewUserPassword={setNewPlayerPassword}
                newUserRole={newUserRole}
                setNewUserRole={setNewUserRole}
                selectedTeamId={selectedTeamId}
                setSelectedTeamId={setSelectedTeamId}
                handleCreateUser={handleCreatePlayer}
                isCreatingUser={isCreatingPlayer}
                createdUser={createdPlayer}
                updatingUserTeamId={updatingUserTeamId}
                resettingPasswordUserId={resettingPasswordUserId}
                repairingLoginUserId={repairingLoginUserId}
                deletingUserId={deletingUserId}
                archivingPlayerId={archivingPlayerId}
                deletingPlayerId={deletingPlayerId}
                handleChangeUserTeam={handleChangeUserTeam}
                handleResetUserPassword={handleResetUserPassword}
                handleRepairUserLogin={handleRepairUserLogin}
                handleDeleteUser={handleDeleteUser}
                handleArchivePlayer={handleArchivePlayer}
                handleDeletePlayer={handleDeletePlayer}
                cardTitleStyle={resolvedCardTitleStyle}
                mutedTextStyle={resolvedMutedTextStyle}
                inputStyle={resolvedInputStyle}
                buttonStyle={resolvedButtonStyle}
                isMobile={isMobile}
                uiVariant="coach"
              />
            )}

            {coachView === "teams" && profile?.role === "head_admin" && (
              <TeamsPage
                teams={teams}
                users={allUsers}
                newTeamName={newTeamName}
                setNewTeamName={setNewTeamName}
                handleCreateTeam={handleCreateTeam}
                handleDeleteTeam={handleDeleteTeam}
                isCreatingTeam={isCreatingTeam}
                deletingTeamId={deletingTeamId}
                cardTitleStyle={resolvedCardTitleStyle}
                inputStyle={resolvedInputStyle}
                buttonStyle={resolvedButtonStyle}
                secondaryButtonStyle={resolvedSecondaryButtonStyle}
                mutedTextStyle={resolvedMutedTextStyle}
                isMobile={isMobile}
                uiVariant="coach"
              />
            )}

            {coachView === "exerciseBank" && (
              <ExerciseBankPage
                canManageExercises={profile?.role === "head_admin"}
                canRequestExercises={profile?.role === "coach"}
                newExerciseName={newExerciseName}
                setNewExerciseName={setNewExerciseName}
                newExerciseType={newExerciseType}
                setNewExerciseType={setNewExerciseType}
                newExerciseDefaultRepsMode={newExerciseDefaultRepsMode}
                setNewExerciseDefaultRepsMode={setNewExerciseDefaultRepsMode}
                newExerciseGuide={newExerciseGuide}
                setNewExerciseGuide={setNewExerciseGuide}
                newExerciseDescription={newExerciseDescription}
                setNewExerciseDescription={setNewExerciseDescription}
                newExerciseMediaUrl={newExerciseMediaUrl}
                setNewExerciseMediaUrl={setNewExerciseMediaUrl}
                newExerciseMuscleGroups={newExerciseMuscleGroups}
                setNewExerciseMuscleGroups={setNewExerciseMuscleGroups}
                newExerciseExecutionSide={newExerciseExecutionSide}
                setNewExerciseExecutionSide={setNewExerciseExecutionSide}
                newExerciseAliasesText={newExerciseAliasesText}
                setNewExerciseAliasesText={setNewExerciseAliasesText}
                newExerciseDisplayName={newExerciseDisplayName}
                setNewExerciseDisplayName={setNewExerciseDisplayName}
                newExercisePrimaryCategory={newExercisePrimaryCategory}
                setNewExercisePrimaryCategory={setNewExercisePrimaryCategory}
                newExerciseNavigationCategory={newExerciseNavigationCategory}
                setNewExerciseNavigationCategory={setNewExerciseNavigationCategory}
                editingExerciseId={editingExerciseId}
                isSavingExercise={isSavingExercise}
                handleCreateExercise={handleCreateExercise}
                handleStartEditExercise={handleStartEditExercise}
                handleDeleteExercise={handleDeleteExercise}
                resetExerciseForm={resetExerciseForm}
                importedExercises={importedExercises}
                exerciseImportFileName={exerciseImportFileName}
                isParsingExerciseImportFile={isParsingExerciseImportFile}
                isImportingExercises={isImportingExercises}
                exerciseImportResults={exerciseImportResults}
                handleExerciseImportFile={handleExerciseImportFile}
                handleImportExercises={handleImportExercises}
                handleExportExercises={handleExportExercises}
                resetExerciseImport={resetExerciseImport}
                exercisesFromDB={exercisesFromDB}
                exerciseRequests={exerciseRequests}
                users={allUsers}
                teams={teams}
                isLoadingExerciseRequests={isLoadingExerciseRequests}
                updatingExerciseRequestId={updatingExerciseRequestId}
                isSubmittingExerciseRequest={isSubmittingExerciseRequest}
                handleRefreshExerciseRequests={loadExerciseRequests}
                handleSubmitExerciseRequest={handleSubmitExerciseRequest}
                handleUpdateExerciseRequestStatus={handleUpdateExerciseRequestStatus}
                inputStyle={resolvedInputStyle}
                buttonStyle={resolvedButtonStyle}
                secondaryButtonStyle={resolvedSecondaryButtonStyle}
                mutedTextStyle={resolvedMutedTextStyle}
                cardTitleStyle={resolvedCardTitleStyle}
                isMobile={isMobile}
                uiVariant="coach"
              />
            )}

            {coachView === "messages" && (
              <MessagesPage
                role={profile?.role}
                currentUserId={user?.id}
                recipients={messageRecipients}
                selectedRecipientIds={selectedMessageRecipientIds}
                setSelectedRecipientIds={setSelectedMessageRecipientIds}
                onToggleRecipient={handleToggleMessageRecipient}
                messageSubject={messageSubject}
                setMessageSubject={setMessageSubject}
                messageBody={messageBody}
                setMessageBody={setMessageBody}
                handleSendMessage={handleSendMessage}
                handleMarkMessagesRead={handleMarkMessagesRead}
                isSendingMessage={isSendingMessage}
                messages={messages}
                isLoadingMessages={isLoadingMessages}
                handleRefreshMessages={loadMessages}
                teams={teams}
                cardTitleStyle={resolvedCardTitleStyle}
                mutedTextStyle={resolvedMutedTextStyle}
                inputStyle={resolvedInputStyle}
                buttonStyle={resolvedButtonStyle}
                secondaryButtonStyle={resolvedSecondaryButtonStyle}
                isMobile={isMobile}
                uiVariant="coach"
              />
            )}

            {coachView === "stats" && (
              <StatsPage
                candidatePlayers={statisticsPlayers}
                exercises={exercisesFromDB}
                currentUserId={user?.id}
                cardTitleStyle={resolvedCardTitleStyle}
                mutedTextStyle={resolvedMutedTextStyle}
                inputStyle={resolvedInputStyle}
                secondaryButtonStyle={resolvedSecondaryButtonStyle}
                isMobile={isMobile}
                uiVariant="coach"
              />
            )}

            {coachView === "feedback" && profile?.role === "head_admin" && (
              <FeedbackPage
                feedbackItems={feedbackItems}
                users={allUsers}
                teams={teams}
                isLoadingFeedback={isLoadingFeedback}
                updatingFeedbackId={updatingFeedbackId}
                handleRefreshFeedback={loadFeedback}
                handleUpdateFeedbackStatus={handleUpdateFeedbackStatus}
                cardTitleStyle={resolvedCardTitleStyle}
                mutedTextStyle={resolvedMutedTextStyle}
                secondaryButtonStyle={resolvedSecondaryButtonStyle}
                buttonStyle={resolvedButtonStyle}
                isMobile={isMobile}
                uiVariant="coach"
              />
            )}

            {coachView === "passBuilder" && (
              <PassBuilderPage
                activeWorkouts={activeWorkouts}
                players={players}
                selectedTemplateCode={selectedTemplateCode}
                setSelectedTemplateCode={setSelectedTemplateCode}
                newPassName={newPassName}
                setNewPassName={setNewPassName}
                newPassInfo={newPassInfo}
                setNewPassInfo={setNewPassInfo}
                newPassWarmupCardio={newPassWarmupCardio}
                setNewPassWarmupCardio={setNewPassWarmupCardio}
                newPassWarmupTechnique={newPassWarmupTechnique}
                setNewPassWarmupTechnique={setNewPassWarmupTechnique}
                newPassWorkoutKind={newPassWorkoutKind}
                setNewPassWorkoutKind={setNewPassWorkoutKind}
                newPassGymPassType={newPassGymPassType}
                setNewPassGymPassType={setNewPassGymPassType}
                newPassRunningType={newPassRunningType}
                setNewPassRunningType={setNewPassRunningType}
                newPassRunningIntervalProgram={newPassRunningIntervalProgram}
                setNewPassRunningIntervalProgram={setNewPassRunningIntervalProgram}
                newPassRunningDistance={newPassRunningDistance}
                setNewPassRunningDistance={setNewPassRunningDistance}
                newPassRunningTime={newPassRunningTime}
                setNewPassRunningTime={setNewPassRunningTime}
                newWarmupTemplateName={newWarmupTemplateName}
                setNewWarmupTemplateName={setNewWarmupTemplateName}
                handleCreatePass={handleCreatePass}
                isCreatingPass={isCreatingPass}
                renamePassName={renamePassName}
                setRenamePassName={setRenamePassName}
                renamePassInfo={renamePassInfo}
                setRenamePassInfo={setRenamePassInfo}
                renamePassWarmupCardio={renamePassWarmupCardio}
                setRenamePassWarmupCardio={setRenamePassWarmupCardio}
                renamePassWarmupTechnique={renamePassWarmupTechnique}
                setRenamePassWarmupTechnique={setRenamePassWarmupTechnique}
                renamePassWorkoutKind={renamePassWorkoutKind}
                setRenamePassWorkoutKind={setRenamePassWorkoutKind}
                renamePassGymPassType={renamePassGymPassType}
                setRenamePassGymPassType={setRenamePassGymPassType}
                renamePassRunningType={renamePassRunningType}
                setRenamePassRunningType={setRenamePassRunningType}
                renamePassRunningIntervalProgram={renamePassRunningIntervalProgram}
                setRenamePassRunningIntervalProgram={setRenamePassRunningIntervalProgram}
                renamePassRunningDistance={renamePassRunningDistance}
                setRenamePassRunningDistance={setRenamePassRunningDistance}
                renamePassRunningTime={renamePassRunningTime}
                setRenamePassRunningTime={setRenamePassRunningTime}
                renameWarmupTemplateName={renameWarmupTemplateName}
                setRenameWarmupTemplateName={setRenameWarmupTemplateName}
                warmupTemplates={warmupTemplates}
                isSavingWarmupTemplate={isSavingWarmupTemplate}
                applyWarmupTemplateToCreate={applyWarmupTemplateToCreate}
                applyWarmupTemplateToEdit={applyWarmupTemplateToEdit}
                saveCreateWarmupTemplate={saveCreateWarmupTemplate}
                saveEditWarmupTemplate={saveEditWarmupTemplate}
                exercisesFromDB={exercisesFromDB}
                selectedExerciseId={selectedExerciseId}
                setSelectedExerciseId={setSelectedExerciseId}
                handleAddExerciseToPass={handleAddExerciseToPass}
                handleAddHrgProgramToPass={handleAddHrgProgramToPass}
                handleAddAlternativeExerciseToPassExercise={handleAddAlternativeExerciseToPassExercise}
                handleRemoveAlternativeExerciseFromPassExercise={handleRemoveAlternativeExerciseFromPassExercise}
                isSavingPassExercise={isSavingPassExercise}
                passExerciseDrafts={passExerciseDrafts}
                handlePassExerciseDraftChange={handlePassExerciseDraftChange}
                handleSavePassExercises={handleSavePassExercises}
                handleRemoveExerciseFromPass={handleRemoveExerciseFromPass}
                handleMoveExerciseInPass={handleMoveExerciseInPass}
                handleDeletePass={handleDeleteSelectedPass}
                handleAssignPassToPlayers={handleAssignPassToPlayers}
                handleSavePassAssignmentsToPlayers={handleSavePassAssignmentsToPlayers}
                passAssignmentPlayerIdsByPass={passAssignmentPlayerIdsByPass}
                resetPassEditorState={resetPassEditorState}
                cardTitleStyle={resolvedCardTitleStyle}
                secondaryButtonStyle={resolvedSecondaryButtonStyle}
                mutedTextStyle={resolvedMutedTextStyle}
                inputStyle={resolvedInputStyle}
                buttonStyle={resolvedButtonStyle}
                isMobile={isMobile}
                uiVariant="coach"
              />
            )}

            {coachView === "createPlayer" && profile?.role === "coach" && (
              <CreateUserPage
                isHeadAdmin={profile?.role === "head_admin"}
                teams={teams}
                currentTeamId={profile?.team_id}
                newUserName={newPlayerName}
                setNewUserName={setNewPlayerName}
                newUserPassword={newPlayerPassword}
                setNewUserPassword={setNewPlayerPassword}
                newUserRole={newUserRole}
                setNewUserRole={setNewUserRole}
                selectedTeamId={selectedTeamId}
                setSelectedTeamId={setSelectedTeamId}
                handleCreateUser={handleCreatePlayer}
                isCreatingUser={isCreatingPlayer}
                createdUser={createdPlayer}
                inputStyle={resolvedInputStyle}
                buttonStyle={resolvedButtonStyle}
                cardTitleStyle={resolvedCardTitleStyle}
                isMobile={isMobile}
                importedPlayers={importedPlayers}
                importFileName={importFileName}
                isParsingImportFile={isParsingImportFile}
                handlePlayerImportFile={handlePlayerImportFile}
                handleImportPlayers={handleImportPlayers}
                isImportingPlayers={isImportingPlayers}
                importResults={importResults}
                uiVariant="coach"
              />
            )}

            {coachView === "players" && (
              <PlayersPage
                role={profile?.role}
                setCoachView={setCoachView}
                isLoadingPlayers={isLoadingPlayers}
                players={players}
                showArchivedPlayers={showArchivedPlayers}
                setShowArchivedPlayers={setShowArchivedPlayers}
                archivingPlayerId={archivingPlayerId}
                handleArchivePlayer={handleArchivePlayer}
                teamCoaches={teamCoaches}
                selectedPlayer={selectedPlayer}
                setSelectedPlayer={setSelectedPlayer}
                updatingGoalAvailabilityIds={updatingGoalAvailabilityIds}
                handleSetIndividualGoalsEnabled={handleSetIndividualGoalsEnabled}
                commentDrafts={commentDrafts}
                handleCommentChange={handleCommentChange}
                handleCommentSave={handleCommentSave}
                mutedTextStyle={resolvedMutedTextStyle}
                cardTitleStyle={resolvedCardTitleStyle}
                inputStyle={resolvedInputStyle}
                activeWorkouts={activeWorkouts}
                assignedPassCodes={selectedPlayerAssignedPasses}
                isLoadingTargets={isLoadingTargets}
                targetDrafts={targetDrafts}
                handleTargetDraftChange={handleTargetDraftChange}
                handleSaveTargets={handleSaveTargets}
                isSavingTargets={isSavingTargets}
                selectedPlayerHistory={selectedPlayerHistory}
                selectedPlayerCompletedSessions={selectedPlayerCompletedSessions}
                isLoadingSelectedPlayerHistory={isLoadingSelectedPlayerHistory}
                targetChangeRequests={targetChangeRequests}
                isLoadingTargetChangeRequests={isLoadingTargetChangeRequests}
                targetChangeRequestReviewDrafts={targetChangeRequestReviewDrafts}
                updatingTargetChangeRequestId={updatingTargetChangeRequestId}
                handleSetTargetChangeReviewDraft={handleSetTargetChangeReviewDraft}
                handleReviewTargetChangeRequest={handleReviewTargetChangeRequest}
                exerciseGoalDrafts={exerciseGoalDrafts}
                selectedPlayerExerciseGoals={selectedPlayerExerciseGoals}
                handleExerciseGoalDraftChange={handleExerciseGoalDraftChange}
                handleExerciseGoalRepRangeWeightDraftChange={handleExerciseGoalRepRangeWeightDraftChange}
                handlePrefillExerciseGoalFromHistory={handlePrefillExerciseGoalFromHistory}
                handleSaveExerciseGoals={handleSaveExerciseGoals}
                isSavingExerciseGoals={isSavingExerciseGoals}
                handleAssignPassToPlayer={handleAssignPassToPlayer}
                handleUnassignPassFromPlayer={handleUnassignPassFromPlayer}
                handleAssignAllPassesToPlayer={handleAssignAllPassesToPlayer}
                handleClearAssignedPassesFromPlayer={handleClearAssignedPassesFromPlayer}
                isUpdatingPassAssignments={isUpdatingPassAssignments}
                buttonStyle={resolvedButtonStyle}
                isMobile={isMobile}
                uiVariant="coach"
              />
            )}
          </div>

          {showCoachBottomNav && (
            <div style={coachBottomNavWrapStyle}>
              <div
                style={{
                  ...(useManagementRedesignShell ? managementBottomNavStyle : coachBottomNavStyle),
                  gridTemplateColumns: `repeat(${coachBottomTabs.length}, minmax(0, 1fr))`,
                }}
              >
                {coachBottomTabs.map((tab) => {
                  const isActive = coachView === tab.key

                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => navigateCoachSection(tab.key)}
                      style={{
                        ...coachBottomNavButtonStyle,
                        color: useManagementRedesignShell
                          ? isActive
                            ? playerAccent
                            : playerInkSoft
                          : isActive
                          ? "#dc2626"
                          : "#6b7280",
                      }}
                    >
                      <span
                        style={{
                          ...(useManagementRedesignShell
                            ? managementBottomNavIconWrapStyle
                            : coachBottomNavIconWrapStyle),
                          backgroundColor: useManagementRedesignShell
                            ? isActive
                              ? "rgba(217, 74, 31, 0.12)"
                              : "transparent"
                            : isActive
                            ? "#fff1f1"
                            : "transparent",
                        }}
                      >
                        {renderCoachBottomNavIcon(tab.icon, isActive)}
                      </span>
                      <span
                        style={
                          useManagementRedesignShell ? managementBottomNavLabelStyle : coachBottomNavLabelStyle
                        }
                      >
                        {tab.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {showAdminBottomNav && (
            <div style={coachBottomNavWrapStyle}>
              <div
                style={{
                  ...(useManagementRedesignShell ? managementBottomNavStyle : coachBottomNavStyle),
                  gridTemplateColumns: `repeat(${adminBottomTabs.length}, minmax(0, 1fr))`,
                }}
              >
                {adminBottomTabs.map((tab) => {
                  const isActive = coachView === tab.key

                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => navigateCoachSection(tab.key)}
                      style={{
                        ...coachBottomNavButtonStyle,
                        color: useManagementRedesignShell
                          ? isActive
                            ? playerAccent
                            : playerInkSoft
                          : isActive
                          ? "#b61e24"
                          : "#6b7280",
                      }}
                    >
                      <span
                        style={{
                          ...(useManagementRedesignShell
                            ? managementBottomNavIconWrapStyle
                            : coachBottomNavIconWrapStyle),
                          backgroundColor: useManagementRedesignShell
                            ? isActive
                              ? "rgba(217, 74, 31, 0.12)"
                              : "transparent"
                            : isActive
                            ? "#fff1f1"
                            : "transparent",
                        }}
                      >
                        {renderCoachBottomNavIcon(tab.icon, isActive)}
                      </span>
                      <span
                        style={
                          useManagementRedesignShell ? managementBottomNavLabelStyle : coachBottomNavLabelStyle
                        }
                      >
                        {tab.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      {profile?.role === "player" && (
        <div
          style={{
            ...workoutActionSectionStyle,
            alignItems: isMobile ? "stretch" : "flex-start",
          }}
        >
          {!isWorkoutActive ? (
            !showPlayerBottomNav && (
              <div style={coachTabsWrapStyle}>
                {playerTabs.map((tab) => {
                  const isActive = playerView === tab.key

                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setPlayerView(tab.key)}
                      style={{
                        ...coachTabButtonStyle,
                        ...(isActive ? activeCoachTabButtonStyle : {}),
                        width: isMobile ? "100%" : "auto",
                      }}
                    >
                      {tab.label}
                    </button>
                  )
                })}
              </div>
            )
          ) : (
            <div style={activeWorkoutPageHeroStyle(isMobile)}>
              <div style={activeWorkoutTopBarStyle}>
                <button
                  type="button"
                  onClick={cancelWorkout}
                  style={activeWorkoutCloseButtonStyle}
                  aria-label="Avbryt pass"
                >
                  ×
                </button>
                <div style={activeWorkoutLiveMetaStyle}>
                  <span style={activeWorkoutLiveDotStyle(activeWorkoutAccent)} />
                  <span>{activeWorkoutData?.label || "Träningspass"}</span>
                  <span>·</span>
                  <span>{activeWorkoutProgressSummary}</span>
                </div>
              </div>
              <div style={activeWorkoutProgressBarStyle}>
                {activeWorkoutProgressSegments.map((segment) => (
                  <div
                    key={segment.key}
                    style={{
                      ...activeWorkoutProgressSegmentStyle,
                      backgroundColor: segment.isCurrent
                        ? activeWorkoutAccent
                        : segment.isComplete
                        ? "#1a1814"
                        : "rgba(26, 24, 20, 0.14)",
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {!isWorkoutActive && playerView === "messages" && (
            <MessagesPage
              role={profile?.role}
              currentUserId={user?.id}
              recipients={messageRecipients}
              selectedRecipientIds={selectedMessageRecipientIds}
              setSelectedRecipientIds={setSelectedMessageRecipientIds}
              onToggleRecipient={handleToggleMessageRecipient}
              messageSubject={messageSubject}
              setMessageSubject={setMessageSubject}
              messageBody={messageBody}
              setMessageBody={setMessageBody}
              handleSendMessage={handleSendMessage}
              handleMarkMessagesRead={handleMarkMessagesRead}
              isSendingMessage={isSendingMessage}
              messages={messages}
              isLoadingMessages={isLoadingMessages}
              handleRefreshMessages={loadMessages}
              teams={teams}
              cardTitleStyle={cardTitleStyle}
              mutedTextStyle={mutedTextStyle}
              inputStyle={inputStyle}
              buttonStyle={buttonStyle}
              secondaryButtonStyle={secondaryButtonStyle}
              isMobile={isMobile}
            />
          )}

          {!isWorkoutActive && playerView === "overview" && (
            <div style={playerTodayPageStyle}>
              {lastFinishedWorkoutSummary && (
                <div style={playerWorkoutCompleteCardStyle}>
                  <div style={playerTodayMonoLabelStyle}>Pass klart</div>
                  <div style={playerWorkoutCompleteTitleStyle}>{lastFinishedWorkoutSummary.label}</div>
                  <div style={playerWorkoutCompleteMetaStyle}>{lastFinishedWorkoutSummary.meta}</div>
                  <div style={playerWorkoutHighlightCardStyle}>
                    <div style={playerTodayMonoLabelStyle}>{lastFinishedWorkoutSummary.highlightLabel}</div>
                    <div style={playerWorkoutHighlightValueStyle}>{lastFinishedWorkoutSummary.highlightValue}</div>
                  </div>
                  {lastFinishedWorkoutSummary.workoutKind === "running" ? (
                    <div style={{ display: "grid", gap: "12px", marginTop: "4px" }}>
                      <div style={playerRunningRegistrationGridStyle(isMobile)}>
                        <label style={fieldLabelStyle}>
                          Distans
                          <input
                            placeholder="t.ex. 6,4"
                            value={lastFinishedWorkoutSummary.draft?.running_distance || ""}
                            onChange={(event) =>
                              handleFinishedRunningSummaryDraftChange("running_distance", event.target.value)
                            }
                            style={playerActivityInputStyle}
                          />
                        </label>
                        <label style={fieldLabelStyle}>
                          Tid
                          <input
                            placeholder="t.ex. 31:20"
                            value={lastFinishedWorkoutSummary.draft?.running_time || ""}
                            onChange={(event) =>
                              handleFinishedRunningSummaryDraftChange("running_time", event.target.value)
                            }
                            style={playerActivityInputStyle}
                          />
                        </label>
                        <label style={fieldLabelStyle}>
                          Snittpuls
                          <input
                            placeholder="valfritt"
                            value={lastFinishedWorkoutSummary.draft?.average_pulse || ""}
                            onChange={(event) =>
                              handleFinishedRunningSummaryDraftChange("average_pulse", event.target.value)
                            }
                            style={playerActivityInputStyle}
                          />
                        </label>
                        <label style={{ ...fieldLabelStyle, gridColumn: isMobile ? "auto" : "span 2" }}>
                          Kommentar
                          <textarea
                            rows={3}
                            placeholder="Valfritt"
                            value={lastFinishedWorkoutSummary.draft?.pass_comment || ""}
                            onChange={(event) =>
                              handleFinishedRunningSummaryDraftChange("pass_comment", event.target.value)
                            }
                            style={playerActivityTextareaStyle}
                          />
                        </label>
                      </div>
                      <div style={playerWorkoutCompleteActionsStyle(isMobile)}>
                        <button
                          type="button"
                          onClick={handleSaveFinishedRunningSummary}
                          disabled={isSavingFinishedRunningSummary}
                          style={{ ...buttonStyle, ...playerTodayPrimaryButtonStyle, opacity: isSavingFinishedRunningSummary ? 0.7 : 1 }}
                        >
                          {isSavingFinishedRunningSummary ? "Sparar..." : "Spara sammanfattning"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setLastFinishedWorkoutSummary(null)}
                          style={{ ...secondaryButtonStyle, ...playerTodaySecondaryButtonStyle }}
                        >
                          Klar
                        </button>
                      </div>
                    </div>
                  ) : (
                  <div style={playerWorkoutCompleteActionsStyle(isMobile)}>
                    <button
                      type="button"
                      onClick={() => {
                        setLastFinishedWorkoutSummary(null)
                        navigatePlayerSection("stats")
                      }}
                      style={{ ...buttonStyle, ...playerTodayPrimaryButtonStyle }}
                    >
                      Se statistik
                    </button>
                    <button
                      type="button"
                      onClick={() => setLastFinishedWorkoutSummary(null)}
                      style={{ ...secondaryButtonStyle, ...playerTodaySecondaryButtonStyle }}
                    >
                      Tillbaka till idag
                    </button>
                  </div>
                  )}
                </div>
              )}

              <div style={playerHomeTeamRowStyle}>
                <div style={playerHomeTeamLabelStyle}>{teamName}</div>
              </div>

              <div style={playerHomeDateRowStyle}>
                <div style={playerHomeDateLabelStyle}>{formatTodayLabel()}</div>
              </div>

              {playerHomeHasHero ? (
                <button
                  type="button"
                  onClick={() => handleOpenCalendarEntry(primaryTodayCalendarEntry)}
                  style={playerHomeHeroCardStyle}
                >
                  <div style={playerHomeHeroTopRowStyle}>
                    <div style={playerHomeHeroKickerRowStyle}>
                      <span
                        style={playerHomeHeroAccentDotStyle(playerHomeHeroAccent)}
                        aria-hidden="true"
                      />
                      <span style={playerHomeHeroKickerStyle}>
                        I kalendern · {formatCalendarTime(primaryTodayCalendarEntry?.starts_at)}
                      </span>
                    </div>
                    <span
                      style={playerHomeHeroPlayButtonStyle(playerHomeHeroAccent)}
                      aria-hidden="true"
                    >
                      {renderPlayerHomePlayIcon("#ffffff", 16)}
                    </span>
                  </div>

                  <div style={playerHomeHeroTitleStyle}>{playerHomeHeroTitle}</div>
                  <div style={playerHomeHeroSubtitleStyle}>{playerHomeHeroSubtitle}</div>

                  {playerHomeHeroMeta ? (
                    <div style={playerHomeHeroMetaWrapStyle}>
                      <div style={playerHomeHeroMetaTextStyle}>{playerHomeHeroMeta}</div>
                    </div>
                  ) : null}
                </button>
              ) : null}

              <section style={playerHomeCategorySectionStyle}>
                <div style={playerTodayMonoLabelStyle}>
                  {playerHomeHasHero ? "Eller välj annat" : "Träning"}
                </div>

                <div style={playerHomeCategoryListStyle}>
                  {playerHomeCategoryRows.map((row, rowIndex) => {
                    const accentColor = getCategoryAccent(row.key)

                    return (
                      <button
                        key={row.key}
                        type="button"
                        onClick={row.onClick}
                        style={{
                          ...playerHomeCategoryRowStyle,
                          ...(rowIndex < playerHomeCategoryRows.length - 1
                            ? playerHomeCategoryRowDividerStyle
                            : {}),
                        }}
                      >
                        <span
                          style={playerHomeCategoryIconWrapStyle(accentColor)}
                          aria-hidden="true"
                        >
                          {renderPlayerHomePlayIcon("#ffffff", 14)}
                        </span>
                        <span style={playerHomeCategoryContentStyle}>
                          <span style={playerHomeCategoryTitleStyle}>{row.label}</span>
                          <span style={playerHomeCategoryMetaStyle}>{row.meta}</span>
                        </span>
                        <span style={playerHomeCategoryChevronStyle} aria-hidden="true">
                          {renderPlayerHomeChevronIcon(redesignMuted, 18)}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </section>

              <div style={playerTodayWeekCardStyle}>
                <div style={playerTodayWeekHeaderStyle}>
                  <div style={playerTodayMonoLabelStyle}>Denna vecka</div>
                </div>
                <div style={playerTodayWeekGridStyle}>
                  {playerHomeWeekDays.map((dateKey) => {
                    const dayDetails = playerHomeWeekDayDetailsByDate[dateKey] || {
                      isToday: false,
                      source: null,
                      state: "empty",
                      themeKey: null,
                    }
                    const accentColor = dayDetails.themeKey
                      ? getCategoryAccent(dayDetails.themeKey)
                      : playerInk

                    return (
                      <div
                        key={dateKey}
                        style={playerHomeWeekCellStyle(dayDetails.state, accentColor)}
                      >
                        <div style={playerHomeWeekCellContentStyle}>
                          <div style={playerHomeWeekLetterStyle(dayDetails.state, accentColor)}>
                            {getPlayerHomeWeekDayLetter(dateKey)}
                          </div>
                          <div style={playerHomeWeekMarkerRowStyle}>
                            {dayDetails.state === "completed" ? (
                              <span style={playerHomeWeekCheckWrapStyle} aria-hidden="true">
                                {renderPlayerHomeCheckIcon("#ffffff", 14)}
                              </span>
                            ) : dayDetails.state === "today_planned" || dayDetails.state === "planned" ? (
                              <span
                                style={playerHomeWeekDotStyle(accentColor)}
                                aria-hidden="true"
                              />
                            ) : dayDetails.state === "today_empty" ? (
                              <span style={playerHomeWeekDotStyle(playerInk)} aria-hidden="true" />
                            ) : null}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {!isWorkoutActive && playerView === "calendar" && (
            <CalendarPage
              role={profile.role}
              isMobile={isMobile}
              teamName={teamName}
              entries={playerCalendarEntries}
              players={[]}
              workouts={activeWorkouts}
              weekStart={calendarWeekStart}
              isLoading={isLoadingCalendar}
              isSubmittingCreate={isSubmittingCalendar}
              isSavingActivity={isSavingCalendarActivity}
              isCancellingActivity={isCancellingCalendarActivity}
              updatingEntryStatusId={updatingCalendarEventPlayerId}
              onPreviousWeek={() =>
                setCalendarWeekStart((prev) =>
                  getDateInputValueFromTimestamp(new Date(`${prev}T00:00:00`).getTime() - 7 * 24 * 60 * 60 * 1000)
                )
              }
              onNextWeek={() =>
                setCalendarWeekStart((prev) =>
                  getDateInputValueFromTimestamp(new Date(`${prev}T00:00:00`).getTime() + 7 * 24 * 60 * 60 * 1000)
                )
              }
              onGoToToday={() => setCalendarWeekStart(getWeekStartDateInputValue())}
              onCreateActivity={handleCreateCalendarActivity}
              onSaveActivity={handleSaveCalendarActivity}
              onCancelActivity={handleCancelCalendarActivity}
              onOpenEntry={handleOpenCalendarEntry}
              onUpdateEntryStatus={handleUpdateCalendarEventPlayerStatus}
              externalCalendarSource={null}
              externalCalendarFeedUrl=""
              onExternalCalendarFeedUrlChange={() => {}}
              externalCalendarEnabled={false}
              onExternalCalendarEnabledChange={() => {}}
              onSaveExternalCalendarSource={() => {}}
              isSavingExternalCalendarSource={false}
              onSyncExternalCalendar={() => {}}
              isSyncingExternalCalendar={false}
              isSavingGroups={isSavingCalendarGroups}
              onSaveEntryGroups={handleSaveCalendarEntryGroups}
            />
          )}

          {!isWorkoutActive && playerView === "pass" && (
            <>
              <div style={playerPageIntroStyle}>
                <div style={playerTodayMonoLabelStyle}>Passval</div>
                <h2 style={playerPassPageTitleStyle}>{playerPassFamilyTitle}</h2>
                <button
                  type="button"
                  onClick={() => {
                    if (playerPassFamily === "running" && playerRunningView) {
                      goBackFromPlayerRunningView()
                      return
                    }

                    if (playerPassFamily === "strength") {
                      setPlayerPassFamily(null)
                      setPlayerRunningView(null)
                      setSelectedWorkout(null)
                      navigatePlayerSection("overview")
                      return
                    }

                    if (playerPassFamily) {
                      setPlayerPassFamily(null)
                      setPlayerRunningView(null)
                      setSelectedWorkout(null)
                      return
                    }

                    navigatePlayerSection("overview")
                  }}
                  style={playerPassBackButtonStyle}
                >
                  ← Tillbaka
                </button>
              </div>

              {Object.keys(visibleWorkouts).length === 0 ? (
                <p style={mutedTextStyle}>
                  Inga pass är tilldelade ännu. Be en tränare lägga till pass åt dig.
                </p>
              ) : (
                <div style={pickerGridStyle}>
                  {!playerPassFamily && (
                    <div style={playerTrainingMenuGridStyle(isMobile)}>
                      <button type="button" onClick={() => openPlayerPassFamily("strength")} style={playerHomeTrainingCardStyle("strength")}>
                        <div style={playerHomeTrainingTitleStyle}>Styrketräning</div>
                      </button>
                      <button type="button" onClick={() => openPlayerPassFamily("running")} style={playerHomeTrainingCardStyle("running")}>
                        <div style={playerHomeTrainingTitleStyle}>Löpning</div>
                      </button>
                      <button type="button" onClick={() => openPlayerPassFamily("prehab")} style={playerHomeTrainingCardStyle("prehab")}>
                        <div style={playerHomeTrainingTitleStyle}>Skadeförebyggande</div>
                      </button>
                    </div>
                  )}

                  {playerPassFamily === "running" && !playerRunningView && (
                    <section style={playerRunningHubStyle}>
                      <div style={playerRunningHubGridStyle(isMobile)}>
                        <button
                          type="button"
                          onClick={() => openPlayerRunningView("start")}
                          style={playerRunningHubCardStyle("assigned")}
                        >
                          <div style={playerRunningHubCardKickerStyle("assigned")}>Använd appen</div>
                          <div style={playerRunningHubCardTitleStyle("assigned")}>Starta pass</div>
                          <div style={playerRunningHubCardTextStyle("assigned")}>
                            Distans eller intervaller med timer och aktiv passvy
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => openPlayerRunningView("log")}
                          style={playerRunningHubCardStyle("ownInterval")}
                        >
                          <div style={playerRunningHubCardKickerStyle("ownInterval")}>Logga efteråt</div>
                          <div style={playerRunningHubCardTitleStyle("ownInterval")}>Registrera pass i efterhand</div>
                          <div style={playerRunningHubCardTextStyle("ownInterval")}>
                            Distans eller intervaller med flera block och vilor
                          </div>
                        </button>
                      </div>
                    </section>
                  )}

                  {playerPassFamily === "running" && playerRunningView === "start" && (
                    <section style={playerRunningHubStyle}>
                      <div style={playerRunningHubGridStyle(isMobile)}>
                        <button
                          type="button"
                          onClick={() => openPlayerRunningView("startDistance")}
                          style={playerRunningHubCardStyle("distance")}
                        >
                          <div style={playerRunningHubCardKickerStyle("distance")}>Starta nu</div>
                          <div style={playerRunningHubCardTitleStyle("distance")}>Distans</div>
                          <div style={playerRunningHubCardTextStyle("distance")}>
                            Starta ett distanspass och fyll i tid, distans och puls efter passet
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => openPlayerRunningView("startIntervals")}
                          style={playerRunningHubCardStyle("assigned")}
                        >
                          <div style={playerRunningHubCardKickerStyle("assigned")}>Starta nu</div>
                          <div style={playerRunningHubCardTitleStyle("assigned")}>Intervaller</div>
                          <div style={playerRunningHubCardTextStyle("assigned")}>
                            Välj mellan färdiga coachpass och egna blockpass
                          </div>
                        </button>
                      </div>
                    </section>
                  )}

                  {playerPassFamily === "running" && playerRunningView === "startDistance" && (
                    <section style={playerRunningRegistrationPageStyle}>
                      <div style={playerRunningRegistrationHeaderStyle}>
                        <div style={playerTodayMonoLabelStyle}>Starta pass</div>
                      </div>
                      <div style={{ ...mutedTextStyle, marginBottom: "18px" }}>
                        Välj först om du vill dela plats under passet. När du sedan trycker på start går klockan igång direkt.
                      </div>
                      <button
                        type="button"
                        onClick={() => setStartDistanceShareLocation((current) => !current)}
                        style={{
                          ...secondaryButtonStyle,
                          width: "100%",
                          marginBottom: "12px",
                          borderColor: startDistanceShareLocation ? getCategoryAccent("running") : secondaryButtonStyle.borderColor,
                          color: startDistanceShareLocation ? getCategoryAccent("running") : secondaryButtonStyle.color,
                          backgroundColor: startDistanceShareLocation ? getAccentTint(getCategoryAccent("running"), 0.08) : secondaryButtonStyle.backgroundColor,
                        }}
                      >
                        {startDistanceShareLocation
                          ? "Platsdelning på vid start"
                          : "Platsdelning av vid start"}
                      </button>
                      <div style={{ ...mutedTextStyle, marginBottom: "18px" }}>
                        {startDistanceShareLocation
                          ? "Distansen matas live så fort passet startar."
                          : "Du kan springa utan platsdelning och fylla i distansen efteråt."}
                      </div>
                      <button
                        type="button"
                        onClick={startOwnDistanceWorkout}
                        style={{
                          ...buttonStyle,
                          ...playerPassStartButtonStyle("running"),
                          width: "100%",
                        }}
                      >
                        Starta distanspass
                      </button>
                    </section>
                  )}

                  {playerPassFamily === "running" && playerRunningView === "startIntervals" && (
                    <section style={playerRunningHubStyle}>
                      <div style={playerRunningHubGridStyle(isMobile)}>
                        <button
                          type="button"
                          onClick={() => openPlayerRunningView("startAssigned")}
                          style={playerRunningHubCardStyle("assigned")}
                        >
                          <div style={playerRunningHubCardKickerStyle("assigned")}>Coachpass</div>
                          <div style={playerRunningHubCardTitleStyle("assigned")}>Färdiga intervaller</div>
                          <div style={playerRunningHubCardTextStyle("assigned")}>
                            {playerFamilyCounts.running
                              ? `${playerFamilyCounts.running} löppass tillgängliga`
                              : "Inga färdiga intervallpass ännu"}
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => openPlayerRunningView("startOwn")}
                          style={playerRunningHubCardStyle("ownInterval")}
                        >
                          <div style={playerRunningHubCardKickerStyle("ownInterval")}>Sparbara upplägg</div>
                          <div style={playerRunningHubCardTitleStyle("ownInterval")}>Egna pass</div>
                          <div style={playerRunningHubCardTextStyle("ownInterval")}>
                            Skapa, spara, redigera och starta egna intervallblock
                          </div>
                        </button>
                      </div>
                    </section>
                  )}

                  {playerPassFamily === "running" && playerRunningView === "startOwn" && (
                    <section style={playerRunningRegistrationPageStyle}>
                      <div style={playerRunningRegistrationHeaderStyle}>
                        <div style={playerTodayMonoLabelStyle}>Egna pass</div>
                      </div>
                      {playerRunningPresets.length > 0 && (
                        <div style={{ display: "grid", gap: "10px", marginBottom: "18px" }}>
                          {playerRunningPresets.map((preset) => {
                            const isSelectedPreset =
                              String(selectedPlayerRunningPresetId) === String(preset.id)

                            return (
                              <button
                                key={preset.id}
                                type="button"
                                onClick={() => handleSelectPlayerRunningPreset(preset.id)}
                                style={{
                                  ...playerHistoryItemStyle,
                                  textAlign: "left",
                                  border: isSelectedPreset ? `1px solid ${getCategoryAccent("running")}` : playerHistoryItemStyle.border,
                                  backgroundColor: isSelectedPreset ? getAccentTint(getCategoryAccent("running"), 0.08) : playerHistoryItemStyle.backgroundColor,
                                }}
                              >
                                <div style={playerHistoryItemTitleStyle}>{preset.name}</div>
                                <div style={playerHistoryItemMetaStyle}>
                                  {buildRunningProgramSummary({
                                    running_type: "intervals",
                                    interval_program: preset.running_interval_program,
                                  })}
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      )}
                      <div style={{ display: "grid", gap: "16px" }}>
                        <label style={fieldLabelStyle}>
                          Namn på passet
                          <input
                            placeholder="T.ex. 4x1 min + 6x45 sek"
                            value={playerRunningPresetName}
                            onChange={(e) => setPlayerRunningPresetName(e.target.value)}
                            style={playerActivityInputStyle}
                          />
                        </label>
                        <IntervalProgramEditor
                          programDraft={playerRunningPresetDraft}
                          onChange={setPlayerRunningPresetDraft}
                          isMobile={isMobile}
                          accent={getCategoryAccent("running")}
                        />
                        <div style={{ display: "grid", gap: "10px", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))" }}>
                          <button
                            type="button"
                            onClick={handleSavePlayerRunningPreset}
                            disabled={isSavingPlayerRunningPreset}
                            style={{
                              ...playerRunningActionButtonStyle,
                              opacity: isSavingPlayerRunningPreset ? 0.7 : 1,
                            }}
                          >
                            {isSavingPlayerRunningPreset ? "Sparar..." : "Spara pass"}
                          </button>
                          <button
                            type="button"
                            onClick={startOwnIntervalWorkout}
                            style={playerRunningActionButtonStyle}
                          >
                            Starta pass
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              selectedPlayerRunningPresetId
                                ? handleDeletePlayerRunningPreset(selectedPlayerRunningPresetId)
                                : resetPlayerRunningPresetEditor()
                            }
                            disabled={Boolean(selectedPlayerRunningPresetId) && deletingPlayerRunningPresetId === selectedPlayerRunningPresetId}
                            style={playerRunningActionButtonStyle}
                          >
                            {selectedPlayerRunningPresetId
                              ? deletingPlayerRunningPresetId === selectedPlayerRunningPresetId
                                ? "Tar bort..."
                                : "Ta bort"
                              : "Nytt pass"}
                          </button>
                        </div>
                      </div>
                    </section>
                  )}

                  {playerPassFamily === "running" && playerRunningView === "log" && (
                    <section style={playerRunningHubStyle}>
                      <div style={playerRunningHubGridStyle(isMobile)}>
                        <button
                          type="button"
                          onClick={() => openPlayerRunningView("logDistance")}
                          style={playerRunningHubCardStyle("distance")}
                        >
                          <div style={playerRunningHubCardKickerStyle("distance")}>Efterhand</div>
                          <div style={playerRunningHubCardTitleStyle("distance")}>Distans</div>
                          <div style={playerRunningHubCardTextStyle("distance")}>
                            Datum, kilometer, tid, puls och kommentar
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => openPlayerRunningView("logIntervals")}
                          style={playerRunningHubCardStyle("ownInterval")}
                        >
                          <div style={playerRunningHubCardKickerStyle("ownInterval")}>Efterhand</div>
                          <div style={playerRunningHubCardTitleStyle("ownInterval")}>Intervaller</div>
                          <div style={playerRunningHubCardTextStyle("ownInterval")}>
                            Flera block, intervallvila och paus mellan block
                          </div>
                        </button>
                      </div>
                    </section>
                  )}

                  {playerPassFamily === "running" && playerRunningView === "logDistance" && (
                    <section style={playerRunningRegistrationPageStyle}>
                      <div style={playerRunningRegistrationHeaderStyle}>
                        <div style={playerTodayMonoLabelStyle}>Efterhandslogg</div>
                      </div>
                      <div style={playerRunningRegistrationGridStyle(isMobile)}>
                        <label style={fieldLabelStyle}>
                          Datum
                          <input
                            type="date"
                            value={runningDraft.log_date}
                            onChange={(e) => handleRunningDraftChange("log_date", e.target.value)}
                            style={playerActivityInputStyle}
                          />
                        </label>
                        <label style={fieldLabelStyle}>
                          Kilometer
                          <input
                            placeholder="t.ex. 5,2"
                            value={runningDraft.running_distance}
                            onChange={(e) => handleRunningDraftChange("running_distance", e.target.value)}
                            style={playerActivityInputStyle}
                          />
                        </label>
                        <label style={fieldLabelStyle}>
                          Tid
                          <input
                            placeholder="t.ex. 24:30"
                            value={runningDraft.running_time}
                            onChange={(e) => handleRunningDraftChange("running_time", e.target.value)}
                            style={playerActivityInputStyle}
                          />
                        </label>
                        <label style={fieldLabelStyle}>
                          Snittpuls
                          <input
                            placeholder="valfritt"
                            value={runningDraft.average_pulse}
                            onChange={(e) => handleRunningDraftChange("average_pulse", e.target.value)}
                            style={playerActivityInputStyle}
                          />
                        </label>
                        <label style={{ ...fieldLabelStyle, gridColumn: isMobile ? "auto" : "span 2" }}>
                          Kommentar
                          <textarea
                            rows={3}
                            placeholder="Hur kändes passet?"
                            value={runningDraft.comment}
                            onChange={(e) => handleRunningDraftChange("comment", e.target.value)}
                            style={playerActivityTextareaStyle}
                          />
                        </label>
                      </div>
                      <button
                        type="button"
                        onClick={handleSaveRunningSession}
                        disabled={isSavingRunningSession}
                        style={{
                          ...buttonStyle,
                          ...playerPassStartButtonStyle("running"),
                          width: "100%",
                          opacity: isSavingRunningSession ? 0.7 : 1,
                        }}
                      >
                        {isSavingRunningSession ? "Sparar..." : "Spara distans"}
                      </button>
                    </section>
                  )}

                  {playerPassFamily === "running" && playerRunningView === "logIntervals" && (
                    <section style={playerRunningRegistrationPageStyle}>
                      <div style={playerRunningRegistrationHeaderStyle}>
                        <div style={playerTodayMonoLabelStyle}>Efterhandslogg</div>
                      </div>
                      <div style={{ display: "grid", gap: "16px" }}>
                        <label style={fieldLabelStyle}>
                          Datum
                          <input
                            type="date"
                            value={runningDraft.log_date}
                            onChange={(e) => handleRunningDraftChange("log_date", e.target.value)}
                            style={playerActivityInputStyle}
                          />
                        </label>
                        <IntervalProgramEditor
                          programDraft={runningDraft.interval_program}
                          onChange={(value) => handleRunningDraftChange("interval_program", value)}
                          isMobile={isMobile}
                          accent={getCategoryAccent("running")}
                        />
                        <div style={playerRunningRegistrationGridStyle(isMobile)}>
                          <label style={fieldLabelStyle}>
                            Total tid
                            <input
                              placeholder="t.ex. 32:00"
                              value={runningDraft.running_time}
                              onChange={(e) => handleRunningDraftChange("running_time", e.target.value)}
                              style={playerActivityInputStyle}
                            />
                          </label>
                          <label style={{ ...fieldLabelStyle, gridColumn: isMobile ? "auto" : "span 2" }}>
                            Kommentar
                            <textarea
                              rows={3}
                              placeholder="T.ex. känsla, fart eller underlag"
                              value={runningDraft.comment}
                              onChange={(e) => handleRunningDraftChange("comment", e.target.value)}
                              style={playerActivityTextareaStyle}
                            />
                          </label>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleSaveRunningSession}
                        disabled={isSavingRunningSession}
                        style={{
                          ...buttonStyle,
                          ...playerPassStartButtonStyle("running"),
                          width: "100%",
                          opacity: isSavingRunningSession ? 0.7 : 1,
                        }}
                      >
                        {isSavingRunningSession ? "Sparar..." : "Spara intervallpass"}
                      </button>
                    </section>
                  )}

                  {shouldShowPlayerPassList && selectedPlayerPassEntries.length === 0 && (
                    <div style={playerHistoryEmptyStyle}>Inga pass finns i den här kategorin ännu.</div>
                  )}

                  {shouldShowPlayerPassList && recommendedPlayerPassEntries.length > 0 && (
                    <section style={playerRecommendedPassSectionStyle}>
                      {playerPassFamily === "running" ? (
                        <div style={playerPassSectionHeaderStyle}>
                          <div>
                            <div style={playerTodayMonoLabelStyle}>Färdiga pass</div>
                          </div>
                          <div style={playerPassSectionCountStyle}>
                            {recommendedPlayerPassEntries.length} val
                          </div>
                        </div>
                      ) : null}

                      <div style={playerFeaturedPassGridStyle(isMobile)}>
                        {recommendedPlayerPassEntries.map(renderRecommendedPassCard)}
                      </div>
                    </section>
                  )}

                  {shouldShowPlayerPassList && shelfPlayerPassEntries.length > 0 && (
                    <section style={playerShelfPassSectionStyle}>
                      <div style={playerPassSectionHeaderStyle}>
                        <div>
                          <div style={playerTodayMonoLabelStyle}>
                            {playerPassFamily === "running" ? "Coachpass" : "Övriga pass"}
                          </div>
                        </div>
                        <div style={playerPassSectionCountStyle}>
                          {shelfPlayerPassEntries.length} pass
                        </div>
                      </div>

                      <div style={playerShelfPassListStyle}>
                        {shelfPlayerPassEntries.map(renderShelfPassRow)}
                      </div>
                    </section>
                  )}
                </div>
              )}
            </>
          )}

          {!isWorkoutActive && playerView === "history" && (
            <>
              <div style={playerPageIntroStyle}>
                <div style={playerTodayMonoLabelStyle}>Historik</div>
                <h2 style={playerPassPageTitleStyle}>Historik</h2>
                <button
                  type="button"
                  onClick={() => navigatePlayerSection("overview")}
                  style={playerPassBackButtonStyle}
                >
                  ← Tillbaka
                </button>
              </div>

              <div style={playerOverviewPanelStyle}>
                <div style={playerAccordionContentStyle}>
                  <div style={playerHistoryHighlightsGridStyle(isMobile)}>
                    <div style={playerHistoryHighlightCardStyle}>
                      <div style={playerHistoryHighlightLabelStyle}>Senaste pass</div>
                      <div style={playerHistoryHighlightValueStyle}>
                        {latestAssignedSession ? formatDaysSince(latestAssignedSession.created_at) : "Inte loggat än"}
                      </div>
                    </div>
                    <div style={playerHistoryHighlightCardStyle}>
                      <div style={playerHistoryHighlightLabelStyle}>Senaste aktivitet</div>
                      <div style={playerHistoryHighlightValueStyle}>
                        {latestOwnRunningSession ? formatDaysSince(latestOwnRunningSession.created_at) : "Inte loggat än"}
                      </div>
                    </div>
                  </div>

                  {isLoadingCompletedWorkoutSessions ? (
                    <div style={playerHistoryEmptyStyle}>Laddar historik...</div>
                  ) : completedWorkoutSessions.length === 0 ? (
                    <div style={playerHistoryEmptyStyle}>Ingen träningshistorik ännu.</div>
                  ) : (
                    <div style={{ display: "grid", gap: "16px" }}>
                      <div>
                        <div style={playerHistorySectionLabelStyle}>Tilldelade pass och coachpass</div>
                        <div style={{ display: "grid", gap: "10px" }}>
                          {assignedCompletedSessions.slice(0, 4).map((session) => (
                            <div key={session.session_id} style={playerHistoryItemStyle}>
                              <div style={playerHistoryItemHeaderStyle(isMobile)}>
                                <div>
                                  <div style={playerHistoryItemTitleStyle}>{session.session_label}</div>
                                  <div style={playerHistoryItemMetaStyle}>
                                    {session.workout_kind === "running"
                                      ? buildRunningSummary(session)
                                      : session.summary || `${session.exercise_count} övningar`}
                                  </div>
                                </div>
                                <div style={playerHistoryDateStyle}>
                                  {new Date(session.created_at).toLocaleDateString("sv-SE")}
                                </div>
                              </div>

                              <div style={playerHistoryActionRowStyle(isMobile)}>
                                <input
                                  type="date"
                                  value={workoutDateDrafts[session.session_id] || ""}
                                  onChange={(event) =>
                                    handleWorkoutDateDraftChange(session.session_id, event.target.value)
                                  }
                                  style={{ ...playerActivityInputStyle, width: "100%" }}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveWorkoutDate(session)}
                                  disabled={savingWorkoutDateSessionId === session.session_id}
                                  style={{
                                    ...playerHistoryActionButtonStyle,
                                    width: isMobile ? "100%" : "auto",
                                    opacity: savingWorkoutDateSessionId === session.session_id ? 0.7 : 1,
                                    cursor:
                                      savingWorkoutDateSessionId === session.session_id ? "default" : "pointer",
                                  }}
                                >
                                  {savingWorkoutDateSessionId === session.session_id ? "Sparar..." : "Spara datum"}
                                </button>
                              </div>
                            </div>
                          ))}
                          {assignedCompletedSessions.length === 0 && (
                            <div style={playerHistoryEmptyStyle}>Inga tilldelade pass loggade ännu.</div>
                          )}
                        </div>
                      </div>

                      <div>
                        <div style={playerHistorySectionLabelStyle}>Egna aktiviteter</div>
                        <div style={{ display: "grid", gap: "10px" }}>
                          {ownRunningSessions.slice(0, 4).map((session) => (
                            <div key={session.session_id} style={playerHistoryItemStyle}>
                              <div style={playerHistoryItemHeaderStyle(isMobile)}>
                                <div>
                                  <div style={playerHistoryItemTitleStyle}>{session.session_label}</div>
                                  <div style={playerHistoryItemMetaStyle}>{buildRunningSummary(session)}</div>
                                </div>
                                <div style={playerHistoryDateStyle}>
                                  {new Date(session.created_at).toLocaleDateString("sv-SE")}
                                </div>
                              </div>

                              <div style={playerHistoryActionRowStyle(isMobile)}>
                                <input
                                  type="date"
                                  value={workoutDateDrafts[session.session_id] || ""}
                                  onChange={(event) =>
                                    handleWorkoutDateDraftChange(session.session_id, event.target.value)
                                  }
                                  style={{ ...playerActivityInputStyle, width: "100%" }}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveWorkoutDate(session)}
                                  disabled={savingWorkoutDateSessionId === session.session_id}
                                  style={{
                                    ...playerHistoryActionButtonStyle,
                                    width: isMobile ? "100%" : "auto",
                                    opacity: savingWorkoutDateSessionId === session.session_id ? 0.7 : 1,
                                    cursor:
                                      savingWorkoutDateSessionId === session.session_id ? "default" : "pointer",
                                  }}
                                >
                                  {savingWorkoutDateSessionId === session.session_id ? "Sparar..." : "Spara datum"}
                                </button>
                              </div>
                            </div>
                          ))}
                          {ownRunningSessions.length === 0 && (
                            <div style={playerHistoryEmptyStyle}>Inga egna aktiviteter loggade ännu.</div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {!isWorkoutActive && playerView === "activity" && (
            <>
              <div style={playerPageIntroStyle}>
                <div style={playerTodayMonoLabelStyle}>Egen aktivitet</div>
                <h2 style={playerPassPageTitleStyle}>
                  {playerOverviewPanel === "ownInterval"
                    ? "Skapa eget intervallpass"
                    : playerOverviewPanel === "distance"
                    ? "Logga distans"
                    : "Logga aktivitet"}
                </h2>
                <button
                  type="button"
                  onClick={() => navigatePlayerSection("overview")}
                  style={playerPassBackButtonStyle}
                >
                  ← Tillbaka
                </button>
              </div>

              <div style={playerActivityPanelStyle}>
                <div style={playerActivityPanelIntroStyle}>
                  <div style={playerActivityPanelKickerStyle}>
                    {playerOverviewPanel === "ownInterval"
                      ? "Intervaller"
                      : playerOverviewPanel === "distance"
                      ? "Distans"
                      : "Valfri aktivitet"}
                  </div>
                  <div style={playerActivityPanelTitleStyle}>
                    {playerOverviewPanel === "ownInterval"
                      ? "Spara ett eget intervallpass."
                      : playerOverviewPanel === "distance"
                      ? "Logga fri löpning."
                      : "Registrera träning utanför lagpassen."}
                  </div>
                </div>

                <div style={playerAccordionContentStyle}>
                  {pendingFreeActivityCalendarEvent?.id ? (
                    <div style={playerActivityNoticeStyle}>
                      Loggar från kalendern: {pendingFreeActivityCalendarEvent.title}
                    </div>
                  ) : null}
                  <div style={playerActivityFormGridStyle(isMobile)}>
                    <div style={playerActivityFieldStyle}>
                      <div style={playerActivityFieldLabelStyle}>Datum</div>
                      <input
                        type="date"
                        value={runningDraft.log_date}
                        onChange={(event) => handleRunningDraftChange("log_date", event.target.value)}
                        style={playerActivityInputStyle}
                      />
                    </div>
                    {playerOverviewPanel !== "ownInterval" && playerOverviewPanel !== "distance" ? (
                      <div style={playerActivityFieldStyle}>
                        <div style={playerActivityFieldLabelStyle}>Aktivitet</div>
                        <select
                          value={runningDraft.free_activity_type}
                          onChange={(event) => handleRunningDraftChange("free_activity_type", event.target.value)}
                          style={playerActivityInputStyle}
                        >
                          <option value="">Välj aktivitet</option>
                          {FREE_ACTIVITY_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div style={playerActivityFieldStyle}>
                        <div style={playerActivityFieldLabelStyle}>Aktivitet</div>
                        <div style={playerActivityFixedTypeStyle}>
                          {playerOverviewPanel === "ownInterval" ? "Löpning · Intervaller" : "Löpning · Distans"}
                        </div>
                      </div>
                    )}
                    {!runningDraft.free_activity_type ? (
                      <div style={playerActivityHintStyle(isMobile)}>
                        Börja med att välja aktivitet. Då visas rätt fält direkt under.
                      </div>
                    ) : runningDraft.free_activity_type === "running" &&
                      playerOverviewPanel !== "ownInterval" &&
                      playerOverviewPanel !== "distance" ? (
                      <div style={playerActivityFieldStyle}>
                        <div style={playerActivityFieldLabelStyle}>Upplägg</div>
                        <select
                          value={runningDraft.running_type}
                          onChange={(event) => handleRunningDraftChange("running_type", event.target.value)}
                          style={playerActivityInputStyle}
                        >
                          <option value="distance">Distans</option>
                          <option value="intervals">Intervaller</option>
                        </select>
                      </div>
                    ) : (
                      <div style={playerActivityFieldStyle}>
                        <div style={playerActivityFieldLabelStyle}>Tid</div>
                        <input
                          type="text"
                          placeholder="t.ex. 75 min"
                          value={runningDraft.running_time}
                          onChange={(event) => handleRunningDraftChange("running_time", event.target.value)}
                          style={playerActivityInputStyle}
                        />
                      </div>
                    )}

                    {runningDraft.free_activity_type === "running" && runningDraft.running_type === "intervals" ? (
                      <>
                        <div style={playerActivityFieldStyle}>
                          <div style={playerActivityFieldLabelStyle}>Tid per intervall</div>
                          <input
                            type="text"
                            placeholder="t.ex. 45 sek"
                            value={runningDraft.interval_time}
                            onChange={(event) => handleRunningDraftChange("interval_time", event.target.value)}
                            style={playerActivityInputStyle}
                          />
                        </div>
                        <div style={playerActivityFieldStyle}>
                          <div style={playerActivityFieldLabelStyle}>Antal intervaller</div>
                          <input
                            type="number"
                            placeholder="Antal"
                            value={runningDraft.intervals_count}
                            onChange={(event) => handleRunningDraftChange("intervals_count", event.target.value)}
                            style={playerActivityInputStyle}
                          />
                        </div>
                      </>
                    ) : runningDraft.free_activity_type === "running" ? (
                      <>
                        <div style={playerActivityFieldStyle}>
                          <div style={playerActivityFieldLabelStyle}>Distans</div>
                          <input
                            type="text"
                            placeholder="t.ex. 6,2 km"
                            value={runningDraft.running_distance}
                            onChange={(event) => handleRunningDraftChange("running_distance", event.target.value)}
                            style={playerActivityInputStyle}
                          />
                        </div>
                        <div style={playerActivityFieldStyle}>
                          <div style={playerActivityFieldLabelStyle}>Tid</div>
                          <input
                            type="text"
                            placeholder="t.ex. 24:30"
                            value={runningDraft.running_time}
                            onChange={(event) => handleRunningDraftChange("running_time", event.target.value)}
                            style={playerActivityInputStyle}
                          />
                        </div>
                        <div style={playerActivityFieldFullStyle}>
                          <div style={playerActivityFieldLabelStyle}>Snittpuls</div>
                          <input
                            type="number"
                            placeholder="Puls"
                            value={runningDraft.average_pulse}
                            onChange={(event) => handleRunningDraftChange("average_pulse", event.target.value)}
                            style={playerActivityInputStyle}
                          />
                        </div>
                      </>
                    ) : null}
                    {runningDraft.free_activity_type === "custom" && (
                      <div style={playerActivityFieldFullStyle}>
                        <div style={playerActivityFieldLabelStyle}>Rubrik</div>
                        <input
                          type="text"
                          placeholder="Vad gjorde du?"
                          value={runningDraft.custom_activity_title}
                          onChange={(event) => handleRunningDraftChange("custom_activity_title", event.target.value)}
                          style={playerActivityInputStyle}
                        />
                      </div>
                    )}
                    {runningDraft.free_activity_type && runningDraft.free_activity_type !== "running" && (
                      <div style={playerActivityHintStyle(isMobile)}>
                        Börja enkelt: välj aktivitet och skriv ungefär hur länge du tränade.
                      </div>
                    )}
                    {runningDraft.free_activity_type ? (
                      <div style={playerActivityFieldFullStyle}>
                        <div style={playerActivityFieldLabelStyle}>Kommentar</div>
                        <textarea
                          rows={4}
                          placeholder="Hur kändes passet eller vad gjorde du?"
                          value={runningDraft.comment}
                          onChange={(event) => handleRunningDraftChange("comment", event.target.value)}
                          style={playerActivityTextareaStyle}
                        />
                      </div>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveRunningSession}
                    disabled={isSavingRunningSession}
                    style={{
                      ...playerActivitySubmitButtonStyle,
                      width: isMobile ? "100%" : "auto",
                      opacity: isSavingRunningSession ? 0.7 : 1,
                      cursor: isSavingRunningSession ? "default" : "pointer",
                    }}
                  >
                    {isSavingRunningSession
                      ? "Sparar..."
                      : playerOverviewPanel === "ownInterval"
                      ? "Spara intervallpass"
                      : playerOverviewPanel === "distance"
                      ? "Spara distans"
                      : "Spara aktivitet"}
                  </button>
                </div>
              </div>
            </>
          )}

          {!isWorkoutActive && playerView === "stats" && (
            <>
              <div style={playerPageIntroStyle}>
                <div style={playerTodayMonoLabelStyle}>Statistik</div>
                <h2 style={playerPassPageTitleStyle}>Din statistik</h2>
              </div>

              {isLoadingPlayerExerciseProgress ? (
                <div style={playerStatsEmptyStyle}>Laddar statistik...</div>
              ) : selectablePlayerStatsExercises.length === 0 ? (
                <div style={playerStatsEmptyStyle}>
                  Ingen relevant statistik ännu. Bara viktövningar och maxrepsövningar visas här.
                </div>
              ) : (
                <div style={playerStatsLayoutStyle}>
                  <div style={playerStatsSelectorWrapStyle}>
                    <div style={playerStatsSelectorStyle}>
                      <div style={playerStatsSelectorHeaderStyle}>
                        <div>
                          <div style={playerStatsSelectorLabelStyle}>Välj övningar</div>
                          <div style={playerStatsSelectorTextStyle}>
                            {selectedPlayerStatsExerciseIds.length === 0
                              ? "Ingen övning vald"
                              : `${selectedPlayerStatsExerciseIds.length} valda`}
                          </div>
                        </div>
                        <span style={playerStatsSelectorSummaryHintStyle}>Flera val</span>
                      </div>

                      <div style={playerStatsSelectorControlsStyle}>
                        <select
                          value={playerStatsPickerValue}
                          onChange={(event) => {
                            const nextExerciseId = event.target.value
                            setPlayerStatsPickerValue(nextExerciseId)
                            handleAddPlayerStatsExercise(nextExerciseId)
                          }}
                          style={{ ...playerStatsSelectStyle, width: "100%" }}
                        >
                          <option value="">Välj övning</option>
                          {unselectedPlayerStatsExercises.map((entry) => (
                            <option key={entry.exercise_id} value={entry.exercise_id}>
                              {entry.exercise_display_name}
                            </option>
                          ))}
                        </select>
                        <div style={playerStatsSelectorHelperStyle}>
                          {unselectedPlayerStatsExercises.length === 0
                            ? "Alla tillgängliga övningar är redan valda."
                            : "Välj en övning i listan för att lägga till den direkt."}
                        </div>
                      </div>
                    </div>

                    {selectedPlayerStatsExercises.length > 0 ? (
                      <div style={playerStatsSelectedChipsStyle}>
                        {selectedPlayerStatsExercises.map((entry) => (
                          <button
                            key={`chip-${entry.exercise_id}`}
                            type="button"
                            onClick={() => handleTogglePlayerStatsExercise(entry.exercise_id)}
                            style={playerStatsSelectedChipStyle}
                          >
                            {entry.exercise_display_name} ×
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  {selectedPlayerStatsExercises.length === 0 ? (
                    <div style={playerStatsEmptyStyle}>Välj en eller flera övningar för att visa statistik.</div>
                  ) : (
                    <div style={playerStatsCardsStackStyle}>
                      {selectedPlayerStatsExercises.map((exerciseProgress) => {
                        const recentEntries =
                          exerciseProgress.has_weight_data
                            ? exerciseProgress.weight_entries.slice().reverse()
                            : exerciseProgress.rep_entries.slice().reverse()

                        return (
                          <div key={exerciseProgress.exercise_id} style={playerStatsCardStyle}>
                            <div style={playerStatsHeaderStyle(isMobile)}>
                              <div>
                                <div style={playerStatsTitleStyle}>{exerciseProgress.exercise_display_name}</div>
                                <div style={playerStatsTextStyle}>
                                  {exerciseProgress.has_weight_data
                                    ? "Viktutveckling över tid"
                                    : "Maxreps och senaste loggningar"}
                                </div>
                              </div>
                              <div style={playerStatsSummaryPillStyle}>
                                {exerciseProgress.has_weight_data
                                  ? `${exerciseProgress.best_weight_entry?.top_weight ?? "-"} kg bäst`
                                  : `${exerciseProgress.best_rep_entry?.top_reps ?? "-"} reps bäst`}
                              </div>
                            </div>

                            {exerciseProgress.has_weight_data ? (
                              <div style={playerChartWrapStyle}>
                                <PlayerProgressChart entries={exerciseProgress.weight_entries} />
                              </div>
                            ) : (
                              <div style={playerStatsEmptyInlineStyle}>
                                Den här övningen följs som maxreps, så här visas repshistorik i stället för viktgraf.
                              </div>
                            )}

                            <div style={playerStatsRecentListStyle}>
                              {recentEntries.slice(0, 6).map((entry) => (
                                <div
                                  key={`${exerciseProgress.exercise_id}-${entry.created_at}`}
                                  style={playerStatsRecentItemStyle}
                                >
                                  <div>
                                    <div style={playerStatsRecentDateStyle}>{formatDate(entry.created_at)}</div>
                                    <div style={playerStatsRecentMetaStyle}>
                                      {formatLoggedPassName(entry.pass_name, {
                                        workoutKind: entry.workout_kind,
                                        runningOrigin: entry.running_origin,
                                      }) || "Pass"}
                                      {entry.top_reps != null ? ` • ${entry.top_reps} reps` : ""}
                                    </div>
                                  </div>
                                  <div style={playerStatsRecentValueStyle}>
                                    {exerciseProgress.has_weight_data
                                      ? `${entry.top_weight} kg`
                                      : `${entry.top_reps ?? "-"} reps`}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {showPlayerBottomNav && (
        <div style={usePlayerRedesignShell ? playerBottomNavWrapStyle : coachBottomNavWrapStyle}>
          <div
            style={{
              ...(usePlayerRedesignShell ? playerBottomNavStyle : coachBottomNavStyle),
              gridTemplateColumns: `repeat(${playerBottomTabs.length}, minmax(0, 1fr))`,
            }}
          >
            {playerBottomTabs.map((tab) => {
              const isActive =
                tab.key === "account" ? globalView === "account" : globalView === "app" && playerView === tab.key

              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => navigatePlayerSection(tab.key)}
                  style={{
                    ...coachBottomNavButtonStyle,
                    color: usePlayerRedesignShell
                      ? isActive
                        ? playerInk
                        : playerInkSoft
                      : isActive
                      ? "#b61e24"
                      : "#6b7280",
                  }}
                >
                  <span
                    style={{
                      ...(usePlayerRedesignShell ? playerBottomNavIconWrapStyle : coachBottomNavIconWrapStyle),
                      backgroundColor: usePlayerRedesignShell
                        ? isActive
                          ? "rgba(255, 255, 255, 0.92)"
                          : "transparent"
                        : isActive
                        ? "#fff1f1"
                        : "transparent",
                      border: usePlayerRedesignShell
                        ? isActive
                          ? `1px solid ${redesignLine}`
                          : "1px solid transparent"
                        : undefined,
                      boxShadow: usePlayerRedesignShell
                        ? isActive
                          ? "0 8px 18px rgba(26, 24, 20, 0.08)"
                          : "none"
                        : undefined,
                    }}
                  >
                    {renderCoachBottomNavIcon(tab.icon, isActive)}
                  </span>
                  <span style={usePlayerRedesignShell ? playerBottomNavLabelStyle : coachBottomNavLabelStyle}>
                    {tab.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {status && !(isWorkoutActive && /startat$/i.test(String(status))) ? <p style={statusStyle}>{status}</p> : null}

      {selectedWorkout && isWorkoutActive && (
        <div style={activeWorkoutPageWrapStyle}>
          {isSharedGymWorkout(activeWorkoutData) && activeCalendarGroup ? (
            <div style={activeWorkoutGroupCardStyle}>
              <button
                type="button"
                onClick={() => setIsActiveCalendarGroupExpanded((prev) => !prev)}
                style={activeWorkoutGroupButtonStyle}
              >
                <div>
                  <div style={activeWorkoutGroupLabelStyle}>Din grupp</div>
                  <div style={activeWorkoutGroupNameStyle}>{activeCalendarGroup.name}</div>
                </div>
                <div style={activeWorkoutGroupToggleStyle}>{isActiveCalendarGroupExpanded ? "−" : "+"}</div>
              </button>

              {isActiveCalendarGroupExpanded ? (
                <div style={activeWorkoutGroupMembersStyle}>
                  {activeCalendarGroup.members.map((member) => (
                    <div key={member.calendar_event_player_id} style={activeWorkoutGroupMemberRowStyle}>
                      <span>{member.player_name}</span>
                      {member.calendar_event_player_id === activeCalendarEventPlayerId ? (
                        <span style={activeWorkoutGroupMemberYouStyle}>Du</span>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          <div
            ref={exerciseCarouselRef}
            style={
              isMobile
                ? exerciseCarouselViewportStyle
                : undefined
            }
            onScroll={(event) => {
              if (!isMobile) return

              const viewport = event.currentTarget
              const nextIndex = Math.round(viewport.scrollLeft / viewport.clientWidth)

              if (Number.isFinite(nextIndex)) {
                setActiveExerciseIndex(nextIndex)
              }
            }}
          >
            <div style={isMobile ? exerciseCarouselTrackStyle : undefined}>
              {hasActiveWorkoutWarmup ? (
                <div
                  data-exercise-card="true"
                  style={
                    isMobile
                      ? {
                          ...cardStyle,
                          ...activeWorkoutExerciseCardStyle,
                          ...exerciseSwipeCardStyle,
                        }
                      : { ...cardStyle, ...activeWorkoutExerciseCardStyle }
                  }
                >
                  <div style={activeWarmupScreenStyle}>
                    <div style={activeWarmupGridStyle(isMobile)}>
                      {activeWorkoutWarmup.cardio ? (
                        <div style={activeWarmupBlockStyle}>
                          <div style={activeWarmupBlockLabelStyle}>Pulshöjande uppvärmning</div>
                          <div style={activeWarmupBlockTextStyle}>{activeWorkoutWarmup.cardio}</div>
                        </div>
                      ) : null}

                      {activeWorkoutWarmup.technique.length ? (
                        <div style={activeWarmupBlockStyle}>
                          <div style={activeWarmupBlockLabelStyle}>Teknikuppvärmning</div>
                          <div style={activeWarmupStepsStyle}>
                            {activeWorkoutWarmup.technique.map((item, index) => (
                              <div key={index} style={activeWarmupStepStyle}>
                                <span style={activeWarmupStepIndexStyle}>{index + 1}</span>
                                <span style={activeWarmupStepTextStyle}>{item}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}

          {isRunningWorkoutActive ? (
            <div
              data-exercise-card="true"
              style={
                isMobile
                  ? {
                      ...activeRunningWorkoutCardStyle,
                      ...activeWorkoutExerciseCardStyle,
                      ...exerciseSwipeCardStyle,
                    }
                  : { ...activeRunningWorkoutCardStyle, ...activeWorkoutExerciseCardStyle }
              }
            >
              <ActiveRunningWorkout
                workout={activeWorkoutData}
                summaryText={buildRunningSummary({
                  running_type: activeWorkoutData?.runningType,
                  interval_program: activeWorkoutData?.runningConfig?.intervalProgram,
                  interval_time: activeWorkoutData?.runningConfig?.interval_time,
                  intervals_count: activeWorkoutData?.runningConfig?.intervals_count,
                  running_distance: activeWorkoutData?.runningConfig?.running_distance,
                  running_time: activeWorkoutData?.runningConfig?.running_time,
                })}
                input={activeRunningInput}
                onChangeField={handleActiveRunningInputChange}
                onTotalTimeChange={(value) => handleActiveRunningInputChange("running_time", value)}
                onStatusChange={setStatus}
                onFinish={finishWorkout}
                isMobile={isMobile}
              />
            </div>
          ) : activeWorkoutExercises.map((exercise, i) => {
            const exerciseOptions = getExerciseExecutionOptions(exercise)
            const selectedExercise = getSelectedExerciseExecution(
              exercise,
              selectedExerciseOptionKeys[i]
            )
            const protocolConfig = getExerciseProtocolConfig(selectedExercise || exercise)
            const isProtocol = Boolean(protocolConfig)
            const infoKey = `${exercise.name}-${selectedExercise?.name || exercise.name}`
            const isInfoExpanded = !!expandedInfo[infoKey]
            const latestExerciseSets = selectedExercise ? latestWorkout[selectedExercise.name] || [] : []
            const latestExerciseTopSet = latestExerciseSets[latestExerciseSets.length - 1]
            const latestExerciseDate = latestExerciseSets[0]?.created_at
            const currentTarget = mergeExerciseTargetWithPassDefaults(
              exercise,
              currentWorkoutTargets[exercise.name]
            )
            const resolvedCurrentTargetWeight = getResolvedExerciseTargetWeight({
              exerciseId: selectedExercise?.exerciseId || exercise.exerciseId,
              repTarget: currentTarget,
              repTargetsByExercise: playerExerciseRepTargets,
            })
            const currentRepRangeBucket = getRepRangeBucketForTarget(currentTarget)
            const activeLiftTargetSummary =
              profile?.individual_goals_enabled === false && latestExerciseTopSet
                ? formatLatestSetValue(selectedExercise?.type || exercise.type, latestExerciseTopSet)
                : currentTarget?.target_reps_mode === "max"
                ? "Max antal"
                : currentTarget
                ? [
                    formatRepTargetValue(currentTarget),
                    selectedExercise?.type === "weight_reps" && resolvedCurrentTargetWeight != null
                      ? `${resolvedCurrentTargetWeight} kg`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")
                : "Följ känslan"
            const activeLiftLatestSummary = latestExerciseTopSet
              ? formatLatestSetValue(selectedExercise?.type || exercise.type, latestExerciseTopSet)
              : "Ingen historik ännu"
            const exerciseTextSections = getExerciseTextSections({
              description: selectedExercise?.description,
              guide: exercise.guide,
            })
            const hasExerciseDetails = !!(
              exerciseTextSections.primaryText ||
              exerciseTextSections.secondaryText ||
              selectedExercise?.mediaUrl
            )
            const alternativesInfoKey = `${infoKey}:alternatives`
            const isAlternativesExpanded = !!expandedInfo[alternativesInfoKey]
            const exerciseType = selectedExercise?.type || exercise.type
            const executionSide = selectedExercise?.executionSide || "standard"
            const exerciseSets = inputs[i] || []
            const isBilateralTimed = isBilateralTimedExercise(selectedExercise || exercise)
            const isStandardTimed = exerciseType === "seconds_only" && !isBilateralTimed
            const nextPendingSetIndex = getNextPendingSetIndex(exerciseType, exerciseSets, executionSide)
            const activeSetIndex =
              nextPendingSetIndex >= 0 ? nextPendingSetIndex : Math.max(exerciseSets.length - 1, 0)
            const representativeTargetValue = getRepresentativeTargetValue(currentTarget)
            const suggestedTimedSeconds =
              parseStepperNumber(latestExerciseTopSet?.seconds) ?? representativeTargetValue
            const activeTimedSet = exerciseSets[activeSetIndex] || {}
            const getStepperInputValue = (inputKey, currentValue, fallbackValue) => {
              if (focusedStepperInputKey === inputKey) return currentValue || ""
              if (currentValue) return currentValue
              return fallbackValue != null ? formatStepperValue(fallbackValue) : ""
            }
            const getStepperInputKey = (setIndex, field) => `${i}:${setIndex}:${field}`
            const formatSetReceiptValue = (set) => {
              if (exerciseType === "weight_reps") {
                return `${set.weight || "-"} kg × ${set.reps || "-"}`
              }

              if (exerciseType === "reps_only") {
                return `${set.reps || "-"} reps`
              }

              if (isBilateralTimed) {
                return `VÄ ${set.left_seconds || "-"} s · HÖ ${set.right_seconds || "-"} s`
              }

              return `${set.seconds || "-"} sek`
            }
            const standardTimedTimerActive =
              isTimedSetTimerRunning(i, activeSetIndex) &&
              activeTimedSetTimer?.mode !== "bilateral"
            const bilateralTimedTimerActive =
              isTimedSetTimerRunning(i, activeSetIndex) &&
              activeTimedSetTimer?.mode === "bilateral"
            const activeTimedTimerPhase =
              standardTimedTimerActive || bilateralTimedTimerActive ? activeTimedSetTimer?.phase : null
            const activeTimedTimerSide = activeTimedSetTimer?.side || activeTimedSet.active_side || "left"

            return (
              <div
                key={i}
                data-exercise-card="true"
                style={
                  isMobile
                    ? {
                        ...cardStyle,
                        ...activeWorkoutExerciseCardStyle,
                        ...exerciseSwipeCardStyle,
                      }
                    : { ...cardStyle, ...activeWorkoutExerciseCardStyle }
                }
                >
                <div style={activeWorkoutExerciseShellStyle}>
                  <div style={activeLiftHeroStyle}>
                    <div style={activeWorkoutExerciseTitleRowStyle}>
                      <div style={activeWorkoutExerciseTitleClusterStyle}>
                        <h3 style={activeWorkoutExerciseTitleStyle}>
                          {selectedExercise?.displayName || selectedExercise?.name || exercise.displayName || exercise.name}
                        </h3>
                        {hasExerciseDetails ? (
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedInfo((prev) => ({
                                ...prev,
                                [infoKey]: !prev[infoKey],
                              }))
                            }
                            aria-label={isInfoExpanded ? "Dölj instruktion" : "Visa instruktion"}
                            style={{
                              ...activeWorkoutInfoIconButtonStyle,
                              color: isInfoExpanded ? activeWorkoutAccent : playerInkSoft,
                              borderColor: isInfoExpanded ? activeWorkoutAccent : playerLine,
                              backgroundColor: isInfoExpanded ? getAccentTint(activeWorkoutAccent, 0.12) : "transparent",
                            }}
                          >
                            i
                          </button>
                        ) : null}
                      </div>
                      {exerciseOptions.length > 1 ? (
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedInfo((prev) => ({
                              ...prev,
                              [alternativesInfoKey]: !prev[alternativesInfoKey],
                            }))
                          }
                          style={{
                            ...activeWorkoutTopPillButtonStyle,
                            color: isAlternativesExpanded ? activeWorkoutAccent : playerInk,
                            borderColor: isAlternativesExpanded ? activeWorkoutAccent : playerLine,
                            backgroundColor: isAlternativesExpanded ? getAccentTint(activeWorkoutAccent, 0.12) : "transparent",
                          }}
                        >
                          Alternativ
                        </button>
                      ) : null}
                    </div>
                    {!isProtocol &&
                    selectedExercise?.executionSide &&
                    selectedExercise.executionSide !== "standard" &&
                    exerciseType !== "seconds_only" ? (
                      <div style={activeLiftSideHintStyle(activeWorkoutAccent)}>
                        {getExerciseExecutionSideHint(
                          selectedExercise.executionSide,
                          selectedExercise?.type || exercise.type
                        )}
                      </div>
                    ) : null}
                  </div>

                  {!isProtocol ? (
                    <div style={activeWorkoutSummaryStackStyle}>
                      <div style={activeWorkoutSummaryGridStyle(isMobile)}>
                        <div style={activeWorkoutSummaryCellStyle("left")}>
                          <div style={activeWorkoutSummaryLabelStyle}>Mål</div>
                          <div style={activeWorkoutSummaryValueStyle}>{activeLiftTargetSummary}</div>
                        </div>
                        <div style={activeWorkoutSummaryCellStyle("right")}>
                          <div style={activeWorkoutSummaryLabelStyle}>Senast</div>
                          <div style={activeWorkoutSummaryValueStyle}>{activeLiftLatestSummary}</div>
                          {latestExerciseDate ? (
                            <div style={activeWorkoutSummaryMetaStyle}>{formatDate(latestExerciseDate)}</div>
                          ) : null}
                        </div>
                      </div>

                      {isWorkoutActive ? (
                        isRestTimerVisible ? (
                          <div style={activeWorkoutRestInlineWrapStyle}>
                            <button
                              type="button"
                              onClick={resetRestStopwatch}
                              style={activeWorkoutRestInlineButtonStyle(activeWorkoutAccent)}
                              aria-label="Nollställ vilostoppklocka"
                            >
                              <span style={activeWorkoutRestInlineLabelStyle(activeWorkoutAccent)}>Vila</span>
                              <span style={activeWorkoutRestInlineValueStyle(activeWorkoutAccent)}>
                                {formatStopwatchTime(restStopwatchElapsedMs)}
                              </span>
                              <span style={activeWorkoutRestInlineHintStyle(activeWorkoutAccent)}>Tryck för att nollställa</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsRestTimerVisible(false)}
                              style={activeWorkoutRestVisibilityButtonStyle}
                            >
                              Dölj
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setIsRestTimerVisible(true)}
                            style={activeWorkoutRestVisibilityButtonStyle}
                          >
                            Visa vilotimer
                          </button>
                        )
                      ) : null}
                    </div>
                  ) : null}

                  {isWorkoutActive && isProtocol ? (
                    <div style={{ display: "grid", gap: "10px" }}>
                      <div
                        style={{
                          padding: "14px",
                          borderRadius: "16px",
                          border: "1px solid #e5e7eb",
                          backgroundColor: "#fffaf5",
                        }}
                      >
                        <div style={{ ...exerciseCommentTitleStyle, marginBottom: "6px" }}>Kastprotokoll</div>
                        <div style={mutedTextStyle}>
                          Genomför blocken i ordning och markera varje block som klart när det är gjort.
                        </div>
                      </div>

                      {exerciseSets.map((set, j) => {
                        const protocolStep =
                          protocolConfig?.steps?.[j] || getExerciseProtocolStep(selectedExercise || exercise, j + 1)
                        const isCompleted = Boolean(set.protocolCompleted || set.reps || set.seconds || set.weight)

                        return (
                          <div key={set.client_set_id || j} style={activeSetCardStyle}>
                            <div style={setLabelStyle}>{protocolStep?.label || `Block ${j + 1}`}</div>
                            <div
                              style={{
                                fontSize: "22px",
                                fontWeight: "800",
                                color: "#18202b",
                                marginBottom: "6px",
                              }}
                            >
                              {protocolStep?.summary || "Följ instruktionen för blocket"}
                            </div>
                            <div style={setInputHintStyle}>
                              {protocolStep?.intensityPercent != null
                                ? `${protocolStep.targetValue} skott på ${protocolStep.intensityPercent} % av maxhastighet`
                                : "Markera blocket när det är klart"}
                            </div>

                            <button
                              type="button"
                              onClick={() => handleProtocolStepToggle(i, j)}
                              style={{
                                ...secondaryButtonStyle,
                                width: isMobile ? "100%" : "auto",
                                marginTop: "12px",
                                backgroundColor: isCompleted ? "#ecfdf3" : "#ffffff",
                                borderColor: isCompleted ? "#16a34a" : "#d1d5db",
                                color: isCompleted ? "#166534" : "#18202b",
                              }}
                            >
                              {isCompleted ? "Klart, tryck för att ångra" : "Markera block som klart"}
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  ) : null}

                  {isWorkoutActive && !isProtocol && exerciseType !== "seconds_only" ? (
                    <div style={activeWorkoutSetListStyle}>
                      {exerciseSets.map((set, j) => {
                        const isCompleted = isSetCompleteForExercise(exerciseType, set, executionSide)
                        const isActiveSet = nextPendingSetIndex !== -1 && j === activeSetIndex && !isCompleted
                        const loggedSetEditKey = `${i}:${j}`
                        const isEditingLoggedSet = editingLoggedSetKey === loggedSetEditKey
                        const suggestedWeight =
                          exerciseType === "weight_reps"
                            ? getSuggestedWeightForSet(exerciseSets, j, latestExerciseTopSet)
                            : null
                        const suggestedSeconds =
                          parseStepperNumber(set.seconds) ?? suggestedTimedSeconds

                        if (isCompleted && !isEditingLoggedSet) {
                          return (
                            <div
                              key={set.client_set_id || j}
                              style={activeWorkoutReceiptRowStyle}
                            >
                              <div>
                                <div style={activeWorkoutReceiptLabelStyle}>Set {j + 1}</div>
                                <div style={activeWorkoutReceiptValueStyle}>{formatSetReceiptValue(set)}</div>
                              </div>
                              <div style={activeWorkoutReceiptActionsStyle}>
                                <button
                                  type="button"
                                  onClick={() => setEditingLoggedSetKey(loggedSetEditKey)}
                                  style={activeWorkoutReceiptActionButtonStyle}
                                >
                                  Ändra
                                </button>
                                <div style={activeWorkoutReceiptStatusStyle}>Loggat</div>
                              </div>
                            </div>
                          )
                        }

                        if (isCompleted && isEditingLoggedSet) {
                          return (
                            <div
                              key={set.client_set_id || j}
                              style={activeWorkoutActiveSetStyle}
                            >
                              <div style={activeWorkoutActiveSetHeaderStyle}>
                                <div>
                                  <div style={activeWorkoutReceiptLabelStyle}>Set {j + 1}</div>
                                  <div style={activeWorkoutActiveSetTitleStyle}>Ändra loggat set</div>
                                </div>
                              </div>

                              <div style={activeWorkoutStepperGridStyle(exerciseType === "weight_reps" ? isMobile ? 1 : 2 : 1)}>
                                {exerciseType === "weight_reps" ? (
                                  <div style={activeWorkoutStepperFieldStyle}>
                                    <div style={activeWorkoutStepperLabelStyle}>Vikt</div>
                                    <div style={activeWorkoutStepperControlStyle}>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          adjustSetNumericField(
                                            i,
                                            j,
                                            "weight",
                                            -1,
                                            suggestedWeight ?? resolvedCurrentTargetWeight ?? 0
                                          )
                                        }
                                        style={activeWorkoutStepperButtonStyle}
                                      >
                                        −
                                      </button>
                                      <div style={activeWorkoutStepperValueStyle}>
                                        <input
                                          type="text"
                                          inputMode="decimal"
                                          enterKeyHint="done"
                                          data-stepper-input-key={getStepperInputKey(j, "weight")}
                                          value={getStepperInputValue(
                                            getStepperInputKey(j, "weight"),
                                            set.weight,
                                            suggestedWeight
                                          )}
                                          onChange={(event) => handleChange(i, j, "weight", event.target.value)}
                                          onFocus={handleStepperFieldFocus}
                                          onBlur={handleStepperFieldBlur}
                                          onKeyDown={handleStepperFieldKeyDown}
                                          onKeyUp={handleStepperFieldKeyUp}
                                          style={activeWorkoutStepperInputStyle}
                                        />
                                        <span style={activeWorkoutStepperUnitStyle}>kg</span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          adjustSetNumericField(
                                            i,
                                            j,
                                            "weight",
                                            1,
                                            suggestedWeight ?? resolvedCurrentTargetWeight ?? 0
                                          )
                                        }
                                        style={activeWorkoutStepperButtonStyle}
                                      >
                                        +
                                      </button>
                                    </div>
                                  </div>
                                ) : null}

                                <div style={activeWorkoutStepperFieldStyle}>
                                  <div style={activeWorkoutStepperLabelStyle}>Reps</div>
                                  <div style={activeWorkoutStepperControlStyle}>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        adjustSetNumericField(
                                          i,
                                          j,
                                          "reps",
                                          -1,
                                          representativeTargetValue ?? 0
                                        )
                                      }
                                      style={activeWorkoutStepperButtonStyle}
                                    >
                                      −
                                    </button>
                                    <div style={activeWorkoutStepperValueStyle}>
                                      <input
                                        type="text"
                                        inputMode="numeric"
                                        enterKeyHint="done"
                                        data-stepper-input-key={getStepperInputKey(j, "reps")}
                                        value={getStepperInputValue(
                                          getStepperInputKey(j, "reps"),
                                          set.reps,
                                          representativeTargetValue
                                        )}
                                        onChange={(event) => handleChange(i, j, "reps", event.target.value)}
                                        onFocus={handleStepperFieldFocus}
                                        onBlur={handleStepperFieldBlur}
                                        onKeyDown={handleStepperFieldKeyDown}
                                        onKeyUp={handleStepperFieldKeyUp}
                                        style={activeWorkoutStepperInputStyle}
                                      />
                                      <span style={activeWorkoutStepperUnitStyle}>reps</span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        adjustSetNumericField(
                                          i,
                                          j,
                                          "reps",
                                          1,
                                          representativeTargetValue ?? 0
                                        )
                                      }
                                      style={activeWorkoutStepperButtonStyle}
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>
                              </div>

                              <div style={activeWorkoutEditActionsStyle}>
                                <button
                                  type="button"
                                  onClick={() => setEditingLoggedSetKey(null)}
                                  style={activeWorkoutEditCancelButtonStyle}
                                >
                                  Avbryt
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSaveEditedLoggedSet(i, j, selectedExercise)}
                                  style={activeWorkoutPrimaryActionStyle(activeWorkoutAccent)}
                                >
                                  Spara ändring
                                </button>
                              </div>
                            </div>
                          )
                        }

                        if (!isActiveSet) {
                          const upcomingSummary =
                            exerciseType === "weight_reps"
                              ? suggestedWeight != null
                                ? `Föreslår ${formatStepperValue(suggestedWeight)} kg`
                                : ""
                              : exerciseType === "reps_only"
                              ? representativeTargetValue != null
                                ? `Mål ${formatStepperValue(representativeTargetValue)} reps`
                                : ""
                              : suggestedSeconds != null
                              ? `Föreslår ${formatStepperValue(suggestedSeconds)} sek`
                              : ""

                          return (
                            <div
                              key={set.client_set_id || j}
                              style={activeWorkoutUpcomingSetStyle}
                            >
                              <div style={activeWorkoutReceiptLabelStyle}>Set {j + 1}</div>
                              {upcomingSummary ? (
                                <div style={activeWorkoutUpcomingValueStyle}>{upcomingSummary}</div>
                              ) : null}
                            </div>
                          )
                        }

                        return (
                          <div
                            key={set.client_set_id || j}
                            style={activeWorkoutActiveSetStyle}
                          >
                            <div style={activeWorkoutActiveSetHeaderStyle}>
                              <div style={activeWorkoutReceiptLabelStyle}>Set {j + 1}</div>
                            </div>

                            <div style={activeWorkoutStepperGridStyle(exerciseType === "weight_reps" ? isMobile ? 1 : 2 : 1)}>
                              {exerciseType === "weight_reps" ? (
                                <div style={activeWorkoutStepperFieldStyle}>
                                  <div style={activeWorkoutStepperLabelStyle}>Vikt</div>
                                  <div style={activeWorkoutStepperControlStyle}>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        adjustSetNumericField(
                                          i,
                                          j,
                                          "weight",
                                          -1,
                                          suggestedWeight ?? resolvedCurrentTargetWeight ?? 0
                                        )
                                      }
                                      style={activeWorkoutStepperButtonStyle}
                                    >
                                      −
                                    </button>
                                    <div style={activeWorkoutStepperValueStyle}>
                                        <input
                                          type="text"
                                          inputMode="decimal"
                                          enterKeyHint="done"
                                          data-stepper-input-key={getStepperInputKey(j, "weight")}
                                          value={getStepperInputValue(
                                            getStepperInputKey(j, "weight"),
                                            set.weight,
                                            suggestedWeight
                                          )}
                                          onChange={(event) => handleChange(i, j, "weight", event.target.value)}
                                          onFocus={handleStepperFieldFocus}
                                          onBlur={handleStepperFieldBlur}
                                          onKeyDown={handleStepperFieldKeyDown}
                                          onKeyUp={handleStepperFieldKeyUp}
                                          style={activeWorkoutStepperInputStyle}
                                        />
                                      <span style={activeWorkoutStepperUnitStyle}>kg</span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        adjustSetNumericField(
                                          i,
                                          j,
                                          "weight",
                                          1,
                                          suggestedWeight ?? resolvedCurrentTargetWeight ?? 0
                                        )
                                      }
                                      style={activeWorkoutStepperButtonStyle}
                                    >
                                      +
                                    </button>
                                  </div>
                                  {suggestedWeight != null ? (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateSetDraft(i, j, {
                                          weight: formatStepperValue(suggestedWeight),
                                          set_type: set.set_type || "work",
                                          workout_session_id: currentSessionId,
                                          client_set_id: set.client_set_id || generateSetId(i, j),
                                        })
                                      }
                                      style={activeWorkoutStepperHintButtonStyle(activeWorkoutAccent)}
                                    >
                                      Använd förslag {formatStepperValue(suggestedWeight)} kg
                                    </button>
                                  ) : null}
                                </div>
                              ) : null}

                              <div style={activeWorkoutStepperFieldStyle}>
                                <div style={activeWorkoutStepperLabelStyle}>
                                  {exerciseType === "seconds_only" ? "Tid" : "Reps"}
                                </div>
                                <div style={activeWorkoutStepperControlStyle}>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      adjustSetNumericField(
                                        i,
                                        j,
                                        exerciseType === "seconds_only" ? "seconds" : "reps",
                                        -1,
                                        exerciseType === "seconds_only"
                                          ? suggestedSeconds ?? 0
                                          : representativeTargetValue ?? 0
                                      )
                                    }
                                    style={activeWorkoutStepperButtonStyle}
                                  >
                                    −
                                  </button>
                                  <div style={activeWorkoutStepperValueStyle}>
                                    {exerciseType === "seconds_only" ? (
                                      <input
                                        type="text"
                                        inputMode="numeric"
                                        enterKeyHint="done"
                                        data-stepper-input-key={getStepperInputKey(j, "seconds")}
                                        value={getStepperInputValue(
                                          getStepperInputKey(j, "seconds"),
                                          set.seconds,
                                          suggestedSeconds
                                        )}
                                        onChange={(event) => handleChange(i, j, "seconds", event.target.value)}
                                        onFocus={handleStepperFieldFocus}
                                        onBlur={handleStepperFieldBlur}
                                        onKeyDown={handleStepperFieldKeyDown}
                                        onKeyUp={handleStepperFieldKeyUp}
                                        style={activeWorkoutStepperInputStyle}
                                      />
                                    ) : (
                                      <input
                                        type="text"
                                        inputMode="numeric"
                                        enterKeyHint="done"
                                        data-stepper-input-key={getStepperInputKey(j, "reps")}
                                        value={getStepperInputValue(
                                          getStepperInputKey(j, "reps"),
                                          set.reps,
                                          representativeTargetValue
                                        )}
                                        onChange={(event) => handleChange(i, j, "reps", event.target.value)}
                                        onFocus={handleStepperFieldFocus}
                                        onBlur={handleStepperFieldBlur}
                                        onKeyDown={handleStepperFieldKeyDown}
                                        onKeyUp={handleStepperFieldKeyUp}
                                        style={activeWorkoutStepperInputStyle}
                                      />
                                    )}
                                    <span style={activeWorkoutStepperUnitStyle}>
                                      {exerciseType === "seconds_only" ? "sek" : "reps"}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      adjustSetNumericField(
                                        i,
                                        j,
                                        exerciseType === "seconds_only" ? "seconds" : "reps",
                                        1,
                                        exerciseType === "seconds_only"
                                          ? suggestedSeconds ?? 0
                                          : representativeTargetValue ?? 0
                                      )
                                    }
                                    style={activeWorkoutStepperButtonStyle}
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                handleLogSetAndStartRest(i, j, selectedExercise, {
                                  weight: suggestedWeight ?? resolvedCurrentTargetWeight,
                                  reps: representativeTargetValue,
                                  seconds: suggestedSeconds,
                                })
                              }
                              style={activeWorkoutPrimaryActionStyle(activeWorkoutAccent)}
                            >
                              Logga set · starta vila
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  ) : null}

                  {isWorkoutActive && !isProtocol && isStandardTimed ? (
                    <div style={activeWorkoutSetListStyle}>
                      {exerciseSets.map((set, j) => {
                        const isCompleted = isSetCompleteForExercise(exerciseType, set, executionSide)
                        const isActiveSet = nextPendingSetIndex !== -1 && j === activeSetIndex && !isCompleted
                        const suggestedSeconds =
                          parseStepperNumber(set.seconds) ?? suggestedTimedSeconds
                        const selectedSecondsValue =
                          parseStepperNumber(set.seconds) ?? parseStepperNumber(suggestedSeconds) ?? null
                        const timerIsActive = isTimedSetTimerRunning(i, j)
                        const previewMs = timerIsActive
                          ? getTimedSetRemainingMs(i, j)
                          : (selectedSecondsValue ?? 0) * 1000

                        if (isCompleted) {
                          return (
                            <div
                              key={set.client_set_id || j}
                              style={activeWorkoutReceiptRowStyle}
                            >
                              <div>
                                <div style={activeWorkoutReceiptLabelStyle}>Set {j + 1}</div>
                                <div style={activeWorkoutReceiptValueStyle}>{formatSetReceiptValue(set)}</div>
                              </div>
                              <div style={activeWorkoutReceiptStatusStyle}>Loggat</div>
                            </div>
                          )
                        }

                        if (!isActiveSet) {
                          return (
                            <div
                              key={set.client_set_id || j}
                              style={activeWorkoutUpcomingSetStyle}
                            >
                              <div style={activeWorkoutReceiptLabelStyle}>Set {j + 1}</div>
                              <div style={activeWorkoutUpcomingValueStyle}>
                                {suggestedSeconds != null
                                  ? `Starta timer för ca ${formatStepperValue(suggestedSeconds)} sek`
                                  : "Starta timer när du är redo"}
                              </div>
                            </div>
                          )
                        }

                        return (
                          <div
                            key={set.client_set_id || j}
                            style={activeWorkoutActiveSetStyle}
                          >
                            <div style={activeWorkoutActiveSetHeaderStyle}>
                              <div>
                                <div style={activeWorkoutReceiptLabelStyle}>Set {j + 1}</div>
                                <div style={activeWorkoutActiveSetTitleStyle}>Nedräkning</div>
                              </div>
                            </div>

                            {timerIsActive ? (
                              <div
                                style={activeWorkoutTimedTimerCardStyle("active", true)}
                              >
                                <div style={activeWorkoutTimedTimerLabelStyle}>
                                  {activeTimedTimerPhase === "countdown" ? "Förbered dig" : "Arbete"}
                                </div>
                                <div style={activeWorkoutTimedTimerValueStyle(true)}>
                                  {formatStopwatchTime(previewMs)}
                                </div>
                                <div style={activeWorkoutTimedTimerHintStyle}>
                                  {activeTimedTimerPhase === "countdown"
                                    ? "Lägg ifrån dig telefonen. Arbetet startar automatiskt."
                                    : "Timern loggar setet automatiskt när tiden är slut."}
                                </div>
                              </div>
                            ) : (
                              <>
                                <div style={activeWorkoutStepperFieldStyle}>
                                  <div style={activeWorkoutStepperLabelStyle}>Tid</div>
                                  <div style={activeWorkoutStepperControlStyle}>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        adjustSetNumericField(
                                          i,
                                          j,
                                          "seconds",
                                          -1,
                                          suggestedSeconds ?? 0
                                        )
                                      }
                                      style={activeWorkoutStepperButtonStyle}
                                    >
                                      −
                                    </button>
                                    <div style={activeWorkoutStepperValueStyle}>
                                      <input
                                        type="text"
                                        inputMode="numeric"
                                        enterKeyHint="done"
                                        data-stepper-input-key={getStepperInputKey(j, "seconds")}
                                        value={getStepperInputValue(
                                          getStepperInputKey(j, "seconds"),
                                          set.seconds,
                                          suggestedSeconds
                                        )}
                                        onChange={(event) => handleChange(i, j, "seconds", event.target.value)}
                                        onFocus={handleStepperFieldFocus}
                                        onBlur={handleStepperFieldBlur}
                                        onKeyDown={handleStepperFieldKeyDown}
                                        onKeyUp={handleStepperFieldKeyUp}
                                        style={activeWorkoutStepperInputStyle}
                                      />
                                      <span style={activeWorkoutStepperUnitStyle}>sek</span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        adjustSetNumericField(
                                          i,
                                          j,
                                          "seconds",
                                          1,
                                          suggestedSeconds ?? 0
                                        )
                                      }
                                      style={activeWorkoutStepperButtonStyle}
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>

                                <div
                                  style={activeWorkoutTimedTimerCardStyle("idle")}
                                >
                                  <div style={activeWorkoutTimedTimerLabelStyle}>Vald tid</div>
                                  <div style={activeWorkoutTimedTimerValueStyle()}>
                                    {formatStopwatchTime(previewMs)}
                                  </div>
                                  <div style={activeWorkoutTimedTimerHintStyle}>
                                    {selectedSecondsValue != null
                                      ? `Starta när du är redo. ${formatStepperValue(selectedSecondsValue)} sek är valt.`
                                      : "Välj sekunder först och starta sedan timern."}
                                  </div>
                                </div>
                              </>
                            )}

                            <button
                              type="button"
                              onClick={() =>
                                handleTimedSetPrimaryAction(i, j, selectedExercise, suggestedSeconds ?? 0)
                              }
                              style={activeWorkoutPrimaryActionStyle(activeWorkoutAccent)}
                            >
                              {timerIsActive
                                ? activeTimedTimerPhase === "work"
                                  ? "Avsluta tidigare · logga set"
                                  : "Avbryt timer"
                                : "Starta timer"}
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  ) : null}

                  {isWorkoutActive && !isProtocol && isBilateralTimed ? (
                    <div style={activeWorkoutSetListStyle}>
                      {nextPendingSetIndex !== -1 ? (
                        <div style={activeWorkoutBilateralPanelStyle}>
                          <div style={activeWorkoutActiveSetHeaderStyle}>
                            <div>
                              <div style={activeWorkoutReceiptLabelStyle}>Set {activeSetIndex + 1}</div>
                              <div style={activeWorkoutActiveSetTitleStyle}>Timer för båda sidorna</div>
                            </div>
                          </div>

                          <div style={activeWorkoutBilateralHalvesStyle(isMobile)}>
                            {["left", "right"].map((side) => {
                              const activeSet = exerciseSets[activeSetIndex] || {}
                              const sideField = side === "left" ? "left_seconds" : "right_seconds"
                              const isLoggedSide = Boolean(activeSet[sideField])
                              const isActiveSide =
                                bilateralTimedTimerActive &&
                                activeTimedTimerPhase === "work" &&
                                activeTimedTimerSide === side
                              const isWaitingSide =
                                bilateralTimedTimerActive &&
                                (activeTimedTimerPhase === "countdown" || activeTimedTimerPhase === "switch_rest") &&
                                !isLoggedSide

                              return (
                                <div
                                  key={side}
                                  style={{
                                    ...activeWorkoutBilateralHalfStyle,
                                    backgroundColor: isActiveSide
                                      ? "rgba(176, 51, 39, 0.12)"
                                      : isLoggedSide
                                      ? "rgba(255, 255, 255, 0.72)"
                                      : "rgba(26, 24, 20, 0.05)",
                                    borderColor: isActiveSide ? "rgba(176, 51, 39, 0.34)" : playerLine,
                                    opacity: isWaitingSide ? 0.74 : 1,
                                  }}
                                >
                                  <div style={activeWorkoutBilateralHalfLabelStyle}>
                                    {side === "left" ? "Vänster" : "Höger"}
                                  </div>
                                  <div style={activeWorkoutBilateralHalfValueStyle}>
                                    {activeSet[sideField] || activeTimedSet.side_input_seconds || "—"}
                                    <span style={activeWorkoutStepperUnitStyle}>sek</span>
                                  </div>
                                  <div style={activeWorkoutBilateralHalfMetaStyle}>
                                    {isLoggedSide
                                      ? "Klar"
                                      : isActiveSide
                                      ? "Pågår"
                                      : side === "left"
                                      ? "Startar först"
                                      : "Startar efter sidbyte"}
                                  </div>
                                </div>
                              )
                            })}
                          </div>

                          {bilateralTimedTimerActive ? (
                            <>
                              <div style={activeWorkoutTimedTimerCardStyle("active", true)}>
                                <div style={activeWorkoutTimedTimerLabelStyle}>
                                  {activeTimedTimerPhase === "countdown"
                                    ? "Förbered dig"
                                    : activeTimedTimerPhase === "switch_rest"
                                    ? "Byt sida"
                                    : activeTimedTimerSide === "right"
                                    ? "Höger"
                                    : "Vänster"}
                                </div>
                                <div style={activeWorkoutTimedTimerValueStyle(true)}>
                                  {formatStopwatchTime(getTimedSetRemainingMs(i, activeSetIndex))}
                                </div>
                                <div style={activeWorkoutTimedTimerHintStyle}>
                                  {activeTimedTimerPhase === "countdown"
                                    ? "Lägg ifrån dig telefonen. Vänster sida startar automatiskt."
                                    : activeTimedTimerPhase === "switch_rest"
                                    ? "Byt sida. Nästa sida startar automatiskt när vilan är slut."
                                    : "Jobba tills timern når noll. Setet loggas automatiskt."}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  handleBilateralTimedPrimaryAction(
                                    i,
                                    activeSetIndex,
                                    selectedExercise,
                                    suggestedTimedSeconds ?? 0
                                  )
                                }
                                style={activeWorkoutPrimaryActionStyle(activeWorkoutAccent)}
                              >
                                Avbryt timer
                              </button>
                            </>
                          ) : (
                            <>
                              <div style={activeWorkoutStepperGridStyle(isMobile ? 1 : 2)}>
                                <div style={activeWorkoutStepperFieldStyle}>
                                  <div style={activeWorkoutStepperLabelStyle}>Arbete</div>
                                  <div style={activeWorkoutStepperControlStyle}>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        adjustSetNumericField(
                                          i,
                                          activeSetIndex,
                                          "side_input_seconds",
                                          -1,
                                          suggestedTimedSeconds ?? 0
                                        )
                                      }
                                      style={activeWorkoutStepperButtonStyle}
                                    >
                                      −
                                    </button>
                                    <div style={activeWorkoutStepperValueStyle}>
                                      <input
                                        type="text"
                                        inputMode="numeric"
                                        enterKeyHint="done"
                                        data-stepper-input-key={getStepperInputKey(activeSetIndex, "side_input_seconds")}
                                        value={getStepperInputValue(
                                          getStepperInputKey(activeSetIndex, "side_input_seconds"),
                                          activeTimedSet.side_input_seconds,
                                          suggestedTimedSeconds
                                        )}
                                        onChange={(event) =>
                                          handleChange(i, activeSetIndex, "side_input_seconds", event.target.value)
                                        }
                                        onFocus={handleStepperFieldFocus}
                                        onBlur={handleStepperFieldBlur}
                                        onKeyDown={handleStepperFieldKeyDown}
                                        onKeyUp={handleStepperFieldKeyUp}
                                        style={activeWorkoutStepperInputStyle}
                                      />
                                      <span style={activeWorkoutStepperUnitStyle}>sek</span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        adjustSetNumericField(
                                          i,
                                          activeSetIndex,
                                          "side_input_seconds",
                                          1,
                                          suggestedTimedSeconds ?? 0
                                        )
                                      }
                                      style={activeWorkoutStepperButtonStyle}
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>

                                <div style={activeWorkoutStepperFieldStyle}>
                                  <div style={activeWorkoutStepperLabelStyle}>Sidbyte</div>
                                  <div style={activeWorkoutStepperControlStyle}>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        adjustSetNumericField(
                                          i,
                                          activeSetIndex,
                                          "switch_seconds",
                                          -1,
                                          ACTIVE_TIMED_SET_DEFAULT_SIDE_SWITCH_SECONDS
                                        )
                                      }
                                      style={activeWorkoutStepperButtonStyle}
                                    >
                                      −
                                    </button>
                                    <div style={activeWorkoutStepperValueStyle}>
                                      <input
                                        type="text"
                                        inputMode="numeric"
                                        enterKeyHint="done"
                                        data-stepper-input-key={getStepperInputKey(activeSetIndex, "switch_seconds")}
                                        value={getStepperInputValue(
                                          getStepperInputKey(activeSetIndex, "switch_seconds"),
                                          activeTimedSet.switch_seconds,
                                          ACTIVE_TIMED_SET_DEFAULT_SIDE_SWITCH_SECONDS
                                        )}
                                        onChange={(event) =>
                                          handleChange(i, activeSetIndex, "switch_seconds", event.target.value)
                                        }
                                        onFocus={handleStepperFieldFocus}
                                        onBlur={handleStepperFieldBlur}
                                        onKeyDown={handleStepperFieldKeyDown}
                                        onKeyUp={handleStepperFieldKeyUp}
                                        style={activeWorkoutStepperInputStyle}
                                      />
                                      <span style={activeWorkoutStepperUnitStyle}>sek</span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        adjustSetNumericField(
                                          i,
                                          activeSetIndex,
                                          "switch_seconds",
                                          1,
                                          ACTIVE_TIMED_SET_DEFAULT_SIDE_SWITCH_SECONDS
                                        )
                                      }
                                      style={activeWorkoutStepperButtonStyle}
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>
                              </div>

                              <div style={activeWorkoutTimedTimerCardStyle("idle")}>
                                <div style={activeWorkoutTimedTimerLabelStyle}>Upplägg</div>
                                <div style={activeWorkoutTimedTimerValueStyle()}>
                                  {formatStopwatchTime(
                                    (parseStepperNumber(activeTimedSet.side_input_seconds) ??
                                      suggestedTimedSeconds ??
                                      0) * 1000
                                  )}
                                </div>
                                <div style={activeWorkoutTimedTimerHintStyle}>
                                  Vänster startar först, sedan sidbyte och höger automatiskt.
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  handleBilateralTimedPrimaryAction(
                                    i,
                                    activeSetIndex,
                                    selectedExercise,
                                    suggestedTimedSeconds ?? 0
                                  )
                                }
                                style={activeWorkoutPrimaryActionStyle(activeWorkoutAccent)}
                              >
                                Starta set
                              </button>
                            </>
                          )}

                        </div>
                      ) : (
                        <div style={activeWorkoutEmptyStateStyle}>Alla set i den här övningen är redan loggade.</div>
                      )}

                      <div style={activeWorkoutBilateralTableStyle}>
                        <div style={activeWorkoutBilateralTableHeaderStyle}>
                          <span>SET</span>
                          <span>VÄ</span>
                          <span>HÖ</span>
                        </div>
                        {exerciseSets.map((set, j) => {
                          const isCurrentRow = nextPendingSetIndex !== -1 && j === activeSetIndex
                          const activeSide = set.active_side || ""
                          return (
                            <div
                              key={set.client_set_id || j}
                              style={{
                                ...activeWorkoutBilateralTableRowStyle,
                                backgroundColor: isCurrentRow ? "rgba(176, 51, 39, 0.08)" : "transparent",
                              }}
                            >
                              <span>Set {j + 1}</span>
                              <span>
                                {set.left_seconds ||
                                  (isCurrentRow && activeSide === "left"
                                    ? set.side_input_seconds || "—"
                                    : "—")}
                              </span>
                              <span>
                                {set.right_seconds ||
                                  (isCurrentRow && activeSide === "right"
                                    ? set.side_input_seconds || "—"
                                    : "—")}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ) : null}

                  {isWorkoutActive && !isProtocol ? (
                    <div style={activeWorkoutGhostActionsStyle}>
                      <button
                        type="button"
                        onClick={() => handleAddSet(i)}
                        style={activeWorkoutGhostActionButtonStyle}
                      >
                        <span style={activeWorkoutGhostActionLabelStyle}>Set</span>
                        <span style={activeWorkoutGhostActionValueStyle}>+ Lägg till</span>
                      </button>
                    </div>
                  ) : null}

                  {isAlternativesExpanded && exerciseOptions.length > 1 ? (
                    <div style={activeWorkoutDetailPanelStyle}>
                      <div style={alternativeSelectionHintStyle}>
                        Vald: {selectedExercise?.displayName || selectedExercise?.name}
                      </div>
                      <div style={alternativeSelectionOptionListStyle}>
                        {exerciseOptions.map((option) => {
                          const isSelectedOption = selectedExercise?.optionKey === option.optionKey

                          return (
                            <button
                              key={option.optionKey}
                              type="button"
                              onClick={() => handleSelectedExerciseOptionChange(i, option.optionKey)}
                              style={{
                                ...alternativeSelectionOptionStyle,
                                borderColor: isSelectedOption ? activeWorkoutAccent : playerLine,
                                backgroundColor: isSelectedOption ? getAccentTint(activeWorkoutAccent, 0.12) : "rgba(255, 255, 255, 0.28)",
                                color: isSelectedOption ? activeWorkoutAccent : playerInk,
                              }}
                            >
                              <div style={alternativeSelectionOptionNameStyle}>
                                {option.displayName || option.name}
                              </div>
                              <div style={alternativeSelectionOptionMetaStyle}>
                                {option.isBase
                                  ? "Originalövning"
                                  : `Alternativ till ${exercise.displayName || exercise.name}`}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ) : null}

                  {isInfoExpanded && hasExerciseDetails ? (
                    <div style={activeWorkoutDetailPanelStyle}>
                      {!selectedExercise?.isBase ? (
                        <div style={alternativeSelectionMetaStyle}>
                          Alternativ till {exercise.displayName || exercise.name}
                        </div>
                      ) : null}

                      {exerciseTextSections.primaryText ? (
                        <div>
                          <div style={exerciseDetailsLabelStyle}>{exerciseTextSections.primaryLabel}</div>
                          <p style={exerciseDescriptionStyle}>{exerciseTextSections.primaryText}</p>
                        </div>
                      ) : null}

                      {exerciseTextSections.secondaryText ? (
                        <div style={{ marginTop: exerciseTextSections.primaryText ? "10px" : 0 }}>
                          <div style={exerciseDetailsLabelStyle}>{exerciseTextSections.secondaryLabel}</div>
                          <p style={guideStyle}>{exerciseTextSections.secondaryText}</p>
                        </div>
                      ) : null}

                      {selectedExercise?.mediaUrl ? (
                        <div
                          style={{
                            ...exerciseMediaWrapStyle,
                            marginTop:
                              exerciseTextSections.primaryText || exerciseTextSections.secondaryText ? "12px" : 0,
                          }}
                        >
                          <div style={exerciseDetailsLabelStyle}>Video eller exempel</div>
                          {isVideoUrl(selectedExercise.mediaUrl) ? (
                            <video
                              src={selectedExercise.mediaUrl}
                              controls
                              playsInline
                              style={exerciseMediaStyle}
                            />
                          ) : (
                            <img
                              src={selectedExercise.mediaUrl}
                              alt={`${selectedExercise?.displayName || selectedExercise?.name || exercise.displayName || exercise.name} demo`}
                              style={exerciseMediaStyle}
                            />
                          )}
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                </div>
              </div>
            )
          })}

              <div
                data-exercise-card="true"
                style={
                  isMobile
                    ? {
                        ...cardStyle,
                        ...activeWorkoutExerciseCardStyle,
                        ...exerciseSwipeCardStyle,
                        order: activeWorkoutSlideCount - 1,
                      }
                    : {
                        ...cardStyle,
                        ...activeWorkoutExerciseCardStyle,
                        order: activeWorkoutSlideCount - 1,
                      }
                }
              >
                <div style={exerciseProgressStyle(activeWorkoutAccent)}>Avslut</div>

                <h3 style={activeWorkoutFinishTitleStyle}>Pass klart?</h3>
                <p style={{ ...mutedTextStyle, marginBottom: "14px" }}>
                  {isRunningWorkoutActive
                    ? "Avsluta passet först. Du får sedan en sammanfattning där du kan justera distans, tid, puls och annat."
                    : "Lägg en kort kommentar om känslan idag och spara passet."}
                </p>

                {!isLoadingPlayerTargets && activeWorkoutTargetRequestOptions.length > 0 && (
                  <div style={activeLiftSupportPanelStyle}>
                    <button
                      type="button"
                      onClick={() => {
                        if (activeTargetChangeRequestDraft) {
                          setActiveTargetChangeRequestDraft(null)
                          return
                        }

                        setActiveTargetChangeRequestDraft(
                          buildTargetChangeRequestDraft(activeWorkoutTargetRequestOptions[0])
                        )
                      }}
                      style={activeLiftSupportButtonStyle}
                    >
                      <span>
                        <span style={activeLiftSupportKickerStyle}>Stöd</span>
                        <span style={activeLiftSupportTitleStyle}>Begär ändring av målvikt</span>
                      </span>
                      <span style={activeLiftSupportIconStyle}>{activeTargetChangeRequestDraft ? "−" : "+"}</span>
                    </button>

                    {activeTargetChangeRequestDraft && selectedActiveTargetRequestOption && (
                      <div style={activeLiftComposerStyle}>
                        <div style={{ ...targetSectionLabelStyle, marginBottom: "8px" }}>
                          Skicka till tränaren
                        </div>

                        <div style={{ ...playerActivityFieldStyle, marginBottom: "10px" }}>
                          <div style={playerActivityFieldLabelStyle}>Övning</div>
                          <select
                            value={selectedActiveTargetRequestOption.composer_key}
                            onChange={(event) => {
                              const nextOption = activeWorkoutTargetRequestOptions.find(
                                (option) => option.composer_key === event.target.value
                              )
                              setActiveTargetChangeRequestDraft(buildTargetChangeRequestDraft(nextOption))
                            }}
                            style={playerActivityInputStyle}
                          >
                            {activeWorkoutTargetRequestOptions.map((option) => (
                              <option key={option.composer_key} value={option.composer_key}>
                                {option.exercise_name} • {option.rep_range_label} • {option.current_target_weight} kg
                              </option>
                            ))}
                          </select>
                        </div>

                        <div style={activeLiftComposerHintStyle}>
                          För {selectedActiveTargetRequestOption.rep_range_label} • nuvarande mål{" "}
                          {selectedActiveTargetRequestOption.current_target_weight} kg
                        </div>

                        <div style={activeLiftChoiceGridStyle(isMobile)}>
                          <button
                            type="button"
                            onClick={() =>
                              setActiveTargetChangeRequestDraft((prev) => ({
                                ...prev,
                                request_type: "increase",
                              }))
                            }
                            style={{
                              ...activeLiftChoiceButtonStyle,
                              ...(activeTargetChangeRequestDraft?.request_type === "increase"
                                ? activeLiftChoiceButtonActiveStyle(activeWorkoutAccent)
                                : {}),
                              width: "100%",
                            }}
                          >
                            Höj
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setActiveTargetChangeRequestDraft((prev) => ({
                                ...prev,
                                request_type: "decrease",
                              }))
                            }
                            style={{
                              ...activeLiftChoiceButtonStyle,
                              ...(activeTargetChangeRequestDraft?.request_type === "decrease"
                                ? activeLiftChoiceButtonActiveStyle(activeWorkoutAccent)
                                : {}),
                              width: "100%",
                            }}
                          >
                            Sänk
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setActiveTargetChangeRequestDraft((prev) => ({
                                ...prev,
                                request_type: "review",
                              }))
                            }
                            style={{
                              ...activeLiftChoiceButtonStyle,
                              ...(activeTargetChangeRequestDraft?.request_type === "review"
                                ? activeLiftChoiceButtonActiveStyle(activeWorkoutAccent)
                                : {}),
                              width: "100%",
                            }}
                          >
                            Se över
                          </button>
                        </div>

                        <textarea
                          rows={3}
                          value={activeTargetChangeRequestDraft?.comment || ""}
                          onChange={(event) =>
                            setActiveTargetChangeRequestDraft((prev) => ({
                              ...prev,
                              comment: event.target.value,
                            }))
                          }
                          placeholder="Skriv kort varför du vill ändra målvikten"
                          style={{ ...playerActivityTextareaStyle, width: "100%", marginBottom: "10px", minHeight: "96px" }}
                        />

                        <div style={feedbackComposerActionsStyle}>
                          <button
                            type="button"
                            onClick={() => setActiveTargetChangeRequestDraft(null)}
                            style={activeLiftSecondaryActionStyle}
                          >
                            Avbryt
                          </button>
                          <button
                            type="button"
                            onClick={handleSubmitTargetChangeRequest}
                            disabled={isSubmittingTargetChangeRequest}
                            style={{
                              ...playerActivitySubmitButtonStyle,
                              opacity: isSubmittingTargetChangeRequest ? 0.7 : 1,
                              cursor: isSubmittingTargetChangeRequest ? "default" : "pointer",
                            }}
                          >
                            {isSubmittingTargetChangeRequest ? "Skickar..." : "Skicka begäran"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {!isRunningWorkoutActive ? (
                  <div style={exerciseCommentCardStyle}>
                    <div style={exerciseCommentTitleStyle}>Kommentar på passet</div>
                    <textarea
                      rows={4}
                      placeholder="T.ex. tungt pass idag, ont i knä eller något tränaren bör veta"
                      value={passComment}
                      onChange={(e) => setPassComment(e.target.value)}
                      style={{ ...playerActivityTextareaStyle, width: "100%", minHeight: "104px" }}
                    />
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={finishWorkout}
                  style={{ ...buttonStyle, ...activeWorkoutFinishButtonStyle(activeWorkoutAccent), width: isMobile ? "100%" : "auto" }}
                >
                  Avsluta pass
                </button>
              </div>
            </div>
          </div>

          {isMobile && activeWorkoutSlideCount > 1 ? (
            <div style={activeWorkoutBottomNavStyle}>
              <button
                type="button"
                onClick={() => scrollToExerciseCard(Math.max(activeExerciseIndex - 1, 0))}
                disabled={activeExerciseIndex === 0}
                style={{
                  ...activeWorkoutBottomNavButtonStyle,
                  opacity: activeExerciseIndex === 0 ? 0.45 : 1,
                  cursor: activeExerciseIndex === 0 ? "default" : "pointer",
                }}
              >
                Föregående
              </button>

              <div style={activeWorkoutBottomNavStatusStyle}>{activeWorkoutProgressSummary}</div>

              <button
                type="button"
                onClick={() =>
                  scrollToExerciseCard(
                    Math.min(
                      activeExerciseIndex + 1,
                      activeWorkoutSlideCount - 1
                    )
                  )
                }
                disabled={activeExerciseIndex === activeWorkoutSlideCount - 1}
                style={{
                  ...activeWorkoutBottomNavButtonStyle,
                  opacity: activeExerciseIndex === activeWorkoutSlideCount - 1 ? 0.45 : 1,
                  cursor: activeExerciseIndex === activeWorkoutSlideCount - 1 ? "default" : "pointer",
                }}
              >
                Nästa
              </button>
            </div>
          ) : null}
        </div>
      )}
      </>
      )}
    </div>
  )
}

function PlayerProgressChart({ entries }) {
  const chartWidth = 560
  const chartHeight = 220
  const padding = { top: 20, right: 18, bottom: 34, left: 42 }
  const points = (entries || []).filter((entry) => entry?.top_weight != null)

  if (points.length === 0) {
    return null
  }

  const weights = points.map((entry) => Number(entry.top_weight))
  const minWeight = Math.min(...weights)
  const maxWeight = Math.max(...weights)
  const range = Math.max(maxWeight - minWeight, 2)

  const chartPoints = points.map((entry, index) => {
    const x =
      points.length === 1
        ? chartWidth / 2
        : padding.left + (index / (points.length - 1)) * (chartWidth - padding.left - padding.right)
    const y =
      padding.top +
      ((maxWeight - Number(entry.top_weight)) / range) * (chartHeight - padding.top - padding.bottom)

    return {
      ...entry,
      x,
      y,
      label: new Date(entry.created_at).toLocaleDateString("sv-SE", { month: "numeric", day: "numeric" }),
    }
  })

  const polylinePoints = chartPoints.map((point) => `${point.x},${point.y}`).join(" ")
  const axisLabels = [maxWeight, minWeight + range / 2, minWeight].map((value) => Math.round(value * 10) / 10)

  return (
    <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={playerChartSvgStyle} role="img" aria-label="Graf över viktutveckling">
      <rect x="0" y="0" width={chartWidth} height={chartHeight} rx="20" fill="#fffdfd" />

      {axisLabels.map((value, index) => {
        const y =
          padding.top + (index / (axisLabels.length - 1)) * (chartHeight - padding.top - padding.bottom)

        return (
          <g key={value}>
            <line
              x1={padding.left}
              x2={chartWidth - padding.right}
              y1={y}
              y2={y}
              stroke="#e9d7d7"
              strokeDasharray="4 6"
            />
            <text x={padding.left - 10} y={y + 4} textAnchor="end" fontSize="11" fill="#6b7280" fontWeight="700">
              {value} kg
            </text>
          </g>
        )
      })}

      <polyline
        fill="none"
        stroke="#b61e24"
        strokeWidth="4"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={polylinePoints}
      />

      {chartPoints.map((point) => (
        <g key={`${point.created_at}-${point.top_weight}`}>
          <circle cx={point.x} cy={point.y} r="5" fill="#ffffff" stroke="#b61e24" strokeWidth="3" />
          <text x={point.x} y={chartHeight - 10} textAnchor="middle" fontSize="11" fill="#6b7280" fontWeight="700">
            {point.label}
          </text>
        </g>
      ))}
    </svg>
  )
}

const pageStyle = {
  width: "100%",
  maxWidth: "980px",
  minWidth: 0,
  padding: "20px 16px 48px",
  boxSizing: "border-box",
  margin: "0 auto",
  minHeight: "100vh",
  fontFamily: '"Manrope", sans-serif',
  overflowX: "hidden",
}

const uiSurface = "var(--ghf-surface)"
const uiSurfaceAlt = "var(--ghf-surface-alt)"
const uiBorder = "var(--ghf-line)"
const uiBorderStrong = "var(--ghf-line-strong)"
const uiShadowSm = "var(--ghf-shadow-sm)"
const uiShadowMd = "var(--ghf-shadow-md)"
const uiShadowLg = "var(--ghf-shadow-lg)"
const getAccentTint = (accent, opacity = 0.12) => {
  const normalized = String(accent || "").replace("#", "")
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return `rgba(176, 51, 39, ${opacity})`

  const red = Number.parseInt(normalized.slice(0, 2), 16)
  const green = Number.parseInt(normalized.slice(2, 4), 16)
  const blue = Number.parseInt(normalized.slice(4, 6), 16)
  return `rgba(${red}, ${green}, ${blue}, ${opacity})`
}
const playerPaper = "#f3efe6"
const playerInk = "#1a1814"
const playerInkSoft = "#6f6659"
const playerAccent = getCategoryAccent("strength")
const playerLine = "rgba(26, 24, 20, 0.14)"
const playerDisplayFont = '"Manrope", sans-serif'
const playerMonoFont = '"IBM Plex Mono", "SFMono-Regular", Consolas, monospace'

const playerShellPageStyle = (isMobile) => ({
  maxWidth: isMobile ? "100%" : "760px",
  background:
    "radial-gradient(circle at 18% -6%, rgba(217, 74, 31, 0.16), transparent 34%), linear-gradient(180deg, #f3efe6 0%, #ebe2d2 100%)",
  color: playerInk,
  fontFamily: '"Manrope", sans-serif',
  boxShadow: isMobile ? "none" : "0 30px 70px rgba(26, 24, 20, 0.08)",
})

const playerShellMenuWrapStyle = (isMobile) => ({
  position: "fixed",
  top: isMobile ? "max(14px, env(safe-area-inset-top))" : "24px",
  right: isMobile ? "14px" : "calc((100vw - min(760px, 100vw)) / 2 + 22px)",
  zIndex: 35,
})

const playerShellMenuButtonStyle = {
  width: "48px",
  height: "48px",
  display: "inline-flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "5px",
  padding: 0,
  borderRadius: "999px",
  border: "1px solid rgba(26, 24, 20, 0.18)",
  backgroundColor: "rgba(26, 24, 20, 0.92)",
  color: playerPaper,
  cursor: "pointer",
  boxShadow: "0 18px 36px rgba(26, 24, 20, 0.22)",
}

const playerShellMenuIconLineStyle = {
  width: "20px",
  height: "2px",
  borderRadius: "999px",
  backgroundColor: playerPaper,
}

const managementShellPageStyle = (isMobile) => ({
  maxWidth: isMobile ? "100%" : "1120px",
  background:
    "radial-gradient(circle at 16% -8%, rgba(217, 74, 31, 0.14), transparent 32%), linear-gradient(180deg, #f3efe6 0%, #e9dfcf 100%)",
  color: playerInk,
  fontFamily: playerDisplayFont,
  boxShadow: isMobile ? "none" : "0 30px 70px rgba(26, 24, 20, 0.08)",
})

const managementShellMenuWrapStyle = (isMobile) => ({
  position: "fixed",
  top: isMobile ? "max(14px, env(safe-area-inset-top))" : "24px",
  right: isMobile ? "14px" : "calc((100vw - min(1120px, 100vw)) / 2 + 24px)",
  zIndex: 35,
})

const managementShellMenuButtonStyle = {
  ...playerShellMenuButtonStyle,
  width: "50px",
  height: "50px",
  border: `1px solid ${playerLine}`,
  backgroundColor: "rgba(26, 24, 20, 0.94)",
}

const managementShellMenuIconLineStyle = {
  ...playerShellMenuIconLineStyle,
}

const managementViewportPanelStyle = {
  marginBottom: "18px",
  padding: 0,
  border: "none",
  borderRadius: "14px",
  background: "transparent",
  boxShadow: "none",
  backdropFilter: "none",
}

const managementHomeViewportStyle = {
  marginBottom: "16px",
  padding: 0,
  borderRadius: 0,
  border: "none",
  background: "transparent",
  boxShadow: "none",
  backdropFilter: "none",
}

const managementCardTitleStyle = {
  ...sectionTitleStyleToken,
  marginBottom: "12px",
}

const managementMutedTextStyle = {
  ...mutedBodyTextStyleToken,
}

const managementInputStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: "12px",
  border: `1px solid ${redesignLineSoft}`,
  backgroundColor: redesignSurfaceSoft,
  color: redesignInk,
  ...inputTextStyleToken,
  boxShadow: "none",
  outline: "none",
}

const managementButtonStyle = {
  padding: "12px 16px",
  borderRadius: "18px",
  border: "none",
  background: `linear-gradient(135deg, ${playerAccent} 0%, #b93617 100%)`,
  color: playerPaper,
  fontFamily: playerDisplayFont,
  fontSize: "15px",
  fontWeight: "800",
  cursor: "pointer",
  boxShadow: "0 16px 28px rgba(217, 74, 31, 0.2)",
}

const managementSecondaryButtonStyle = {
  padding: "12px 16px",
  borderRadius: "18px",
  border: `1px solid ${playerLine}`,
  backgroundColor: "rgba(255, 255, 255, 0.34)",
  color: playerInk,
  fontFamily: playerDisplayFont,
  fontSize: "15px",
  fontWeight: "800",
  cursor: "pointer",
  boxShadow: "none",
}

const managementTabsWrapStyle = {
  display: "flex",
  gap: "10px",
  marginBottom: "18px",
  flexWrap: "wrap",
  padding: 0,
  borderRadius: 0,
  border: "none",
  backgroundColor: "transparent",
  boxShadow: "none",
}

const managementTabButtonStyle = {
  padding: "12px 16px",
  borderRadius: "16px",
  border: `1px solid transparent`,
  backgroundColor: "transparent",
  color: playerInkSoft,
  cursor: "pointer",
  fontFamily: playerMonoFont,
  fontSize: "11px",
  fontWeight: "700",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
}

const managementActiveTabButtonStyle = {
  backgroundColor: playerInk,
  color: playerPaper,
  borderColor: playerInk,
  boxShadow: "0 16px 24px rgba(26, 24, 20, 0.16)",
}

const managementFeedbackActionBarStyle = {
  ...flatSectionStyleToken,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "18px",
}

const managementFeedbackComposerCardStyle = {
  ...flatSectionStyleToken,
  padding: 0,
}

const managementAccountPanelStyle = {
  ...flatSectionStyleToken,
  padding: 0,
}

const managementMonoLabelStyle = {
  ...pageEyebrowStyleToken,
  marginBottom: "8px",
}

const managementPageTitleStyle = {
  ...pageTitleStyleToken,
}

const managementAccountInfoCardStyle = {
  padding: "14px 0",
  borderRadius: 0,
  border: "none",
  borderBottom: `1px solid ${redesignLineSoft}`,
  backgroundColor: "transparent",
}

const managementAccountInfoLabelStyle = {
  ...managementMonoLabelStyle,
  marginBottom: "10px",
}

const managementAccountInfoValueStyle = {
  fontFamily: playerDisplayFont,
  fontSize: "26px",
  lineHeight: 0.96,
  fontWeight: "700",
  letterSpacing: "-0.04em",
  color: playerInk,
}

const managementAccountPasswordCardStyle = {
  marginTop: "16px",
  padding: "16px 0 0",
  borderRadius: 0,
  border: "none",
  borderTop: `1px solid ${redesignLineSoft}`,
  backgroundColor: "transparent",
}

const managementAccountSectionTitleStyle = {
  ...managementCardTitleStyle,
  fontSize: "clamp(26px, 5vw, 34px)",
  marginBottom: "6px",
}

const managementAccountSectionTextStyle = {
  ...managementMutedTextStyle,
  marginBottom: "12px",
}

const managementAccountFieldLabelStyle = {
  ...managementMonoLabelStyle,
}

const managementAccountWarningCardStyle = {
  marginTop: "16px",
  padding: "16px 0 0",
  borderRadius: 0,
  border: "1px solid rgba(185, 28, 28, 0.14)",
  backgroundColor: "transparent",
}

const managementAccountWarningTitleStyle = {
  ...managementAccountSectionTitleStyle,
  color: "#991b1b",
}

const managementAccountWarningTextStyle = {
  ...managementMutedTextStyle,
  color: "#7f1d1d",
}

const appTitleStyle = {
  margin: "0 0 8px 0",
  fontSize: "clamp(2rem, 4vw, 3.4rem)",
  lineHeight: 0.95,
  fontWeight: "900",
  color: "#18202b",
}

const appSubtitleStyle = {
  margin: 0,
  maxWidth: "560px",
  fontSize: "15px",
  color: "#566173",
  lineHeight: 1.6,
}

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-end",
  gap: "20px",
  marginBottom: "18px",
}

const eyebrowStyle = {
  margin: "0 0 10px 0",
  fontSize: "12px",
  fontWeight: "800",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#991b1b",
}

const heroCardStyle = {
  marginBottom: "20px",
  padding: "22px 22px 20px",
  borderRadius: "26px",
  background:
    "linear-gradient(135deg, rgba(198, 40, 40, 0.98) 0%, rgba(153, 27, 27, 0.96) 48%, rgba(24, 32, 43, 0.94) 100%)",
  color: "#ffffff",
  boxShadow: "0 24px 42px rgba(24, 32, 43, 0.16)",
}

const heroBadgeStyle = {
  display: "inline-flex",
  marginBottom: "12px",
  padding: "6px 12px",
  borderRadius: "999px",
  backgroundColor: "rgba(255,255,255,0.16)",
  color: "#fff7f7",
  fontSize: "12px",
  fontWeight: "800",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
}

const heroHeadingStyle = {
  fontSize: "clamp(1.6rem, 3vw, 2.4rem)",
  fontWeight: "900",
  lineHeight: 1,
  marginBottom: "10px",
}

const heroTextStyle = {
  maxWidth: "580px",
  fontSize: "15px",
  lineHeight: 1.6,
  color: "rgba(255,255,255,0.9)",
}

const activeWorkoutPageHeroStyle = (isMobile) => ({
  width: "100%",
  padding: isMobile ? "10px 0 4px" : "12px 0 8px",
  borderRadius: 0,
  background: "transparent",
  color: playerInk,
  boxShadow: "none",
})

const activeWorkoutTopBarStyle = {
  display: "grid",
  gridTemplateColumns: "40px minmax(0, 1fr) 40px",
  alignItems: "center",
  gap: "10px",
}

const activeWorkoutCloseButtonStyle = {
  width: "40px",
  height: "40px",
  borderRadius: "999px",
  border: `1px solid ${playerLine}`,
  backgroundColor: "transparent",
  color: playerInkSoft,
  cursor: "pointer",
  fontSize: "24px",
  lineHeight: 1,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
}

const activeWorkoutLiveMetaStyle = {
  minWidth: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  fontFamily: playerMonoFont,
  fontSize: "11px",
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: playerInkSoft,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
}

const activeWorkoutLiveDotStyle = (accent = playerAccent) => ({
  width: "7px",
  height: "7px",
  borderRadius: "999px",
  backgroundColor: accent,
  flexShrink: 0,
})

const activeWorkoutProgressBarStyle = {
  display: "flex",
  gap: "5px",
  marginTop: "16px",
}

const activeWorkoutProgressSegmentStyle = {
  flex: 1,
  height: "4px",
  borderRadius: "999px",
}

const activeWorkoutPageWrapStyle = {
  width: "100%",
  marginTop: 0,
  padding: "0 0 calc(104px + env(safe-area-inset-bottom))",
  borderRadius: 0,
  background: "transparent",
}

const activeWorkoutFocusHeroStyle = {
  marginBottom: "14px",
  padding: "14px 4px 0",
}

const activeWorkoutFocusTitleStyle = {
  fontFamily: playerDisplayFont,
  fontSize: "clamp(28px, 8vw, 44px)",
  lineHeight: 0.96,
  fontWeight: 650,
  letterSpacing: "-0.04em",
  color: playerInk,
}

const activeWorkoutFocusMetaStyle = {
  marginTop: "8px",
  fontSize: "14px",
  lineHeight: 1.45,
  fontWeight: 800,
  color: playerInkSoft,
}

const restStopwatchCardStyle = {
  padding: "12px",
  borderRadius: "18px",
  textAlign: "left",
  cursor: "pointer",
  background: playerInk,
  border: `1px solid ${playerInk}`,
  color: playerPaper,
  minHeight: "86px",
}

const restStopwatchLabelStyle = {
  fontFamily: playerMonoFont,
  fontSize: "9px",
  fontWeight: "700",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "rgba(243, 239, 230, 0.64)",
}

const restStopwatchValueStyle = {
  fontFamily: playerMonoFont,
  fontSize: "clamp(22px, 6vw, 30px)",
  lineHeight: 1,
  fontWeight: "700",
  letterSpacing: "0.02em",
  color: playerPaper,
}

const restStopwatchHintStyle = {
  marginTop: "6px",
  fontSize: "10px",
  fontWeight: "700",
  color: "rgba(243, 239, 230, 0.68)",
}

const activeWorkoutGroupCardStyle = {
  marginBottom: "16px",
  padding: "14px 16px",
  borderRadius: "18px",
  border: `1px solid ${uiBorder}`,
  backgroundColor: "#fffaf5",
  boxShadow: uiShadowSm,
}

const activeWorkoutGroupButtonStyle = {
  width: "100%",
  border: "none",
  backgroundColor: "transparent",
  padding: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  textAlign: "left",
  cursor: "pointer",
  color: "#18202b",
}

const activeWorkoutGroupLabelStyle = {
  fontSize: "12px",
  fontWeight: "800",
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "#991b1b",
  marginBottom: "6px",
}

const activeWorkoutGroupNameStyle = {
  fontSize: "20px",
  lineHeight: 1.1,
  fontWeight: "900",
  color: "#18202b",
}

const activeWorkoutGroupToggleStyle = {
  fontSize: "22px",
  lineHeight: 1,
  fontWeight: "900",
  color: "#991b1b",
}

const activeWorkoutGroupMembersStyle = {
  display: "grid",
  gap: "8px",
  marginTop: "14px",
}

const activeWorkoutGroupMemberRowStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "10px",
  paddingTop: "8px",
  borderTop: `1px solid ${uiBorder}`,
  fontSize: "14px",
  color: "#374151",
}

const activeWorkoutGroupMemberYouStyle = {
  padding: "4px 8px",
  borderRadius: "999px",
  backgroundColor: "#fff1f1",
  color: "#b61e24",
  fontSize: "11px",
  fontWeight: "800",
}

const feedbackActionBarStyle = {
  marginBottom: "16px",
  padding: "0",
  borderRadius: 0,
  border: "none",
  background: "transparent",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  boxShadow: "none",
}

const feedbackActionTitleStyle = {
  marginBottom: "4px",
  fontSize: "16px",
  fontWeight: "900",
  color: "#18202b",
}

const compactFieldLabelStyle = {
  marginBottom: "8px",
  fontSize: "13px",
  fontWeight: "800",
  color: "#18202b",
}

const fieldLabelStyle = {
  display: "grid",
  gap: "7px",
  ...fieldLabelStyleToken,
}

const feedbackComposerCardStyle = {
  marginBottom: "16px",
  padding: 0,
  borderRadius: 0,
  border: "none",
  backgroundColor: "transparent",
  boxShadow: "none",
}

const feedbackComposerActionsStyle = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "10px",
  flexWrap: "wrap",
}

const logoutButtonStyle = {
  padding: "12px 16px",
  borderRadius: "16px",
  border: `1px solid ${uiBorderStrong}`,
  backgroundColor: uiSurface,
  color: "#18202b",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: "800",
  whiteSpace: "nowrap",
  boxShadow: uiShadowSm,
}

const headerActionsWrapStyle = (isMobile) => ({
  position: "absolute",
  top: isMobile ? "max(14px, env(safe-area-inset-top))" : "20px",
  right: isMobile ? "12px" : "16px",
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "flex-end",
})

const menuWrapStyle = {
  position: "relative",
}

const menuButtonStyle = {
  width: "46px",
  height: "46px",
  display: "inline-flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "4px",
  padding: 0,
  borderRadius: "14px",
  border: `1px solid ${uiBorderStrong}`,
  backgroundColor: uiSurface,
  color: "#18202b",
  cursor: "pointer",
  boxShadow: uiShadowSm,
}

const menuIconLineStyle = {
  width: "18px",
  height: "2px",
  borderRadius: "999px",
  backgroundColor: "#18202b",
}

const menuDropdownStyle = (isMobile) => ({
  position: "fixed",
  top: isMobile ? "calc(max(14px, env(safe-area-inset-top)) + 54px)" : "76px",
  right: 0,
  width: isMobile ? "calc(100vw - 12px)" : "min(360px, 50vw)",
  maxWidth: "calc(100vw - 12px)",
  minHeight: isMobile ? "50vh" : "46vh",
  padding: "14px",
  borderRadius: "20px 0 0 20px",
  border: `1px solid ${uiBorder}`,
  backgroundColor: uiSurface,
  boxShadow: uiShadowLg,
  zIndex: 10,
  overflowY: "auto",
})

const menuItemButtonStyle = {
  width: "100%",
  padding: "12px 14px",
  border: "none",
  borderRadius: "12px",
  backgroundColor: uiSurface,
  color: "#18202b",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: "800",
  textAlign: "left",
}

const accountActionsStyle = {
  marginTop: "16px",
  display: "flex",
  justifyContent: "flex-end",
}

const coachTabsWrapStyle = {
  display: "flex",
  gap: "10px",
  marginBottom: "16px",
  flexWrap: "wrap",
}

const coachTabButtonStyle = {
  padding: "12px 16px",
  borderRadius: "16px",
  border: `1px solid ${uiBorder}`,
  backgroundColor: uiSurface,
  color: "#18202b",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: "800",
  boxShadow: uiShadowSm,
}

const activeCoachTabButtonStyle = {
  background: "linear-gradient(135deg, #c62828 0%, #991b1b 100%)",
  color: "#ffffff",
  borderColor: "#b91c1c",
  boxShadow: "0 16px 28px rgba(198, 40, 40, 0.24)",
}

const workoutActionSectionStyle = {
  width: "100%",
  minWidth: 0,
  marginBottom: "24px",
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  gap: "12px",
}

const sectionTitleStyle = {
  ...sectionTitleStyleToken,
  marginBottom: "16px",
}

const cardStyle = {
  width: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  marginBottom: "20px",
  padding: 0,
  border: "none",
  borderRadius: 0,
  background: "transparent",
  boxShadow: "none",
}

const cardTitleStyle = {
  margin: "0 0 6px 0",
  ...itemTitleStyleToken,
}

const guideStyle = {
  margin: 0,
  fontSize: "14px",
  color: "#566173",
  lineHeight: 1.6,
}

const exerciseDescriptionStyle = {
  margin: 0,
  fontSize: "14px",
  color: "#18202b",
  lineHeight: 1.6,
  fontWeight: "700",
}

const exerciseDetailsLabelStyle = {
  marginBottom: "6px",
  fontSize: "12px",
  color: "#46607a",
  fontWeight: "800",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
}

const exerciseMediaWrapStyle = {
  marginBottom: 0,
}

const exerciseMediaStyle = {
  display: "block",
  width: "100%",
  maxWidth: "420px",
  borderRadius: "16px",
  border: "1px solid #e5e7eb",
  backgroundColor: "#111827",
}

const mutedTextStyle = {
  margin: 0,
  ...mutedBodyTextStyleToken,
}

const exerciseProgressStyle = (accent = playerAccent) => ({
  display: "inline-block",
  marginBottom: "12px",
  padding: "6px 10px",
  borderRadius: "999px",
  backgroundColor: getAccentTint(accent, 0.12),
  color: accent,
  fontFamily: playerMonoFont,
  fontSize: "10px",
  fontWeight: "700",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
})

const exerciseCarouselToolbarStyle = {
  marginBottom: "12px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "10px",
}

const exerciseCarouselStatusStyle = {
  flex: 1,
  textAlign: "center",
  fontSize: "13px",
  fontWeight: "800",
  color: "#566173",
}

const exerciseCarouselViewportStyle = {
  width: "100%",
  overflowX: "hidden",
  WebkitOverflowScrolling: "touch",
  scrollSnapType: "x mandatory",
  overscrollBehaviorX: "contain",
  paddingBottom: 0,
}

const exerciseCarouselTrackStyle = {
  display: "grid",
  gridAutoFlow: "column",
  gridAutoColumns: "100%",
  gap: "12px",
  alignItems: "start",
}

const exerciseSwipeCardStyle = {
  width: "100%",
  minWidth: 0,
  scrollSnapAlign: "start",
  scrollSnapStop: "always",
  marginBottom: 0,
  alignSelf: "start",
}

const activeWorkoutExerciseCardStyle = {
  padding: "0 0 12px",
  border: "none",
  borderRadius: 0,
  background: "transparent",
  boxShadow: "none",
}

const activeWorkoutExerciseShellStyle = {
  display: "grid",
  gap: "14px",
}

const activeWorkoutBottomNavStyle = {
  position: "fixed",
  left: "max(12px, env(safe-area-inset-left))",
  right: "max(12px, env(safe-area-inset-right))",
  bottom: "calc(12px + env(safe-area-inset-bottom))",
  zIndex: 80,
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) minmax(96px, auto) minmax(0, 1fr)",
  alignItems: "center",
  gap: "10px",
  padding: "10px",
  borderRadius: "24px",
  border: `1px solid ${playerLine}`,
  backgroundColor: "rgba(243, 239, 230, 0.94)",
  boxShadow: "0 18px 40px rgba(26, 24, 20, 0.12)",
  backdropFilter: "blur(14px)",
}

const activeWorkoutBottomNavButtonStyle = {
  minHeight: "48px",
  padding: "12px 14px",
  borderRadius: "18px",
  border: `1px solid ${playerLine}`,
  backgroundColor: "rgba(255, 255, 255, 0.9)",
  color: playerInk,
  fontSize: "14px",
  fontWeight: 900,
  boxShadow: "none",
}

const activeWorkoutBottomNavStatusStyle = {
  padding: "0 4px",
  textAlign: "center",
  fontFamily: playerMonoFont,
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: playerInkSoft,
}

const activeWorkoutExerciseHeaderRowStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "10px",
}

const activeWorkoutExerciseTitleRowStyle = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "10px",
  flexWrap: "nowrap",
}

const activeWorkoutExerciseTitleClusterStyle = {
  flex: "1 1 auto",
  minWidth: 0,
  display: "flex",
  alignItems: "flex-start",
  gap: "8px",
}

const activeWorkoutExerciseTitleStyle = {
  flex: "1 1 auto",
  minWidth: 0,
  margin: 0,
  fontFamily: playerDisplayFont,
  fontSize: "clamp(30px, 8vw, 46px)",
  lineHeight: 0.96,
  fontWeight: 700,
  letterSpacing: "-0.04em",
  color: playerInk,
}

const activeWorkoutInfoIconButtonStyle = {
  width: "28px",
  height: "28px",
  flex: "0 0 auto",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  marginTop: "4px",
  padding: 0,
  borderRadius: "999px",
  border: `1px solid ${playerLine}`,
  backgroundColor: "transparent",
  cursor: "pointer",
  fontFamily: playerMonoFont,
  fontSize: "13px",
  fontWeight: 700,
  lineHeight: 1,
}

const activeWorkoutTopPillButtonStyle = {
  padding: "10px 12px",
  borderRadius: "999px",
  border: `1px solid ${playerLine}`,
  backgroundColor: "transparent",
  cursor: "pointer",
  fontSize: "12px",
  fontWeight: 900,
  whiteSpace: "nowrap",
  alignSelf: "flex-start",
  flex: "0 0 auto",
}

const activeWorkoutSummaryGridStyle = (isMobile) => ({
  display: "grid",
  gap: 0,
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
})

const activeWorkoutSummaryStackStyle = {
  display: "grid",
  gap: "8px",
}

const activeWorkoutSummaryCellStyle = (side = "left") => ({
  minWidth: 0,
  padding: "12px 14px",
  borderRadius:
    side === "left"
      ? "18px 0 0 18px"
      : side === "right"
      ? "0 18px 18px 0"
      : "18px",
  border: `1px solid rgba(215, 208, 192, 0.72)`,
  backgroundColor: "rgba(255, 255, 255, 0.24)",
  marginLeft: side === "right" ? "-1px" : 0,
})

const activeWorkoutSummaryLabelStyle = {
  marginBottom: "8px",
  fontFamily: playerMonoFont,
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: playerInkSoft,
}

const activeWorkoutSummaryValueStyle = {
  fontFamily: playerDisplayFont,
  fontSize: "clamp(20px, 5.8vw, 30px)",
  lineHeight: 0.96,
  fontWeight: 650,
  letterSpacing: "-0.04em",
  color: playerInk,
  overflowWrap: "anywhere",
}

const activeWorkoutSummaryMetaStyle = {
  marginTop: "6px",
  fontSize: "11px",
  fontWeight: 800,
  color: playerInkSoft,
}

const activeWorkoutRestInlineButtonStyle = (accent = playerAccent) => ({
  width: "100%",
  minHeight: "58px",
  padding: "12px 16px",
  borderRadius: "18px",
  border: `1px solid ${getAccentTint(accent, 0.58)}`,
  backgroundColor: "#111111",
  color: accent,
  cursor: "pointer",
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)",
  alignItems: "center",
  gap: "10px",
  textAlign: "left",
  boxShadow: "0 16px 32px rgba(17, 17, 17, 0.28)",
})

const activeWorkoutRestInlineWrapStyle = {
  display: "grid",
  gap: "8px",
}

const activeWorkoutRestVisibilityButtonStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "16px",
  border: `1px solid ${playerLine}`,
  backgroundColor: "rgba(255, 255, 255, 0.24)",
  color: playerInkSoft,
  cursor: "pointer",
  fontSize: "12px",
  fontWeight: 900,
}

const activeWorkoutRestInlineLabelStyle = (accent = playerAccent) => ({
  fontFamily: playerMonoFont,
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: getAccentTint(accent, 0.8),
})

const activeWorkoutRestInlineValueStyle = (accent = playerAccent) => ({
  fontFamily: playerMonoFont,
  fontSize: "28px",
  lineHeight: 0.92,
  fontWeight: 800,
  letterSpacing: "0.02em",
  color: accent,
  justifySelf: "center",
})

const activeWorkoutRestInlineHintStyle = (accent = playerAccent) => ({
  fontSize: "11px",
  fontWeight: 800,
  color: getAccentTint(accent, 0.8),
  whiteSpace: "nowrap",
  justifySelf: "end",
})

const activeWorkoutSetListStyle = {
  display: "grid",
  gap: "10px",
}

const activeWorkoutReceiptRowStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "14px",
  padding: "14px 16px",
  borderRadius: "22px",
  border: `1px solid ${playerLine}`,
  backgroundColor: "rgba(255, 255, 255, 0.36)",
}

const activeWorkoutReceiptLabelStyle = {
  marginBottom: "6px",
  fontFamily: playerMonoFont,
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: playerInkSoft,
}

const activeWorkoutReceiptValueStyle = {
  fontFamily: playerDisplayFont,
  fontSize: "clamp(24px, 6.6vw, 30px)",
  lineHeight: 0.98,
  fontWeight: 650,
  letterSpacing: "-0.04em",
  color: playerInk,
  textDecoration: "line-through",
  textDecorationThickness: "1px",
  textDecorationColor: "rgba(26, 24, 20, 0.26)",
}

const activeWorkoutReceiptStatusStyle = {
  fontFamily: playerMonoFont,
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: playerInkSoft,
  whiteSpace: "nowrap",
}

const activeWorkoutReceiptActionsStyle = {
  display: "grid",
  gap: "8px",
  justifyItems: "end",
}

const activeWorkoutReceiptActionButtonStyle = {
  padding: "8px 12px",
  borderRadius: "999px",
  border: `1px solid ${playerLine}`,
  backgroundColor: "rgba(255, 255, 255, 0.78)",
  color: playerInk,
  cursor: "pointer",
  fontSize: "12px",
  fontWeight: 900,
}

const activeWorkoutUpcomingSetStyle = {
  padding: "12px 16px",
  borderRadius: "20px",
  border: `1px solid rgba(215, 208, 192, 0.72)`,
  backgroundColor: "rgba(255, 255, 255, 0.18)",
}

const activeWorkoutUpcomingValueStyle = {
  fontSize: "14px",
  fontWeight: 800,
  lineHeight: 1.4,
  color: playerInkSoft,
}

const activeWorkoutActiveSetStyle = {
  padding: "16px",
  borderRadius: "24px",
  border: `1px solid ${playerLine}`,
  backgroundColor: "rgba(255, 255, 255, 0.54)",
  boxShadow: "0 16px 30px rgba(26, 24, 20, 0.06)",
  display: "grid",
  gap: "12px",
}

const activeWorkoutActiveSetHeaderStyle = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "12px",
}

const activeWorkoutActiveSetTitleStyle = {
  fontSize: "20px",
  lineHeight: 1.1,
  fontWeight: 900,
  color: playerInk,
}

const activeWorkoutTimedTimerCardStyle = (state = "idle", expanded = false) => ({
  padding: "16px 18px",
  borderRadius: "24px",
  border: `1px solid ${
    state === "active" ? "rgba(176, 51, 39, 0.36)" : "rgba(215, 208, 192, 0.82)"
  }`,
  backgroundColor:
    state === "active" ? "rgba(176, 51, 39, 0.10)" : "rgba(255, 255, 255, 0.24)",
  display: "grid",
  gap: expanded ? "12px" : "8px",
  minHeight: expanded ? "280px" : undefined,
  alignContent: expanded ? "center" : undefined,
  justifyItems: expanded ? "center" : undefined,
  textAlign: expanded ? "center" : undefined,
})

const activeWorkoutTimedTimerLabelStyle = {
  fontFamily: playerMonoFont,
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: playerInkSoft,
}

const activeWorkoutTimedTimerValueStyle = (expanded = false) => ({
  fontFamily: playerMonoFont,
  fontSize: expanded ? "clamp(64px, 18vw, 116px)" : "clamp(34px, 9vw, 46px)",
  lineHeight: 0.92,
  fontWeight: 700,
  letterSpacing: "-0.04em",
  color: playerInk,
})

const activeWorkoutTimedTimerHintStyle = {
  fontSize: "14px",
  lineHeight: 1.45,
  fontWeight: 800,
  color: playerInkSoft,
}

const activeWorkoutStepperGridStyle = (columns = 1) => ({
  display: "grid",
  gap: "10px",
  gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
})

const activeWorkoutStepperFieldStyle = {
  display: "grid",
  gap: "8px",
}

const activeWorkoutStepperLabelStyle = {
  fontFamily: playerMonoFont,
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: playerInkSoft,
}

const activeWorkoutStepperControlStyle = {
  display: "grid",
  gridTemplateColumns: "46px minmax(0, 1fr) 46px",
  alignItems: "stretch",
  gap: "8px",
}

const activeWorkoutStepperButtonStyle = {
  border: `1px solid ${playerLine}`,
  borderRadius: "18px",
  backgroundColor: "rgba(255, 255, 255, 0.88)",
  color: playerInk,
  cursor: "pointer",
  fontSize: "24px",
  lineHeight: 1,
  fontWeight: 500,
}

const activeWorkoutStepperValueStyle = {
  minHeight: "72px",
  padding: "12px 14px",
  borderRadius: "20px",
  border: `1px solid ${playerLine}`,
  backgroundColor: "rgba(243, 239, 230, 0.72)",
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "center",
  gap: "6px",
  fontFamily: playerDisplayFont,
  fontSize: "clamp(30px, 9vw, 40px)",
  lineHeight: 0.9,
  fontWeight: 650,
  letterSpacing: "-0.05em",
  color: playerInk,
}

const activeWorkoutStepperInputStyle = {
  width: "100%",
  minWidth: 0,
  padding: 0,
  border: "none",
  outline: "none",
  backgroundColor: "transparent",
  textAlign: "center",
  fontFamily: playerDisplayFont,
  fontSize: "clamp(30px, 9vw, 40px)",
  lineHeight: 0.9,
  fontWeight: 650,
  letterSpacing: "-0.05em",
  color: playerInk,
}

const activeWorkoutStepperUnitStyle = {
  marginBottom: "4px",
  fontFamily: playerMonoFont,
  fontSize: "11px",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: playerInkSoft,
}

const activeWorkoutStepperHintButtonStyle = (accent = playerAccent) => ({
  width: "fit-content",
  padding: 0,
  border: "none",
  backgroundColor: "transparent",
  color: accent,
  cursor: "pointer",
  fontSize: "13px",
  fontWeight: 900,
})

const activeWorkoutPrimaryActionStyle = (accent = playerAccent) => ({
  width: "100%",
  padding: "16px 18px",
  borderRadius: "22px",
  border: `1px solid ${accent}`,
  background: accent,
  color: playerPaper,
  cursor: "pointer",
  fontSize: "16px",
  fontWeight: 900,
  boxShadow: `0 16px 32px ${getAccentTint(accent, 0.18)}`,
})

const activeWorkoutEditActionsStyle = {
  display: "grid",
  gap: "10px",
}

const activeWorkoutEditCancelButtonStyle = {
  width: "100%",
  padding: "14px 18px",
  borderRadius: "20px",
  border: `1px solid ${playerLine}`,
  backgroundColor: "rgba(255, 255, 255, 0.24)",
  color: playerInk,
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: 900,
}

const activeWorkoutSubtleHintStyle = {
  fontSize: "13px",
  lineHeight: 1.45,
  fontWeight: 800,
  color: playerInkSoft,
}

const activeWorkoutGhostActionsStyle = {
  display: "grid",
  gap: "8px",
}

const activeWorkoutGhostActionButtonStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: "18px",
  border: `1px solid ${playerLine}`,
  backgroundColor: "rgba(255, 255, 255, 0.24)",
  color: playerInk,
  cursor: "pointer",
  display: "grid",
  gap: "4px",
  textAlign: "left",
  boxShadow: "none",
}

const activeWorkoutGhostActionLabelStyle = {
  fontFamily: playerMonoFont,
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: playerInkSoft,
}

const activeWorkoutGhostActionValueStyle = {
  fontSize: "14px",
  fontWeight: 900,
  color: playerInk,
}

const activeWorkoutDetailPanelStyle = {
  padding: "14px",
  borderRadius: "20px",
  border: `1px solid ${playerLine}`,
  backgroundColor: "rgba(243, 239, 230, 0.72)",
}

const activeWorkoutBilateralPanelStyle = {
  padding: "16px",
  borderRadius: "24px",
  border: `1px solid ${playerLine}`,
  backgroundColor: "rgba(255, 255, 255, 0.54)",
  boxShadow: "0 16px 30px rgba(26, 24, 20, 0.06)",
  display: "grid",
  gap: "12px",
}

const activeWorkoutBilateralHalvesStyle = (isMobile) => ({
  display: "grid",
  gap: "10px",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
})

const activeWorkoutBilateralHalfStyle = {
  width: "100%",
  padding: "14px",
  borderRadius: "22px",
  border: `1px solid ${playerLine}`,
  appearance: "none",
  display: "grid",
  gap: "4px",
}

const activeWorkoutBilateralHalfLabelStyle = {
  marginBottom: "10px",
  fontFamily: playerMonoFont,
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: playerInkSoft,
}

const activeWorkoutBilateralHalfValueStyle = {
  display: "flex",
  alignItems: "flex-end",
  gap: "6px",
  fontFamily: playerDisplayFont,
  fontSize: "clamp(28px, 8vw, 38px)",
  lineHeight: 0.9,
  fontWeight: 650,
  letterSpacing: "-0.05em",
  color: playerInk,
}

const activeWorkoutBilateralHalfMetaStyle = {
  marginTop: "10px",
  fontSize: "13px",
  fontWeight: 800,
  color: playerInkSoft,
}

const activeWorkoutBilateralTableStyle = {
  borderRadius: "20px",
  border: `1px solid ${playerLine}`,
  backgroundColor: "rgba(255, 255, 255, 0.22)",
  overflow: "hidden",
}

const activeWorkoutBilateralTableHeaderStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.2fr) repeat(2, minmax(0, 1fr))",
  gap: "10px",
  padding: "12px 14px",
  borderBottom: `1px solid ${playerLine}`,
  fontFamily: playerMonoFont,
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: playerInkSoft,
}

const activeWorkoutBilateralTableRowStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.2fr) repeat(2, minmax(0, 1fr))",
  gap: "10px",
  padding: "12px 14px",
  borderBottom: `1px solid rgba(215, 208, 192, 0.6)`,
  fontFamily: playerMonoFont,
  fontSize: "13px",
  fontWeight: 700,
  color: playerInk,
}

const activeWorkoutEmptyStateStyle = {
  padding: "18px",
  borderRadius: "22px",
  border: `1px dashed ${playerLine}`,
  backgroundColor: "rgba(255, 255, 255, 0.18)",
  fontSize: "14px",
  fontWeight: 800,
  color: playerInkSoft,
}

const activeWarmupScreenStyle = {
  display: "grid",
  gap: "20px",
}

const activeWarmupTitleStyle = {
  margin: 0,
  fontFamily: playerDisplayFont,
  fontSize: "clamp(32px, 8.5vw, 44px)",
  lineHeight: 0.94,
  fontWeight: 700,
  letterSpacing: "-0.04em",
  color: playerInk,
}

const activeWarmupLeadStyle = {
  maxWidth: "420px",
  fontSize: "15px",
  lineHeight: 1.45,
  fontWeight: 800,
  color: playerInkSoft,
}

const activeWarmupGridStyle = (isMobile) => ({
  display: "grid",
  gap: isMobile ? "28px" : "36px",
  gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
})

const activeWarmupBlockStyle = {
  display: "grid",
  gap: "16px",
  alignContent: "start",
}

const activeWarmupBlockLabelStyle = {
  margin: 0,
  fontFamily: playerDisplayFont,
  fontSize: "clamp(28px, 7.4vw, 38px)",
  lineHeight: 0.98,
  fontWeight: 650,
  letterSpacing: "-0.04em",
  color: playerInk,
}

const activeWarmupBlockTextStyle = {
  maxWidth: "34ch",
  fontSize: "16px",
  lineHeight: 1.55,
  fontWeight: 500,
  color: playerInkSoft,
}

const activeWarmupStepsStyle = {
  display: "grid",
  gap: "14px",
}

const activeWarmupStepStyle = {
  display: "grid",
  gridTemplateColumns: "28px minmax(0, 1fr)",
  gap: "10px",
  alignItems: "start",
}

const activeWarmupStepIndexStyle = {
  fontFamily: playerMonoFont,
  fontSize: "11px",
  lineHeight: 1.6,
  fontWeight: 700,
  letterSpacing: "0.08em",
  color: playerInkSoft,
}

const activeWarmupStepTextStyle = {
  maxWidth: "34ch",
  fontSize: "16px",
  lineHeight: 1.55,
  fontWeight: 500,
  color: playerInkSoft,
}

const activeLiftHeroStyle = {
  marginBottom: "14px",
}

const activeLiftTitleStyle = {
  margin: 0,
  fontFamily: playerDisplayFont,
  fontSize: "clamp(30px, 8vw, 46px)",
  lineHeight: 0.96,
  fontWeight: 700,
  letterSpacing: "-0.04em",
  color: playerInk,
}

const activeLiftSideHintStyle = (accent = playerAccent) => ({
  marginTop: "10px",
  display: "inline-flex",
  padding: "7px 10px",
  borderRadius: "999px",
  backgroundColor: getAccentTint(accent, 0.12),
  color: accent,
  fontSize: "12px",
  fontWeight: 900,
})

const activeWorkoutFinishTitleStyle = {
  margin: "0 0 8px",
  fontFamily: playerDisplayFont,
  fontSize: "clamp(36px, 10vw, 54px)",
  lineHeight: 0.95,
  fontWeight: 650,
  letterSpacing: "-0.05em",
  color: playerInk,
}

const activeWorkoutFinishButtonStyle = (accent = playerAccent) => ({
  background: accent,
  boxShadow: `0 14px 28px ${getAccentTint(accent, 0.18)}`,
})

const activeLiftDataGridStyle = (isMobile) => ({
  display: "grid",
  gap: "10px",
  gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
  marginBottom: "12px",
})

const activeLiftDataCardStyle = {
  padding: "15px",
  borderRadius: "20px",
  border: `1px solid ${playerLine}`,
  backgroundColor: "rgba(243, 239, 230, 0.58)",
}

const activeLiftDataLabelStyle = {
  marginBottom: "8px",
  fontFamily: playerMonoFont,
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: playerInkSoft,
}

const activeLiftDataValueStyle = {
  fontFamily: playerDisplayFont,
  fontSize: "clamp(24px, 7vw, 34px)",
  lineHeight: 0.95,
  fontWeight: 650,
  letterSpacing: "-0.04em",
  color: playerInk,
}

const activeLiftDataMetaStyle = {
  marginTop: "8px",
  fontSize: "12px",
  fontWeight: 800,
  color: playerInkSoft,
}

const activeLiftLogHeaderStyle = (isMobile) => ({
  display: "grid",
  gap: "8px",
  gridTemplateColumns: isMobile ? "minmax(0, 1fr) minmax(118px, 0.7fr)" : "minmax(220px, 0.8fr) minmax(180px, 0.6fr)",
  alignItems: "stretch",
  margin: "14px 0 10px",
})

const activeLiftRestButtonStyle = {
  ...restStopwatchCardStyle,
  minHeight: "82px",
  display: "grid",
  gap: "3px",
  alignContent: "center",
}

const activeLiftAddSetButtonStyle = {
  minHeight: "82px",
  padding: "14px",
  borderRadius: "20px",
  border: `1px solid ${playerAccent}`,
  background: playerAccent,
  color: playerPaper,
  cursor: "pointer",
  fontSize: "16px",
  fontWeight: 900,
  boxShadow: "0 16px 30px rgba(176, 51, 39, 0.18)",
}

const activeLiftSupportGridStyle = (isMobile) => ({
  display: "grid",
  gap: "8px",
  gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
  marginBottom: "12px",
})

const activeLiftSupportPanelStyle = {
  marginBottom: "12px",
  borderRadius: "20px",
  border: `1px solid ${playerLine}`,
  backgroundColor: "rgba(26, 24, 20, 0.04)",
  overflow: "hidden",
}

const activeLiftSupportButtonStyle = {
  width: "100%",
  minHeight: "66px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  padding: "14px 16px",
  border: "none",
  backgroundColor: "transparent",
  color: playerInk,
  textAlign: "left",
  cursor: "pointer",
}

const activeLiftSupportKickerStyle = {
  display: "block",
  marginBottom: "4px",
  fontFamily: playerMonoFont,
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: playerInkSoft,
}

const activeLiftSupportTitleStyle = {
  display: "block",
  fontSize: "15px",
  fontWeight: 900,
  color: playerInk,
}

const activeLiftSupportIconStyle = {
  width: "34px",
  height: "34px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "999px",
  backgroundColor: playerInk,
  color: playerPaper,
  fontSize: "22px",
  lineHeight: 1,
}

const activeLiftComposerStyle = {
  margin: "0 12px 12px",
  padding: "14px",
  borderRadius: "18px",
  border: `1px solid ${playerLine}`,
  backgroundColor: "rgba(243, 239, 230, 0.72)",
}

const targetSectionLabelStyle = {
  fontFamily: playerMonoFont,
  fontSize: "10px",
  color: playerInkSoft,
  fontWeight: "700",
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  marginBottom: "8px",
}

const activeLiftComposerHintStyle = {
  marginBottom: "10px",
  fontSize: "13px",
  fontWeight: "700",
  lineHeight: 1.5,
  color: playerInkSoft,
}

const activeLiftChoiceGridStyle = (isMobile) => ({
  display: "grid",
  gap: "8px",
  gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))",
  marginBottom: "10px",
})

const activeLiftSecondaryActionStyle = {
  ...secondaryButtonStyle,
  border: `1px solid ${playerLine}`,
  backgroundColor: "rgba(255, 255, 255, 0.36)",
  color: playerInk,
  boxShadow: "none",
}

const activeLiftChoiceButtonStyle = {
  ...activeLiftSecondaryActionStyle,
  justifyContent: "center",
  minHeight: "46px",
  borderRadius: "14px",
}

const activeLiftChoiceButtonActiveStyle = (accent = playerAccent) => ({
  backgroundColor: getAccentTint(accent, 0.12),
  borderColor: accent,
  color: accent,
})

const activeSetCardStyle = {
  marginBottom: "8px",
  padding: "13px",
  borderRadius: "20px",
  backgroundColor: "rgba(243, 239, 230, 0.72)",
  border: `1px solid ${playerLine}`,
}

const setInputHintStyle = {
  marginTop: "8px",
  fontSize: "12px",
  color: playerInkSoft,
}

const exerciseCommentCardStyle = {
  marginBottom: "12px",
  padding: "12px",
  borderRadius: "16px",
  backgroundColor: "rgba(255, 255, 255, 0.28)",
  border: `1px solid ${playerLine}`,
}

const alternativeSelectionCardStyle = {
  marginBottom: "12px",
  padding: "14px",
  borderRadius: "20px",
  backgroundColor: "rgba(243, 239, 230, 0.58)",
  border: `1px solid ${playerLine}`,
}

const alternativeSelectionHintStyle = {
  marginBottom: "10px",
  fontSize: "12px",
  color: playerInkSoft,
}

const alternativeSelectionOptionListStyle = {
  display: "grid",
  gap: "8px",
}

const alternativeSelectionOptionStyle = {
  width: "100%",
  padding: "12px",
  borderRadius: "14px",
  border: `1px solid ${playerLine}`,
  textAlign: "left",
  cursor: "pointer",
}

const alternativeSelectionOptionNameStyle = {
  fontSize: "14px",
  fontWeight: "800",
}

const alternativeSelectionOptionMetaStyle = {
  marginTop: "4px",
  fontSize: "12px",
  color: playerInkSoft,
}

const alternativeSelectionMetaStyle = {
  display: "inline-flex",
  marginBottom: "10px",
  padding: "5px 9px",
  borderRadius: "999px",
  backgroundColor: "#eff6ff",
  color: "#1d4ed8",
  fontSize: "12px",
  fontWeight: "800",
}

const exerciseCommentTitleStyle = {
  marginBottom: "8px",
  fontSize: "13px",
  fontWeight: "800",
  color: playerInk,
}
const setLabelStyle = {
  fontFamily: playerMonoFont,
  fontSize: "11px",
  fontWeight: "700",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: playerInkSoft,
  marginBottom: "8px",
}

const setHeaderRowStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "10px",
  marginBottom: "8px",
}

const setTypeToggleStyle = {
  padding: "7px 10px",
  borderRadius: "999px",
  border: `1px solid ${playerLine}`,
  backgroundColor: playerInk,
  color: playerPaper,
  cursor: "pointer",
  fontSize: "12px",
  fontWeight: "800",
  whiteSpace: "nowrap",
}

const setInputsRowStyle = {
  display: "flex",
  gap: "8px",
  flexWrap: "nowrap",
}

const compactSetInputStyle = {
  flex: 1,
  minWidth: 0,
  minHeight: "52px",
  fontSize: "18px",
  fontWeight: 900,
  textAlign: "center",
}

const textareaStyle = {
  resize: "vertical",
  minHeight: "104px",
  fontFamily: "inherit",
}

const compactSetRemoveButtonStyle = {
  flex: "0 0 auto",
  whiteSpace: "nowrap",
}

const inputStyle = {
  padding: "12px 14px",
  borderRadius: "14px",
  border: `1px solid ${uiBorderStrong}`,
  fontFamily: "inherit",
  fontSize: "14px",
  minWidth: "120px",
  backgroundColor: uiSurface,
  color: "#18202b",
  boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.7)",
}

const buttonStyle = {
  padding: "12px 16px",
  borderRadius: "16px",
  border: "none",
  background: "linear-gradient(135deg, #c62828 0%, #991b1b 100%)",
  color: "#ffffff",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: "800",
  boxShadow: "0 14px 28px rgba(198, 40, 40, 0.22)",
}

const secondaryButtonStyle = {
  padding: "12px 16px",
  borderRadius: "16px",
  border: `1px solid ${uiBorderStrong}`,
  backgroundColor: uiSurface,
  color: "#18202b",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: "800",
  boxShadow: uiShadowSm,
}

const removeButtonStyle = {
  padding: "10px 12px",
  borderRadius: "12px",
  border: `1px solid ${uiBorder}`,
  backgroundColor: uiSurface,
  color: "#566173",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: "700",
}

const pickerGridStyle = {
  marginTop: "12px",
  display: "grid",
  gap: "12px",
  width: "100%",
}

const playerPassPageTitleStyle = {
  margin: "8px 0 6px",
  fontFamily: playerDisplayFont,
  fontSize: "clamp(38px, 10vw, 60px)",
  lineHeight: 0.92,
  fontWeight: 700,
  letterSpacing: "-0.04em",
  color: playerInk,
}

const playerPassPageTextStyle = {
  margin: 0,
  maxWidth: "560px",
  fontSize: "15px",
  lineHeight: 1.55,
  fontWeight: 700,
  color: playerInkSoft,
}

const playerPassBackButtonStyle = {
  marginTop: "16px",
  padding: "11px 14px",
  borderRadius: "999px",
  border: `1px solid ${playerLine}`,
  backgroundColor: "rgba(26, 24, 20, 0.06)",
  color: playerInk,
  cursor: "pointer",
  fontSize: "13px",
  fontWeight: 900,
  width: "fit-content",
}

const playerRunningHubStyle = {
  display: "grid",
  gap: "12px",
}

const playerRunningHubGridStyle = (isMobile) => ({
  display: "grid",
  gap: "10px",
  gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))",
})

const playerRunningHubCardStyle = (variant = "assigned") => {
  const theme = getPlayerTrainingTheme("running")

  return {
    minHeight: "116px",
    padding: "15px",
    borderRadius: "16px",
    border: `1px solid ${theme.softBorder}`,
    background: theme.softBackground,
    color: theme.softText,
    textAlign: "left",
    cursor: "pointer",
    boxShadow: theme.softShadow,
    display: "grid",
    alignContent: "space-between",
    gap: "10px",
  }
}

const playerRunningHubCardKickerStyle = (variant = "assigned") => {
  const theme = getPlayerTrainingTheme("running")

  return {
    ...playerHomeTrainingKickerStyle,
    color: theme.softMeta,
  }
}

const playerRunningHubCardTitleStyle = (variant = "assigned") => {
  const theme = getPlayerTrainingTheme("running")

  return {
    fontSize: "18px",
    fontWeight: 900,
    color: theme.softText,
  }
}

const playerRunningHubCardTextStyle = (variant = "assigned") => {
  const theme = getPlayerTrainingTheme("running")

  return {
    ...playerHomeTrainingTextStyle,
    color: theme.softMeta,
  }
}

const playerRunningRegistrationPageStyle = (() => {
  const theme = getPlayerTrainingTheme("running")

  return {
    padding: "18px",
    borderRadius: "16px",
    border: `1px solid ${theme.softBorder}`,
    background: theme.softBackground,
    display: "grid",
    gap: "14px",
  }
})()

const playerRunningRegistrationHeaderStyle = {
  display: "grid",
  gap: "6px",
}

const playerRunningRegistrationTitleStyle = {
  fontFamily: playerDisplayFont,
  fontSize: "clamp(30px, 8vw, 46px)",
  lineHeight: 0.94,
  fontWeight: 700,
  letterSpacing: "-0.04em",
  color: playerInk,
}

const playerRunningRegistrationGridStyle = (isMobile) => ({
  display: "grid",
  gap: "10px",
  gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
})

const playerRecommendedPassSectionStyle = {
  display: "grid",
  gap: "12px",
}

const playerPassSectionHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-end",
  gap: "12px",
  padding: "0 4px",
}

const playerPassSectionTitleStyle = {
  marginTop: "6px",
  fontFamily: playerDisplayFont,
  fontSize: "clamp(30px, 8vw, 46px)",
  lineHeight: 0.92,
  fontWeight: 650,
  letterSpacing: "-0.05em",
  color: playerInk,
}

const playerShelfSectionTitleStyle = {
  ...playerPassSectionTitleStyle,
  fontSize: "clamp(26px, 7vw, 38px)",
}

const playerPassSectionCountStyle = {
  fontFamily: playerMonoFont,
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: playerInkSoft,
  whiteSpace: "nowrap",
}

const playerFeaturedPassGridStyle = (isMobile) => ({
  display: "grid",
  gap: "12px",
  gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
})

const playerFeaturedPassWrapStyle = {
  display: "grid",
  gap: "0",
}

const playerFeaturedPassCardStyle = (themeKey = "strength") => {
  const theme = getPlayerTrainingTheme(themeKey)

  return {
    minHeight: "190px",
    width: "100%",
    padding: "20px",
    borderRadius: "16px",
    border: `1px solid ${theme.filledBorder}`,
    background: theme.filledBackground,
    color: theme.filledText,
    textAlign: "left",
    cursor: "pointer",
    boxShadow: theme.filledShadow,
  }
}

const playerFeaturedPassMetaRowStyle = (themeKey = "strength") => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "10px",
  marginBottom: "20px",
  fontFamily: playerMonoFont,
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: getPlayerTrainingTheme(themeKey).filledMeta,
})

const playerFeaturedPassTitleStyle = {
  fontFamily: playerDisplayFont,
  fontSize: "clamp(32px, 9vw, 52px)",
  lineHeight: 0.9,
  fontWeight: 650,
  letterSpacing: "-0.06em",
}

const playerFeaturedPassSummaryStyle = (themeKey = "strength") => ({
  marginTop: "10px",
  fontSize: "15px",
  lineHeight: 1.4,
  fontWeight: 800,
  color: getPlayerTrainingTheme(themeKey).filledMeta,
})

const playerFeaturedPassFooterStyle = (themeKey = "strength") => ({
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  marginTop: "20px",
  paddingTop: "14px",
  borderTop:
    themeKey === "strength" || themeKey === "running"
      ? "1px solid rgba(243, 239, 230, 0.16)"
      : `1px solid ${getPlayerTrainingTheme(themeKey).softBorder}`,
  fontFamily: playerMonoFont,
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: getPlayerTrainingTheme(themeKey).filledMeta,
})

const playerFeaturedPassDetailsStyle = {
  padding: "14px",
  borderRadius: "0 0 16px 16px",
  border: `1px solid ${playerLine}`,
  borderTop: "none",
  background:
    "linear-gradient(180deg, rgba(243, 239, 230, 0.86), rgba(235, 224, 208, 0.72))",
}

const playerShelfPassSectionStyle = {
  display: "grid",
  gap: "12px",
  padding: "16px",
  borderRadius: "16px",
  border: `1px solid ${playerLine}`,
  backgroundColor: "rgba(255, 255, 255, 0.22)",
}

const playerShelfPassListStyle = {
  display: "grid",
  gap: "8px",
}

const playerShelfPassWrapStyle = {
  display: "grid",
}

const playerShelfPassButtonStyle = (themeKey = "strength") => ({
  width: "100%",
  minHeight: "72px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  padding: "13px 14px",
  borderRadius: "14px",
  border: `1px solid ${getPlayerTrainingTheme(themeKey).softBorder}`,
  background: getPlayerTrainingTheme(themeKey).softBackground,
  color: getPlayerTrainingTheme(themeKey).softText,
  textAlign: "left",
  cursor: "pointer",
})

const playerShelfPassButtonActiveStyle = (themeKey = "strength") => ({
  background: getPlayerTrainingTheme(themeKey).filledBackground,
  borderColor: getPlayerTrainingTheme(themeKey).filledBorder,
  color: getPlayerTrainingTheme(themeKey).filledText,
  boxShadow: getPlayerTrainingTheme(themeKey).filledShadow,
})

const playerShelfPassTitleStyle = {
  fontSize: "16px",
  fontWeight: 900,
  overflowWrap: "anywhere",
}

const playerShelfPassMetaStyle = {
  marginTop: "5px",
  fontSize: "12px",
  lineHeight: 1.4,
  fontWeight: 800,
  opacity: 0.68,
}

const playerShelfPassRightStyle = {
  display: "grid",
  justifyItems: "end",
  gap: "8px",
  flexShrink: 0,
  fontFamily: playerMonoFont,
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
}

const playerShelfPassExpandStyle = {
  width: "30px",
  height: "30px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "999px",
  backgroundColor: "rgba(255, 255, 255, 0.18)",
  fontSize: "20px",
  lineHeight: 1,
}

const playerShelfPassDetailsStyle = {
  padding: "12px 0 4px",
}

const playerPassStartButtonStyle = (themeKey = "strength") => {
  const accent = getCategoryAccent(themeKey)

  return {
    background: accent,
    boxShadow: `0 14px 28px ${getAccentTint(accent, 0.18)}`,
  }
}

const playerRunningActionButtonStyle = {
  width: "100%",
  minHeight: "50px",
  padding: "13px 15px",
  borderRadius: "16px",
  border: `1px solid ${getPlayerTrainingTheme("running").softBorder}`,
  background: getPlayerTrainingTheme("running").softBackground,
  color: getPlayerTrainingTheme("running").softText,
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: 900,
  boxShadow: getPlayerTrainingTheme("running").softShadow,
}

const passPreviewContentCardStyle = {
  padding: "16px",
  borderRadius: "20px",
  border: `1px solid ${playerLine}`,
  backgroundColor: "rgba(243, 239, 230, 0.66)",
  marginBottom: "14px",
}

const runningPassPreviewPanelStyle = {
  marginBottom: "14px",
  padding: "16px",
  borderRadius: "20px",
  border: `1px solid ${playerLine}`,
  backgroundColor: "rgba(243, 239, 230, 0.66)",
}

const runningPassPreviewInstructionStyle = {
  padding: "12px 0 2px",
}

const passPreviewMetaStripStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: "7px",
  marginBottom: "14px",
  fontFamily: playerMonoFont,
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: playerInkSoft,
}

const passPreviewInfoBlockStyle = {
  marginBottom: "14px",
  padding: "12px",
  borderRadius: "16px",
  border: `1px solid ${playerLine}`,
  backgroundColor: "rgba(255, 255, 255, 0.24)",
}

const passPreviewSectionHeaderStyle = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "12px",
  marginBottom: "12px",
}

const passPreviewCountPillStyle = {
  flexShrink: 0,
  padding: "7px 10px",
  borderRadius: "999px",
  backgroundColor: playerInk,
  color: playerPaper,
  fontFamily: playerMonoFont,
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
}

const passPreviewStatLabelStyle = {
  fontSize: "11px",
  color: playerInkSoft,
  fontWeight: "800",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  marginBottom: "6px",
}

const passPreviewInfoTextStyle = {
  fontSize: "14px",
  color: playerInk,
  fontWeight: "700",
  lineHeight: 1.5,
}

const passPreviewExerciseCountStyle = {
  fontFamily: playerDisplayFont,
  fontSize: "clamp(24px, 7vw, 36px)",
  lineHeight: 0.95,
  color: playerInk,
  fontWeight: 650,
  letterSpacing: "-0.05em",
}

const passPreviewListWrapStyle = {
  marginBottom: 0,
}

const passPreviewExerciseStackStyle = {
  display: "grid",
  gap: "8px",
}

const passPreviewListItemStyle = {
  display: "grid",
  gridTemplateColumns: "28px minmax(0, 1fr)",
  alignItems: "center",
  gap: "10px",
  padding: "10px 0",
  borderBottom: `1px solid ${playerLine}`,
  color: playerInk,
  fontSize: "13px",
  fontWeight: "800",
}

const passPreviewExerciseIndexStyle = {
  display: "inline-flex",
  width: "28px",
  height: "28px",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "999px",
  backgroundColor: "rgba(26, 24, 20, 0.08)",
  color: playerInkSoft,
  fontSize: "12px",
  fontWeight: "800",
}

const passPreviewExerciseNameStyle = {
  minWidth: 0,
  overflowWrap: "anywhere",
}

const passPreviewEmptyStyle = {
  fontSize: "14px",
  color: "#9ca3af",
  fontStyle: "italic",
}

const statusStyle = {
  fontSize: "14px",
  color: "#991b1b",
  marginTop: 0,
  marginBottom: "16px",
  fontWeight: "700",
}

const coachNavCardStyle = {
  padding: "18px",
  borderRadius: "20px",
  border: `1px solid ${uiBorder}`,
  background: uiSurface,
  textAlign: "left",
  cursor: "pointer",
  boxShadow: uiShadowMd,
}

const coachNavTitleStyle = {
  fontWeight: "900",
  fontSize: "18px",
  color: "#18202b",
  marginBottom: "6px",
}

const coachNavTextStyle = {
  fontSize: "14px",
  color: "#566173",
  lineHeight: 1.5,
}

const accountHeaderStyle = (isMobile) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: isMobile ? "stretch" : "flex-start",
  flexDirection: isMobile ? "column" : "row",
  gap: "12px",
  marginBottom: "16px",
})

const accountGridStyle = (isMobile) => ({
  display: "grid",
  gap: "12px",
  gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
})

const accountActionGridStyle = (isMobile) => ({
  display: "flex",
  gap: "10px",
  flexDirection: isMobile ? "column" : "row",
  flexWrap: "wrap",
  marginTop: "16px",
})

const accountPasswordCardStyle = {
  marginTop: "16px",
  padding: "16px",
  borderRadius: "18px",
  border: `1px solid ${uiBorder}`,
  backgroundColor: uiSurfaceAlt,
}

const accountPasswordTitleStyle = {
  fontSize: "14px",
  fontWeight: "900",
  color: "#18202b",
  marginBottom: "6px",
}

const accountPasswordTextStyle = {
  fontSize: "14px",
  lineHeight: 1.6,
  color: "#475569",
  marginBottom: "12px",
}

const accountPasswordFormStyle = (isMobile) => ({
  display: "grid",
  gap: "10px",
  gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr)) auto",
  alignItems: "center",
})

const accountInfoCardStyle = {
  padding: "16px",
  borderRadius: "18px",
  border: `1px solid ${uiBorder}`,
  backgroundColor: uiSurface,
}

const accountInfoLabelStyle = {
  fontSize: "12px",
  fontWeight: "800",
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  marginBottom: "6px",
}

const accountInfoValueStyle = {
  fontSize: "18px",
  fontWeight: "900",
  color: "#18202b",
}

const accountWarningCardStyle = {
  marginTop: "16px",
  padding: "16px",
  borderRadius: "18px",
  border: "1px solid #f3d1d1",
  backgroundColor: "#fff7f7",
}

const accountWarningTitleStyle = {
  fontSize: "14px",
  fontWeight: "900",
  color: "#991b1b",
  marginBottom: "6px",
}

const accountWarningTextStyle = {
  fontSize: "14px",
  lineHeight: 1.6,
  color: "#5f2a2a",
}

const playerAccountPanelStyle = {
  padding: "20px",
  borderRadius: "28px",
  border: `1px solid ${playerLine}`,
  background:
    "radial-gradient(circle at top left, rgba(217, 74, 31, 0.08), transparent 30%), linear-gradient(180deg, rgba(255, 255, 255, 0.32), rgba(243, 239, 230, 0.72))",
  boxShadow: "0 20px 38px rgba(26, 24, 20, 0.08)",
}

const playerAccountInfoCardStyle = {
  padding: "16px",
  borderRadius: "20px",
  border: `1px solid ${playerLine}`,
  backgroundColor: "rgba(255, 255, 255, 0.28)",
}

const playerAccountInfoLabelStyle = {
  fontFamily: playerMonoFont,
  fontSize: "10px",
  fontWeight: "700",
  color: playerInkSoft,
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  marginBottom: "8px",
}

const playerAccountInfoValueStyle = {
  fontFamily: playerDisplayFont,
  fontSize: "24px",
  lineHeight: 0.98,
  fontWeight: "700",
  letterSpacing: "-0.04em",
  color: playerInk,
}

const playerAccountGhostButtonStyle = {
  ...activeLiftSecondaryActionStyle,
  padding: "12px 16px",
  borderRadius: "16px",
  fontSize: "14px",
  fontWeight: "800",
}

const playerAccountDangerButtonStyle = {
  ...dangerActionButtonStyle,
  border: "1px solid rgba(185, 28, 28, 0.2)",
  backgroundColor: "rgba(185, 28, 28, 0.08)",
  color: "#991b1b",
  boxShadow: "none",
}

const playerAccountPasswordCardStyle = {
  marginTop: "16px",
  padding: "18px",
  borderRadius: "22px",
  border: `1px solid ${playerLine}`,
  backgroundColor: "rgba(255, 255, 255, 0.26)",
}

const playerAccountSectionTitleStyle = {
  fontFamily: playerDisplayFont,
  fontSize: "clamp(22px, 6vw, 28px)",
  lineHeight: 0.98,
  fontWeight: "700",
  letterSpacing: "-0.04em",
  color: playerInk,
  marginBottom: "6px",
}

const playerAccountSectionTextStyle = {
  fontSize: "14px",
  lineHeight: 1.6,
  color: playerInkSoft,
  marginBottom: "12px",
}

const playerAccountFieldLabelStyle = {
  fontFamily: playerMonoFont,
  fontSize: "10px",
  fontWeight: "700",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: playerInkSoft,
  marginBottom: "8px",
}

const playerAccountWarningCardStyle = {
  marginTop: "16px",
  padding: "18px",
  borderRadius: "22px",
  border: "1px solid rgba(185, 28, 28, 0.16)",
  backgroundColor: "rgba(185, 28, 28, 0.06)",
}

const playerAccountWarningTitleStyle = {
  fontFamily: playerDisplayFont,
  fontSize: "clamp(22px, 6vw, 28px)",
  lineHeight: 0.98,
  fontWeight: "700",
  letterSpacing: "-0.04em",
  color: "#991b1b",
  marginBottom: "6px",
}

const playerAccountWarningTextStyle = {
  fontSize: "14px",
  lineHeight: 1.6,
  color: "#7f1d1d",
}

const dangerActionButtonStyle = {
  padding: "12px 16px",
  borderRadius: "16px",
  border: "1px solid #efc7c7",
  backgroundColor: "#fff1f1",
  color: "#991b1b",
  fontSize: "14px",
  fontWeight: "800",
}

const playerTodayPageStyle = {
  display: "grid",
  gap: "18px",
  padding: "0 4px 8px",
}

const playerHomeTeamRowStyle = {
  padding: "8px 4px 0",
}

const playerHomeTeamLabelStyle = {
  fontFamily: playerDisplayFont,
  fontSize: "clamp(28px, 7.5vw, 42px)",
  lineHeight: 0.95,
  fontWeight: 700,
  letterSpacing: "-0.04em",
  color: playerInk,
}

const playerHomeDateRowStyle = {
  padding: "0 4px",
}

const playerHomeDateLabelStyle = {
  ...fieldLabelStyleToken,
  textTransform: "none",
  letterSpacing: "0.12em",
  color: playerInkSoft,
}

const playerTodayMetaRowStyle = {
  display: "block",
  padding: "8px 6px 0",
}

const playerTodayMonoLabelStyle = {
  fontFamily: playerMonoFont,
  fontSize: "11px",
  fontWeight: 700,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: playerInkSoft,
}

const playerTodayTeamPillStyle = {
  fontFamily: playerDisplayFont,
  fontSize: "clamp(32px, 8vw, 48px)",
  lineHeight: 0.94,
  fontWeight: 700,
  letterSpacing: "-0.04em",
  color: playerInk,
  maxWidth: "100%",
  whiteSpace: "normal",
  overflowWrap: "anywhere",
}

const playerHomeHeroCardStyle = {
  width: "100%",
  padding: "20px",
  borderRadius: "22px",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  backgroundColor: playerInk,
  color: "#ffffff",
  cursor: "pointer",
  textAlign: "left",
  display: "grid",
  gap: "12px",
  boxShadow: "0 22px 36px rgba(26, 24, 20, 0.18)",
}

const playerHomeHeroTopRowStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "14px",
}

const playerHomeHeroKickerRowStyle = {
  minWidth: 0,
  display: "flex",
  alignItems: "center",
  gap: "8px",
}

const playerHomeHeroAccentDotStyle = (accentColor) => ({
  width: "6px",
  height: "6px",
  flex: "0 0 auto",
  borderRadius: "999px",
  backgroundColor: accentColor,
})

const playerHomeHeroKickerStyle = {
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontFamily: playerMonoFont,
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "0.12em",
  color: "rgba(255, 255, 255, 0.65)",
}

const playerHomeHeroPlayButtonStyle = (accentColor) => ({
  width: "52px",
  height: "52px",
  flex: "0 0 auto",
  borderRadius: "999px",
  backgroundColor: accentColor,
  color: "#ffffff",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.14)",
})

const playerHomeHeroTitleStyle = {
  margin: 0,
  fontFamily: playerDisplayFont,
  fontSize: "24px",
  lineHeight: 0.98,
  fontWeight: 700,
  letterSpacing: "-0.02em",
  color: "#ffffff",
}

const playerHomeHeroSubtitleStyle = {
  fontFamily: playerDisplayFont,
  fontSize: "13px",
  lineHeight: 1.35,
  fontWeight: 500,
  color: "rgba(255, 255, 255, 0.72)",
}

const playerHomeHeroMetaWrapStyle = {
  paddingTop: "12px",
  borderTop: "1px solid rgba(255, 255, 255, 0.12)",
}

const playerHomeHeroMetaTextStyle = {
  fontFamily: playerMonoFont,
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "rgba(255, 255, 255, 0.72)",
}

const playerHomeCategorySectionStyle = {
  display: "grid",
  gap: "10px",
}

const playerHomeCategoryListStyle = {
  border: `1px solid ${redesignLine}`,
  borderRadius: "18px",
  overflow: "hidden",
  backgroundColor: "transparent",
}

const playerHomeCategoryRowStyle = {
  width: "100%",
  padding: "14px",
  border: "none",
  backgroundColor: "transparent",
  color: playerInk,
  cursor: "pointer",
  textAlign: "left",
  display: "grid",
  gridTemplateColumns: "48px minmax(0, 1fr) auto",
  alignItems: "center",
  gap: "14px",
}

const playerHomeCategoryRowDividerStyle = {
  borderBottom: `1px solid ${redesignLine}`,
}

const playerHomeCategoryIconWrapStyle = (accentColor) => ({
  width: "48px",
  height: "48px",
  borderRadius: "14px",
  backgroundColor: accentColor,
  color: "#ffffff",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.14)",
})

const playerHomeCategoryContentStyle = {
  minWidth: 0,
  display: "grid",
  gap: "5px",
}

const playerHomeCategoryTitleStyle = {
  fontFamily: playerDisplayFont,
  fontSize: "18px",
  lineHeight: 1.02,
  fontWeight: 700,
  letterSpacing: "-0.03em",
  color: playerInk,
}

const playerHomeCategoryMetaStyle = {
  fontFamily: playerMonoFont,
  fontSize: "10px",
  lineHeight: 1.35,
  fontWeight: 700,
  letterSpacing: "0.06em",
  color: playerInkSoft,
}

const playerHomeCategoryChevronStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  color: redesignMuted,
}

const playerTodayPrimaryCardStyle = (themeKey = "strength") => {
  const theme = getPlayerTrainingTheme(themeKey)

  return {
    width: "100%",
    padding: "22px",
    borderRadius: "16px",
    border: `1px solid ${theme.filledBorder}`,
    background: theme.filledBackground,
    color: theme.filledText,
    cursor: "pointer",
    textAlign: "left",
    boxShadow: theme.filledShadow,
  }
}

const playerHomeSectionHeaderStyle = {
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "space-between",
  gap: "12px",
  padding: "4px 6px 0",
}

const playerHomeSectionTitleStyle = {
  marginTop: "6px",
  fontFamily: playerDisplayFont,
  fontSize: "clamp(30px, 8vw, 46px)",
  lineHeight: 0.95,
  fontWeight: 650,
  letterSpacing: "-0.05em",
  color: playerInk,
}

const playerHomeSectionMetaStyle = {
  fontFamily: playerMonoFont,
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: playerInkSoft,
  whiteSpace: "nowrap",
}

const playerTrainingMenuGridStyle = (isMobile) => ({
  display: "grid",
  gap: "10px",
  gridTemplateColumns: "1fr",
})

const playerHomePrimaryMenuListStyle = {
  display: "grid",
  gap: "10px",
  gridTemplateColumns: "1fr",
}

const playerHomeTrainingCardStyle = (themeKey = "prehab") => {
  const theme = getPlayerTrainingTheme(themeKey)
  const useFilled = themeKey === "strength" || themeKey === "running"

  return {
    minHeight: "122px",
    width: "100%",
    padding: "16px",
    borderRadius: "16px",
    border: `1px solid ${useFilled ? theme.filledBorder : theme.softBorder}`,
    background: useFilled ? theme.filledBackground : theme.softBackground,
    color: useFilled ? theme.filledText : theme.softText,
    textAlign: "center",
    cursor: "pointer",
    boxShadow: useFilled ? theme.filledShadow : theme.softShadow,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  }
}

const playerHomeTrainingKickerStyle = {
  marginBottom: "12px",
  fontFamily: playerMonoFont,
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  opacity: 0.68,
}

const playerHomeTrainingTitleStyle = {
  fontFamily: playerDisplayFont,
  fontSize: "clamp(22px, 6.5vw, 32px)",
  lineHeight: 0.95,
  fontWeight: 700,
  letterSpacing: "-0.04em",
  textAlign: "center",
  maxWidth: "100%",
}

const playerHomeTrainingTextStyle = {
  marginTop: "10px",
  fontSize: "13px",
  lineHeight: 1.35,
  fontWeight: 700,
  opacity: 0.72,
}

const playerTodayWeekCardStyle = {
  padding: "2px 0 0",
  borderRadius: 0,
  border: "none",
  background: "transparent",
}

const playerTodayWeekHeaderStyle = {
  display: "flex",
  justifyContent: "flex-start",
  alignItems: "center",
  gap: "10px",
  marginBottom: "10px",
}

const playerTodayWeekCountStyle = {
  fontFamily: playerMonoFont,
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: playerInkSoft,
}

const playerTodayWeekGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
  gap: "6px",
}

const playerHomeWeekCellStyle = (state = "empty", accentColor = playerInk) => ({
  aspectRatio: "1",
  borderRadius: "12px",
  border:
    state === "completed"
      ? `1px solid ${accentColor}`
      : state === "today_planned"
      ? `1px solid ${accentColor}`
      : state === "today_empty"
      ? `1px dashed ${playerInk}`
      : `1px solid ${redesignLine}`,
  backgroundColor:
    state === "completed"
      ? accentColor
      : state === "today_planned" || state === "today_empty"
      ? "#ffffff"
      : "transparent",
  display: "grid",
  placeItems: "center",
})

const playerHomeWeekCellContentStyle = {
  display: "grid",
  justifyItems: "center",
  alignContent: "center",
  gap: "6px",
}

const playerHomeWeekLetterStyle = (state = "empty", accentColor = playerInk) => ({
  fontFamily: playerMonoFont,
  fontSize: "10px",
  lineHeight: 1,
  fontWeight: 700,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color:
    state === "completed"
      ? "#ffffff"
      : state === "today_planned"
      ? accentColor
      : state === "today_empty"
      ? playerInk
      : state === "planned"
      ? playerInk
      : playerInkSoft,
})

const playerHomeWeekMarkerRowStyle = {
  minHeight: "12px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
}

const playerHomeWeekCheckWrapStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
}

const playerHomeWeekDotStyle = (color) => ({
  width: "5px",
  height: "5px",
  borderRadius: "999px",
  backgroundColor: color,
  display: "inline-block",
})

const playerWorkoutCompleteCardStyle = {
  padding: "20px 0",
  borderRadius: 0,
  backgroundColor: "transparent",
  color: playerInk,
  borderTop: `1px solid ${redesignLine}`,
  boxShadow: "none",
}

const playerWorkoutCompleteTitleStyle = {
  marginTop: "10px",
  fontFamily: playerDisplayFont,
  fontSize: "clamp(38px, 10vw, 58px)",
  lineHeight: 0.95,
  fontWeight: 650,
  letterSpacing: "-0.05em",
}

const playerWorkoutCompleteMetaStyle = {
  marginTop: "8px",
  ...mutedBodyTextStyleToken,
  fontSize: "15px",
}

const playerWorkoutHighlightCardStyle = {
  marginTop: "18px",
  padding: "12px 0 0",
  borderRadius: 0,
  backgroundColor: "transparent",
  border: "none",
  borderTop: `1px solid ${redesignLineSoft}`,
}

const playerWorkoutHighlightValueStyle = {
  marginTop: "8px",
  fontFamily: playerDisplayFont,
  fontSize: "24px",
  lineHeight: 1.05,
  fontWeight: 650,
}

const playerWorkoutCompleteActionsStyle = (isMobile) => ({
  display: "flex",
  gap: "10px",
  marginTop: "18px",
  flexDirection: isMobile ? "column" : "row",
})

const playerTodayPrimaryButtonStyle = {
  background: playerAccent,
  boxShadow: "none",
}

const playerTodaySecondaryButtonStyle = {
  backgroundColor: "transparent",
  borderColor: "rgba(243, 239, 230, 0.18)",
  color: playerPaper,
  boxShadow: "none",
}

const playerOverviewPanelStyle = {
  padding: "0",
  borderRadius: 0,
  border: "none",
  background: "transparent",
  boxShadow: "none",
}

const playerOverviewPanelRowStyle = {
  gridColumn: "1 / -1",
  minWidth: 0,
}

const playerAccordionContentStyle = {
  marginTop: "14px",
  display: "grid",
  gap: "14px",
}

const playerActivityPanelStyle = {
  padding: "0",
  borderRadius: 0,
  border: "none",
  background: "transparent",
  boxShadow: "none",
}

const playerActivityPanelIntroStyle = {
  display: "grid",
  gap: "8px",
}

const playerActivityPanelKickerStyle = {
  fontFamily: playerMonoFont,
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: playerInkSoft,
}

const playerActivityPanelTitleStyle = {
  ...sectionTitleStyleToken,
}

const playerActivityNoticeStyle = {
  padding: "13px 15px",
  borderRadius: "16px",
  border: "1px solid rgba(217, 74, 31, 0.22)",
  backgroundColor: "rgba(217, 74, 31, 0.08)",
  color: "#9a3412",
  fontSize: "13px",
  fontWeight: 800,
}

const playerActivityFormGridStyle = (isMobile) => ({
  display: "grid",
  gap: "12px",
  gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
})

const playerActivityFieldStyle = {
  display: "grid",
  gap: "8px",
  padding: "0",
  borderRadius: 0,
  border: "none",
  background: "transparent",
}

const playerActivityFieldFullStyle = {
  ...playerActivityFieldStyle,
  gridColumn: "1 / -1",
}

const playerActivityFieldLabelStyle = {
  ...fieldLabelStyleToken,
}

const playerActivityInputStyle = {
  ...inputStyle,
  ...inputTextStyleToken,
  width: "100%",
  minWidth: 0,
  border: `1px solid ${redesignLineSoft}`,
  backgroundColor: redesignSurfaceSoft,
  color: playerInk,
  boxShadow: "none",
}

const playerActivityTextareaStyle = {
  ...playerActivityInputStyle,
  minHeight: "116px",
  resize: "vertical",
}

const playerActivityHintStyle = (isMobile) => ({
  gridColumn: isMobile ? "auto" : "span 2",
  padding: "6px 2px 0",
  fontSize: "13px",
  lineHeight: 1.5,
  color: playerInkSoft,
  fontWeight: 700,
})

const playerActivityFixedTypeStyle = {
  minHeight: "48px",
  display: "flex",
  alignItems: "center",
  padding: "12px 14px",
  borderRadius: "14px",
  border: `1px solid ${playerLine}`,
  backgroundColor: "rgba(255, 255, 255, 0.46)",
  color: playerInk,
  fontSize: "14px",
  fontWeight: 900,
}

const playerActivitySubmitButtonStyle = {
  ...buttonStyle,
  marginTop: "4px",
  padding: "14px 18px",
  borderRadius: "18px",
}

const playerOverviewPanelTitleStyle = {
  fontSize: "20px",
  fontWeight: "900",
  color: "#18202b",
  marginBottom: "4px",
}

const playerOverviewPanelTextStyle = {
  fontSize: "14px",
  lineHeight: 1.6,
  color: "#566173",
}

const playerFixedDraftTypeStyle = {
  minHeight: "48px",
  display: "flex",
  alignItems: "center",
  padding: "12px 14px",
  borderRadius: "14px",
  border: `1px solid ${playerLine}`,
  backgroundColor: "rgba(255, 255, 255, 0.34)",
  color: playerInk,
  fontSize: "14px",
  fontWeight: 900,
}

const playerHistorySectionLabelStyle = {
  marginBottom: "10px",
  fontFamily: playerMonoFont,
  fontSize: "10px",
  fontWeight: "700",
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  color: playerInkSoft,
}

const playerHistoryItemStyle = {
  padding: "14px 0",
  borderRadius: 0,
  backgroundColor: "transparent",
  border: "none",
  borderBottom: `1px solid ${redesignLineSoft}`,
}

const playerHistoryItemHeaderStyle = (isMobile) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: isMobile ? "flex-start" : "center",
  gap: "10px",
  flexDirection: isMobile ? "column" : "row",
  marginBottom: "10px",
})

const playerHistoryItemTitleStyle = {
  fontSize: "16px",
  fontWeight: "800",
  color: playerInk,
  marginBottom: "4px",
}

const playerHistoryItemMetaStyle = {
  fontSize: "13px",
  color: playerInkSoft,
}

const playerHistoryDateStyle = {
  fontFamily: playerMonoFont,
  fontSize: "10px",
  fontWeight: "700",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: playerInkSoft,
}

const playerHistoryActionRowStyle = (isMobile) => ({
  display: "flex",
  gap: "8px",
  flexDirection: isMobile ? "column" : "row",
  alignItems: isMobile ? "stretch" : "center",
})

const playerHistoryEmptyStyle = {
  fontSize: "14px",
  color: playerInkSoft,
}

const playerHistoryHighlightsGridStyle = (isMobile) => ({
  display: "grid",
  gap: "10px",
  gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(2, minmax(0, 1fr))",
})

const playerHistoryHighlightCardStyle = {
  padding: "12px 14px",
  borderRadius: "18px",
  border: `1px solid ${playerLine}`,
  backgroundColor: "rgba(255, 255, 255, 0.28)",
}

const playerHistoryHighlightLabelStyle = {
  marginBottom: "6px",
  fontFamily: playerMonoFont,
  fontSize: "10px",
  fontWeight: "700",
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  color: playerInkSoft,
}

const playerHistoryHighlightValueStyle = {
  fontSize: "16px",
  fontWeight: "800",
  color: playerInk,
  lineHeight: 1.4,
}

const playerHistoryActionButtonStyle = {
  ...playerActivitySubmitButtonStyle,
  marginTop: 0,
  padding: "12px 16px",
  borderRadius: "16px",
}

const playerPageIntroStyle = {
  marginBottom: "4px",
}

const playerStatsLayoutStyle = {
  display: "grid",
  gap: "14px",
  gridTemplateColumns: "1fr",
  width: "100%",
}

const playerStatsSelectorWrapStyle = {
  display: "grid",
  gap: "12px",
}

const playerStatsSelectorStyle = {
  display: "grid",
  gap: "12px",
  padding: "0 0 16px",
  borderRadius: 0,
  border: "none",
  borderBottom: `1px solid ${redesignLineSoft}`,
  background: "transparent",
  boxShadow: "none",
}

const playerStatsSelectorHeaderStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
}

const playerStatsSelectorLabelStyle = {
  fontFamily: playerMonoFont,
  fontSize: "10px",
  fontWeight: "700",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: playerInkSoft,
  marginBottom: "4px",
}

const playerStatsSelectorTextStyle = {
  ...bodyTextStyleToken,
  fontWeight: 700,
  color: playerInk,
}

const playerStatsSelectorSummaryHintStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "8px 12px",
  borderRadius: "999px",
  backgroundColor: "rgba(26, 24, 20, 0.06)",
  color: playerInk,
  ...compactBodyTextStyleToken,
  fontWeight: 700,
  whiteSpace: "nowrap",
}

const playerStatsSelectorControlsStyle = {
  display: "grid",
  gap: "10px",
  gridTemplateColumns: "1fr",
  alignItems: "center",
}

const playerStatsSelectorHelperStyle = {
  ...compactBodyTextStyleToken,
  color: playerInkSoft,
}

const playerStatsSelectStyle = {
  ...playerActivityInputStyle,
  backgroundColor: "rgba(255, 255, 255, 0.82)",
  color: playerInk,
}

const playerStatsExerciseTitleStyle = {
  ...itemTitleStyleToken,
  marginBottom: "4px",
}

const playerStatsExerciseMetaStyle = {
  ...compactBodyTextStyleToken,
  color: playerInkSoft,
}

const playerStatsSelectedChipsStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: "10px",
}

const playerStatsSelectedChipStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "10px 14px",
  borderRadius: "999px",
  border: `1px solid ${redesignLineSoft}`,
  backgroundColor: redesignSurface,
  color: playerInk,
  ...compactBodyTextStyleToken,
  fontWeight: 700,
  cursor: "pointer",
}

const playerStatsCardsStackStyle = {
  display: "grid",
  gap: "14px",
}

const playerStatsCardStyle = {
  padding: "0 0 18px",
  borderRadius: 0,
  border: "none",
  borderBottom: `1px solid ${redesignLineSoft}`,
  background: "transparent",
  boxShadow: "none",
}

const playerStatsHeaderStyle = (isMobile) => ({
  display: "flex",
  alignItems: isMobile ? "flex-start" : "center",
  justifyContent: "space-between",
  flexDirection: isMobile ? "column" : "row",
  gap: "10px",
  marginBottom: "14px",
})

const playerStatsTitleStyle = {
  ...sectionTitleStyleToken,
  marginBottom: "4px",
}

const playerStatsTextStyle = {
  ...bodyTextStyleToken,
  color: playerInkSoft,
}

const playerStatsSummaryPillStyle = {
  display: "inline-flex",
  padding: "8px 12px",
  borderRadius: "999px",
  backgroundColor: playerInk,
  color: playerPaper,
  fontSize: "13px",
  fontWeight: "800",
}

const playerChartWrapStyle = {
  width: "100%",
  maxWidth: "100%",
  overflowX: "hidden",
  marginBottom: "14px",
}

const playerChartSvgStyle = {
  display: "block",
  width: "100%",
  maxWidth: "100%",
  height: "220px",
}

const playerStatsRecentListStyle = {
  display: "grid",
  gap: "10px",
}

const playerStatsRecentItemStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  padding: "12px 0",
  borderRadius: 0,
  border: "none",
  borderTop: `1px solid ${redesignLineSoft}`,
  backgroundColor: "transparent",
}

const playerStatsRecentDateStyle = {
  fontSize: "14px",
  fontWeight: "800",
  color: playerInk,
  marginBottom: "4px",
}

const playerStatsRecentMetaStyle = {
  fontSize: "13px",
  color: playerInkSoft,
}

const playerStatsRecentValueStyle = {
  fontSize: "15px",
  fontWeight: "900",
  color: playerInk,
  whiteSpace: "nowrap",
}

const playerStatsEmptyStyle = {
  padding: "14px 0",
  borderRadius: 0,
  border: "none",
  color: playerInkSoft,
  ...bodyTextStyleToken,
  borderBottom: `1px solid ${redesignLineSoft}`,
}

const playerStatsEmptyInlineStyle = {
  marginBottom: "14px",
  padding: "12px 0",
  borderRadius: 0,
  border: "none",
  borderBottom: `1px solid ${redesignLineSoft}`,
  color: playerInkSoft,
  ...bodyTextStyleToken,
}

const activeRunningWorkoutCardStyle = {
  padding: "18px",
}

const activeRunningWorkoutHeaderStyle = {
  display: "grid",
  gap: "10px",
  marginBottom: "14px",
}

const activeRunningWorkoutTitleStyle = {
  margin: 0,
  fontFamily: playerDisplayFont,
  fontSize: "clamp(30px, 8vw, 40px)",
  lineHeight: 0.94,
  fontWeight: "700",
  letterSpacing: "-0.04em",
  color: playerInk,
}

const activeRunningWorkoutSummaryStyle = {
  display: "inline-flex",
  width: "fit-content",
  padding: "8px 12px",
  borderRadius: "999px",
  backgroundColor: playerInk,
  color: playerPaper,
  fontFamily: playerMonoFont,
  fontSize: "10px",
  fontWeight: "700",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
}

const activeRunningWorkoutFieldsStyle = {
  display: "grid",
  gap: "10px",
}

const renderPlayerHomePlayIcon = (color = "currentColor", size = 16) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    style={{ display: "block" }}
  >
    <path d="M5 3.5v9l7-4.5-7-4.5Z" fill={color} />
  </svg>
)

const renderPlayerHomeChevronIcon = (color = "currentColor", size = 18) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    style={{ display: "block" }}
  >
    <path
      d="m7.5 4.5 5 5-5 5"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const renderPlayerHomeCheckIcon = (color = "currentColor", size = 14) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    style={{ display: "block" }}
  >
    <path
      d="m3.5 8.25 2.75 2.75L12.5 4.75"
      stroke={color}
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const renderCoachBottomNavIcon = (icon, isActive) => {
  const commonProps = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: { display: "block" },
  }

  switch (icon) {
    case "home":
      return (
        <svg {...commonProps}>
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5 9.5V21h14V9.5" />
          <path d="M10 21v-6h4v6" />
        </svg>
      )
    case "players":
      return (
        <svg {...commonProps}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      )
    case "teams":
      return (
        <svg {...commonProps}>
          <path d="M8 6h12" />
          <path d="M8 12h12" />
          <path d="M8 18h12" />
          <circle cx="4" cy="6" r="1.5" />
          <circle cx="4" cy="12" r="1.5" />
          <circle cx="4" cy="18" r="1.5" />
        </svg>
      )
    case "pass":
      return (
        <svg {...commonProps}>
          <rect x="3" y="4" width="18" height="18" rx="3" />
          <path d="M8 2v4" />
          <path d="M16 2v4" />
        </svg>
      )
    case "calendar":
      return (
        <svg {...commonProps}>
          <rect x="3" y="4" width="18" height="17" rx="3" />
          <path d="M8 2v4" />
          <path d="M16 2v4" />
          <path d="M3 10h18" />
        </svg>
      )
    case "messages":
      return (
        <svg {...commonProps}>
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      )
    case "stats":
      return (
        <svg {...commonProps}>
          <path d="M4 19h16" />
          <path d="M7 16V9" />
          <path d="M12 16V5" />
          <path d="M17 16v-4" />
        </svg>
      )
    case "account":
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20a8 8 0 0 1 16 0" />
        </svg>
      )
    case "feedback":
      return (
        <svg {...commonProps}>
          <path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          <path d="M9 9h6" />
          <path d="M9 13h3" />
        </svg>
      )
    default:
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="8" />
        </svg>
      )
  }
}

const coachBottomNavWrapStyle = {
  position: "fixed",
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 30,
  padding: "0 12px",
  pointerEvents: "none",
}

const playerBottomNavWrapStyle = {
  position: "fixed",
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 30,
  padding: 0,
  pointerEvents: "none",
}

const coachBottomNavStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
  gap: "6px",
  padding: "10px 8px calc(8px + env(safe-area-inset-bottom))",
  borderTop: `1px solid ${uiBorder}`,
  borderRadius: "22px 22px 0 0",
  background: "rgba(255, 255, 255, 0.98)",
  backdropFilter: "blur(18px)",
  boxShadow: "0 -2px 8px rgba(15, 23, 42, 0.05), 0 -16px 36px rgba(15, 23, 42, 0.08)",
  pointerEvents: "auto",
}

const playerBottomNavStyle = {
  ...coachBottomNavStyle,
  borderTop: "1px solid rgba(26, 24, 20, 0.08)",
  borderRadius: 0,
  padding: "8px 10px calc(8px + env(safe-area-inset-bottom))",
  background: "#f3efe6",
  backdropFilter: "none",
  boxShadow: "none",
}

const managementBottomNavStyle = {
  ...coachBottomNavStyle,
  borderTop: `1px solid ${playerLine}`,
  background: "rgba(243, 239, 230, 0.94)",
  boxShadow: "0 -18px 38px rgba(26, 24, 20, 0.12)",
}

const coachBottomNavButtonStyle = {
  border: "none",
  background: "transparent",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "4px",
  minHeight: "56px",
  padding: "4px 2px",
  cursor: "pointer",
  font: "inherit",
}

const coachBottomNavIconWrapStyle = {
  width: "34px",
  height: "34px",
  borderRadius: "12px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
}

const playerBottomNavIconWrapStyle = {
  ...coachBottomNavIconWrapStyle,
  width: "36px",
  height: "36px",
  borderRadius: "12px",
}

const managementBottomNavIconWrapStyle = {
  ...coachBottomNavIconWrapStyle,
  borderRadius: "999px",
}

const coachBottomNavLabelStyle = {
  fontSize: "11px",
  fontWeight: "800",
  lineHeight: 1.1,
  textAlign: "center",
}

const playerBottomNavLabelStyle = {
  ...coachBottomNavLabelStyle,
  fontFamily: playerMonoFont,
  fontSize: "10px",
  letterSpacing: "0.06em",
  textTransform: "uppercase",
}

const managementBottomNavLabelStyle = {
  ...coachBottomNavLabelStyle,
  fontFamily: playerMonoFont,
  fontSize: "10px",
  letterSpacing: "0.04em",
  textTransform: "uppercase",
}

export default TrainingApp
