import ActiveIntervalWorkout from "./ActiveIntervalWorkout"
import {
  redesignBody,
  redesignDisplayFont,
  redesignInk,
  redesignLine,
  redesignMonoFont,
  redesignMuted,
  redesignSurfaceSoft,
} from "../../ui/redesignTokens"

const fieldGridStyle = (isMobile) => ({
  display: "grid",
  gap: "10px",
  gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
})

const fieldShellStyle = {
  display: "grid",
  gap: "8px",
}

const fullFieldStyle = {
  ...fieldShellStyle,
  gridColumn: "1 / -1",
}

const fieldLabelStyle = {
  fontFamily: redesignMonoFont,
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: redesignMuted,
}

const fieldInputStyle = {
  width: "100%",
  minHeight: "60px",
  padding: "14px 16px",
  borderRadius: "18px",
  border: `1px solid ${redesignLine}`,
  backgroundColor: redesignSurfaceSoft,
  boxSizing: "border-box",
  fontFamily: redesignDisplayFont,
  fontSize: "18px",
  lineHeight: 1.2,
  fontWeight: 700,
  color: redesignInk,
}

const helperTextStyle = {
  fontSize: "14px",
  lineHeight: 1.5,
  fontWeight: 700,
  color: redesignBody,
}

export default function ActiveRunningWorkout({
  workout,
  summaryText,
  input,
  onChangeField,
  onTotalTimeChange,
  onStatusChange,
  isMobile,
}) {
  if (workout?.runningType === "intervals") {
    return (
      <ActiveIntervalWorkout
        workoutLabel={workout?.label || "Intervallpass"}
        intervalProgram={workout?.runningConfig?.intervalProgram}
        onTotalTimeChange={onTotalTimeChange}
        onStatusChange={onStatusChange}
        isMobile={isMobile}
      />
    )
  }

  return (
    <div style={{ display: "grid", gap: "16px" }}>
      <div>
        <div style={fieldLabelStyle}>Aktivt löppass</div>
        <h3
          style={{
            margin: "8px 0 6px",
            fontFamily: redesignDisplayFont,
            fontSize: "clamp(34px, 8vw, 48px)",
            lineHeight: 0.94,
            fontWeight: 700,
            letterSpacing: "-0.04em",
            color: redesignInk,
          }}
        >
          {workout?.label || "Löppass"}
        </h3>
        <div style={helperTextStyle}>{summaryText}</div>
      </div>

      <div style={fieldGridStyle(isMobile)}>
        <label style={fieldShellStyle}>
          <span style={fieldLabelStyle}>Distans</span>
          <input
            placeholder="Distans i km"
            value={input.running_distance}
            onChange={(event) => onChangeField("running_distance", event.target.value)}
            style={fieldInputStyle}
          />
        </label>

        <label style={fieldShellStyle}>
          <span style={fieldLabelStyle}>Tid</span>
          <input
            placeholder="Tid, t.ex. 24:30"
            value={input.running_time}
            onChange={(event) => onChangeField("running_time", event.target.value)}
            style={fieldInputStyle}
          />
        </label>

        <label style={fullFieldStyle}>
          <span style={fieldLabelStyle}>Snittpuls</span>
          <input
            placeholder="Snittpuls"
            value={input.average_pulse}
            onChange={(event) => onChangeField("average_pulse", event.target.value)}
            style={fieldInputStyle}
          />
        </label>
      </div>
    </div>
  )
}
