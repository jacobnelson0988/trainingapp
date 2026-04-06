# TrainingApp

Träningsapp för förening/lag med roller för `player`, `coach` och `head_admin`.

## Nuvarande Status

Färdigt nu:
- Inloggning och rollstyrning via Supabase.
- Passbyggare och övningskopplingar.
- Övningsbank med create, edit, import och export för `head_admin`.
- Requests-flöde där tränare kan föreslå nya övningar.
- Kategoribaserad navigering i övningsbanken.
- Kategoribaserat övningsval i passbyggaren.
- Separat `navigation_category` för övningar, så `head_admin` kan styra var övningen visas utan att ändra `muscle_groups`.

Viktiga databasfält för övningsbanken:
- `muscle_groups`
- `aliases`
- `display_name`
- `primary_category`
- `navigation_category`

## Roadmap

Klart:
- Import/export av övningsbank som JSON.
- Städad live-övningsbank.
- Kategoriförsta navigation i övningsbanken.
- Kategoriförsta övningsval i passbyggaren.
- Permanent sparad navigationskategori i Supabase.

Pågående fokus:
- Finslipa kategoriflödets UX i både övningsbanken och passbyggaren.

Nästa steg:
1. Lägg till enkel snabbändring för `navigation_category` direkt från övningskort/lista, så `head_admin` slipper öppna full redigering för små flyttar.
2. Lägg till dublettskydd i importen med stabil nyckel som `external_id` eller `slug`, så stora importer kan köras om utan risk för dubletter.
3. Lägg till bättre testning/byggeverifiering i en miljö där Vite build fungerar utan det nuvarande `rolldown`-problemet.
4. Finslipa alternativövningar i passbyggaren så att även de kan få samma navigationsmönster vid behov.

## Rekommenderat Nästa Steg

Nästa steg jag rekommenderar att bygga nu är:

`Snabbändring av navigationskategori i övningsbanken`

Varför:
- `head_admin` kan redan styra kategori, men det kräver att öppna full redigering.
- Det här är den snabbaste förbättringen efter att kategoriarkitekturen nu är på plats.
- Det gör att banken blir lättare att finjustera när fler övningar läggs in.

Konkreta delsteg:
1. Lägg en liten dropdown eller snabbknapp direkt på övningskortet för `head_admin`.
2. Spara `navigation_category` utan att öppna hela edit-formuläret.
3. Uppdatera listan lokalt direkt efter ändring så att flytten känns omedelbar.
4. Behåll full edit-form som fallback för större ändringar.

## Driftnotering

Supabase-migrationer som nu används i projektet inkluderar bland annat:
- `primary_category`
- `navigation_category`

I den här terminalmiljön går `npm run build` fortfarande inte att verifiera fullt på grund av ett miljöspecifikt `rolldown`/native binding-problem, så kodändringar har verifierats via kodgranskning och live-dataverifiering där det varit möjligt.
