# HRG Exercise Mapping

Detta dokument beskriver hur HRG-programmen `Axelkontroll` och `Knäkontroll`
ska mappas mot nuvarande övningsbank.

Målet är att:

- återanvända befintliga övningar när de verkligen är samma
- skapa nya övningar när HRG-varianten är en tydlig egen variant
- hålla HRG-logiken i `aliases`, inte i `display_name`
- undvika dubletter i banken

---

## Namnregler

- `name` ska vara det stabila, generella namnet på övningen.
- `display_name` ska inte få HRG-koder som `1A`, `2C` eller liknande.
- `aliases` ska användas för:
  - HRG-kod, till exempel `4A`
  - HRG-fullnamn, till exempel `4A Bålkontroll - Draken`
  - tidigare namn som ska fortsätta vara sökbara

Exempel:

- `name`: `Draken`
- `display_name`: `null` eller samma som `name`
- `aliases`:
  - `4A`
  - `4A Bålkontroll - Draken`
  - `Axelkontroll 4A`

---

## Återanvänd Och Uppdatera

De här befintliga övningarna ska återanvändas och uppdateras enligt HRG-standard.

### Axelkontroll

1. `4A Bålkontroll - Draken`
- Befintlig övning: `Draken`
- Nytt `name`: `Draken`
- Lägg till alias:
  - `4A`
  - `4A Bålkontroll - Draken`
  - `Axelkontroll 4A`
- Uppdatera `description` till HRG-beskrivningen
- Lägg till taggar:
  - `Axelkontroll`
  - `HRG`
  - `Bålkontroll`

2. `2C Skulderkontroll - Klättrande planka`
- Befintlig övning: `Klättrande planka`
- Nytt `name`: `Klättrande planka`
- Lägg till alias:
  - `2C`
  - `2C Skulderkontroll - Klättrande planka`
  - `Axelkontroll 2C`
- Uppdatera `description` till HRG-beskrivningen
- Lägg till taggar:
  - `Axelkontroll`
  - `HRG`
  - `Skulderkontroll`

3. `5B Bålstyrka - Diagonal rotation`
- Befintlig övning: `Bålkontroll diagonal rotation`
- Nytt `name`: `Bålkontroll diagonal rotation`
- Lägg till alias:
  - `5B`
  - `5B Bålstyrka - Diagonal rotation`
  - `Axelkontroll 5B`
- Uppdatera `description` till HRG-beskrivningen
- Lägg till taggar:
  - `Axelkontroll`
  - `HRG`
  - `Bålstyrka`
  - `Rotation`

4. `3C Rörlighet bål - På fötter med bålrotation`
- Befintlig övning: `Planka med rotation`
- Nytt `name`: `Planka med rotation`
- Lägg till alias:
  - `3C`
  - `3C Rörlighet bål - På fötter med bålrotation`
  - `Axelkontroll 3C`
- Uppdatera `description` till HRG-beskrivningen
- Lägg till taggar:
  - `Axelkontroll`
  - `HRG`
  - `Rörlighet bål`
  - `Rotation`

5. `1C Stående utåtrotation`
- Befintlig övning: `External rotation band`
- Nytt `name`: `Stående utåtrotation`
- Behåll tidigare namn som alias:
  - `External rotation band`
- Lägg till alias:
  - `1C`
  - `1C Stående utåtrotation`
  - `Axelkontroll 1C`
- Uppdatera `description` till HRG-beskrivningen
- Lägg till taggar:
  - `Axelkontroll`
  - `HRG`
  - `Axelstyrka/kontroll`
  - `Skulderkontroll`

### Knäkontroll

6. `2A Bäckenlyft på båda fötter`
- Befintlig övning: `Glute bridge`
- Nytt `name`: `Bäckenlyft på båda fötter`
- Behåll tidigare namn som alias:
  - `Glute bridge`
- Lägg till alias:
  - `2A`
  - `2A Bäckenlyft på båda fötter`
  - `Knäkontroll 2A`
- Uppdatera `description` till HRG-beskrivningen
- Lägg till taggar:
  - `Knäkontroll`
  - `HRG`
  - `Bäckenlyft`

7. `2B Bäckenlyft på en fot`
- Befintlig övning: `Enbens höftlyft`
- Nytt `name`: `Bäckenlyft på en fot`
- Behåll tidigare namn som alias:
  - `Enbens höftlyft`
- Lägg till alias:
  - `2B`
  - `2B Bäckenlyft på en fot`
  - `Knäkontroll 2B`
- Uppdatera `description` till HRG-beskrivningen
- Lägg till taggar:
  - `Knäkontroll`
  - `HRG`
  - `Bäckenlyft`

8. `1A Enbensknäböj`
- Befintlig övning: `Pistol squat`
- Nytt `name`: `Enbensknäböj`
- Behåll tidigare namn som alias:
  - `Pistol squat`
- Lägg till alias:
  - `1A`
  - `1A Enbensknäböj`
  - `Knäkontroll 1A`
