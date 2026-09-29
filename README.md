# Primal Force

PWA de episodios e trailers de Power Rangers Primal Force. App estatica, sem dependencias de
JavaScript em runtime: tudo o que corre no browser e codigo nativo.

## Inicio rapido

```bash
npm install
npm run dev        # servidor de desenvolvimento
npm run build      # typecheck + build para dist/
npm run preview    # serve dist/ localmente
npm test           # testes unitarios (Vitest)
npm run test:e2e   # testes end-to-end (Playwright)
npm run size       # mede JS gzipped e falha acima de 50 KB
npm run typecheck  # TypeScript em modo strict
```

## Arquitectura

```
index.html          entrada unica (Vite)
src/
  main.ts           composicao da app, ligacao DOM <-> estado
  store.ts          Signal + estado persistente (watched, favoritos, progresso, tema)
  sw.js             service worker (estrategias de cache + fila offline)
  data/catalog.ts   131 episodios e 6 trailers
  components/       VideoPlayer, EpisodeCard, Toast, Modal
  styles/           tokens, base, components
  utils/            search (fuzzy), offline (download/fila)
tests/              Vitest (unit) e tests/e2e (Playwright)
public/             manifest.json e icones PNG
```

### Estado

`Signal<T>` em `src/store.ts` e um primitivo minimo de reatividade: valor + conjunto de
subscribers. As alteracoes sao persistidas em localStorage de forma automatica. As chaves
`pf_watched`, `pf_favorites`, `pf_progress` e `pf_settings` sao legidas de forma retrocompativel,
para que dados de versoes anteriores continuem a funcionar.

### Service worker

Sem Workbox. `vite.config.ts` injecta a lista de ficheiros gerados em `__PRECACHE__` no
ficheiro `dist/sw.js`.

- Shell: navegacoes em network-first com fallback para cache; assets com hash em cache-first.
- Fontes Google: stale-while-revalidate.
- Videos: cache-first. Respostas `Range` sao servidas a partir do corpo completo em cache
  como `206 Partial Content`, com `416` para pedidos impossiveis. Sem isto, procurar
  offline falha.
- Fila de download: pedidos em Cache API + Background Sync, com fallback para retry manual
  no evento `online` (iOS Safari nao implementa Background Sync).

## Desempenho

O orcamento e de 50 KB gzipped de JS de runtime (exclui `sw.js`). `npm run size` imprime o
tamanho por ficheiro e falha o build se ultrapassar. O bundle nao inclui qualquer biblioteca
externa, o que mantem o numero bem abaixo do limite.

## Conteudo dos videos

Os ficheiros de video apontam para `download.blender.org` (Sintel, Blender Foundation) como
conteudo de demonstracao. Nao ha artwork nem metadados reais de episodios: datas de exibicao,
duracoes e classificacoes ficam **vazios** ate serem preenchidos no `catalog.ts`, e o leitor
salta os campos que nao existem em vez de os inventar. O `Episode` aceita
`airDate`, `runtime`, `rating` e `tags` para quando esses dados ficarem disponiveis.

## Acessibilidade

HTML semantico (`article`, `section`, `nav`, `dialog`), tabs com `role="tablist"` e navegacao
por setas, acordeao com `aria-expanded`, controlos do leitor etiquetados, regiao `aria-live`
para avisos, skip link, foco visivel e trapping de foco no dialogo. Todas as animacoes sao
desativadas sob `prefers-reduced-motion: reduce`.

## Notas de plataforma

- **iOS Safari**: nao dispara `beforeinstallprompt`; as instrucoes de instalacao aparecem no
  dialogo de Definicoes. Usa `apple-mobile-web-app-capable`.
- **Android/Chrome**: o botao Instalar aparece quando `beforeinstallprompt` e lancado.
- Limpar dados do site apaga os favoritos e o progresso, que vivem apenas em localStorage.

## Deploy

Render Static Site: `render.yaml` define `npm ci && npm run build` e publica `./dist/`.

### Obrigatorio: configurar o servico no dashboard

O Render so le `render.yaml` ao **criar** um servico novo. Num servico ja existente o ficheiro e
ignorado, o build salta com `Empty build command; skipping build` e o Render serve a raiz do
repositorio. Como a raiz contem o `index.html` de entrada do Vite, que aponta para
`/src/main.ts` (TypeScript), o site fica em branco.

**Configura no dashboard do Render** (Settings do servico `streaming-app`):

| Campo | Valor |
| --- | --- |
| Build Command | `npm ci && npm run build` |
| Publish Path | `./dist` |

Depois usa **Manual Deploy** e confirma que o log **nao** contem `Empty build command`.

Como detetar o problema: a app define `window.__PF_READY` quando o bundle arranca. Se o site
estiver a ser servido sem build, aparece um aviso vermelho com estas instrucoes em vez de uma
pagina em branco.

Verifica no log que o bundle existe em `/assets/index-<hash>.js` e que
`https://<teu-servico>/manifest.json` e `/icons/icon-192.png` devolvem `200`.

O GitHub Actions em `.github/workflows/ci.yml` corre typecheck, testes, build, medicao de
tamanho e e2e em cada push para `main`.
