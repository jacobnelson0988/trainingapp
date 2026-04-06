function GdprPage({
  isMobile,
  profile,
  teamName,
  mutedTextStyle,
  secondaryButtonStyle,
  buttonStyle,
  onBack,
  onOpenAccount,
}) {
  return (
    <div
      style={{
        padding: isMobile ? "16px 14px" : "24px",
        borderRadius: isMobile ? "20px" : "24px",
        border: "1px solid #e2e8f0",
        backgroundColor: "#ffffff",
        boxShadow: "0 18px 36px rgba(24, 32, 43, 0.06)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: isMobile ? "stretch" : "flex-start",
          flexDirection: isMobile ? "column" : "row",
          gap: "12px",
          marginBottom: "18px",
        }}
      >
        <div>
          <div style={eyebrowStyle}>Integritet</div>
          <h2 style={titleStyle}>GDPR och personuppgifter</h2>
          <p style={{ ...mutedTextStyle, marginBottom: 0 }}>
            Här ser du kortfattat vilken data appen lagrar och vilka rättigheter spelare, tränare och
            huvudadmin har kring arkivering och radering.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", flexDirection: isMobile ? "column" : "row" }}>
          <button
            type="button"
            onClick={onOpenAccount}
            style={{ ...secondaryButtonStyle, width: isMobile ? "100%" : "auto" }}
          >
            Mitt konto
          </button>
          <button
            type="button"
            onClick={onBack}
            style={{ ...buttonStyle, width: isMobile ? "100%" : "auto" }}
          >
            Tillbaka
          </button>
        </div>
      </div>

      <div style={infoGridStyle(isMobile)}>
        <div style={infoCardStyle}>
          <div style={infoTitleStyle}>Vilken data lagras?</div>
          <div style={infoTextStyle}>
            Namn, användarnamn, roll, lagkoppling, träningspass, träningsloggar, kommentarer,
            individuella mål, meddelanden och feedback som skapas i appen.
          </div>
        </div>

        <div style={infoCardStyle}>
          <div style={infoTitleStyle}>Varför lagras den?</div>
          <div style={infoTextStyle}>
            För att planera träning, följa upp genomförda pass, ge individuell coaching och hålla
            kommunikationen mellan spelare, tränare och huvudadmin samlad.
          </div>
        </div>

        <div style={infoCardStyle}>
          <div style={infoTitleStyle}>Vem har åtkomst?</div>
          <div style={infoTextStyle}>
            Spelare ser sitt eget konto och sin träningsdata. Tränare ser sitt lag. Huvudadmin kan se
            hela organisationen. Nuvarande konto: <strong>{roleLabel(profile?.role)}</strong>
            {profile?.role !== "head_admin" ? ` • ${teamName}` : ""}.
          </div>
        </div>

        <div style={infoCardStyle}>
          <div style={infoTitleStyle}>Arkivering</div>
          <div style={infoTextStyle}>
            Arkivering döljer en spelare från aktiva listor men sparar historiken. Det passar när en
            spelare ska lämna laget utan att träningshistoriken ska försvinna.
          </div>
        </div>

        <div style={infoCardStyle}>
          <div style={infoTitleStyle}>Radering</div>
          <div style={infoTextStyle}>
            Radering är permanent. Profil, träningsloggar, mål, meddelanderelationer, feedback och
            övrig spelarrelaterad data tas bort. Auth-kontot tas också bort.
          </div>
        </div>

        <div style={infoCardStyle}>
          <div style={infoTitleStyle}>Dina rättigheter</div>
          <div style={infoTextStyle}>
            Spelare kan ta bort sitt eget konto från Mitt konto. Tränare och huvudadmin kan arkivera
            eller ta bort spelare i adminvyerna när det behövs.
          </div>
        </div>
      </div>
    </div>
  )
}

const roleLabel = (role) => {
  if (role === "head_admin") return "Huvudadmin"
  if (role === "coach") return "Tränare"
  return "Spelare"
}

const eyebrowStyle = {
  fontSize: "12px",
  fontWeight: "800",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: "#46607a",
  marginBottom: "8px",
}

const titleStyle = {
  fontSize: "28px",
  fontWeight: "900",
  color: "#18202b",
  margin: "0 0 6px 0",
}

const infoGridStyle = (isMobile) => ({
  display: "grid",
  gap: "12px",
  gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
})

const infoCardStyle = {
  padding: "16px",
  borderRadius: "18px",
  border: "1px solid #dbe5ef",
  backgroundColor: "#f8fbff",
}

const infoTitleStyle = {
  fontSize: "14px",
  fontWeight: "900",
  color: "#18202b",
  marginBottom: "6px",
}

const infoTextStyle = {
  fontSize: "14px",
  lineHeight: 1.6,
  color: "#475569",
}

export default GdprPage
