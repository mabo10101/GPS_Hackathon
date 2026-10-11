import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import '@fontsource-variable/nunito';
import {
  ARRIVAL_PHOTO, CANOPY_LAYER, DESTINATION, ENTRANCES, GUIDES, LENNY_LINES, PRELOAD_IMAGES, ROUTE_STEPS,
  completeCode, matchesDestination, searchPlaces, DEFAULT_SUGGESTIONS, type CampusPlace, type Guide, type GuideId,
} from './route';
import TileField from './TileField';
import './indoor.css';

type Screen = 'welcome' | 'guide' | 'entrance' | 'step' | 'arrival';

const GUIDE_STORAGE_KEY = 'goforth.guide';

function loadGuide(): GuideId | null {
  try {
    const stored = localStorage.getItem(GUIDE_STORAGE_KEY);
    return GUIDES.some((guide) => guide.id === stored && guide.available) ? stored as GuideId : null;
  } catch {
    return null;
  }
}

function saveGuide(id: GuideId) {
  try {
    localStorage.setItem(GUIDE_STORAGE_KEY, id);
  } catch {
    // Storage can be unavailable in private browsing; the guide is just picked again next time.
  }
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Types text out like a game dialogue box. Returns the visible text and a way to finish instantly. */
function useTypewriter(text: string) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (prefersReducedMotion()) {
      setCount(text.length);
      return;
    }
    setCount(0);
    const timer = setInterval(() => {
      setCount((current) => {
        if (current >= text.length) {
          clearInterval(timer);
          return current;
        }
        return current + 1;
      });
    }, 22);
    return () => clearInterval(timer);
  }, [text]);
  return { visible: text.slice(0, count), done: count >= text.length, finish: () => setCount(text.length) };
}

interface IndoorAppProps {
  onClose: () => void;
}

export default function IndoorApp({ onClose }: IndoorAppProps) {
  const [screen, setScreen] = useState<Screen>('welcome');
  const [guideId, setGuideId] = useState<GuideId | null>(loadGuide);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    // Load every photo up front so the walk works with bad signal indoors.
    for (const src of PRELOAD_IMAGES) {
      const image = new Image();
      image.src = src;
    }
  }, []);

  const guide = GUIDES.find((item) => item.id === guideId) ?? GUIDES.find((item) => item.id === 'lenny')!;

  return (
    <div className="indoor" role="dialog" aria-modal="true" aria-label="Indoor navigation">
      {screen === 'welcome' && <WelcomeScreen
        onClose={onClose}
        onFound={() => setScreen(guideId ? 'entrance' : 'guide')}
      />}
      {screen === 'guide' && <GuideScreen
        initial={guideId}
        onBack={() => setScreen('welcome')}
        onBegin={(id) => { saveGuide(id); setGuideId(id); setScreen('entrance'); }}
      />}
      {screen === 'entrance' && <EntranceScreen
        guide={guide}
        onBack={() => setScreen('welcome')}
        onChangeGuide={() => setScreen('guide')}
        onConfirm={() => { setStepIndex(0); setScreen('step'); }}
      />}
      {screen === 'step' && <StepScreen
        guide={guide}
        index={stepIndex}
        onBack={() => setScreen('entrance')}
        onPrev={() => setStepIndex((index) => Math.max(0, index - 1))}
        onNext={() => {
          if (stepIndex === ROUTE_STEPS.length - 1) setScreen('arrival');
          else setStepIndex(stepIndex + 1);
        }}
      />}
      {screen === 'arrival' && <ArrivalScreen
        guide={guide}
        onBack={() => setScreen('step')}
        onDone={onClose}
        onAnotherRoom={() => setScreen('welcome')}
      />}
    </div>
  );
}

function BackButton({ onClick, label = 'Back' }: { onClick: () => void; label?: string }) {
  return (
    <button className="in-back" onClick={onClick} aria-label={label}>
      <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
        <path d="M20 12H5m6-7-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" />
      </svg>
    </button>
  );
}

function Sprite({ guide, className = '' }: { guide: Guide; className?: string }) {
  return <img className={`in-sprite ${className}`} src={guide.sprite} alt="" draggable={false} />;
}

