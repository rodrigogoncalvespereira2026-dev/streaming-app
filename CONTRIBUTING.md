# Como contribuir

## Regras nao negociaveis

1. **Zero dependencias de runtime.** Nao adicionar bibliotecas ao `package.json` em
   `dependencies` (o projeto nao deve ter nenhuma). Tudo o que corre no browser e
   TypeScript/CSS nativo. Dependencias vao em `devDependencies` e so para build/testes.
2. **Orcamento de 50 KB gzipped** de JS de runtime. `npm run size` falha o build se
   ultrapassar. `sw.js` conta a parte.
3. **TypeScript strict.** `npm run typecheck` tem de passar.
4. **Sem numeros inventados.** Nao preencher datas de exibicao, duracoes ou classificacoes
   sem dados reais; o leitor deve omitir o que nao existe.

## Fluxo

```bash
npm install
npm run typecheck && npm test && npm run build
npm run test:e2e
```

Antes de abrir um PR, corra a suite completa. O CI faz o mesmo em cada push.

## Onde mexer

- Episodes/trailers: `src/data/catalog.ts`. O array `episodes` e a fonte de verdade;
  o numero de temporada e derivado de `PER_SEASON`.
- Estado persistente: `src/store.ts`. Ao mudar a forma de um valor guardado, mantenha a
  leitura retrocompativel em `read()`.
- Cache/offline: `src/sw.js`. Ao mudar o nome de um cache, adicione-o a `KEEP_VIDEO_NAMES`
  ou os videos ja descarregados do usuario sao perdidos.
- Estilos: `src/styles/`. Tokens de cor em `tokens.css`, e nao valores soltos.

## Acessibilidade

Novos controlos precisam de nome acessivel, operacao por teclado e foco visivel. Se tocar
num acordeao, mantenha `aria-expanded` correto. Respeite `prefers-reduced-motion`.

## Conteudo de video

Os videos apontam para `download.blender.org` como demonstracao. Nao redistribua o trafego
dos ficheiros nem substitua por conteudo sem licenca.
