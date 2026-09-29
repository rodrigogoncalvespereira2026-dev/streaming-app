import { describe, expect, it } from 'vitest';
import {
  GLOSSARY,
  MASTERS,
  TIMELINE,
  VILLAINS,
  arcForEpisode,
  firstLetter,
  glossaryIndex,
} from '../src/data/universe';
import { episodes } from '../src/data/catalog';

const REQUIRED_GLOSSARY = [
  'Rede Morphin',
  'Coroa dos 20 Espa\u00e7os',
  'Pedras de Poder',
  'Zord',
  'Megazord',
  'Deboss',
  'Morphin',
  'Pegaipso',
  'Metamorpho',
  'Ranger',
  'Presa',
  'Zord Adormecido',
];

describe('universe data integrity', () => {
  it('covers every episode from 1 to 131 with contiguous arcs', () => {
    const sorted = [...TIMELINE].sort((a, b) => a.epRange[0] - b.epRange[0]);
    expect(sorted[0]?.epRange[0]).toBe(1);
    expect(sorted[sorted.length - 1]?.epRange[1]).toBe(131);
    for (let i = 1; i < sorted.length; i += 1) {
      const prev = sorted[i - 1];
      const cur = sorted[i];
      expect(cur?.epRange[0]).toBe((prev?.epRange[1] ?? 0) + 1);
    }
  });

  it('never references an episode outside the catalog', () => {
    const total = episodes.length;
    for (const arc of TIMELINE) {
      for (const ep of arc.keyEpisodes) {
        expect(ep).toBeGreaterThanOrEqual(arc.epRange[0]);
        expect(ep).toBeLessThanOrEqual(arc.epRange[1]);
        expect(ep).toBeLessThanOrEqual(total);
      }
    }
    for (const m of MASTERS) {
      if (m.debut !== null) expect(m.debut).toBeLessThanOrEqual(total);
    }
    for (const v of VILLAINS) {
      if (v.firstAppearance !== null) expect(v.firstAppearance).toBeLessThanOrEqual(total);
      if (v.defeatedIn !== null) expect(v.defeatedIn).toBeLessThanOrEqual(total);
    }
  });

  it('includes the four mandatory villains', () => {
    const ids = VILLAINS.map((v) => v.id);
    expect(ids).toContain('maltherion');
    expect(ids).toContain('valtherion');
    expect(ids).toContain('lorde-arcano');
    expect(ids).toContain('presidente');
  });

  it('keeps threat within 1-5', () => {
    for (const v of VILLAINS) {
      expect(v.threat).toBeGreaterThanOrEqual(1);
      expect(v.threat).toBeLessThanOrEqual(5);
    }
  });

  it('has at least 20 glossary entries and all mandatory terms', () => {
    expect(GLOSSARY.length).toBeGreaterThanOrEqual(20);
    const terms = GLOSSARY.map((g) => g.term);
    for (const required of REQUIRED_GLOSSARY) {
      expect(terms).toContain(required);
    }
  });

  it('gives every master a colour, zord and weapon', () => {
    for (const m of MASTERS) {
      expect(m.color).toMatch(/^#[0-9a-f]{6}$/i);
      expect(m.zord.name.length).toBeGreaterThan(0);
      expect(m.weapon.length).toBeGreaterThan(0);
    }
  });
});

describe('glossaryIndex', () => {
  it('returns unique letters sorted alphabetically', () => {
    const idx = glossaryIndex();
    expect(idx.length).toBeGreaterThan(1);
    expect([...idx].sort((a, b) => a.localeCompare(b, 'pt'))).toEqual(idx);
    expect(new Set(idx).size).toBe(idx.length);
  });
});

describe('firstLetter', () => {
  it('uppercases the first character', () => {
    expect(firstLetter('zord')).toBe('Z');
  });
});

describe('arcForEpisode', () => {
  it('finds the arc containing an episode', () => {
    expect(arcForEpisode(1)?.epRange[0]).toBe(1);
    expect(arcForEpisode(50)?.title).toBe('Poder dos Elementos');
    expect(arcForEpisode(131)?.epRange[1]).toBe(131);
  });

  it('returns null outside the range', () => {
    expect(arcForEpisode(0)).toBeNull();
    expect(arcForEpisode(999)).toBeNull();
  });
});
