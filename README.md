# TrainingApp

Träningsapp för förening/lag med roller för spelare och tränare, med fokus på träningsloggning, coachöversikt och programstyrning.

---

## Översikt

Detta dokument beskriver produkt-roadmapen för appen, uppdelad i faser från MVP till mer avancerade funktioner för tränare, programstyrning, analys och kvalitet.

Roadmapen ska ses som en produktplan, inte bara en teknisk lista över enskilda features. Syftet är att tydligt visa:

- vad som redan är byggt
- var appen befinner sig nu
- vilka större produktsteg som återstår
- vilken riktning som ger mest värde framåt

---

## Designprincip

All UX i Starkare Gurra ska följa samma grundlogik i alla roller: spelare, tränare och admin.

- Kort, listposter och moduler ska öppnas inline i direkt anslutning till det användaren trycker på.
- Expanderat innehåll ska visas i samma kort eller direkt under samma rad, inte långt längre ner på sidan.
- Listor ska delas upp i tydliga sektioner efter typ, funktion eller träningskategori så att det snabbt går att förstå vad som hör ihop.
- På mobil får inget innehåll kräva sidscroll. Allt ska hålla sig inom skärmens bredd.
- Knappar, dropdowns, inputfält och expanderbara kort ska följa samma visuella logik i hela appen.
- Valfält och skrivfält ska se olika ut, så att användaren direkt förstår vad som är ett val och vad som ska fyllas i.

Kort sagt:
Appen ska kännas kompakt, tydlig, konsekvent och direkt responsiv oavsett vilken sida eller roll man är i.

---

## ROADMAP

### Fas 1 – MVP (KLAR)

Grundfunktionalitet för spelare.

Mål:
Bygga en första användbar version där spelaren kan genomföra och logga sina träningspass.

Omfattning:

- ~~Starta pass~~
- ~~Avsluta pass~~
- ~~Logga set, reps och vikt~~
- ~~Spara genomförda pass~~
- ~~Visa senaste pass~~
- ~~Stöd för pass A / B / C~~
- ~~Infobox för övningar~~
- ~~Uppvärmningsdel~~
- ~~Enkel men fungerande UX~~

Kommentar:
Denna fas handlade om att få en faktisk träningsdagbok att fungera i praktiken. Fokus låg på att spelaren skulle kunna använda appen utan att tränardelen ännu var fullt utbyggd.

---

### Fas 2 – Struktur och användare (KLAR)

Appen går från enkel prototyp till riktig produktstruktur.

Mål:
Införa användarhantering, roller och datakoppling per användare.

Omfattning:

- ~~Inloggning via Supabase Auth~~
- ~~Spelarkonton~~
- ~~Roller, exempelvis:~~
  - ~~player~~
  - ~~coach~~
- ~~head_admin kan ligga utanför vanlig lagkoppling~~
- ~~Data kopplad till rätt användare~~
- ~~Edge function för att skapa spelare~~
- ~~Live deploy~~

Kommentar:
I denna fas byggdes grunden för att flera användare ska kunna använda appen samtidigt, med rättigheter och separerad data.

---

### Fas 3 – Coachvy (KLAR)

Första riktiga verktyget för tränare.

Mål:
Ge tränare en fungerande översikt över spelare och träningsaktivitet.

Omfattning:

- ~~Skapa spelare~~
- ~~Visa lista över spelare~~
- ~~Tabellvy med exempelvis:~~
  - ~~username~~
  - ~~namn~~
  - ~~statistik~~
- ~~Visa senaste pass per spelare~~
- ~~Visa totalt antal pass~~
- ~~Klicka på spelare för detaljvy~~
- ~~Kommentar per spelare som kan redigeras~~

Kommentar:
Denna fas gör appen användbar även för tränaren, inte bara spelaren. Fokus ligger på överblick och enkel uppföljning.

Statusbedömning:
Funktionell och användbar.

---

### Fas 3.5 – Individuell tränarstyrning (I PRAKTIKEN GENOMFÖRD)

Mål:
Göra appen verkligt värdefull för tränare genom att låta dem styra innehåll och mål på individnivå.

Detta ska byggas innan full programmotor byggs ut.

Omfattning:

- ~~Sätta individuella mål per spelare och per övning~~
- ~~Mål ska kunna innehålla:~~
  - ~~set~~
  - ~~reps~~
  - ~~vikt~~
  - ~~kommentar / teknik-cue / coaching note~~
