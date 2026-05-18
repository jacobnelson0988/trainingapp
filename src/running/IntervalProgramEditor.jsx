import {
  redesignAccent,
  redesignBody,
  redesignDisplayFont,
  redesignInk,
  redesignLine,
  redesignMonoFont,
  redesignMuted,
  redesignSurfaceSoft,
} from "../ui/redesignTokens"
import {
  createIntervalBlockDraft,
  createIntervalProgramDraft,
  formatSecondsAsClock,
  getIntervalProgramSummary,
  normalizeIntervalProgramDraft,
} from "./intervalPrograms"

const editorStackStyle = {
  display: "grid",
  gap: "12px",
}

const blockListStyle = {
  display: "grid",
  gap: "12px",
}

const blockCardStyle = {
  padding: "14px",
  borderRadius: "20px",
  border: `1px solid ${redesignLine}`,
  backgroundColor: "rgba(255, 255, 255, 0.18)",
  display: "grid",
  gap: "10px",
}

const gridStyle = (isMobile, columns = 2) => ({
  display: "grid",
  gap: "10px",
  gridTemplateColumns: isMobile ? "1fr" : `repeat(${columns}, minmax(0, 1fr))`,
})

const fieldStyle = {
  display: "grid",
  gap: "8px",
}

const labelStyle = {
  fontFamily: redesignMonoFont,
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: redesignMuted,
}

const inputStyle = {
  width: "100%",
  minHeight: "52px",
  padding: "12px 14px",
  borderRadius: "16px",
  border: `1px solid ${redesignLine}`,
  backgroundColor: redesignSurfaceSoft,
  boxSizing: "border-box",
  fontFamily: redesignDisplayFont,
  fontSize: "15px",
  lineHeight: 1.3,
  fontWeight: 600,
  color: redesignInk,
}

const secondaryButtonStyle = {
  minHeight: "46px",
  padding: "12px 14px",
  borderRadius: "16px",
  border: `1px solid ${redesignLine}`,
  backgroundColor: "rgba(255,255,255,0.28)",
  color: redesignInk,
  cursor: "pointer",
  fontFamily: redesignDisplayFont,
  fontSize: "14px",
  fontWeight: 700,
}

const primaryGhostButtonStyle = {
  ...secondaryButtonStyle,
  borderColor: redesignAccent,
  color: redesignAccent,
}

const summaryStyle = {
  fontSize: "14px",
  lineHeight: 1.5,
  fontWeight: 700,
  color: redesignBody,
}

const rowStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
}

export default function IntervalProgramEditor({
  programDraft,
  onChange,
  isMobile,
  nameValue = "",
  onNameChange = null,
  nameLabel = "Namn",
  showNameField = false,
}) {
  const draft = programDraft || createIntervalProgramDraft()
  const normalizedProgram = normalizeIntervalProgramDraft(draft)
  const summaryText = normalizedProgram
    ? `${getIntervalProgramSummary(normalizedProgram)}`
    : "Fyll i block med arbete, vila och repetitioner."

  const updateProgram = (nextProgram) => {
    onChange(nextProgram)
  }

  const updateBlock = (blockId, field, value) => {
    updateProgram({
      ...draft,
      blocks: (draft.blocks || []).map((block) =>
        block.id === blockId
          ? {
              ...block,
              [field]: value,
            }
          : block
      ),
    })
  }

  const addBlock = () => {
    updateProgram({
      ...draft,
      blocks: [...(draft.blocks || []), createIntervalBlockDraft((draft.blocks || []).length)],
    })
  }

  const removeBlock = (blockId) => {
    const nextBlocks = (draft.blocks || []).filter((block) => block.id !== blockId)
    updateProgram({
      ...draft,
      blocks: nextBlocks.length ? nextBlocks : [createIntervalBlockDraft(0)],
    })
  }

  return (
    <div style={editorStackStyle}>
      {showNameField ? (
        <label style={fieldStyle}>
          <span style={labelStyle}>{nameLabel}</span>
          <input
            type="text"
            value={nameValue}
            onChange={(event) => onNameChange?.(event.target.value)}
            style={inputStyle}
          />
        </label>
      ) : null}

      <div style={gridStyle(isMobile)}>
        <label style={fieldStyle}>
          <span style={labelStyle}>Nedräkning före start</span>
          <input
            type="text"
            value={draft.countdown_seconds}
            onChange={(event) =>
              updateProgram({
                ...draft,
                countdown_seconds: event.target.value,
              })
            }
            placeholder="t.ex. 5"
            style={inputStyle}
          />
        </label>
      </div>

      <div style={summaryStyle}>{summaryText}</div>

      <div style={blockListStyle}>
        {(draft.blocks || []).map((block, index) => {
          const normalizedBlock = normalizeIntervalProgramDraft({
            countdown_seconds: draft.countdown_seconds,
            blocks: [block],
          })?.blocks?.[0]

          return (
            <div key={block.id} style={blockCardStyle}>
              <div style={rowStyle}>
                <div style={labelStyle}>{`Block ${index + 1}`}</div>
                <button
                  type="button"
                  onClick={() => removeBlock(block.id)}
                  style={secondaryButtonStyle}
                >
                  Ta bort
                </button>
              </div>

              <label style={fieldStyle}>
                <span style={labelStyle}>Rubrik</span>
                <input
                  type="text"
                  value={block.label}
                  onChange={(event) => updateBlock(block.id, "label", event.target.value)}
                  style={inputStyle}
                />
              </label>

              <div style={gridStyle(isMobile, 4)}>
                <label style={fieldStyle}>
                  <span style={labelStyle}>Löp</span>
                  <input
                    type="text"
                    value={block.work_seconds}
                    onChange={(event) => updateBlock(block.id, "work_seconds", event.target.value)}
                    placeholder="t.ex. 60"
                    style={inputStyle}
                  />
                </label>

                <label style={fieldStyle}>
                  <span style={labelStyle}>Vila</span>
                  <input
                    type="text"
                    value={block.rest_seconds}
                    onChange={(event) => updateBlock(block.id, "rest_seconds", event.target.value)}
                    placeholder="t.ex. 60"
                    style={inputStyle}
                  />
                </label>

                <label style={fieldStyle}>
                  <span style={labelStyle}>Blockvila</span>
                  <input
                    type="text"
                    value={block.block_rest_seconds}
                    onChange={(event) => updateBlock(block.id, "block_rest_seconds", event.target.value)}
                    placeholder={index === (draft.blocks || []).length - 1 ? "valfritt" : "t.ex. 120"}
                    style={inputStyle}
                  />
                </label>

                <label style={fieldStyle}>
                  <span style={labelStyle}>Repetitioner</span>
                  <input
                    type="text"
                    value={block.repeats}
                    onChange={(event) => updateBlock(block.id, "repeats", event.target.value)}
                    placeholder="t.ex. 4"
                    style={inputStyle}
                  />
                </label>
              </div>

              <div style={summaryStyle}>
                {normalizedBlock
                  ? `${normalizedBlock.label} • ${normalizedBlock.repeats} x ${formatSecondsAsClock(normalizedBlock.work_seconds)} / ${formatSecondsAsClock(normalizedBlock.rest_seconds)}${
                      normalizedBlock.block_rest_seconds
                        ? ` • blockvila ${formatSecondsAsClock(normalizedBlock.block_rest_seconds)}`
                        : ""
                    }`
                  : "Fyll i arbete och antal repetitioner för att aktivera blocket."}
              </div>
            </div>
          )
        })}
      </div>

      <button type="button" onClick={addBlock} style={primaryGhostButtonStyle}>
        + Lägg till block
      </button>
    </div>
  )
}
