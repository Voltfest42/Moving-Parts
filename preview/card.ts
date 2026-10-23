/**
 * Fills in the link-preview card for one site, chosen with ?site=.
 * The illustrations are the same ones the front page uses on its cards.
 */

interface Card {
  kicker: string;
  title: string;
  lede: string;
  domain: string;
  /** Inner markup of a `viewBox="0 0 120 64"` illustration, or null for the gear train. */
  art: string | null;
  long?: boolean;
}

const CARDS: Record<string, Card> = {
  front: {
    kicker: 'Interactive explainers',
    title: 'Moving Parts',
    lede: 'Big ideas in mathematics, computer science and physics, taken apart so you can watch them work.',
    domain: 'moving-parts.dev',
    art: null,
  },
  dijkstra: {
    kicker: 'Moving Parts · Algorithms',
    title: 'Beyond Dijkstra',
    lede: 'The 2022–2025 breakthroughs in shortest paths, explained with live demos.',
    domain: 'dijkstra.moving-parts.dev',
    art: `
      <g class="edge">
        <line x1="42" y1="16" x2="78" y2="30" /><line x1="46" y1="50" x2="78" y2="30" />
        <line x1="78" y1="30" x2="106" y2="14" /><line x1="78" y1="30" x2="104" y2="50" />
        <line x1="46" y1="50" x2="104" y2="50" />
      </g>
      <g class="edgeTree"><line x1="14" y1="38" x2="42" y2="16" /><line x1="14" y1="38" x2="46" y2="50" /></g>
      <circle class="settled" cx="14" cy="38" r="6" /><circle class="settled" cx="42" cy="16" r="6" />
      <circle class="settled" cx="46" cy="50" r="6" /><circle class="frontier" cx="78" cy="30" r="6" />
      <circle class="unvisited" cx="106" cy="14" r="6" /><circle class="unvisited" cx="104" cy="50" r="6" />`,
  },
  rulebook: {
    kicker: 'Moving Parts · Machine learning',
    title: 'From Black Box to Rulebook',
    lede: 'How researchers pull readable rules out of machine-learning models, explained with live demos.',
    domain: 'rulebook.moving-parts.dev',
    long: true,
    art: `
      <g class="wire">
        <line x1="2" y1="20" x2="16" y2="20" /><line x1="2" y1="32" x2="16" y2="32" />
        <line x1="2" y1="44" x2="16" y2="44" /><line x1="56" y1="32" x2="66" y2="32" />
      </g>
      <rect class="blackbox" x="16" y="10" width="40" height="44" rx="6" />
      <g class="rules">
        <line x1="74" y1="18" x2="114" y2="18" /><line x1="74" y1="32" x2="104" y2="32" />
        <line x1="74" y1="46" x2="110" y2="46" />
      </g>`,
  },
  sky: {
    kicker: 'Moving Parts · An interactive course',
    title: 'The Clockwork Sky',
    lede: 'Astronomy and astrophysics from the ground up: from the sky you can see to the physics inside the stars.',
    domain: 'sky.moving-parts.dev',
    long: true,
    // The front page's orbit, with the planet held still on the near side.
    art: `
      <ellipse class="orbit" cx="60" cy="32" rx="48" ry="18" />
      <circle class="sun" cx="60" cy="32" r="9" />
      <circle class="planet" cx="96.8" cy="43.6" r="5" />`,
  },
};

async function render() {
  const key = new URLSearchParams(location.search).get('site') ?? 'front';
  const card = CARDS[key];
  if (!card) throw new Error(`No preview card called "${key}"`);

  const text = (id: string, value: string) => (document.getElementById(id)!.textContent = value);
  text('kicker', card.kicker);
  text('title', card.title);
  text('lede', card.lede);
  text('domain', card.domain);
  document.getElementById('preview')!.classList.toggle('long', Boolean(card.long));

  const art = document.getElementById('art')!;
  if (card.art) {
    art.innerHTML = `<svg class="art" viewBox="0 0 120 64" aria-hidden="true">${card.art}</svg>`;
  } else {
    art.innerHTML = '<svg id="gears" class="gears" viewBox="34 22 288 214" aria-hidden="true"></svg>';
    await import('../src/gears');
  }

  await document.fonts.ready;
  document.body.dataset.ready = 'true';
}

void render();
