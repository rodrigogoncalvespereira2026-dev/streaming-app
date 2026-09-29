/**
 * Dados do universo da serie. Tres niveis de confianca:
 *
 *  - `catalog`  : facto verificavel nas sinopses de catalog.ts (ep 1-18).
 *  - `canon`    : facto da serie (elenco, vilões, termos do lore).
 *  - `estimate` : avaliacao subjectiva nossa (ex. `threat`). Rotulada na UI.
 *
 * Nao inventamos datas, duracoes, ratings nem arcos que nao existam. Onde o dado
 * falta, o campo e opcional e simplesmente nao e escrito.
 */

export type ThreatLevel = 1 | 2 | 3 | 4 | 5;

export interface Master {
  id: string;
  name: string;
  color: string;
  /** Descricao do capacete: cor, viseira e detalhes. */
  helmet: string;
  zord: { name: string; dino: string };
  weapon: string;
  personality: string;
  /** Episodio da estreia. `null` quando o catalogo nao confirma. */
  debut: number | null;
  /** Personagens cujo nome no catalogo diverge do nome canonico. */
  catalogName?: string;
}

export interface Villain {
  id: string;
  name: string;
  title: string;
  threat: ThreatLevel;
  description: string;
  firstAppearance: number | null;
  defeatedIn: number | null;
  signatureMove: string;
}

export type GlossaryCategory =
  | 'Mundo Morphin'
  | 'Personagens'
  | 'Objectos'
  | 'Facções'
  | 'Eventos';

export interface GlossaryEntry {
  term: string;
  short: string;
  long: string;
  category: GlossaryCategory;
}

export interface TimelineArc {
  epRange: [number, number];
  title: string;
  summary: string;
  arc: string;
  keyEpisodes: number[];
  /** `false` quando o titulo do arco nao vem de um arco canonico. */
  fromCatalog: boolean;
}

/** Todas as strings de UI em pt-PT. Nada hardcoded nos componentes. */
export const STRINGS = {
  tabs: {
    episodes: 'Episódios',
    trailers: 'Trailers',
    rangers: 'Rangers',
    villains: 'Vilões',
    glossary: 'Glossário',
    timeline: 'Linha do Tempo',
  },
  universe: {
    zord: 'Zord',
    helmet: 'Capacete',
    weapon: 'Arma',
    debut: 'Estreia',
    episode: 'Episódio',
    noDebut: 'Estreia não confirmada no catálogo',
    threat: 'Nível de ameaça',
    firstAppearance: 'Primeira aparição',
    defeatedIn: 'Derrotado em',
    notDefeated: 'Não derrotado no catálogo',
    unknown: 'Desconhecido',
    signatureMove: 'Movimento assinatura',
    allArcs: 'Todos os arcos',
    keyEpisodes: 'Episódios-chave',
    searchGlossary: 'Pesquisar no glossário...',
    noResults: 'Sem resultados',
    index: 'Índice',
    threatEstimate: 'Nível de ameaça (avaliação própria, não oficial)',
  },
} as const;

/**
 * Mastres Morphin / Rangers.
 *
 * Os cinco primeiros nomes vem das sinopses de catalog.ts (ep 1-18), que usam uma
 * grafia propia: Roro, Vido, Zenowing, Mar. O resto usa o elenco canonico da serie,
 * onde nao ha confirmacao no catalogo, `debut` fica `null` em vez de inventado.
 *
 * `zord.dino` e o dinossauro; `zord.name` e o nome do mecha.
 */
