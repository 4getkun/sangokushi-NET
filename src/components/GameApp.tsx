import { useEffect, useState, useCallback, useRef } from 'react';
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
  const [sessionLoading, setSessionLoading] = useState(true);
  const [session, setSession] = useState<boolean>(false);
  const [character, setCharacter] = useState<CharacterRow | null>(null);
  // 「キャラクター無し」と「まだ判定できていない」を区別するためのフラグ。
  // これが無いと、ログイン直後キャラクター取得が完了するまでの一瞬だけ
  // character===null になり、既にキャラを作成済みのユーザーにも
  // 一瞬だけ武将作成画面が表示されてしまう（実際に発生したバグ）。
  const [characterChecked, setCharacterChecked] = useState(false);
  const [tab, setTab] = useState<Tab>('status');
  const [refreshKey, setRefreshKey] = useState(0);
  const prevSessionRef = useRef(false);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  // セッションの追跡はrefreshKeyに依存させない。依存させてしまうと、
  // ゲーム内の何気ない操作（コマンド予約・国法投稿等）のたびに
  // onAuthStateChangeの購読が張り直され、そのたびに下のキャラクター
  // 判定が絡んで無用な再判定が走ってしまう。
  useEffect(() => {
    let active = true;

    function handle(hasSession: boolean) {
      if (!active) return;
      const wasSession = prevSessionRef.current;
      prevSessionRef.current = hasSession;
      setSession(hasSession);
      if (hasSession && !wasSession) {
        // 新規ログイン（false→true）。setSessionと同じ関数内・同じ
        // レンダーバッチでcharacterCheckedをfalseに戻すことで、
        // 「session=true かつ characterChecked=true（古い値）」という
        // 中間状態が一瞬たりとも画面に出ないようにしている。
        setCharacterChecked(false);
      } else if (!hasSession) {
        setCharacter(null);
        setCharacterChecked(true);
      }
      setSessionLoading(false);
    }

    supabase.auth.getSession().then(({ data }) => handle(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      handle(!!newSession);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // セッションが確定した後にキャラクターを取得する。refreshKeyの変化でも
  // 再取得するが、characterCheckedは既にtrueのままなのでローディング
  // 画面へは戻らず、character の中身だけが静かに更新される。
  useEffect(() => {
    if (sessionLoading || !session) return;
    let active = true;
    fetchMyCharacter()
      .catch(() => null)
      .then((char) => {
        if (!active) return;
        setCharacter(char);
        setCharacterChecked(true);
      });
    return () => {
      active = false;
    };
  }, [session, sessionLoading, refreshKey]);

  if (sessionLoading || !characterChecked) {
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
