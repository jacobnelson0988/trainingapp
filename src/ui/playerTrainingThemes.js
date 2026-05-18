const STRENGTH_THEME = {
  key: "strength",
  accent: "#b03327",
  filledBackground: "linear-gradient(135deg, #191611 0%, #2b241d 100%)",
  filledBorder: "#1a1814",
  filledText: "#f8f4ed",
  filledMeta: "rgba(248, 244, 237, 0.72)",
  filledShadow: "0 18px 34px rgba(26, 24, 20, 0.16)",
  softBackground: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(241,238,234,0.94) 100%)",
  softBorder: "rgba(17, 24, 39, 0.18)",
  softText: "#111827",
  softMeta: "#4b5563",
  softShadow: "0 12px 24px rgba(17, 24, 39, 0.06)",
  badgeBackground: "rgba(17, 24, 39, 0.08)",
  badgeColor: "#111827",
  dotColor: "#111827",
}

const RUNNING_THEME = {
  key: "running",
  accent: "#e87a1c",
  filledBackground: "linear-gradient(135deg, #d94a1f 0%, #aa3218 100%)",
  filledBorder: "#d94a1f",
  filledText: "#fff7f2",
  filledMeta: "rgba(255, 247, 242, 0.76)",
  filledShadow: "0 16px 32px rgba(217, 74, 31, 0.18)",
  softBackground: "linear-gradient(180deg, rgba(255,245,238,0.98) 0%, rgba(255,238,229,0.94) 100%)",
  softBorder: "rgba(217, 74, 31, 0.22)",
  softText: "#111827",
  softMeta: "#9a4a1d",
  softShadow: "0 12px 24px rgba(217, 74, 31, 0.10)",
  badgeBackground: "#fff0e5",
  badgeColor: "#d94a1f",
  dotColor: "#e5541f",
}

const PREHAB_THEME = {
  key: "prehab",
  accent: "#2d7a6b",
  filledBackground: "linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(250,248,245,0.95) 100%)",
  filledBorder: "rgba(111, 102, 89, 0.18)",
  filledText: "#1a1814",
  filledMeta: "#6f6659",
  filledShadow: "0 10px 24px rgba(75, 58, 38, 0.06)",
  softBackground: "linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(250,248,245,0.95) 100%)",
  softBorder: "rgba(111, 102, 89, 0.18)",
  softText: "#1a1814",
  softMeta: "#6f6659",
  softShadow: "0 10px 24px rgba(75, 58, 38, 0.06)",
  badgeBackground: "#ffffff",
  badgeColor: "#4b5563",
  dotColor: "#9ca3af",
}

const OTHER_THEME = {
  key: "other",
  accent: "#4b4a8f",
  filledBackground: "linear-gradient(180deg, #f3f4f6 0%, #e5e7eb 100%)",
  filledBorder: "#d1d5db",
  filledText: "#111827",
  filledMeta: "#6b7280",
  filledShadow: "0 10px 24px rgba(107, 114, 128, 0.10)",
  softBackground: "linear-gradient(180deg, #f9fafb 0%, #f3f4f6 100%)",
  softBorder: "#d1d5db",
  softText: "#111827",
  softMeta: "#6b7280",
  softShadow: "0 10px 24px rgba(107, 114, 128, 0.08)",
  badgeBackground: "#f3f4f6",
  badgeColor: "#6b7280",
  dotColor: "#9ca3af",
}

export const PLAYER_TRAINING_THEME_MAP = {
  strength: STRENGTH_THEME,
  running: RUNNING_THEME,
  prehab: PREHAB_THEME,
  other: OTHER_THEME,
}

export const resolvePlayerTrainingThemeKey = ({
  workoutKind = null,
  activityKind = null,
  freeActivityType = null,
} = {}) => {
  if (workoutKind === "running") return "running"
  if (workoutKind === "prehab") return "prehab"
  if (workoutKind === "gym") return "strength"

  if (activityKind === "free_activity") {
    return freeActivityType === "running" ? "running" : "other"
  }

  if (activityKind === "custom" || activityKind === "handball") {
    return "other"
  }

  return "strength"
}

export const getPlayerTrainingTheme = (themeKey = "strength") =>
  PLAYER_TRAINING_THEME_MAP[themeKey] || PLAYER_TRAINING_THEME_MAP.strength

export const getCategoryAccent = (themeKey = "strength") =>
  getPlayerTrainingTheme(themeKey).accent || PLAYER_TRAINING_THEME_MAP.strength.accent