/** Restarts a one-shot CSS animation class on an element, even if it is already applied. */
function replay(element: HTMLElement | null, className: string) {
  if (!element) return;
  element.classList.remove(className);
  void element.offsetWidth;
  element.classList.add(className);
}

function WelcomeScreen({ onClose, onFound }: { onClose: () => void; onFound: () => void }) {
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const lenny = GUIDES.find((guide) => guide.id === 'lenny')!;
  const [focused, setFocused] = useState(false);
  const typed = query.trim() !== '';
  const suggestions = typed ? searchPlaces(query) : focused ? DEFAULT_SUGGESTIONS : [];
  const hasMapped = typed && suggestions.some((place) => place.mapped);
  const top = typed ? suggestions[0] : undefined;
  const ghost = top ? completeCode(query, top.code) : null;
  const blurTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const spriteRef = useRef<HTMLImageElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const reject = (text: string) => {
    setMessage(text);
    replay(cardRef.current, 'in-shake');
  };

  const choose = (place: CampusPlace) => {
    if (place.mapped) onFound();
    else reject(`${place.name} ${LENNY_LINES.notMappedYet}`);
  };

  const submit = () => {
    if (matchesDestination(query)) onFound();
    else if (top && (ghost !== null || suggestions.length === 1)) choose(top);
    else reject(LENNY_LINES.notFound);
  };

  return (
    <section className="in-screen in-bg-full in-welcome">
      <TileField />
      <BackButton onClick={onClose} label="Back to map" />
      <div className="in-welcome-hero">
        <span className="in-welcome-lenny-wrap">
          <img ref={spriteRef} className="in-sprite in-welcome-sprite" src={lenny.sprite} alt="" draggable={false} />
        </span>
        <p className="in-logo">Go Forth</p>
      </div>
      <div className="in-window" ref={cardRef}>
        <h1 className="in-window-bar"><span aria-hidden="true">◆</span>New Quest<span aria-hidden="true">◆</span></h1>
        <div className="in-window-body">
        <p className="in-window-question">Where would you like to go?</p>
        <form className="in-search" role="search" onSubmit={(event) => { event.preventDefault(); submit(); }}>
          <label htmlFor="in-room" className="in-visually-hidden">Room</label>
          <span className="in-input-wrap">
            {ghost && <span className="in-ghost" aria-hidden="true">
              <span className="in-ghost-typed">{query}</span>{ghost}
            </span>}
            <input
              id="in-room"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setMessage(null);
                replay(spriteRef.current, 'in-hop-once');
              }}
              onKeyDown={(event) => {
                const atEnd = event.currentTarget.selectionStart === query.length;
                if (top && ghost && (event.key === 'Tab' || (event.key === 'ArrowRight' && atEnd))) {
                  event.preventDefault();
                  setQuery(top.code);
                }
              }}
              onFocus={() => { clearTimeout(blurTimer.current); setFocused(true); }}
              // Delay hiding so a tap on a suggestion still lands.
              onBlur={() => { blurTimer.current = setTimeout(() => setFocused(false), 200); }}
              placeholder="Try ENG 118"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              enterKeyHint="go"
            />
          </span>
          <button type="submit" aria-label="Search">
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              <circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="2.5" />
              <path d="m15.5 15.5 5 5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" />
            </svg>
          </button>
        </form>
        {suggestions.length > 0 && <div className="in-result-wrap">
          <ul className="in-results" aria-label="Suggestions">
            {suggestions.map((place) => <li key={place.code}>
              <button className={`in-result ${place.mapped ? '' : 'is-soon'}`} onClick={() => choose(place)}>
                <span className="in-result-code">{place.code}</span>
                <span className="in-result-meta">{place.name}</span>
                {!place.mapped && <span className="in-soon">Soon</span>}
              </button>
            </li>)}
          </ul>
          {hasMapped && <span className="in-burst" aria-hidden="true">
            {Array.from({ length: 8 }, (_, index) => <i key={index} style={{ '--angle': `${index * 45}deg` } as CSSProperties} />)}
          </span>}
        </div>}
        {message && <p className="in-hint" role="alert">{message}</p>}
        </div>
      </div>
    </section>
  );
}

