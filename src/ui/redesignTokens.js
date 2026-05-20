export const redesignInk = "#1A1814"
export const redesignBody = "#4B4338"
export const redesignMuted = "#6F6659"
export const redesignPlaceholder = "#8A8173"
export const redesignLine = "rgba(26, 24, 20, 0.14)"
export const redesignLineSoft = "rgba(26, 24, 20, 0.08)"
export const redesignSurface = "rgba(255, 255, 255, 0.18)"
export const redesignSurfaceSoft = "rgba(255, 255, 255, 0.28)"
export const redesignAccent = "#D94A1F"
export const redesignSystemAccent = "#111827"
export const redesignSystemAccentSoft = "rgba(17, 24, 39, 0.08)"
export const redesignPaper = "#F3EFE6"
export const redesignDisplayFont = '"Manrope", sans-serif'
export const redesignMonoFont = '"IBM Plex Mono", "SFMono-Regular", Consolas, monospace'

export const pageEyebrowStyleToken = {
  fontFamily: redesignMonoFont,
  fontSize: "11px",
  fontWeight: 700,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: redesignMuted,
}

export const pageTitleStyleToken = {
  marginTop: "8px",
  fontFamily: redesignDisplayFont,
  fontSize: "clamp(38px, 10vw, 60px)",
  lineHeight: 0.92,
  fontWeight: 700,
  letterSpacing: "-0.04em",
  color: redesignInk,
}

export const secondaryPageTitleStyleToken = {
  fontFamily: redesignDisplayFont,
  fontSize: "clamp(30px, 8vw, 46px)",
  lineHeight: 0.92,
  fontWeight: 700,
  letterSpacing: "-0.04em",
  color: redesignInk,
}

export const sectionTitleStyleToken = {
  fontFamily: redesignDisplayFont,
  fontSize: "24px",
  lineHeight: 1,
  fontWeight: 700,
  letterSpacing: "-0.03em",
  color: redesignInk,
}

export const itemTitleStyleToken = {
  fontFamily: redesignDisplayFont,
  fontSize: "18px",
  lineHeight: 1,
  fontWeight: 700,
  letterSpacing: "-0.03em",
  color: redesignInk,
}

export const compactItemTitleStyleToken = {
  fontFamily: redesignDisplayFont,
  fontSize: "16px",
  lineHeight: 1.05,
  fontWeight: 700,
  letterSpacing: "-0.03em",
  color: redesignInk,
}

export const bodyTextStyleToken = {
  fontFamily: redesignDisplayFont,
  fontSize: "14px",
  lineHeight: 1.55,
  fontWeight: 500,
  letterSpacing: 0,
  color: redesignBody,
}

export const compactBodyTextStyleToken = {
  ...bodyTextStyleToken,
  fontSize: "13px",
}

export const mutedBodyTextStyleToken = {
  ...bodyTextStyleToken,
  color: redesignMuted,
}

export const fieldLabelStyleToken = {
  fontFamily: redesignMonoFont,
  fontSize: "11px",
  fontWeight: 700,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: redesignMuted,
}

export const inputTextStyleToken = {
  fontFamily: redesignDisplayFont,
  fontSize: "15px",
  lineHeight: 1.4,
  fontWeight: 500,
  color: redesignInk,
}

export const metaMonoStyleToken = {
  fontFamily: redesignMonoFont,
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: redesignMuted,
}

export const buttonTextStyleToken = {
  fontFamily: redesignDisplayFont,
  fontSize: "16px",
  fontWeight: 700,
}

export const secondaryButtonTextStyleToken = {
  fontFamily: redesignDisplayFont,
  fontSize: "14px",
  fontWeight: 700,
}

export const smallButtonTextStyleToken = {
  fontFamily: redesignDisplayFont,
  fontSize: "12px",
  fontWeight: 700,
}

export const flatSectionStyleToken = {
  border: "none",
  borderRadius: "14px",
  background: "transparent",
  boxShadow: "none",
}

export const subtleInsetStyleToken = {
  border: `1px solid ${redesignLineSoft}`,
  borderRadius: "12px",
  background: redesignSurface,
  boxShadow: "none",
}