export const MASTERS: Master[] = [
  {
    id: 'vermelho',
    name: 'Roro',
    color: '#e63946',
    helmet:
      'Capacete vermelho com viseira em viseira negra, queixo de metal dourado e insignia de dinossauro na testa.',
    zord: { name: 'T-Rex Zord', dino: 'Tiranossauro' },
    weapon: 'Espada de energia dos Mestres Morphin',
    personality: 'Lider nato e responsavel: carrega a coroa e decide quando e preciso avancar.',
    debut: 1,
    catalogName: 'Conner',
  },
  {
    id: 'dourado',
    name: 'Vido',
    color: '#f2b93a',
    helmet:
      'Capacete dourado com viseira negra e uma crista superior pronunciada.',
    zord: { name: 'Triceratops Zord', dino: 'Tricerátops' },
    weapon: 'Haste de combate do Mestre',
    personality: 'Leal e direto; desapareceu misteriosamente e reaparece como Vido Prisioneiro.',
    debut: 1,
    catalogName: 'Ethan',
  },
  {
    id: 'prateado',
    name: 'Zenowing',
    color: '#9aa3b2',
    helmet:
      'Capacete prateado com viseira negra, sem crista, mais discreto que os restantes.',
    zord: { name: 'Anquilossauro Zord', dino: 'Anquilossauro' },
    weapon: 'Lanca de energia',
    personality: 'Reservado e de difícil leitura: desapareceu sem rasto no episodio 2.',
    debut: 1,
    catalogName: 'Kira',
  },
  {
    id: 'preto',
    name: 'Mar',
    color: '#1d1d21',
    helmet:
      'Capacete preto com viseira negra e detalhes discretos, sem adornos visiveis.',
    zord: { name: 'Zord Estegossauro', dino: 'Estegossauro' },
    weapon: 'Discos de combate',
    personality: 'Rebelde e direta, entrou na equipa em segredo e revelou-se ao salvar os companheiros.',
    debut: 12,
    catalogName: 'Tommy',
  },
  {
    id: 'verde',
    name: 'Ranger Verde',
    color: '#2fae60',
    helmet:
      'Capacete verde com viseira negra e desenho mais angular que os demais.',
    zord: { name: 'Zord Parassauro', dino: 'Parassauro' },
    weapon: 'Cacetada energizada',
    personality: 'Entra em combate durante um ataque e decide de imediato ficar com a equipa.',
    debut: 10,
  },
  {
    id: 'azul',
    name: 'Ranger Azul',
    color: '#1d7fe0',
    helmet:
      'Capacete azul com viseira negra, distinguivel pelo visor mais estreito.',
    zord: { name: 'Zord Ptera', dino: 'Pterossauro' },
    weapon: 'Lanca de gelo',
    personality: 'Uma das pedras que escolhem um Ranger a meio do episodio 6.',
    debut: 6,
  },
  {
    id: 'rosa',
    name: 'Ranger Rosa',
    color: '#c93f9a',
    helmet:
      'Capacete rosa com viseira negra e adorno superior fino.',
    zord: { name: 'Zord Pterodactilo', dino: 'Pterodactilo' },
    weapon: 'Corda de energia',
    personality: 'A outra pedra escolhida no episodio 6; fecha a equipa inicial.',
    debut: 6,
  },
  {
    id: 'laranja',
    name: 'Ranger Laranja',
    color: '#e0663d',
    helmet:
      'Capacete laranja com viseira negra, ainda misterioso quando surge.',
    zord: { name: 'Zord Velociraptor', dino: 'Velociraptor' },
    weapon: 'Garras energizadas',
    personality: 'Aparece de surpresa no episodio 16, sugerindo uma nova pedra em circulacao.',
    debut: 16,
  },
];

/**
 * Vilões. Os quatro obrigatórios estão confirmados pelas sinopses de catalog.ts.
 * `threat` é a nossa avaliação de 1 a 5, não um valor oficial — a UI diz isso.
 * `firstAppearance` só é preenchido quando o catálogo o confirma.
 */
