# TrainingApp

Träningsapp för förening/lag med roller för spelare och tränare, med fokus på träningsloggning, coachöversikt och framtida programstyrning.

---

## Översikt

Detta dokument beskriver den ursprungliga produkt-roadmapen för appen, uppdelad i faser från MVP till mer avancerade funktioner för tränare, programstyrning, analys och kvalitet.

Roadmapen ska ses som en produktplan, inte bara en teknisk lista över enskilda features. Syftet är att tydligt visa:

- vad som redan är byggt
- var appen befinner sig nu
- vilka större produktsteg som återstår
- vilken riktning som ger mest värde framåt

---

## ROADMAP

### Fas 1 – MVP (KLAR)

Grundfunktionalitet för spelare.

Mål:
Bygga en första användbar version där spelaren kan genomföra och logga sina träningspass.

Omfattning:

- Starta pass
- Avsluta pass
- Logga set, reps och vikt
- Spara genomförda pass
- Visa senaste pass
- Stöd för pass A / B / C
- Infobox för övningar
- Uppvärmningsdel
- Enkel men fungerande UX

Kommentar:
Denna fas handlade om att få en faktisk träningsdagbok att fungera i praktiken. Fokus låg på att spelaren skulle kunna använda appen utan att tränardelen ännu var fullt utbyggd.

---

### Fas 2 – Struktur och användare (KLAR)

Appen går från enkel prototyp till riktig produktstruktur.

Mål:
Införa användarhantering, roller och datakoppling per användare.

Omfattning:

- Inloggning via Supabase Auth
- Spelarkonton
- Roller, exempelvis:
  - player
  - coach
- Data kopplad till rätt användare
- Edge function för att skapa spelare
- Live deploy

Kommentar:
I denna fas byggdes grunden för att flera användare ska kunna använda appen samtidigt, med rättigheter och separerad data.

---

### Fas 3 – Coachvy (KLAR / NÄSTAN KLAR)

Första riktiga verktyget för tränare.

Mål:
Ge tränare en fungerande översikt över spelare och träningsaktivitet.

Omfattning:

- Skapa spelare
- Visa lista över spelare
- Tabellvy med exempelvis:
  - username
  - namn
  - statistik
- Visa senaste pass per spelare
- Visa totalt antal pass
- Klicka på spelare för detaljvy
- Kommentar per spelare som kan redigeras

Kommentar:
Denna fas gör appen användbar även för tränaren, inte bara spelaren. Fokus ligger på överblick och enkel uppföljning.

Statusbedömning:
Funktionell och användbar.

---

### Fas 3.5 – Individuell tränarstyrning (NÄSTA STORA STEG)

Mål:
Göra appen verkligt värdefull för tränare genom att låta dem styra innehåll och mål på individnivå.

Detta ska byggas innan full programmotor byggs ut.

Omfattning:

- Sätta individuella mål per spelare och per övning
- Mål ska kunna innehålla:
  - set
  - reps
  - vikt
  - kommentar / teknik-cue / coaching note
- Spelaren ska kunna se:
  - vad den ska köra
  - vad den körde senast

Syfte:
Denna fas är viktig eftersom den för in verklig tränarstyrning i produkten. Appen går då från att främst vara en loggbok till att bli ett faktiskt coachverktyg.

Varför denna fas är viktig:

- Ger direkt nytta för laget
- Gör produkten mer unik
- Sätter rätt struktur inför senare programtilldelning
- Testar tidigt hur individanpassning ska fungera i datamodell och UI

---

### Fas 4 – Datamodell och träningsstruktur

Förberedelse för skalning.

Mål:
Flytta mer av träningsstrukturen från hårdkodad logik i frontend till datamodell i databasen.

Omfattning:

- Tabell för övningar
- Tabell för passmallar, exempelvis A / B / C
- Koppling mellan pass och övningar
- Koppling mellan spelare och pass

Syfte:
Det är här appen på riktigt börjar lämna hardcoded workouts i koden. Målet är att träningsinnehållet ska bli datadrivet.

Kommentar:
Denna fas lägger grunden för att tränare senare ska kunna skapa, ändra och tilldela träningsupplägg utan att behöva ändra kod.

---

### Fas 5 – Program och tilldelning

Mål:
Bygga ett riktigt system för att skapa och tilldela träningsprogram.

Omfattning:

- Skapa program
- Tilldela program till spelare
- Anpassa program per individ
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

- Historik per övning
- Progression i graf
- Filter, till exempel:
  - övning
  - period
  - spelare
- Jämförelse över tid

Syfte:
Denna fas gör att både spelare och tränare kan följa utveckling på ett tydligare sätt.

Kommentar:
Här börjar appen ge mer analytiskt värde och inte bara fungera som loggbok och planeringsverktyg.

---

### Fas 7 – UX och kvalitet

Mål:
Förbättra användarupplevelse, tydlighet och robusthet.

Omfattning:

- Färgkodning för exempelvis aktiv / inaktiv spelare
- Sortering i tabeller
- Snabb navigation
- Mobiloptimering
- Feedback states:
  - loading
  - errors
  - empty states

Syfte:
Göra appen mer stabil, snabb att använda och tydligare i verklig vardag.

Kommentar:
Denna fas kan pågå parallellt med andra faser, men bör inte ta fokus från större produktfunktioner för tidigt.

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

Appen befinner sig efter Fas 3 och inför Fas 3.5.

Det betyder:

- grunden är klar
- användarhantering är på plats
- coachvyn är i funktion
- nästa steg är att bygga individstyrning för tränare

Detta är den punkt där appen börjar gå från fungerande verktyg till verkligt värdefull produkt för tränare och lag.

---

## Rekommenderat nästa steg enligt denna roadmap

Börja med Fas 3.5 – Individuell tränarstyrning.

Rekommenderad första leverans:

- tränare kan välja en spelare
- tränare kan ange mål för en övning
- spelaren kan se sitt mål i appen
- spelaren kan jämföra målet med senaste utförandet

Detta ger hög produktnytta och hjälper samtidigt till att forma rätt datamodell för kommande faser.

---

## Sammanfattning

Roadmapen är uppbyggd i denna ordning:

1. MVP för spelare
2. Struktur och användare
3. Coachvy
4. Individuell tränarstyrning
5. Datamodell och träningsstruktur
6. Program och tilldelning
7. Uppföljning och analys
8. UX och kvalitet
9. Långsiktiga idéer

Grundtanken är att först skapa en fungerande kärna, därefter ge tränaren verklig kontroll, och sedan bygga ut analys, programstyrning och kvalitet ovanpå den grunden.
