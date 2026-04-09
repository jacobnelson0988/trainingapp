import { execFileSync } from "node:child_process"
import { writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, "..")
const outputPath = path.join(rootDir, "FEEDBACK.md")

const query = `
select
  f.id,
  f.status,
  f.body,
  f.created_at,
  p.full_name,
  p.username,
  p.role,
  t.name as team_name
from public.beta_feedback f
left join public.profiles p on p.id = f.user_id
left join public.teams t on t.id = f.team_id
where f.status <> 'done'
order by f.created_at desc;
`

const extractJsonPayload = (rawOutput) => {
  const startIndex = rawOutput.indexOf("{")
  const endIndex = rawOutput.lastIndexOf("}")

  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    throw new Error("Kunde inte tolka Supabase-svaret som JSON.")
  }

  return JSON.parse(rawOutput.slice(startIndex, endIndex + 1))
}

const formatDate = (value) => {
  if (!value) return "-"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)

  return new Intl.DateTimeFormat("sv-SE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Stockholm",
  }).format(date)
}

const formatStatusLabel = (status) => {
  if (status === "open") return "Öppen"
  if (status === "future") return "Framtida"
  if (status === "wont_do") return "Kommer inte göras"
  if (status === "done") return "Klar"
  return status || "-"
}

const formatRoleLabel = (role) => {
  if (role === "head_admin") return "Huvudadmin"
  if (role === "coach") return "Tränare"
  if (role === "player") return "Spelare"
  return role || "-"
}

const rawOutput = execFileSync(
  "npx",
  ["--yes", "supabase", "db", "query", "--linked", "-o", "json", query],
  {
    cwd: rootDir,
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 10,
  }
)

const payload = extractJsonPayload(rawOutput)
const rows = Array.isArray(payload.rows) ? payload.rows : []
const generatedAt = new Intl.DateTimeFormat("sv-SE", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Stockholm",
}).format(new Date())

const sections = rows.map((item, index) => {
  const author = item.full_name || item.username || "Okänd användare"
  const role = formatRoleLabel(item.role)
  const team = item.team_name || "-"
  const status = formatStatusLabel(item.status)
  const createdAt = formatDate(item.created_at)
  const body = String(item.body || "").trim()

  return [
    `## ${index + 1}. ${author}`,
    "",
    `- Status: ${status}`,
    `- Roll: ${role}`,
    `- Lag: ${team}`,
    `- Datum: ${createdAt}`,
    `- Username: ${item.username || "-"}`,
    `- ID: ${item.id}`,
    "",
    "### Feedback",
    "",
    body || "_Tom feedbacktext_",
    "",
  ].join("\n")
})

const document = [
  "# Feedback",
  "",
  "Automatiskt exporterad lista över feedback som inte är klarmarkerad i Supabase.",
  "",
  `Senast uppdaterad: ${generatedAt}`,
  `Antal poster: ${rows.length}`,
  "",
  "---",
  "",
  ...(sections.length > 0
    ? sections
    : ["Inga öppna feedbackposter hittades.", ""]),
].join("\n")

writeFileSync(outputPath, document, "utf8")

console.log(`Feedback exporterad till ${outputPath}`)
