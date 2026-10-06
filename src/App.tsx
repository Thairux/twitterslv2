import { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { ThemeProvider, useTheme } from './components/Theme';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ApiProvider } from './lib/api';
import { rotateDemoEvent } from './lib/daily';
import { seedDemoEvent } from './lib/world-events';
import { bootstrap } from './lib/api/bootstrap';
import { ambientBeat, randomDmBeat } from './lib/api/activity';
import { FeedPage } from './pages/FeedPage';
import { ThreadPage } from './pages/ThreadPage';
import { ProfilePage } from './pages/ProfilePage';
import { NotificationsPage } from './pages/NotificationsPage';
import { DMsPage } from './pages/DMsPage';
import { FriendPage } from './pages/FriendPage';
import { ModelsPage } from './pages/ModelsPage';
import { TslpPage } from './pages/TslpPage';
import { FriendRoute } from './pages/FriendRoute';
import { SettingsPage } from './pages/SettingsPage';
import { PersonaPage } from './pages/PersonaPage';
import { SearchPage } from './pages/SearchPage';
import { ChatterPage } from './pages/ChatterPage';
import { GazettePage } from './pages/GazettePage';
import { OnboardingPage } from './pages/OnboardingPage';
import { LegalPage } from './pages/LegalPage';
import { ComposePage } from './pages/ComposePage';
import { AppLock } from './components/AppLock';
import './styles/tokens.css';
import './styles/themes.css';

const TABS = [
  { path: '/', label: 'Home' },
  { path: '/search', label: 'Search' },
  { path: '/notifications', label: 'Notifications' },
  { path: '/dms', label: 'Messages' },
  { path: '/profile', label: 'Me' },
] as const;

interface ShellProps {
  data: Awaited<ReturnType<typeof bootstrap>>;
}

function Shell({ data }: ShellProps) {
  const location = useLocation();
  const { toggleTheme } = useTheme();
  const { store, socialStore, dmStore, secrets, modelService, client, nativeFiles } = data;

  const isTabActive = (tabPath: string) => {
    const path = location.pathname;
    if (tabPath === '/') return path === '/';
    if (tabPath === '/dms') return path === '/dms' || path.startsWith('/messages/');
    return path.startsWith(tabPath);
  };

  return (
    <div className="phone">
      <header className="app-header">
        <div className="app-header-left">
          <Link to="/">
            <span className="logo">TSL</span>
          </Link>
          <span className="sync-status">[SYNC OK]</span>
        </div>
        <div className="app-header-right">
          <Link to="/models" className="btn" style={{ fontSize: '10px', padding: '4px 8px' }}>Models</Link>
          <Link to="/friend" className="btn" style={{ fontSize: '10px', padding: '4px 8px' }} data-testid="header-friend">Friend</Link>
          <Link to="/settings" className="btn" style={{ fontSize: '10px', padding: '4px 8px' }}>Settings</Link>
          <button onClick={toggleTheme} className="btn" style={{ fontSize: '10px', padding: '4px 8px' }}>TGL</button>
          <button onClick={() => (window as any).__tsl?.lockApp?.()} className="btn" style={{ fontSize: '10px', padding: '4px 8px' }}>Lock</button>
        </div>
      </header>
      <main className="content-area">
        <Routes>
          <Route path="/" element={<FeedPage />} />
          <Route path="/post/:id" element={<ThreadPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/notifications" element={<NotificationsPage dmStore={dmStore} />} />
          <Route path="/dms" element={<DMsPage />} />
          <Route path="/messages/:id" element={<FriendPage />} />
          <Route path="/models" element={<ModelsPage modelService={modelService} />} />
          <Route path="/tslp" element={<TslpPage />} />
          <Route path="/friend" element={<FriendRoute />} />
          <Route path="/settings" element={<SettingsPage store={store} secrets={secrets} modelService={modelService} client={client} nativeFiles={nativeFiles} />} />
          <Route path="/persona/:id" element={<PersonaPage />} />
          <Route path="/search" element={<SearchPage socialStore={socialStore} dmStore={dmStore} />} />
          <Route path="/chatter" element={<ChatterPage socialStore={socialStore} />} />
          <Route path="/gazette" element={<GazettePage socialStore={socialStore} />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/legal" element={<LegalPage />} />
          <Route path="/compose" element={<ComposePage />} />
          {/* Hashless entry (e.g. fresh native launch) lands here — bounce home. */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <nav className="tabbar">
        {TABS.map((tab) => (
          <Link
            key={tab.path}
            to={tab.path}
            className={`tab ${isTabActive(tab.path) ? 'active' : ''}`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

export function App() {
  const [data, setData] = useState<Awaited<ReturnType<typeof bootstrap>> | null>(null);
  const [ready, setReady] = useState(false);
  const [locked, setLocked] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);

  useEffect(() => {
    async function boot() {
      try {
        const result = await bootstrap();
        rotateDemoEvent(result.store).catch((err) => console.error('rotateDemoEvent failed:', err));
        (window as any).__tsl = { seedWorldEvent: async () => { try { await seedDemoEvent(result.store); } catch (err) { console.error('seedWorldEvent failed:', err); } }, lockApp: () => { setLocked(true); } };
        setData(result);
        // Island heartbeat: personas post, reply, like, and DM on a timer
        // so the timeline stays alive while the app is open.
        const beat = () => {
          ambientBeat(result.store, result.socialStore, result.client).catch(() => {});
          randomDmBeat(result.store, result.dmStore, result.client).catch(() => {});
        };
        const timer = setInterval(beat, 45_000);
        const kickoff = setTimeout(beat, 8_000);
        (window as any).__tsl.cleanupHeartbeat = () => { clearInterval(timer); clearTimeout(kickoff); };
      } catch (err) {
        console.error('Boot failed:', err);
        setBootError(err instanceof Error ? err.message : 'Initialization failed');
      } finally {
        setReady(true);
      }
    }
    boot();
  }, []);

  if (bootError) {
    return (
      <HashRouter>
        <ThemeProvider>
          <ErrorBoundary>
            <div className="content-area">
              <p style={{ color: 'var(--text-dim)' }}>Failed to start: {bootError}</p>
              <button className="btn" onClick={() => window.location.reload()}>Retry</button>
            </div>
          </ErrorBoundary>
        </ThemeProvider>
      </HashRouter>
    );
  }

  if (!ready || !data) {
    return (
      <HashRouter>
        <ThemeProvider>
          <ErrorBoundary>
            <div className="content-area">
              <p style={{ color: 'var(--text-dim)' }}>Loading…</p>
            </div>
          </ErrorBoundary>
        </ThemeProvider>
      </HashRouter>
    );
  }

  if (locked) {
    return (
      <HashRouter>
        <ThemeProvider>
          <ErrorBoundary>
            <AppLock onUnlock={() => setLocked(false)} />
          </ErrorBoundary>
        </ThemeProvider>
      </HashRouter>
    );
  }

  return (
    <HashRouter>
      <ThemeProvider>
        <ErrorBoundary>
          <ApiProvider store={data.store} dmStore={data.dmStore} socialStore={data.socialStore} modelService={data.modelService} nativeFiles={data.nativeFiles} client={data.client} secrets={data.secrets}>
            <Shell data={data} />
          </ApiProvider>
        </ErrorBoundary>
      </ThemeProvider>
    </HashRouter>
  );
}
