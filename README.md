# TrainingApp

Träningsapp för förening/lag med roller för `player`, `coach` och `head_admin`.

## Nuvarande Status

Färdigt nu:
- Inloggning och rollstyrning via Supabase.
- Passbyggare och övningskopplingar.
- Övningsbank med create, edit, import och export för `head_admin`.
- Requests-flöde där tränare kan föreslå nya övningar.
- Kategoribaserad navigering i övningsbanken.
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
- Permanent sparad navigationskategori i Supabase.

Pågående fokus:
- Finslipa UX i övningsbanken efter att kategorinavigationen nu finns på plats.

Nästa steg:
1. Lägg samma kategoribaserade övningsval i själva passbyggaren under `Välj övning`, så att användaren får samma navigationsmodell där som i övningsbanken.
2. Lägg till enkel dragning eller snabbändring för `navigation_category` direkt från övningskort/lista, så `head_admin` slipper öppna full redigering för små flyttar.
3. Lägg till dublettskydd i importen med stabil nyckel som `external_id` eller `slug`, så stora importer kan köras om utan risk för dubletter.
4. Lägg till bättre testning/byggeverifiering i en miljö där Vite build fungerar utan det nuvarande `rolldown`-problemet.

## Rekommenderat Nästa Steg

Nästa steg jag rekommenderar att bygga nu är:

`Kategoribaserat övningsval i passbyggaren`

Varför:
- Det är där navigeringsproblemet märks mest i vardagsflödet.
- Nu finns redan kategori-logiken och datamodellen i övningsbanken.
- Det ger konsekvent UX mellan adminflöde och coachflöde.

Konkreta delsteg:
1. Identifiera filen där `Välj övning` i passbyggaren renderas.
2. Byt första vyn från lång lista till kategorier.
3. Behåll global sök över alla övningar.
4. Använd `navigation_category` som primär källa och fallback till `muscle_groups`.

## Driftnotering

Supabase-migrationer som nu används i projektet inkluderar bland annat:
- `primary_category`
- `navigation_category`

I den här terminalmiljön går `npm run build` fortfarande inte att verifiera fullt på grund av ett miljöspecifikt `rolldown`/native binding-problem, så kodändringar har verifierats via kodgranskning och live-dataverifiering där det varit möjligt.