- Uppdatera `description` till HRG-beskrivningen
- Lägg till taggar:
  - `Knäkontroll`
  - `HRG`
  - `Enbensknäböj`

9. `4C Plankan - På fötter och underarmar`
- Befintlig övning: `Planka`
- Nytt `name`: `Plankan - På fötter och underarmar`
- Behåll tidigare namn som alias:
  - `Planka`
  - `Front plank`
- Lägg till alias:
  - `4C`
  - `4C Plankan - På fötter och underarmar`
  - `Knäkontroll 4C`
- Uppdatera `description` till HRG-beskrivningen
- Lägg till taggar:
  - `Knäkontroll`
  - `HRG`
  - `Plankan`

---

## Skapa Som Nya Övningar

### Axelkontroll

- `1A Stående Y-flyes`
- `1B Bågskytten`
- `1D Långsam sänkning av arm`
- `1E Parövning - Omvänd armbrytning - klocka mot klocka`
- `2A Skulderkontroll - Push plus på knä och underarmar`
- `2B Skulderkontroll - Hands up`
- `2D Skulderkontroll - Plankan med förlängning`
- `2E Parövning - Skottkärra med push plus`
- `3A Rörlighet bål - Liggande på rygg`
- `3B Rörlighet bål - Rotation på knä`
- `3D Rörlighet bål - Bålrotation med passning`
- `3E Rörlighet bål - Bålrotation med passning`
- `4B Bålkontroll - Draken med boll`
- `4C Bålkontroll - Draken med gummiband`
- `4D Bålkontroll - Draken med vikt`
- `4E Parövning - Draken pressa varandras händer`
- `5A Bålstyrka - Rak bålrotation`
- `5C Bålstyrka - Rotation i skottposition`
- `5D Bålstyrka - Med full skottrörelse`
- `5E Parövningar - Statisk bålrotation`
- `6A Kastprogram nivå A`
- `6B Kastprogram nivå B`
- `6C Kastprogram nivå C`
- `6D Kastprogram nivå D`

### Knäkontroll

- `1B Enbensknäböj med boll ovanför huvudet`
- `1C Enbensknäböj med bålrotation`
- `1D Enbensknäböj med passning med en medspelare`
- `1E Enbensknäböj - med armbrytning med en medspelare`
- `2C Bäckenlyft på en fot med boll mellan knäna`
- `2D Bäckenlyft med fot på bänk/boll`
- `2E Parövning - Sidliggande press med boll`
- `3A Kroppsviktsknäböj`
- `3B Kroppsviktsknäböj med boll framför kroppen`
- `3C Kroppsviktsknäböj med boll ovanför huvudet`
- `3D Kroppsviktsknäböj upp på tå`
- `3E Parövning - Kroppsviktsknäböj med passning`
- `4A Plankan - På knä och underarmar`
- `4B Plankan - På knä med armlyft`
- `4D Plankan - På fötter med benlyft`
- `4E Parövning - Träffa varandras händer/armar`
- `5A Kroppsviktsutfallssteg - armarna efter sidan`
- `5B Kroppsviktsutfallssteg - armarna ovanför huvudet`
- `5C Kroppsviktsutfallssteg - åt sidan/snett framåt`
- `5D Kroppsviktsutfallssteg - med bålrotation`
- `5E Kroppsviktsutfallssteg - med passning med en medspelare`
- `6A Hopp framåt på ett ben`
- `6B Hopp - med 90 grader vändning`
- `6C Sidohopp/stegisättning`
- `6D Nedhopp - landning på ett ben`
- `6E Nedhopp - passning med en medspelare`

---

## Särskilda Beslut

1. `Y-raise` ska inte återanvändas för `1A`
- Skäl: nuvarande övning är en hantelvariant och matchar inte HRG tillräckligt väl.

2. `Knäböj` ska inte döpas om till HRG-variant
- Skäl: nuvarande `Knäböj` används som generell eller skivstångsorienterad basövning.
- HRG-varianten ska i stället skapas som nya kroppsviktsövningar.

3. `Split squat` ska inte användas för HRG-utfall
- Rekommenderat framtida namn för befintlig post:
  - `Split squat med skivstång`
- HRG-utfallsblocket ska byggas som egna kroppsviktsövningar.

4. Alla uppdaterade befintliga övningar ska behålla sina tidigare namn som alias
- Det minskar risken för brutna sökningar och gör historik enklare att tolka.

---

## Nästa Steg

1. Exportera befintlig övningsbank innan ändringar.
2. Uppdatera de befintliga övningarna i listan `Återanvänd och uppdatera`.
3. Skapa de nya HRG-övningarna i listan `Skapa som nya övningar`.
4. Lägg på gemensamma taggar:
- `HRG`
- `Axelkontroll` eller `Knäkontroll`
- respektive blockkategori
- `Parövning` där det gäller
5. Bygg sedan två passmallar:
- `Axelkontroll HRG`
- `Knäkontroll HRG`

