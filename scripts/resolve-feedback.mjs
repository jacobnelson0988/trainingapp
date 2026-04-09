import { exportFeedbackFiles, runSupabaseQuery } from "./feedback-utils.mjs"

const feedbackId = process.argv[2]

if (!feedbackId) {
  console.error("Ange ett feedback-ID. Exempel: npm run feedback:resolve -- <id>")
  process.exit(1)
}

const escapedId = feedbackId.replace(/'/g, "''")
const updatedAt = new Date().toISOString().replace("T", " ").replace("Z", "+00")

runSupabaseQuery(`
update public.beta_feedback
set
  status = 'done',
  status_updated_at = '${updatedAt}'
where id = '${escapedId}';
`)

const result = exportFeedbackFiles()

console.log(`Feedback ${feedbackId} markerad som done.`)
console.log(`FEEDBACK.md uppdaterad (${result.openCount} öppna poster kvar).`)
console.log(`FEEDBACK_DONE.md uppdaterad (${result.doneCount} klara poster).`)
