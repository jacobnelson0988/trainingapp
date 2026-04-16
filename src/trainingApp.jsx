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
import MessagesPage from "./pages/MessagesPage"
import FeedbackPage from "./pages/FeedbackPage"
import GdprPage from "./pages/GdprPage"
import StatsPage from "./pages/StatsPage"
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

const getExerciseMeasurementShortLabel = (exerciseType) =>
  exerciseType === "seconds_only" ? "sek" : "reps"

const getExercisePerSideSuffix = (executionSide, exerciseType = "reps_only") => {
  if (executionSide === "single_leg") {
    return exerciseType === "seconds_only" ? "per ben" : "per ben"
  }

  if (executionSide === "single_arm") {
    return exerciseType === "seconds_only" ? "per hand" : "per hand"
  }

  return ""
}

const getExerciseMeasurementLabelWithSide = (exerciseType, executionSide) => {
  const baseLabel = getExerciseMeasurementLabel(exerciseType)
  const suffix = getExercisePerSideSuffix(executionSide, exerciseType)
  return suffix ? `${baseLabel} (${suffix})` : baseLabel
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

const getPlayerWorkoutGroupKey = (workout) => {
  const workoutKind = workout?.workoutKind || "gym"
  if (workoutKind === "running") return "running"
  if (workoutKind === "prehab") return "prehab"
  return workout?.gymPassType === "shared" ? "gym_shared" : "gym_individual"
}

const getPlayerWorkoutKindTheme = (groupKey) => {
  if (groupKey === "running") {
    return {
      title: "Löppass",
      description: "Distans och intervaller du kan köra när du vill.",
      badgeBackground: "#eef4ff",
      badgeColor: "#1d4ed8",
      sectionBackground: "#f8fbff",
      sectionBorder: "#dbe7ff",
    }
  }

  if (groupKey === "prehab") {
    return {
      title: "Skadeförebyggande",
      description: "Pass för kontroll, stabilitet och hållbarhet över tid.",
      badgeBackground: "#ecfdf5",
      badgeColor: "#0f766e",
      sectionBackground: "#f7fffb",
      sectionBorder: "#d4f5e5",
    }
  }

  if (groupKey === "gym_shared") {
    return {
      title: "Gemensamma gympass",
      description: "Pass som tränaren markerat som gemensamma för laget.",
      badgeBackground: "#fff1f1",
      badgeColor: "#b61e24",
      sectionBackground: "#fffdfd",
      sectionBorder: "#f0dcdc",
    }
  }

  return {
    title: "Individuella gympass",
    description: "Pass du kan köra när det passar, med övningar, målvikter och progression.",
    badgeBackground: "#fef3c7",
    badgeColor: "#92400e",
    sectionBackground: "#fffdf7",
    sectionBorder: "#f3e3b5",
  }
}

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
      const latestEntry = exerciseHistory.entries[0] || null
      const bestWeightEntry =
        weightEntries.reduce((bestEntry, currentEntry) => {
          if (!bestEntry) return currentEntry
          return currentEntry.top_weight > bestEntry.top_weight ? currentEntry : bestEntry
        }, null) || null

      return {
        exercise_id: matchedExercise?.id || exerciseHistory.exercise_name,
        exercise_name: exerciseHistory.exercise_name,
        exercise_display_name: matchedExercise ? getExerciseDisplayName(matchedExercise) : exerciseHistory.exercise_name,
        latest_entry: latestEntry,
        best_weight_entry: bestWeightEntry,
        entry_count: exerciseHistory.entries.length,
        weight_entries: weightEntries.map((entry) => ({
          created_at: entry.created_at,
          top_weight: entry.top_weight,
          top_reps: entry.top_reps,
          pass_name: entry.pass_name || null,
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

function TrainingApp() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth <= 768 : false
  )
  const [user, setUser] = useState(null)
  const [workoutsFromDB, setWorkoutsFromDB] = useState({})

  const activeWorkouts = workoutsFromDB
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
  const [playerExerciseProgress, setPlayerExerciseProgress] = useState([])
  const [isLoadingPlayerExerciseProgress, setIsLoadingPlayerExerciseProgress] = useState(false)
  const [selectedPlayerStatsExerciseId, setSelectedPlayerStatsExerciseId] = useState("")
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
  const [newPassRunningIntervalTime, setNewPassRunningIntervalTime] = useState("")
  const [newPassRunningIntervalsCount, setNewPassRunningIntervalsCount] = useState("")
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
  const [renamePassRunningIntervalTime, setRenamePassRunningIntervalTime] = useState("")
  const [renamePassRunningIntervalsCount, setRenamePassRunningIntervalsCount] = useState("")
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
  const [activeExerciseIndex, setActiveExerciseIndex] = useState(0)
  const [selectedExerciseOptionKeys, setSelectedExerciseOptionKeys] = useState({})
  const [exerciseComments, setExerciseComments] = useState({})
  const [passComment, setPassComment] = useState("")
  const [completedWorkoutSessions, setCompletedWorkoutSessions] = useState([])
  const [isLoadingCompletedWorkoutSessions, setIsLoadingCompletedWorkoutSessions] = useState(false)
  const [workoutDateDrafts, setWorkoutDateDrafts] = useState({})
  const [savingWorkoutDateSessionId, setSavingWorkoutDateSessionId] = useState(null)
  const [runningDraft, setRunningDraft] = useState({
    log_date: getTodayDateInputValue(),
    free_activity_type: "",
    running_type: "distance",
    interval_time: "",
    intervals_count: "",
    running_distance: "",
    running_time: "",
    average_pulse: "",
    comment: "",
  })
  const [isSavingRunningSession, setIsSavingRunningSession] = useState(false)
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
    interval_time: "",
    intervals_count: "",
    running_distance: "",
    running_time: "",
    average_pulse: "",
  })
  const exerciseCarouselRef = useRef(null)

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
      setSelectedPlayerStatsExerciseId("")
      return
    }

    loadCompletedWorkoutSessions(user.id)
    loadPlayerExerciseProgress(user.id)
  }, [user, profile?.role, exercisesFromDB])

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
    if (!user || profile?.role !== "player") return

    if (!selectedWorkout) {
      setLatestWorkout({})
      return
    }

    loadLatestWorkoutForPass(selectedWorkout, user.id)
  }, [user, profile?.role, selectedWorkout])

  useEffect(() => {
    if (profile?.role !== "player") return
    if (!assignedWorkoutCodes.length) {
      setSelectedWorkout(null)
      return
    }

    if (selectedWorkout && !assignedWorkoutCodes.includes(selectedWorkout)) {
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
    setRenamePassRunningIntervalTime(selectedTemplate?.running_interval_time || "")
    setRenamePassRunningIntervalsCount(
      selectedTemplate?.running_intervals_count != null
        ? String(selectedTemplate.running_intervals_count)
        : ""
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

      acc[template.code] = {
        id: template.id,
        label: template.label,
        info: template.info || "",
        workoutKind: template.workout_kind || "gym",
        gymPassType: template.gym_pass_type || "individual",
        runningType: template.running_type || "intervals",
        runningConfig: {
          interval_time: template.running_interval_time || "",
          intervals_count: template.running_intervals_count ?? null,
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

    const [
      { data: historyRows, error: historyError },
      { data: goalRows, error: goalsError },
      { data: repTargetRows, error: repTargetsError },
    ] =
      await Promise.all([
        supabase
          .from("workout_logs")
          .select(
            "workout_session_id, created_at, pass_name, exercise, set_number, weight, reps, seconds, set_type, exercise_comment, pass_comment, workout_kind, running_type, interval_time, intervals_count, running_distance, running_time, average_pulse, running_origin, free_activity_type"
          )
          .eq("user_id", playerId)
          .eq("is_completed", true)
          .order("created_at", { ascending: false }),
        supabase
          .from("player_exercise_goals")
          .select("exercise_id, target_sets, target_reps, comment")
          .eq("player_id", playerId),
        supabase
          .from("player_exercise_rep_targets")
          .select("exercise_id, rep_range_key, target_weight")
          .eq("player_id", playerId),
      ])

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

    const { data, error } = await supabase
      .from("workout_logs")
      .select(
        "workout_session_id, created_at, pass_name, exercise, set_number, set_type, is_completed, workout_kind, running_type, interval_time, intervals_count, running_distance, running_time, average_pulse, running_origin, free_activity_type"
      )
      .eq("user_id", userId)
      .eq("is_completed", true)
      .order("created_at", { ascending: false })

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
      setSelectedPlayerStatsExerciseId("")
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
      setSelectedPlayerStatsExerciseId("")
      setIsLoadingPlayerExerciseProgress(false)
      return
    }

    const nextProgress = buildPlayerExerciseProgress(data || [], exercisesFromDB)
    setPlayerExerciseProgress(nextProgress)
    setSelectedPlayerStatsExerciseId((current) => {
      if (current && nextProgress.some((entry) => entry.exercise_id === current)) return current
      return nextProgress[0]?.exercise_id || ""
    })
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

  const resetPassEditorState = (templateCode = selectedTemplateCode) => {
    const selectedTemplate = templatesFromDB.find((template) => template.code === templateCode)

    setRenamePassName(selectedTemplate?.label || "")
    setRenamePassInfo(selectedTemplate?.info || "")
    setRenamePassWarmupCardio(selectedTemplate?.warmup_cardio || "")
    setRenamePassWarmupTechnique(selectedTemplate?.warmup_technique || "")
    setRenamePassWorkoutKind(selectedTemplate?.workout_kind || "gym")
    setRenamePassGymPassType(selectedTemplate?.gym_pass_type || "individual")
    setRenamePassRunningType(selectedTemplate?.running_type || "intervals")
    setRenamePassRunningIntervalTime(selectedTemplate?.running_interval_time || "")
    setRenamePassRunningIntervalsCount(
      selectedTemplate?.running_intervals_count != null
        ? String(selectedTemplate.running_intervals_count)
        : ""
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

  const startWorkout = async (workoutKey) => {
    if (!user) return

    const newSessionId = generateSessionId()
    const workout = activeWorkouts[workoutKey]
    if (!workout || !Array.isArray(workout.exercises)) {
      setStatus("Kunde inte starta passet")
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

    if (workout.workoutKind === "running") {
      setActiveRunningInput({
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
    setPlayerView("workout")
    setStatus(`${workout.label} startat`)

    await loadLatestWorkoutForPass(workoutKey, user.id)
  }

  const finishWorkout = async () => {
    if (!currentSessionId || !selectedWorkout || !user) return

    if (activeWorkouts[selectedWorkout]?.workoutKind === "running") {
      const activeRunningWorkout = activeWorkouts[selectedWorkout]
      const { error } = await supabase.from("workout_logs").insert({
        client_set_id: `assigned-running-${currentSessionId}`,
        user_id: user.id,
        workout_session_id: currentSessionId,
        pass_name: activeRunningWorkout.label,
        exercise: "Löpning",
        set_number: 1,
        is_completed: true,
        workout_kind: "running",
        running_origin: "assigned",
        running_type: activeRunningWorkout.runningType || "intervals",
        interval_time: String(activeRunningInput.interval_time || "").trim() || null,
        intervals_count: String(activeRunningInput.intervals_count || "").trim()
          ? Number(activeRunningInput.intervals_count)
          : null,
        running_distance: String(activeRunningInput.running_distance || "").trim()
          ? parseLoggedNumber(activeRunningInput.running_distance)
          : null,
        running_time: String(activeRunningInput.running_time || "").trim() || null,
        average_pulse: String(activeRunningInput.average_pulse || "").trim()
          ? Number(activeRunningInput.average_pulse)
          : null,
        pass_comment: passComment.trim() || null,
      })

      if (error) {
        console.error(error)
        setStatus("Kunde inte avsluta löppasset")
        return
      }

      setIsWorkoutActive(false)
      setCurrentSessionId(null)
      setInputs({})
      setSelectedExerciseOptionKeys({})
      setExerciseComments({})
      setPassComment("")
      setActiveRunningInput({
        interval_time: "",
        intervals_count: "",
        running_distance: "",
        running_time: "",
        average_pulse: "",
      })
      setPlayerView("overview")
      setStatus(`${activeRunningWorkout.label} avslutat`)
      await loadCompletedWorkoutSessions(user.id)
      await loadLatestData(user.id)
      return
    }

    const activeExercises = activeWorkouts[selectedWorkout]?.exercises || []
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
    setCurrentSessionId(null)
    setInputs({})
    setSelectedExerciseOptionKeys({})
    setExerciseComments({})
    setPassComment("")
    setPlayerView("overview")
    setStatus(`${activeWorkouts[selectedWorkout].label} avslutat`)

    await loadLatestWorkoutForPass(selectedWorkout, user.id)
    await loadLatestData(user.id)
  }

  const cancelWorkout = async () => {
    if (!currentSessionId || !selectedWorkout || !user) return

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
    setInputs({})
    setSelectedExerciseOptionKeys({})
    setExerciseComments({})
    setPassComment("")
    setExpandedInfo({})
    setActiveRunningInput({
      interval_time: "",
      intervals_count: "",
      running_distance: "",
      running_time: "",
      average_pulse: "",
    })
    setPlayerView("pass")
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

  const handleChange = async (exerciseIndex, setIndex, field, value) => {
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

    const set = updated[setIndex]

    const isComplete =
      (selectedExercise?.type === "weight_reps" && set.weight && set.reps) ||
      (selectedExercise?.type === "reps_only" && set.reps) ||
      (selectedExercise?.type === "seconds_only" && set.seconds)

    if (isComplete && selectedExercise) {
      await saveSet(exerciseIndex, selectedExercise, setIndex, set)
    }
  }

  const handleToggleSetType = async (exerciseIndex, setIndex) => {
    if (!isWorkoutActive || !currentSessionId || !selectedWorkout) return

    const current = inputs[exerciseIndex] || []
    const exercise = activeWorkouts[selectedWorkout]?.exercises?.[exerciseIndex]
    const selectedExercise = exercise
      ? getSelectedExerciseExecution(exercise, selectedExerciseOptionKeys[exerciseIndex])
      : null

    if (!selectedExercise) return

    const updated = [...current]
    const currentSet = updated[setIndex]
    if (!currentSet) return

    const nextSet = {
      ...currentSet,
      set_type: currentSet.set_type === "warmup" ? "work" : "warmup",
      workout_session_id: currentSessionId,
      client_set_id:
        currentSet.client_set_id ||
        generateSetId(exerciseIndex, setIndex),
    }

    updated[setIndex] = nextSet

    setInputs({
      ...inputs,
      [exerciseIndex]: updated,
    })

    const isComplete =
      (selectedExercise?.type === "weight_reps" && nextSet.weight && nextSet.reps) ||
      (selectedExercise?.type === "reps_only" && nextSet.reps) ||
      (selectedExercise?.type === "seconds_only" && nextSet.seconds)

    if (isComplete) {
      await saveSet(exerciseIndex, selectedExercise, setIndex, nextSet)
    }
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

    const createdAt = combineDateWithExistingTime(runningDraft.log_date, new Date().toISOString())
    if (!createdAt) {
      setStatus("Välj ett giltigt datum för aktiviteten")
      return
    }

    setIsSavingRunningSession(true)

    const workoutSessionId = generateSessionId()
    const freeActivityType = runningDraft.free_activity_type || "running"
    const activityLabel = getFreeActivityLabel(freeActivityType)
    const isFreeRunning = freeActivityType === "running"
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
      interval_time:
        isFreeRunning && runningDraft.running_type === "intervals" && String(runningDraft.interval_time || "").trim()
          ? String(runningDraft.interval_time || "").trim()
          : null,
      intervals_count:
        isFreeRunning && runningDraft.running_type === "intervals" && String(runningDraft.intervals_count || "").trim()
          ? Number(runningDraft.intervals_count)
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
    }

    const { error } = await supabase.from("workout_logs").insert(payload)

    if (error) {
      console.error(error)
      setStatus("Kunde inte spara aktiviteten")
      setIsSavingRunningSession(false)
      return
    }

    setRunningDraft((prev) => ({
      ...prev,
      log_date: getTodayDateInputValue(),
      free_activity_type: "",
      interval_time: "",
      intervals_count: "",
      running_distance: "",
      running_time: "",
      average_pulse: "",
      comment: "",
    }))
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
    const nextRunningIntervalTime = renamePassRunningIntervalTime.trim()
    const nextRunningIntervalsCount = renamePassRunningIntervalsCount.trim()
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
      nextRunningIntervalTime !== (selectedTemplate.running_interval_time || "") ||
      nextRunningIntervalsCount !==
        String(selectedTemplate.running_intervals_count != null ? selectedTemplate.running_intervals_count : "") ||
      nextRunningDistance !==
        String(selectedTemplate.running_distance != null ? selectedTemplate.running_distance : "") ||
      nextRunningTime !== (selectedTemplate.running_time || "")
    const updates = Object.entries(passExerciseDrafts).flatMap(([rowId, draft]) => {
      const existingRow = templateExercisesFromDB.find((row) => String(row.id) === String(rowId))
      const update = buildPassExerciseUpdateFromDraft(existingRow, draft)
      return update ? [update] : []
    })

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
          running_interval_time: nextWorkoutKind === "running" ? nextRunningIntervalTime || null : null,
          running_intervals_count:
            nextWorkoutKind === "running" && nextRunningIntervalsCount
              ? Number(nextRunningIntervalsCount)
              : null,
          running_distance:
            nextWorkoutKind === "running" && nextRunningDistance
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
            running_interval_time: nextWorkoutKind === "running" ? nextRunningIntervalTime || null : null,
            running_intervals_count:
              nextWorkoutKind === "running" && nextRunningIntervalsCount
                ? Number(nextRunningIntervalsCount)
                : null,
            running_distance:
              nextWorkoutKind === "running" && nextRunningDistance
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
          next[data.code] = {
            ...next[data.code],
            label: data.label,
            info: data.info || "",
            workoutKind: data.workout_kind || "gym",
            gymPassType: data.gym_pass_type || "individual",
            runningType: data.running_type || "intervals",
            runningConfig: {
              interval_time: data.running_interval_time || "",
              intervals_count: data.running_intervals_count ?? null,
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
        running_interval_time:
          newPassWorkoutKind === "running" ? newPassRunningIntervalTime.trim() || null : null,
        running_intervals_count:
          newPassWorkoutKind === "running" && newPassRunningIntervalsCount.trim()
            ? Number(newPassRunningIntervalsCount)
            : null,
        running_distance:
          newPassWorkoutKind === "running" && newPassRunningDistance.trim()
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
          running_interval_time:
            newPassWorkoutKind === "running" ? newPassRunningIntervalTime.trim() || null : null,
          running_intervals_count:
            newPassWorkoutKind === "running" && newPassRunningIntervalsCount.trim()
              ? Number(newPassRunningIntervalsCount)
              : null,
          running_distance:
            newPassWorkoutKind === "running" && newPassRunningDistance.trim()
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
    setNewPassRunningIntervalTime("")
    setNewPassRunningIntervalsCount("")
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

    targetCard.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "start",
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
  const groupedVisibleWorkoutEntries = ["gym_individual", "running", "prehab", "gym_shared"]
    .map((groupKey) => {
      const entries = sortedVisibleWorkoutEntries.filter(
        ([, workout]) => getPlayerWorkoutGroupKey(workout) === groupKey
      )

      if (entries.length === 0) return null

      return {
        workoutKind: groupKey,
        entries,
        theme: getPlayerWorkoutKindTheme(groupKey),
      }
    })
    .filter(Boolean)
  const activeWorkoutData = selectedWorkout ? visibleWorkouts[selectedWorkout] : null
  const isRunningWorkoutActive = activeWorkoutData?.workoutKind === "running"
  const activeWorkoutWarmup = {
    cardio: activeWorkoutData?.warmup?.cardio || "",
    technique: Array.isArray(activeWorkoutData?.warmup?.technique)
      ? activeWorkoutData.warmup.technique
      : [],
  }
  const activeWorkoutExercises = Array.isArray(activeWorkoutData?.exercises)
    ? activeWorkoutData.exercises
    : []
  const activeWorkoutExerciseCount = isRunningWorkoutActive ? 1 : activeWorkoutExercises.length

  const unreadMessageCount = messages.filter((message) => message.hasUnread).length

  const coachTabs = [
    { key: "home", label: "Översikt" },
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
    { key: "pass", label: "Pass" },
    { key: "stats", label: "Statistik" },
    {
      key: "messages",
      label: unreadMessageCount ? `Meddelanden (${unreadMessageCount})` : "Meddelanden",
    },
  ]

  const activeWorkoutSlideCount = activeWorkoutExerciseCount + 2
  const isWarmupSlideActive = activeExerciseIndex === 0
  const isFinishSlideActive = activeExerciseIndex === activeWorkoutSlideCount - 1
  const activeWorkoutProgressSummary = isWarmupSlideActive
    ? "Uppvärmning"
    : isFinishSlideActive
    ? "Avslut"
    : isRunningWorkoutActive
    ? "Löppass"
    : `Övning ${Math.min(activeExerciseIndex, activeWorkoutExerciseCount)} / ${activeWorkoutExerciseCount}`
  const assignedCompletedSessions = completedWorkoutSessions.filter(
    (session) => !(session.workout_kind === "running" && session.running_origin !== "assigned")
  )
  const ownRunningSessions = completedWorkoutSessions.filter(
    (session) => session.workout_kind === "running" && session.running_origin !== "assigned"
  )

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
    { key: "pass", label: "Pass", icon: "pass" },
    { key: "stats", label: "Statistik", icon: "stats" },
    { key: "messages", label: "Meddelanden", icon: "messages" },
    { key: "account", label: "Konto", icon: "account" },
  ]
  const showAdminBottomNav = profile?.role === "head_admin" && isMobile && globalView === "app"
  const showPlayerBottomNav =
    profile?.role === "player" && isMobile && globalView !== "gdpr" && !isWorkoutActive
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
  const selectedPlayerStatsExercise =
    playerExerciseProgress.find((entry) => entry.exercise_id === selectedPlayerStatsExerciseId) ||
    playerExerciseProgress[0] ||
    null
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
  const togglePlayerOverviewPanel = (panelKey) => {
    setPlayerOverviewPanel((current) => (current === panelKey ? null : panelKey))
  }
  const playerHeaderSubtitle =
    profile?.role === "head_admin"
      ? "Skapa lag, lägg till tränare och få överblick över alla användare."
      : profile?.role === "coach"
      ? "Bygg pass, följ spelare och håll ihop träningen."
      : "Dina pass, meddelanden och historik på ett ställe."

  return (
    <div
      style={{
        ...pageStyle,
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

      {globalView === "account" && (
        <div
          style={{
            ...cardStyle,
            padding: isMobile ? "16px 14px" : cardStyle.padding,
            borderRadius: isMobile ? "20px" : cardStyle.borderRadius,
            marginBottom: isMobile ? "16px" : cardStyle.marginBottom,
          }}
        >
          <div style={accountHeaderStyle(isMobile)}>
            <div>
              <div style={sectionTitleStyle}>Mitt konto</div>
              <p style={mutedTextStyle}>Här hanterar du uppgifter som gäller ditt eget konto.</p>
            </div>

            <button
              type="button"
              onClick={() => navigateGlobalView("app")}
              style={{ ...secondaryButtonStyle, width: isMobile ? "100%" : "auto" }}
            >
              Tillbaka
            </button>
          </div>

          <div style={accountGridStyle(isMobile)}>
            <div style={accountInfoCardStyle}>
              <div style={accountInfoLabelStyle}>Namn</div>
              <div style={accountInfoValueStyle}>{profile.full_name || "-"}</div>
            </div>

            <div style={accountInfoCardStyle}>
              <div style={accountInfoLabelStyle}>Användarnamn</div>
              <div style={accountInfoValueStyle}>@{profile.username || "-"}</div>
            </div>

            <div style={accountInfoCardStyle}>
              <div style={accountInfoLabelStyle}>Roll</div>
              <div style={accountInfoValueStyle}>
                {profile.role === "head_admin"
                  ? "Huvudadmin"
                  : profile.role === "coach"
                  ? "Tränare"
                  : "Spelare"}
              </div>
            </div>

            <div style={accountInfoCardStyle}>
              <div style={accountInfoLabelStyle}>Lag</div>
              <div style={accountInfoValueStyle}>{teamName}</div>
            </div>
          </div>

          <div style={accountActionGridStyle(isMobile)}>
            <button
              type="button"
              onClick={() => navigateGlobalView("gdpr")}
              style={{ ...secondaryButtonStyle, width: isMobile ? "100%" : "auto" }}
            >
              Integritet
            </button>

            {profile?.role === "player" && (
              <button
                type="button"
                onClick={() => handleDeletePlayer(profile.id, profile.full_name, { isSelfDelete: true })}
                disabled={isDeletingOwnAccount}
                style={{
                  ...dangerActionButtonStyle,
                  width: isMobile ? "100%" : "auto",
                  opacity: isDeletingOwnAccount ? 0.7 : 1,
                  cursor: isDeletingOwnAccount ? "default" : "pointer",
                }}
              >
                {isDeletingOwnAccount ? "Tar bort konto..." : "Ta bort mitt konto"}
              </button>
            )}
          </div>

          <div style={accountPasswordCardStyle}>
            <div style={accountPasswordTitleStyle}>Byt lösenord</div>
            <div style={accountPasswordTextStyle}>
              Byt lösenord direkt här. Gäller spelare, tränare och huvudadmin.
            </div>

            <div style={accountPasswordFormStyle(isMobile)}>
              <div style={{ width: "100%" }}>
                <div style={compactFieldLabelStyle}>Nytt lösenord</div>
                <input
                  type="password"
                  value={accountPassword}
                  onChange={(e) => setAccountPassword(e.target.value)}
                  style={{ ...inputStyle, width: "100%" }}
                />
              </div>
              <div style={{ width: "100%" }}>
                <div style={compactFieldLabelStyle}>Bekräfta nytt lösenord</div>
                <input
                  type="password"
                  value={accountPasswordConfirm}
                  onChange={(e) => setAccountPasswordConfirm(e.target.value)}
                  style={{ ...inputStyle, width: "100%" }}
                />
              </div>
              <button
                type="button"
                onClick={handleUpdateOwnPassword}
                disabled={isUpdatingOwnPassword}
                style={{
                  ...buttonStyle,
                  width: isMobile ? "100%" : "auto",
                  opacity: isUpdatingOwnPassword ? 0.7 : 1,
                  cursor: isUpdatingOwnPassword ? "default" : "pointer",
                }}
              >
                {isUpdatingOwnPassword ? "Sparar..." : "Byt mitt lösenord"}
              </button>
            </div>
          </div>

          <div style={accountWarningCardStyle}>
            <div style={accountWarningTitleStyle}>Radering av konto</div>
            <div style={accountWarningTextStyle}>
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
          mutedTextStyle={mutedTextStyle}
          secondaryButtonStyle={secondaryButtonStyle}
          buttonStyle={buttonStyle}
          onBack={() => navigateGlobalView("app")}
          onOpenAccount={() => navigateGlobalView("account")}
        />
      )}

      {globalView === "app" && (
        <>
      <div
        style={{
          ...feedbackActionBarStyle,
          flexDirection: isMobile ? "column" : "row",
          alignItems: isMobile ? "stretch" : feedbackActionBarStyle.alignItems,
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={feedbackActionTitleStyle}>Hjälp till att förbättra appen</div>
          <div style={mutedTextStyle}>
            Använd feedbackknappen för buggar, önskemål eller saker som känns otydliga i appen.
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsFeedbackOpen((prev) => !prev)}
          style={{ ...secondaryButtonStyle, width: isMobile ? "100%" : "auto" }}
        >
          {isFeedbackOpen ? "Stäng feedback" : "Lämna feedback"}
        </button>
      </div>

      {isFeedbackOpen && (
        <div style={feedbackComposerCardStyle}>
          <div style={cardTitleStyle}>Skriv feedback</div>
          <p style={{ ...mutedTextStyle, marginBottom: "12px" }}>
            Beskriv gärna vad du gjorde, vad som saknas eller vad som kan bli tydligare.
          </p>
          <div style={compactFieldLabelStyle}>Meddelande</div>
          <textarea
            rows={4}
            value={feedbackText}
            onChange={(event) => setFeedbackText(event.target.value)}
            placeholder="Skriv kort vad du vill skicka in"
            style={{ ...inputStyle, ...textareaStyle, width: "100%", marginBottom: "12px" }}
          />
          <div style={feedbackComposerActionsStyle}>
            <button
              type="button"
              onClick={() => {
                setIsFeedbackOpen(false)
                setFeedbackText("")
              }}
              style={secondaryButtonStyle}
            >
              Avbryt
            </button>
            <button
              type="button"
              onClick={handleSubmitFeedback}
              disabled={isSubmittingFeedback}
              style={{
                ...buttonStyle,
                opacity: isSubmittingFeedback ? 0.7 : 1,
                cursor: isSubmittingFeedback ? "default" : "pointer",
              }}
            >
              {isSubmittingFeedback ? "Sparar..." : "Skicka feedback"}
            </button>
          </div>
        </div>
      )}

      {(profile?.role === "coach" || profile?.role === "head_admin") && (
        <>
          {!showCoachBottomNav && !showAdminBottomNav && (
            <div
              style={{
                ...coachTabsWrapStyle,
                flexWrap: isMobile ? "nowrap" : coachTabsWrapStyle.flexWrap,
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
                    ...coachTabButtonStyle,
                    flex: isMobile ? "0 0 auto" : undefined,
                    whiteSpace: "nowrap",
                    minHeight: isMobile ? "44px" : undefined,
                    scrollSnapAlign: isMobile ? "start" : "none",
                    ...(coachView === tab.key ? activeCoachTabButtonStyle : {}),
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          <div
            style={{
              ...cardStyle,
              padding: isMobile ? "16px 14px" : cardStyle.padding,
              borderRadius: isMobile ? "20px" : cardStyle.borderRadius,
              marginBottom: isMobile ? "16px" : cardStyle.marginBottom,
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
                />
              )
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
                cardTitleStyle={cardTitleStyle}
                mutedTextStyle={mutedTextStyle}
                inputStyle={inputStyle}
                buttonStyle={buttonStyle}
                isMobile={isMobile}
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
                cardTitleStyle={cardTitleStyle}
                inputStyle={inputStyle}
                buttonStyle={buttonStyle}
                secondaryButtonStyle={secondaryButtonStyle}
                mutedTextStyle={mutedTextStyle}
                isMobile={isMobile}
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
                inputStyle={inputStyle}
                buttonStyle={buttonStyle}
                secondaryButtonStyle={secondaryButtonStyle}
                mutedTextStyle={mutedTextStyle}
                cardTitleStyle={cardTitleStyle}
                isMobile={isMobile}
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
                cardTitleStyle={cardTitleStyle}
                mutedTextStyle={mutedTextStyle}
                inputStyle={inputStyle}
                buttonStyle={buttonStyle}
                secondaryButtonStyle={secondaryButtonStyle}
                isMobile={isMobile}
              />
            )}

            {coachView === "stats" && (
              <StatsPage
                candidatePlayers={statisticsPlayers}
                exercises={exercisesFromDB}
                currentUserId={user?.id}
                cardTitleStyle={cardTitleStyle}
                mutedTextStyle={mutedTextStyle}
                inputStyle={inputStyle}
                secondaryButtonStyle={secondaryButtonStyle}
                isMobile={isMobile}
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
                cardTitleStyle={cardTitleStyle}
                mutedTextStyle={mutedTextStyle}
                secondaryButtonStyle={secondaryButtonStyle}
                buttonStyle={buttonStyle}
                isMobile={isMobile}
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
                newPassRunningIntervalTime={newPassRunningIntervalTime}
                setNewPassRunningIntervalTime={setNewPassRunningIntervalTime}
                newPassRunningIntervalsCount={newPassRunningIntervalsCount}
                setNewPassRunningIntervalsCount={setNewPassRunningIntervalsCount}
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
                renamePassRunningIntervalTime={renamePassRunningIntervalTime}
                setRenamePassRunningIntervalTime={setRenamePassRunningIntervalTime}
                renamePassRunningIntervalsCount={renamePassRunningIntervalsCount}
                setRenamePassRunningIntervalsCount={setRenamePassRunningIntervalsCount}
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
                cardTitleStyle={cardTitleStyle}
                secondaryButtonStyle={secondaryButtonStyle}
                mutedTextStyle={mutedTextStyle}
                inputStyle={inputStyle}
                buttonStyle={buttonStyle}
                isMobile={isMobile}
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
                inputStyle={inputStyle}
                buttonStyle={buttonStyle}
                cardTitleStyle={cardTitleStyle}
                isMobile={isMobile}
                importedPlayers={importedPlayers}
                importFileName={importFileName}
                isParsingImportFile={isParsingImportFile}
                handlePlayerImportFile={handlePlayerImportFile}
                handleImportPlayers={handleImportPlayers}
                isImportingPlayers={isImportingPlayers}
                importResults={importResults}
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
                mutedTextStyle={mutedTextStyle}
                cardTitleStyle={cardTitleStyle}
                inputStyle={inputStyle}
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
                buttonStyle={buttonStyle}
                isMobile={isMobile}
              />
            )}
          </div>

          {showCoachBottomNav && (
            <div style={coachBottomNavWrapStyle}>
              <div style={coachBottomNavStyle}>
                {coachBottomTabs.map((tab) => {
                  const isActive = coachView === tab.key

                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => navigateCoachSection(tab.key)}
                      style={{
                        ...coachBottomNavButtonStyle,
                        color: isActive ? "#dc2626" : "#6b7280",
                      }}
                    >
                      <span
                        style={{
                          ...coachBottomNavIconWrapStyle,
                          backgroundColor: isActive ? "#fff1f1" : "transparent",
                        }}
                      >
                        {renderCoachBottomNavIcon(tab.icon, isActive)}
                      </span>
                      <span style={coachBottomNavLabelStyle}>{tab.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {showAdminBottomNav && (
            <div style={coachBottomNavWrapStyle}>
              <div style={coachBottomNavStyle}>
                {adminBottomTabs.map((tab) => {
                  const isActive = coachView === tab.key

                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => navigateCoachSection(tab.key)}
                      style={{
                        ...coachBottomNavButtonStyle,
                        color: isActive ? "#b61e24" : "#6b7280",
                      }}
                    >
                      <span
                        style={{
                          ...coachBottomNavIconWrapStyle,
                          backgroundColor: isActive ? "#fff1f1" : "transparent",
                        }}
                      >
                        {renderCoachBottomNavIcon(tab.icon, isActive)}
                      </span>
                      <span style={coachBottomNavLabelStyle}>{tab.label}</span>
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
              <div style={activeWorkoutPageBadgeStyle}>Pågående träningspass</div>
              <div style={activeWorkoutPageTitleStyle}>
                {activeWorkoutData?.label || "Träningspass"}
              </div>
              <div style={activeWorkoutPageTextStyle}>
                Du är nu inne i passet. Svep eller bläddra mellan övningskorten och avsluta på sista kortet.
              </div>
              <button
                type="button"
                onClick={cancelWorkout}
                style={{
                  ...activeWorkoutCancelButtonStyle,
                  width: isMobile ? "100%" : "auto",
                  marginTop: "14px",
                }}
              >
                Avbryt och gå tillbaka
              </button>
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
            <div style={{ display: "grid", gap: "16px" }}>
              <div style={playerHomeHeaderStyle}>
                <div style={playerHomeHeaderInlineStyle}>
                  <div style={playerHomeHeaderTitleStyle}>{playerFirstName}</div>
                  <div style={playerHomeHeaderTextStyle}>{teamName}</div>
                </div>
              </div>

              <div style={playerHomeStatsGridStyle(isMobile)}>
                <div style={playerHomeStatCardStyle}>
                  <div style={playerHomeStatLabelStyle}>Tilldelade pass</div>
                  <div style={{ ...playerHomeStatValueStyle, color: "#b61e24" }}>
                    {Object.keys(visibleWorkouts).length}
                  </div>
                </div>
                <div style={playerHomeStatCardStyle}>
                  <div style={playerHomeStatLabelStyle}>Olästa</div>
                  <div style={playerHomeStatValueStyle}>{unreadMessageCount}</div>
                </div>
                <div style={playerHomeStatCardStyle}>
                  <div style={playerHomeStatLabelStyle}>Loggade pass</div>
                  <div style={playerHomeStatValueStyle}>{completedWorkoutSessions.length}</div>
                </div>
              </div>

              <div style={playerQuickActionsGridStyle(isMobile)}>
                <div style={playerQuickActionBlockStyle}>
                  <button
                    type="button"
                    onClick={() => navigatePlayerSection("pass")}
                    style={playerQuickActionCardStyle}
                  >
                    <div style={playerQuickActionTopRowStyle}>
                      <div style={playerQuickActionTitleStyle}>Dina pass</div>
                      <div style={{ ...playerQuickActionArrowStyle, color: "#b61e24", backgroundColor: "#fff1f1" }}>→</div>
                    </div>
                    <div style={playerQuickActionTextStyle}>
                      Välj ett av dina pass
                    </div>
                  </button>
                </div>

                <div style={playerQuickActionBlockStyle}>
                  <button
                    type="button"
                    onClick={() => navigatePlayerSection("stats")}
                    style={playerQuickActionCardStyle}
                  >
                    <div style={playerQuickActionTopRowStyle}>
                      <div style={playerQuickActionTitleStyle}>Statistik</div>
                      <div style={{ ...playerQuickActionArrowStyle, color: "#1d4ed8", backgroundColor: "#eef4ff" }}>→</div>
                    </div>
                    <div style={playerQuickActionTextStyle}>
                      Följ din utveckling i olika övningar
                    </div>
                  </button>
                </div>

                <div style={playerQuickActionBlockStyle}>
                  <button
                    type="button"
                    onClick={() => togglePlayerOverviewPanel("history")}
                    style={playerQuickActionCardStyle}
                  >
                    <div style={playerQuickActionTopRowStyle}>
                      <div style={playerQuickActionTitleStyle}>Historik</div>
                    <div style={{ ...playerQuickActionArrowStyle, color: "#0f766e", backgroundColor: "#ecfeff" }}>
                      {playerOverviewPanel === "history" ? "−" : "+"}
                    </div>
                  </div>
                  <div style={playerQuickActionTextStyle}>
                    Se de senaste genomförda passen
                  </div>
                </button>

                </div>

                <div style={playerQuickActionBlockStyle}>
                  <button
                    type="button"
                    onClick={() => togglePlayerOverviewPanel("running")}
                    style={playerQuickActionCardStyle}
                  >
                    <div style={playerQuickActionTopRowStyle}>
                      <div style={playerQuickActionTitleStyle}>Egen aktivitet</div>
                      <div style={{ ...playerQuickActionArrowStyle, color: "#b45309", backgroundColor: "#fff7ed" }}>
                        {playerOverviewPanel === "running" ? "−" : "+"}
                      </div>
                    </div>
                    <div style={playerQuickActionTextStyle}>
                      Registrera träning du gjort i andra sporter
                    </div>
                  </button>

                </div>

                {playerOverviewPanel === "history" && (
                  <div style={playerOverviewPanelRowStyle}>
                    <div style={playerOverviewPanelStyle}>
                      <div>
                        <div style={playerOverviewPanelTitleStyle}>Historik</div>
                        <div style={playerOverviewPanelTextStyle}>
                          Se senaste pass, aktiviteter och enkel statistik.
                        </div>
                      </div>

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
                                        style={{ ...inputStyle, width: "100%" }}
                                      />
                                      <button
                                        type="button"
                                        onClick={() => handleSaveWorkoutDate(session)}
                                        disabled={savingWorkoutDateSessionId === session.session_id}
                                        style={{
                                          ...secondaryButtonStyle,
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
                                        style={{ ...inputStyle, width: "100%" }}
                                      />
                                      <button
                                        type="button"
                                        onClick={() => handleSaveWorkoutDate(session)}
                                        disabled={savingWorkoutDateSessionId === session.session_id}
                                        style={{
                                          ...secondaryButtonStyle,
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
                  </div>
                )}

                {playerOverviewPanel === "running" && (
                  <div style={playerOverviewPanelRowStyle}>
                    <div style={playerOverviewPanelStyle}>
                      <div>
                        <div style={playerOverviewPanelTitleStyle}>Egen aktivitet</div>
                        <div style={playerOverviewPanelTextStyle}>
                          Spara träning du gör i andra sporter utanför lagpassen.
                        </div>
                      </div>

                      <div style={playerAccordionContentStyle}>
                        <div
                          style={{
                            display: "grid",
                            gap: "10px",
                            gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
                          }}
                        >
                          <input
                            type="date"
                            value={runningDraft.log_date}
                            onChange={(event) => handleRunningDraftChange("log_date", event.target.value)}
                            style={{ ...inputStyle, width: "100%", backgroundColor: "#ffffff", color: "#111827" }}
                          />
                          <select
                            value={runningDraft.free_activity_type}
                            onChange={(event) => handleRunningDraftChange("free_activity_type", event.target.value)}
                            style={{ ...inputStyle, width: "100%", backgroundColor: "#ffffff", color: "#111827" }}
                          >
                            <option value="">Välj aktivitet</option>
                            {FREE_ACTIVITY_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          {!runningDraft.free_activity_type ? (
                            <div
                              style={{
                                ...mutedTextStyle,
                                gridColumn: isMobile ? "auto" : "span 2",
                              }}
                            >
                              Börja med att välja aktivitet. Då visas rätt fält direkt under.
                            </div>
                          ) : runningDraft.free_activity_type === "running" ? (
                            <select
                              value={runningDraft.running_type}
                              onChange={(event) => handleRunningDraftChange("running_type", event.target.value)}
                              style={{ ...inputStyle, width: "100%", backgroundColor: "#ffffff", color: "#111827" }}
                            >
                              <option value="distance">Distans</option>
                              <option value="intervals">Intervaller</option>
                            </select>
                          ) : (
                            <input
                              type="text"
                              placeholder="Tid/duration, t.ex. 75 min"
                              value={runningDraft.running_time}
                              onChange={(event) => handleRunningDraftChange("running_time", event.target.value)}
                              style={{ ...inputStyle, width: "100%", backgroundColor: "#ffffff", color: "#111827" }}
                            />
                          )}

                          {runningDraft.free_activity_type === "running" && runningDraft.running_type === "intervals" ? (
                            <>
                              <input
                                type="text"
                                placeholder="Tid/intervall, t.ex. 45 sek"
                                value={runningDraft.interval_time}
                                onChange={(event) => handleRunningDraftChange("interval_time", event.target.value)}
                                style={{ ...inputStyle, width: "100%", backgroundColor: "#ffffff", color: "#111827" }}
                              />
                              <input
                                type="number"
                                placeholder="Antal intervaller"
                                value={runningDraft.intervals_count}
                                onChange={(event) => handleRunningDraftChange("intervals_count", event.target.value)}
                                style={{ ...inputStyle, width: "100%", backgroundColor: "#ffffff", color: "#111827" }}
                              />
                            </>
                          ) : runningDraft.free_activity_type === "running" ? (
                            <>
                              <input
                                type="text"
                                placeholder="Distans i km"
                                value={runningDraft.running_distance}
                                onChange={(event) => handleRunningDraftChange("running_distance", event.target.value)}
                                style={{ ...inputStyle, width: "100%", backgroundColor: "#ffffff", color: "#111827" }}
                              />
                              <input
                                type="text"
                                placeholder="Tid, t.ex. 24:30"
                                value={runningDraft.running_time}
                                onChange={(event) => handleRunningDraftChange("running_time", event.target.value)}
                                style={{ ...inputStyle, width: "100%", backgroundColor: "#ffffff", color: "#111827" }}
                              />
                              <input
                                type="number"
                                placeholder="Snittpuls"
                                value={runningDraft.average_pulse}
                                onChange={(event) => handleRunningDraftChange("average_pulse", event.target.value)}
                                style={{
                                  ...inputStyle,
                                  width: "100%",
                                  backgroundColor: "#ffffff",
                                  color: "#111827",
                                  gridColumn: isMobile ? "auto" : "span 2",
                                }}
                              />
                            </>
                          ) : null}
                          {runningDraft.free_activity_type && runningDraft.free_activity_type !== "running" && (
                            <div
                              style={{
                                ...mutedTextStyle,
                                marginTop: "-2px",
                                gridColumn: isMobile ? "auto" : "span 2",
                              }}
                            >
                              Börja enkelt: välj aktivitet och skriv ungefär hur länge du tränade.
                            </div>
                          )}
                          {runningDraft.free_activity_type ? (
                            <textarea
                              rows={3}
                              placeholder="Kommentar, t.ex. hur det kändes eller vad du tränade"
                              value={runningDraft.comment}
                              onChange={(event) => handleRunningDraftChange("comment", event.target.value)}
                              style={{
                                ...inputStyle,
                                width: "100%",
                                minHeight: "96px",
                                resize: "vertical",
                                backgroundColor: "#ffffff",
                                color: "#111827",
                                gridColumn: isMobile ? "auto" : "span 2",
                              }}
                            />
                          ) : null}
                        </div>

                        <button
                          type="button"
                          onClick={handleSaveRunningSession}
                          disabled={isSavingRunningSession}
                          style={{
                            ...buttonStyle,
                            width: isMobile ? "100%" : "auto",
                            marginTop: "12px",
                            opacity: isSavingRunningSession ? 0.7 : 1,
                            cursor: isSavingRunningSession ? "default" : "pointer",
                          }}
                        >
                          {isSavingRunningSession ? "Sparar..." : "Spara aktivitet"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {!isWorkoutActive && playerView === "pass" && (
            <>
              <div style={playerPageIntroStyle}>
                <h2 style={{ ...sectionTitleStyle, fontSize: isMobile ? "24px" : "28px", marginBottom: "8px" }}>
                  Dina pass
                </h2>
                <p style={mutedTextStyle}>
                  Välj passet du vill köra. Du ser när du körde det senast innan du startar.
                </p>
              </div>

              {Object.keys(visibleWorkouts).length === 0 ? (
                <p style={mutedTextStyle}>
                  Inga pass är tilldelade ännu. Be en tränare lägga till pass åt dig.
                </p>
              ) : (
                <div style={pickerGridStyle}>
                  {groupedVisibleWorkoutEntries.map((group) => (
                    <section
                      key={group.workoutKind}
                      style={{
                        ...passCategorySectionStyle,
                        backgroundColor: group.theme.sectionBackground,
                        borderColor: group.theme.sectionBorder,
                      }}
                    >
                      <div style={passCategoryHeaderStyle(isMobile)}>
                        <div>
                          <div
                            style={{
                              ...passCategoryBadgeStyle,
                              backgroundColor: group.theme.badgeBackground,
                              color: group.theme.badgeColor,
                            }}
                          >
                            {group.theme.title}
                          </div>
                          <div style={passCategoryTitleStyle}>{group.theme.title}</div>
                          <div style={passCategoryTextStyle}>{group.theme.description}</div>
                        </div>
                        <div style={passCategoryCountStyle}>
                          {group.entries.length} {group.entries.length === 1 ? "pass" : "pass"}
                        </div>
                      </div>

                      <div style={passCategoryListStyle}>
                        {group.entries.map(([key, workout], index) => {
                          const isSelected = selectedWorkout === key
                          const passStatus = getPassStatus(latestPassDates[key])
                          const isRecommended = index === 0 && group.entries.length > 1

                          return (
                            <div
                              key={key}
                              style={{
                                ...passPickerItemStyle,
                                borderColor: isSelected ? "#c62828" : passPickerItemStyle.borderColor,
                                background: isSelected
                                  ? "linear-gradient(180deg, rgba(255,245,245,1), rgba(255,250,250,0.98))"
                                  : passPickerItemStyle.background,
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedWorkout((current) => (current === key ? null : key))
                                }}
                                aria-pressed={isSelected}
                                style={{
                                  ...pickerButtonStyle,
                                  marginBottom: 0,
                                }}
                              >
                                <div style={pickerHeaderRowStyle}>
                                  <div style={{ minWidth: 0 }}>
                                    <div style={pickerPillRowStyle}>
                                      <div
                                        style={{
                                          ...pickerStatusPillStyle,
                                          backgroundColor: passStatus.backgroundColor,
                                          color: passStatus.color,
                                        }}
                                      >
                                        {passStatus.label}
                                      </div>
                                      <div
                                        style={{
                                          ...pickerStatusPillStyle,
                                          backgroundColor: group.theme.badgeBackground,
                                          color: group.theme.badgeColor,
                                        }}
                                      >
                                        {workout.workoutKind === "gym"
                                          ? getGymPassTypeLabel(workout.gymPassType)
                                          : getWorkoutKindLabel(workout.workoutKind)}
                                      </div>
                                      {isRecommended && (
                                        <div
                                          style={{
                                            ...pickerStatusPillStyle,
                                            backgroundColor: "#18202b",
                                            color: "#ffffff",
                                          }}
                                        >
                                          Rekommenderat nu
                                        </div>
                                      )}
                                    </div>
                                    <div style={pickerTitleStyle}>{workout.label}</div>
                                  </div>
                                  <div style={pickerExpandIconStyle(isSelected)}>{isSelected ? "−" : "+"}</div>
                                </div>

                                <div style={pickerSummaryRowStyle}>
                                  <div style={pickerSummaryTextStyle}>
                                    Senast: {formatDate(latestPassDates[key])}
                                  </div>
                                  <div style={pickerSummaryDividerStyle}>•</div>
                                  <div style={pickerSummaryTextStyle}>{formatDaysSince(latestPassDates[key])}</div>
                                </div>

                                <div style={pickerSecondarySummaryStyle}>
                                  {workout.workoutKind === "running"
                                    ? buildRunningSummary({
                                        running_type: workout.runningType,
                                        interval_time: workout.runningConfig?.interval_time,
                                        intervals_count: workout.runningConfig?.intervals_count,
                                        running_distance: workout.runningConfig?.running_distance,
                                        running_time: workout.runningConfig?.running_time,
                                      })
                                    : `${workout.exercises.length} övningar`}
                                </div>

                                <div style={pickerActionHintStyle}>
                                  {isSelected ? "Tryck igen för att stänga" : "Tryck för att visa passet"}
                                </div>
                              </button>

                              {isSelected && (
                                <div
                                  style={{
                                    ...passPreviewCardStyle,
                                    padding: isMobile ? "18px 16px" : passPreviewCardStyle.padding,
                                  }}
                                >
                                  <div style={passPreviewContentCardStyle}>
                                    {workout.info && (
                                      <div style={{ marginBottom: "14px" }}>
                                        <div style={passPreviewStatLabelStyle}>Info om passet</div>
                                        <div style={passPreviewInfoTextStyle}>{workout.info}</div>
                                      </div>
                                    )}

                                    <div style={passPreviewStatLabelStyle}>
                                      {workout.workoutKind === "running" ? "Löppass" : "Övningar"}
                                    </div>
                                    <div style={passPreviewExerciseCountStyle}>
                                      {workout.workoutKind === "running"
                                        ? buildRunningSummary({
                                            running_type: workout.runningType,
                                            interval_time: workout.runningConfig?.interval_time,
                                            intervals_count: workout.runningConfig?.intervals_count,
                                            running_distance: workout.runningConfig?.running_distance,
                                            running_time: workout.runningConfig?.running_time,
                                          })
                                        : `${workout.exercises.length} st`}
                                    </div>

                                    {workout.workoutKind !== "running" && workout.exercises.length > 0 && (
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

                                    {workout.workoutKind !== "running" && workout.exercises.length === 0 && (
                                      <div style={passPreviewEmptyStyle}>Inga övningar tillagda ännu</div>
                                    )}
                                  </div>

                                  <button
                                    onClick={() => startWorkout(key)}
                                    style={{ ...buttonStyle, width: isMobile ? "100%" : "auto" }}
                                  >
                                    Starta pass
                                  </button>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </>
          )}

          {!isWorkoutActive && playerView === "stats" && (
            <>
              <div style={playerPageIntroStyle}>
                <h2 style={{ ...sectionTitleStyle, fontSize: isMobile ? "24px" : "28px", marginBottom: "8px" }}>
                  Din statistik
                </h2>
                <p style={mutedTextStyle}>
                  Se vilka övningar du kört och följ utvecklingen över tid. Vikt visas tydligast när den finns loggad.
                </p>
              </div>

              {isLoadingPlayerExerciseProgress ? (
                <div style={playerStatsEmptyStyle}>Laddar statistik...</div>
              ) : playerExerciseProgress.length === 0 ? (
                <div style={playerStatsEmptyStyle}>Ingen statistik ännu. Logga några pass först.</div>
              ) : (
                <div style={playerStatsLayoutStyle(isMobile)}>
                  <div style={playerStatsExerciseListStyle}>
                    {playerExerciseProgress.map((entry) => {
                      const isSelected = selectedPlayerStatsExercise?.exercise_id === entry.exercise_id

                      return (
                        <button
                          key={entry.exercise_id}
                          type="button"
                          onClick={() => setSelectedPlayerStatsExerciseId(entry.exercise_id)}
                          style={{
                            ...playerStatsExerciseButtonStyle,
                            borderColor: isSelected ? "#b61e24" : playerStatsExerciseButtonStyle.borderColor,
                            backgroundColor: isSelected ? "#fff6f6" : playerStatsExerciseButtonStyle.backgroundColor,
                          }}
                        >
                          <div style={playerStatsExerciseTitleStyle}>{entry.exercise_display_name}</div>
                          <div style={playerStatsExerciseMetaStyle}>
                            {entry.best_weight_entry?.top_weight != null
                              ? `Bästa vikt ${entry.best_weight_entry.top_weight} kg`
                              : `${entry.entry_count} loggade pass`}
                          </div>
                        </button>
                      )
                    })}
                  </div>

                  {selectedPlayerStatsExercise && (
                    <div style={playerStatsCardStyle}>
                      <div style={playerStatsHeaderStyle(isMobile)}>
                        <div>
                          <div style={playerStatsTitleStyle}>{selectedPlayerStatsExercise.exercise_display_name}</div>
                          <div style={playerStatsTextStyle}>
                            {selectedPlayerStatsExercise.weight_entries.length > 0
                              ? "Viktutveckling över tid"
                              : "Här ser du dina senaste loggningar för övningen"}
                          </div>
                        </div>
                        <div style={playerStatsSummaryPillStyle}>
                          {selectedPlayerStatsExercise.best_weight_entry?.top_weight != null
                            ? `${selectedPlayerStatsExercise.best_weight_entry.top_weight} kg bäst`
                            : `${selectedPlayerStatsExercise.entry_count} pass`}
                        </div>
                      </div>

                      {selectedPlayerStatsExercise.weight_entries.length > 0 ? (
                        <div style={playerChartWrapStyle}>
                          <PlayerProgressChart entries={selectedPlayerStatsExercise.weight_entries} />
                        </div>
                      ) : (
                        <div style={playerStatsEmptyInlineStyle}>
                          Ingen vikt loggad ännu för den här övningen. Fortsätt logga så visas grafen här.
                        </div>
                      )}

                      <div style={playerStatsRecentListStyle}>
                        {(selectedPlayerStatsExercise.weight_entries.length > 0
                          ? selectedPlayerStatsExercise.weight_entries.slice().reverse()
                          : [selectedPlayerStatsExercise.latest_entry].filter(Boolean)
                        )
                          .slice(0, 6)
                          .map((entry) => (
                            <div
                              key={`${selectedPlayerStatsExercise.exercise_id}-${entry.created_at}`}
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
                                {entry.top_weight != null ? `${entry.top_weight} kg` : "Loggat"}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {showPlayerBottomNav && (
        <div style={coachBottomNavWrapStyle}>
          <div style={coachBottomNavStyle}>
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
                    color: isActive ? "#b61e24" : "#6b7280",
                  }}
                >
                  <span
                    style={{
                      ...coachBottomNavIconWrapStyle,
                      backgroundColor: isActive ? "#fff1f1" : "transparent",
                    }}
                  >
                    {renderCoachBottomNavIcon(tab.icon, isActive)}
                  </span>
                  <span style={coachBottomNavLabelStyle}>{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {status && <p style={statusStyle}>{status}</p>}

      {selectedWorkout && isWorkoutActive && (
        <div style={activeWorkoutPageWrapStyle}>
          <div style={activeWorkoutPageMetaRowStyle(isMobile)}>
            <div style={activeWorkoutPageMetaCardStyle}>
              <div style={activeWorkoutPageMetaLabelStyle}>Pass</div>
              <div style={activeWorkoutPageMetaValueStyle}>{activeWorkoutData?.label}</div>
            </div>
            <div style={activeWorkoutPageMetaCardStyle}>
              <div style={activeWorkoutPageMetaLabelStyle}>Övning</div>
              <div style={activeWorkoutPageMetaValueStyle}>{activeWorkoutProgressSummary}</div>
            </div>
          </div>

          {isMobile && activeWorkoutSlideCount > 1 && (
            <div style={exerciseCarouselToolbarStyle}>
              <button
                type="button"
                onClick={() => scrollToExerciseCard(Math.max(activeExerciseIndex - 1, 0))}
                disabled={activeExerciseIndex === 0}
                style={{
                  ...secondaryButtonStyle,
                  padding: "10px 14px",
                  opacity: activeExerciseIndex === 0 ? 0.45 : 1,
                  cursor: activeExerciseIndex === 0 ? "default" : "pointer",
                }}
              >
                Föregående
              </button>

              <div style={exerciseCarouselStatusStyle}>
                {activeWorkoutProgressSummary}
              </div>

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
                  ...secondaryButtonStyle,
                  padding: "10px 14px",
                  opacity: activeExerciseIndex === activeWorkoutSlideCount - 1 ? 0.45 : 1,
                  cursor: activeExerciseIndex === activeWorkoutSlideCount - 1 ? "default" : "pointer",
                }}
              >
                Nästa
              </button>
            </div>
          )}

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
              <div
                data-exercise-card="true"
                style={
                  isMobile
                    ? {
                        ...cardStyle,
                        ...exerciseSwipeCardStyle,
                      }
                    : cardStyle
                }
              >
                <div style={exerciseProgressStyle}>Uppvärmning</div>

                <h3 style={{ ...cardTitleStyle, marginBottom: "8px" }}>Uppvärmning</h3>

                {!!activeWorkoutWarmup.cardio && (
                  <div style={{ marginBottom: activeWorkoutWarmup.technique.length ? 14 : 0 }}>
                    <p style={subheadingStyle}>Pulshöjande aktivitet</p>
                    <p style={mutedTextStyle}>{activeWorkoutWarmup.cardio}</p>
                  </div>
                )}

                {!!activeWorkoutWarmup.technique.length && (
                  <div>
                    <p style={subheadingStyle}>Teknikuppvärmning</p>
                    <div style={mutedTextStyle}>
                      {activeWorkoutWarmup.technique.map((item, index) => (
                        <div key={index}>{index + 1}. {item}</div>
                      ))}
                    </div>
                  </div>
                )}

                {!activeWorkoutWarmup.cardio && !activeWorkoutWarmup.technique.length && (
                  <div style={mutedTextStyle}>Ingen uppvärmning inlagd för passet ännu.</div>
                )}
              </div>

          {isRunningWorkoutActive ? (
            <div
              data-exercise-card="true"
              style={
                isMobile
                  ? {
                      ...cardStyle,
                      ...exerciseSwipeCardStyle,
                    }
                  : cardStyle
              }
            >
              <div style={exerciseProgressStyle}>Löppass</div>
              <h3 style={{ ...cardTitleStyle, marginBottom: "8px" }}>{activeWorkoutData?.label || "Löppass"}</h3>
              <p style={{ ...mutedTextStyle, marginBottom: "14px" }}>
                {buildRunningSummary({
                  running_type: activeWorkoutData?.runningType,
                  interval_time: activeWorkoutData?.runningConfig?.interval_time,
                  intervals_count: activeWorkoutData?.runningConfig?.intervals_count,
                  running_distance: activeWorkoutData?.runningConfig?.running_distance,
                  running_time: activeWorkoutData?.runningConfig?.running_time,
                })}
              </p>

              {activeWorkoutData?.runningType === "intervals" ? (
                <div style={{ display: "grid", gap: "10px" }}>
                  <input
                    placeholder="Tid per intervall"
                    value={activeRunningInput.interval_time}
                    onChange={(e) => handleActiveRunningInputChange("interval_time", e.target.value)}
                    style={{ ...inputStyle, width: "100%" }}
                  />
                  <input
                    placeholder="Antal intervaller"
                    value={activeRunningInput.intervals_count}
                    onChange={(e) => handleActiveRunningInputChange("intervals_count", e.target.value)}
                    style={{ ...inputStyle, width: "100%" }}
                  />
                </div>
              ) : (
                <div style={{ display: "grid", gap: "10px" }}>
                  <input
                    placeholder="Distans i km"
                    value={activeRunningInput.running_distance}
                    onChange={(e) => handleActiveRunningInputChange("running_distance", e.target.value)}
                    style={{ ...inputStyle, width: "100%" }}
                  />
                  <input
                    placeholder="Tid, t.ex. 24:30"
                    value={activeRunningInput.running_time}
                    onChange={(e) => handleActiveRunningInputChange("running_time", e.target.value)}
                    style={{ ...inputStyle, width: "100%" }}
                  />
                  <input
                    placeholder="Snittpuls"
                    value={activeRunningInput.average_pulse}
                    onChange={(e) => handleActiveRunningInputChange("average_pulse", e.target.value)}
                    style={{ ...inputStyle, width: "100%" }}
                  />
                </div>
              )}
            </div>
          ) : activeWorkoutExercises.map((exercise, i) => {
            const exerciseOptions = getExerciseExecutionOptions(exercise)
            const selectedExercise = getSelectedExerciseExecution(
              exercise,
              selectedExerciseOptionKeys[i]
            )
            const protocolConfig = getExerciseProtocolConfig(selectedExercise || exercise)
            const isProtocol = Boolean(protocolConfig)
            const totalExercises = activeWorkoutExerciseCount
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
            const targetRequestComposerKey = `${selectedExercise?.exerciseId || exercise.exerciseId}:${
              currentRepRangeBucket?.key || "none"
            }`
            const isTargetRequestComposerOpen =
              activeTargetChangeRequestDraft?.composer_key === targetRequestComposerKey
            const exerciseTextSections = getExerciseTextSections({
              description: selectedExercise?.description,
              guide: exercise.guide,
            })
            const hasExerciseDetails = !!(
              exerciseTextSections.primaryText ||
              exerciseTextSections.secondaryText ||
              selectedExercise?.mediaUrl
            )

            return (
              <div
                key={i}
                data-exercise-card="true"
                style={
                  isMobile
                    ? {
                        ...cardStyle,
                        ...exerciseSwipeCardStyle,
                      }
                    : cardStyle
                }
                >
                <div style={exerciseProgressStyle}>Övning {i + 1} / {totalExercises}</div>

                <button
                  type="button"
                  onClick={() =>
                    setExpandedInfo((prev) => ({
                      ...prev,
                      [infoKey]: !prev[infoKey],
                    }))
                  }
                  style={{
                    ...exerciseHeaderButtonStyle,
                    marginBottom: hasExerciseDetails && isInfoExpanded ? "14px" : "10px",
                    cursor: hasExerciseDetails ? "pointer" : "default",
                  }}
                >
                  <div>
                    <h3 style={{ ...cardTitleStyle, marginBottom: "4px" }}>
                      {selectedExercise?.displayName || selectedExercise?.name || exercise.displayName || exercise.name}
                    </h3>
                    <div style={exerciseHeaderHintStyle}>
                      {hasExerciseDetails
                        ? isInfoExpanded
                          ? "Dölj beskrivning och video"
                          : "Tryck för att se beskrivning och video"
                        : "Ingen extra information tillagd ännu"}
                    </div>
                    {!isProtocol &&
                      selectedExercise?.executionSide &&
                      selectedExercise.executionSide !== "standard" && (
                      <div style={{ ...exerciseHeaderHintStyle, marginTop: "4px", color: "#991b1b" }}>
                        {getExerciseExecutionSideHint(
                          selectedExercise.executionSide,
                          selectedExercise?.type || exercise.type
                        )}
                      </div>
                    )}
                  </div>
                  {hasExerciseDetails && (
                    <div style={exerciseHeaderIconStyle}>{isInfoExpanded ? "−" : "+"}</div>
                  )}
                </button>

                {hasExerciseDetails && isInfoExpanded && (
                  <div style={exerciseDetailsPanelStyle}>
                    {!selectedExercise?.isBase && (
                      <div style={alternativeSelectionMetaStyle}>
                        Alternativ till {exercise.displayName || exercise.name}
                      </div>
                    )}

                    {exerciseTextSections.primaryText && (
                      <div>
                        <div style={exerciseDetailsLabelStyle}>{exerciseTextSections.primaryLabel}</div>
                        <p style={exerciseDescriptionStyle}>{exerciseTextSections.primaryText}</p>
                      </div>
                    )}

                    {exerciseTextSections.secondaryText && (
                      <div style={{ marginTop: exerciseTextSections.primaryText ? "10px" : 0 }}>
                        <div style={exerciseDetailsLabelStyle}>{exerciseTextSections.secondaryLabel}</div>
                        <p style={guideStyle}>{exerciseTextSections.secondaryText}</p>
                      </div>
                    )}

                    {selectedExercise?.mediaUrl && (
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
                    )}
                  </div>
                )}

                {exerciseOptions.length > 1 && (
                  <div style={alternativeSelectionCardStyle}>
                    <div style={alternativeSelectionTitleStyle}>Alternativa övningar</div>
                    <div style={alternativeSelectionHintStyle}>Välj vilken variant du kör idag.</div>
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
                              borderColor: isSelectedOption ? "#1d4ed8" : "#dbe5ef",
                              backgroundColor: isSelectedOption ? "#eff6ff" : "#ffffff",
                              color: isSelectedOption ? "#1d4ed8" : "#18202b",
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
                )}

                {!isProtocol &&
                  !isLoadingPlayerTargets &&
                  ((currentTarget &&
                    (currentTarget.target_reps != null ||
                      resolvedCurrentTargetWeight != null ||
                      String(currentTarget.target_comment || "").trim() ||
                      currentTarget.target_reps_mode === "max")) ||
                    (profile?.individual_goals_enabled === false && latestExerciseTopSet)) && (
                  <div style={targetBoxStyle}>
                    <div style={targetBoxHeaderStyle}>
                      <div style={targetBoxTitleStyle}>
                        {profile?.individual_goals_enabled === false
                          ? "Rekommendation från historik"
                          : "Individuella mål"}
                      </div>
                      {latestExerciseTopSet && (
                        <div style={targetHistoryBadgeStyle}>Senaste passet</div>
                      )}
                    </div>

                    {latestExerciseTopSet ? (
                      <div style={latestSummaryWrapStyle}>
                        <div style={latestSummaryLabelStyle}>Senast gjorde du</div>
                        <div style={latestSummaryValueStyle}>
                          {formatLatestSetValue(selectedExercise?.type || exercise.type, latestExerciseTopSet)}
                        </div>
                        <div style={latestSummaryMetaStyle}>
                          Set {latestExerciseTopSet.set_number}
                          {latestExerciseDate ? ` • ${formatDate(latestExerciseDate)}` : ""}
                        </div>
                      </div>
                    ) : (
                      <div style={emptyTargetStyle}>Ingen historik ännu</div>
                    )}

                    <div style={targetSectionDividerStyle} />
                    <div style={targetSectionLabelStyle}>
                      {profile?.individual_goals_enabled === false ? "Rekommenderat idag" : "Dagens mål"}
                    </div>

                    <>
                      {profile?.individual_goals_enabled === false ? (
                        <div style={targetRowStyle}>
                          <span style={targetLabelStyle}>
                            {selectedExercise?.type === "seconds_only"
                              ? "Tid"
                              : selectedExercise?.type === "weight_reps"
                              ? "Senaste arbetsset"
                              : "Reps"}
                          </span>
                          <span style={targetValueStyle}>
                            {formatLatestSetValue(selectedExercise?.type || exercise.type, latestExerciseTopSet)}
                          </span>
                        </div>
                      ) : selectedExercise?.type === "seconds_only" ? (
                        <div style={targetRowStyle}>
                          <span style={targetLabelStyle}>
                            {getExerciseMeasurementLabelWithSide(
                              selectedExercise?.type || exercise.type,
                              selectedExercise?.executionSide || "standard"
                            )}
                          </span>
                          <span style={targetValueStyle}>
                            {currentTarget.target_reps_mode === "max"
                              ? "max"
                              : `${formatRepTargetValue(currentTarget)} ${getExerciseMeasurementShortLabel(
                                  selectedExercise?.type || exercise.type
                                )}`}
                          </span>
                        </div>
                      ) : (
                        <div style={targetRowStyle}>
                          <span style={targetLabelStyle}>
                            {getExerciseMeasurementLabelWithSide(
                              selectedExercise?.type || exercise.type,
                              selectedExercise?.executionSide || "standard"
                            )}
                          </span>
                          <span style={targetValueStyle}>
                            {formatRepTargetValue(currentTarget)}
                          </span>
                        </div>
                      )}

                      {selectedExercise?.type === "weight_reps" && resolvedCurrentTargetWeight != null && (
                        <div style={targetRowStyle}>
                          <span style={targetLabelStyle}>Vikt</span>
                          <span style={targetValueStyle}>
                            {resolvedCurrentTargetWeight} kg
                          </span>
                        </div>
                      )}

                      {currentTarget.target_comment && (
                        <div style={{ ...targetCommentStyle, marginTop: "8px" }}>
                          <strong>Kommentar:</strong> {currentTarget.target_comment}
                        </div>
                      )}

                      {selectedExercise?.type === "weight_reps" &&
                        resolvedCurrentTargetWeight != null &&
                        currentRepRangeBucket &&
                        profile?.individual_goals_enabled !== false && (
                          <div style={{ marginTop: "10px" }}>
                            <button
                              type="button"
                              onClick={() => {
                                if (isTargetRequestComposerOpen) {
                                  setActiveTargetChangeRequestDraft(null)
                                  return
                                }

                                setActiveTargetChangeRequestDraft({
                                  composer_key: targetRequestComposerKey,
                                  exercise_id: selectedExercise?.exerciseId || exercise.exerciseId,
                                  exercise_name:
                                    selectedExercise?.displayName ||
                                    selectedExercise?.name ||
                                    exercise.displayName ||
                                    exercise.name,
                                  rep_range_key: currentRepRangeBucket.key,
                                  request_type: "increase",
                                  comment: "",
                                  current_target_weight: resolvedCurrentTargetWeight,
                                  latest_logged_weight: latestExerciseTopSet?.weight
                                    ? parseLoggedNumber(latestExerciseTopSet.weight)
                                    : null,
                                  latest_logged_reps_text:
                                    latestExerciseTopSet?.reps != null && latestExerciseTopSet?.reps !== ""
                                      ? `${latestExerciseTopSet.reps} reps`
                                      : latestExerciseTopSet?.seconds
                                      ? `${latestExerciseTopSet.seconds} sek`
                                      : null,
                                })
                              }}
                              style={{ ...secondaryButtonStyle, width: "100%" }}
                            >
                              {isTargetRequestComposerOpen ? "Stäng begäran" : "Begär ändring av målvikt"}
                            </button>

                            {isTargetRequestComposerOpen && (
                              <div
                                style={{
                                  marginTop: "10px",
                                  padding: "12px",
                                  borderRadius: "14px",
                                  border: "1px solid #e5e7eb",
                                  backgroundColor: "#ffffff",
                                }}
                              >
                                <div style={{ ...targetSectionLabelStyle, marginBottom: "8px" }}>
                                  Skicka till tränaren
                                </div>
                                <div style={{ ...mutedTextStyle, marginBottom: "10px", fontSize: "13px" }}>
                                  För {getRepRangeLabelByKey(currentRepRangeBucket.key)} • nuvarande mål{" "}
                                  {resolvedCurrentTargetWeight} kg
                                </div>

                                <div
                                  style={{
                                    display: "grid",
                                    gap: "8px",
                                    gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))",
                                    marginBottom: "10px",
                                  }}
                                >
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setActiveTargetChangeRequestDraft((prev) => ({
                                        ...prev,
                                        request_type: "increase",
                                      }))
                                    }
                                    style={{
                                      ...secondaryButtonStyle,
                                      width: "100%",
                                      backgroundColor:
                                        activeTargetChangeRequestDraft?.request_type === "increase"
                                          ? "#fff1f1"
                                          : "#ffffff",
                                      borderColor:
                                        activeTargetChangeRequestDraft?.request_type === "increase"
                                          ? "#dc2626"
                                          : "#d1d5db",
                                      color:
                                        activeTargetChangeRequestDraft?.request_type === "increase"
                                          ? "#b91c1c"
                                          : "#18202b",
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
                                      ...secondaryButtonStyle,
                                      width: "100%",
                                      backgroundColor:
                                        activeTargetChangeRequestDraft?.request_type === "decrease"
                                          ? "#fff1f1"
                                          : "#ffffff",
                                      borderColor:
                                        activeTargetChangeRequestDraft?.request_type === "decrease"
                                          ? "#dc2626"
                                          : "#d1d5db",
                                      color:
                                        activeTargetChangeRequestDraft?.request_type === "decrease"
                                          ? "#b91c1c"
                                          : "#18202b",
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
                                      ...secondaryButtonStyle,
                                      width: "100%",
                                      backgroundColor:
                                        activeTargetChangeRequestDraft?.request_type === "review"
                                          ? "#fff1f1"
                                          : "#ffffff",
                                      borderColor:
                                        activeTargetChangeRequestDraft?.request_type === "review"
                                          ? "#dc2626"
                                          : "#d1d5db",
                                      color:
                                        activeTargetChangeRequestDraft?.request_type === "review"
                                          ? "#b91c1c"
                                          : "#18202b",
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
                                  style={{ ...inputStyle, ...textareaStyle, width: "100%", marginBottom: "10px" }}
                                />

                                <div style={feedbackComposerActionsStyle}>
                                  <button
                                    type="button"
                                    onClick={() => setActiveTargetChangeRequestDraft(null)}
                                    style={secondaryButtonStyle}
                                  >
                                    Avbryt
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleSubmitTargetChangeRequest}
                                    disabled={isSubmittingTargetChangeRequest}
                                    style={{
                                      ...buttonStyle,
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
                    </>
                  </div>
                )}

                {isWorkoutActive && isProtocol && (
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

                    {(inputs[i] || []).map((set, j) => {
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
                )}

                {isWorkoutActive &&
                  !isProtocol &&
                  (inputs[i] || []).map((set, j) => (
                    <div key={set.client_set_id || j} style={activeSetCardStyle}>
                      <div style={setHeaderRowStyle}>
                        <div style={setLabelStyle}>Set {j + 1}</div>
                        <button
                          type="button"
                          onClick={() => handleToggleSetType(i, j)}
                          style={{
                            ...setTypeToggleStyle,
                            backgroundColor: set.set_type === "warmup" ? "#fff7ed" : "#eef4ff",
                            borderColor: set.set_type === "warmup" ? "#fdba74" : "#bfdbfe",
                            color: set.set_type === "warmup" ? "#b45309" : "#1d4ed8",
                          }}
                        >
                          {set.set_type === "warmup" ? "Uppvärmning" : "Arbetsset"}
                        </button>
                      </div>

                      {set.set_type === "warmup" && (
                        <div style={setInputHintStyle}>
                          Det här setet sparas som uppvärmning och räknas inte in i statistik eller rekommenderade vikter.
                        </div>
                      )}

                      <div
                        style={{
                          ...setInputsRowStyle,
                          flexDirection: "row",
                          alignItems: isMobile ? "stretch" : "center",
                        }}
                      >
                        {selectedExercise?.type === "weight_reps" && (
                          <>
                            <input
                              placeholder="kg"
                              value={set.weight || ""}
                              onChange={(e) =>
                                handleChange(i, j, "weight", e.target.value)
                              }
                              style={{ ...inputStyle, ...compactSetInputStyle }}
                            />
                            <input
                              placeholder={getExerciseMeasurementPlaceholder(
                                selectedExercise?.type || exercise.type,
                                selectedExercise?.executionSide || "standard"
                              )}
                              value={set.reps || ""}
                              onChange={(e) =>
                                handleChange(i, j, "reps", e.target.value)
                              }
                              style={{ ...inputStyle, ...compactSetInputStyle }}
                            />
                          </>
                        )}

                        {selectedExercise?.type === "reps_only" && (
                          <input
                            placeholder={getExerciseMeasurementPlaceholder(
                              selectedExercise?.type || exercise.type,
                              selectedExercise?.executionSide || "standard"
                            )}
                            value={set.reps || ""}
                            onChange={(e) =>
                              handleChange(i, j, "reps", e.target.value)
                            }
                            style={{ ...inputStyle, ...compactSetInputStyle }}
                          />
                        )}

                        {selectedExercise?.type === "seconds_only" && (
                          <input
                            placeholder={getExerciseMeasurementPlaceholder(
                              selectedExercise?.type || exercise.type,
                              selectedExercise?.executionSide || "standard"
                            )}
                            value={set.seconds || ""}
                            onChange={(e) =>
                              handleChange(i, j, "seconds", e.target.value)
                            }
                            style={{ ...inputStyle, ...compactSetInputStyle }}
                          />
                        )}

                        <button
                          onClick={() => handleRemoveSet(i, j)}
                          style={{ ...removeButtonStyle, ...compactSetRemoveButtonStyle }}
                        >
                          Ta bort
                        </button>
                      </div>

                      {selectedExercise?.type === "weight_reps" &&
                        selectedExercise &&
                        latestWorkout[selectedExercise.name]?.slice(-1)[0]?.weight != null && (
                          <div style={setInputHintStyle}>
                            Senaste vikt: {latestWorkout[selectedExercise.name].slice(-1)[0].weight} kg
                          </div>
                        )}

                      {selectedExercise?.executionSide && selectedExercise.executionSide !== "standard" && (
                        <div style={setInputHintStyle}>
                          {getExerciseExecutionSideHint(
                            selectedExercise.executionSide,
                            selectedExercise?.type || exercise.type
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                {isWorkoutActive && (
                  <div style={exerciseCommentCardStyle}>
                    <div style={exerciseCommentTitleStyle}>Kommentar på övningen</div>
                    <textarea
                      rows={3}
                      placeholder="T.ex. ont i knä, hoppade över sista setet eller annan notering"
                      value={exerciseComments[i] || ""}
                      onChange={(e) => handleExerciseCommentChange(i, e.target.value)}
                      onBlur={() => handleExerciseCommentSave(i)}
                      style={{ ...inputStyle, ...textareaStyle, width: "100%", minHeight: "88px" }}
                    />
                  </div>
                )}

                {isWorkoutActive && !isProtocol && (
                  <button
                    onClick={() => handleAddSet(i)}
                    style={{ ...secondaryButtonStyle, width: isMobile ? "100%" : "auto" }}
                  >
                    + Lägg till set
                  </button>
                )}

                {exercise.info.length > 0 && (
                  <div style={infoBoxStyle}>
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedInfo((prev) => ({
                          ...prev,
                          [infoKey]: !prev[infoKey],
                        }))
                      }
                      style={infoToggleButtonStyle}
                    >
                      <span>Att tänka på</span>
                      <span>{isInfoExpanded ? "−" : "+"}</span>
                    </button>

                    {isInfoExpanded && (
                      <div style={{ marginTop: "8px" }}>
                        {exercise.info.map((item, index) => (
                          <div key={index} style={infoRowStyle}>• {item}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}

              <div
                data-exercise-card="true"
                style={
                  isMobile
                    ? {
                        ...cardStyle,
                        ...exerciseSwipeCardStyle,
                        order: activeWorkoutSlideCount - 1,
                      }
                    : {
                        ...cardStyle,
                        order: activeWorkoutSlideCount - 1,
                      }
                }
              >
                <div style={exerciseProgressStyle}>Avslut</div>

                <h3 style={{ ...cardTitleStyle, marginBottom: "8px" }}>Sista kortet</h3>
                <p style={{ ...mutedTextStyle, marginBottom: "14px" }}>
                  Skriv en kort kommentar om hela passet och avsluta sedan härifrån.
                </p>

                <div style={exerciseCommentCardStyle}>
                  <div style={exerciseCommentTitleStyle}>Kommentar på passet</div>
                  <textarea
                    rows={4}
                    placeholder="T.ex. tungt pass idag, ont i knä eller något tränaren bör veta"
                    value={passComment}
                    onChange={(e) => setPassComment(e.target.value)}
                    style={{ ...inputStyle, ...textareaStyle, width: "100%", minHeight: "104px" }}
                  />
                </div>

                <button
                  type="button"
                  onClick={finishWorkout}
                  style={{ ...buttonStyle, width: isMobile ? "100%" : "auto" }}
                >
                  Spara kommentar och avsluta pass
                </button>
              </div>
            </div>
          </div>
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
  fontFamily: "Roboto, sans-serif",
  overflowX: "hidden",
}

const uiSurface = "var(--ghf-surface)"
const uiSurfaceAlt = "var(--ghf-surface-alt)"
const uiBorder = "var(--ghf-line)"
const uiBorderStrong = "var(--ghf-line-strong)"
const uiBorderSoft = "var(--ghf-line-soft)"
const uiShadowSm = "var(--ghf-shadow-sm)"
const uiShadowMd = "var(--ghf-shadow-md)"
const uiShadowLg = "var(--ghf-shadow-lg)"
const uiSelectedSurface = "var(--ghf-selected-bg)"
const uiSelectedBorder = "var(--ghf-selected-border)"

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
  padding: isMobile ? "18px 16px" : "22px 22px 20px",
  borderRadius: isMobile ? "20px" : "26px",
  background:
    "linear-gradient(135deg, rgba(24, 32, 43, 0.98) 0%, rgba(153, 27, 27, 0.95) 52%, rgba(198, 40, 40, 0.92) 100%)",
  color: "#ffffff",
  boxShadow: "0 24px 42px rgba(24, 32, 43, 0.16)",
})

const activeWorkoutPageBadgeStyle = {
  display: "inline-flex",
  marginBottom: "12px",
  padding: "6px 12px",
  borderRadius: "999px",
  backgroundColor: "rgba(255,255,255,0.14)",
  color: "#fff7f7",
  fontSize: "12px",
  fontWeight: "800",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
}

const activeWorkoutPageTitleStyle = {
  fontSize: "clamp(1.8rem, 3vw, 2.6rem)",
  fontWeight: "900",
  lineHeight: 1,
  marginBottom: "10px",
}

const activeWorkoutPageTextStyle = {
  maxWidth: "720px",
  fontSize: "15px",
  lineHeight: 1.6,
  color: "rgba(255,255,255,0.9)",
}

const activeWorkoutCancelButtonStyle = {
  padding: "12px 16px",
  borderRadius: "16px",
  border: "1px solid rgba(255,255,255,0.22)",
  backgroundColor: "rgba(255,255,255,0.12)",
  color: "#ffffff",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: "800",
}

const activeWorkoutPageWrapStyle = {
  width: "100%",
  marginTop: "6px",
}

const activeWorkoutPageMetaRowStyle = (isMobile) => ({
  display: "grid",
  gap: "12px",
  marginBottom: "16px",
  gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
})

const activeWorkoutPageMetaCardStyle = {
  padding: "14px 16px",
  borderRadius: "18px",
  border: `1px solid ${uiBorder}`,
  backgroundColor: uiSurface,
  boxShadow: uiShadowSm,
}

const activeWorkoutPageMetaLabelStyle = {
  fontSize: "12px",
  fontWeight: "800",
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "#991b1b",
  marginBottom: "6px",
}

const activeWorkoutPageMetaValueStyle = {
  fontSize: "18px",
  fontWeight: "900",
  color: "#18202b",
}

const feedbackActionBarStyle = {
  marginBottom: "16px",
  padding: "16px 18px",
  borderRadius: "20px",
  border: `1px solid ${uiBorder}`,
  background: uiSurface,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  boxShadow: uiShadowSm,
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

const feedbackComposerCardStyle = {
  marginBottom: "16px",
  padding: "18px",
  borderRadius: "20px",
  border: `1px solid ${uiBorder}`,
  backgroundColor: uiSurface,
  boxShadow: uiShadowMd,
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
  fontSize: "28px",
  marginBottom: "16px",
  color: "#18202b",
  fontWeight: "900",
}

const cardStyle = {
  width: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  marginBottom: "20px",
  padding: "20px",
  border: `1px solid ${uiBorder}`,
  borderRadius: "24px",
  background: uiSurface,
  boxShadow: uiShadowMd,
}

const cardTitleStyle = {
  margin: "0 0 6px 0",
  fontSize: "20px",
  color: "#18202b",
  fontWeight: "900",
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

const exerciseHeaderButtonStyle = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  padding: 0,
  border: "none",
  background: "transparent",
  textAlign: "left",
}

const exerciseHeaderHintStyle = {
  fontSize: "12px",
  color: "#6b7280",
  fontWeight: "700",
}

const exerciseHeaderIconStyle = {
  width: "34px",
  height: "34px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "999px",
  backgroundColor: "#eef4ff",
  color: "#274690",
  fontSize: "22px",
  fontWeight: "700",
  flexShrink: 0,
}

const exerciseDetailsPanelStyle = {
  marginBottom: "14px",
  padding: "14px",
  borderRadius: "16px",
  border: `1px solid ${uiBorder}`,
  backgroundColor: uiSurfaceAlt,
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

const subheadingStyle = {
  margin: "0 0 6px 0",
  fontSize: "14px",
  fontWeight: "800",
  color: "#18202b",
}

const mutedTextStyle = {
  margin: 0,
  fontSize: "14px",
  color: "#566173",
  lineHeight: 1.6,
}

const exerciseProgressStyle = {
  display: "inline-block",
  marginBottom: "12px",
  padding: "6px 12px",
  borderRadius: "999px",
  backgroundColor: "#eef4ff",
  color: "#274690",
  fontSize: "12px",
  fontWeight: "800",
}

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
  overflowX: "auto",
  WebkitOverflowScrolling: "touch",
  scrollSnapType: "x mandatory",
  overscrollBehaviorX: "contain",
  paddingBottom: "4px",
}

const exerciseCarouselTrackStyle = {
  display: "grid",
  gridAutoFlow: "column",
  gridAutoColumns: "100%",
  gap: "12px",
  alignItems: "stretch",
}

const exerciseSwipeCardStyle = {
  width: "100%",
  minWidth: 0,
  scrollSnapAlign: "start",
  scrollSnapStop: "always",
  marginBottom: 0,
}

const targetBoxStyle = {
  backgroundColor: uiSurfaceAlt,
  border: `1px solid ${uiBorder}`,
  borderRadius: "18px",
  padding: "14px 16px",
  marginBottom: "14px",
}

const targetBoxHeaderStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "10px",
  marginBottom: "10px",
}

const targetBoxTitleStyle = {
  fontSize: "16px",
  fontWeight: "900",
  color: "#1f3b57",
}

const targetHistoryBadgeStyle = {
  display: "inline-flex",
  padding: "5px 9px",
  borderRadius: "999px",
  backgroundColor: uiSurface,
  color: "#46607a",
  fontSize: "12px",
  fontWeight: "800",
  border: `1px solid ${uiBorder}`,
}

const latestSummaryWrapStyle = {
  padding: "12px 14px",
  borderRadius: "16px",
  backgroundColor: uiSurface,
  border: `1px solid ${uiBorder}`,
}

const latestSummaryLabelStyle = {
  fontSize: "12px",
  fontWeight: "800",
  color: "#46607a",
  marginBottom: "6px",
}

const latestSummaryValueStyle = {
  fontSize: "18px",
  fontWeight: "900",
  color: "#18202b",
}

const latestSummaryMetaStyle = {
  fontSize: "12px",
  color: "#6b7280",
  marginTop: "4px",
}

const targetSectionDividerStyle = {
  height: "1px",
  backgroundColor: uiBorderSoft,
  margin: "12px 0",
}

const targetSectionLabelStyle = {
  fontSize: "12px",
  color: "#6b7280",
  fontWeight: "800",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  marginBottom: "8px",
}

const targetRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  marginBottom: "6px",
  fontSize: "14px",
}

const targetLabelStyle = {
  color: "#46607a",
  fontWeight: "700",
}

const targetValueStyle = {
  color: "#18202b",
  fontWeight: "800",
}

const targetCommentStyle = {
  fontSize: "14px",
  color: "#334155",
  lineHeight: 1.5,
}

const emptyTargetStyle = {
  fontSize: "14px",
  color: "#9ca3af",
  fontStyle: "italic",
}

const latestRowStyle = {
  fontSize: "13px",
  color: "#334155",
  lineHeight: 1.6,
}

const infoBoxStyle = {
  backgroundColor: uiSurfaceAlt,
  border: `1px solid ${uiBorder}`,
  borderRadius: "16px",
  padding: "10px 12px",
  marginBottom: "14px",
}


const infoRowStyle = {
  fontSize: "13px",
  color: "#566173",
  lineHeight: 1.6,
}

const infoToggleButtonStyle = {
  width: "100%",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  border: "none",
  backgroundColor: "transparent",
  padding: 0,
  fontSize: "14px",
  fontWeight: "800",
  color: "#18202b",
  cursor: "pointer",
}

const activeSetCardStyle = {
  marginBottom: "10px",
  padding: "12px",
  borderRadius: "16px",
  backgroundColor: uiSurface,
  border: `1px solid ${uiBorder}`,
}

const setInputHintStyle = {
  marginTop: "8px",
  fontSize: "12px",
  color: "#6b7280",
}

const exerciseCommentCardStyle = {
  marginBottom: "12px",
  padding: "12px",
  borderRadius: "16px",
  backgroundColor: uiSurfaceAlt,
  border: `1px solid ${uiBorder}`,
}

const alternativeSelectionCardStyle = {
  marginBottom: "12px",
  padding: "12px",
  borderRadius: "16px",
  backgroundColor: uiSurfaceAlt,
  border: `1px solid ${uiBorder}`,
}

const alternativeSelectionTitleStyle = {
  marginBottom: "4px",
  fontSize: "13px",
  fontWeight: "800",
  color: "#18202b",
}

const alternativeSelectionHintStyle = {
  marginBottom: "10px",
  fontSize: "12px",
  color: "#64748b",
}

const alternativeSelectionOptionListStyle = {
  display: "grid",
  gap: "8px",
}

const alternativeSelectionOptionStyle = {
  width: "100%",
  padding: "12px",
  borderRadius: "14px",
  border: "1px solid #dbe5ef",
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
  color: "#64748b",
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
  color: "#374151",
}
const setLabelStyle = {
  fontSize: "13px",
  fontWeight: "800",
  color: "#566173",
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
  border: `1px solid ${uiBorder}`,
  backgroundColor: "#eef4ff",
  color: "#1d4ed8",
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

const passCategorySectionStyle = {
  padding: "14px",
  borderRadius: "24px",
  border: `1px solid ${uiBorder}`,
  backgroundColor: uiSurface,
  display: "grid",
  gap: "12px",
  boxShadow: uiShadowSm,
}

const passCategoryHeaderStyle = (isMobile) => ({
  display: "flex",
  alignItems: isMobile ? "flex-start" : "center",
  justifyContent: "space-between",
  flexDirection: isMobile ? "column" : "row",
  gap: "10px",
})

const passCategoryBadgeStyle = {
  display: "inline-flex",
  marginBottom: "8px",
  padding: "6px 10px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: "800",
}

const passCategoryTitleStyle = {
  fontSize: "20px",
  fontWeight: "900",
  color: "#18202b",
  marginBottom: "4px",
}

const passCategoryTextStyle = {
  fontSize: "14px",
  lineHeight: 1.5,
  color: "#566173",
}

const passCategoryCountStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "10px 12px",
  borderRadius: "16px",
  border: `1px solid ${uiBorder}`,
  backgroundColor: uiSurface,
  color: "#18202b",
  fontSize: "13px",
  fontWeight: "800",
  whiteSpace: "nowrap",
}

const passCategoryListStyle = {
  display: "grid",
  gap: "12px",
}

const passPickerItemStyle = {
  display: "grid",
  gap: "8px",
  width: "100%",
  minWidth: 0,
  padding: "14px 15px",
  borderRadius: "16px",
  border: `1px solid ${uiBorder}`,
  background: uiSurface,
  boxShadow: uiShadowSm,
  overflow: "hidden",
}

const pickerButtonStyle = {
  width: "100%",
  padding: 0,
  borderRadius: 0,
  border: "none",
  background: "transparent",
  textAlign: "left",
  cursor: "pointer",
}

const pickerHeaderRowStyle = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "10px",
  marginBottom: "8px",
}

const pickerPillRowStyle = {
  display: "flex",
  gap: "6px",
  flexWrap: "wrap",
  marginBottom: "8px",
}

const pickerStatusPillStyle = {
  display: "inline-flex",
  padding: "6px 10px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: "800",
}

const pickerExpandIconStyle = (isSelected) => ({
  width: "34px",
  height: "34px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "999px",
  border: `1px solid ${isSelected ? uiSelectedBorder : uiBorder}`,
  backgroundColor: isSelected ? uiSelectedSurface : uiSurface,
  color: isSelected ? "#b61e24" : "#6b7280",
  fontSize: "22px",
  fontWeight: "800",
  flexShrink: 0,
})

const pickerTitleStyle = {
  fontWeight: "900",
  fontSize: "17px",
  color: "#18202b",
}

const pickerSummaryRowStyle = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  flexWrap: "wrap",
}

const pickerSummaryTextStyle = {
  fontSize: "13px",
  lineHeight: 1.4,
  fontWeight: "700",
  color: "#566173",
  overflowWrap: "anywhere",
}

const pickerSummaryDividerStyle = {
  fontSize: "12px",
  color: "#94a3b8",
}

const pickerSecondarySummaryStyle = {
  marginTop: "4px",
  fontSize: "13px",
  lineHeight: 1.5,
  fontWeight: "800",
  color: "#18202b",
}

const pickerActionHintStyle = {
  marginTop: "8px",
  fontSize: "12px",
  fontWeight: "700",
  color: "#566173",
}

const passPreviewCardStyle = {
  width: "100%",
  marginTop: 0,
  padding: "14px 0 0",
  borderTop: `1px solid ${uiBorder}`,
}

const passPreviewContentCardStyle = {
  padding: "14px",
  borderRadius: "14px",
  border: `1px solid ${uiBorder}`,
  backgroundColor: uiSurface,
  marginBottom: "14px",
}

const passPreviewStatLabelStyle = {
  fontSize: "11px",
  color: "#46607a",
  fontWeight: "800",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  marginBottom: "6px",
}

const passPreviewInfoTextStyle = {
  fontSize: "14px",
  color: "#18202b",
  fontWeight: "700",
  lineHeight: 1.5,
}

const passPreviewExerciseCountStyle = {
  fontSize: "22px",
  color: "#18202b",
  fontWeight: "900",
  marginBottom: "10px",
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
  padding: "9px 10px",
  borderRadius: "14px",
  backgroundColor: uiSurfaceAlt,
  border: `1px solid ${uiBorder}`,
  color: "#18202b",
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
  backgroundColor: "#eef4ff",
  color: "#274690",
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

const dangerActionButtonStyle = {
  padding: "12px 16px",
  borderRadius: "16px",
  border: "1px solid #efc7c7",
  backgroundColor: "#fff1f1",
  color: "#991b1b",
  fontSize: "14px",
  fontWeight: "800",
}

const playerHomeHeroCardStyle = {
  padding: "20px",
  borderRadius: "24px",
  border: `1px solid ${uiBorder}`,
  background: uiSurface,
  boxShadow: uiShadowMd,
}

const playerHomeHeaderStyle = {
  display: "flex",
  alignItems: "baseline",
  justifyContent: "flex-start",
  gap: "10px",
  padding: "2px 2px 0",
  flexWrap: "wrap",
}

const playerHomeHeaderInlineStyle = {
  display: "flex",
  alignItems: "baseline",
  gap: "10px",
  flexWrap: "wrap",
}

const playerHomeHeaderTitleStyle = {
  fontSize: "28px",
  fontWeight: "900",
  color: "#111827",
}

const playerHomeHeaderTextStyle = {
  fontSize: "14px",
  color: "#6b7280",
}

const playerHomeStatsGridStyle = (isMobile) => ({
  display: "grid",
  gap: "10px",
  gridTemplateColumns: isMobile ? "repeat(3, minmax(0, 1fr))" : "repeat(3, minmax(0, 1fr))",
  marginBottom: "14px",
})

const playerHomeStatCardStyle = {
  padding: "14px 12px",
  borderRadius: "18px",
  border: `1px solid ${uiBorder}`,
  backgroundColor: uiSurface,
}

const playerHomeStatLabelStyle = {
  marginBottom: "6px",
  fontSize: "11px",
  fontWeight: "800",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#6b7280",
}

const playerHomeStatValueStyle = {
  fontSize: "28px",
  lineHeight: 1,
  fontWeight: "900",
  color: "#111827",
}

const playerHomeIntroStyle = {
  margin: 0,
  fontSize: "14px",
  lineHeight: 1.6,
  color: "#6b7280",
}

const playerQuickActionsGridStyle = (isMobile) => ({
  display: "grid",
  gap: "12px",
  gridTemplateColumns: isMobile ? "repeat(2, minmax(0, 1fr))" : "repeat(4, minmax(0, 1fr))",
})

const playerQuickActionCardStyle = {
  minHeight: "112px",
  padding: "16px",
  borderRadius: "18px",
  border: `1px solid ${uiBorder}`,
  background: uiSurface,
  textAlign: "left",
  cursor: "pointer",
  boxShadow: uiShadowSm,
}

const playerQuickActionTopRowStyle = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "10px",
  marginBottom: "10px",
}

const playerQuickActionArrowStyle = {
  width: "32px",
  height: "32px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "999px",
  fontSize: "18px",
  fontWeight: "900",
  flexShrink: 0,
}

const playerQuickActionTitleStyle = {
  fontSize: "16px",
  fontWeight: "900",
  color: "#111827",
}

const playerQuickActionTextStyle = {
  fontSize: "13px",
  lineHeight: 1.5,
  color: "#6b7280",
}

const playerSummaryGridStyle = (isMobile) => ({
  display: "grid",
  gap: "12px",
  gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
})

const playerSummaryCardStyle = {
  padding: "16px",
  borderRadius: "18px",
  border: `1px solid ${uiBorder}`,
  backgroundColor: uiSurface,
  boxShadow: uiShadowSm,
}

const playerSummaryLabelStyle = {
  marginBottom: "8px",
  fontSize: "12px",
  fontWeight: "800",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#6b7280",
}

const playerSummaryTitleStyle = {
  fontSize: "18px",
  fontWeight: "900",
  color: "#111827",
  marginBottom: "6px",
}

const playerSummaryMetaStyle = {
  fontSize: "14px",
  lineHeight: 1.6,
  color: "#6b7280",
}

const playerOverviewPanelStyle = {
  padding: "18px",
  borderRadius: "22px",
  border: `1px solid ${uiBorder}`,
  backgroundColor: uiSurface,
  boxShadow: uiShadowMd,
}

const playerOverviewPanelHeaderStyle = {
  marginBottom: "14px",
}

const playerQuickActionBlockStyle = {
  display: "grid",
  gap: "12px",
  minWidth: 0,
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

const playerHistorySectionLabelStyle = {
  marginBottom: "10px",
  fontSize: "12px",
  fontWeight: "800",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "#6b7280",
}

const playerHistoryItemStyle = {
  padding: "14px",
  borderRadius: "16px",
  backgroundColor: uiSurface,
  border: `1px solid ${uiBorder}`,
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
  fontWeight: "800",
  color: "#18202b",
  marginBottom: "4px",
}

const playerHistoryItemMetaStyle = {
  fontSize: "13px",
  color: "#566173",
}

const playerHistoryDateStyle = {
  fontSize: "13px",
  fontWeight: "700",
  color: "#566173",
}

const playerHistoryActionRowStyle = (isMobile) => ({
  display: "flex",
  gap: "8px",
  flexDirection: isMobile ? "column" : "row",
  alignItems: isMobile ? "stretch" : "center",
})

const playerHistoryEmptyStyle = {
  fontSize: "14px",
  color: "#6b7280",
}

const playerHistoryHighlightsGridStyle = (isMobile) => ({
  display: "grid",
  gap: "10px",
  gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(2, minmax(0, 1fr))",
})

const playerHistoryHighlightCardStyle = {
  padding: "12px 14px",
  borderRadius: "16px",
  border: `1px solid ${uiBorder}`,
  backgroundColor: uiSurface,
}

const playerHistoryHighlightLabelStyle = {
  marginBottom: "6px",
  fontSize: "12px",
  fontWeight: "800",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "#6b7280",
}

const playerHistoryHighlightValueStyle = {
  fontSize: "15px",
  fontWeight: "800",
  color: "#18202b",
  lineHeight: 1.4,
}

const playerPageIntroStyle = {
  marginBottom: "4px",
}

const playerStatsLayoutStyle = (isMobile) => ({
  display: "grid",
  gap: "14px",
  gridTemplateColumns: isMobile ? "1fr" : "280px minmax(0, 1fr)",
  width: "100%",
})

const playerStatsExerciseListStyle = {
  display: "grid",
  gap: "10px",
  alignContent: "start",
}

const playerStatsExerciseButtonStyle = {
  width: "100%",
  padding: "14px",
  borderRadius: "18px",
  border: `1px solid ${uiBorder}`,
  backgroundColor: uiSurface,
  textAlign: "left",
  cursor: "pointer",
}

const playerStatsExerciseTitleStyle = {
  fontSize: "15px",
  fontWeight: "900",
  color: "#18202b",
  marginBottom: "4px",
}

const playerStatsExerciseMetaStyle = {
  fontSize: "13px",
  color: "#566173",
}

const playerStatsCardStyle = {
  padding: "18px",
  borderRadius: "22px",
  border: `1px solid ${uiBorder}`,
  backgroundColor: uiSurface,
  boxShadow: uiShadowMd,
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
  fontSize: "20px",
  fontWeight: "900",
  color: "#18202b",
  marginBottom: "4px",
}

const playerStatsTextStyle = {
  fontSize: "14px",
  color: "#566173",
  lineHeight: 1.5,
}

const playerStatsSummaryPillStyle = {
  display: "inline-flex",
  padding: "8px 12px",
  borderRadius: "999px",
  backgroundColor: "#fff1f1",
  color: "#b61e24",
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
  padding: "12px 14px",
  borderRadius: "16px",
  border: `1px solid ${uiBorder}`,
  backgroundColor: uiSurface,
}

const playerStatsRecentDateStyle = {
  fontSize: "14px",
  fontWeight: "800",
  color: "#18202b",
  marginBottom: "4px",
}

const playerStatsRecentMetaStyle = {
  fontSize: "13px",
  color: "#566173",
}

const playerStatsRecentValueStyle = {
  fontSize: "15px",
  fontWeight: "900",
  color: "#b61e24",
  whiteSpace: "nowrap",
}

const playerStatsEmptyStyle = {
  padding: "18px",
  borderRadius: "20px",
  border: `1px solid ${uiBorder}`,
  backgroundColor: uiSurface,
  color: "#566173",
  fontSize: "14px",
}

const playerStatsEmptyInlineStyle = {
  marginBottom: "14px",
  padding: "14px",
  borderRadius: "16px",
  border: `1px solid ${uiBorder}`,
  backgroundColor: uiSurface,
  color: "#566173",
  fontSize: "14px",
}

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
  padding: "0 12px calc(10px + env(safe-area-inset-bottom))",
  pointerEvents: "none",
}

const coachBottomNavStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
  gap: "6px",
  padding: "10px 8px 8px",
  borderTop: `1px solid ${uiBorder}`,
  borderRadius: "22px 22px 0 0",
  background: "rgba(255, 255, 255, 0.98)",
  backdropFilter: "blur(18px)",
  boxShadow: "0 -2px 8px rgba(15, 23, 42, 0.05), 0 -16px 36px rgba(15, 23, 42, 0.08)",
  pointerEvents: "auto",
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

const coachBottomNavLabelStyle = {
  fontSize: "11px",
  fontWeight: "800",
  lineHeight: 1.1,
  textAlign: "center",
}

export default TrainingApp
