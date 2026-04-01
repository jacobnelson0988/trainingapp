import { useState, useEffect } from "react"
import { supabase } from "./supabase"

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
          info: ["Alternativ: assisterade chins", "Alternativ: excentriska chins", "Alternativ: scapula pull-ups"],
        },
        {
          name: "Draken",
          type: "reps_only",
          guide: "3 set x 8 per ben",
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
          info: ["Alternativ: assisterade dips med gummiband/maskin", "Alternativ: bänk-dips"],
        },
        {
          name: "Russian twist",
          type: "reps_only",
          guide: "3 set x 20",
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
          info: ["Stabil i bålen", "Långsamma rörelser", "Rör arm och ben samtidigt diagonalt"],
        },
        {
          name: "Bålkontroll diagonal rotation",
          type: "reps_only",
          guide: "3 set x 10 per sida",
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
  const [profile, setProfile] = useState(null)
  const [selectedWorkout, setSelectedWorkout] = useState(null)
  const [inputs, setInputs] = useState({})
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
    const workout = workouts[workoutKey]

    setSelectedWorkout(workoutKey)
    setCurrentSessionId(newSessionId)
    setIsWorkoutActive(true)
    setShowPicker(false)

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
    setStatus(`${workouts[selectedWorkout].label} avslutat`)

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
    const exercise = workouts[selectedWorkout].exercises[exerciseIndex]

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

  if (!user) {
    return <div style={pageStyle}>Laddar användare...</div>
  }

  return (
    <div style={pageStyle}>
      <h1 style={titleStyle}>Träning</h1>
      {profile?.role === "coach" && (
  <div style={cardStyle}>
    <h3 style={cardTitleStyle}>Coachläge</h3>
    <p style={mutedTextStyle}>
      Du är inloggad som coach.
    </p>
  </div>
)}

      <div style={{ marginBottom: 20 }}>
        {!isWorkoutActive ? (
          <>
            <button onClick={() => setShowPicker(!showPicker)} style={buttonStyle}>
              Starta pass
            </button>

            {showPicker && (
              <div style={pickerGridStyle}>
                {Object.entries(workouts).map(([key, workout]) => (
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
          <h2 style={sectionTitleStyle}>{workouts[selectedWorkout].label}</h2>

          <div style={cardStyle}>
            <h3 style={cardTitleStyle}>Uppvärmning</h3>

            <div style={{ marginBottom: 14 }}>
              <p style={subheadingStyle}>Pulshöjande aktivitet</p>
              <p style={mutedTextStyle}>
                {workouts[selectedWorkout].warmup.cardio}
              </p>
            </div>

            <div>
              <p style={subheadingStyle}>Teknikuppvärmning</p>
              <div style={mutedTextStyle}>
                {workouts[selectedWorkout].warmup.technique.map((item, index) => (
                  <div key={index}>{index + 1}. {item}</div>
                ))}
              </div>
            </div>
          </div>

          {workouts[selectedWorkout].exercises.map((exercise, i) => (
            <div key={i} style={cardStyle}>
              <div style={{ marginBottom: 10 }}>
                <h3 style={cardTitleStyle}>{exercise.name}</h3>
                <p style={guideStyle}>{exercise.guide}</p>
              </div>

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
                  <div style={infoBoxTitleStyle}>Att tänka på</div>
                  {exercise.info.map((item, index) => (
                    <div key={index} style={infoRowStyle}>• {item}</div>
                  ))}
                </div>
              )}

              {isWorkoutActive &&
                (inputs[i] || []).map((set, j) => (
                  <div key={set.client_set_id || j} style={setRowWrapperStyle}>
                    <div style={setLabelStyle}>Set {j + 1}</div>

                    <div style={setInputsRowStyle}>
                      {exercise.type === "weight_reps" && (
                        <>
                          <input
                            placeholder="Vikt"
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
            </div>
          ))}
        </>
      )}
    </div>
  )
}

const pageStyle = {
  padding: "24px",
  maxWidth: "760px",
  margin: "0 auto",
  backgroundColor: "#f7f8fa",
  minHeight: "100vh",
  fontFamily: "Arial, sans-serif",
}

const titleStyle = {
  fontSize: "28px",
  marginBottom: "16px",
  color: "#111827",
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
  color: "#9ca3af",
  lineHeight: 1.6,
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

export default TrainingApp