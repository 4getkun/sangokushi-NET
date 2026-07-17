import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { fetchMyCharacter } from '../lib/game';
import type { CharacterRow } from '../lib/database.types';
import ThemeToggle from './ThemeToggle';
import AuthForm from './panels/AuthForm';
import CharacterCreateForm from './panels/CharacterCreateForm';
import StatusPanel from './panels/StatusPanel';
import CommandPanel from './panels/CommandPanel';
import MapPanel from './panels/MapPanel';
import RankingPanel from './panels/RankingPanel';
import MyCountryPanel from './panels/MyCountryPanel';

type Tab = 'status' | 'command' | 'map' | 'country' | 'ranking';

const TABS: { key: Tab; label: string }[] = [
  { key: 'status', label: '本陣' },
  { key: 'command', label: '軍議' },
  { key: 'map', label: '天下図' },
  { key: 'country', label: '我が国' },
  { key: 'ranking', label: '武勲録' },
];

/**
 * pomofreeと同じ設計方針: 認証済み判定〜タブ切り替えまで単一のReactアイランドで
 * stateを持つことで、タブ移動のたびにページ遷移が発生しない（＝ゲーム内で
 * 何かの処理中にタブを切り替えても状態が飛ばない）ようにしている。
 */
export default function GameApp() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<boolean>(false);
  const [character, setCharacter] = useState<CharacterRow | null>(null);
  const [tab, setTab] = useState<Tab>('status');
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    let active = true;

    async function init() {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      setSession(!!data.session);
      if (data.session) {
        const char = await fetchMyCharacter().catch(() => null);
        if (active) setCharacter(char);
      }
      if (active) setLoading(false);
    }
    init();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(!!newSession);
      if (newSession) {
        const char = await fetchMyCharacter().catch(() => null);
        setCharacter(char);
      } else {
        setCharacter(null);
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [refreshKey]);

  if (loading) {
    return (
      <div className="flex min-h-[60svh] items-center justify-center text-(--color-text-faint)">
        読み込み中……
      </div>
    );
  }

  if (!session) {
    return (
      <div className="mx-auto flex min-h-[80svh] max-w-md flex-col items-center justify-center gap-6 px-4">
        <Header showTabs={false} />
        <AuthForm onAuthed={refresh} />
      </div>
    );
  }

  if (!character) {
    return (
      <div className="mx-auto flex min-h-[80svh] max-w-2xl flex-col items-center justify-center gap-6 px-4 py-10">
        <Header showTabs={false} />
        <CharacterCreateForm onCreated={refresh} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16">
      <Header showTabs tab={tab} onTabChange={setTab} character={character} />
      <main className="mt-6">
        {tab === 'status' && <StatusPanel character={character} onChanged={refresh} />}
        {tab === 'command' && <CommandPanel character={character} onChanged={refresh} />}
        {tab === 'map' && <MapPanel character={character} />}
        {tab === 'country' && <MyCountryPanel character={character} onChanged={refresh} />}
        {tab === 'ranking' && <RankingPanel />}
      </main>
    </div>
  );
}

function Header({
  showTabs,
  tab,
  onTabChange,
  character,
}: {
  showTabs: boolean;
  tab?: Tab;
  onTabChange?: (t: Tab) => void;
  character?: CharacterRow;
}) {
  return (
    <header className="sticky top-0 z-20 -mx-4 mb-2 px-4 pt-4">
      <div className="glass-panel flex flex-wrap items-center gap-3 rounded-2xl px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold tracking-tight text-(--color-crimson-500)">三国志</span>
          <span className="text-lg font-bold tracking-tight text-(--color-text)">NET</span>
        </div>

        {showTabs && (
          <nav className="ml-2 flex flex-1 flex-wrap gap-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => onTabChange?.(t.key)}
                className={[
                  'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer',
                  tab === t.key
                    ? 'bg-(--color-crimson-500) text-white shadow-sm'
                    : 'text-(--color-text-muted) hover:bg-(--color-surface-hover) hover:text-(--color-text)',
                ].join(' ')}
              >
                {t.label}
              </button>
            ))}
          </nav>
        )}

        <div className="ml-auto flex items-center gap-3">
          {character && (
            <span className="hidden text-sm text-(--color-text-muted) sm:inline">
              {character.display_name}
            </span>
          )}
          <ThemeToggle />
          {character && (
            <button
              type="button"
              onClick={() => supabase.auth.signOut()}
              className="text-xs text-(--color-text-faint) hover:text-(--color-crimson-500) cursor-pointer"
            >
              ログアウト
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