function GuideScreen({ initial, onBack, onBegin }: {
  initial: GuideId | null;
  onBack: () => void;
  onBegin: (id: GuideId) => void;
}) {
  const [selected, setSelected] = useState<GuideId>(initial ?? 'lenny');
  const [message, setMessage] = useState(LENNY_LINES.tagline);
  const current = GUIDES.find((guide) => guide.id === selected)!;

  const pick = (guide: Guide) => {
    if (!guide.available) {
      setMessage(`${guide.name} ${LENNY_LINES.comingSoon}`);
      return;
    }
    setSelected(guide.id);
    setMessage(LENNY_LINES.chosen);
  };

  return (
    <section className="in-screen in-bg-peek">
      <PeekTiles />
      <BackButton onClick={onBack} />
      <div className="in-guide-body">
        <h1 className="in-heading">Who would you like to guide you?</h1>
        <div className="in-guides" role="radiogroup" aria-label="Guide">
          {GUIDES.map((guide) => (
            <button
              key={guide.id}
              role="radio"
              aria-checked={guide.id === selected}
              className={`in-guide ${guide.id === selected ? 'is-selected' : ''} ${guide.available ? '' : 'is-soon'}`}
              onClick={() => pick(guide)}
            >
              <span className="in-guide-circle">
                <img src={guide.sprite} alt="" className="in-sprite" draggable={false} />
              </span>
              <span className="in-guide-name">{guide.name}</span>
              {!guide.available && <span className="in-soon">Soon</span>}
            </button>
          ))}
        </div>
        <p className="in-guide-message" aria-live="polite">{message}</p>
        <button className="in-primary" onClick={() => onBegin(current.id)}>Begin</button>
      </div>
    </section>
  );
}

function PeekTiles() {
  return (
    <div className="in-peek" aria-hidden="true">
      <span className="in-tile-giant" />
    </div>
  );
}

/** Decorative castle floor plan for the entrance screen. Not a real map of Engineering 1. */
function Blueprint() {
  const door = (x: number, y: number, rotate: number) => (
    <g transform={`translate(${x} ${y}) rotate(${rotate})`}>
      <path d="M-18 0h36" className="in-bp-gap" />
      <path d="M-18 0v-30M-18 -30a30 30 0 0 1 30 30" />
    </g>
  );
  return (
    <svg className="in-blueprint" viewBox="0 0 400 880" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <g>
        <rect x="60" y="180" width="280" height="520" />
        <rect x="72" y="192" width="256" height="496" />
        <circle cx="60" cy="180" r="34" /><circle cx="340" cy="180" r="34" />
        <circle cx="60" cy="700" r="34" /><circle cx="340" cy="700" r="34" />
        <path d="M72 420h96M232 420h96M200 192v120M200 372v48M136 540h128v148" />
        <path d="M200 700v-90q0-40 40-60t40-70" className="in-bp-route" />
        {door(200, 700, 0)}{door(60, 520, 90)}{door(340, 330, -90)}{door(150, 180, 180)}
        <path d="M60 760v24M340 760v24M60 772h280" />
        <g transform="translate(330 90)">
          <circle r="22" /><path d="M0 -30v60M-30 0h60M0 -22l6 16h-12z" />
        </g>
      </g>
    </svg>
  );
}

