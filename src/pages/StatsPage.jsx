import { useEffect, useMemo, useState } from "react"
import { supabase } from "../supabase"
import { getExerciseProtocolConfig, getExerciseProtocolStep } from "../utils/exerciseProtocols"

const LINE_COLORS = ["#c62828", "#1d4ed8", "#0f766e", "#7c3aed", "#ea580c", "#0891b2"]
const PERIOD_OPTIONS = [
  { value: "30", label: "Senaste 30 dagarna" },
  { value: "90", label: "Senaste 90 dagarna" },
  { value: "180", label: "Senaste 180 dagarna" },
  { value: "365", label: "Senaste 365 dagarna" },
  { value: "all", label: "Hela historiken" },
]

const FREE_ACTIVITY_LABELS = {
  running: "Löpning",
  football: "Fotboll",
  orienteering: "Orientering",
  swimming: "Simning",
  racket_sport: "Racketsport",
}

const REP_RANGE_BUCKETS = [
  { key: "1_3", label: "1-3", min: 1, max: 3 },
  { key: "4_5", label: "4-5", min: 4, max: 5 },
  { key: "6_10", label: "6-10", min: 6, max: 10 },
  { key: "11_15", label: "11-15", min: 11, max: 15 },
  { key: "16_20", label: "16-20", min: 16, max: 20 },
]

const REP_RANGE_PRIORITY = ["6_10", "4_5", "1_3", "11_15", "16_20"]
const REP_RANGE_FILTER_OPTIONS = [
  { value: "all", label: "Alla repsintervall" },
  ...REP_RANGE_BUCKETS.map((bucket) => ({
    value: bucket.key,
    label: `${bucket.label} reps`,
  })),
]

const getExerciseDisplayName = (exercise) =>
  exercise?.displayName || exercise?.display_name || exercise?.name || ""

const normalizeExerciseLookupValue = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")

