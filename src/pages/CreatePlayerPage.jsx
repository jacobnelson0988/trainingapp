function CreatePlayerPage({
  newPlayerName,
  setNewPlayerName,
  newPlayerPassword,
  setNewPlayerPassword,
  handleCreatePlayer,
  isCreatingPlayer,
  createdPlayer,
  inputStyle,
  buttonStyle,
  cardTitleStyle,
  isMobile,
  importedPlayers,
  importFileName,
  isParsingImportFile,
  handlePlayerImportFile,
  handleImportPlayers,
  isImportingPlayers,
  importResults,
}) {
  return (
    <>
      <h3 style={cardTitleStyle}>Skapa spelare</h3>

      <form onSubmit={handleCreatePlayer}>
        <div style={{ marginBottom: "10px" }}>
          <input
            type="text"
            placeholder="Fullständigt namn"
            value={newPlayerName}
            onChange={(e) => setNewPlayerName(e.target.value)}
            style={{ ...inputStyle, width: "100%" }}
          />
        </div>

        <div style={{ marginBottom: "10px" }}>
          <input
            type="text"
            placeholder="Startlösenord"
            value={newPlayerPassword}
            onChange={(e) => setNewPlayerPassword(e.target.value)}
            style={{ ...inputStyle, width: "100%" }}
          />
        </div>

        <button
          type="submit"
          style={{
            ...buttonStyle,
            width: isMobile ? "100%" : "auto",
            opacity: isCreatingPlayer ? 0.7 : 1,
            cursor: isCreatingPlayer ? "default" : "pointer",
          }}
          disabled={isCreatingPlayer}
        >
          {isCreatingPlayer ? "Skapar..." : "Skapa spelare"}
        </button>
      </form>

      {createdPlayer && (
        <div style={{ marginTop: "12px", color: "#6b7280", fontSize: "14px" }}>
          <div><strong>Användarnamn:</strong> {createdPlayer.username}</div>
          <div><strong>E-post:</strong> {createdPlayer.email}</div>
        </div>
      )}

      <div
        style={{
          marginTop: "24px",
          padding: "16px",
          borderRadius: "16px",
          border: "1px solid #e8dddd",
          backgroundColor: "#fffdfd",
        }}
      >
        <h3 style={cardTitleStyle}>Importera flera spelare</h3>
        <p style={{ margin: "0 0 12px 0", color: "#6b7280", fontSize: "14px", lineHeight: 1.6 }}>
          Ladda upp en `CSV`, `XLSX` eller `XLS` med kolumner för namn och lösenord.
          Exempel på rubriker som fungerar: `full_name` + `password` eller `namn` + `lösenord`.
        </p>

        <input
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={(e) => handlePlayerImportFile(e.target.files?.[0])}
          style={{ ...inputStyle, width: "100%", marginBottom: "12px" }}
        />

        {importFileName && (
          <div style={{ marginBottom: "12px", fontSize: "13px", color: "#566173" }}>
            <strong>Fil:</strong> {importFileName}
            {isParsingImportFile ? " • Läser fil..." : ""}
          </div>
        )}

        {importedPlayers.length > 0 && (
          <div
            style={{
              marginBottom: "12px",
              display: "grid",
              gap: "8px",
              maxHeight: "260px",
              overflowY: "auto",
            }}
          >
            {importedPlayers.map((player) => (
              <div
                key={`${player.rowNumber}-${player.full_name}`}
                style={{
                  padding: "10px 12px",
                  borderRadius: "12px",
                  border: "1px solid #eee2e2",
                  backgroundColor: "#ffffff",
                }}
              >
                <div style={{ fontSize: "14px", fontWeight: "700", color: "#18202b" }}>
                  {player.full_name || "Saknar namn"}
                </div>
                <div style={{ fontSize: "12px", color: "#6b7280" }}>
                  Rad {player.rowNumber} • {player.password ? "Lösenord finns" : "Saknar lösenord"}
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={handleImportPlayers}
          disabled={isImportingPlayers || isParsingImportFile || importedPlayers.length === 0}
          style={{
            ...buttonStyle,
            width: isMobile ? "100%" : "auto",
            opacity: isImportingPlayers || isParsingImportFile || importedPlayers.length === 0 ? 0.7 : 1,
            cursor: isImportingPlayers || isParsingImportFile || importedPlayers.length === 0 ? "default" : "pointer",
          }}
        >
          {isImportingPlayers ? "Importerar..." : "Importera spelare"}
        </button>

        {importResults.length > 0 && (
          <div style={{ marginTop: "14px", display: "grid", gap: "8px" }}>
            {importResults.map((result) => (
              <div
                key={`${result.rowNumber}-${result.full_name}-${result.message}`}
                style={{
                  padding: "10px 12px",
                  borderRadius: "12px",
                  border: `1px solid ${result.success ? "#bbf7d0" : "#fecaca"}`,
                  backgroundColor: result.success ? "#f0fdf4" : "#fef2f2",
                }}
              >
                <div style={{ fontSize: "14px", fontWeight: "700", color: "#18202b" }}>
                  {result.full_name}
                </div>
                <div style={{ fontSize: "12px", color: "#566173", lineHeight: 1.5 }}>
                  {result.success
                    ? `${result.message} • ${result.username} • ${result.email}`
                    : result.message}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

export default CreatePlayerPage
