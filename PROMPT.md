# PROMPT — Primal Force: Universo, Progresso, Grelha, Partilha

## Contexto obrigatório

PWA estática `streaming-app` (Vite + TypeScript, **zero dependências em runtime**).

- `index.html` — entrada do Vite; manifest, meta tags Apple, guard `__PF_READY`
- `src/main.ts` — composição da app
- `src/store.ts` — `Signal<T>` + persistência (`pf_watched`, `pf_favorites`, `pf_progress`, `pf_settings`)
- `src/data/catalog.ts` — 131 episódios + 6 trailers
- `src/components/` — `VideoPlayer`, `EpisodeCard`, `Toast`, `Modal`
- `src/styles/` — `tokens`, `base`, `components`, `main`
- `src/utils/search.ts` (fuzzy, já existe — **reusa**), `src/utils/offline.ts`
- `src/sw.js` — SW próprio; precache injetado em `dist/sw.js` via `__PRECACHE__`
- `tests/` — Vitest + `tests/e2e/app.spec.ts`

Regras: 0 deps em runtime · JS gzipped **< 50 KB** (`npm run size` falha acima disso) · português europeu em toda a UI · sem emojis · sem imagens externas ou geradas por IA · **nunca** `window.open`.

Valida sempre: `npm run typecheck && npm test && npm run build && npm run size && npm run test:e2e`

---

## 1. Universo da série → `src/data/universe.ts`

Dados tipados + 4 separadores novos na navegação: **Rangers · Vilões · Glossário · Linha do Tempo**.

**1.1 Mastres Morphin** (`MASTERS`) — 20 entradas
`id`, `name`, `color` (hex), `helmet` (descrição: cor, viseira, detalhes), `zord` (nome + dinossauro), `weapon`, `personality` (1 frase na voz do personagem), `debut` (nº ep).

**1.2 Vilões** (`VILLAINS`)
`id`, `name`, `title`, `threat` (1–5), `description` (2–3 frases), `firstAppearance` (ep), `defeatedIn` (ep ou `null`), `signatureMove`.
Obrigatórios: Maltherion, Valtherion, Lorde Arcano, Presidente da Rússia. Confirma o cânone antes de escrever.

**1.3 Glossário** (`GLOSSARY`) — mínimo 20 entradas
`term`, `short`, `long` (1–2 frases), `category` (`Mundo Morphin` | `Personagens` | `Objectos` | `Facções` | `Eventos`).
Obrigatórios: Rede Morphin, Coroa dos 20 Espaços, Pedras de Poder, Zords, Megazord, Deboss, Morphin, Foliche, Pegaipso, Metamorpho, Ranger, Presa, Zord Adormecido.

**1.4 Linha do tempo** (`TIMELINE`)
`epRange: [number, number]`, `title`, `summary`, `arc` (para coloração), `keyEpisodes: number[]`.
Arcos: Chegada de Roro (1–2) · Gémeos Congelados (3–4) · Plano do Presidente (5–10) · Ranger Preto (11–13) · Desligados da Rede (14–16) · Vido Prisioneiro (17–18) · Guardião do Portão (19–25) · Conga (26–34) · Amaia (35–45) · Poder dos Elementos (46–50) · Lorde Arcano (50–55) · Terramoto (56–63) · Conspiração (64–75) · Paz, Amor e Dinossauros (76–95) · Arauto de Animaria (96–110) · Super Lutadores (111–120) · Ameaça Final (121–131).

**1.5 UI**
- **Rangers**: capacete desenhado em **CSS puro** (divs + gradientes na cor do Ranger, viseira em `::after`); expande para zord, arma, frase, estreia.
- **Vilões**: barra de ameaça em 5 segmentos; links "primeira aparição" / "derrotado em" navegam para o episódio.
- **Glossário**: fuzzy search + índice A–Z âncora.
- **Linha do tempo**: linha vertical, arcos com episódios-chave clicáveis, filtro por arco.

---

## 2. Progresso

**2.1** Barra sempre visível no topo: `23 de 131 vistos (18%)`, com preenchimento animado (respeita `prefers-reduced-motion`).

