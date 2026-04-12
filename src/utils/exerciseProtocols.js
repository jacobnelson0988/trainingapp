const THROWING_PROGRAMS = {
  A: [
    { order: 1, label: "Block 1", targetValue: 15, targetUnit: "shots", intensityPercent: 50 },
    { order: 2, label: "Block 2", targetValue: 10, targetUnit: "shots", intensityPercent: 70 },
  ],
  B: [
    { order: 1, label: "Block 1", targetValue: 15, targetUnit: "shots", intensityPercent: 50 },
    { order: 2, label: "Block 2", targetValue: 10, targetUnit: "shots", intensityPercent: 70 },
    { order: 3, label: "Block 3", targetValue: 5, targetUnit: "shots", intensityPercent: 90 },
  ],
  C: [
    { order: 1, label: "Block 1", targetValue: 15, targetUnit: "shots", intensityPercent: 60 },
    { order: 2, label: "Block 2", targetValue: 10, targetUnit: "shots", intensityPercent: 80 },
    { order: 3, label: "Block 3", targetValue: 5, targetUnit: "shots", intensityPercent: 100 },
  ],
  D: [
    { order: 1, label: "Block 1", targetValue: 15, targetUnit: "shots", intensityPercent: 70 },
    { order: 2, label: "Block 2", targetValue: 10, targetUnit: "shots", intensityPercent: 85 },
    { order: 3, label: "Block 3", targetValue: 5, targetUnit: "shots", intensityPercent: 100 },
  ],
}

const buildProtocolStep = (step) => ({
  ...step,
  summary: `${step.targetValue} skott på ${step.intensityPercent} % av maxhastighet`,
})

const getExerciseNamesForProtocolDetection = (exercise) =>
  [
    exercise?.name,
    exercise?.display_name,
    exercise?.displayName,
    ...(Array.isArray(exercise?.aliases) ? exercise.aliases : []),
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean)

export const getThrowingProgramLevel = (exercise) => {
  const names = getExerciseNamesForProtocolDetection(exercise)

  for (const candidate of names) {
    const match = candidate.match(/^kastprogram nivå ([a-d])$/i)
    if (match) {
      return match[1].toUpperCase()
    }
  }

  return null
}

export const getExerciseProtocolConfig = (exercise) => {
  if (exercise?.logging_mode === "protocol" && exercise?.protocol_config?.steps?.length) {
    const steps = exercise.protocol_config.steps
      .map((step, index) => ({
        order: Number(step.order) || index + 1,
        label: String(step.label || `Block ${index + 1}`),
        targetValue: Number(step.targetValue ?? step.target_value ?? 0) || 0,
        targetUnit: String(step.targetUnit || step.target_unit || "shots"),
        intensityPercent: Number(step.intensityPercent ?? step.intensity_percent ?? 0) || 0,
      }))
      .sort((a, b) => a.order - b.order)
      .map(buildProtocolStep)

    if (steps.length > 0) {
      return {
        kind: "protocol",
        protocolKey: String(exercise.protocol_config.key || "custom_protocol"),
        title: String(exercise.protocol_config.title || exercise?.display_name || exercise?.name || "Protokoll"),
        steps,
      }
    }
  }

  const level = getThrowingProgramLevel(exercise)
  if (!level) return null

  return {
    kind: "throwing_program",
    protocolKey: `throwing_program_${level.toLowerCase()}`,
    title: `Kastprogram nivå ${level}`,
    steps: (THROWING_PROGRAMS[level] || []).map(buildProtocolStep),
  }
}

export const isProtocolExercise = (exercise) => Boolean(getExerciseProtocolConfig(exercise))

export const getExerciseProtocolStep = (exercise, setNumber) => {
  const config = getExerciseProtocolConfig(exercise)
  if (!config) return null

  const targetOrder = Number(setNumber)
  if (!Number.isFinite(targetOrder) || targetOrder <= 0) return null

  return config.steps.find((step) => step.order === targetOrder) || null
}

export const getProtocolTypeLabel = (exercise) =>
  isProtocolExercise(exercise) ? "Protokoll" : null
