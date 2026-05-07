# How To

Det här dokumentet beskriver vanliga arbetsflöden i `PaperclipDesktop`.

## Skapa ditt första företag

Om du redan har gått igenom första installationsguiden kan du senare skapa fler företag från appen.

1. Öppna huvudfönstret i `PaperclipDesktop`.
2. Skapa ett nytt företag via företagsguiden.
3. Välj mall, till exempel `Software Company`.
4. Justera roller, modell och instruktioner.
5. Slutför guiden och öppna företagets dashboard.

Företagsfilerna sparas i:

```text
~/Documents/Paperclip Desktop/Companies/
```

Det gör att du kan lägga till underlag, dokument och andra filer direkt i Finder.

## Hitta och hantera filer i Finder

För att öppna arbetsytan:

1. Gå till `Settings -> Advanced`.
2. Under `Workspace`, klicka `Open Workspace in Finder`.

Där hittar du:

- en mapp per företag
- agentinstruktioner
- en `Files/`-mapp för vanliga användarfiler

Det här är tänkt att vara den synliga, normala filytan för användaren. Den privata runtime-miljön ligger separat i `Application Support`.

## Starta, stoppa och läsa serverloggar

Gå till `Settings -> Server`.

Du kan där:

- starta servern
- stoppa servern
- starta om servern
- ändra port
- läsa loggutdata från Paperclip-processen

Om du ser att servern redan fungerar i webbläsaren på `127.0.0.1:3100`, men inte i appen, är det oftast status- eller inbäddningslagret som behöver ses över, inte själva Paperclip-backenden.

## Aktivera lokal Gemma 4

Gå till `Settings -> Models`.

1. Slå på `Enable local Gemma 4 runtime`.
2. Välj hur mycket minne som får användas.
3. Tryck `Use Recommended Gemma 4` om du vill låta appen välja en bra modell.
4. Välj om lokal modell ska vara standard för nya agenter.
5. Välj om modellen får laddas ner automatiskt.

När du sedan trycker `Download / Prepare Model` gör appen följande:

1. kontrollerar om Ollama finns
2. installerar Ollama automatiskt om det saknas
3. startar Ollama lokalt
4. laddar ner vald Gemma 4-modell
5. förbereder Paperclip att prata med Ollama via OpenAI-kompatibelt API

## Uppdatera Ollama

Gå till `Settings -> Models`.

Det finns nu ett enkelt uppdateringsflöde:

1. Klicka `Check Ollama Update`.
2. Granska installerad version och senaste kontrollerade release.
3. Klicka `Update Ollama` om en ny version finns.

Appen installerar Ollama i:

```text
~/Applications/Ollama.app
```

Det här gör att appen kan hantera installation och uppdatering utan att användaren behöver jobba manuellt i Terminal.

## Uppdatera Paperclip-koden från GitHub

Gå till `Settings -> Advanced`.

Under `Upstream GitHub` kan du:

1. klicka `Check for Upstream Update`
2. se senaste commit från `paperclipai/paperclip`
3. klicka `Install Latest from GitHub`

Appen laddar då ner den senaste Paperclip-snapshoten och installerar den utan att skriva över din lokala data-mapp.

## Installera om den version som följer med appen

Om du vill gå tillbaka till den Paperclip-version som är bundlad med just den här appbuilden:

1. Gå till `Settings -> Advanced`.
2. Under `Bundled Runtime`, klicka på installationsknappen.

Det här är användbart om du har testat en nyare GitHub-version och vill återgå till den snapshot som appen levererade med.

## Felsökning

### Appen startar men dashboarden visas inte

- kontrollera `Settings -> Server`
- kontrollera loggarna i samma vy
- kontrollera att ingen annan extern process redan använder samma port

### Lokal Gemma 4 blir inte redo

- kontrollera Ollama-status i `Settings -> Models`
- kör `Check Ollama Update`
- kör `Download / Prepare Model` igen
- prova en mindre Gemma 4-modell om minnesbudgeten är för låg

### Jag vill återställa orienteringen

Börja här:

1. `Settings -> Server` för driftstatus
2. `Settings -> Models` för Ollama och Gemma 4
3. `Settings -> Advanced` för runtime-versioner och Finder-öppning