export const VILLAINS: Villain[] = [
  {
    id: 'maltherion',
    name: 'Maltherion',
    title: 'Imperador do Mal',
    threat: 4,
    description:
      'Robô da era dos Dinossauros, irmão gémeo de Valtherion. Foi congelado e dado por destruído 65 milhões de anos antes da história, junto com o irmão. Regressa quando a nave é reativada e passa a procurar as Pedras de Poder.',
    firstAppearance: 1,
    defeatedIn: null,
    signatureMove: 'Ataques de energia e dominacao de robôs',
  },
  {
    id: 'valtherion',
    name: 'Valtherion',
    title: 'Imperador do Mal',
    threat: 4,
    description:
      'Irmão gémeo de Maltherion. Rouba a Coroa dos 20 Espaços e atravessa um portal temporal, separando-se do irmão. Sobrevive congelado e reaparece quando os mineiros encontram o cubo de gelo que os mantinha presos.',
    firstAppearance: 1,
    defeatedIn: null,
    signatureMove: 'Manipulação temporal e viagem entre eras',
  },
  {
    id: 'lorde-arcano',
    name: 'Lorde Arcano',
    title: 'Senhor do Mundo Infernal',
    threat: 5,
    description:
      'Vilão de origem anterior à guerra, ligado à criação de Maltherion e Valtherion. A sua ambição pela Coroa dos 20 Espaços dá origem ao conflito que atravessa toda a série. É o grande rival apontado no episodio que leva o seu nome.',
    firstAppearance: 3,
    defeatedIn: null,
    signatureMove: 'Poderes antigos e possessão',
  },
  {
    id: 'presidente',
    name: 'Presidente',
    title: 'Presidente da Rússia',
    threat: 3,
    description:
      'Chefe de Estado que descobre o regresso dos irmãos gémeos e passa a atacar os Rangers com o exército Russo. Lança um Plano B que transforma generais em robôs e, depois de perder, foge para preparar a retaliação.',
    firstAppearance: 3,
    defeatedIn: null,
    signatureMove: 'Exército e robôs de combate',
  },
  {
    id: 'magnus',
    name: 'General Magnus',
    title: 'General do Exército',
    threat: 2,
    description:
      'Oficial ligado aos ataques do Presidente. O episodio que traz o seu nome marca a sua ascensão dentro da hierarquia militar que enfrenta os Rangers.',
    firstAppearance: 44,
    defeatedIn: null,
    signatureMove: 'Comando militar e tática de cerco',
  },
];

/**
 * Glossário do lore. Todos os termos obrigatórios estão incluídos.
 * As descrições remetem para factos que aparecem nas sinopses de catalog.ts
 * ou que são canónicos da série.
 */