- ~~Spelaren ska kunna se:~~
  - ~~vad den ska köra~~
  - ~~vad den körde senast~~

Syfte:
Denna fas är viktig eftersom den för in verklig tränarstyrning i produkten. Appen går då från att främst vara en loggbok till att bli ett faktiskt coachverktyg.

Varför denna fas är viktig:

- ~~Ger direkt nytta för laget~~
- ~~Gör produkten mer unik~~
- ~~Sätter rätt struktur inför senare programtilldelning~~
- ~~Testar tidigt hur individanpassning ska fungera i datamodell och UI~~

---

### Fas 4 – Datamodell och träningsstruktur (TILL STOR DEL KLAR)

Förberedelse för skalning.

Mål:
Flytta mer av träningsstrukturen från hårdkodad logik i frontend till datamodell i databasen.

Omfattning:

- ~~Tabell för övningar~~
- ~~Tabell för passmallar, exempelvis A / B / C~~
- ~~Koppling mellan pass och övningar~~
- ~~Koppling mellan spelare och pass~~

Syfte:
Det är här appen på riktigt börjar lämna hardcoded workouts i koden. Målet är att träningsinnehållet ska bli datadrivet.

Kommentar:
Denna fas lägger grunden för att tränare senare ska kunna skapa, ändra och tilldela träningsupplägg utan att behöva ändra kod.

---

### Fas 5 – Program och tilldelning (PÅBÖRJAD)

Mål:
Bygga ett riktigt system för att skapa och tilldela träningsprogram.

Omfattning:

- ~~Skapa program~~
- ~~Tilldela program till spelare~~
- ~~Anpassa program per individ~~
- ~~Stöd för rep range, reps-text och tidsbaserade prescriptions i passdatamodellen~~
- Tränare ska kunna göra ändringar utan att ändra kod

Syfte:
I denna fas går appen från passhantering till faktisk programhantering.

Kommentar:
Här blir det möjligt att arbeta mer systematiskt med olika grupper, olika individer och olika träningsnivåer.

---

### Fas 6 – Uppföljning och analys

Mål:
Göra träningsdata användbar över tid.

Omfattning:

- ~~Grundläggande historik per övning i tränarvyn~~
- ~~Progression i graf för viktutveckling~~
- ~~Förstoringsläge för grafer med högre upplösning~~
- ~~Löppass kan loggas separat som intervaller eller distans~~
- ~~Tränare kan sätta personliga övningsmål direkt från spelarens historik~~
- ~~Spelare kan redigera datum på genomförda pass för retroaktiv loggning~~
- ~~Tränare kan skapa och tilldela löppass som egna pass~~
- ~~Individuella mål kan stängas av så rekommendationer bygger på historik~~
- Filter, till exempel:
  - ~~övning~~
  - ~~period~~
  - ~~spelare~~
- Jämförelse över tid

Syfte:
Denna fas gör att både spelare och tränare kan följa utveckling på ett tydligare sätt.

Kommentar:
Här börjar appen ge mer analytiskt värde och inte bara fungera som loggbok och planeringsverktyg.

---

### Fas 7 – UX och kvalitet (PÅGÅR PARALLELLT)

Mål:
Förbättra användarupplevelse, tydlighet och robusthet.

Omfattning:

- Färgkodning för exempelvis aktiv / inaktiv spelare
- Sortering i tabeller
- ~~Snabb navigation~~
- ~~Mobiloptimering~~
- ~~Feedback states:~~
  - ~~loading~~
  - ~~errors~~
  - ~~empty states~~
- ~~Kategoribaserad övningsbank~~
- ~~Kategoribaserat övningsval i passbyggaren~~
- ~~Expandering i övningsbanken visar alias, utförande och video/gif~~
- ~~Tydligare grafisk aktivering när spelaren startar ett pass, med egen träningsvy där uppvärmningen är första kortet~~
- ~~Head-admin kan ta bort lag när laget inte längre används~~
- ~~GDPR-sida i meny och konto~~
- ~~Arkivering av spelare med filter för att visa arkiverade~~
- ~~GDPR-säker radering av spelare via edge functions~~
- ~~Spelare kan ta bort sitt eget konto från Mitt konto~~
- ~~Stabiliserat auth-flöde för arkivering och radering av spelare~~
- ~~Förenklad tränarvy för rekommenderade vikter med ett valt pass i taget~~
- Snabbändring av `navigation_category` direkt i övningsbanken för `head_admin`
- Dublettskydd i importen

