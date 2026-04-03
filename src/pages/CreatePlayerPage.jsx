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
    </>
  )
}

export default CreatePlayerPage