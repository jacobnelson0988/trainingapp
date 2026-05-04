function GdprPage({
  isMobile,
  profile,
  teamName,
  mutedTextStyle,
  secondaryButtonStyle,
  buttonStyle,
  uiVariant,
  onBack,
  onOpenAccount,
}) {
  const isManagementRedesign = uiVariant === "coach"

  return (
    <div
      style={{
        padding: isMobile ? "16px 14px" : "24px",
        borderRadius: isMobile ? "24px" : "28px",
        border: isManagementRedesign ? "1px solid rgba(26, 24, 20, 0.12)" : "1px solid #e2e8f0",
        background: isManagementRedesign
          ? "radial-gradient(circle at 84% 16%, rgba(217, 74, 31, 0.14), transparent 26%), linear-gradient(180deg, rgba(255,255,255,0.34), rgba(243,239,230,0.78))"
          : "#ffffff",
        boxShadow: isManagementRedesign
          ? "0 20px 38px rgba(26, 24, 20, 0.08)"
          : "0 18px 36px rgba(24, 32, 43, 0.06)",
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
          <h2 style={titleStyle(isManagementRedesign)}>GDPR och personuppgifter</h2>
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
        <div style={infoCardStyle(isManagementRedesign)}>
          <div style={infoTitleStyle(isManagementRedesign)}>Vilken data lagras?</div>
          <div style={infoTextStyle}>
            Namn, användarnamn, roll, lagkoppling, träningspass, träningsloggar, kommentarer,
            individuella mål, meddelanden och feedback som skapas i appen.
          </div>
        </div>

        <div style={infoCardStyle(isManagementRedesign)}>
          <div style={infoTitleStyle(isManagementRedesign)}>Varför lagras den?</div>
          <div style={infoTextStyle}>
            För att planera träning, följa upp genomförda pass, ge individuell coaching och hålla
            kommunikationen mellan spelare, tränare och huvudadmin samlad.
          </div>
        </div>

        <div style={infoCardStyle(isManagementRedesign)}>
          <div style={infoTitleStyle(isManagementRedesign)}>Vem har åtkomst?</div>
          <div style={infoTextStyle}>
            Spelare ser sitt eget konto och sin träningsdata. Tränare ser sitt lag. Huvudadmin kan se
            hela organisationen. Nuvarande konto: <strong>{roleLabel(profile?.role)}</strong>
            {profile?.role !== "head_admin" ? ` • ${teamName}` : ""}.
          </div>
        </div>

        <div style={infoCardStyle(isManagementRedesign)}>
          <div style={infoTitleStyle(isManagementRedesign)}>Arkivering</div>
          <div style={infoTextStyle}>
            Arkivering döljer en spelare från aktiva listor men sparar historiken. Det passar när en
            spelare ska lämna laget utan att träningshistoriken ska försvinna.
          </div>
        </div>

        <div style={infoCardStyle(isManagementRedesign)}>
          <div style={infoTitleStyle(isManagementRedesign)}>Radering</div>
          <div style={infoTextStyle}>
            Radering är permanent. Profil, träningsloggar, mål, meddelanderelationer, feedback och
            övrig spelarrelaterad data tas bort. Auth-kontot tas också bort.
          </div>
        </div>

        <div style={infoCardStyle(isManagementRedesign)}>
          <div style={infoTitleStyle(isManagementRedesign)}>Dina rättigheter</div>
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

const titleStyle = (isManagementRedesign) => ({
  fontSize: isManagementRedesign ? "clamp(30px, 8vw, 40px)" : "28px",
  lineHeight: isManagementRedesign ? 0.94 : 1.05,
  fontWeight: isManagementRedesign ? "700" : "900",
  letterSpacing: isManagementRedesign ? "-0.04em" : "normal",
  color: isManagementRedesign ? "#1a1814" : "#18202b",
  margin: "0 0 6px 0",
})

const infoGridStyle = (isMobile) => ({
  display: "grid",
  gap: "12px",
  gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
})

const infoCardStyle = (isManagementRedesign) => ({
  padding: "16px",
  borderRadius: "20px",
  border: isManagementRedesign ? "1px solid rgba(26, 24, 20, 0.12)" : "1px solid #dbe5ef",
  backgroundColor: isManagementRedesign ? "rgba(255, 255, 255, 0.32)" : "#f8fbff",
})

const infoTitleStyle = (isManagementRedesign) => ({
  fontSize: isManagementRedesign ? "15px" : "14px",
  fontWeight: "900",
  color: isManagementRedesign ? "#1a1814" : "#18202b",
  marginBottom: "6px",
})

const infoTextStyle = {
  fontSize: "14px",
  lineHeight: 1.6,
  color: "#475569",
}

export default GdprPage