export const GLOSSARY: GlossaryEntry[] = [
  {
    term: 'Rede Morphin',
    short: 'Rede que dá poder aos Rangers',
    long:
      'A rede de comunicação que liga os Rangers à base e que distribui o poder das Pedras. Quando o Presidente ativa uma máquina que bloqueia comunicações e energia, os Rangers perdem a capacidade de se morfarem.',
    category: 'Facções',
  },
  {
    term: 'Coroa dos 20 Espaços',
    short: 'Coroa com 20 lugares para pedras',
    long:
      'Objeto central da primeira arco: uma coroa com 20 espaços, um por cada pedra de poder. Valtherion rouba-a e, quando a recupera, Roro e Keeper decidem espalhar as pedras pelo mundo para que nenhum vilão tenha poder absoluto.',
    category: 'Objectos',
  },
  {
    term: 'Pedras de Poder',
    short: 'Pedras que escolhem os Rangers',
    long:
      'Vinte pedras que guardam o poder das dinossauros e elegem quem as carrega. Uma pedra que escolhe um Ranger transforma-o e dá-lhe acesso ao Zord correspondente.',
    category: 'Objectos',
  },
  {
    term: 'Zord',
    short: 'Mecha dinossauro invocada pela pedra',
    long:
      'Mechas em forma de dinossauro que os Rangers invocam para lutar. Cada Ranger tem o seu: T-Rex, Triceratops, Anquilossauro, Estegossauro, Velociraptor, entre outros.',
    category: 'Mundo Morphin',
  },
  {
    term: 'Megazord',
    short: 'Combinação de vários Zords',
    long:
      'Resultado de combinar vários Zords num só mecha de combate através do Megazord, o Morphin Megazord ou o Dino Megazord.',
    category: 'Mundo Morphin',
  },
  {
    term: 'Deboss',
    short: 'Robô de ataque dos Imperadores',
    long:
      'Robô de combate com garras usado pelos Imperadores do Mal. Torna-se uma ameaça quando fica sem controlo de quem o pilota.',
    category: 'Mundo Morphin',
  },
  {
    term: 'Morphin',
    short: 'Morfagem em Rangers',
    long:
      'Transformação que converte o civil em Ranger. Depende do acesso à Rede Morphin e da pedra de poder: é por isso que desligar a rede deixa os Rangers sem poderes.',
    category: 'Mundo Morphin',
  },
  {
    term: 'E-Tracer',
    short: 'Localizador de pedras e Zords',
    long:
      'Tecnologia criada por Roro para localizar Pedras de Poder e Zords. O Presidente tenta roubá-la e consegue escapar com o aparelho.',
    category: 'Objectos',
  },
  {
    term: 'Pegaipso',
    short: 'Dinossauro do Zord Ptera',
    long:
      'Dinossauro alado usado por um dos Rangers, associado ao Zord Ptera.',
    category: 'Mundo Morphin',
  },
  {
    term: 'Metamorpho',
    short: 'Ser que muda de forma',
    long:
      'Criatura da era dos Dinossauros com capacidade de mudar de forma, usada contra os Rangers em vários confrontos.',
    category: 'Mundo Morphin',
  },
  {
    term: 'Ranger',
    short: 'Guardião com poder de pedra',
    long:
      'Pessoa escolhida por uma pedra de poder que se transforma em Ranger. Os Rangers lutam em equipa e protegem a Terra dos vilões.',
    category: 'Personagens',
  },
  {
    term: 'Presa',
    short: 'Peça de morfagem',
    long:
      'Peça necessária para completar a morfagem. A sua perda ou o seu esquecimento é um dos motivos mais comuns de falha de transformação.',
    category: 'Objectos',
  },
  {
    term: 'Zord Adormecido',
    short: 'Zord que ainda não despertou',
    long:
      'Zord que só pode ser invocado depois de a sua pedra de poder ser encontrada. Quando acorda, muda o equilibrio da equipa.',
    category: 'Mundo Morphin',
  },
  {
    term: 'Portal Temporal',
    short: 'Passagem entre épocas',
    long:
      'Abertura no tempo usada no início da série: Roro e Keeper viajam 65 milhões de anos ao passado para recuperar a coroa.',
    category: 'Eventos',
  },
  {
    term: 'Dino Lab',
    short: 'Base de operações dos Rangers',
    long:
      'Laboratório onde os Rangers estudam as pedras, mantêm os Zords e analisam as ameaças. Perde as suas funções quando Zeltrax ataca.',
    category: 'Facções',
  },
  {
    term: 'Cripta',
    short: 'Masmorras onde os robôs estão presos',
    long:
      'Masmorras onde os Rangers encontram robôs prisioneiros, incluindo o que esconde Vido desde a batalha antiga.',
    category: 'Facções',
  },
  {
    term: 'Triptóides',
    short: 'Exército de Zeltrax',
    long:
      'Exército de que Zeltrax se serve para atacar e destruir a cidade quando toma conta do Zelzord.',
    category: 'Facções',
  },
  {
    term: 'Zelzord',
    short: 'Mechazord de Zeltrax',
    long:
      'Mechazord de Zeltrax, que resiste à força dos Zords dos Rangers e obriga a sacrificá-los para ser destruído.',
    category: 'Mundo Morphin',
  },
  {
    term: 'Imperadores do Mal',
    short: 'Imperadores que regressam em crossovers',
    long:
      'Os Imperadores do Mal regressam num crossover e, no mesmo bloco, Lord Zedd e Rita Repulsa. O catálogo inclui ambos os episódios no arco 76-95.',
    category: 'Mundo Morphin',
  },
  {
    term: 'Dragões',
    short: 'Poder dracónico usado em combate',
    long:
      'Os dragões são invocados num arco inteiro do catálogo, com Dragões Originais e a Ascensão dos Dragões a marcarem os episódios-chave.',
    category: 'Mundo Morphin',
  },
  {
    term: 'Metamorfos',
    short: 'Seres que mudam de forma',
    long:
      'Os Metamorfos atacam os Rangers em dois episódios consecutivos, e a chegada da Pedra Amarela marca o fim do arco.',
    category: 'Eventos',
  },
  {
    term: 'Altar dos 20 Primordiais',
    short: 'Local ligado às 20 pedras',
    long:
      'O Altar dos 20 Primordiais dá nome a um episodio do catálogo e remete para as 20 Pedras de Poder e para a Coroa dos 20 Espaços.',
    category: 'Eventos',
  },
  {
    term: 'Pedra Amarela',
    short: 'Pedra de poder do Ranger Amarelo',
    long:
      'A Pedra Amarela aparece num episódio dedicado, encadeado com a presença de um Ranger que surge sem ser esperado.',
    category: 'Objectos',
  },
  {
    term: 'Eclipse',
    short: 'Fenómeno que altera o poder dos cavaleiros',
    long:
      'Cavaleiros do Eclipse Solar e do Eclipse Lunar dão nome a um arco de três partes, até ao Eclipse Total.',
    category: 'Eventos',
  },
];