**2.2 "Continuar a ver"** — próximo não visto a partir de `season` + `watched` + `progress`. Card com capa, barra parcial e botão que retoma o `currentTime` de `pf_progress`. Esconde quando tudo estiver visto (mostra estado de conclusão).

**2.3 Contadores nos separadores** — `Temp. 3 · 8/25 vistos` no seletor; badge `8/25` nos separadores. Atualiza via `subscribe` (ligar ao que já existe — **sem polling**).

---

## 3. Avaliação e向下
	
**3.1 Estrelas** — 1–5 por episódio, no acordeão, com hover-preview. Novo `Signal<Record<number, number>>` em `pf_ratings` (retrocompatível: tolera chave ausente). Visíveis no cartão na vista grelha.

> Nota: `Episode.rating` foi corrigido para `number` (1–5) e serve de valor por defeito. `airDate`, `runtime` e `tags` estão declarados mas vazios em todos os 131 episódios — o leitor tem de os esconder quando não existem, sem inventar placeholders.

**3.2 Notas do autor** — `notes?: string[]` no episódio; **mínimo 4 episódios** escritos. Botão "Curiosidade" → `Modal`. Esconde se vazio.

**3.3 Quiz "Que Mestre Morphin és tu?"** — 5 perguntas × 4 opções, cada opção mapeia a um mestre. Estado: `currentQuestion`, `answers`, `result`. Resultado: nome, cor, capacete CSS, frase + link "ver episódios deste Ranger" (filtra a lista). Botão recomeçar, `aria-live`, focus trap.

---

## 4. Visual

**4.1 Capa por temporada** — `src/data/posters.ts`, **SVG inline**, 1 por temporada (6), 2–4 KB cada. Paleta da série (`#0b0c10`, `#e63946`, `#f2b93a`), formas geométricas, sem texto pequeno. No seletor, `<option>` por temporada; no cartão a capa substitui o quadrado com o número na vista grelha.

**4.2 Grelha ↔ Lista** — toggle na AppBar, persistido em `pf_settings.view`. Grelha: `repeat(auto-fill, minmax(150px, 1fr))` com capa, número, título, estrelas, badge de visto. Lista: layout atual. A UI não pode partir em nenhuma das vistas.

**4.3 Áudio** — `SignalAudio` pequena (play/pause/volume/mute) + barra sticky na AppBar com o trailer. Estado em `pf_settings.audio`. **Nunca autoplay** — inicia em pausa.

---

## 5. Partilha

**5.1 Cartão de resumo** — `src/utils/shareCard.ts` gera PNG **local** (600×600): fundo da série, "PRIMAL FORCE", `23/131 vistos`, percentagem, distribuição de ratings, 3 favoritos. Lê `watched`, `favorites`, `ratings`. Abre/descarrega a imagem; nome `primal-force-resumo-AAAA-MM-DD.png`.

**5.2 Link direto** — ao abrir um episódio, `history.replaceState` → `?ep=47`; ao carregar com `?ep=` abre e faz scroll até ele. Botão "Partilhar" usa `navigator.share` quando existe, senão `navigator.clipboard.writeText`. **Sem `window.open`.**

---

## 6. Extra — conteúdo e robustez (faz depois das 5 anteriores)

**6.1 Preencher `airDate`, `runtime` e `tags`**
Os campos existem no tipo `Episode` mas estão vazios nos 131 episódios.
- `tags`: deriva de `GLOSSARY` e `TIMELINE` (ex. `Zord`, `Mestres Morphin`, `Portal`) — é determinístico, não inventado.
- `airDate` e `runtime`: **não inventes**. Deixa-os vazios; o leitor esconde-os. Preenche só se eu te der os dados.

**6.2 Sinopses em falta → bloco de escrita**
Os 131 têm sinopse, mas todas as de EP 19+ são placeholders curtos.
- Criar `src/data/synopses/EP-019.md` … `EP-131.md` (um por episódio), validados por Zod-free: um `import.meta.glob` de `.md` com `eager: true`.
- Modo de escrita: `?write=1` abre um textarea por episódio, grava em `localStorage` (chave `pf_drafts`), e exporta **todo o rascunho num ficheiro `.md`** para eu rever antes de commit.
- Regra: **nada entra no `catalog.ts` sem a minha aprovação.**

