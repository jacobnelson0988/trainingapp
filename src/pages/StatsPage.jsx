import { useEffect, useMemo, useState } from "react"
import { supabase } from "../supabase"

const LINE_COLORS = ["#c62828", "#1d4ed8", "#0f766e", "#7c3aed", "#ea580c", "#0891b2"]
const PERIOD_OPTIONS = [
  { value: "30", label: "Senaste 30 dagarna" },
  { value: "90", label: "Senaste 90 dagarna" },
  { value: "180", label: "Senaste 180 dagarna" },
  { value: "365", label: "Senaste 365 dagarna" },
  { value: "all", label: "Hela historiken" },
]

const parseWeightValue = (value) => {
  const normalized = String(value ?? "")
    .trim()
    .replace(",", ".")
  const parsed = Number.parseFloat(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

const formatStatDate = (value) => {
  if (!value) return "-"
  return new Date(value).toLocaleDateString("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
}

const buildProgressionSeries = (rows, playerMap) => {
  const grouped = new Map()

  ;(rows || []).forEach((row) => {
    const weight = parseWeightValue(row.weight)
    if (weight == null || !row.user_id || !row.exercise) return

    const playerId = String(row.user_id)
    const exerciseName = String(row.exercise || "").trim()
    const sessionKey =
      row.workout_session_id ||
      `${String(row.created_at || "").slice(0, 10)}:${row.pass_name || ""}:${exerciseName}`
    const groupingKey = `${playerId}__${exerciseName}__${sessionKey}`
    const existing = grouped.get(groupingKey)

    if (!existing || weight > existing.weight) {
      grouped.set(groupingKey, {
        playerId,
        exerciseName,
        weight,
        created_at: row.created_at,
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
            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
            .map((entry) => ({
              x: new Date(entry.created_at).getTime(),
              y: entry.weight,
              label: formatStatDate(entry.created_at),
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

function StatsPage({
  candidatePlayers,
  cardTitleStyle,
  mutedTextStyle,
  inputStyle,
  secondaryButtonStyle,
  isMobile,
}) {
  const [selectedPlayerIds, setSelectedPlayerIds] = useState([])
  const [isPlayerMenuOpen, setIsPlayerMenuOpen] = useState(false)
  const [exerciseFilter, setExerciseFilter] = useState("all")
  const [periodFilter, setPeriodFilter] = useState("90")
  const [statsRows, setStatsRows] = useState([])
  const [isLoadingStats, setIsLoadingStats] = useState(false)
  const [expandedChart, setExpandedChart] = useState(null)

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
    if (!sortedPlayers.length) {
      setSelectedPlayerIds([])
      return
    }

    setSelectedPlayerIds((prev) => {
      const validPrev = prev.filter((id) => sortedPlayers.some((player) => player.id === id))
      if (validPrev.length > 0) return validPrev
      return [sortedPlayers[0].id]
    })
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
        .select("user_id, exercise, weight, created_at, workout_session_id, pass_name, set_number, is_completed")
        .in("user_id", selectedPlayerIds)
        .not("weight", "is", null)
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
    () => buildProgressionSeries(filteredStatsRows, playerMap),
    [filteredStatsRows, playerMap]
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
    if (exerciseFilter === "all") return progressionSeries
    return progressionSeries.filter((entry) => entry.exerciseName === exerciseFilter)
  }, [exerciseFilter, progressionSeries])

  return (
    <>
      <div
        style={{
          marginBottom: "16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: isMobile ? "stretch" : "flex-start",
          flexDirection: isMobile ? "column" : "row",
          gap: "12px",
        }}
      >
        <div>
          <h3 style={{ ...cardTitleStyle, marginBottom: "4px" }}>Statistik</h3>
          <p style={mutedTextStyle}>
            Välj en eller flera spelare och följ viktutvecklingen över tid per övning.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setSelectedPlayerIds(sortedPlayers.map((player) => player.id))
            setIsPlayerMenuOpen(false)
          }}
          style={{ ...secondaryButtonStyle, width: isMobile ? "100%" : "auto" }}
          disabled={!sortedPlayers.length}
        >
          Välj alla
        </button>
      </div>

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

              {isPlayerMenuOpen && (
                <div style={playerDropdownMenuStyle}>
                  <div style={playerDropdownActionsStyle}>
                    <button
                      type="button"
                      onClick={() => setSelectedPlayerIds(sortedPlayers.map((player) => player.id))}
                      style={{ ...secondaryButtonStyle, width: "100%" }}
                    >
                      Markera alla
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedPlayerIds([])}
                      style={{ ...secondaryButtonStyle, width: "100%", backgroundColor: "#ffffff", color: "#18202b" }}
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
              )}
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
            {exerciseOptions.map((exerciseName) => (
              <option key={exerciseName} value={exerciseName}>
                {exerciseName}
              </option>
            ))}
          </select>
          <div style={{ ...mutedTextStyle, marginTop: "10px" }}>
            Visar toppset per pass för vald övning och spelare.
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

      {isLoadingStats ? (
        <p style={mutedTextStyle}>Laddar statistik...</p>
      ) : !selectedPlayerIds.length ? (
        <p style={mutedTextStyle}>Välj minst en spelare för att visa statistik.</p>
      ) : visibleSeries.length === 0 ? (
        <p style={mutedTextStyle}>Ingen viktdata hittades för det aktuella urvalet.</p>
      ) : (
        <div style={chartGridStyle}>
          {visibleSeries.map((entry) => (
            <ExerciseChartCard
              key={entry.exerciseName}
              exerciseName={entry.exerciseName}
              playerSeries={entry.playerSeries}
              isMobile={isMobile}
              onExpand={() =>
                setExpandedChart({
                  exerciseName: entry.exerciseName,
                  playerSeries: entry.playerSeries,
                })
              }
            />
          ))}
        </div>
      )}

      {expandedChart ? (
        <ChartModal
          exerciseName={expandedChart.exerciseName}
          playerSeries={expandedChart.playerSeries}
          onClose={() => setExpandedChart(null)}
        />
      ) : null}
    </>
  )
}

function ExerciseChartCard({ exerciseName, playerSeries, isMobile, onExpand }) {
  const chartMetrics = useMemo(() => getChartMetrics(playerSeries), [playerSeries])

  if (!chartMetrics) return null

  const { allPoints } = chartMetrics

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
          <div style={chartSubtitleStyle}>Viktutveckling per spelare</div>
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
              <div style={statFootnoteStyle}>{allPoints.length} datapunkter i grafen</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ChartModal({ exerciseName, playerSeries, onClose }) {
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
            <div style={chartSubtitleStyle}>Förstorad graf med högre upplösning</div>
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
  gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1.5fr) minmax(220px, 0.8fr) minmax(220px, 0.8fr)",
  marginBottom: "18px",
})

const filterCardStyle = {
  padding: "16px",
  borderRadius: "18px",
  border: "1px solid #e2e8f0",
  backgroundColor: "#fcfdff",
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

const chartGridStyle = {
  display: "grid",
  gap: "16px",
}

const chartCardStyle = {
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
  overflow: "auto",
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
