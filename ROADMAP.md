# Träningsapp Roadmap

## Nuvarande läge

Appen har nu lämnat det tidiga prototypläget och fungerar i praktiken som en första riktig produkt för spelare, tränare och huvudadmin.

Det som är byggt idag är starkare än den äldre roadmapen beskrev:

- spelare kan genomföra pass, logga resultat, se historik och statistik
- tränare kan bygga och redigera pass, tilldela pass, följa aktivitet och analysera utveckling
- huvudadmin kan hantera användare, lag, feedback och övningsbank
- stora delar av träningsstrukturen är datadriven via Supabase
- mobilanpassning, bottennavigation och UX-arbete är redan långt komna

Den bästa beskrivningen av nuläget är därför:

- Fas 1, 2 och 3 är klara
- Fas 3.5 är i praktiken genomförd
- Fas 4 är till stor del klar
- Fas 5 är påbörjad och används i verkliga flöden
- Fas 6 är aktiv
- Fas 7 pågår parallellt hela tiden

Det betyder att projektet nu bör styras mindre som "bygg fler grundfunktioner" och mer som:

1. stabilisera
2. förfina kärnflöden
3. testa i verklig användning
4. bygga nästa smarta lager ovanpå en stabil kärna

---

## Fas 1 - MVP

Status: Klar

- Starta och avsluta pass
- Logga set, reps och vikt
- Spara genomförda pass
- Visa senaste pass
- Stöd för pass A / B / C
- Infobox och uppvärmning
- Första användbara spelarflödet

---

## Fas 2 - Struktur och användare

Status: Klar

- Inloggning via Supabase Auth
- Roller för spelare, tränare och huvudadmin
- Data kopplad till rätt användare
- Edge functions för användarhantering
- Deployad app

---

## Fas 3 - Coachvy

Status: Klar

- Lista över spelare
- Spelardetaljer
- Kommentarer per spelare
- Översikt över senaste pass och aktivitet
- Grundläggande coachverktyg för vardagen

Bedömning:
Coachdelen är inte längre ett experiment, utan en faktisk arbetsyta.

---

## Fas 3.5 - Individuell tränarstyrning

Status: I praktiken genomförd

- individuella mål per spelare och övning
- mål för set, reps, vikt och kommentar
- historik som stöd för att sätta mål
- spelaren kan se vad som ska köras och vad som kördes senast
- möjlighet att använda historik som rekommendationsgrund när individuella mål inte används

Kvar att förbättra:

- tydligare logik för målvikter per repetitionsintervall
- ännu bättre koppling mellan coachmål och spelarvy
- framtida regelmotor för rekommenderad progression

---

## Fas 4 - Datamodell och träningsstruktur

Status: Till stor del klar

- tabell för övningar
- tabell för passmallar
- koppling mellan pass och övningar
- koppling mellan spelare och pass
- datadriven passbyggare
- övningsbank med kategorier, media och beskrivningar
- stöd för rep range, tidsbaserade övningar och execution side

Kvar att säkra:

- full konsistens mellan frontendlogik och Supabase-migrationer
- fortsatt härdning av passbuilder vid framtida ändringar

---

## Fas 5 - Program och tilldelning

Status: Påbörjad

- tränare kan bygga pass
- tränare kan redigera pass
- tränare kan tilldela pass till spelare
- tränare kan tilldela pass direkt från pass-sidan
- individuell styrning kan kombineras med tilldelade pass

Kvar i fasen:

- tydligare programnivå ovanpå enskilda pass
- enklare bulkhantering för grupper
- mer komplett programmotor snarare än bara passhantering

---

## Fas 6 - Uppföljning och analys

Status: Aktiv

- historik per spelare
- historik per övning
- tränarstatistik
- aktivitetsflöde
- viktutveckling i graf
- filter för spelare, övning och period
- löppass som egen del av historik och statistik

Kvar i fasen:

- bättre jämförelse över tid
- fler progressionsmått än vikt
- tydligare analys för både tränare och spelare

---

## Fas 7 - UX och kvalitet

Status: Pågår parallellt

- mobiloptimering
- bottennavigation
- tydligare tränar-, spelar- och adminvyer
- bättre feedback-, loading- och empty states
- kompaktare och renare undersidor
- förbättrad passbuilder-UX
- tydligare historikvyer
- bättre arbetsflöde för feedback via fil + databas

Kvar i fasen:

- fortsatt polish av kärnflöden
- färre edge cases i passbuilder
- ännu mer konsekvent design mellan alla roller

---

## Plan framåt

### Spår A - Stabilisering

Detta bör vara högst prioriterat just nu.

- säkra att passbuilder alltid sparar rätt
- hålla Supabase-schema och frontend helt i synk
- minska risk för regressionsfel i coachflöden
- säkra att feedback, meddelanden, lösenord och användarhantering fungerar stabilt

Mål:
Produkten ska kännas trygg att använda i verkligheten.

### Spår B - Kärnupplevelse

När stabiliteten är god ska fokus ligga på det som används mest.

- tränarens flöde för spelare, pass, aktivitet och statistik
- spelarens flöde för att starta pass, förstå övningar, logga snabbt och följa utveckling
- huvudadmins flöde för användare, lag, övningar och feedback

Mål:
Det viktigaste ska gå snabbt, tydligt och snyggt på mobil.

### Spår C - Pilot och verklig användning

- testa med riktiga tränare och spelare
- samla feedback via appen
- jobba av öppna poster strukturerat
- justera prioriteringar utifrån faktisk användning

Mål:
Låta verkligt beteende styra nästa steg, inte bara idéer.

### Spår D - Nästa produktlyft

När kärnan känns stabil är nästa stora värde troligen:

- bättre analys och jämförelse över tid
- smartare import- och adminflöden
- tydligare programnivå
- deterministisk rekommendationsmotor för progression

---

## Nästa 2 veckor

Rekommenderat fokus:

1. stabilisera passbuilder och pass-sparning
2. säkra att alla relevanta Supabase-migrationer är i synk
3. fortsätta förbättra tränarens aktivitet-, statistik- och passflöden
4. jobba strukturerat igenom öppna poster i `FEEDBACK.md`

---

## Nästa månad

Om stabiliseringen går bra:

1. förbättra jämförelse över tid i statistik
2. förenkla import och undvik dubletter
3. börja specificera programmotor tydligare
4. utvärdera nuvarande rep range utifrån spelarnas historik och samtal med andra tränare om vilka intervall de faktiskt använder i sina pass
5. bryt ut och planera den deterministiska rekommendationsmotorn som nästa större system

---

## Långsiktiga idéer

- deterministisk rekommendationsmotor
- notifikationer
- närvaro och träningsfrekvens
- lagöversikter
- säsongssammanställningar
- träningskalender
- API eller export

Se även `FUTURE_FEATURES.md` för idéer som ännu inte ska in i den aktiva roadmapen.

---

## Kort sammanfattning

Projektet är inte längre i ett läge där grundfunktioner saknas.

Det är i stället i detta läge:

- kärnan fungerar
- produkten används
- nästa stora värde ligger i stabilitet, polish och verklig användbarhet
- därefter kommer smartare analys, programstyrning och rekommendationslogik

Den viktigaste principen framåt är därför:

Bygg inte snabbast möjligt.
Bygg så att det håller när riktiga tränare och spelare använder appen ofta.
