import { doneFeedbackPath, exportFeedbackFiles, openFeedbackPath } from "./feedback-utils.mjs"

const result = exportFeedbackFiles()

console.log(`Öppen feedback exporterad till ${openFeedbackPath} (${result.openCount} poster)`)
console.log(`Klar feedback exporterad till ${doneFeedbackPath} (${result.doneCount} poster)`)