Syfte:
Göra appen mer stabil, snabb att använda och tydligare i verklig vardag.

Kommentar:
Denna fas pågår parallellt med andra faser och är nu en aktiv del av arbetet.

---

## Nästa tekniska produktlyft – PWA och intervalltimer (EFTER COACH-REDESIGN)

Mål:
Göra appen till en riktig installerbar PWA och bygga en intervalltimer för löppass som fungerar för både fasta tränarpass och spelarens egna intervallpass, med ljudsignaler som kan höras även när telefonen är låst.

Förutsättning innan arbetet startar:

- Den här satsningen väntar tills coachdelen också är ombyggd i `design/player-redesign-v1`
- Skälet är att fasta intervallpass och spelarens egna intervallpass ska byggas på samma nya struktur
- Ingen halvväg där spelaren får ny timer ovanpå gammal coachmodell

PWA-ombyggnad:

- Appen ska bli installerbar som PWA med:
  - `manifest.json`
  - service worker
  - app-shell
  - cache-strategi för grundresurser
- Ett separat device-/PWA-lager ska läggas till för:
  - `Media Session`
  - ljudsignaler
  - vibration där det stöds
  - `Wake Lock`
  - app resume / visibility / låsskärmsbeteende
- Ingen native-app i denna fas
- Låsskärmsmålet gäller installerad PWA, inte vanlig browserflik

Kodstruktur före timer:

- Spelarflödet ska brytas ut från `src/trainingApp.jsx` till egna moduler innan timer byggs in
- Minsta måluppdelning:
  - `src/player/*` för spelarens sidor och navigation
  - `src/player/workout/*` för aktivt gympass, aktivt löppass och avslutat pass
  - `src/running/*` för löppassmodell, summeringar och sessionslogik
  - `src/timers/*` för timer-engine och state machine
  - `src/app/device/*` för ljud, vibration, wake lock och mediasession
  - `src/services/*` för Supabase-anrop
- `TrainingApp` ska finnas kvar som toppcontainer för auth, profil och globala vyval

Ny intervallmodell:

- Dagens enkla intervallfält ska ersättas som huvudmodell med blockbaserat upplägg
- Ny struktur för intervallpass:
  - `blocks: [{ label, work_seconds, rest_seconds, repeats }]`
  - `set_rest_seconds`
  - `countdown_seconds`
- Gäller både:
  - fasta tränarskapade löppass
  - spelarens egna intervallpass
- Äldre intervallpass med `interval_time` + `intervals_count` ska konverteras vid läsning till ett enkelt blockprogram

Coachens fasta intervallpass:

- När coachdelen är redo ska coachen i design-branchen kunna bygga fasta intervallpass i blockform
- Byggaren ska stödja:
  - flera block
  - arbetstid
  - vilotid
  - repetitioner
  - längre setvila mellan block
  - total summering av tid och antal intervaller
- Detta ska ligga i coachens nya UI, inte i nuvarande gamla tränargränssnitt

Spelarens egna intervallpass:

- Spelaren ska kunna skapa egna återanvändbara intervallpass
- Egna pass ska kunna:
  - namnges
  - sparas
  - redigeras
  - återanvändas
  - startas direkt
- Egen intervallbyggare ska använda samma blockmodell som fasta pass

Aktiv intervalltimer:

- En separat intervallspelare ska byggas för `running_type = "intervals"`
- Den ska visa:
  - aktuell fas: `Nedräkning`, `Löp`, `Vila`, `Setvila`, `Paus`
  - stor återstående tid
  - blocknummer
  - repetitionsnummer
  - nästa fas
  - total progress genom passet
- Kontroller i v1:
  - `Starta`
  - `Pausa`
  - `Återuppta`
  - `Avsluta pass`
- Timer-engine ska bygga på absoluta tidsstämplar och återställning efter resume, inte bara `setInterval`

Ljud och låsskärm:

- Primär signalmodell:
  - ljud vid start av arbetsintervall
  - annan ljudsignal vid start av vila
  - avslutssignal när passet är klart
- Vibration körs parallellt där plattformen tillåter det, men är sekundär
- Låsskärmsstödet i v1 betyder:
  - passet ska kunna fortsätta ge hörbara signaler i installerad PWA
  - inte att hela UI:t måste leva på låsskärmen
- Ingen realtids-push per intervallskifte i v1