const getExerciseRepRangeBucket = (repsValue) => {
  const reps = Number.parseFloat(String(repsValue ?? "").trim().replace(",", "."))
  if (!Number.isFinite(reps) || reps <= 0) return null

  return (
    REP_RANGE_BUCKETS.find((bucket) => reps >= bucket.min && reps <= bucket.max) ||
    (reps < REP_RANGE_BUCKETS[0].min ? REP_RANGE_BUCKETS[0] : REP_RANGE_BUCKETS[REP_RANGE_BUCKETS.length - 1])
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
    bounds.max != null ? bounds.max : bounds.min != null ? bounds.min : null

  return representativeValue != null ? getExerciseRepRangeBucket(representativeValue) : null
}

const findExerciseByLoggedName = (exercises, exerciseName) => {
  const lookupValue = normalizeExerciseLookupValue(exerciseName)
  if (!lookupValue) return null

  return (
    (exercises || []).find((exercise) => {
      const aliases = Array.isArray(exercise?.aliases) ? exercise.aliases : []
      return [exercise?.name, exercise?.display_name, getExerciseDisplayName(exercise), ...aliases]
        .map(normalizeExerciseLookupValue)
        .filter(Boolean)
        .includes(lookupValue)
    }) || null
  )
}

const parseWeightValue = (value) => {
  const normalized = String(value ?? "")
    .trim()
    .replace(",", ".")
  const parsed = Number.parseFloat(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

const getLocalDayKey = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

const getLocalDayTimestamp = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

const formatStatDate = (value) => {
  if (!value) return "-"
  return new Date(value).toLocaleDateString("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
}

const formatCoachPassName = (passName, workoutKind, runningOrigin, freeActivityType = "running") => {
  if (workoutKind === "running" && runningOrigin !== "assigned") {
    const rawFreePassName = String(passName || "").trim()
    if (rawFreePassName) {
      const withoutTechnicalSuffix = rawFreePassName.replace(/_[a-f0-9]{8}$/i, "")
      return withoutTechnicalSuffix.replace(/_/g, " ")
    }

    return FREE_ACTIVITY_LABELS[freeActivityType] || "Egen aktivitet"
  }

  const raw = String(passName || "").trim()
  if (!raw) return "Pass"

  const withoutTechnicalSuffix = raw.replace(/_[a-f0-9]{8}$/i, "")
  const cleaned = withoutTechnicalSuffix.replace(/_/g, " ")

  const passLetterMatch = cleaned.match(/^pass[\s-]*([a-z0-9]+)/i)
  if (passLetterMatch) {
    return `Pass ${String(passLetterMatch[1]).toUpperCase()}`
  }

  const hasLetters = /[a-zåäö]/i.test(cleaned)
  const isMostlyUppercase = hasLetters && cleaned === cleaned.toUpperCase()

  if (!isMostlyUppercase) return cleaned

  return cleaned
    .toLowerCase()
    .replace(/(^|[\s/-])([a-zåäö])/g, (match, prefix, letter) => `${prefix}${letter.toUpperCase()}`)
}

const buildStatsRunningSummary = (session) => {
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

  const distance =
    session.running_distance != null && session.running_distance !== ""
      ? `${session.running_distance} km`
      : null
  const runningTime = session.running_time || null
  const averagePulse = session.average_pulse ? `${session.average_pulse} bpm` : null

  return [distance, runningTime, averagePulse].filter(Boolean).join(" • ") || "Distans"
}

const buildActivityRowSummary = (session) => {
  if (!session) return ""

  if (session.workoutKind === "running") {
    return session.runningSummary || "Aktivitet loggad"
  }

  const exerciseCount = Array.isArray(session.exercises) ? session.exercises.length : 0
  const setCount = Array.isArray(session.exercises)
    ? session.exercises.reduce((sum, exercise) => sum + (exercise.sets?.length || 0), 0)
    : 0

  const parts = []

  if (exerciseCount > 0) {
    parts.push(`${exerciseCount} övning${exerciseCount === 1 ? "" : "ar"}`)
  }

  if (setCount > 0) {
    parts.push(`${setCount} set`)
  }

  if (session.passComment) {
    parts.push("kommentar")
  }

  return parts.join(" • ") || "Pass loggat"
}

const buildProgressionSeries = (rows, playerMap, selectedExerciseName, selectedRepRangeKey) => {
  if (!selectedExerciseName || selectedExerciseName === "all") return []
  if (!selectedRepRangeKey || selectedRepRangeKey === "all") return []

  const grouped = new Map()
  const normalizedExerciseName = normalizeExerciseLookupValue(selectedExerciseName)

  ;(rows || []).forEach((row) => {
    const weight = parseWeightValue(row.weight)
    const repBucket = getExerciseRepRangeBucket(row.reps)
    if (weight == null || !row.user_id || !row.exercise || !repBucket) return
    if (repBucket.key !== selectedRepRangeKey) return
    if (normalizeExerciseLookupValue(row.exercise) !== normalizedExerciseName) return

    const playerId = String(row.user_id)
    const exerciseName = String(row.exercise || "").trim()
    const dayKey = getLocalDayKey(row.created_at)
    const dayTimestamp = getLocalDayTimestamp(row.created_at)
    if (!dayKey || dayTimestamp == null) return

    const groupingKey = `${playerId}__${exerciseName}__${dayKey}`
    const existing = grouped.get(groupingKey)

    if (!existing || weight > existing.weight) {
      grouped.set(groupingKey, {
        playerId,
        exerciseName,
        weight,
        created_at: row.created_at,
        dayKey,
        dayTimestamp,
      })
    }
  })

  const exerciseMap = new Map()

  grouped.forEach((entry) => {
    if (!exerciseMap.has(entry.exerciseName)) {
      exerciseMap.set(entry.exerciseName, new Map())
    }

    const perPlayer = exerciseMap.get(entry.exerciseName)
    if (!perPlayer.has(entry.playerId)) {
      perPlayer.set(entry.playerId, [])
    }

    perPlayer.get(entry.playerId).push(entry)
  })

  return Array.from(exerciseMap.entries())
    .map(([exerciseName, perPlayer]) => {
      const playerSeries = Array.from(perPlayer.entries())
        .map(([playerId, entries], index) => ({
          playerId,
          playerName: playerMap.get(playerId)?.full_name || playerMap.get(playerId)?.username || "Spelare",
          color: LINE_COLORS[index % LINE_COLORS.length],
          points: entries
            .slice()
            .sort((a, b) => a.dayTimestamp - b.dayTimestamp)
            .map((entry) => ({
              x: entry.dayTimestamp,
              y: entry.weight,
              label: formatStatDate(entry.dayTimestamp),
            })),
        }))
        .filter((series) => series.points.length > 0)

      return {
        exerciseName,
        playerSeries,
      }
    })
    .filter((entry) => entry.playerSeries.length > 0)
    .sort((a, b) => a.exerciseName.localeCompare(b.exerciseName, "sv"))
}

const buildActivitySessions = (rows, playerMap) => {
  const grouped = new Map()

  ;(rows || []).forEach((row) => {
    const sessionId =
      row.workout_session_id ||
      `${String(row.created_at || "").slice(0, 19)}:${row.user_id || ""}:${row.pass_name || ""}`

    if (!grouped.has(sessionId)) {
      const player = playerMap.get(String(row.user_id))
      grouped.set(sessionId, {
        sessionId,
        playerId: String(row.user_id),
        playerName: player?.full_name || player?.username || "Spelare",
        passName: formatCoachPassName(row.pass_name, row.workout_kind, row.running_origin, row.free_activity_type),
        rawPassName: row.pass_name || "Pass",
        createdAt: row.created_at,
        workoutKind: row.workout_kind || "gym",
        runningOrigin: row.running_origin || null,
        free_activity_type: row.free_activity_type || "running",
        runningSummary: "",
        passComment: row.pass_comment || "",
        running_type: row.running_type || null,
        interval_time: row.interval_time || null,
        intervals_count: row.intervals_count ?? null,
        running_distance: row.running_distance ?? null,
        running_time: row.running_time || null,
        average_pulse: row.average_pulse ?? null,
        exerciseMap: new Map(),
      })
    }

    const session = grouped.get(sessionId)
    if (!session.passComment && row.pass_comment) {
      session.passComment = row.pass_comment
    }

    if (session.workoutKind === "running") {
      session.runningSummary = buildStatsRunningSummary({
        free_activity_type: session.free_activity_type,
        running_type: session.running_type,
        interval_time: session.interval_time,
        intervals_count: session.intervals_count,
        running_distance: session.running_distance,
        running_time: session.running_time,
        average_pulse: session.average_pulse,
      })
      return
    }

    const exerciseName = String(row.exercise || "").trim()
    if (!exerciseName) return

    if (!session.exerciseMap.has(exerciseName)) {
      session.exerciseMap.set(exerciseName, {
        name: exerciseName,
        displayName: exerciseName,
        protocolConfig: getExerciseProtocolConfig({ name: exerciseName }),
        sets: [],
      })
    }

    session.exerciseMap.get(exerciseName).sets.push({
      setNumber: row.set_number,
      weight: row.weight,
      reps: row.reps,
      seconds: row.seconds,
      exerciseComment: row.exercise_comment || "",
    })
  })

  return Array.from(grouped.values())
    .map((session) => ({
      ...session,
      exercises: Array.from(session.exerciseMap.values()).map((exercise) => ({
        ...exercise,
        sets: exercise.sets
          .slice()
          .sort((a, b) => Number(a.setNumber || 0) - Number(b.setNumber || 0)),
      })),
    }))
    .sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
}

function StatsPage({
  candidatePlayers,
  exercises,
  currentUserId,
  cardTitleStyle,
  mutedTextStyle,
  inputStyle,
  secondaryButtonStyle,
  isMobile,
}) {
  const [viewMode, setViewMode] = useState("activity")
  const [selectedPlayerIds, setSelectedPlayerIds] = useState([])
  const [activityPlayerId, setActivityPlayerId] = useState("")
  const [isPlayerMenuOpen, setIsPlayerMenuOpen] = useState(false)
  const [activityFiltersOpen, setActivityFiltersOpen] = useState(!isMobile)
  const [statsFiltersOpen, setStatsFiltersOpen] = useState(!isMobile)
  const [exerciseFilter, setExerciseFilter] = useState("all")
  const [repRangeFilter, setRepRangeFilter] = useState("all")
  const [periodFilter, setPeriodFilter] = useState("90")
  const [statsRows, setStatsRows] = useState([])
  const [activityRows, setActivityRows] = useState([])
  const [repTargetRows, setRepTargetRows] = useState([])
  const [isLoadingStats, setIsLoadingStats] = useState(false)
  const [isLoadingActivity, setIsLoadingActivity] = useState(false)
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false)
  const [recommendationDrafts, setRecommendationDrafts] = useState({})
  const [savingRecommendationKey, setSavingRecommendationKey] = useState("")
  const [expandedChart, setExpandedChart] = useState(null)
  const [selectedActivitySessionId, setSelectedActivitySessionId] = useState("")

  useEffect(() => {
    setActivityFiltersOpen(!isMobile)
    setStatsFiltersOpen(!isMobile)
  }, [isMobile])

  useEffect(() => {
    setIsPlayerMenuOpen(false)
  }, [viewMode])

  const sortedPlayers = useMemo(
    () =>
      (candidatePlayers || [])
        .filter((player) => player.role === "player")
        .filter((player) => !player.is_archived)
        .slice()
        .sort((a, b) => String(a.full_name || "").localeCompare(String(b.full_name || ""), "sv")),
    [candidatePlayers]
  )

  useEffect(() => {
    setSelectedPlayerIds((prev) => prev.filter((id) => sortedPlayers.some((player) => player.id === id)))
    setActivityPlayerId((prev) =>
      prev && sortedPlayers.some((player) => player.id === prev) ? prev : ""
    )
  }, [sortedPlayers])

  useEffect(() => {
    const loadStats = async () => {
      if (!selectedPlayerIds.length) {
        setStatsRows([])
        return
      }

      setIsLoadingStats(true)

      const { data, error } = await supabase
        .from("workout_logs")
        .select("user_id, exercise, weight, reps, created_at, workout_session_id, pass_name, set_number, is_completed, set_type")
        .in("user_id", selectedPlayerIds)
        .not("weight", "is", null)
        .eq("set_type", "work")
        .order("created_at", { ascending: true })

      if (error) {
        console.error(error)
        setStatsRows([])
        setIsLoadingStats(false)
        return
      }

      setStatsRows(data || [])
      setIsLoadingStats(false)
    }

    loadStats()
  }, [selectedPlayerIds])

  useEffect(() => {
    const loadRecommendations = async () => {
      if (!selectedPlayerIds.length) {
        setRepTargetRows([])
        return
      }

      setIsLoadingRecommendations(true)

      const { data: repData, error: repError } = await supabase
        .from("player_exercise_rep_targets")
        .select("player_id, exercise_id, rep_range_key, target_weight, source, updated_at")
        .in("player_id", selectedPlayerIds)

      if (repError) {
        console.error(repError)
        setRepTargetRows([])
        setIsLoadingRecommendations(false)
        return
      }

      setRepTargetRows(repData || [])
      setIsLoadingRecommendations(false)
    }

    loadRecommendations()
  }, [selectedPlayerIds])

  useEffect(() => {
    const loadActivity = async () => {
      if (!sortedPlayers.length) {
        setActivityRows([])
        return
      }

      setIsLoadingActivity(true)

      const playerIds = sortedPlayers.map((player) => player.id)
      const { data, error } = await supabase
        .from("workout_logs")
        .select("user_id, pass_name, created_at, workout_session_id, is_completed, workout_kind, running_origin, free_activity_type, exercise, set_number, weight, reps, seconds, set_type, exercise_comment, pass_comment, running_type, interval_time, intervals_count, running_distance, running_time, average_pulse")
        .in("user_id", playerIds)
        .eq("is_completed", true)
        .order("created_at", { ascending: false })

      if (error) {
        console.error(error)
        setActivityRows([])
        setIsLoadingActivity(false)
        return
      }

      setActivityRows(data || [])
      setIsLoadingActivity(false)
    }

    loadActivity()
  }, [sortedPlayers])

  const playerMap = useMemo(
    () => new Map(sortedPlayers.map((player) => [String(player.id), player])),
    [sortedPlayers]
  )

  const filteredStatsRows = useMemo(() => {
    if (periodFilter === "all") return statsRows

    const days = Number(periodFilter)
    if (!Number.isFinite(days) || days <= 0) return statsRows

    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000

    return statsRows.filter((row) => {
      const createdAt = new Date(row.created_at).getTime()
      return Number.isFinite(createdAt) && createdAt >= cutoff
    })
  }, [periodFilter, statsRows])

  const progressionSeries = useMemo(
    () => buildProgressionSeries(filteredStatsRows, playerMap, exerciseFilter, repRangeFilter),
    [exerciseFilter, filteredStatsRows, playerMap, repRangeFilter]
  )

  const exerciseOptions = useMemo(
    () => progressionSeries.map((entry) => entry.exerciseName),
    [progressionSeries]
  )

  const selectedPlayerSummary = useMemo(() => {
    if (selectedPlayerIds.length === 0) return "Välj spelare"
    if (selectedPlayerIds.length === sortedPlayers.length) return "Alla spelare"

    const selectedPlayers = sortedPlayers.filter((player) => selectedPlayerIds.includes(player.id))
    if (selectedPlayers.length === 1) return selectedPlayers[0].full_name
    return `${selectedPlayers.length} spelare valda`
  }, [selectedPlayerIds, sortedPlayers])

  const visibleSeries = useMemo(() => {
    if (exerciseFilter === "all" || repRangeFilter === "all") return []
    if (exerciseFilter === "all") return progressionSeries
    return progressionSeries.filter((entry) => entry.exerciseName === exerciseFilter)
  }, [exerciseFilter, progressionSeries])

  const repTargetsByPlayerExercise = useMemo(() => {
    return (repTargetRows || []).reduce((acc, row) => {
      if (!row.player_id || !row.exercise_id || !row.rep_range_key) return acc

      const playerId = String(row.player_id)
      const exerciseId = String(row.exercise_id)

      if (!acc[playerId]) acc[playerId] = {}
      if (!acc[playerId][exerciseId]) acc[playerId][exerciseId] = {}

      acc[playerId][exerciseId][row.rep_range_key] = {
        weight: row.target_weight,
        source: row.source || "coach",
        updated_at: row.updated_at || null,
      }

      return acc
    }, {})
  }, [repTargetRows])

  const targetExerciseOptions = useMemo(() => {
    const targetNames = (repTargetRows || [])
      .map((row) => (exercises || []).find((exercise) => String(exercise.id) === String(row.exercise_id)))
      .filter(Boolean)
      .map((exercise) => getExerciseDisplayName(exercise))

    return Array.from(new Set([...exerciseOptions, ...targetNames])).sort((a, b) =>
      a.localeCompare(b, "sv")
    )
  }, [exerciseOptions, exercises, repTargetRows])

  const selectedExerciseRecommendationRows = useMemo(() => {
    if (!selectedPlayerIds.length || exerciseFilter === "all") return []

    const matchedExercise = findExerciseByLoggedName(exercises, exerciseFilter)
    if (!matchedExercise?.id) return []

    return selectedPlayerIds
      .map((playerId) => {
        const player = playerMap.get(String(playerId))
        const latestLog = statsRows
          .filter(
            (row) =>
              String(row.user_id) === String(playerId) &&
              normalizeExerciseLookupValue(row.exercise) === normalizeExerciseLookupValue(exerciseFilter) &&
              (repRangeFilter === "all" ||
                getExerciseRepRangeBucket(row.reps)?.key === repRangeFilter)
          )
          .slice()
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]

        const latestWeight = parseWeightValue(latestLog?.weight)
        const repBucket = getExerciseRepRangeBucket(latestLog?.reps)
        const targetMap =
          repTargetsByPlayerExercise?.[String(playerId)]?.[String(matchedExercise.id)] || {}
        const availableRecommendations = REP_RANGE_BUCKETS.map((bucket) => {
          const bucketEntry = targetMap?.[bucket.key]
          const numericWeight =
            bucketEntry?.weight != null && Number.isFinite(Number(bucketEntry.weight))
              ? Number(bucketEntry.weight)
              : null

          if (numericWeight == null) return null

          return {
            key: bucket.key,
            label: bucket.label,
            weight: numericWeight,
            source: bucketEntry?.source || null,
            updated_at: bucketEntry?.updated_at || null,
          }
        }).filter(Boolean)

        const filteredRecommendations =
          repRangeFilter === "all"
            ? availableRecommendations
            : availableRecommendations.filter((recommendation) => recommendation.key === repRangeFilter)

        const fallbackRecommendation =
          repRangeFilter === "all"
            ? filteredRecommendations
                .slice()
                .sort(
                  (a, b) =>
                    REP_RANGE_PRIORITY.indexOf(a.key) - REP_RANGE_PRIORITY.indexOf(b.key)
                )[0] || null
            : null

        const explicitTargetEntry = repRangeFilter !== "all" ? targetMap?.[repRangeFilter] || null : null
        const explicitTargetWeight =
          explicitTargetEntry?.weight != null && Number.isFinite(Number(explicitTargetEntry.weight))
            ? Number(explicitTargetEntry.weight)
            : null
        const resolvedRecommendation = explicitTargetWeight != null ? explicitTargetWeight : fallbackRecommendation?.weight ?? null
        const resolvedRecommendationRangeLabel =
          repRangeFilter !== "all"
            ? REP_RANGE_BUCKETS.find((bucket) => bucket.key === repRangeFilter)?.label || null
            : repBucket?.label || fallbackRecommendation?.label || null

        return {
          playerId: String(playerId),
          playerName: player?.full_name || player?.username || "Spelare",
          exerciseId: String(matchedExercise.id),
          exerciseType: matchedExercise.exercise_type || "reps_only",
          latestWeight,
          latestReps: latestLog?.reps || null,
          latestDate: latestLog?.created_at || null,
          repRangeLabel: repBucket?.label || null,
          recommendedWeight: resolvedRecommendation,
          recommendationRangeLabel: resolvedRecommendationRangeLabel,
          recommendationSource: explicitTargetEntry?.source || fallbackRecommendation?.source || null,
          availableRecommendations: filteredRecommendations,
        }
      })
      .sort((a, b) => a.playerName.localeCompare(b.playerName, "sv"))
  }, [exerciseFilter, exercises, playerMap, repRangeFilter, repTargetsByPlayerExercise, selectedPlayerIds, statsRows])

  useEffect(() => {
    if (repRangeFilter === "all") return

    setRecommendationDrafts((prev) => {
      const next = { ...prev }

      selectedExerciseRecommendationRows.forEach((entry) => {
        const draftKey = `${entry.playerId}:${entry.exerciseId}:${repRangeFilter}`
        next[draftKey] =
          prev[draftKey] ?? (entry.recommendedWeight != null ? String(entry.recommendedWeight) : "")
      })

      return next
    })
  }, [repRangeFilter, selectedExerciseRecommendationRows])

  const handleRecommendationDraftChange = (entry, value) => {
    if (repRangeFilter === "all") return
    const draftKey = `${entry.playerId}:${entry.exerciseId}:${repRangeFilter}`
    setRecommendationDrafts((prev) => ({
      ...prev,
      [draftKey]: value,
    }))
  }

  const handleSaveRecommendationWeight = async (entry) => {
    if (!entry?.exerciseId || repRangeFilter === "all" || entry.exerciseType !== "weight_reps") return

    const draftKey = `${entry.playerId}:${entry.exerciseId}:${repRangeFilter}`
    const rawValue = String(recommendationDrafts[draftKey] ?? "").trim().replace(",", ".")
    setSavingRecommendationKey(draftKey)

    if (!rawValue) {
      const { error } = await supabase
        .from("player_exercise_rep_targets")
        .delete()
        .eq("player_id", entry.playerId)
        .eq("exercise_id", entry.exerciseId)
        .eq("rep_range_key", repRangeFilter)

      if (error) {
        console.error(error)
        setSavingRecommendationKey("")
        return
      }
    } else {
      const numericValue = Number(rawValue)

      if (!Number.isFinite(numericValue) || numericValue <= 0) {
        setSavingRecommendationKey("")
        return
      }

      const { error } = await supabase
        .from("player_exercise_rep_targets")
        .upsert(
          {
            player_id: entry.playerId,
            exercise_id: entry.exerciseId,
            rep_range_key: repRangeFilter,
            target_weight: numericValue,
            updated_by: currentUserId || null,
            source: "coach",
          },
          { onConflict: "player_id,exercise_id,rep_range_key" }
        )

      if (error) {
        console.error(error)
        setSavingRecommendationKey("")
        return
      }
    }

    const { data: repData, error: repError } = await supabase
      .from("player_exercise_rep_targets")
      .select("player_id, exercise_id, rep_range_key, target_weight, source, updated_at")
      .in("player_id", selectedPlayerIds)

    if (repError) {
      console.error(repError)
      setSavingRecommendationKey("")
      return
    }

    setRepTargetRows(repData || [])
    setSavingRecommendationKey("")
  }

  const activitySessions = useMemo(() => {
    const visibleRows = activityPlayerId
      ? activityRows.filter((row) => String(row.user_id) === String(activityPlayerId))
      : activityRows

    return buildActivitySessions(visibleRows, playerMap)
  }, [activityPlayerId, activityRows, playerMap])

  const selectedActivitySession = useMemo(
    () => activitySessions.find((session) => session.sessionId === selectedActivitySessionId) || null,
    [activitySessions, selectedActivitySessionId]
  )

  useEffect(() => {
    setSelectedActivitySessionId((current) => {
      if (current && activitySessions.some((session) => session.sessionId === current)) {
        return current
      }

      return ""
    })
  }, [activitySessions])

  return (
    <div style={pageWrapStyle}>
      <div style={pageHeaderStyle}>
        <div style={pageHeaderCopyStyle}>
        <div style={pageEyebrowStyle}>Tränarvy</div>
        <div style={introTitleStyle}>Aktivitet och statistik</div>
        <div style={introTextStyle}>
          Öppna genomförda pass direkt i listan och växla sedan över till utveckling per övning i samma kompakta flöde.
        </div>
        </div>
      </div>

      <div style={introStatsGridStyle(isMobile)}>
        <div style={introStatCardStyle}>
          <div style={introStatLabelStyle}>Spelare</div>
          <div style={{ ...introStatValueStyle, color: "#dc2626" }}>{sortedPlayers.length}</div>
        </div>
        <div style={introStatCardStyle}>
          <div style={introStatLabelStyle}>Aktivitet</div>
          <div style={introStatValueStyle}>{activitySessions.length}</div>
        </div>
        <div style={introStatCardStyle}>
          <div style={introStatLabelStyle}>Övningar</div>
          <div style={introStatValueStyle}>{targetExerciseOptions.length}</div>
        </div>
      </div>
      <div style={viewSwitchWrapStyle(isMobile)}>
        <button
          type="button"
          onClick={() => setViewMode("activity")}
          style={primaryViewButtonStyle(viewMode === "activity", isMobile)}
        >
          Aktivitet
        </button>
        <button
          type="button"
          onClick={() => setViewMode("stats")}
          style={primaryViewButtonStyle(viewMode === "stats", isMobile)}
        >
          Statistik
        </button>
      </div>

      <div style={contentPanelStyle}>
        {viewMode === "activity" ? (
          <>
            <div style={panelHeaderStyle(isMobile)}>
              <div>
                <div style={panelTitleStyle}>Aktivitet</div>
                <div style={panelTextStyle}>
                  Välj spelare i filtret och öppna sedan ett genomfört pass direkt i listan för att se övningar, set och kommentar.
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActivityFiltersOpen((prev) => !prev)}
                style={{ ...secondaryButtonStyle, width: isMobile ? "100%" : "auto" }}
              >
                {activityFiltersOpen ? "Dölj filter" : "Visa filter"}
              </button>
            </div>

            {activityFiltersOpen ? (
              <div style={activityFilterGridStyle(isMobile)}>
                <div style={filterCardStyle}>
                  <div style={filterTitleStyle}>Spelare</div>
                  <select
                    value={activityPlayerId}
                    onChange={(event) => setActivityPlayerId(event.target.value)}
                    style={{ ...inputStyle, width: "100%" }}
                  >
                    <option value="">Alla spelare</option>
                    {sortedPlayers.map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.full_name}
                      </option>
                    ))}
                  </select>
                  <div style={{ ...mutedTextStyle, marginTop: "10px" }}>
                    Filtrera aktivitetslistan på en specifik spelare eller visa hela laget.
                  </div>
                </div>
              </div>
            ) : null}

            {isLoadingActivity ? (
              <p style={mutedTextStyle}>Laddar aktivitet...</p>
            ) : activitySessions.length === 0 ? (
              <p style={mutedTextStyle}>Ingen aktivitet hittades för det aktuella urvalet.</p>
            ) : (
              <div style={activityListStyle}>
                {activitySessions.map((session) => {
                  const isSelected = selectedActivitySessionId === session.sessionId

                  return (
                    <div key={session.sessionId} style={activityItemWrapStyle}>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedActivitySessionId((current) =>
                            current === session.sessionId ? "" : session.sessionId
                          )
                        }
                        style={{
                          ...activityRowStyle(isMobile),
                          borderColor: isSelected ? "#efc7c7" : "#d7dee7",
                          backgroundColor: isSelected ? "#fff4f4" : "#ffffff",
                          cursor: "pointer",
                        }}
                      >
                        <div>
                          <div style={activityPlayerNameStyle}>{session.playerName}</div>
                          <div style={activityMetaStyle}>{session.passName}</div>
                          <div style={activitySummaryStyle}>{buildActivityRowSummary(session)}</div>
                        </div>
                        <div style={activityRowAsideStyle}>
                          <div style={activityDateStyle}>{formatStatDate(session.createdAt)}</div>
                          <div style={activitySelectedHintStyle}>{isSelected ? "−" : "+"}</div>
                        </div>
                      </button>

                      {isSelected ? (
                        <div style={activityDetailPanelStyle}>
                          <div style={activityDetailPanelHeaderStyle}>
                            <div style={panelTitleStyle}>{session.passName}</div>
                            <div style={activityDetailMetaStyle}>
                              {session.playerName} • {formatStatDate(session.createdAt)}
                              {session.runningSummary ? ` • ${session.runningSummary}` : ""}
                            </div>
                          </div>

                          {session.workoutKind === "running" ? (
                            <div style={activityRunningCardStyle}>
                              {session.runningSummary || "Aktivitet genomförd"}
                            </div>
                          ) : (
                            <div style={activityExerciseCardsViewportStyle}>
                              <div style={activitySwipeHintStyle}>Svep mellan övningarna</div>
                              <div style={activityExerciseCardsTrackStyle}>
                                {session.exercises.map((exercise) => (
                                  <div
                                    key={`${session.sessionId}-${exercise.name}`}
                                    style={activityExerciseCardStyle}
                                  >
                                    <div style={activityExerciseCardTitleStyle}>{exercise.displayName}</div>
                                    <div style={activityExerciseCardSubStyle}>
                                      {exercise.protocolConfig
                                        ? `${exercise.sets.length} block klara`
                                        : `${exercise.sets.length} set loggade`}
                                    </div>

                                    <div style={activitySetListStyle}>
                                      {exercise.sets.map((setEntry, setIndex) => {
                                        const protocolStep = exercise.protocolConfig
                                          ? getExerciseProtocolStep(exercise, setEntry.setNumber || setIndex + 1)
                                          : null

                                        return (
                                          <div
                                            key={`${session.sessionId}-${exercise.name}-${setEntry.setNumber || setIndex}`}
                                            style={activitySetCardStyle}
                                          >
                                            <div style={activitySetTitleStyle}>
                                              {protocolStep?.label || `Set ${setEntry.setNumber || setIndex + 1}`}
                                            </div>

                                            {protocolStep ? (
                                              <div style={{ display: "grid", gap: "6px" }}>
                                                <div style={{ fontSize: "15px", fontWeight: "800", color: "#18202b" }}>
                                                  {protocolStep.summary}
                                                </div>
                                                <div style={activitySetMetaValueStyle}>Klart</div>
                                                {setEntry.exerciseComment ? (
                                                  <div style={{ fontSize: "13px", color: "#64748b", lineHeight: 1.5 }}>
                                                    Kommentar: {setEntry.exerciseComment}
                                                  </div>
                                                ) : null}
                                              </div>
                                            ) : (
                                              <div style={activitySetMetaGridStyle}>
                                                <div style={activitySetMetaItemStyle}>
                                                  <div style={activitySetMetaLabelStyle}>Vikt</div>
                                                  <div style={activitySetMetaValueStyle}>
                                                    {setEntry.weight ? `${setEntry.weight} kg` : "—"}
                                                  </div>
                                                </div>
                                                <div style={activitySetMetaItemStyle}>
                                                  <div style={activitySetMetaLabelStyle}>Reps</div>
                                                  <div style={activitySetMetaValueStyle}>{setEntry.reps || "—"}</div>
                                                </div>
                                                <div style={activitySetMetaItemStyle}>
                                                  <div style={activitySetMetaLabelStyle}>Tid</div>
                                                  <div style={activitySetMetaValueStyle}>
                                                    {setEntry.seconds ? `${setEntry.seconds} sek` : "—"}
                                                  </div>
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        )
                                      })}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {session.passComment ? (
                            <div style={activityPassCommentStyle}>
                              <strong>Kommentar:</strong> {session.passComment}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        ) : (
          <>
            <div style={panelHeaderStyle(isMobile)}>
              <div>
                <div style={panelTitleStyle}>Statistik</div>
                <div style={panelTextStyle}>
                  Filtrera spelare och övning, jämför senaste logg med målvikt och öppna sedan utvecklingen i graferna.
                </div>
              </div>

              <button
                type="button"
                onClick={() => setStatsFiltersOpen((prev) => !prev)}
                style={{ ...secondaryButtonStyle, width: isMobile ? "100%" : "auto" }}
              >
                {statsFiltersOpen ? "Dölj filter" : "Visa filter"}
              </button>
            </div>

            {statsFiltersOpen ? (
              <div style={filterGridStyle(isMobile)}>
                <div style={filterCardStyle}>
                  <div style={filterTitleStyle}>Spelare</div>
                  {sortedPlayers.length === 0 ? (
                    <div style={mutedTextStyle}>Inga aktiva spelare tillgängliga.</div>
                  ) : (
                    <div style={{ position: "relative" }}>
                      <button
                        type="button"
                        onClick={() => setIsPlayerMenuOpen((prev) => !prev)}
                        style={{
                          ...inputStyle,
                          width: "100%",
                          textAlign: "left",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: "10px",
                          cursor: "pointer",
                          backgroundColor: "#ffffff",
                        }}
                      >
                        <span>{selectedPlayerSummary}</span>
                        <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "700" }}>
                          {isPlayerMenuOpen ? "Stäng" : "Öppna"}
                        </span>
                      </button>

                      {isPlayerMenuOpen ? (
                        <div style={playerDropdownMenuStyle}>
                          <div style={playerDropdownActionsStyle}>
                            <button
                              type="button"
                              onClick={() => setSelectedPlayerIds(sortedPlayers.map((player) => player.id))}
                              style={{ ...secondaryButtonStyle, width: "100%" }}
                            >
                              Välj alla
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedPlayerIds([])}
                              style={{ ...secondaryButtonStyle, width: "100%" }}
                            >
                              Rensa val
                            </button>
                          </div>

                          <div style={playerDropdownListStyle}>
                            {sortedPlayers.map((player) => (
                              <label key={player.id} style={playerDropdownItemStyle}>
                                <input
                                  type="checkbox"
                                  checked={selectedPlayerIds.includes(player.id)}
                                  onChange={() =>
                                    setSelectedPlayerIds((prev) =>
                                      prev.includes(player.id)
                                        ? prev.filter((entry) => entry !== player.id)
                                        : [...prev, player.id]
                                    )
                                  }
                                />
                                <span>{player.full_name}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>

                <div style={filterCardStyle}>
                  <div style={filterTitleStyle}>Övning</div>
                  <select
                    value={exerciseFilter}
                    onChange={(event) => setExerciseFilter(event.target.value)}
                    style={{ ...inputStyle, width: "100%" }}
                  >
                    <option value="all">Alla övningar</option>
                    {targetExerciseOptions.map((exerciseName) => (
                      <option key={exerciseName} value={exerciseName}>
                        {exerciseName}
                      </option>
                    ))}
                  </select>
                  <div style={{ ...mutedTextStyle, marginTop: "10px" }}>
                    Välj den övning du vill analysera i grafen och viktöversikten.
                  </div>
                </div>

                <div style={filterCardStyle}>
                  <div style={filterTitleStyle}>Repsintervall</div>
                  <select
                    value={repRangeFilter}
                    onChange={(event) => setRepRangeFilter(event.target.value)}
                    style={{ ...inputStyle, width: "100%" }}
                  >
                    {REP_RANGE_FILTER_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <div style={{ ...mutedTextStyle, marginTop: "10px" }}>
                    Graferna visas först när ett specifikt repsintervall är valt.
                  </div>
                </div>

                <div style={filterCardStyle}>
                  <div style={filterTitleStyle}>Period</div>
                  <select
                    value={periodFilter}
                    onChange={(event) => setPeriodFilter(event.target.value)}
                    style={{ ...inputStyle, width: "100%" }}
                  >
                    {PERIOD_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <div style={{ ...mutedTextStyle, marginTop: "10px" }}>
                    Begränsar graferna till vald tidsperiod utan att ändra spelare eller övningsval.
                  </div>
                </div>
              </div>
            ) : null}

            <div style={statsSummaryGridStyle(isMobile)}>
              <div style={statsSummaryCardStyle}>
                <div style={statsSummaryLabelStyle}>Valda spelare</div>
                <div style={{ ...statsSummaryValueStyle, color: "#dc2626" }}>{selectedPlayerIds.length}</div>
              </div>
              <div style={statsSummaryCardStyle}>
                <div style={statsSummaryLabelStyle}>Övningar med data</div>
                <div style={statsSummaryValueStyle}>{targetExerciseOptions.length}</div>
              </div>
              <div style={statsSummaryCardStyle}>
                <div style={statsSummaryLabelStyle}>Datarader</div>
                <div style={statsSummaryValueStyle}>{filteredStatsRows.length}</div>
              </div>
            </div>

            {isLoadingStats ? (
              <p style={mutedTextStyle}>Laddar statistik...</p>
            ) : !selectedPlayerIds.length ? (
              <p style={mutedTextStyle}>Välj minst en spelare för att visa statistik.</p>
            ) : (
              <>
                {exerciseFilter !== "all" ? (
                  <div style={recommendationSectionStyle}>
                    <div style={recommendationSectionHeaderStyle}>
                      <div>
                        <div style={recommendationSectionTitleStyle}>Viktöversikt för {exerciseFilter}</div>
                        <div style={recommendationSectionTextStyle}>
                          Visar senaste loggade vikt per spelare och rekommenderad vikt för samma repsintervall.
                        </div>
                      </div>
                    </div>

                    {isLoadingRecommendations ? (
                      <div style={mutedTextStyle}>Laddar rekommenderade vikter...</div>
                    ) : selectedExerciseRecommendationRows.length === 0 ? (
                      <div style={mutedTextStyle}>Ingen viktöversikt hittades för vald övning.</div>
                    ) : (
                      <div style={recommendationGridStyle(isMobile)}>
                        {selectedExerciseRecommendationRows.map((entry) => (
                          <div key={entry.playerId} style={recommendationCardStyle}>
                            <div style={recommendationCardHeaderStyle}>
                              <div style={recommendationPlayerNameStyle}>{entry.playerName}</div>
                              <div style={recommendationDateStyle}>
                                {entry.latestDate ? formatStatDate(entry.latestDate) : "Ingen logg"}
                              </div>
                            </div>

                            <div style={recommendationStatsGridStyle}>
                              <div style={recommendationStatBoxStyle}>
                                <div style={recommendationStatLabelStyle}>Senast loggat</div>
                                <div style={recommendationStatValueStyle}>
                                  {entry.latestWeight != null ? `${entry.latestWeight} kg` : "—"}
                                </div>
                                <div style={recommendationStatMetaStyle}>
                                  {entry.latestReps ? `${entry.latestReps} reps` : "Ingen repsdata"}
                                </div>
                              </div>

                              <div style={recommendationStatBoxStyle}>
                                <div style={recommendationStatLabelStyle}>Rekommenderad vikt</div>
                                <div style={recommendationStatValueStyle}>
                                  {entry.recommendedWeight != null ? `${entry.recommendedWeight} kg` : "—"}
                                </div>
                                <div style={recommendationStatMetaStyle}>
                                  {entry.recommendationRangeLabel
                                    ? `${entry.recommendationRangeLabel} reps`
                                    : "Ingen målvikt sparad"}
                                </div>
                              </div>
                            </div>

                            {entry.availableRecommendations.length > 0 ? (
                              <div style={recommendationRangesWrapStyle}>
                                {entry.availableRecommendations.map((recommendation) => (
                                  <div key={`${entry.playerId}-${recommendation.key}`} style={recommendationRangeChipStyle}>
                                    <span style={recommendationRangeChipLabelStyle}>{recommendation.label}</span>
                                    <span style={recommendationRangeChipValueStyle}>{recommendation.weight} kg</span>
                                  </div>
                                ))}
                              </div>
                            ) : null}

                            {entry.exerciseType === "weight_reps" ? (
                              repRangeFilter === "all" ? (
                                <div style={recommendationQuickEditHintStyle}>
                                  Välj ett specifikt repsintervall för att snabbredigera målvikt här.
                                </div>
                              ) : (
                                <div style={recommendationQuickEditRowStyle(isMobile)}>
                                  <input
                                    type="number"
                                    placeholder="Målvikt i kg"
                                    value={
                                      recommendationDrafts[`${entry.playerId}:${entry.exerciseId}:${repRangeFilter}`] ?? ""
                                    }
                                    onChange={(event) => handleRecommendationDraftChange(entry, event.target.value)}
                                    style={{ ...inputStyle, width: isMobile ? "100%" : "180px" }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleSaveRecommendationWeight(entry)}
                                    disabled={
                                      savingRecommendationKey ===
                                      `${entry.playerId}:${entry.exerciseId}:${repRangeFilter}`
                                    }
                                    style={{
                                      ...secondaryButtonStyle,
                                      width: isMobile ? "100%" : "auto",
                                      backgroundColor: "#111827",
                                      color: "#ffffff",
                                      opacity:
                                        savingRecommendationKey ===
                                        `${entry.playerId}:${entry.exerciseId}:${repRangeFilter}`
                                          ? 0.7
                                          : 1,
                                    }}
                                  >
                                    {savingRecommendationKey ===
                                    `${entry.playerId}:${entry.exerciseId}:${repRangeFilter}`
                                      ? "Sparar..."
                                      : "Spara målvikt"}
                                  </button>
                                </div>
                              )
                            ) : (
                              <div style={recommendationQuickEditHintStyle}>
                                Den här övningen använder inte målvikt.
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}

                {exerciseFilter === "all" ? (
                  <p style={mutedTextStyle}>Välj en specifik övning för att visa viktutveckling.</p>
                ) : repRangeFilter === "all" ? (
                  <p style={mutedTextStyle}>Välj ett specifikt repsintervall för att visa viktutveckling per dag.</p>
                ) : visibleSeries.length === 0 ? (
                  <p style={mutedTextStyle}>Ingen viktdata hittades för vald övning och valt repsintervall.</p>
                ) : (
                  <div style={chartGridStyle}>
                    {visibleSeries.map((entry) => (
                      <ExerciseChartCard
                        key={entry.exerciseName}
                        exerciseName={entry.exerciseName}
                        repRangeLabel={REP_RANGE_BUCKETS.find((bucket) => bucket.key === repRangeFilter)?.label || ""}
                        playerSeries={entry.playerSeries}
                        isMobile={isMobile}
                        onExpand={() =>
                          setExpandedChart({
                            exerciseName: entry.exerciseName,
                            repRangeLabel:
                              REP_RANGE_BUCKETS.find((bucket) => bucket.key === repRangeFilter)?.label || "",
                            playerSeries: entry.playerSeries,
                          })
                        }
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {expandedChart ? (
        <ChartModal
          exerciseName={expandedChart.exerciseName}
          repRangeLabel={expandedChart.repRangeLabel}
          playerSeries={expandedChart.playerSeries}
          onClose={() => setExpandedChart(null)}
        />
      ) : null}
    </div>
  )
}

function ExerciseChartCard({ exerciseName, repRangeLabel, playerSeries, isMobile, onExpand }) {
  const chartMetrics = useMemo(() => getChartMetrics(playerSeries), [playerSeries])

  if (!chartMetrics) return null

  return (
    <div style={chartCardStyle}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: isMobile ? "stretch" : "flex-start",
          flexDirection: isMobile ? "column" : "row",
          gap: "12px",
          marginBottom: "12px",
        }}
      >
        <div>
          <div style={chartTitleStyle}>{exerciseName}</div>
          <div style={chartSubtitleStyle}>
            {repRangeLabel
              ? `Högsta loggade vikt per dag inom ${repRangeLabel} reps`
              : "Högsta loggade vikt per dag"}
          </div>
        </div>

        <div style={chartHeaderActionsStyle}>
          <div style={legendWrapStyle}>
            {playerSeries.map((series) => (
              <div key={series.playerId} style={legendItemStyle}>
                <span style={{ ...legendColorStyle, backgroundColor: series.color }} />
                <span>{series.playerName}</span>
              </div>
            ))}
          </div>

          <button type="button" onClick={onExpand} style={expandButtonStyle}>
            <span aria-hidden="true">+</span>
            <span style={srOnlyStyle}>Förstora graf</span>
          </button>
        </div>
      </div>

      <ChartGraphic
        exerciseName={exerciseName}
        playerSeries={playerSeries}
        chartMetrics={chartMetrics}
        viewWidth={620}
        viewHeight={260}
      />

      <div style={statGridStyle(isMobile)}>
        {playerSeries.map((series) => {
          const latestPoint = series.points[series.points.length - 1]
          const bestPoint = series.points.reduce((best, point) => (point.y > best.y ? point : best), series.points[0])

          return (
            <div key={`${series.playerId}-stats`} style={statCardStyle}>
              <div style={{ ...legendItemStyle, marginBottom: "8px" }}>
                <span style={{ ...legendColorStyle, backgroundColor: series.color }} />
                <span style={statPlayerNameStyle}>{series.playerName}</span>
              </div>
              <div style={statLineStyle}>Senast: {latestPoint?.y ?? "-"} kg</div>
              <div style={statLineStyle}>Bäst: {bestPoint?.y ?? "-"} kg</div>
              <div style={statFootnoteStyle}>{series.points.length} dagar med datapunkter</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ChartModal({ exerciseName, repRangeLabel, playerSeries, onClose }) {
  const chartMetrics = useMemo(() => getChartMetrics(playerSeries), [playerSeries])

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose()
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onClose])

  if (!chartMetrics) return null

  return (
    <div style={chartModalBackdropStyle} onClick={onClose}>
      <div style={chartModalCardStyle} onClick={(event) => event.stopPropagation()}>
        <div style={chartModalHeaderStyle}>
          <div>
            <div style={chartTitleStyle}>{exerciseName}</div>
            <div style={chartSubtitleStyle}>
              {repRangeLabel
                ? `Förstorad graf för högsta vikt per dag inom ${repRangeLabel} reps`
                : "Förstorad graf med högre upplösning"}
            </div>
          </div>

          <button type="button" onClick={onClose} style={closeButtonStyle}>
            Stäng
          </button>
        </div>

        <div style={chartModalLegendStyle}>
          {playerSeries.map((series) => (
            <div key={series.playerId} style={legendItemStyle}>
              <span style={{ ...legendColorStyle, backgroundColor: series.color }} />
              <span>{series.playerName}</span>
            </div>
          ))}
        </div>

        <ChartGraphic
          exerciseName={exerciseName}
          playerSeries={playerSeries}
          chartMetrics={chartMetrics}
          viewWidth={1200}
          viewHeight={540}
        />
      </div>
    </div>
  )
}

function ChartGraphic({ exerciseName, playerSeries, chartMetrics, viewWidth, viewHeight }) {
  const { minX, maxX, minY, maxY, yPadding, yTicks, xTicks } = chartMetrics
  const leftPad = viewWidth >= 1000 ? 76 : 44
  const rightPad = viewWidth >= 1000 ? 28 : 18
  const topPad = viewWidth >= 1000 ? 26 : 18
  const bottomPad = viewWidth >= 1000 ? 52 : 34
  const plotWidth = viewWidth - leftPad - rightPad
  const plotHeight = viewHeight - topPad - bottomPad
  const axisFontSize = viewWidth >= 1000 ? 20 : 11
  const xFontSize = viewWidth >= 1000 ? 17 : 10
  const lineWidth = viewWidth >= 1000 ? 5 : 3
  const pointRadius = viewWidth >= 1000 ? 6 : 4

  const xScale = (value) => {
    if (maxX === minX) return leftPad + plotWidth / 2
    return leftPad + ((value - minX) / (maxX - minX)) * plotWidth
  }

  const yScale = (value) => {
    if (maxY === minY) return topPad + plotHeight / 2
    return topPad + plotHeight - ((value - (minY - yPadding)) / (maxY - minY + yPadding * 2)) * plotHeight
  }

  return (
    <svg
      viewBox={`0 0 ${viewWidth} ${viewHeight}`}
      style={{
        width: "100%",
        height: "auto",
        overflow: "visible",
        display: "block",
        shapeRendering: "geometricPrecision",
        textRendering: "geometricPrecision",
      }}
      role="img"
      aria-label={`Graf för ${exerciseName}`}
    >
      {yTicks.map((tick) => (
        <g key={tick}>
          <line
            x1={leftPad}
            x2={viewWidth - rightPad}
            y1={yScale(tick)}
            y2={yScale(tick)}
            stroke="#e5edf5"
            strokeWidth="1"
          />
          <text
            x={leftPad - 8}
            y={yScale(tick) + axisFontSize / 3}
            textAnchor="end"
            fontSize={axisFontSize}
            fill="#64748b"
          >
            {tick}
          </text>
        </g>
      ))}

      {playerSeries.map((series) => {
        const path = series.points
          .map((point, index) => `${index === 0 ? "M" : "L"} ${xScale(point.x)} ${yScale(point.y)}`)
          .join(" ")

        return (
          <g key={series.playerId}>
            <path d={path} fill="none" stroke={series.color} strokeWidth={lineWidth} strokeLinecap="round" />
            {series.points.map((point) => (
              <g key={`${series.playerId}-${point.x}-${point.y}`}>
                <circle cx={xScale(point.x)} cy={yScale(point.y)} r={pointRadius} fill={series.color} />
                <title>{`${series.playerName}: ${point.y} kg • ${point.label}`}</title>
              </g>
            ))}
          </g>
        )
      })}

      {xTicks.map((point) => (
        <text
          key={`x-${point.x}-${point.y}`}
          x={xScale(point.x)}
          y={viewHeight - 10}
          textAnchor="middle"
          fontSize={xFontSize}
          fill="#64748b"
        >
          {point.label.slice(2)}
        </text>
      ))}
    </svg>
  )
}

function getChartMetrics(playerSeries) {
  const allPoints = playerSeries.flatMap((series) => series.points)
  if (!allPoints.length) return null
  const minX = Math.min(...allPoints.map((point) => point.x))
  const maxX = Math.max(...allPoints.map((point) => point.x))
  const minY = Math.min(...allPoints.map((point) => point.y))
  const maxY = Math.max(...allPoints.map((point) => point.y))
  const yPadding = Math.max(2.5, (maxY - minY) * 0.15 || 2.5)
  const yTicks = Array.from({ length: 4 }, (_, index) => {
    const value = minY - yPadding + ((maxY - minY + yPadding * 2) / 3) * index
    return Number(value.toFixed(1))
  })
  const xTicks = allPoints
    .slice()
    .sort((a, b) => a.x - b.x)
    .filter((point, index, arr) => index === 0 || point.x !== arr[index - 1].x)

  return { allPoints, minX, maxX, minY, maxY, yPadding, yTicks, xTicks }
}

const filterGridStyle = (isMobile) => ({
  display: "grid",
  gap: "12px",
  gridTemplateColumns: isMobile
    ? "1fr"
    : "minmax(0, 1.5fr) minmax(220px, 0.8fr) minmax(220px, 0.8fr) minmax(220px, 0.8fr)",
  marginBottom: "18px",
})

const activityFilterGridStyle = (isMobile) => ({
  display: "grid",
  gap: "8px",
  gridTemplateColumns: isMobile ? "1fr" : "minmax(260px, 360px)",
  marginBottom: "16px",
})

const viewSwitchWrapStyle = (isMobile) => ({
  display: "grid",
  gap: "10px",
  gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(2, minmax(180px, 220px))",
  marginTop: "16px",
  marginBottom: "14px",
})

const primaryViewButtonStyle = (isActive, isMobile) => ({
  minHeight: isMobile ? "54px" : "58px",
  padding: "14px 16px",
  borderRadius: "18px",
  border: isActive ? "1px solid #b91c1c" : "1px solid #cbd5e1",
  background: isActive ? "linear-gradient(135deg, #c62828 0%, #991b1b 100%)" : "#ffffff",
  color: isActive ? "#ffffff" : "#111827",
  fontSize: isMobile ? "15px" : "16px",
  fontWeight: "900",
  cursor: "pointer",
  boxShadow: isActive
    ? "0 14px 28px rgba(198, 40, 40, 0.24)"
    : "0 1px 2px rgba(15, 23, 42, 0.06), 0 10px 24px rgba(15, 23, 42, 0.06)",
})

const contentPanelStyle = {
  marginTop: "4px",
  padding: "16px",
  borderRadius: "22px",
  border: "1px solid #cbd5e1",
  backgroundColor: "#f8fafc",
  boxShadow: "0 2px 6px rgba(15, 23, 42, 0.08), 0 22px 48px rgba(15, 23, 42, 0.12)",
}

const panelHeaderStyle = (isMobile) => ({
  display: "flex",
  alignItems: isMobile ? "stretch" : "flex-start",
  justifyContent: "space-between",
  flexDirection: isMobile ? "column" : "row",
  gap: "12px",
  marginBottom: "14px",
})

const panelTitleStyle = {
  fontSize: "20px",
  fontWeight: "900",
  color: "#111827",
  marginBottom: "4px",
}

const panelTextStyle = {
  fontSize: "14px",
  lineHeight: 1.6,
  color: "#64748b",
}

const statsSummaryGridStyle = (isMobile) => ({
  display: "grid",
  gap: "10px",
  gridTemplateColumns: isMobile ? "repeat(3, minmax(0, 1fr))" : "repeat(3, minmax(0, 1fr))",
  marginBottom: "16px",
})

const statsSummaryCardStyle = {
  padding: "14px 12px",
  borderRadius: "18px",
  border: "1px solid rgba(15, 23, 42, 0.08)",
  backgroundColor: "#ffffff",
  boxShadow: "0 12px 28px rgba(15, 23, 42, 0.04)",
}

const statsSummaryLabelStyle = {
  marginBottom: "6px",
  fontSize: "11px",
  fontWeight: "800",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#6b7280",
}

const statsSummaryValueStyle = {
  fontSize: "28px",
  lineHeight: 1,
  fontWeight: "900",
  color: "#111827",
}

const filterCardStyle = {
  padding: "16px",
  borderRadius: "18px",
  border: "1px solid #e2e8f0",
  backgroundColor: "#fcfdff",
}

const recommendationSectionStyle = {
  display: "grid",
  gap: "12px",
  marginBottom: "18px",
}

const recommendationSectionHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "12px",
}

const recommendationSectionTitleStyle = {
  fontSize: "18px",
  fontWeight: "900",
  color: "#18202b",
  marginBottom: "4px",
}

const recommendationSectionTextStyle = {
  fontSize: "13px",
  lineHeight: 1.5,
  color: "#64748b",
}

const recommendationGridStyle = (isMobile) => ({
  display: "grid",
  gap: "12px",
  gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
})

const recommendationCardStyle = {
  padding: "14px",
  borderRadius: "18px",
  border: "1px solid #e2e8f0",
  backgroundColor: "#ffffff",
  boxShadow: "0 12px 28px rgba(15, 23, 42, 0.04)",
  minWidth: 0,
}

const recommendationCardHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "10px",
  marginBottom: "12px",
}

const recommendationPlayerNameStyle = {
  fontSize: "15px",
  fontWeight: "900",
  color: "#18202b",
}

const recommendationDateStyle = {
  fontSize: "12px",
  fontWeight: "800",
  color: "#991b1b",
  whiteSpace: "nowrap",
}

const recommendationStatsGridStyle = {
  display: "grid",
  gap: "10px",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
}

const recommendationStatBoxStyle = {
  padding: "12px",
  borderRadius: "14px",
  border: "1px solid #eef2f7",
  backgroundColor: "#f8fafc",
  minWidth: 0,
}

const recommendationStatLabelStyle = {
  fontSize: "11px",
  fontWeight: "800",
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "#64748b",
  marginBottom: "6px",
}

const recommendationStatValueStyle = {
  fontSize: "22px",
  lineHeight: 1.1,
  fontWeight: "900",
  color: "#111827",
  marginBottom: "4px",
}

const recommendationStatMetaStyle = {
  fontSize: "12px",
  lineHeight: 1.4,
  color: "#64748b",
}

const recommendationRangesWrapStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
  marginTop: "12px",
}

const recommendationRangeChipStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  padding: "8px 10px",
  borderRadius: "999px",
  border: "1px solid #e5e7eb",
  backgroundColor: "#fff7f7",
  minWidth: 0,
}

const recommendationRangeChipLabelStyle = {
  fontSize: "11px",
  fontWeight: "800",
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "#991b1b",
}

const recommendationRangeChipValueStyle = {
  fontSize: "12px",
  fontWeight: "900",
  color: "#18202b",
}

const recommendationQuickEditRowStyle = (isMobile) => ({
  display: "flex",
  gap: "8px",
  flexDirection: isMobile ? "column" : "row",
  alignItems: isMobile ? "stretch" : "center",
  marginTop: "12px",
})

const recommendationQuickEditHintStyle = {
  marginTop: "12px",
  padding: "10px 12px",
  borderRadius: "12px",
  border: "1px solid #e2e8f0",
  backgroundColor: "#f8fafc",
  fontSize: "13px",
  lineHeight: 1.5,
  color: "#64748b",
}

const filterTitleStyle = {
  fontSize: "14px",
  fontWeight: "900",
  color: "#18202b",
  marginBottom: "10px",
}

const playerDropdownMenuStyle = {
  position: "absolute",
  top: "calc(100% + 8px)",
  left: 0,
  right: 0,
  zIndex: 20,
  padding: "12px",
  borderRadius: "16px",
  border: "1px solid #dbe5ef",
  backgroundColor: "#ffffff",
  boxShadow: "0 16px 30px rgba(24, 32, 43, 0.12)",
}

const playerDropdownActionsStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "8px",
  marginBottom: "10px",
}

const playerDropdownListStyle = {
  display: "grid",
  gap: "8px",
  maxHeight: "220px",
  overflowY: "auto",
}

const playerDropdownItemStyle = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding: "10px 12px",
  borderRadius: "12px",
  border: "1px solid #eef2f7",
  backgroundColor: "#f8fafc",
  color: "#18202b",
  fontSize: "14px",
  fontWeight: "700",
}

const playerChipWrapStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
}

const playerChipStyle = {
  padding: "9px 12px",
  borderRadius: "999px",
  border: "1px solid #dbe5ef",
  backgroundColor: "#ffffff",
  color: "#18202b",
  fontSize: "13px",
  fontWeight: "800",
  cursor: "pointer",
}

const activityListStyle = {
  display: "grid",
  gap: "10px",
  width: "100%",
  minWidth: 0,
  marginBottom: "16px",
}

const activityItemWrapStyle = {
  display: "grid",
  gap: "8px",
  width: "100%",
  minWidth: 0,
}

const activityRowStyle = (isMobile) => ({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  alignItems: "center",
  gap: "10px",
  padding: isMobile ? "12px 14px" : "14px 16px",
  borderRadius: "16px",
  border: "1px solid #e2e8f0",
  backgroundColor: "#ffffff",
  boxShadow: "0 12px 28px rgba(15, 23, 42, 0.04)",
  width: "100%",
  minWidth: 0,
  textAlign: "left",
})

const activityPlayerNameStyle = {
  fontSize: "15px",
  fontWeight: "900",
  color: "#18202b",
  marginBottom: "2px",
}

const activityMetaStyle = {
  fontSize: "12px",
  fontWeight: "700",
  color: "#64748b",
}

const activitySummaryStyle = {
  marginTop: "6px",
  fontSize: "12px",
  lineHeight: 1.45,
  color: "#475569",
  fontWeight: "700",
}

const activityRowAsideStyle = {
  display: "grid",
  justifyItems: "end",
  gap: "8px",
  width: "auto",
  flexShrink: 0,
}

const activityDateStyle = {
  fontSize: "12px",
  fontWeight: "800",
  color: "#991b1b",
  whiteSpace: "nowrap",
}

const activitySelectedHintStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "6px 10px",
  borderRadius: "999px",
  backgroundColor: "#fff1f1",
  border: "1px solid #efc7c7",
  color: "#991b1b",
  fontSize: "11px",
  fontWeight: "900",
  whiteSpace: "nowrap",
}

const activityDetailCardStyle = {
  padding: "14px",
  borderRadius: "18px",
  border: "1px solid #f1d7d7",
  backgroundColor: "#fffdfd",
  boxShadow: "0 14px 30px rgba(24, 32, 43, 0.05)",
}

const activityDetailPanelStyle = {
  padding: "14px",
  borderRadius: "20px",
  border: "1px solid #d7dee7",
  backgroundColor: "#ffffff",
  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06), 0 10px 24px rgba(15, 23, 42, 0.06)",
}

const activityDetailPanelHeaderStyle = {
  marginBottom: "12px",
}

const emptyDetailPanelStyle = {
  padding: "18px 14px",
  borderRadius: "16px",
  border: "1px dashed #cbd5e1",
  backgroundColor: "#f8fafc",
  fontSize: "14px",
  lineHeight: 1.6,
  color: "#64748b",
}

const activityDetailHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "12px",
  marginBottom: "10px",
}

const activityDetailMetaStyle = {
  fontSize: "13px",
  color: "#64748b",
  lineHeight: 1.5,
}

const activityRunningCardStyle = {
  padding: "14px 16px",
  borderRadius: "18px",
  border: "1px solid #dbe5ef",
  backgroundColor: "#ffffff",
  color: "#18202b",
  fontSize: "14px",
  fontWeight: "700",
}

const activityExerciseCardsViewportStyle = {
  width: "100%",
  maxWidth: "100%",
  overflowX: "auto",
  overflowY: "hidden",
  paddingBottom: "4px",
  WebkitOverflowScrolling: "touch",
  scrollSnapType: "x mandatory",
  scrollBehavior: "smooth",
}

const activitySwipeHintStyle = {
  margin: "0 4px 8px",
  fontSize: "12px",
  fontWeight: "800",
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "#64748b",
}

const activityExerciseCardsTrackStyle = {
  display: "flex",
  alignItems: "stretch",
  gap: "12px",
  width: "100%",
}

const activityExerciseCardStyle = {
  flex: "0 0 100%",
  width: "100%",
  minWidth: "100%",
  maxWidth: "100%",
  boxSizing: "border-box",
  padding: "14px",
  borderRadius: "16px",
  border: "1px solid #dbe5ef",
  backgroundColor: "#ffffff",
  overflow: "hidden",
  scrollSnapAlign: "start",
}

const activityExerciseCardTitleStyle = {
  fontSize: "17px",
  fontWeight: "900",
  color: "#18202b",
  marginBottom: "4px",
}

const activityExerciseCardSubStyle = {
  fontSize: "13px",
  color: "#64748b",
  marginBottom: "12px",
}

const activitySetListStyle = {
  display: "grid",
  gap: "10px",
}

const activitySetCardStyle = {
  padding: "12px",
  borderRadius: "16px",
  backgroundColor: "#f8fafc",
  border: "1px solid #e2e8f0",
}

const activitySetTitleStyle = {
  fontSize: "13px",
  fontWeight: "800",
  color: "#18202b",
  marginBottom: "8px",
}

const activitySetMetaGridStyle = {
  display: "grid",
  gap: "8px",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
}

const activitySetMetaItemStyle = {
  display: "grid",
  gap: "4px",
}

const activitySetMetaLabelStyle = {
  fontSize: "11px",
  fontWeight: "800",
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "#64748b",
}

const activitySetMetaValueStyle = {
  fontSize: "14px",
  fontWeight: "800",
  color: "#18202b",
}

const activityPassCommentStyle = {
  marginTop: "12px",
  padding: "12px 14px",
  borderRadius: "16px",
  backgroundColor: "#fff7f7",
  border: "1px solid #f3d0d0",
  color: "#374151",
  fontSize: "14px",
  lineHeight: 1.6,
}

const chartGridStyle = {
  display: "grid",
  gap: "16px",
}

const chartCardStyle = {
  width: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  overflow: "hidden",
  padding: "18px",
  borderRadius: "22px",
  border: "1px solid #dbe5ef",
  backgroundColor: "#ffffff",
  boxShadow: "0 16px 30px rgba(24, 32, 43, 0.05)",
}

const chartHeaderActionsStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
  gap: "10px",
}

const chartTitleStyle = {
  fontSize: "20px",
  fontWeight: "900",
  color: "#18202b",
  marginBottom: "4px",
}

const chartSubtitleStyle = {
  fontSize: "13px",
  color: "#64748b",
}

const legendWrapStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px 14px",
}

const legendItemStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  fontSize: "12px",
  fontWeight: "800",
  color: "#334155",
}

const legendColorStyle = {
  width: "10px",
  height: "10px",
  borderRadius: "999px",
  display: "inline-block",
}

const expandButtonStyle = {
  width: "34px",
  height: "34px",
  border: "1px solid #cbd5e1",
  backgroundColor: "#ffffff",
  color: "#18202b",
  borderRadius: "999px",
  padding: "0",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "22px",
  lineHeight: 1,
  fontWeight: "800",
  cursor: "pointer",
  flexShrink: 0,
}

const srOnlyStyle = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: 0,
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
}

const statGridStyle = (isMobile) => ({
  marginTop: "12px",
  display: "grid",
  gap: "10px",
  gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(180px, 1fr))",
})

const statCardStyle = {
  padding: "12px",
  borderRadius: "16px",
  backgroundColor: "#f8fbff",
  border: "1px solid #e2e8f0",
}

const statPlayerNameStyle = {
  fontSize: "13px",
  fontWeight: "900",
}

const statLineStyle = {
  fontSize: "13px",
  color: "#475569",
  lineHeight: 1.6,
}

const statFootnoteStyle = {
  marginTop: "8px",
  fontSize: "11px",
  color: "#94a3b8",
}

const chartModalBackdropStyle = {
  position: "fixed",
  inset: 0,
  zIndex: 1200,
  backgroundColor: "rgba(15, 23, 42, 0.72)",
  backdropFilter: "blur(4px)",
  padding: "24px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
}

const chartModalCardStyle = {
  width: "min(1200px, 100%)",
  maxHeight: "90vh",
  overflowY: "auto",
  overflowX: "hidden",
  boxSizing: "border-box",
  borderRadius: "28px",
  backgroundColor: "#ffffff",
  border: "1px solid rgba(226, 232, 240, 0.9)",
  boxShadow: "0 24px 80px rgba(15, 23, 42, 0.35)",
  padding: "24px",
}

const chartModalHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "16px",
  marginBottom: "14px",
}

const chartModalLegendStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: "10px 16px",
  marginBottom: "18px",
}

const closeButtonStyle = {
  border: "1px solid #cbd5e1",
  backgroundColor: "#ffffff",
  color: "#18202b",
  borderRadius: "999px",
  padding: "10px 14px",
  fontSize: "13px",
  fontWeight: "900",
  cursor: "pointer",
}

export default StatsPage
const pageWrapStyle = {
  width: "100%",
  minWidth: 0,
  overflowX: "hidden",
  boxSizing: "border-box",
}

const pageHeaderStyle = {
  marginBottom: "14px",
}

const pageHeaderCopyStyle = {
  display: "grid",
  gap: "4px",
}

const pageEyebrowStyle = {
  fontSize: "12px",
  fontWeight: "800",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#991b1b",
}

const introTitleStyle = {
  marginBottom: "2px",
  fontSize: "24px",
  fontWeight: "900",
  color: "#111827",
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
