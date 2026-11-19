<p align="center">
  <a href="../README.md">English</a> | <a href="README.zh.md">简体中文</a> | <a href="README.zht.md">繁體中文</a> | <a href="README.ko.md">한국어</a> | <a href="README.de.md">Deutsch</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.it.md">Italiano</a> | <a href="README.da.md">Dansk</a> | <a href="README.ja.md">日本語</a> | <a href="README.pl.md">Polski</a> | <a href="README.ru.md">Русский</a> | <a href="README.bs.md">Bosanski</a> | <a href="README.ar.md">العربية</a> | Norsk | <a href="README.br.md">Português (Brasil)</a> | <a href="README.th.md">ไทย</a> | <a href="README.tr.md">Türkçe</a> | <a href="README.uk.md">Українська</a> | <a href="README.bn.md">বাংলা</a> | <a href="README.gr.md">Ελληνικά</a> | <a href="README.vi.md">Tiếng Việt</a>
</p>

<p align="center">
  <a href="https://qronos.me"><img width="250" alt="Qronos Code logo" src="https://github.com/user-attachments/assets/bdb0c174-b9fd-40ad-a47b-f3aab9b54e8d" /></a>
</p>

<p align="center">Den åpne kildekodeagenten for å bygge med AI i VS Code, JetBrains eller CLI.</p>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=qronos.Qronos-Code"><img src="https://raster.shields.io/badge/VS_Code_Marketplace-007ACC?style=flat&logo=visualstudiocode&logoColor=white" alt="VS Code Marketplace" height="20"></a>
  <a href="https://www.npmjs.com/package/@qronos-ai/cli"><img alt="npm" src="https://raster.shields.io/npm/v/@qronos-ai/cli?style=flat" height="20" /></a>
  <a href="https://x.com/qronos"><img src="https://raster.shields.io/badge/qronos-000000?style=flat&logo=x&logoColor=white" alt="X (Twitter)" height="20"></a>
  <a href="https://blog.qronos.me"><img src="https://raster.shields.io/badge/Blog-555?style=flat&logo=substack&logoColor=white" alt="Blog" height="20"></a>
  <a href="https://qronos.me/discord"><img src="https://raster.shields.io/badge/Join%20Discord-5865F2?style=flat&logo=discord&logoColor=white" alt="Discord" height="20"></a>
  <a href="https://www.reddit.com/r/qronos/"><img src="https://raster.shields.io/badge/Join%20r%2Fqronos-D84315?style=flat&logo=reddit&logoColor=white" alt="Reddit" height="20"></a>
</p>

