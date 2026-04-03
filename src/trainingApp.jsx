import { useState, useEffect } from "react"
import { supabase } from "./supabase"
import ExerciseBankPage from "./pages/ExerciseBankPage"
import PlayersPage from "./pages/PlayersPage"
import CreatePlayerPage from "./pages/CreatePlayerPage"
import CoachHomePage from "./pages/CoachHomePage"

function TrainingApp() {
  const workouts = {
    A: {
      label: "Pass A",
      warmup: {
        cardio: "Lätt jogg, cykel, roddmaskin eller hopprep i minst 5 min",
        technique: ["MAQ-program – 5 serier", "Kroppsviktsknäböj – 2 x 10 reps"],
      },
      exercises: [
        {
          name: "Knäböj",
          type: "weight_reps",
          guide: "4 set x 6–10 reps",
          info: ["Bra djup", "Stabil bål", "Teknik före belastning", "Vila: 1,5–2 minuter"],
        },
        {
          name: "Stående rodd",
          type: "weight_reps",
          guide: "4 set x 6–10 reps",
          info: ["Dra armbågar bakåt", "Stabil bål", "Vila: 1,5–2 minuter"],
        },
        {
          name: "Chins",
          type: "reps_only",
          guide: "3 set x max antal",
          defaultRepsMode: "max",
          info: ["Alternativ: assisterade chins", "Alternativ: excentriska chins", "Alternativ: scapula pull-ups"],
        },
        {
          name: "Draken",
          type: "reps_only",
          guide: "3 set x 8 per ben",
          defaultRepsMode: "fixed",
          info: ["Balans", "Höftkontroll", "Långsam och kontrollerad rörelse"],
        },
        {
          name: "Planka med rotation",
          type: "seconds_only",
          guide: "3 set x 20–30 sek",
          info: [],
        },
      ],
    },
    B: {
      label: "Pass B",
      warmup: {
        cardio: "Lätt jogg, cykel, roddmaskin eller hopprep i minst 5 min",
        technique: ["MAQ-program – 5 serier", "Kroppsviktsknäböj – 2 x 10 reps"],
      },
      exercises: [
        {
          name: "Frontböj",
          type: "weight_reps",
          guide: "4 set x 6–10 reps",
          info: ["Bra djup", "Stabil bål", "Teknik före belastning", "Vila: 1,5–2 minuter"],
        },
        {
          name: "Militärpress",
          type: "weight_reps",
          guide: "4 set x 6–10 reps",
          info: ["Stabil bål", "Ett ben framåt", "Pressa uppåt och lite framåt", "Kontrollerad rörelse", "Vila: 1,5–2 minuter"],
        },
        {
          name: "Dips",
          type: "reps_only",
          guide: "3 set x max antal",
          defaultRepsMode: "max",
          info: ["Alternativ: assisterade dips med gummiband/maskin", "Alternativ: bänk-dips"],
        },
        {
          name: "Russian twist",
          type: "weight_reps",
          guide: "3 set x 20",
          defaultRepsMode: "fixed",
          info: ["Kontrollerad rotation", "Stabil i bålen", "Jobba lugnt och tekniskt"],
        },
        {
          name: "Sidoplanka",
          type: "seconds_only",
          guide: "3 set x 20–30 sek per sida",
          info: ["Extra utmaning: lyft armar och ben på övre sidan"],
        },
      ],
    },
    C: {
      label: "Pass C",
      warmup: {
        cardio: "Lätt jogg, cykel, roddmaskin eller hopprep i minst 5 min",
        technique: ["MAQ-program – 5 serier", "Kroppsviktsknäböj – 2 x 10 reps"],
      },
      exercises: [
        {
          name: "Marklyft",
          type: "weight_reps",
          guide: "4 set x 6–10 reps",
          info: ["Rak och stabil rygg", "Tryck genom benen", "Kontrollerad rörelse", "Vila: 1,5–2 minuter"],
        },
        {
          name: "Stående axelpress med hantel",
          type: "weight_reps",
          guide: "4 set x 6–10 reps",
          info: ["Stabil bål", "Pressa rakt upp", "Kontrollerad rörelse", "Vila: 1,5–2 minuter"],
        },
        {
          name: "Deadbugs",
          type: "reps_only",
          guide: "3 set x 20",
          defaultRepsMode: "fixed",
          info: ["Stabil i bålen", "Långsamma rörelser", "Rör arm och ben samtidigt diagonalt"],
        },
        {
          name: "Bålkontroll diagonal rotation",
          type: "reps_only",
          guide: "3 set x 10 per sida",
          defaultRepsMode: "fixed",
          info: ["Stabil i bålen", "Full rotation"],
        },
        {
          name: "Klättrande planka",
          type: "seconds_only",
          guide: "3 set x 20–30 sek",
          info: ["Stabil i bålen"],
        },
      ],
    },
  }

  const [user, setUser] = useState(null)
  const [workoutsFromDB, setWorkoutsFromDB] = useState({})

  const activeWorkouts = Object.keys(workoutsFromDB).length > 0 ? workoutsFromDB : workouts
  const [profile, setProfile] = useState(null)
  const [players, setPlayers] = useState([])
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(false)
  const [newPlayerName, setNewPlayerName] = useState("")
  const [newPlayerPassword, setNewPlayerPassword] = useState("")
  const [createdPlayer, setCreatedPlayer] = useState(null)
  const [isCreatingPlayer, setIsCreatingPlayer] = useState(false)
  const [coachView, setCoachView] = useState("home")
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [commentDrafts, setCommentDrafts] = useState({})
  const [targetPassName, setTargetPassName] = useState("A")
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
  const [newExerciseDefaultRepsMode, setNewExerciseDefaultRepsMode] = useState("fixed")
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
      loadPlayerTargets(selectedPlayer.id, targetPassName)
    } else {
      setTargetDrafts({})
    }
  }, [selectedPlayer, targetPassName])

  useEffect(() => {
    if (user && selectedWorkout) {
      loadCurrentUserTargets(user.id, selectedWorkout)
    } else {
      setPlayerTargets({})
    }
  }, [user, selectedWorkout])

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
          workout_template_id,
          exercise_id,
          workout_templates ( code, label ),
          exercises ( name, exercise_type, guide, default_reps_mode )
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
    if (!templatesFromDB.length || !templateExercisesFromDB.length) return

    const mapped = templatesFromDB.reduce((acc, template) => {
      const relatedExercises = templateExercisesFromDB
        .filter((row) => row.workout_templates?.code === template.code)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((row) => ({
          name: row.exercises?.name || "",
          type: row.exercises?.exercise_type || "reps_only",
          guide: row.custom_guide || "",
          defaultRepsMode: row.exercises?.default_reps_mode || "fixed",
          info: [],
        }))

      acc[template.code] = {
        label: template.label,
        warmup: workouts[template.code]?.warmup || {
          cardio: "Lätt jogg, cykel, roddmaskin eller hopprep i minst 5 min",
          technique: ["MAQ-program – 5 serier", "Kroppsviktsknäböj – 2 x 10 reps"],
        },
        exercises:
          relatedExercises.length > 0
            ? relatedExercises
            : workouts[template.code]?.exercises || [],
      }

      return acc
    }, {})

    setWorkoutsFromDB(mapped)
  }, [templatesFromDB, templateExercisesFromDB])
  const loadCurrentUserTargets = async (userId, passName) => {
    setIsLoadingPlayerTargets(true)

    const { data, error } = await supabase
      .from("player_exercise_targets")
      .select("exercise_name, target_sets, target_reps, target_reps_mode, target_weight, target_comment")
      .eq("player_id", userId)
      .eq("pass_name", passName)

    if (error) {
      console.error(error)
      setPlayerTargets({})
      setIsLoadingPlayerTargets(false)
      return
    }

    const targetMap = {}

    ;(data || []).forEach((row) => {
      targetMap[row.exercise_name] = {
        target_sets: row.target_sets,
        target_reps: row.target_reps,
        target_reps_mode: row.target_reps_mode || "fixed",
        target_weight: row.target_weight,
        target_comment: row.target_comment,
      }
    })

    setPlayerTargets(targetMap)
    setIsLoadingPlayerTargets(false)
  }

  const loadUser = async () => {
    const { data, error } = await supabase.auth.getUser()

    if (error) {
      console.error(error)
      return
    }

    setUser(data.user)

    if (data.user) {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.user.id)
        .single()

      if (profileError) {
        console.error(profileError)
        return
      }

      setProfile(profileData)
    }
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

  const loadPlayerTargets = async (playerId, passName) => {
    setIsLoadingTargets(true)

    const { data, error } = await supabase
      .from("player_exercise_targets")
      .select("exercise_name, target_sets, target_reps, target_reps_mode, target_weight, target_comment")
      .eq("player_id", playerId)
      .eq("pass_name", passName)

    if (error) {
      console.error(error)
      setTargetDrafts({})
      setIsLoadingTargets(false)
      return
    }

    const draftMap = {}

    ;(data || []).forEach((row) => {
      draftMap[row.exercise_name] = {
        target_sets: row.target_sets ?? "",
        target_reps: row.target_reps ?? "",
        target_reps_mode: row.target_reps_mode || "fixed",
        target_weight: row.target_weight ?? "",
        target_comment: row.target_comment ?? "",
      }
    })

    setTargetDrafts(draftMap)
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

  const handleTargetDraftChange = (exerciseName, field, value) => {
    setTargetDrafts((prev) => ({
      ...prev,
      [exerciseName]: {
        ...(prev[exerciseName] || {}),
        [field]: value,
      },
    }))
  }

  const handleSaveTargets = async () => {
    if (!selectedPlayer) return

    setIsSavingTargets(true)

    const exercises = activeWorkouts[targetPassName].exercises

    const rows = exercises.map((exercise) => {
      const draft = targetDrafts[exercise.name] || {}

      return {
        player_id: selectedPlayer.id,
        pass_name: targetPassName,
        exercise_name: exercise.name,
        target_sets: draft.target_sets === "" ? null : Number(draft.target_sets),
        target_reps: draft.target_reps_mode === "max" ? null : (draft.target_reps === "" ? null : Number(draft.target_reps)),
        target_reps_mode: draft.target_reps_mode || "fixed",
        target_weight: draft.target_weight === "" ? null : Number(draft.target_weight),
        target_comment: draft.target_comment || null,
      }
    })

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
    await loadPlayerTargets(selectedPlayer.id, targetPassName)
  }

  const resetExerciseForm = () => {
    setNewExerciseName("")
    setNewExerciseType("weight_reps")
    setNewExerciseGuide("")
    setNewExerciseDefaultRepsMode("fixed")
    setEditingExerciseId(null)
  }

  const handleStartEditExercise = (exercise) => {
    setNewExerciseName(exercise.name || "")
    setNewExerciseType(exercise.exercise_type || "weight_reps")
    setNewExerciseGuide("")
    setNewExerciseDefaultRepsMode(exercise.default_reps_mode || "fixed")
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
      default_reps_mode: newExerciseType === "seconds_only" ? "fixed" : newExerciseDefaultRepsMode,
    }

    const query = editingExerciseId
      ? supabase.from("exercises").update(payload).eq("id", editingExerciseId).select().single()
      : supabase.from("exercises").insert(payload).select().single()

    const { data, error } = await query

    if (error) {
      console.error(error)
      setStatus(editingExerciseId ? "Kunde inte uppdatera övning" : "Kunde inte spara övning")
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

  if (!user) {
    return <div style={pageStyle}>Laddar användare...</div>
  }

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <div>
          <p style={eyebrowStyle}>{profile?.role === "coach" ? "Coachläge" : "Spelarläge"}</p>
        </div>

        <button
          type="button"
          onClick={async () => {
            await supabase.auth.signOut()
            window.location.reload()
          }}
          style={logoutButtonStyle}
        >
          Logga ut
        </button>
      </div>

      {profile?.role === "coach" && (
        <div style={cardStyle}>
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
              targetPassName={targetPassName}
              setTargetPassName={setTargetPassName}
              isLoadingTargets={isLoadingTargets}
              targetDrafts={targetDrafts}
              handleTargetDraftChange={handleTargetDraftChange}
              handleSaveTargets={handleSaveTargets}
              isSavingTargets={isSavingTargets}
            />
          )}
        </div>
      )}

      <div style={workoutActionSectionStyle}>
        {!isWorkoutActive ? (
          <>
            <button onClick={() => setShowPicker(!showPicker)} style={buttonStyle}>
              Starta pass
            </button>

            {showPicker && (
              <div style={pickerGridStyle}>
                {Object.entries(activeWorkouts).map(([key, workout]) => (
                  <button
                    key={key}
                    onClick={() => startWorkout(key)}
                    style={pickerButtonStyle}
                  >
                    <div style={pickerTitleStyle}>{workout.label}</div>
                    <div style={pickerSubtitleStyle}>
                      Senast: {formatDate(latestPassDates[key])}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <button onClick={finishWorkout} style={buttonStyle}>
            Avsluta pass
          </button>
        )}
      </div>

      {status && <p style={statusStyle}>{status}</p>}

      {selectedWorkout && (
        <>
          <h2 style={sectionTitleStyle}>{activeWorkouts[selectedWorkout].label}</h2>

          <div style={cardStyle}>
            <h3 style={cardTitleStyle}>Uppvärmning</h3>

            <div style={{ marginBottom: 14 }}>
              <p style={subheadingStyle}>Pulshöjande aktivitet</p>
              <p style={mutedTextStyle}>
                {activeWorkouts[selectedWorkout].warmup.cardio}
              </p>
            </div>

            <div>
              <p style={subheadingStyle}>Teknikuppvärmning</p>
              <div style={mutedTextStyle}>
                {activeWorkouts[selectedWorkout].warmup.technique.map((item, index) => (
                  <div key={index}>{index + 1}. {item}</div>
                ))}
              </div>
            </div>
          </div>

          {activeWorkouts[selectedWorkout].exercises.map((exercise, i) => {
            const totalExercises = activeWorkouts[selectedWorkout].exercises.length
            const isInfoExpanded = !!expandedInfo[exercise.name]

            return (
              <div key={i} style={cardStyle}>
                <div style={exerciseProgressStyle}>
                  Övning {i + 1} / {totalExercises}
                </div>

                <div style={{ marginBottom: 14 }}>
                  <h3 style={cardTitleStyle}>{exercise.name}</h3>
                  <p style={guideStyle}>{exercise.guide}</p>
                </div>

                {!isLoadingPlayerTargets && (
                  <div style={targetBoxStyle}>
                    <div style={targetBoxTitleStyle}>Dagens mål</div>

                    {playerTargets[exercise.name] ? (
                      <>
                        <div style={targetRowStyle}>
                          <span style={targetLabelStyle}>Set</span>
                          <span style={targetValueStyle}>{playerTargets[exercise.name].target_sets ?? "-"}</span>
                        </div>

                        {exercise.type === "seconds_only" ? (
                          <div style={targetRowStyle}>
                            <span style={targetLabelStyle}>Tid</span>
                            <span style={targetValueStyle}>{playerTargets[exercise.name].target_reps ?? "-"} sek</span>
                          </div>
                        ) : (
                          <div style={targetRowStyle}>
                            <span style={targetLabelStyle}>Reps</span>
                            <span style={targetValueStyle}>
                              {playerTargets[exercise.name].target_reps_mode === "max"
                                ? "max"
                                : (playerTargets[exercise.name].target_reps ?? "-")}
                            </span>
                          </div>
                        )}

                        {exercise.type === "weight_reps" && (
                          <div style={targetRowStyle}>
                            <span style={targetLabelStyle}>Vikt</span>
                            <span style={targetValueStyle}>
                              {playerTargets[exercise.name].target_weight != null
                                ? `${playerTargets[exercise.name].target_weight} kg`
                                : "-"}
                            </span>
                          </div>
                        )}

                        {playerTargets[exercise.name].target_comment && (
                          <div style={{ ...targetCommentStyle, marginTop: "8px" }}>
                            <strong>Kommentar:</strong> {playerTargets[exercise.name].target_comment}
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

                      <div style={setInputsRowStyle}>
                        {exercise.type === "weight_reps" && (
                          <>
                            <input
                              placeholder={`Vikt (${latestWorkout[exercise.name]?.slice(-1)[0]?.weight ?? ""})`}
                              value={set.weight || ""}
                              onChange={(e) =>
                                handleChange(i, j, "weight", e.target.value)
                              }
                              style={inputStyle}
                            />
                            <input
                              placeholder="Reps"
                              value={set.reps || ""}
                              onChange={(e) =>
                                handleChange(i, j, "reps", e.target.value)
                              }
                              style={inputStyle}
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
                            style={inputStyle}
                          />
                        )}

                        {exercise.type === "seconds_only" && (
                          <input
                            placeholder="Sekunder"
                            value={set.seconds || ""}
                            onChange={(e) =>
                              handleChange(i, j, "seconds", e.target.value)
                            }
                            style={inputStyle}
                          />
                        )}

                        <button onClick={() => handleRemoveSet(i, j)} style={removeButtonStyle}>
                          Ta bort
                        </button>
                      </div>
                    </div>
                  ))}

                {isWorkoutActive && (
                  <button onClick={() => handleAddSet(i)} style={secondaryButtonStyle}>
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
  padding: "24px 20px 40px",
  maxWidth: "860px",
  margin: "0 auto",
  backgroundColor: "#f7f8fa",
  minHeight: "100vh",
  fontFamily: "Arial, sans-serif",
}

const titleStyle = {
  fontSize: "34px",
  margin: 0,
  color: "#111827",
  lineHeight: 1.1,
}

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "16px",
  marginBottom: "24px",
}

const eyebrowStyle = {
  margin: "0 0 6px 0",
  fontSize: "12px",
  fontWeight: "700",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#6b7280",
}

const logoutButtonStyle = {
  padding: "10px 14px",
  borderRadius: "10px",
  border: "1px solid #d1d5db",
  backgroundColor: "#ffffff",
  color: "#111827",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: "700",
  whiteSpace: "nowrap",
}

const workoutActionSectionStyle = {
  marginBottom: "24px",
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  gap: "12px",
}

const sectionTitleStyle = {
  fontSize: "22px",
  marginBottom: "16px",
  color: "#111827",
}

const cardStyle = {
  marginBottom: "20px",
  padding: "18px",
  border: "1px solid #e5e7eb",
  borderRadius: "14px",
  backgroundColor: "#ffffff",
  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
}

const cardTitleStyle = {
  margin: "0 0 4px 0",
  fontSize: "18px",
  color: "#111827",
  fontWeight: "700",
}

const guideStyle = {
  margin: 0,
  fontSize: "14px",
  color: "#6b7280",
}

const subheadingStyle = {
  margin: "0 0 6px 0",
  fontSize: "14px",
  fontWeight: "700",
  color: "#374151",
}

const mutedTextStyle = {
  margin: 0,
  fontSize: "14px",
  color: "#6b7280",
  lineHeight: 1.6,
}

const exerciseProgressStyle = {
  display: "inline-block",
  marginBottom: "12px",
  padding: "4px 10px",
  borderRadius: "999px",
  backgroundColor: "#fee2e2",
  color: "#b91c1c",
  fontSize: "12px",
  fontWeight: "700",
}

const targetBoxStyle = {
  backgroundColor: "#fef2f2",
  border: "1px solid #fecaca",
  borderRadius: "12px",
  padding: "14px 16px",
  marginBottom: "14px",
}

const targetBoxTitleStyle = {
  fontSize: "16px",
  fontWeight: "700",
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
  color: "#111827",
  fontWeight: "700",
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
  backgroundColor: "#f3f4f6",
  border: "1px solid #e5e7eb",
  borderRadius: "10px",
  padding: "10px 12px",
  marginBottom: "12px",
}

const latestBoxTitleStyle = {
  fontSize: "13px",
  fontWeight: "700",
  color: "#4b5563",
  marginBottom: "6px",
}

const latestRowStyle = {
  fontSize: "13px",
  color: "#374151",
  lineHeight: 1.6,
}

const infoBoxStyle = {
  backgroundColor: "#f9fafb",
  border: "1px solid #e5e7eb",
  borderRadius: "10px",
  padding: "10px 12px",
  marginBottom: "14px",
}

const infoBoxTitleStyle = {
  fontSize: "13px",
  fontWeight: "700",
  color: "#9ca3af",
  marginBottom: "4px",
}

const infoRowStyle = {
  fontSize: "13px",
  color: "#6b7280",
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
  fontWeight: "700",
  color: "#374151",
  cursor: "pointer",
}

const activeSetCardStyle = {
  marginBottom: "10px",
  padding: "12px",
  borderRadius: "10px",
  backgroundColor: "#f9fafb",
  border: "1px solid #e5e7eb",
}

const setRowWrapperStyle = {
  marginBottom: "10px",
  padding: "12px",
  borderRadius: "10px",
  backgroundColor: "#f9fafb",
  border: "1px solid #e5e7eb",
}

const setLabelStyle = {
  fontSize: "13px",
  fontWeight: "700",
  color: "#4b5563",
  marginBottom: "8px",
}

const setInputsRowStyle = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
}

const inputStyle = {
  padding: "10px 12px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  fontSize: "14px",
  minWidth: "120px",
  backgroundColor: "#fff",
  color: "#111827",
}

const buttonStyle = {
  padding: "10px 14px",
  borderRadius: "10px",
  border: "none",
  backgroundColor: "#111827",
  color: "#ffffff",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: "700",
}

const secondaryButtonStyle = {
  padding: "10px 14px",
  borderRadius: "10px",
  border: "1px solid #d1d5db",
  backgroundColor: "#ffffff",
  color: "#111827",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: "700",
}

const removeButtonStyle = {
  padding: "10px 12px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  backgroundColor: "#ffffff",
  color: "#4b5563",
  cursor: "pointer",
  fontSize: "14px",
}

const pickerGridStyle = {
  marginTop: "12px",
  display: "grid",
  gap: "12px",
}

const pickerButtonStyle = {
  padding: "14px",
  borderRadius: "12px",
  border: "1px solid #d1d5db",
  backgroundColor: "#ffffff",
  textAlign: "left",
  cursor: "pointer",
}

const pickerTitleStyle = {
  fontWeight: "700",
  fontSize: "16px",
  color: "#111827",
}

const pickerSubtitleStyle = {
  fontSize: "13px",
  color: "#6b7280",
  marginTop: "4px",
}

const statusStyle = {
  fontSize: "14px",
  color: "#6b7280",
  marginTop: 0,
  marginBottom: "16px",
}

const coachNavCardStyle = {
  padding: "16px",
  borderRadius: "12px",
  border: "1px solid #e5e7eb",
  backgroundColor: "#ffffff",
  textAlign: "left",
  cursor: "pointer",
}

const coachNavTitleStyle = {
  fontWeight: "700",
  fontSize: "16px",
  color: "#111827",
  marginBottom: "4px",
}

const coachNavTextStyle = {
  fontSize: "13px",
  color: "#6b7280",
}

export default TrainingApp