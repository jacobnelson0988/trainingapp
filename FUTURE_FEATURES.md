# Framtida Features

Detta dokument samlar idéer för framtida produktsteg som är intressanta, men som inte nödvändigtvis ska in i den aktiva roadmapen direkt.

---

## 🧠 Deterministisk rekommendationsmotor

Mål: bygga en regelbaserad motor som automatiskt genererar rekommenderade målvikter per spelare och övning efter varje avslutat pass. Systemet ska vara deterministiskt, alltså utan AI, så att rekommendationerna blir förutsägbara, billiga att köra och enkla att justera.

### Funktionalitet

- Generera rekommenderad vikt för varje relevant övning efter avslutat pass
- Bygga på:
  - senaste genomförda pass
  - tidigare historik
  - reps per set
  - använd vikt
  - antal tidigare genomförda pass i övningen
- Ta hänsyn till individuella mål om de är aktiverade
- Om individuella mål är inaktiverade ska rekommendationen enbart bygga på historisk prestation
- Spara rekommendationer i databasen så att frontend kan läsa senaste rekommendation direkt

### Kärnlogik v1

För varje spelare och övning används:

- senaste resultat
- tidigare resultat
- target reps range (`min_reps`, `max_reps`)
- antal dagar sedan övningen senast genomfördes
- antal tidigare loggade tillfällen i övningen

Regler:

1. Om alla set når eller överstiger `max_reps`
   - öka vikten med definierat steg, till exempel `+2.5 kg`

2. Om alla set når minst `min_reps`
   - behåll samma vikt

3. Om två eller fler set ligger under `min_reps`
   - sänk vikten med definierat steg, till exempel `-2.5 kg`

4. Om övningen inte körts på minst 21 dagar
   - återstarta försiktigt, till exempel `-5–10 %` eller avrundat till närmaste steg

5. Om spelaren har för lite historik i övningen
   - använd försiktig progression eller behåll vikt tills minst två loggade tillfällen finns

### Datamodell

#### `exercise_results`

Lagrar faktiskt genomförda resultat per spelare och övning.

Exempel på fält:

- `id`
- `user_id`
- `exercise_id`
- `performed_at`
- `weight`
- `reps_json`
- `sets`

#### `player_exercise_targets`

Lagrar individuella mål och inställningar per spelare och övning.

Exempel på fält:

- `id`
- `user_id`
- `exercise_id`
- `min_reps`
- `max_reps`
- `increment_step`
- `decrement_step`
- `auto_progression_enabled`

#### `exercise_recommendations`

Lagrar senaste genererade rekommendationer.

Exempel på fält:

- `id`
- `user_id`
- `exercise_id`
- `recommended_weight`
- `reason`
- `based_on_result_id`
- `created_at`

### Flöde

1. Spelaren avslutar ett pass
2. Resultat sparas i `exercise_results`
3. Backend kör rekommendationsmotorn
4. Rekommendationer genereras för alla relevanta övningar i passet
5. Resultatet sparas i `exercise_recommendations`
6. Frontend läser senaste rekommendation per spelare och övning

### Implementation

- Byggs i backend, helst som Supabase Edge Function eller serverfunktion
- Ska köras vid `complete workout`
- Ska köras en gång per avslutat pass och hantera alla relevanta övningar i samma körning
- Frontend ska inte själv räkna logiken

### Reason / debug / transparens

Varje rekommendation ska spara en kort orsak, till exempel:

- `increase: hit max reps in all sets`
- `keep: within target range`
- `decrease: below min reps`
- `restart: long gap`

### Vidareutveckling

- Ta hänsyn till trend över flera pass i rad
- Individanpassa progressionstakt
- Stöd för procentuell ökning istället för fast steg
- Koppla tydligare till coach-mål
- Eventuell AI ovanpå senare för att formulera feedback, men inte för att fatta beslut

---

## Brainstorm

### Tydligt desktop-läge för appen

Idé: utveckla ett genomarbetat desktop-läge så att appen känns naturlig och effektiv även på dator, inte bara som en uppförstorad mobilvy.

Mål:

- behålla samma app och samma logik som idag
- skapa tydligt olika layoutläge för mobil och dator
- förbättra överblick, arbetsflöde och läsbarhet på större skärmar

Prioriterade delar:

