/**
 * The gear train in the hero: three meshing gears that turn slowly on their own
 * and can be dragged. Every gear's angle follows from one drive angle, so the
 * teeth stay meshed however the train is turned.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';
/** Gear module: the size of one tooth. Meshing gears must share it. */
const MODULE = 9;
/** Idle speed of the drive gear, in degrees per second. */
const IDLE_SPEED = 6;

interface GearSpec {
  teeth: number;
  className: string;
  /** Where the gear sits, as a direction (radians) from the gear it meshes with. */
  direction?: number;
}

interface Gear {
  teeth: number;
  x: number;
  y: number;
  /** Angle (radians) of its first tooth when the drive angle is 0. */
  phase: number;
  /** +1 turns with the drive gear, -1 against it. */
  sense: number;
  element: SVGGElement;
}

const TRAIN: GearSpec[] = [
  { teeth: 15, className: 'gearDrive' },
  { teeth: 10, className: 'gearMid', direction: (-35 * Math.PI) / 180 },
  { teeth: 7, className: 'gearIdler', direction: (40 * Math.PI) / 180 },
];

/** A stylised spur gear centred on the origin, with a tooth pointing along +x. */
function gearPath(teeth: number): string {
  const pitchRadius = (MODULE * teeth) / 2;
  const tip = pitchRadius + 0.85 * MODULE;
  const root = pitchRadius - 1.05 * MODULE;
  const pitch = (2 * Math.PI) / teeth;
  const at = (r: number, a: number) => `${(r * Math.cos(a)).toFixed(2)} ${(r * Math.sin(a)).toFixed(2)}`;

  let d = '';
  for (let i = 0; i < teeth; i++) {
    const c = i * pitch;
    d += `${i === 0 ? 'M' : 'L'}${at(root, c - 0.29 * pitch)}`;
    d += `L${at(tip, c - 0.18 * pitch)}`;
    d += `A${tip} ${tip} 0 0 1 ${at(tip, c + 0.18 * pitch)}`;
    d += `L${at(root, c + 0.29 * pitch)}`;
    d += `A${root} ${root} 0 0 1 ${at(root, c + 0.71 * pitch)}`;
  }
  return d + 'Z';
}

function buildTrain(svg: SVGSVGElement): Gear[] {
  const gears: Gear[] = [];
  for (const spec of TRAIN) {
    const pitch = (2 * Math.PI) / spec.teeth;
    let x = 120;
    let y = 150;
    let phase = 0;
    let sense = 1;

    const prev = gears.at(-1);
    if (prev && spec.direction !== undefined) {
      const dir = spec.direction;
      const distance = (MODULE * (prev.teeth + spec.teeth)) / 2;
      x = prev.x + distance * Math.cos(dir);
      y = prev.y + distance * Math.sin(dir);
      sense = -prev.sense;
      // Where the line between the centres crosses the previous gear, in teeth (0 = a tooth's centre).
      // A tooth there must face a gap (half a tooth along) on this gear.
      const prevPitch = (2 * Math.PI) / prev.teeth;
      const offset = (dir - prev.phase) / prevPitch;
      phase = dir + Math.PI - (0.5 - offset) * pitch;
    }

    const element = document.createElementNS(SVG_NS, 'g');
    element.setAttribute('class', `gear ${spec.className}`);
    const body = document.createElementNS(SVG_NS, 'path');
    body.setAttribute('d', gearPath(spec.teeth));
    const hole = document.createElementNS(SVG_NS, 'circle');
    hole.setAttribute('class', 'gearHole');
    hole.setAttribute('r', String(Math.max(5, spec.teeth * 0.9)));
    element.append(body, hole);
    svg.append(element);

    gears.push({ teeth: spec.teeth, x, y, phase, sense, element });
  }
  return gears;
}

function start(svg: SVGSVGElement) {
  const gears = buildTrain(svg);
  const driveTeeth = gears[0].teeth;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /** Drive-gear angle, in radians. */
  let drive = 0;

  const draw = () => {
    for (const g of gears) {
      const angle = g.phase + (g.sense * drive * driveTeeth) / g.teeth;
      g.element.setAttribute('transform', `translate(${g.x.toFixed(2)} ${g.y.toFixed(2)}) rotate(${((angle * 180) / Math.PI).toFixed(3)})`);
    }
  };

  // ---- dragging: turn whichever gear is grabbed, and the rest follow ----
  let grabbed: { gear: Gear; lastPointerAngle: number } | null = null;

  const pointerAngle = (gear: Gear, event: PointerEvent) => {
    const matrix = svg.getScreenCTM();
    if (!matrix) return 0;
    const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    return Math.atan2(p.y - gear.y, p.x - gear.x);
  };

  svg.addEventListener('pointerdown', (event) => {
    const gear = gears.find((g) => g.element.contains(event.target as Node));
    if (!gear) return;
    grabbed = { gear, lastPointerAngle: pointerAngle(gear, event) };
    svg.setPointerCapture(event.pointerId);
    svg.classList.add('dragging');
    event.preventDefault();
  });

  svg.addEventListener('pointermove', (event) => {
    if (!grabbed) return;
    const a = pointerAngle(grabbed.gear, event);
    // Unwrap so crossing ±180° doesn't spin the train a full turn.
    let delta = a - grabbed.lastPointerAngle;
    if (delta > Math.PI) delta -= 2 * Math.PI;
    if (delta < -Math.PI) delta += 2 * Math.PI;
    grabbed.lastPointerAngle = a;
    drive += (delta * grabbed.gear.teeth) / (grabbed.gear.sense * driveTeeth);
    draw();
  });

  const release = () => {
    grabbed = null;
    svg.classList.remove('dragging');
  };
  svg.addEventListener('pointerup', release);
  svg.addEventListener('pointercancel', release);

  // ---- idle turning ----
  let last = performance.now();
  const tick = (now: number) => {
    const dt = Math.min(now - last, 100) / 1000;
    last = now;
    if (!grabbed && !reducedMotion.matches) {
      drive += (IDLE_SPEED * Math.PI * dt) / 180;
      draw();
    }
    requestAnimationFrame(tick);
  };

  draw();
  requestAnimationFrame(tick);
}

const svg = document.querySelector<SVGSVGElement>('#gears');
if (svg) start(svg);

// The orbiting planet on the course card is an SVG animation, which CSS can't slow down.
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  for (const art of document.querySelectorAll<SVGSVGElement>('svg.art')) art.pauseAnimations();
}