![Qronos-in-VS-Code-and-CLI](https://github.com/user-attachments/assets/0536ca59-ed81-4512-9e05-d186187a1b52)

---

Qronos Code er en AI-kodeagent som møter deg overalt du jobber: [VS Code](https://qronos.me/landing/vs-code), [JetBrains](https://qronos.me/features/jetbrains-native) og [CLI](https://qronos.me/cli). Den er åpen kildekode med åpen prising. Du velger blant mer enn 500 modeller, bytter mellom dem midt i en oppgave og betaler modellleverandørens pris uten påslag. Ingen API-nøkler kreves for å starte.

### Installasjon

Velg hvor du vil kjøre Qronos.

<details open>
<summary><strong>VS Code</strong></summary>

<br>

Installer [Qronos Code-utvidelsen](vscode:extension/qronos.qronos-code) direkte, eller hent den fra [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=qronos.Qronos-Code). Opprett en konto, og du får tilgang til mer enn 500 modeller, inkludert GPT-5.5, Claude Opus 4.7, Claude Sonnet 4.6 og Gemini 3.1 Pro Preview, alle til leverandørpris.

</details>

<details open>
<summary><strong>CLI</strong></summary>

<br>

```bash
# npm
npm install -g @qronos-ai/cli

# curl
curl -fsSL https://qronos.me/cli/install | bash

# pnpm
pnpm add -g @qronos-ai/cli

# bun
bun add -g @qronos-ai/cli

# Homebrew (macOS / Linux)
brew install Qronos-Org/tap/qronos

# Arch Linux (AUR)
paru -S qronos-bin
```

Kjør deretter `qronos` i en prosjektmappe for å starte.

</details>

<details>
<summary><strong>JetBrains</strong></summary>

<br>

Installer [Qronos Code-pluginen](https://plugins.jetbrains.com/plugin/28350-qronos-code) fra JetBrains Marketplace, eller søk etter "Qronos Code" i `Settings → Plugins` i en JetBrains IDE.

</details>

<details>
<summary><strong>Cloud Agent</strong></summary>

<br>

Kjør Qronos fra nettet, uten lokal maskin, på [app.qronos.ai/cloud](https://qronos.me/cloud).

</details>

<details>
<summary><strong>Kodegjennomganger</strong></summary>

<br>

Sett opp automatiske AI-kodegjennomganger på pull requestene dine på [app.qronos.ai/code-reviews](https://qronos.me/code-reviews).

</details>

<details>
<summary>Installer CLI fra GitHub Releases (binærfiler)</summary>

Last ned den nyeste binærfilen fra [Releases-siden](https://github.com/Qronos-Org/qronos/releases).

| Plattform | Asset |
|---|---|
| Windows (de fleste PC-er) | `qronos-windows-x64.zip` |
| macOS (Apple Silicon) | `qronos-darwin-arm64.zip` |
| macOS (Intel) | `qronos-darwin-x64.zip` |
| Linux x64 | `qronos-linux-x64.tar.gz` |
| Linux ARM | `qronos-linux-arm64.tar.gz` |

Merknader: `x64-baseline` er en kompatibilitetsbygg for eldre CPU-er uten AVX. `musl` er den statisk lenkede byggen for Alpine eller minimale Docker-bilder uten glibc. `qronos-vscode-*.vsix` er VS Code-utvidelsespakken, ikke CLI-en. `Source code`-arkiver er for bygging fra kildekode.

</details>

### Agents

Qronos leveres med spesialiserte agents du kan bytte mellom avhengig av oppgaven. Du kan også bygge dine egne egendefinerte agents.

- **Code** - Standard. Implementerer og redigerer kode fra naturlig språk.
- **Plan** - Designer arkitektur og skriver implementeringsplaner før kode skrives.
- **Ask** - Svarer på spørsmål om kodebasen uten å endre filer.
- **Debug** - Feilsøker og sporer problemer.
- **Review** - Gjennomgår endringene dine og finner problemer med ytelse, sikkerhet, stil og testdekning.

Les mer om [agents og egendefinerte agents](https://qronos.me/docs/code-with-ai/agents/using-agents).

### Hva den gjør

- **Kodegenerering** fra naturlig språk, på tvers av flere filer.
- **Inline-autofullføring** med ghost-text-forslag og Tab for å godta.
- **Selvsjekking** slik at agenten vurderer og retter sitt eget arbeid.
- **Terminal- og nettleserkontroll** for å kjøre kommandoer og automatisere nettet.
- **MCP-markedsplass** for å finne og koble til MCP-servere som utvider hva agenten kan gjøre.
- **Mer enn 500 modeller** med bytte midt i oppgaven, slik at du kan matche latenstid, kostnad og resonnering til jobben.

### Autonom modus (CI/CD)

Kjør `qronos run` med `--auto` for helt autonom drift uten spørsmål, bygget for CI/CD-pipelines:

```bash
qronos run --auto "run tests and fix any failures"
```

`--auto` deaktiverer alle tillatelsesspørsmål og lar agenten utføre enhver handling uten bekreftelse. Bruk det bare i betrodde miljøer.

### Dokumentasjon

For konfigurasjon og alt annet, se [dokumentasjonen](https://qronos.me/docs).

### Bidra

Bidrag er velkomne fra utviklere, skribenter og alle andre. Start med [Contributing Guide](/CONTRIBUTING.md) for miljøoppsett, kodestandarder og hvordan du åpner en pull request. Se [RELEASING.md](../RELEASING.md) for releaseprosessen for VS Code-utvidelsen og CLI-en, og [packages/jetbrains/RELEASING.md](../packages/jetbrains/RELEASING.md) for JetBrains-pluginen.

Les vår [Code of Conduct](/CODE_OF_CONDUCT.md) før du deltar.

### Lisens

MIT. Du kan bruke, endre og distribuere denne koden, også kommersielt, så lenge du beholder attribusjons- og lisensmerknadene. Se [License](/LICENSE).

### FAQ

<details>
<summary>Hvor kommer Qronos CLI fra?</summary>

Qronos CLI er en fork av [Qronos](https://github.com/anomalyco/qronos), forbedret for å fungere i Qronos agentic engineering-plattformen.

</details>

---

**Bli med i fellesskapet** [Discord](https://qronos.me/discord) | [X](https://x.com/qronos) | [Reddit](https://www.reddit.com/r/qronos/)
