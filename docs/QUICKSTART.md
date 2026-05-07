# Quick Start

Det här dokumentet är den snabbaste vägen till en fungerande `PaperclipDesktop` i projektets nuvarande läge.

## Vad du får

- en macOS-app som startar den riktiga Paperclip-servern lokalt
- ett inbyggt webbgränssnitt mot `localhost`
- stöd för API-nycklar via appen i stället för `.env`
- möjlighet att använda lokal Gemma 4 via Ollama

## Förutsättningar

- macOS 14 eller senare
- Swift toolchain som kan bygga paketet
- nätverksåtkomst första gången så att Paperclip/Ollama kan hämta det som behövs

## Starta appen

Från projektets rot:

```bash
./script/build_and_run.sh
```

Det här bygger `PaperclipDesktop` och startar appen.

## Första uppstarten

När appen öppnas visas installationsguiden.

1. Fyll i minst en API-nyckel under `API Keys`.
2. Välj standardmodell under modellsteget.
3. Ange företagsnamn och mål.
4. Tryck `Launch`.

Appen gör sedan detta åt dig:

1. installerar eller synkar Paperclip-koden till `~/Library/Application Support/PaperclipDesktop/`
2. skriver runtime-konfiguration
3. kör onboard-flödet
4. startar Paperclip-servern
5. laddar dashboarden i appen

## Om du vill köra lokalt med Gemma 4

Gå till `Settings -> Models`.

1. Slå på `Enable local Gemma 4 runtime`.
2. Välj minnesbudget.
3. Tryck gärna `Use Recommended Gemma 4`.
4. Tryck `Download / Prepare Model`.

Om Ollama inte redan finns installerat försöker appen installera det automatiskt först. Sedan laddas vald Gemma 4-modell ner.

## Var finns dina filer?

- användarfiler: `~/Documents/Paperclip Desktop/Companies/`
- privat runtime-data: `~/Library/Application Support/PaperclipDesktop/`

Under varje företag finns en `Files/`-mapp som går att använda direkt i Finder.

## Vanliga första kontroller

- Om dashboarden inte laddar: gå till `Settings -> Server` och kontrollera status och loggar.
- Om lokal modell inte går igång: gå till `Settings -> Models` och kontrollera Ollama-status.
- Om du vill se arbetsytan i Finder: gå till `Settings -> Advanced -> Open Workspace in Finder`.
