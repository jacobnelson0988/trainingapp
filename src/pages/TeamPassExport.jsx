import { useEffect, useState } from "react"
import { supabase } from "../supabase"

export default function TeamPassExport({ teams, inputStyle, buttonStyle, secondaryButtonStyle, mutedTextStyle }) {
  const [sourceId, setSourceId] = useState("")
  const [targetId, setTargetId] = useState("")
  const [passes, setPasses] = useState([])
  const [selectedIds, setSelectedIds] = useState([])
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [message, setMessage] = useState("")
  const [loadError, setLoadError] = useState("")

  useEffect(() => {
    if (!sourceId) return
    let cancelled = false
    supabase.from("workout_templates").select("id, label, workout_kind")
      .eq("team_id", sourceId).order("label")
      .then(({ data, error }) => {
        if (cancelled) return
        setPasses(error ? [] : data || [])
        setLoadError(error ? "Kunde inte hämta passen. Välj källaget igen för att försöka på nytt." : "")
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [sourceId])

  const changeSource = (id) => {
    setSourceId(id)
    if (id === targetId) setTargetId("")
    setPasses([])
    setSelectedIds([])
    setMessage("")
    setLoadError("")
    setLoading(Boolean(id))
  }

  const exportPasses = async () => {
    if (exporting || !selectedIds.length || !targetId || sourceId === targetId) return
    setExporting(true)
    setMessage("")
    try {
      const { data, error } = await supabase.rpc("copy_team_workout_templates", {
        source_team_id: sourceId,
        target_team_id: targetId,
        template_ids: selectedIds,
      })
      if (error) throw error
      setMessage(`${data} pass kopierade till ${teams.find((team) => team.id === targetId)?.name}.`)
      setSelectedIds([])
    } catch (error) {
      setMessage(error.message?.startsWith("Det finns redan")
        ? error.message
        : "Kunde inte kopiera passen. Kontrollera anslutningen och att databasuppdateringen är installerad.")
    } finally {
      setExporting(false)
    }
  }

  return (
    <section style={{ border: "1px solid #e5e7eb", borderRadius: "14px", padding: "16px", marginTop: "16px", display: "grid", gap: "12px", minWidth: 0 }}>
      <h4 style={{ margin: 0 }}>Exportera pass mellan lag</h4>
      <p style={{ ...mutedTextStyle, margin: 0 }}>Välj vilka sparade pass som ska kopieras. Originalpassen finns kvar. Spelartilldelningar och träningshistorik följer inte med.</p>
      <label>Från lag
        <select value={sourceId} disabled={exporting} onChange={(event) => changeSource(event.target.value)} style={{ ...inputStyle, width: "100%", marginTop: "6px" }}>
          <option value="">Välj källag</option>
          {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
        </select>
      </label>
      <label>Till lag
        <select value={targetId} disabled={exporting} onChange={(event) => { setTargetId(event.target.value); setMessage("") }} style={{ ...inputStyle, width: "100%", marginTop: "6px" }}>
          <option value="">Välj mållag</option>
          {teams.filter((team) => team.id !== sourceId).map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
        </select>
      </label>
      {loading && <p role="status">Hämtar pass…</p>}
      {loadError && <p role="alert">{loadError}</p>}
      {sourceId && !loading && !loadError && passes.length === 0 && <p style={mutedTextStyle}>Källaget har inga sparade pass.</p>}
      {passes.length > 0 && <>
        <button type="button" disabled={exporting} style={secondaryButtonStyle} onClick={() => setSelectedIds(selectedIds.length === passes.length ? [] : passes.map((pass) => pass.id))}>
          {selectedIds.length === passes.length ? "Avmarkera alla" : "Välj alla pass"}
        </button>
        <fieldset disabled={exporting} style={{ border: 0, padding: 0, margin: 0, minWidth: 0, display: "grid", gap: "8px" }}>
          <legend style={{ marginBottom: "8px" }}>Välj pass ({selectedIds.length} valda)</legend>
          {passes.map((pass) => <label key={pass.id} style={{ display: "flex", gap: "10px", alignItems: "center", overflowWrap: "anywhere" }}>
            <input type="checkbox" checked={selectedIds.includes(pass.id)} onChange={(event) => setSelectedIds((ids) => event.target.checked ? [...ids, pass.id] : ids.filter((id) => id !== pass.id))} />
            {pass.label}
          </label>)}
        </fieldset>
      </>}
      <button type="button" disabled={loading || exporting || !targetId || !selectedIds.length || !teams.some((team) => team.id === sourceId) || !teams.some((team) => team.id === targetId)} onClick={exportPasses} style={{ ...buttonStyle, width: "100%" }}>
        {exporting ? "Kopierar…" : `Kopiera valda pass (${selectedIds.length})`}
      </button>
      {message && <p role="status" style={{ margin: 0 }}>{message}</p>}
    </section>
  )
}
