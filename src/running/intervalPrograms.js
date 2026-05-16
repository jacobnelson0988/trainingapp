const createDraftId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `interval-${Date.now()}-${Math.random().toString(16).slice(2)}`

export const parseDurationToSeconds = (value) => {
  if (value == null) return null

  if (typeof value === "number") {
    return value > 0 ? Math.round(value) : null
  }

  const normalized = String(value).trim().toLowerCase()
  if (!normalized) return null

  if (/^\d+$/.test(normalized)) {
    const parsed = Number.parseInt(normalized, 10)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null
  }

  if (/^\d{1,2}:\d{2}(?::\d{2})?$/.test(normalized)) {
    const parts = normalized.split(":").map((part) => Number.parseInt(part, 10))
    if (parts.some((part) => !Number.isFinite(part))) return null

    if (parts.length === 2) return parts[0] * 60 + parts[1]
    return parts[0] * 3600 + parts[1] * 60 + parts[2]
  }

  const hourMatch = normalized.match(/(\d+)\s*(h|tim|timmar?)/)
  const minuteMatch = normalized.match(/(\d+)\s*(m|min|minut|minuter)/)
  const secondMatch = normalized.match(/(\d+)\s*(s|sek|sekund|sekunder)/)

  const hours = hourMatch ? Number.parseInt(hourMatch[1], 10) : 0
  const minutes = minuteMatch ? Number.parseInt(minuteMatch[1], 10) : 0
  const seconds = secondMatch ? Number.parseInt(secondMatch[1], 10) : 0
  const total = hours * 3600 + minutes * 60 + seconds

  return total > 0 ? total : null
}

