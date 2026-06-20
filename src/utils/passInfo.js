const youtubeUrlPattern = /https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)\/[^\s)]+/i

export const getPassInfoParts = (info) => {
  const rawInfo = String(info || "").trim()
  if (!rawInfo) {
    return {
      text: "",
      videoUrl: "",
    }
  }

  const match = rawInfo.match(youtubeUrlPattern)
  if (!match) {
    return {
      text: rawInfo,
      videoUrl: "",
    }
  }

  const videoUrl = match[0].replace(/[.,;:]+$/, "")
  const text = rawInfo
    .replace(match[0], "")
    .replace(/\bvideo\s*:\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim()

  return {
    text,
    videoUrl,
  }
}