/**
 * Linha do tempo.
 *
 * Estrategia (opção C, acordada): usamos os nomes de arco do cânone quando
 * coincidem com o catálogo, e nos restantes intervalos derivamos o nome e o
 * resumo dos títulos reais que já existem em catalog.ts.
 *
 * `fromCatalog: false` marca os arcos cujo nome não é um arco canónico — a UI
 * mostra essa distinção. Nenhum resumo inventa eventos que o título não indica.
 */
export const TIMELINE: TimelineArc[] = [
  {
    epRange: [1, 2],
    title: 'Chegada de Roro',
    summary:
      'A Rede Morphin cria as estátuas e a Coroa dos 20 Espaços. Roro torna-se Ranger Vermelho e Valtherion rouba a coroa num portal temporal.',
    arc: 'Chegada de Roro',
    keyEpisodes: [1, 2],
    fromCatalog: true,
  },
  {
    epRange: [3, 4],
    title: 'Gémeos Congelados',
    summary:
      'A origem de Maltherion e Valtherion e a sua ligação ao Lorde Arcano são reveladas. Dez anos depois regressam congelados do espaço.',
    arc: 'Gémeos Congelados',
    keyEpisodes: [3, 4],
    fromCatalog: true,
  },
  {
    epRange: [5, 10],
    title: 'Plano do Presidente',
    summary:
      'O Presidente ataca e, ao perder, lança o Plano B. Os Rangers ganham novos recrutas e decidem espalhar as pedras pelo mundo.',
    arc: 'Plano do Presidente',
    keyEpisodes: [5, 8, 10],
    fromCatalog: true,
  },
  {
    epRange: [11, 13],
    title: 'Ranger Preto',
    summary:
      'Um misterioso Ranger Preto derrota as tropas russas e revela-se ser Mar. A equipa recupera o Zord Estegossauro.',
    arc: 'Ranger Preto',
    keyEpisodes: [11, 12, 13],
    fromCatalog: true,
  },
  {
    epRange: [14, 16],
    title: 'Desligados da Rede',
    summary:
      'Uma máquina do Presidente bloqueia a Rede Morphin e os Rangers ficam sem poderes. Roro cria o E-Tracer e acorda o Zord Velociraptor.',
    arc: 'Desligados da Rede',
    keyEpisodes: [14, 15, 16],
    fromCatalog: true,
  },
  {
    epRange: [17, 25],
    title: 'Vido Prisioneiro e Guardião do Portão',
    summary:
      'Os irmãos gémeos são encontrados vivos num cubo de gelo. Roro revela que Vido está preso num robô desde há 10 anos. Seguem-se a fuga, o Guardião do Portão e a libertação de um velho amigo.',
    arc: 'Guardião do Portão',
    keyEpisodes: [17, 18, 20, 25],
    fromCatalog: true,
  },
  {
    epRange: [26, 34],
    title: 'Altar dos 20 Primordiais',
    summary:
      'Trabalho em equipa, a história antiga, o Altar dos 20 Primordiais, um labirinto infinito e um apagão encerram este bloco.',
    arc: 'Altar dos 20 Primordiais',
    keyEpisodes: [28, 29, 34],
    fromCatalog: false,
  },
  {
    epRange: [35, 45],
    title: 'Um Novo Ranger',
    summary:
      'Chega um Ranger novo e a equipa sofre separações. Seguem-se confrontos no mar, o ataque da Pureza, o ataque do Presidente e a ascensão do General Magnus.',
    arc: 'Um Novo Ranger',
    keyEpisodes: [35, 39, 42, 44],
    fromCatalog: false,
  },
  {
    epRange: [46, 50],
    title: 'Poder dos Elementos',
    summary:
      'Os Rangers enfrentam os pesadelos e descobrem o poder dos elementos. O arco termina com o episódio que dá nome a Lorde Arcano.',
    arc: 'Poder dos Elementos',
    keyEpisodes: [47, 48, 50],
    fromCatalog: true,
  },
  {
    epRange: [51, 63],
    title: 'Viagem, Regresso e Terremoto',
    summary:
      'O reencontro, a viagem, a volta ao mundo, a passagem por Portugal e o regresso a casa dão lugar a um tsunami, tremores de terra e uma erupção do solo.',
    arc: 'Viagem, Regresso e Terremoto',
    keyEpisodes: [51, 54, 56, 58, 59],
    fromCatalog: false,
  },
  {
    epRange: [64, 75],
    title: 'Metamorfos e Pedra Amarela',
    summary:
      'Faltam as peças, a grande história e a forja do Ranger Vermelho. O laranja misterioso é descoberto, os Metamorfos atacam e chega a Pedra Amarela.',
    arc: 'Metamorfos e Pedra Amarela',
    keyEpisodes: [66, 68, 73, 74, 75],
    fromCatalog: false,
  },
  {
    epRange: [76, 95],
    title: 'Cópia e Aliança do Mal',
    summary:
      'Armas e Rangers são copiados, os Mestres Morphin regressam e a Aliança do Mal forma-se. O Retorno dos Imperadores encerra o bloco, seguido de dragões e novos Rangers.',
    arc: 'Cópia e Aliança do Mal',
    keyEpisodes: [76, 77, 78, 81, 82],
    fromCatalog: false,
  },
  {
    epRange: [96, 110],
    title: 'Rangers de Pedra',
    summary:
      'Combate entre vermelhos, a caça, o controlo dos Zords e os Rangers de Pedra. A Mudança, o Passado e a Memória perdida fecham a fronteira deste arco.',
    arc: 'Rangers de Pedra',
    keyEpisodes: [96, 99, 100, 105, 109],
    fromCatalog: false,
  },
  {
    epRange: [111, 120],
    title: 'Eclipse Solar',
    summary:
      'Destino da Terra, prisão de gelo e poderes místicos conduzem aos Cavaleiros do Eclipse e à Lenda de Animaria, com Zords animais e o desafio dos Mestres.',
    arc: 'Eclipse Solar',
    keyEpisodes: [111, 114, 116, 117, 120],
    fromCatalog: false,
  },
  {
    epRange: [121, 131],
    title: 'Ameaça Final',
    summary:
      'A Invasão e o Contra-Ataque levam ao fim da Pureza, ao fim da Escuridão e ao fim de Arcano. A Coroação encerra a série antes da Despedida.',
    arc: 'Ameaça Final',
    keyEpisodes: [121, 125, 126, 131],
    fromCatalog: true,
  },
];

/** Índice A–Z do glossário, com a letra inicial de cada termo. */
export function glossaryIndex(entries: GlossaryEntry[] = GLOSSARY): string[] {
  return [...new Set(entries.map((e) => e.term.charAt(0).toUpperCase()))].sort((a, b) =>
    a.localeCompare(b, 'pt'),
  );
}

/** Arco que contém um dado episódio, ou `null`. */
export function arcForEpisode(num: number, arcs: TimelineArc[] = TIMELINE): TimelineArc | null {
  return arcs.find((a) => num >= a.epRange[0] && num <= a.epRange[1]) ?? null;
}

/** Índice da letra inicial de um termo no glossário. */
export function firstLetter(term: string): string {
  return term.charAt(0).toUpperCase();
}