export const formatSecondsAsClock = (totalSeconds) => {
  const safeSeconds = Math.max(0, Math.round(totalSeconds || 0))
  const hours = Math.floor(safeSeconds / 3600)
  const minutes = Math.floor((safeSeconds % 3600) / 60)
  const seconds = safeSeconds % 60

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

export const createIntervalBlockDraft = (index = 0, overrides = {}) => ({
  id: overrides.id || createDraftId(),
  label: overrides.label || `Block ${index + 1}`,
  work_seconds:
    overrides.work_seconds != null && overrides.work_seconds !== ""
      ? String(overrides.work_seconds)
      : "",
  rest_seconds:
    overrides.rest_seconds != null && overrides.rest_seconds !== ""
      ? String(overrides.rest_seconds)
      : "",
  block_rest_seconds:
    overrides.block_rest_seconds != null && overrides.block_rest_seconds !== ""
      ? String(overrides.block_rest_seconds)
      : "",
  repeats:
    overrides.repeats != null && overrides.repeats !== ""
      ? String(overrides.repeats)
      : "",
})

export const createIntervalProgramDraft = (overrides = {}) => ({
  countdown_seconds:
    overrides.countdown_seconds != null && overrides.countdown_seconds !== ""
      ? String(overrides.countdown_seconds)
      : "5",
  blocks:
    Array.isArray(overrides.blocks) && overrides.blocks.length > 0
      ? overrides.blocks.map((block, index) => createIntervalBlockDraft(index, block))
      : [createIntervalBlockDraft(0)],
})

export const normalizeIntervalProgramDraft = (draft) => {
  if (!draft) return null

  const normalizedBlocks = (draft.blocks || [])
    .map((block, index) => {
      const workSeconds = parseDurationToSeconds(block.work_seconds)
      const restSeconds = parseDurationToSeconds(block.rest_seconds) ?? 0
      const blockRestSeconds =
        parseDurationToSeconds(block.block_rest_seconds) ??
        parseDurationToSeconds(draft.set_rest_seconds) ??
        0
      const repeats = Number.parseInt(String(block.repeats || "").trim(), 10)

      if (!workSeconds || !Number.isFinite(repeats) || repeats <= 0) return null

      return {
        label: String(block.label || "").trim() || `Block ${index + 1}`,
        work_seconds: workSeconds,
        rest_seconds: restSeconds,
        block_rest_seconds: blockRestSeconds,
        repeats,
      }
    })
    .filter(Boolean)

  if (!normalizedBlocks.length) return null

  const countdownSeconds = parseDurationToSeconds(draft.countdown_seconds) ?? 5
  return {
    countdown_seconds: countdownSeconds,
    blocks: normalizedBlocks,
  }
}

export const legacyRunningConfigToProgramDraft = (config = {}) => {
  const workSeconds = parseDurationToSeconds(config.interval_time)
  const repeats =
    config.intervals_count != null && config.intervals_count !== ""
      ? Number.parseInt(String(config.intervals_count).trim(), 10)
      : null

  if (!workSeconds || !Number.isFinite(repeats) || repeats <= 0) {
    return createIntervalProgramDraft()
  }

  return createIntervalProgramDraft({
    countdown_seconds: 5,
    blocks: [
      {
        label: "Block 1",
        work_seconds: String(workSeconds),
        rest_seconds: "",
        block_rest_seconds: "",
        repeats: String(repeats),
      },
    ],
  })
}

export const storedProgramToDraft = (program, fallbackConfig = {}) => {
  if (!program?.blocks?.length) return legacyRunningConfigToProgramDraft(fallbackConfig)

  return createIntervalProgramDraft({
    countdown_seconds: program.countdown_seconds ?? 5,
    blocks: program.blocks.map((block, index) => ({
      label: block.label || `Block ${index + 1}`,
      work_seconds: block.work_seconds,
      rest_seconds: block.rest_seconds ?? "",
      block_rest_seconds: block.block_rest_seconds ?? program.set_rest_seconds ?? "",
      repeats: block.repeats,
    })),
  })
}

export const getIntervalProgramTotalIntervals = (programLike) => {
  const program = normalizeIntervalProgramDraft(programLike) || programLike
  const blocks = Array.isArray(program?.blocks) ? program.blocks : []
  return blocks.reduce((total, block) => total + (Number(block.repeats) || 0), 0)
}

export const getIntervalProgramTotalDurationSeconds = (programLike) => {
  const program = normalizeIntervalProgramDraft(programLike) || programLike
  if (!program?.blocks?.length) return 0

  const countdownSeconds = Number(program.countdown_seconds) || 0
  return (
    countdownSeconds +
    program.blocks.reduce((total, block, blockIndex) => {
      const workSeconds = Number(block.work_seconds) || 0
      const restSeconds = Number(block.rest_seconds) || 0
      const blockRestSeconds = Number(block.block_rest_seconds) || 0
      const repeats = Number(block.repeats) || 0
      if (!workSeconds || !repeats) return total

      const blockDuration =
        workSeconds * repeats +
        restSeconds * Math.max(0, repeats - 1) +
        (blockIndex < program.blocks.length - 1 ? blockRestSeconds : 0)

      return total + blockDuration
    }, 0)
  )
}

export const getIntervalProgramSummary = (programLike) => {
  const program = normalizeIntervalProgramDraft(programLike) || programLike
  if (!program?.blocks?.length) return "Inga intervallblock"

  const blockCount = program.blocks.length
  const totalIntervals = getIntervalProgramTotalIntervals(program)
  const totalDurationSeconds = getIntervalProgramTotalDurationSeconds(program)

  return [
    `${blockCount} block`,
    `${totalIntervals} intervaller`,
    totalDurationSeconds > 0 ? formatSecondsAsClock(totalDurationSeconds) : null,
  ]
    .filter(Boolean)
    .join(" • ")
}

export const intervalProgramToLegacyFields = (programLike) => {
  const program = normalizeIntervalProgramDraft(programLike) || programLike
  const firstBlock = program?.blocks?.[0]

  return {
    interval_time: firstBlock?.work_seconds ? formatSecondsAsClock(firstBlock.work_seconds) : null,
    intervals_count: getIntervalProgramTotalIntervals(program) || null,
  }
}

export const buildIntervalProgram = (programLike) => {
  const program = normalizeIntervalProgramDraft(programLike) || programLike
  if (!program?.blocks?.length) return null

  const phases = []

  if ((Number(program.countdown_seconds) || 0) > 0) {
    phases.push({
      key: "countdown",
      kind: "countdown",
      label: "Nedräkning",
      durationSeconds: Number(program.countdown_seconds) || 0,
      blockIndex: 0,
      totalBlocks: program.blocks.length,
      intervalIndex: 0,
      totalIntervals: getIntervalProgramTotalIntervals(program),
      blockLabel: "Start",
      repIndex: 0,
      repsInBlock: 0,
    })
  }

  let totalIntervalCursor = 0
  program.blocks.forEach((block, blockIndex) => {
    for (let repIndex = 0; repIndex < block.repeats; repIndex += 1) {
      totalIntervalCursor += 1
      phases.push({
        key: `block-${blockIndex + 1}-work-${repIndex + 1}`,
        kind: "work",
        label: "Löp",
        durationSeconds: block.work_seconds,
        blockIndex: blockIndex + 1,
        totalBlocks: program.blocks.length,
        intervalIndex: totalIntervalCursor,
        totalIntervals: getIntervalProgramTotalIntervals(program),
        blockLabel: block.label,
        repIndex: repIndex + 1,
        repsInBlock: block.repeats,
      })

      if (block.rest_seconds > 0 && repIndex < block.repeats - 1) {
        phases.push({
          key: `block-${blockIndex + 1}-rest-${repIndex + 1}`,
          kind: "rest",
          label: "Vila",
          durationSeconds: block.rest_seconds,
          blockIndex: blockIndex + 1,
          totalBlocks: program.blocks.length,
          intervalIndex: totalIntervalCursor,
          totalIntervals: getIntervalProgramTotalIntervals(program),
          blockLabel: block.label,
          repIndex: repIndex + 1,
          repsInBlock: block.repeats,
        })
      }
    }

    if ((Number(block.block_rest_seconds) || 0) > 0 && blockIndex < program.blocks.length - 1) {
      phases.push({
        key: `block-${blockIndex + 1}-set-rest`,
        kind: "set_rest",
        label: "Setvila",
        durationSeconds: Number(block.block_rest_seconds) || 0,
        blockIndex: blockIndex + 1,
        totalBlocks: program.blocks.length,
        intervalIndex: totalIntervalCursor,
        totalIntervals: getIntervalProgramTotalIntervals(program),
        blockLabel: block.label,
        repIndex: block.repeats,
        repsInBlock: block.repeats,
      })
    }
  })

  return {
    countdownSeconds: Number(program.countdown_seconds) || 0,
    setRestSeconds: 0,
    blocks: program.blocks,
    phases,
    totalIntervals: getIntervalProgramTotalIntervals(program),
    totalDurationSeconds: getIntervalProgramTotalDurationSeconds(program),
  }
}

export const getRunningProgramFromTemplate = (template) => {
  if (template?.running_interval_program?.blocks?.length) {
    return normalizeIntervalProgramDraft(template.running_interval_program)
  }

  return normalizeIntervalProgramDraft(
    legacyRunningConfigToProgramDraft({
      interval_time: template?.running_interval_time,
      intervals_count: template?.running_intervals_count,
    })
  )
}
