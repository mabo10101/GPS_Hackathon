import { useEffect, useState } from 'react';
import spriteOne from '../data/pixil-frame-0 (1).png';
import spriteTwo from '../data/pixil-frame-0 (2).png';
import spriteThree from '../data/pixil-frame-0 (3).png';
import type { NearestRoute } from '../services/routing';
import { distanceMeters, type UserLocation } from '../services/location';
import { advanceGuidance } from '../services/guidance';
import './SpriteGuide.css';
import GuideDialogue from './GuideDialogue';

const CHARACTERS = [
  { name: 'Knightro', greeting: 'Your next quest awaits!', turn: 'Onward, Knight!', arrival: 'Quest complete! Nicely done.' },
  { name: 'Citronaut', greeting: 'Ready for a campus expedition?', turn: 'Next stop, explorer!', arrival: 'Touchdown! We made it.' },
  { name: 'Lenny', greeting: 'Let’s take a little campus stroll.', turn: 'You’ve got this. Here’s our next move.', arrival: 'Look at us go! We made it.' },
];

export default function SpriteGuide({ route, location, navigating, arrived }: {
  route: NearestRoute; location: UserLocation | null; navigating: boolean; arrived: boolean;
}) {
  const [sprite, setSprite] = useState(0);
  const [progress, setProgress] = useState({ route, index: 0 });
  const index = progress.route === route ? progress.index : 0;
  useEffect(() => {
    setProgress((previous) => {
      const current = previous.route === route ? previous.index : 0;
      return { route, index: navigating && location ? advanceGuidance(route.steps, current, location) : current };
    });
  }, [route, location, navigating]);
  const next = route.steps[index + 1];
  const distance = location && next?.coordinates ? Math.round(distanceMeters(location.coordinates, next.coordinates)) : null;
  const message = arrived
    ? route.poi.entranceCoordinates ? 'We made it to the entrance! Head inside to your destination.' : 'We made it! You have reached your destination.'
    : route.steps[index]?.instruction ?? 'Follow the gold path toward your destination. Turn-by-turn directions are unavailable for this route.';
  const character = CHARACTERS[sprite];
  const dialogue = `${arrived ? character.arrival : index === 0 ? character.greeting : character.turn} ${message}`;
  return <section className={`sprite-guide${arrived ? ' guide-arrived' : ''}`} aria-label="Sprite walking guide">
    <div className="guide-chat">
      <div className="guide-avatar" aria-hidden="true"><img key={`${sprite}-${message}`} src={[spriteOne, spriteTwo, spriteThree][sprite]} style={sprite === 1 ? { width: 256, height: 256, left: -54, top: -59 } : sprite === 2 ? { top: -80 } : undefined} alt="" /></div>
      <div className="guide-bubble">
        <div className="guide-nameplate"><strong>{character.name}</strong><span>{arrived ? '★ ARRIVED' : 'YOUR CAMPUS COMPANION'}</span></div>
        <div key={dialogue} className="guide-dialogue-entry"><GuideDialogue text={dialogue} /></div>
        {route.steps.length > 0 && <progress className="guide-progress" aria-label="Walking directions completed" max={route.steps.length} value={arrived ? route.steps.length : index} />}
    {!arrived && <>
      {route.steps.length > 0 && <p className="setup-note">Direction {index + 1} of {route.steps.length}</p>}
      {navigating && distance !== null && <p className="setup-note">About {distance} m to the next direction.</p>}
      {navigating && location && location.accuracy > 25 && <p className="setup-note">Waiting for a more accurate GPS fix before advancing.</p>}
      {next && !next.coordinates && <p className="setup-note">This direction has no GPS checkpoint. Advance when you reach the turn.</p>}
      {next && (!next.coordinates || !navigating || !location || location.accuracy > 25) && <button className="secondary-button" onClick={() => setProgress({ route, index: index + 1 })}>I reached the next turn</button>}
    </>}
    <details className="guide-preferences">
      <summary>Change guide</summary>
      <label htmlFor="guide-character">Your guide</label>
      <select id="guide-character" value={sprite} onChange={(event) => setSprite(Number(event.target.value))}>
        {CHARACTERS.map((item, position) => <option key={item.name} value={position}>{item.name}</option>)}
      </select>
    </details>
      </div>
    </div>
  </section>;
}
