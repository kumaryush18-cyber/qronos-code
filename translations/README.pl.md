<p align="center">
  <a href="../README.md">English</a> | <a href="README.zh.md">简体中文</a> | <a href="README.zht.md">繁體中文</a> | <a href="README.ko.md">한국어</a> | <a href="README.de.md">Deutsch</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.it.md">Italiano</a> | <a href="README.da.md">Dansk</a> | <a href="README.ja.md">日本語</a> | Polski | <a href="README.ru.md">Русский</a> | <a href="README.bs.md">Bosanski</a> | <a href="README.ar.md">العربية</a> | <a href="README.no.md">Norsk</a> | <a href="README.br.md">Português (Brasil)</a> | <a href="README.th.md">ไทย</a> | <a href="README.tr.md">Türkçe</a> | <a href="README.uk.md">Українська</a> | <a href="README.bn.md">বাংলা</a> | <a href="README.gr.md">Ελληνικά</a> | <a href="README.vi.md">Tiếng Việt</a>
</p>

<p align="center">
  <a href="https://qronos.me"><img width="250" alt="Qronos Code logo" src="https://github.com/user-attachments/assets/bdb0c174-b9fd-40ad-a47b-f3aab9b54e8d" /></a>
</p>

<p align="center">Open source'owy agent kodujący do pracy z AI w VS Code, JetBrains lub CLI.</p>

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

Qronos Code to agent kodujący z AI, który działa wszędzie tam, gdzie pracujesz: w [VS Code](https://qronos.me/landing/vs-code), [JetBrains](https://qronos.me/features/jetbrains-native) i [CLI](https://qronos.me/cli). Jest open source i ma otwarte ceny. Wybierasz spośród ponad 500 modeli, przełączasz się między nimi w trakcie zadania i płacisz stawkę dostawcy modelu bez narzutów. Do rozpoczęcia nie są wymagane klucze API.

### Instalacja

Wybierz, gdzie chcesz uruchomić Qronos.

<details open>
<summary><strong>VS Code</strong></summary>

<br>

Zainstaluj bezpośrednio [rozszerzenie Qronos Code](vscode:extension/qronos.qronos-code) albo pobierz je z [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=qronos.Qronos-Code). Utwórz konto, a otrzymasz dostęp do ponad 500 modeli, w tym GPT-5.5, Claude Opus 4.7, Claude Sonnet 4.6 i Gemini 3.1 Pro Preview, wszystkie w cenach dostawców.

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

Następnie uruchom `qronos` w dowolnym katalogu projektu.

</details>

<details>
<summary><strong>JetBrains</strong></summary>

<br>

Zainstaluj [plugin Qronos Code](https://plugins.jetbrains.com/plugin/28350-qronos-code) z JetBrains Marketplace albo wyszukaj "Qronos Code" w `Settings → Plugins` w dowolnym IDE JetBrains.

</details>

<details>
<summary><strong>Cloud Agent</strong></summary>

<br>

Uruchom Qronos z poziomu przeglądarki, bez lokalnej maszyny, na [app.qronos.ai/cloud](https://qronos.me/cloud).

</details>

<details>
<summary><strong>Przeglądy kodu</strong></summary>

<br>

Skonfiguruj automatyczne przeglądy kodu AI dla swoich pull requestów na [app.qronos.ai/code-reviews](https://qronos.me/code-reviews).

</details>

<details>
<summary>Zainstaluj CLI z GitHub Releases (pliki binarne)</summary>

Pobierz najnowszy plik binarny ze [strony Releases](https://github.com/Qronos-Org/qronos/releases).

| Platforma | Zasób |
|---|---|
| Windows (większość PC) | `qronos-windows-x64.zip` |
| macOS (Apple Silicon) | `qronos-darwin-arm64.zip` |
| macOS (Intel) | `qronos-darwin-x64.zip` |
| Linux x64 | `qronos-linux-x64.tar.gz` |
| Linux ARM | `qronos-linux-arm64.tar.gz` |

Uwagi: `x64-baseline` to build zgodności dla starszych CPU bez AVX. `musl` to statycznie linkowany build dla Alpine lub minimalnych obrazów Docker bez glibc. `qronos-vscode-*.vsix` to pakiet rozszerzenia VS Code, nie CLI. Archiwa `Source code` służą do budowania ze źródeł.

</details>

### Agents

Qronos zawiera wyspecjalizowane agents, między którymi możesz przełączać się zależnie od zadania. Możesz też tworzyć własne niestandardowe agents.

- **Code** - Domyślny. Implementuje i edytuje kod z języka naturalnego.
- **Plan** - Projektuje architekturę i pisze plany implementacji przed napisaniem kodu.
- **Ask** - Odpowiada na pytania o bazę kodu bez modyfikowania plików.
- **Debug** - Diagnozuje i śledzi problemy.
- **Review** - Przegląda zmiany i wykrywa problemy z wydajnością, bezpieczeństwem, stylem i pokryciem testami.

Dowiedz się więcej o [agents i niestandardowych agents](https://qronos.me/docs/code-with-ai/agents/using-agents).

### Co robi

- **Generowanie kodu** z języka naturalnego, w wielu plikach.
- **Autouzupełnianie inline** z sugestiami ghost-text i akceptacją przez Tab.
- **Samokontrola**, dzięki której agent sprawdza i poprawia własną pracę.
- **Sterowanie terminalem i przeglądarką** do uruchamiania poleceń i automatyzacji webu.
- **Marketplace MCP** do znajdowania i podłączania serwerów MCP rozszerzających możliwości agenta.
- **Ponad 500 modeli** z przełączaniem w trakcie zadania, aby dopasować opóźnienie, koszt i rozumowanie do pracy.

### Tryb autonomiczny (CI/CD)

Uruchom `qronos run` z `--auto`, aby działać w pełni autonomicznie bez promptów, z myślą o pipeline'ach CI/CD:

```bash
qronos run --auto "run tests and fix any failures"
```

`--auto` wyłącza wszystkie pytania o uprawnienia i pozwala agentowi wykonywać dowolne działania bez potwierdzenia. Używaj tylko w zaufanych środowiskach.

### Dokumentacja

Konfigurację i wszystko inne znajdziesz w [dokumentacji](https://qronos.me/docs).

### Wkład

Zapraszamy do wkładu programistów, autorów i wszystkich innych. Zacznij od [Contributing Guide](/CONTRIBUTING.md), aby skonfigurować środowisko, poznać standardy kodowania i sposób otwierania pull requestów. Zobacz [RELEASING.md](../RELEASING.md) dla procesu wydawania rozszerzenia VS Code i CLI oraz [packages/jetbrains/RELEASING.md](../packages/jetbrains/RELEASING.md) dla pluginu JetBrains.

Przed zaangażowaniem przeczytaj nasz [Code of Conduct](/CODE_OF_CONDUCT.md).

### Licencja

MIT. Możesz używać, modyfikować i dystrybuować ten kod, również komercyjnie, o ile zachowasz informacje o autorstwie i licencji. Zobacz [License](/LICENSE).

### FAQ

<details>
<summary>Skąd pochodzi Qronos CLI?</summary>

Qronos CLI jest forkiem [OpenCode](https://github.com/anomalyco/opencode), rozszerzonym do działania w platformie agentic engineering Qronos.

</details>

---

**Dołącz do społeczności** [Discord](https://qronos.me/discord) | [X](https://x.com/qronos) | [Reddit](https://www.reddit.com/r/qronos/)