1. tränarvyn
2. passbyggaren
3. spelarlistan
4. statistik
5. adminvyn
6. spelarvyn

Syfte:

- göra appen mer professionell för tränare och admin som ofta arbetar från dator
- använda skärmytan bättre med tydligare struktur och informationshierarki
- skapa ett mer enhetligt UX/UI mellan mobil och desktop

### Planering av handbollspass

Idé: lägga till en funktion där tränare kan planera rena handbollspass, inte bara fyspass.

Möjliga delar:

- skapa handbollspass med namn, tema och syfte
- dela upp passet i block, till exempel:
  - uppvärmning
  - teknik
  - försvar
  - anfall
  - spel
  - avslut
- lägga in övningar, tider och instruktioner per block
- koppla passet till lag eller träningsgrupp
- spara som mall och återanvända senare
- kunna bygga ett veckoupplägg med både fys och handboll

Syfte:

- samla hela träningsplaneringen i samma app
- ge tränare ett gemensamt verktyg för både gym/fys och handbollspass
- skapa bättre överblick över lagets totala träningsbelastning

### Begär ändring av målvikt

Idé: låta spelaren signalera att en rekommenderad eller satt målvikt känns fel.

Möjliga delar:

- spelaren kan markera att en vikt känns för lätt, för tung eller osäker
- tränaren ser detta i sin vy
- tränaren kan justera målvikt direkt utifrån spelarens signal
- historik över ändringsbegäran kan sparas som stöd i uppföljningen

Syfte:

- göra målstyrningen mer levande
- fånga upp när rekommendationer eller coachmål inte stämmer i praktiken
- skapa bättre dialog mellan spelare och tränare

### Full protokollmotor för särskilda övningar

Idé: bygga en full protokollmotor för övningar som inte passar naturligt i vanlig `set / reps / vikt / tid`-logik, till exempel kastprogram och framtida rehabflöden.

Hur den bör byggas:

- låt övningen fortfarande finnas i vanliga `exercises`
- lägg till en intern logiktyp, till exempel `logging_mode = protocol`
- koppla vissa övningar till ett protokoll som består av flera fasta steg
- varje steg ska ha:
  - ordning
  - måltyp, till exempel `shots`, `seconds`, `reps`, `distance`
  - målvärde
  - eventuell intensitet eller instruktion, till exempel `50 % av max`
  - valfri kort coachtext
- spelaren ska inte logga vanliga set i dessa övningar, utan markera steg för steg att blocken är genomförda
- tränaren ska kunna se både helheten och delstegen i historiken

Förslag på datamodell:

- `exercise_protocols`
  - kopplas till en övning
  - beskriver vilket protokoll övningen använder
- `exercise_protocol_steps`
  - lagrar alla steg i rätt ordning
  - exempel:
    - steg 1: `15 skott`, `50 %`
    - steg 2: `10 skott`, `70 %`
    - steg 3: `5 skott`, `90 %`
- `workout_log_protocol_steps`
  - lagrar vad spelaren faktiskt genomförde
  - kan senare innehålla:
    - slutfört / ej slutfört
    - faktisk mängd
    - kommentar
    - känning / smärta / avbrott

Förslag på UI:

- i passbyggaren väljer tränaren en protokollövning precis som en vanlig övning
- i spelarvyn visas övningen som en lista av steg i stället för vanliga setkort
- varje steg ska kunna markeras som klart
- det ska gå att skriva en kort kommentar för hela protokollet
- i tränarhistoriken ska protokollet gå att öppna och läsa rad för rad

Möjliga delar:

- egna step-tabeller för protokollövningar
- flera fasta steg per övning, till exempel:
  - `15 skott @ 50 %`
  - `10 skott @ 70 %`
  - `5 skott @ 90 %`
- särskild loggning per steg istället för vanlig set-logik
- stöd för att markera steg som genomförda, avbrutna eller anpassade
- tydlig historik för hela protokollet och dess delsteg
- möjlighet att återanvända samma motor för kastprogram, rehab, screening och andra strukturerade block

Syfte:

- ge bättre stöd för övningar med fasta delmoment
- undvika att pressa in protokollövningar i en modell som egentligen är byggd för vanliga gymövningar
- skapa en framtidssäker grund om appen senare ska hantera fler specialflöden

