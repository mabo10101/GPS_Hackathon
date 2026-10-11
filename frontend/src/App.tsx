import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import MainMenu from './pages/MainMenu';
import CampusNavigation from './pages/CampusNavigation';
import './pages/Navigation.css';

const IndoorApp = lazy(() => import('./indoor/IndoorApp'));
type Page = 'menu' | 'map' | 'indoor';
const currentPage = (): Page => window.location.hash === '#/map' ? 'map' : window.location.hash === '#/indoor' ? 'indoor' : 'menu';

export default function App() {
  const [page, setPage] = useState<Page>(currentPage);
  const focusTarget = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onHashChange = () => setPage(currentPage());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  useEffect(() => {
    document.title = `${page === 'menu' ? 'Go Forth' : page === 'map' ? 'Campus map' : 'Indoor rooms'} · UCF navigation`;
    focusTarget.current?.focus();
  }, [page]);
  const navigate = (next: Page) => { window.location.hash = `/${next === 'menu' ? '' : next}`; };
  return <div ref={focusTarget} tabIndex={-1} className="page-root">
    {page === 'menu' && <MainMenu onMap={() => navigate('map')} onIndoor={() => navigate('indoor')} />}
    {page === 'map' && <CampusNavigation onMenu={() => navigate('menu')} onIndoor={() => navigate('indoor')} />}
    {page === 'indoor' && <Suspense fallback={<main className="page-loading" aria-busy="true"><p role="status">Opening indoor navigation…</p><button className="page-menu-button" onClick={() => navigate('menu')}>← Main menu</button></main>}>
      <IndoorApp onClose={() => navigate('menu')} />
    </Suspense>}
  </div>;
}