**6.3 Busca global (não só episódios)**
Hoy já existe `filterEpisodes` em `src/utils/search.ts`. Estende para `searchAll(query)` que devolve resultados de 4 fontes: Episódios · Rangers · Vilões · Glossário, cada um com `type` e `href`. Barra de busca só com resultados, agrupados, com `role="combobox"` + `aria-activedescendant` e navegação por setas.

**6.4 Filtros e ordenação**
- Filtros: Todos · Não vistos · Vistos · Favoritos · Com avaliação. Chips com contadores (`8/25`).
- Ordenação: por número (crescente/decrescente) · por título · por avaliação · por data de última visualização.
- Ambos persistidos em `pf_settings`, e combináveis com a temporada ativa.

**6.5 Shoulder — atalhos de teclado**
O `main.ts` já trata `K`/Espaço. Completa e **documenta numa `?help` (ou `?keys`)**:
`←/→` navegar · `Enter` abrir · `K`/Espaço play/pause · `F` fullscreen · `M` mute · `J/L` −10s/+10s · `↑/↓` volume · `1–6` separadores · `G` alternar grelha/lista · `?` atalhos · `Esc` fechar.
Ao abrir, guarda o elemento focado e devolve-lhe o foco ao fechar (focus trap).

**6.6 PWA — ícones reais**
O `manifest.json` usa ícones PNG pequenos (72–512, o maior tem 1.4 KB) e a instalação no telemóvel caiu para o ícone do Chrome.
- Gera PNG reais a 512×512 e 1024×1024 (o maior tem de ser **pelo menos 40 KB**), com marca "PF" + friso de dinossauro, a partir de `src/data/posters.ts` com `<canvas>` em runtime (zero bytes de ficheiro, zero deps).
- `apple-touch-icon` a 180×180 passa a ser PNG real.
- Atualiza `public/manifest.json` para apontar para os PNG, com `purpose: "any maskable"` e `sizes` corretos.
- Adiciona `screenshots` (narrow + wide) em `public/` para o painel de instalação do Android.

**6.7 Sincronização entre separadores / dispositivos**
- `storage` event: se abrires a app em dois separadores, o progresso e os favoritos mantêm-se em sincronia.
- Exportar/importar progresso num ficheiro `.json` (Definições → "Exportar dados" / "Importar"), com `schemaVersion` e validação antes de aplicar.

**6.8 Acessibilidade — passes extra**
- `aria-current="page"` no separador ativo · `aria-label` nos icon-only da AppBar (já parcialmente feito — confirma todos).
- Contraste AA em **todos** os estados, incluindo `data-theme="light"` (o tema claro é novo e não foi auditado).
- Teste axe nos e2e: `axe-core` via `page.addScriptTag` + scan do `main` e do diálogo. Falha o build se houver violações `serious`/`critical`.

---

## Critérios de aceitação

1. **0 deps de runtime** — sem chart.js, confetti, libs de rating ou fuzzy search.
2. **`npm run size` continua a passar** (< 50 KB gz). Se apertar, faz `import()` dinâmico para quiz e shareCard.
3. **Sem imagens externas/IA** — só SVG inline e CSS.
4. **Acessibilidade** — HTML semântico, `aria-expanded`, `role="tablist"`, focus trap, `aria-live`, contraste AA, `prefers-reduced-motion`.
5. **Strings** centralizadas num objeto `STRINGS` (pt-PT) — nada hardcoded.
6. **Testes** — unit: cálculo de progresso, média de ratings, resultado do quiz, parsing de `?ep=`. E2E: toggle grelha/lista, estrelas, deep-link.
7. **Um commit por tarefa**, mensagem em português no padrão do `git log` existente.

Começa pela Tarefa 1 e avança uma a uma, com a validação completa a correr entre tarefas. **Não inventes dados que não existam em `catalog.ts`** — se um campo não existir, deixa-o vazio em vez de inventar.
