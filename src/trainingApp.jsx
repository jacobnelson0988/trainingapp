import { useState, useEffect } from "react"
import { supabase } from "./supabase"
import ExerciseBankPage from "./pages/ExerciseBankPage"
import PlayersPage from "./pages/PlayersPage"
import CreatePlayerPage from "./pages/CreatePlayerPage"
import CoachHomePage from "./pages/CoachHomePage"
import PassBuilderPage from "./pages/PassBuilderPage"

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
  const [newPlayerName, setNewPlayerName] = useState("")
  const [newPlayerPassword, setNewPlayerPassword] = useState("")
  const [createdPlayer, setCreatedPlayer] = useState(null)
  const [isCreatingPlayer, setIsCreatingPlayer] = useState(false)
  const [importedPlayers, setImportedPlayers] = useState([])
  const [importFileName, setImportFileName] = useState("")
  const [isParsingImportFile, setIsParsingImportFile] = useState(false)
  const [isImportingPlayers, setIsImportingPlayers] = useState(false)
  const [importResults, setImportResults] = useState([])
  const [coachView, setCoachView] = useState("home")
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [commentDrafts, setCommentDrafts] = useState({})
  const [selectedPlayerAssignedPasses, setSelectedPlayerAssignedPasses] = useState([])
  const [isUpdatingPassAssignments, setIsUpdatingPassAssignments] = useState(false)
  const [assignedWorkoutCodes, setAssignedWorkoutCodes] = useState([])
  const [selectedTemplateCode, setSelectedTemplateCode] = useState("A")
  const [newPassName, setNewPassName] = useState("")
  const [isCreatingPass, setIsCreatingPass] = useState(false)
  const [renamePassName, setRenamePassName] = useState("")
  const [selectedExerciseId, setSelectedExerciseId] = useState("")
  const [isSavingPassExercise, setIsSavingPassExercise] = useState(false)
  const [passExerciseDrafts, setPassExerciseDrafts] = useState({})
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
  const [newExerciseName, setNewExerciseName] = useState("")
  const [newExerciseType, setNewExerciseType] = useState("weight_reps")
  const [newExerciseGuide, setNewExerciseGuide] = useState("")
  const [newExerciseDescription, setNewExerciseDescription] = useState("")
  const [newExerciseMediaUrl, setNewExerciseMediaUrl] = useState("")
  const [newExerciseDefaultRepsMode, setNewExerciseDefaultRepsMode] = useState("fixed")
  const [newExerciseMuscleGroups, setNewExerciseMuscleGroups] = useState([])
  const [editingExerciseId, setEditingExerciseId] = useState(null)
  const [isSavingExercise, setIsSavingExercise] = useState(false)
  const [latestWorkout, setLatestWorkout] = useState({})
  const [latestPassDates, setLatestPassDates] = useState({})
  const [status, setStatus] = useState("")
  const [currentSessionId, setCurrentSessionId] = useState(null)
  const [isWorkoutActive, setIsWorkoutActive] = useState(false)
  const [showPicker, setShowPicker] = useState(false)

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
    if (profile?.role === "coach") {
      loadPlayers()
    }
  }, [profile])

  useEffect(() => {
    if (selectedPlayer) {
      loadPlayerTargets(selectedPlayer.id)
    } else {
      setTargetDrafts({})
      setSelectedPlayerAssignedPasses([])
    }
  }, [selectedPlayer])

  useEffect(() => {
    if (user) {
      loadCurrentUserTargets(user.id, selectedWorkout)
    } else {
      setPlayerTargets({})
      setAssignedWorkoutCodes([])
    }
  }, [user, selectedWorkout])

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

    if (!selectedWorkout || !assignedWorkoutCodes.includes(selectedWorkout)) {
      setSelectedWorkout(assignedWorkoutCodes[0])
    }
  }, [assignedWorkoutCodes, profile?.role, selectedWorkout])

  useEffect(() => {
    if (!selectedTemplateCode || !templatesFromDB.length) return

    const selectedTemplate = templatesFromDB.find((template) => template.code === selectedTemplateCode)
    setRenamePassName(selectedTemplate?.label || "")
  }, [selectedTemplateCode, templatesFromDB])

  useEffect(() => {
    if (!templatesFromDB.length) {
      setSelectedTemplateCode("")
      return
    }

    const hasSelectedTemplate = templatesFromDB.some((template) => template.code === selectedTemplateCode)

    if (!hasSelectedTemplate) {
      setSelectedTemplateCode(templatesFromDB[0].code)
    }
  }, [selectedTemplateCode, templatesFromDB])

  useEffect(() => {
    const fetchExercises = async () => {
      const { data, error } = await supabase
        .from("exercises")
        .select("*")
        .order("name")

      if (error) {
        console.error("Error fetching exercises:", error)
      } else {
        const activeExercises = (data || []).filter((exercise) => exercise.is_active !== false)
        setExercisesFromDB(activeExercises)
        console.log("Exercises from DB:", activeExercises)
      }
    }

    fetchExercises()
  }, [])

  useEffect(() => {
    const fetchTemplates = async () => {
      const { data, error } = await supabase
        .from("workout_templates")
        .select("*")
        .order("code")

      if (error) {
        console.error("Error fetching templates:", error)
      } else {
        setTemplatesFromDB(data || [])
        console.log("Templates from DB:", data)
      }
    }

    fetchTemplates()
  }, [])

  useEffect(() => {
    const fetchTemplateExercises = async () => {
      const { data, error } = await supabase
        .from("workout_template_exercises")
        .select(`
          id,
          sort_order,
          custom_guide,
          target_sets,
          target_reps,
          target_reps_mode,
          workout_template_id,
          exercise_id,
          workout_templates ( code, label ),
          exercises ( name, exercise_type, guide, description, media_url, default_reps_mode )
        `)
        .order("sort_order")

      if (error) {
        console.error("Error fetching template exercises:", error)
      } else {
        setTemplateExercisesFromDB(data || [])
        console.log("Template exercises from DB:", data)
      }
    }

    fetchTemplateExercises()
  }, [])

  useEffect(() => {
    if (!templatesFromDB.length) return

    const mapped = templatesFromDB.reduce((acc, template) => {
      const relatedExercises = templateExercisesFromDB
        .filter((row) => row.workout_templates?.code === template.code)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((row) => ({
          id: row.id,
          exerciseId: row.exercise_id,
          sortOrder: row.sort_order,
          name: row.exercises?.name || "",
          type: row.exercises?.exercise_type || "reps_only",
          baseGuide: row.exercises?.guide || "",
          guide: row.custom_guide ?? row.exercises?.guide ?? "",
          description: row.exercises?.description || "",
          mediaUrl: row.exercises?.media_url || "",
          defaultRepsMode: row.exercises?.default_reps_mode || "fixed",
          targetSets: row.target_sets ?? null,
          targetReps: row.target_reps ?? null,
          targetRepsMode: row.target_reps_mode || "fixed",
          info: [],
        }))

      acc[template.code] = {
        label: template.label,
        warmup: {
          cardio: "Lätt jogg, cykel, roddmaskin eller hopprep i minst 5 min",
          technique: ["MAQ-program – 5 serier", "Kroppsviktsknäböj – 2 x 10 reps"],
        },
        exercises: relatedExercises,
      }

      return acc
    }, {})

    setWorkoutsFromDB(mapped)
  }, [templatesFromDB, templateExercisesFromDB])
  const loadCurrentUserTargets = async (userId, passName) => {
    setIsLoadingPlayerTargets(true)

    const { data, error } = await supabase
      .from("player_exercise_targets")
      .select("pass_name, exercise_name, target_sets, target_reps, target_reps_mode, target_weight, target_comment")
      .eq("player_id", userId)

    if (error) {
      console.error(error)
      setPlayerTargets({})
      setAssignedWorkoutCodes([])
      setIsLoadingPlayerTargets(false)
      return
    }

    const targetsByPass = {}
    const nextAssignedPasses = new Set()

    ;(data || []).forEach((row) => {
      if (!row.pass_name) return

      nextAssignedPasses.add(row.pass_name)

      if (!targetsByPass[row.pass_name]) {
        targetsByPass[row.pass_name] = {}
      }

      targetsByPass[row.pass_name][row.exercise_name] = {
        target_sets: row.target_sets,
        target_reps: row.target_reps,
        target_reps_mode: row.target_reps_mode || "fixed",
        target_weight: row.target_weight,
        target_comment: row.target_comment,
      }
    })

    setAssignedWorkoutCodes(Array.from(nextAssignedPasses))
    setPlayerTargets(targetsByPass[passName] || {})
    setIsLoadingPlayerTargets(false)
  }

  const loadUser = async () => {
    setIsLoadingProfile(true)

    const { data, error } = await supabase.auth.getUser()

    if (error) {
      console.error(error)
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

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, username, role, comment")
      .eq("role", "player")
      .order("full_name", { ascending: true })

    if (profileError) {
      console.error(profileError)
      setIsLoadingPlayers(false)
      return
    }

    const { data: logData, error: logError } = await supabase
      .from("workout_logs")
      .select("user_id, pass_name, created_at, workout_session_id, is_completed")
      .eq("is_completed", true)
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
      setIsLoadingPlayers(false)
      return
    }

    const statsByUser = {}

    ;(logData || []).forEach((log) => {
      if (!statsByUser[log.user_id]) {
        statsByUser[log.user_id] = {
          latestPass: log.pass_name || "-",
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
      }
    })

    setPlayers(enrichedPlayers)
    setCommentDrafts(
      enrichedPlayers.reduce((acc, player) => {
        acc[player.id] = player.comment || ""
        return acc
      }, {})
    )
    setIsLoadingPlayers(false)
  }

  const loadPlayerTargets = async (playerId) => {
    setIsLoadingTargets(true)

    const { data, error } = await supabase
      .from("player_exercise_targets")
      .select("pass_name, exercise_name, target_sets, target_reps, target_reps_mode, target_weight, target_comment")
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

      if (!draftMap[row.pass_name]) {
        draftMap[row.pass_name] = {}
      }

      draftMap[row.pass_name][row.exercise_name] = {
        target_sets: row.target_sets ?? "",
        target_reps: row.target_reps ?? "",
        target_reps_mode: row.target_reps_mode || "fixed",
        target_weight: row.target_weight ?? "",
        target_comment: row.target_comment ?? "",
      }
    })

    setTargetDrafts(draftMap)
    setSelectedPlayerAssignedPasses(Array.from(assignedPasses))
    setIsLoadingTargets(false)
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

    setSelectedWorkout(workoutKey)
    setCurrentSessionId(newSessionId)
    setIsWorkoutActive(true)
    setShowPicker(false)
    setExpandedInfo({})

    const defaultInputs = {}
    workout.exercises.forEach((exercise, index) => {
      defaultInputs[index] = [
        {
          weight: "",
          reps: "",
          seconds: "",
          client_set_id: generateSetId(index, 0),
          workout_session_id: newSessionId,
        },
      ]
    })

    setInputs(defaultInputs)
    setStatus(`${workout.label} startat`)

    await loadLatestWorkoutForPass(workoutKey, user.id)
  }

  const finishWorkout = async () => {
    if (!currentSessionId || !selectedWorkout || !user) return

    const { error } = await supabase
      .from("workout_logs")
      .update({ is_completed: true })
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
    setStatus(`${activeWorkouts[selectedWorkout].label} avslutat`)

    await loadLatestWorkoutForPass(selectedWorkout, user.id)
    await loadLatestData(user.id)
  }

  const handleAddSet = (exerciseIndex) => {
    if (!isWorkoutActive || !currentSessionId || !selectedWorkout) return

    const current = inputs[exerciseIndex] || []

    setInputs({
      ...inputs,
      [exerciseIndex]: [
        ...current,
        {
          weight: "",
          reps: "",
          seconds: "",
          client_set_id: generateSetId(exerciseIndex, current.length),
          workout_session_id: currentSessionId,
        },
      ],
    })
  }

  const handleRemoveSet = (exerciseIndex, setIndex) => {
    const current = inputs[exerciseIndex] || []
    const updated = current.filter((_, index) => index !== setIndex)

    setInputs({
      ...inputs,
      [exerciseIndex]: updated,
    })
  }

  const saveSet = async (exercise, setIndex, set) => {
    if (!user) return

    const { error } = await supabase.from("workout_logs").upsert(
      {
        client_set_id: set.client_set_id,
        user_id: user.id,
        workout_session_id: set.workout_session_id,
        pass_name: selectedWorkout,
        is_completed: false,
        exercise: exercise.name,
        set_number: setIndex + 1,
        weight: set.weight || null,
        reps: set.reps || null,
        seconds: set.seconds || null,
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

  const handleChange = async (exerciseIndex, setIndex, field, value) => {
    if (!isWorkoutActive || !currentSessionId || !selectedWorkout) return

    const current = inputs[exerciseIndex] || []
    const updated = [...current]
    const exercise = activeWorkouts[selectedWorkout].exercises[exerciseIndex]

    updated[setIndex] = {
      ...updated[setIndex],
      [field]: value,
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
      (exercise.type === "weight_reps" && set.weight && set.reps) ||
      (exercise.type === "reps_only" && set.reps) ||
      (exercise.type === "seconds_only" && set.seconds)

    if (isComplete) {
      await saveSet(exercise, setIndex, set)
    }
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
  const handleCreatePlayer = async (e) => {
    e.preventDefault()
    setStatus("")
    setCreatedPlayer(null)

    if (!newPlayerName.trim() || !newPlayerPassword.trim()) {
      setStatus("Fyll i namn och startlösenord")
      return
    }

    setIsCreatingPlayer(true)

    const { data, error } = await supabase.functions.invoke("create-player", {
      body: {
        full_name: newPlayerName.trim(),
        password: newPlayerPassword.trim(),
      },
    })

    if (error) {
      console.error(error)
      setStatus(error.message || "Kunde inte skapa spelare")
      setIsCreatingPlayer(false)
      return
    }

    if (data?.error) {
      setStatus(data.error)
      setIsCreatingPlayer(false)
      return
    }

    setCreatedPlayer(data)
    setStatus("Spelare skapad ✅")
    setNewPlayerName("")
    setNewPlayerPassword("")
    setIsCreatingPlayer(false)
    loadPlayers()
    setCoachView("players")
  }

  const normalizeImportHeader = (value) => {
    return String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "")
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

  const handleImportPlayers = async () => {
    if (!importedPlayers.length) {
      setStatus("Ladda upp en fil först")
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
        body: {
          full_name: player.full_name,
          password: player.password,
        },
      })

      if (error || data?.error) {
        results.push({
          ...player,
          success: false,
          message: data?.error || error?.message || "Kunde inte skapa spelare",
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

        return {
          player_id: selectedPlayer.id,
          pass_name: passName,
          exercise_name: exercise.name,
          target_sets: draft.target_sets === "" ? null : Number(draft.target_sets),
          target_reps:
            draft.target_reps_mode === "max"
              ? null
              : draft.target_reps === ""
              ? null
              : Number(draft.target_reps),
          target_reps_mode: draft.target_reps_mode || "fixed",
          target_weight: draft.target_weight === "" ? null : Number(draft.target_weight),
          target_comment: draft.target_comment || null,
        }
      })
    })

    if (rows.length === 0) {
      setStatus("Tilldela minst ett pass först")
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

  const handleAssignPassToPlayer = async (passName) => {
    if (!selectedPlayer) return

    const exercises = activeWorkouts[passName]?.exercises || []

    if (exercises.length === 0) {
      setStatus("Passet har inga övningar än")
      return
    }

    const rows = exercises.map((exercise) => ({
      player_id: selectedPlayer.id,
      pass_name: passName,
      exercise_name: exercise.name,
      target_sets: null,
      target_reps: null,
      target_reps_mode: exercise.defaultRepsMode || "fixed",
      target_weight: null,
      target_comment: null,
    }))

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
    setIsUpdatingPassAssignments(false)
  }

  const handleAssignAllPassesToPlayer = async () => {
    if (!selectedPlayer) return

    const passRows = Object.entries(activeWorkouts).flatMap(([passName, workout]) =>
      (workout.exercises || []).map((exercise) => ({
        player_id: selectedPlayer.id,
        pass_name: passName,
        exercise_name: exercise.name,
        target_sets:
          targetDrafts[passName]?.[exercise.name]?.target_sets === "" ||
          targetDrafts[passName]?.[exercise.name]?.target_sets == null
            ? null
            : Number(targetDrafts[passName][exercise.name].target_sets),
        target_reps:
          targetDrafts[passName]?.[exercise.name]?.target_reps_mode === "max"
            ? null
            : targetDrafts[passName]?.[exercise.name]?.target_reps === "" ||
              targetDrafts[passName]?.[exercise.name]?.target_reps == null
            ? null
            : Number(targetDrafts[passName][exercise.name].target_reps),
        target_reps_mode:
          targetDrafts[passName]?.[exercise.name]?.target_reps_mode || exercise.defaultRepsMode || "fixed",
        target_weight:
          targetDrafts[passName]?.[exercise.name]?.target_weight === "" ||
          targetDrafts[passName]?.[exercise.name]?.target_weight == null
            ? null
            : Number(targetDrafts[passName][exercise.name].target_weight),
        target_comment: targetDrafts[passName]?.[exercise.name]?.target_comment || null,
      }))
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
    setNewExerciseMuscleGroups([])
    setEditingExerciseId(null)
  }

  const handleStartEditExercise = (exercise) => {
    setNewExerciseName(exercise.name || "")
    setNewExerciseType(exercise.exercise_type || "weight_reps")
    setNewExerciseGuide(exercise.guide || "")
    setNewExerciseDescription(exercise.description || "")
    setNewExerciseMediaUrl(exercise.media_url || "")
    setNewExerciseDefaultRepsMode(exercise.default_reps_mode || "fixed")
    setNewExerciseMuscleGroups(Array.isArray(exercise.muscle_groups) ? exercise.muscle_groups : [])
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

    const payload = {
      name: newExerciseName.trim(),
      exercise_type: newExerciseType,
      guide: newExerciseGuide.trim() || null,
      description: newExerciseDescription.trim() || null,
      media_url: newExerciseMediaUrl.trim() || null,
      default_reps_mode: newExerciseType === "seconds_only" ? "fixed" : newExerciseDefaultRepsMode,
      muscle_groups: newExerciseMuscleGroups,
    }

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
        errorMessage.includes("media_url")

      setStatus(
        missingExerciseColumns
          ? "Kunde inte spara övning. Kör SQL-ändringarna i Supabase först för muscle_groups, description och media_url."
          : `${editingExerciseId ? "Kunde inte uppdatera övning" : "Kunde inte spara övning"}${error.message ? `: ${error.message}` : ""}`
      )
      setIsSavingExercise(false)
      return
    }

    setExercisesFromDB((prev) => {
      const withoutCurrent = prev.filter((exercise) => exercise.id !== data.id)
      return [...withoutCurrent, data].sort((a, b) => a.name.localeCompare(b.name, "sv"))
    })

    resetExerciseForm()
    setStatus(editingExerciseId ? "Övning uppdaterad ✅" : "Övning sparad ✅")
    setIsSavingExercise(false)
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
      return
    }

    const selectedTemplate = templatesFromDB.find((template) => template.code === selectedTemplateCode)
    const selectedExercise = exercisesFromDB.find(
      (exercise) => String(exercise.id) === String(selectedExerciseId)
    )

    if (!selectedTemplate || !selectedExercise) {
      setStatus("Kunde inte hitta pass eller övning")
      return
    }

    const existingRowsForTemplate = templateExercisesFromDB.filter(
      (row) => row.workout_templates?.code === selectedTemplateCode
    )

    const alreadyExists = existingRowsForTemplate.some(
      (row) => String(row.exercise_id) === String(selectedExerciseId)
    )

    if (alreadyExists) {
      setStatus("Övningen finns redan i passet")
      return
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

    const { data, error } = await supabase
      .from("workout_template_exercises")
      .insert(insertPayload)
      .select(`
        id,
        sort_order,
        custom_guide,
        target_sets,
        target_reps,
        target_reps_mode,
        workout_template_id,
        exercise_id,
        workout_templates ( code, label ),
        exercises ( name, exercise_type, guide, description, media_url, default_reps_mode )
      `)
      .single()

    if (error) {
      console.error(error)
      const errorMessage = String(error.message || "").toLowerCase()
      const missingExerciseColumns =
        errorMessage.includes("description") || errorMessage.includes("media_url")

      setStatus(
        missingExerciseColumns
          ? "Kunde inte lägga till övning i passet. Kör SQL-ändringarna i Supabase först för description och media_url."
          : `Kunde inte lägga till övning i passet${error.message ? `: ${error.message}` : ""}`
      )
      setIsSavingPassExercise(false)
      return
    }

    setTemplateExercisesFromDB((prev) => [...prev, data])
    setSelectedExerciseId("")
    setStatus("Övning tillagd i passet ✅")
    setIsSavingPassExercise(false)
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

  const handleSavePassExercises = async () => {
    setStatus("")

    const updates = Object.entries(passExerciseDrafts).map(([rowId, draft]) => {
      const existingRow = templateExercisesFromDB.find((row) => row.id === rowId)
      const baseGuide = existingRow?.exercises?.guide?.trim() || ""
      const nextGuide = draft.guide?.trim() || ""

      return {
        id: rowId,
        custom_guide: nextGuide && nextGuide !== baseGuide ? nextGuide : null,
        target_sets: draft.targetSets === "" ? null : Number(draft.targetSets),
        target_reps:
          draft.targetRepsMode === "max"
            ? null
            : draft.targetReps === ""
            ? null
            : Number(draft.targetReps),
        target_reps_mode: draft.targetRepsMode || "fixed",
      }
    })

    if (updates.length === 0) {
      setStatus("Inga ändringar att spara")
      return
    }

    const { error } = await supabase
      .from("workout_template_exercises")
      .upsert(updates, { onConflict: "id" })

    if (error) {
      console.error(error)
      setStatus("Kunde inte spara passändringar")
      return
    }

    setTemplateExercisesFromDB((prev) =>
      prev.map((row) => {
        const draft = passExerciseDrafts[row.id]

        if (!draft) return row

        const baseGuide = row.exercises?.guide?.trim() || ""
        const nextGuide = draft.guide?.trim() || ""
        const nextCustomGuide = nextGuide && nextGuide !== baseGuide ? nextGuide : null

        return {
          ...row,
          custom_guide:
            draft.guide !== undefined
              ? nextCustomGuide
              : row.custom_guide,
          target_sets:
            draft.targetSets !== undefined
              ? draft.targetSets === ""
                ? null
                : Number(draft.targetSets)
              : row.target_sets,
          target_reps:
            draft.targetRepsMode === "max"
              ? null
              : draft.targetReps !== undefined
              ? draft.targetReps === ""
                ? null
                : Number(draft.targetReps)
              : row.target_reps,
          target_reps_mode: draft.targetRepsMode || row.target_reps_mode || "fixed",
        }
      })
    )

    setStatus("Pass uppdaterat ✅")
    setPassExerciseDrafts({})
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
      return
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
      return
    }

    const alreadyExists = templatesFromDB.some((template) => template.code === normalizedCode)

    if (alreadyExists) {
      setStatus("Det finns redan ett pass med det namnet")
      setIsCreatingPass(false)
      return
    }

    const { data, error } = await supabase
      .from("workout_templates")
      .insert({ code: normalizedCode, label: newPassName.trim() })
      .select()
      .single()

    if (error) {
      console.error(error)
      setStatus("Kunde inte skapa pass")
      setIsCreatingPass(false)
      return
    }

    setTemplatesFromDB((prev) => [...prev, data].sort((a, b) => a.code.localeCompare(b.code)))
    setNewPassName("")
    setSelectedTemplateCode(data.code)
    setStatus("Pass skapat ✅")
    setIsCreatingPass(false)
  }

  const handleDeleteSelectedPass = async () => {
    setStatus("")

    const selectedTemplate = templatesFromDB.find((template) => template.code === selectedTemplateCode)

    if (!selectedTemplate) {
      setStatus("Kunde inte hitta valt pass")
      return
    }

    const confirmed = window.confirm(`Vill du ta bort ${selectedTemplate.label}?`)
    if (!confirmed) return

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
        return
      }
    }

    const { error } = await supabase
      .from("workout_templates")
      .delete()
      .eq("id", selectedTemplate.id)

    if (error) {
      console.error(error)
      setStatus("Kunde inte ta bort passet")
      return
    }

    setTemplateExercisesFromDB((prev) =>
      prev.filter((row) => row.workout_template_id !== selectedTemplate.id)
    )
    setTemplatesFromDB((prev) => prev.filter((template) => template.id !== selectedTemplate.id))
    setPassExerciseDrafts({})
    setSelectedExerciseId("")
    setStatus("Pass borttaget ✅")
  }

  const handleRenamePass = async (templateId, newLabel) => {
    setStatus("")

    if (!newLabel.trim()) {
      setStatus("Ange ett namn")
      return
    }

    const { data, error } = await supabase
      .from("workout_templates")
      .update({ label: newLabel.trim() })
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

    await handleRenamePass(selectedTemplate.id, renamePassName)
  }

  if (!user) {
    return <div style={pageStyle}>Laddar användare...</div>
  }

  if (isLoadingProfile || !profile) {
    return <div style={pageStyle}>Laddar...</div>
  }

  const visibleWorkouts =
    profile?.role === "coach"
      ? activeWorkouts
      : assignedWorkoutCodes.reduce((acc, passCode) => {
          if (activeWorkouts[passCode]) {
            acc[passCode] = activeWorkouts[passCode]
          }
          return acc
        }, {})

  const currentWorkoutTargets = playerTargets || {}
  const sortedVisibleWorkoutEntries = Object.entries(visibleWorkouts).sort(([keyA, workoutA], [keyB, workoutB]) => {
    const daysA = getDaysSinceNumber(latestPassDates[keyA])
    const daysB = getDaysSinceNumber(latestPassDates[keyB])

    if (daysA !== daysB) {
      return daysB - daysA
    }

    return workoutA.label.localeCompare(workoutB.label, "sv")
  })

  const coachTabs = [
    { key: "home", label: "Översikt" },
    { key: "players", label: "Spelare" },
    { key: "exerciseBank", label: "Övningar" },
    { key: "passBuilder", label: "Pass" },
    { key: "createPlayer", label: "Ny spelare" },
  ]

  return (
    <div style={{ ...pageStyle, padding: isMobile ? "14px 12px 36px" : pageStyle.padding }}>
      <div
        style={{
          ...headerStyle,
          flexDirection: isMobile ? "column" : "row",
          alignItems: isMobile ? "stretch" : headerStyle.alignItems,
          marginBottom: isMobile ? "14px" : headerStyle.marginBottom,
        }}
      >
        <div style={{ flex: 1 }}>
          <p style={eyebrowStyle}>{profile?.role === "coach" ? "Coachläge" : "Spelarläge"}</p>
          <h1 style={{ ...appTitleStyle, fontSize: isMobile ? "2rem" : appTitleStyle.fontSize }}>
            Gurra Styrka
          </h1>
          <p style={appSubtitleStyle}>
            Träning för Gustavsbergs Handboll med tydliga pass, enkel navigation och snabba val.
          </p>
        </div>

        <button
          type="button"
          onClick={async () => {
            await supabase.auth.signOut()
            window.location.reload()
          }}
          style={{ ...logoutButtonStyle, width: isMobile ? "100%" : "auto" }}
        >
          Logga ut
        </button>
      </div>

      <div style={{ ...heroCardStyle, padding: isMobile ? "18px 16px" : heroCardStyle.padding, borderRadius: isMobile ? "20px" : heroCardStyle.borderRadius }}>
        <div style={heroBadgeStyle}>Gustavsbergs Handboll</div>
        <div style={heroHeadingStyle}>
          {profile?.role === "coach" ? "Led laget enkelt" : "Hitta ditt pass snabbt"}
        </div>
        <div style={heroTextStyle}>
          {profile?.role === "coach"
            ? "Skapa spelare, bygg pass och sätt mål utan att leta runt i appen."
            : "Starta rätt pass, se dagens mål och jämför med senaste träningen."}
        </div>
      </div>

      {profile?.role === "coach" && (
        <>
          <div
            style={{
              ...coachTabsWrapStyle,
              flexWrap: isMobile ? "nowrap" : coachTabsWrapStyle.flexWrap,
              overflowX: isMobile ? "auto" : "visible",
              paddingBottom: isMobile ? "4px" : 0,
              marginInline: isMobile ? "-2px" : 0,
            }}
          >
            {coachTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setCoachView(tab.key)
                  if (tab.key !== "players") {
                    setSelectedPlayer(null)
                  }
                  if (tab.key !== "exerciseBank") {
                    resetExerciseForm()
                  }
                }}
                style={{
                  ...coachTabButtonStyle,
                  flex: isMobile ? "0 0 auto" : undefined,
                  whiteSpace: "nowrap",
                  ...(coachView === tab.key ? activeCoachTabButtonStyle : {}),
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ ...cardStyle, padding: isMobile ? "16px" : cardStyle.padding, borderRadius: isMobile ? "20px" : cardStyle.borderRadius }}>
            {coachView !== "home" && (
              <div style={{ marginBottom: "16px" }}>
              <button
                type="button"
                style={secondaryButtonStyle}
                onClick={() => {
                  setCoachView("home")
                  setSelectedPlayer(null)
                  resetExerciseForm()
                }}
              >
                ← Tillbaka
              </button>
              </div>
            )}

            {coachView === "home" && (
              <CoachHomePage
                setCoachView={setCoachView}
                setSelectedPlayer={setSelectedPlayer}
                resetExerciseForm={resetExerciseForm}
                mutedTextStyle={mutedTextStyle}
                cardTitleStyle={cardTitleStyle}
                coachNavCardStyle={coachNavCardStyle}
                coachNavTitleStyle={coachNavTitleStyle}
                coachNavTextStyle={coachNavTextStyle}
                isMobile={isMobile}
              />
            )}

            {coachView === "exerciseBank" && (
              <ExerciseBankPage
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
                editingExerciseId={editingExerciseId}
                isSavingExercise={isSavingExercise}
                handleCreateExercise={handleCreateExercise}
                handleStartEditExercise={handleStartEditExercise}
                handleDeleteExercise={handleDeleteExercise}
                resetExerciseForm={resetExerciseForm}
                exercisesFromDB={exercisesFromDB}
                inputStyle={inputStyle}
                buttonStyle={buttonStyle}
                secondaryButtonStyle={secondaryButtonStyle}
                mutedTextStyle={mutedTextStyle}
                cardTitleStyle={cardTitleStyle}
                isMobile={isMobile}
              />
            )}

            {coachView === "passBuilder" && (
              <PassBuilderPage
                activeWorkouts={activeWorkouts}
                selectedTemplateCode={selectedTemplateCode}
                setSelectedTemplateCode={setSelectedTemplateCode}
                newPassName={newPassName}
                setNewPassName={setNewPassName}
                handleCreatePass={handleCreatePass}
                isCreatingPass={isCreatingPass}
                renamePassName={renamePassName}
                setRenamePassName={setRenamePassName}
                handleRenamePass={handleRenameSelectedPass}
                exercisesFromDB={exercisesFromDB}
                selectedExerciseId={selectedExerciseId}
                setSelectedExerciseId={setSelectedExerciseId}
                handleAddExerciseToPass={handleAddExerciseToPass}
                isSavingPassExercise={isSavingPassExercise}
                passExerciseDrafts={passExerciseDrafts}
                handlePassExerciseDraftChange={handlePassExerciseDraftChange}
                handleSavePassExercises={handleSavePassExercises}
                handleRemoveExerciseFromPass={handleRemoveExerciseFromPass}
                handleMoveExerciseInPass={handleMoveExerciseInPass}
                handleDeletePass={handleDeleteSelectedPass}
                cardTitleStyle={cardTitleStyle}
                secondaryButtonStyle={secondaryButtonStyle}
                mutedTextStyle={mutedTextStyle}
                inputStyle={inputStyle}
                buttonStyle={buttonStyle}
                isMobile={isMobile}
              />
            )}

            {coachView === "createPlayer" && (
              <CreatePlayerPage
                newPlayerName={newPlayerName}
                setNewPlayerName={setNewPlayerName}
                newPlayerPassword={newPlayerPassword}
                setNewPlayerPassword={setNewPlayerPassword}
                handleCreatePlayer={handleCreatePlayer}
                isCreatingPlayer={isCreatingPlayer}
                createdPlayer={createdPlayer}
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
                isLoadingPlayers={isLoadingPlayers}
                players={players}
                selectedPlayer={selectedPlayer}
                setSelectedPlayer={setSelectedPlayer}
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
                handleAssignPassToPlayer={handleAssignPassToPlayer}
                handleUnassignPassFromPlayer={handleUnassignPassFromPlayer}
                handleAssignAllPassesToPlayer={handleAssignAllPassesToPlayer}
                handleClearAssignedPassesFromPlayer={handleClearAssignedPassesFromPlayer}
                isUpdatingPassAssignments={isUpdatingPassAssignments}
                isMobile={isMobile}
              />
            )}
          </div>
        </>
      )}

      {profile?.role === "player" && (
        <div
          style={{
            ...workoutActionSectionStyle,
            alignItems: isMobile ? "stretch" : "flex-start",
          }}
        >
          {!isWorkoutActive && (
            <>
              <div style={{ marginBottom: "4px" }}>
                <h2 style={{ ...sectionTitleStyle, fontSize: isMobile ? "24px" : "28px", marginBottom: "8px" }}>
                  Dina pass
                </h2>
                <p style={mutedTextStyle}>
                  Välj ett pass för att se när du körde det senast och starta direkt.
                </p>
              </div>

              {Object.keys(visibleWorkouts).length === 0 ? (
                <p style={mutedTextStyle}>
                  Inga pass är tilldelade ännu. Be en tränare lägga till pass åt dig.
                </p>
              ) : (
                <div style={pickerGridStyle}>
                  {sortedVisibleWorkoutEntries.map(([key, workout], index) => {
                    const isSelected = selectedWorkout === key
                    const passStatus = getPassStatus(latestPassDates[key])
                    const isRecommended = index === 0 && Object.keys(visibleWorkouts).length > 1

                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          setSelectedWorkout(key)
                          setShowPicker(false)
                        }}
                        style={{
                          ...pickerButtonStyle,
                          border: isSelected ? "2px solid #c62828" : pickerButtonStyle.border,
                          background: isSelected
                            ? "linear-gradient(180deg, rgba(255,245,245,1), rgba(255,250,250,0.98))"
                            : pickerButtonStyle.background,
                        }}
                      >
                        <div
                          style={{
                            display: "inline-flex",
                            marginBottom: "10px",
                            padding: "6px 10px",
                            borderRadius: "999px",
                            backgroundColor: passStatus.backgroundColor,
                            color: passStatus.color,
                            fontSize: "12px",
                            fontWeight: "800",
                          }}
                        >
                          {passStatus.label}
                        </div>
                        {isRecommended && (
                          <div
                            style={{
                              display: "inline-flex",
                              marginLeft: "8px",
                              marginBottom: "10px",
                              padding: "6px 10px",
                              borderRadius: "999px",
                              backgroundColor: "#18202b",
                              color: "#ffffff",
                              fontSize: "12px",
                              fontWeight: "800",
                            }}
                          >
                            Rekommenderat nu
                          </div>
                        )}
                        <div style={pickerTitleStyle}>{workout.label}</div>
                        <div style={pickerSubtitleStyle}>
                          Senast kört: {formatDate(latestPassDates[key])}
                        </div>
                        <div style={{ ...pickerSubtitleStyle, marginTop: "4px" }}>
                          {formatDaysSince(latestPassDates[key])}
                        </div>
                        <div style={{ ...pickerSubtitleStyle, marginTop: "8px", color: "#18202b", fontWeight: "700" }}>
                          {isSelected ? "Valt pass" : "Tryck för att välja"}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}

              {selectedWorkout && visibleWorkouts[selectedWorkout] && (
                <div
                  style={{
                    width: "100%",
                    marginTop: "8px",
                    padding: isMobile ? "16px" : "18px",
                    borderRadius: "18px",
                    border: "1px solid #ecdede",
                    backgroundColor: "#fffdfd",
                  }}
                >
                  <div style={{ fontSize: "14px", color: "#991b1b", fontWeight: "800", marginBottom: "6px" }}>
                    Valt pass
                  </div>
                  <div style={{ fontSize: isMobile ? "20px" : "22px", color: "#18202b", fontWeight: "900", marginBottom: "6px" }}>
                    {visibleWorkouts[selectedWorkout].label}
                  </div>
                  <div style={{ ...mutedTextStyle, marginBottom: "12px" }}>
                    Senast kört: {formatDate(latestPassDates[selectedWorkout])} • {formatDaysSince(latestPassDates[selectedWorkout])}
                  </div>
                  <button
                    onClick={() => startWorkout(selectedWorkout)}
                    style={{ ...buttonStyle, width: isMobile ? "100%" : "auto" }}
                  >
                    Starta {visibleWorkouts[selectedWorkout].label}
                  </button>
                </div>
              )}
            </>
          )}

          {isWorkoutActive && (
            <button onClick={finishWorkout} style={{ ...buttonStyle, width: isMobile ? "100%" : "auto" }}>
              Avsluta pass
            </button>
          )}
        </div>
      )}

      {status && <p style={statusStyle}>{status}</p>}

      {selectedWorkout && (
        <>
          <h2 style={sectionTitleStyle}>{visibleWorkouts[selectedWorkout]?.label}</h2>

          <div style={cardStyle}>
            <h3 style={cardTitleStyle}>Uppvärmning</h3>

            <div style={{ marginBottom: 14 }}>
              <p style={subheadingStyle}>Pulshöjande aktivitet</p>
              <p style={mutedTextStyle}>
                {visibleWorkouts[selectedWorkout]?.warmup.cardio}
              </p>
            </div>

            <div>
              <p style={subheadingStyle}>Teknikuppvärmning</p>
              <div style={mutedTextStyle}>
                {visibleWorkouts[selectedWorkout]?.warmup.technique.map((item, index) => (
                  <div key={index}>{index + 1}. {item}</div>
                ))}
              </div>
            </div>
          </div>

          {visibleWorkouts[selectedWorkout]?.exercises.map((exercise, i) => {
            const totalExercises = visibleWorkouts[selectedWorkout].exercises.length
            const isInfoExpanded = !!expandedInfo[exercise.name]
            const latestExerciseSets = latestWorkout[exercise.name] || []
            const latestExerciseTopSet = latestExerciseSets[latestExerciseSets.length - 1]
            const latestExerciseDate = latestExerciseSets[0]?.created_at
            const currentTarget = currentWorkoutTargets[exercise.name]
            const hasExerciseDetails = !!(exercise.description || exercise.guide || exercise.mediaUrl)

            return (
              <div key={i} style={cardStyle}>
                <div style={exerciseProgressStyle}>
                  Övning {i + 1} / {totalExercises}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setExpandedInfo((prev) => ({
                      ...prev,
                      [exercise.name]: !prev[exercise.name],
                    }))
                  }
                  style={{
                    ...exerciseHeaderButtonStyle,
                    marginBottom: hasExerciseDetails && isInfoExpanded ? "14px" : "10px",
                    cursor: hasExerciseDetails ? "pointer" : "default",
                  }}
                >
                  <div>
                    <h3 style={{ ...cardTitleStyle, marginBottom: "4px" }}>{exercise.name}</h3>
                    <div style={exerciseHeaderHintStyle}>
                      {hasExerciseDetails
                        ? isInfoExpanded
                          ? "Dölj beskrivning och video"
                          : "Tryck för att se beskrivning och video"
                        : "Ingen extra information tillagd ännu"}
                    </div>
                  </div>
                  {hasExerciseDetails && (
                    <div style={exerciseHeaderIconStyle}>{isInfoExpanded ? "−" : "+"}</div>
                  )}
                </button>

                {hasExerciseDetails && isInfoExpanded && (
                  <div style={exerciseDetailsPanelStyle}>
                    {exercise.description && (
                      <p style={exerciseDescriptionStyle}>{exercise.description}</p>
                    )}

                    {exercise.guide && (
                      <div style={{ marginTop: exercise.description ? "10px" : 0 }}>
                        <div style={exerciseDetailsLabelStyle}>Så gör du</div>
                        <p style={guideStyle}>{exercise.guide}</p>
                      </div>
                    )}

                    {exercise.mediaUrl && (
                      <div style={{ ...exerciseMediaWrapStyle, marginTop: exercise.description || exercise.guide ? "12px" : 0 }}>
                        <div style={exerciseDetailsLabelStyle}>Video eller exempel</div>
                        {isVideoUrl(exercise.mediaUrl) ? (
                          <video
                            src={exercise.mediaUrl}
                            controls
                            playsInline
                            style={exerciseMediaStyle}
                          />
                        ) : (
                          <img
                            src={exercise.mediaUrl}
                            alt={`${exercise.name} demo`}
                            style={exerciseMediaStyle}
                          />
                        )}
                      </div>
                    )}
                  </div>
                )}

                {latestExerciseTopSet && (
                  <div
                    style={{
                      marginBottom: "14px",
                      padding: "12px 14px",
                      borderRadius: "16px",
                      backgroundColor: "#fff8f8",
                      border: "1px solid #f2dede",
                    }}
                  >
                    <div style={{ fontSize: "13px", fontWeight: "800", color: "#991b1b", marginBottom: "6px" }}>
                      Senast gjorde du
                    </div>
                    <div style={{ fontSize: "16px", fontWeight: "900", color: "#18202b" }}>
                      {formatLatestSetValue(exercise.type, latestExerciseTopSet)}
                    </div>
                    <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>
                      Set {latestExerciseTopSet.set_number} i senaste passet
                    </div>
                    {latestExerciseDate && (
                      <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>
                        Senaste pass: {formatDate(latestExerciseDate)}
                      </div>
                    )}
                    {currentTarget && (
                      <div
                        style={{
                          marginTop: "10px",
                          paddingTop: "10px",
                          borderTop: "1px solid #f3d5d5",
                          display: "grid",
                          gap: "4px",
                        }}
                      >
                        <div style={{ fontSize: "12px", color: "#6b7280", fontWeight: "800" }}>
                          Jämför med dagens mål
                        </div>
                        <div style={{ fontSize: "14px", color: "#18202b", fontWeight: "700" }}>
                          {currentTarget.target_sets ?? "-"} set •{" "}
                          {exercise.type === "seconds_only"
                            ? `${currentTarget.target_reps ?? "-"} sek`
                            : currentTarget.target_reps_mode === "max"
                            ? "max reps"
                            : `${currentTarget.target_reps ?? "-"} reps`}
                          {exercise.type === "weight_reps" && currentTarget.target_weight != null
                            ? ` • ${currentTarget.target_weight} kg`
                            : ""}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {!isLoadingPlayerTargets && (
                  <div style={targetBoxStyle}>
                    <div style={targetBoxTitleStyle}>Dagens mål</div>

                    {currentTarget ? (
                      <>
                        <div style={targetRowStyle}>
                          <span style={targetLabelStyle}>Set</span>
                          <span style={targetValueStyle}>{currentTarget.target_sets ?? "-"}</span>
                        </div>

                        {exercise.type === "seconds_only" ? (
                          <div style={targetRowStyle}>
                            <span style={targetLabelStyle}>Tid</span>
                            <span style={targetValueStyle}>{currentTarget.target_reps ?? "-"} sek</span>
                          </div>
                        ) : (
                          <div style={targetRowStyle}>
                            <span style={targetLabelStyle}>Reps</span>
                            <span style={targetValueStyle}>
                              {currentTarget.target_reps_mode === "max"
                                ? "max"
                                : (currentTarget.target_reps ?? "-")}
                            </span>
                          </div>
                        )}

                        {exercise.type === "weight_reps" && (
                          <div style={targetRowStyle}>
                            <span style={targetLabelStyle}>Vikt</span>
                            <span style={targetValueStyle}>
                              {currentTarget.target_weight != null
                                ? `${currentTarget.target_weight} kg`
                                : "-"}
                            </span>
                          </div>
                        )}

                        {currentTarget.target_comment && (
                          <div style={{ ...targetCommentStyle, marginTop: "8px" }}>
                            <strong>Kommentar:</strong> {currentTarget.target_comment}
                          </div>
                        )}
                      </>
                    ) : (
                      <div style={emptyTargetStyle}>Inget mål satt</div>
                    )}
                  </div>
                )}

                {isWorkoutActive &&
                  (inputs[i] || []).map((set, j) => (
                    <div key={set.client_set_id || j} style={activeSetCardStyle}>
                      <div style={setLabelStyle}>Set {j + 1}</div>

                      <div
                        style={{
                          ...setInputsRowStyle,
                          flexDirection: isMobile ? "column" : "row",
                          alignItems: isMobile ? "stretch" : "center",
                        }}
                      >
                        {exercise.type === "weight_reps" && (
                          <>
                            <input
                              placeholder={`Vikt (${latestWorkout[exercise.name]?.slice(-1)[0]?.weight ?? ""})`}
                              value={set.weight || ""}
                              onChange={(e) =>
                                handleChange(i, j, "weight", e.target.value)
                              }
                              style={{ ...inputStyle, width: isMobile ? "100%" : undefined }}
                            />
                            <input
                              placeholder="Reps"
                              value={set.reps || ""}
                              onChange={(e) =>
                                handleChange(i, j, "reps", e.target.value)
                              }
                              style={{ ...inputStyle, width: isMobile ? "100%" : undefined }}
                            />
                          </>
                        )}

                        {exercise.type === "reps_only" && (
                          <input
                            placeholder="Reps"
                            value={set.reps || ""}
                            onChange={(e) =>
                              handleChange(i, j, "reps", e.target.value)
                            }
                            style={{ ...inputStyle, width: isMobile ? "100%" : undefined }}
                          />
                        )}

                        {exercise.type === "seconds_only" && (
                          <input
                            placeholder="Sekunder"
                            value={set.seconds || ""}
                            onChange={(e) =>
                              handleChange(i, j, "seconds", e.target.value)
                            }
                            style={{ ...inputStyle, width: isMobile ? "100%" : undefined }}
                          />
                        )}

                        <button
                          onClick={() => handleRemoveSet(i, j)}
                          style={{ ...removeButtonStyle, width: isMobile ? "100%" : "auto" }}
                        >
                          Ta bort
                        </button>
                      </div>
                    </div>
                  ))}

                {isWorkoutActive && (
                  <button
                    onClick={() => handleAddSet(i)}
                    style={{ ...secondaryButtonStyle, width: isMobile ? "100%" : "auto" }}
                  >
                    + Lägg till set
                  </button>
                )}

                {latestWorkout[exercise.name]?.length > 0 && (
                  <div style={latestBoxStyle}>
                    <div style={latestBoxTitleStyle}>Senaste träningspass</div>

                    {latestWorkout[exercise.name].map((set) => (
                      <div key={set.id} style={latestRowStyle}>
                        Set {set.set_number} –{" "}
                        {exercise.type === "weight_reps"
                          ? `${set.weight} x ${set.reps}`
                          : exercise.type === "reps_only"
                          ? `${set.reps} reps`
                          : `${set.seconds} sek`}
                      </div>
                    ))}
                  </div>
                )}

                {exercise.info.length > 0 && (
                  <div style={infoBoxStyle}>
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedInfo((prev) => ({
                          ...prev,
                          [exercise.name]: !prev[exercise.name],
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
        </>
      )}
    </div>
  )
}

const pageStyle = {
  padding: "20px 16px 48px",
  maxWidth: "980px",
  margin: "0 auto",
  minHeight: "100vh",
  fontFamily: "Roboto, sans-serif",
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

const logoutButtonStyle = {
  padding: "12px 16px",
  borderRadius: "16px",
  border: "1px solid #f0d4d4",
  backgroundColor: "#ffffff",
  color: "#18202b",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: "800",
  whiteSpace: "nowrap",
  boxShadow: "0 10px 26px rgba(24, 32, 43, 0.08)",
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
  border: "1px solid #f1d7d7",
  backgroundColor: "rgba(255,255,255,0.92)",
  color: "#18202b",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: "800",
  boxShadow: "0 8px 18px rgba(24, 32, 43, 0.06)",
}

const activeCoachTabButtonStyle = {
  background: "linear-gradient(135deg, #c62828 0%, #991b1b 100%)",
  color: "#ffffff",
  borderColor: "#b91c1c",
  boxShadow: "0 16px 28px rgba(198, 40, 40, 0.24)",
}

const workoutActionSectionStyle = {
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
  marginBottom: "20px",
  padding: "20px",
  border: "1px solid #f0dcdc",
  borderRadius: "24px",
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(255,249,249,0.96))",
  boxShadow: "0 18px 40px rgba(24, 32, 43, 0.08)",
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
  backgroundColor: "#fff4f4",
  color: "#991b1b",
  fontSize: "22px",
  fontWeight: "700",
  flexShrink: 0,
}

const exerciseDetailsPanelStyle = {
  marginBottom: "14px",
  padding: "14px",
  borderRadius: "16px",
  border: "1px solid #ece5e5",
  backgroundColor: "#fffdfd",
}

const exerciseDetailsLabelStyle = {
  marginBottom: "6px",
  fontSize: "12px",
  color: "#991b1b",
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
  backgroundColor: "#fff1f1",
  color: "#991b1b",
  fontSize: "12px",
  fontWeight: "800",
}

const targetBoxStyle = {
  backgroundColor: "#fff3f3",
  border: "1px solid #f5caca",
  borderRadius: "18px",
  padding: "14px 16px",
  marginBottom: "14px",
}

const targetBoxTitleStyle = {
  fontSize: "16px",
  fontWeight: "900",
  color: "#991b1b",
  marginBottom: "10px",
}

const targetRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  marginBottom: "6px",
  fontSize: "14px",
}

const targetLabelStyle = {
  color: "#7f1d1d",
  fontWeight: "700",
}

const targetValueStyle = {
  color: "#18202b",
  fontWeight: "800",
}

const targetCommentStyle = {
  fontSize: "14px",
  color: "#7f1d1d",
  lineHeight: 1.5,
}

const emptyTargetStyle = {
  fontSize: "14px",
  color: "#9ca3af",
  fontStyle: "italic",
}

const latestBoxStyle = {
  backgroundColor: "#fffafa",
  border: "1px solid #efe2e2",
  borderRadius: "16px",
  padding: "10px 12px",
  marginBottom: "12px",
}

const latestBoxTitleStyle = {
  fontSize: "13px",
  fontWeight: "800",
  color: "#566173",
  marginBottom: "6px",
}

const latestRowStyle = {
  fontSize: "13px",
  color: "#334155",
  lineHeight: 1.6,
}

const infoBoxStyle = {
  backgroundColor: "#fffdfd",
  border: "1px solid #efe4e4",
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
  backgroundColor: "#fffdfd",
  border: "1px solid #efe2e2",
}


const setLabelStyle = {
  fontSize: "13px",
  fontWeight: "800",
  color: "#566173",
  marginBottom: "8px",
}

const setInputsRowStyle = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
}

const inputStyle = {
  padding: "12px 14px",
  borderRadius: "14px",
  border: "1px solid #e9dada",
  fontSize: "14px",
  minWidth: "120px",
  backgroundColor: "#fffdfd",
  color: "#18202b",
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
  border: "1px solid #ecd6d6",
  backgroundColor: "#ffffff",
  color: "#18202b",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: "800",
}

const removeButtonStyle = {
  padding: "10px 12px",
  borderRadius: "12px",
  border: "1px solid #ecd6d6",
  backgroundColor: "#ffffff",
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

const pickerButtonStyle = {
  padding: "18px",
  borderRadius: "18px",
  border: "1px solid #eddede",
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(255,247,247,0.96))",
  textAlign: "left",
  cursor: "pointer",
  boxShadow: "0 14px 28px rgba(24, 32, 43, 0.06)",
}

const pickerTitleStyle = {
  fontWeight: "900",
  fontSize: "18px",
  color: "#18202b",
}

const pickerSubtitleStyle = {
  fontSize: "13px",
  color: "#566173",
  marginTop: "4px",
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
  border: "1px solid #f0dcdc",
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(255,249,249,0.96))",
  textAlign: "left",
  cursor: "pointer",
  boxShadow: "0 14px 28px rgba(24, 32, 43, 0.06)",
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

export default TrainingApp