Övningar där detta skulle vara användbart:

- `Kastprogram nivå A`
- `Kastprogram nivå B`
- `Kastprogram nivå C`
- `Kastprogram nivå D`
- framtida axelrehab där en övning innehåller flera nivåer eller block i följd
- framtida knärehab där spelaren ska genomföra ett bestämt antal fasta moment i ordning
- screening- eller testflöden där tränaren vill att spelaren går igenom ett antal fördefinierade steg
- uppvärmningsprotokoll med fasta stationer eller block

Övningar där det normalt inte behövs:

- vanliga gymövningar som knäböj, bänkpress, chins och militärpress
- vanliga tidsövningar som plankan eller wall sit
- vanliga HRG-övningar där spelaren bara ska hålla tid eller göra ett enkelt antal per sida

Varför det är bra på sikt:

- det gör att appen kan hantera både vanliga övningar och mer strukturerade rehab-/kastflöden utan att UX känns konstig
- det öppnar för tydligare historik och analys även för övningar som inte passar i set/reps-modellen
- det gör det lättare att senare lägga till fler specialflöden utan att behöva hårdkoda varje ny övning separat

Notis:

- på kort sikt kör vi nivå 2 för kastprogrammet, alltså samma kategori men med särskild logiktyp i appen
- på längre sikt bör detta utvecklas vidare till en full protokollmotor med egna step-tabeller

### Träningskalender och veckoplan

Idé: ge spelare och tränare en enkel kalender- eller veckovy för planerade pass.

Möjliga delar:

- visa veckans planerade pass
- koppla pass till datum
- markera vad som är genomfört, missat eller kommande
- kombinera gym, löpning och senare handbollspass i samma vy

Syfte:

- ge bättre överblick över träningsveckan
- hjälpa spelaren att planera sin träning
- hjälpa tränaren att styra belastningen över tid

### Belastningsöversikt

Idé: ge tränaren en enkel totalbild av träningsbelastning på individ- och lagnivå.

Möjliga delar:

- antal genomförda pass per vecka
- fördelning mellan gym, löpning och handboll
- enkel indikator för låg, normal eller hög belastning
- överblick över vilka spelare som ligger långt över eller under plan

Syfte:

- få en snabb bild av träningsmängd
- skapa bättre balans mellan olika typer av träning
- minska risken för att spelare hamnar för långt efter eller tränar för hårt

### Rehab- och individspår

Idé: låta vissa spelare följa ett särskilt upplägg vid rehab, återgång eller individuell anpassning.

Möjliga delar:

- markera spelare som rehabspelare eller individspår
- ge dem egna pass eller övningsblock
- skilja deras plan från lagets standardupplägg
- låta tränare följa progression separat

Syfte:

- hantera spelare som inte ska följa lagets normala plan fullt ut
- göra appen användbar även vid återgång efter skada
- öka värdet för tränare i verkliga vardagssituationer

### Coachnoteringar efter genomfört pass

Idé: låta tränaren lämna en kort kommentar efter att ha tittat på ett genomfört pass.

Möjliga delar:

- tränaren kan skriva en kort notering på passnivå
- kommentaren kopplas till ett genomfört pass eller en specifik övning
- spelaren ser noteringen i sin historik eller nästa gång övningen visas

Syfte:

- skapa ett tydligare återkopplingsflöde
- göra historiken mer användbar än bara siffror
- förstärka tränarens roll som coach, inte bara administratör

### Passmallar per period

Idé: skapa träningsupplägg som hör till olika delar av säsongen.

Möjliga delar:

- mallar för försäsong, säsong, matchvecka och återhämtningsvecka
- snabb växling mellan olika typer av upplägg
- tydlig koppling mellan träningsperiod och val av pass

Syfte:

- göra programstyrningen mer praktisk
- hjälpa tränaren att tänka i perioder, inte bara enskilda pass

### Delade tränarbibliotek

Idé: låta tränare dela övningar, pass och mallar med varandra inom laget eller föreningen.

Möjliga delar:

- dela passmallar mellan tränare
- dela handbollspass, fysupplägg och övningsbank
- markera rekommenderade eller gemensamma mallar

Syfte:

- minska dubbelarbete
- skapa en mer gemensam träningsstruktur i föreningen
- göra appen mer värdefull för flera ledare samtidigt