Lagring och historik:

- Stöd ska läggas till för blockprogram på mallnivå och exekveringsnivå
- Minsta nya fält/tabeller:
  - `workout_templates.running_interval_program jsonb`
  - spelarägda presets, till exempel `player_running_presets`
  - loggad körhistorik i `workout_logs`, till exempel:
    - `running_interval_execution jsonb`
    - `running_total_elapsed_seconds integer`
- Historiken ska kunna visa:
  - block
  - genomförda intervaller
  - total tid
  - om passet slutfördes eller avbröts

Testmål när arbetet väl startar:

- `npm run build` ska passera efter varje större delsteg
- Inga regressionsfel i `Hem`, `Pass`, `Kalender`, `Historik`, `Statistik`, `Meddelanden`, `Konto`
- Tränare ska kunna skapa fast intervallpass med flera block och spara/öppna det igen
- Spelare ska kunna skapa eget intervallpass, spara det och starta det senare
- Timer ska testas för:
  - nedräkning
  - arbetsfas
  - vilofas
  - setvila
  - paus mitt i pass
  - återuppta utan fel i tid/fas
  - avsluta som klart
  - avbryta tidigt med partial historik
- PWA/låsskärm ska testas genom att:
  - installera appen som PWA
  - starta intervallpass
  - låsa telefonen
  - verifiera att ljudsignaler hörs under passet på stödda enheter
  - kontrollera vibration där det stöds
- Äldre enkla intervallpass ska fortfarande gå att öppna och köra

Kommentar:
Detta är nästa större tekniska produktlyft, men det ska inte byggas innan coachdelen också är redo i design-branchen. Gympassens vilostoppklocka ingår inte i samma låsskärmssatsning.

---

## Långsiktiga idéer

Funktioner som inte behöver byggas tidigt, men som kan ge stort värde längre fram:

- Excel- eller CSV-import av spelare
- Notifikationer
- Närvaro och träningsfrekvens
- Lagöversikt
- API / export
- Historik och sammanställningar på lag- eller säsongsnivå
- Möjlighet att skapa och dela handbollspass mellan tränare
- Träningskalender
- Löpupplägg och konditionspass som del av appen

---

## Nuvarande position enligt denna roadmap

Appen befinner sig nu:

`I Fas 6`, med `Fas 7` aktiv parallellt.

Det betyder:

- Fas 1, 2 och 3 är klara
- Fas 3.5 är i praktiken genomförd
- Fas 4 är till stor del klar
- Fas 5 är påbörjad och används redan i viss form
- Fas 6 är påbörjad genom historik, progression, löppass och coachmål från historik
- Statistikvyn för tränare har nu spelarval i dropdown och en renare coachvy för spelarhantering
- Coachvyns spelarsida är också städad så att builden inte faller på parserfel i den nya pass- och målhanteringen
- Fas 7 pågår löpande genom förbättringar i övningsbank, passbyggare, integritet och datakvalitet

Detta är den punkt där appen redan är ett fungerande coachverktyg, men där nästa värde ligger i att göra programstyrningen smidigare och admin-flödena snabbare.

---

## Rekommenderat nästa steg enligt denna roadmap

Fortsätt i Fas 6 och Fas 7 med denna leverans:

- jämförelse över tid per spelare och övning
- fler progressionsmått än vikt, till exempel reps och tid
- snabbändring av `navigation_category` direkt i övningsbanken
- dublettskydd i importen via `external_id` eller `slug`

Detta ger hög nytta direkt, utan att byta produktspår.

---

## Sammanfattning

Roadmapen är nu i praktiken i denna ordning:

1. ~~MVP för spelare~~
2. ~~Struktur och användare~~
3. ~~Coachvy~~
4. ~~Individuell tränarstyrning~~
5. Program och tilldelning
6. Uppföljning och analys
7. UX och kvalitet
8. Långsiktiga idéer

Grundtanken är fortfarande densamma: först skapa en fungerande kärna, därefter ge tränaren verklig kontroll, och sedan bygga ut analys, programstyrning och kvalitet ovanpå den grunden.

---

## Driftnotering

Supabase används för auth, data och migrationsdriven utveckling.

I den här terminalmiljön går `npm run build` fortfarande inte att verifiera fullt på grund av ett miljöspecifikt `rolldown`/native binding-problem, så kodändringar har verifierats via kodgranskning och live-dataverifiering där det varit möjligt.
