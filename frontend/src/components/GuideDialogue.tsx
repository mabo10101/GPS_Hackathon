import { useEffect, useState } from 'react';

/** Announce a complete direction once; animate only the visual text. */
export default function GuideDialogue({ text }: { text: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let timer: ReturnType<typeof setInterval> | undefined;
    const start = () => {
      clearInterval(timer);
      if (preference.matches) { setCount(text.length); return; }
      setCount(0);
      timer = setInterval(() => setCount((current) => {
        if (current >= text.length) { clearInterval(timer); return current; }
        return current + 1;
      }), 20);
    };
    start();
    preference.addEventListener('change', start);
    return () => { clearInterval(timer); preference.removeEventListener('change', start); };
  }, [text]);
  return <>
    <span className="guide-sr-only" role="status" aria-live="polite" aria-atomic="true">{text}</span>
    <p className="guide-dialogue" aria-hidden="true">{text.slice(0, count)}{count < text.length && <span className="guide-cursor">▌</span>}</p>
    {count < text.length && <button className="guide-reveal" onClick={() => setCount(text.length)}>Show full direction</button>}
  </>;
}
