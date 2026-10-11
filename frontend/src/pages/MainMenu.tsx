import MapView from '../components/MapView';
import BrandLogo from '../components/BrandLogo';

export default function MainMenu({ onMap, onIndoor }: { onMap: () => void; onIndoor: () => void }) {
  return <main className="app main-menu" aria-label="Campus navigation main menu">
    <MapView />
    <div className="menu-shade" />
    <section className="menu-card" aria-labelledby="menu-title">
      <p className="menu-eyebrow">UCF CAMPUS · YOUR NEXT ADVENTURE</p>
      <div className="menu-brand"><BrandLogo /><h1 id="menu-title">Go Forth<span>Find your way.</span></h1></div>
      <p className="menu-intro">Across campus or down the hallway—choose where your journey starts.</p>
      <nav className="menu-options" aria-label="Navigation modes">
        <button onClick={onMap} className="menu-option">
          <svg viewBox="0 0 32 32" aria-hidden="true"><path d="m3 7 8-3 10 4 8-3v22l-8 3-10-4-8 3ZM11 4v22M21 8v22" /><circle cx="16" cy="14" r="3" /></svg>
          <span><strong>Explore campus</strong><span>Live GPS, walking routes, and your sprite guide.</span></span><b aria-hidden="true">→</b>
        </button>
        <button onClick={onIndoor} className="menu-option">
          <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5 29V3h22v26M10 29V8h12v21M3 29h26" /><circle cx="19" cy="19" r="1" /></svg>
          <span><strong>Find a room</strong><span>Follow a photo guide from the entrance to your classroom.</span></span><b aria-hidden="true">→</b>
        </button>
      </nav>
      <p className="menu-footer">One campus. Two ways to get there.</p>
    </section>
  </main>;
}
