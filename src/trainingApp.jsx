import { useState, useEffect, useRef } from "react"
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
  getExerciseProtocolConfig,
  getExerciseProtocolStep,
  isProtocolExercise,
} from "./utils/exerciseProtocols"

const PASS_ASSIGNMENT_EXERCISE_NAME = "__PASS_ASSIGNMENT__"

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
    .replace(/[̀-ͯ]/g, "")
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

const buildRunningSummary = (session) => {
  if (!session) return ""

  const freeActivityType = session.free_activity_type || "running"

  if (freeActivityType !== "running") {
    return session.running_time || "Aktivitet loggad"
  }

  if (session.running_type === "intervals") {
    const intervalsCount = session.intervals_count ? `${session.intervals_count} intervaller` : null
    const intervalTime = session.interval_time ? `${session.interval_time}/intervall` : null
    return [intervalsCount, intervalTime].filter(Boolean).join(" • ") || "Intervaller"
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