function EntranceScreen({ guide, onBack, onChangeGuide, onConfirm }: {
  guide: Guide;
  onBack: () => void;
  onChangeGuide: () => void;
  onConfirm: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [showUnmapped, setShowUnmapped] = useState(false);
  const entrance = ENTRANCES.find((item) => item.id === selected);

  const confirm = () => {
    if (!entrance) return;
    if (entrance.mapped) onConfirm();
    else setShowUnmapped(true);
  };

  return (
    <section className="in-screen in-bg-blueprint">
      <PeekTiles />
      <Blueprint />
      <BackButton onClick={onBack} />
      <div className="in-entrance-body">
        <h1 className="in-room">{DESTINATION.code}</h1>
        <p className="in-subtitle">Where are you entering from?</p>
        <div className="in-entrances" role="radiogroup" aria-label="Entrance">
          {ENTRANCES.map((item) => (
            <button
              key={item.id}
              role="radio"
              aria-checked={item.id === selected}
              className={`in-entrance ${item.id === selected ? 'is-selected' : ''}`}
              onClick={() => { setSelected(item.id); setShowUnmapped(false); }}
            >
              <span className={`in-entrance-screen ${item.mapped ? '' : 'is-locked'}`}>
                {item.photo
                  ? <img src={item.photo} alt="" draggable={false} />
                  : <span className="in-entrance-placeholder" aria-hidden="true" />}
                {!item.mapped && <span className="in-lock" aria-label="Not mapped yet">
                  <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                    <path d="M4.5 7V5a3.5 3.5 0 0 1 7 0v2" fill="none" stroke="currentColor" strokeWidth="1.8" />
                    <rect x="3" y="7" width="10" height="7.5" rx="1.5" fill="currentColor" />
                  </svg>
                </span>}
                {item.id === selected && <span className="in-check" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="18" height="18">
                    <path d="m5 12 5 5 9-10" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="square" />
                  </svg>
                </span>}
              </span>
              <span className="in-entrance-label">{item.label}</span>
            </button>
          ))}
        </div>
        <button className="in-primary" onClick={confirm} disabled={!entrance}>Confirm</button>
        <button className="in-link" onClick={onChangeGuide}>Guide: {guide.name} · Change</button>
      </div>
      {showUnmapped && <div className="in-sheet" role="alertdialog" aria-label="Entrance not mapped">
        <div className="in-sheet-card">
          <Sprite guide={guide} className="in-sheet-sprite in-bob" />
          <span className="in-nametag">{guide.name}</span>
          <p>{LENNY_LINES.unmappedEntrance}</p>
          <button className="in-primary" onClick={() => { setSelected('business'); setShowUnmapped(false); }}>
            Use Business Entrance
          </button>
          <button className="in-secondary" onClick={() => setShowUnmapped(false)}>Go back</button>
        </div>
      </div>}
    </section>
  );
}

function ProgressRow({ index }: { index: number }) {
  return (
    <div className="in-progress" aria-label={`Step ${index + 1} of ${ROUTE_STEPS.length}`}>
      <span className="in-progress-end">Ent. 1</span>
      <ol className="in-dots">
        {ROUTE_STEPS.map((step, dotIndex) => (
          <li
            key={step.id}
            className={dotIndex < index ? 'is-done' : dotIndex === index ? 'is-current' : ''}
            aria-hidden="true"
          />
        ))}
      </ol>
      <span className="in-progress-end">{DESTINATION.code}</span>
    </div>
  );
}

function DialogueBubble({ guide, direction, lore, sprite, celebrate = false }: {
  guide: Guide;
  direction: string;
  lore?: string;
  sprite?: ReactNode;
  celebrate?: boolean;
}) {
  const { visible, done, finish } = useTypewriter(direction);
  return (
    <div className="in-dialogue">
      <div className="in-dialogue-top">
        <span className="in-nametag">{guide.name}</span>
        {sprite ?? <Sprite guide={guide} className={`in-dialogue-sprite ${celebrate ? 'in-hop' : 'in-bob'}`} />}
      </div>
      <div className="in-bubble" onClick={finish}>
        <p className="in-direction" aria-hidden="true">
          {visible}<span className="in-direction-rest">{direction.slice(visible.length)}</span>
        </p>
        <p className="in-visually-hidden" aria-live="polite">{direction}</p>
        {lore && <>
          <hr />
          <p className={`in-lore ${done ? 'is-shown' : ''}`}>
            <span className="in-lore-label">
              <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                <path d="M2 2h5l1 1 1-1h5v11H9l-1 1-1-1H2z M8 3v10" fill="none" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              {guide.name}&rsquo;s Lore
            </span>
            {lore}
          </p>
        </>}
      </div>
    </div>
  );
}

const LEAF_COLORS = ['#5d722c', '#708835', '#769e4a', '#8bb35a'];

/** Canopy clumps that sway out of sync, plus leaves drifting down. Purely decorative. */
function ForestFx() {
  const canopy = { backgroundImage: `url(${CANOPY_LAYER})` };
  return (
    <div className="in-forest-fx" aria-hidden="true">
      {[0, 1, 2, 3].map((band) => (
        <span key={band} className={`in-canopy in-canopy-${band}`} style={canopy} />
      ))}
      {Array.from({ length: 9 }, (_, index) => (
        <span
          key={index}
          className="in-leaf-fall"
          style={{
            left: `${6 + ((index * 41) % 88)}%`,
            animationDuration: `${9 + (index % 4) * 2.5}s`,
            animationDelay: `${-index * 1.7}s`,
          }}
        >
          <i
            className="in-leaf"
            style={{
              background: LEAF_COLORS[index % LEAF_COLORS.length],
              animationDuration: `${2.2 + (index % 3) * 0.6}s`,
              transform: `scale(${0.8 + (index % 3) * 0.2})`,
            }}
          />
        </span>
      ))}
    </div>
  );
}

function StepScreen({ guide, index, onBack, onPrev, onNext }: {
  guide: Guide;
  index: number;
  onBack: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const step = ROUTE_STEPS[index];
  const last = index === ROUTE_STEPS.length - 1;
  const handlers = useRef({ onPrev, onNext });
  handlers.current = { onPrev, onNext };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') handlers.current.onPrev();
      if (event.key === 'ArrowRight') handlers.current.onNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <section className="in-screen in-bg-forest">
      <ForestFx />
      <div className="in-step-header">
        <BackButton onClick={onBack} />
        <ProgressRow index={index} />
      </div>
      <div className="in-photo-wrap">
        <figure className="in-photo">
          <img key={step.id} src={step.photo} alt={`Step ${index + 1}: ${step.direction}`} />
          {step.landmark && <span
            className="in-landmark"
            style={{ left: `${step.landmark.x}%`, top: `${step.landmark.y}%` }}
            aria-hidden="true"
          />}
        </figure>
        <button className="in-arrow in-arrow-prev" onClick={onPrev} disabled={index === 0} aria-label="Previous step">
          <ArrowIcon direction="left" />
        </button>
        <button className="in-arrow in-arrow-next" onClick={onNext} aria-label={last ? 'Arrive' : 'Next step'}>
          <ArrowIcon direction="right" />
        </button>
      </div>
      <DialogueBubble guide={guide} direction={step.direction} lore={step.lore} />
    </section>
  );
}

function ArrowIcon({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
      <path
        d={direction === 'left' ? 'M20 12H5m6-7-7 7 7 7' : 'M4 12h15m-6-7 7 7-7 7'}
        fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square"
      />
    </svg>
  );
}

const CONFETTI_COLORS = ['#FFC904', '#FFF6D5', '#5C3D24', '#FFFFFF', '#FFE07A'];

function Confetti() {
  if (prefersReducedMotion()) return null;
  return (
    <div className="in-confetti" aria-hidden="true">
      {Array.from({ length: 36 }, (_, index) => (
        <span
          key={index}
          style={{
            left: `${(index * 37) % 100}%`,
            background: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
            animationDelay: `${(index % 9) * 0.18}s`,
            animationDuration: `${2.4 + (index % 5) * 0.35}s`,
          }}
        />
      ))}
    </div>
  );
}

function ArrivalScreen({ guide, onBack, onDone, onAnotherRoom }: {
  guide: Guide;
  onBack: () => void;
  onDone: () => void;
  onAnotherRoom: () => void;
}) {
  return (
    <section className="in-screen in-bg-clearing in-arrival">
      <span className="in-sunburst" aria-hidden="true" />
      <Confetti />
      <div className="in-step-header">
        <BackButton onClick={onBack} />
        <p className="in-huzzah">HUZZAH!</p>
      </div>
      <div className="in-photo-wrap">
        <figure className="in-photo">
          <img src={ARRIVAL_PHOTO} alt={`The door of ${DESTINATION.code}`} />
          <span className="in-sparkle in-sparkle-a" aria-hidden="true" />
          <span className="in-sparkle in-sparkle-b" aria-hidden="true" />
          <span className="in-sparkle in-sparkle-c" aria-hidden="true" />
        </figure>
      </div>
      <DialogueBubble guide={guide} direction={LENNY_LINES.arrival} lore={LENNY_LINES.arrivalLore} celebrate />
      <div className="in-arrival-actions">
        <button className="in-secondary" onClick={onAnotherRoom}>Find another room</button>
        <button className="in-primary" onClick={onDone}>Done</button>
      </div>
    </section>
  );
}
