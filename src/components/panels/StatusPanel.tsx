import { useEffect, useState } from 'react';
import { fetchTowns, fetchCountries, fetchMyQueue, fetchMyLogs, fetchTimeRemakeSeconds } from '../../lib/game';
import type { CharacterRow, TownRow, CountryRow, CommandQueueRow, CharacterLogRow } from '../../lib/database.types';
import { COMMAND_LABELS, SOL_TYPE, portraitUrl } from '../../lib/constants';
import { Card, CardTitle } from '../ui/Card';
import { StatBar, Badge } from '../ui/StatBar';

export default function StatusPanel({
  character,
}: {
  character: CharacterRow;
  onChanged: () => void;
}) {
  const [towns, setTowns] = useState<TownRow[]>([]);
  const [countries, setCountries] = useState<CountryRow[]>([]);
  const [queue, setQueue] = useState<CommandQueueRow[]>([]);
  const [logs, setLogs] = useState<CharacterLogRow[]>([]);
  const [timeRemakeSec, setTimeRemakeSec] = useState(3600);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetchTowns(),
      fetchCountries(),
      fetchMyQueue(character.id),
      fetchMyLogs(character.id, 30),
      fetchTimeRemakeSeconds(),
    ])
      .then(([t, c, q, l, sec]) => {
        if (!active) return;
        setTowns(t);
        setCountries(c);
        setQueue(q);
        setLogs(l);
        setTimeRemakeSec(sec);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [character.id]);

  // スロットi（+iターン先）が実際に実行される時刻。
  // next_turn_due_atがスロット0の実行予定時刻そのものなので、
  // そこから time_remake秒 ずつ足していくだけでよい
  // （command_queueは1ターン処理ごとにスロットが1つずつ繰り上がるため）。
  const dueAtBase = new Date(character.next_turn_due_at).getTime();
  function slotTimeLabel(i: number): string {
    const t = new Date(dueAtBase + i * timeRemakeSec * 1000);
    return t.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  }

  const town = towns.find((t) => t.id === character.position_town_id) ?? null;
  const country = countries.find((c) => c.id === character.country_id) ?? null;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card glass className="lg:col-span-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <img
              src={portraitUrl(character.portrait)}
              alt={`${character.display_name}の肖像`}
              className="h-14 w-14 shrink-0 rounded-xl border border-(--color-border) bg-(--color-bg-elevated) [image-rendering:pixelated]"
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-(--color-text)">{character.display_name}</h2>
                {country && <Badge tone="gold">{country.name}</Badge>}
                {character.id === country?.king_character_id && <Badge tone="crimson">君主</Badge>}
              </div>
              <p className="mt-1 text-sm text-(--color-text-muted)">
                ID: {character.login_name} ・ 拠点: {town ? town.name : '不明'}
              </p>
              {character.motto && (
                <p className="mt-2 text-sm italic text-(--color-text-faint)">「{character.motto}」</p>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold tabular-nums text-(--color-gold-600)">
              {character.gold.toLocaleString()} <span className="text-sm font-normal">金</span>
            </div>
            <div className="text-lg font-bold tabular-nums text-(--color-jade-600)">
              {character.rice.toLocaleString()} <span className="text-sm font-normal">米</span>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatBar label="武力" value={character.str} max={100} color="crimson" />
          <StatBar label="知力" value={character.int_stat} max={100} color="azure" />
          <StatBar label="統率" value={character.leadership} max={100} color="jade" />
          <StatBar label="魅力" value={character.charisma} max={100} color="gold" />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatBar
            label={`兵士（${SOL_TYPE[character.soldier_type] ?? '歩兵'}）`}
            value={character.soldiers}
            max={Math.max(character.soldiers, 1000)}
            color="crimson"
          />
          <StatBar label="訓練度" value={character.training} max={100} color="azure" />
          <StatBar label="忠誠度" value={character.loyalty} max={100} color="jade" />
          <StatBar label="兵糧状態" value={character.idle_turns === 0 ? 100 : 0} max={100} color="gold" suffix="" />
        </div>

        <div className="mt-6 flex flex-wrap gap-4 border-t border-(--color-border) pt-4 text-sm">
          <Stat label="功績" value={character.merit.toLocaleString()} />
          <Stat label="武勲点" value={character.rank_points.toLocaleString()} />
          <Stat label="戦績" value={`${character.battle_wins.toLocaleString()} 勝`} />
          <Stat label="未行動ターン" value={character.idle_turns.toString()} />
        </div>
      </Card>

      <Card glass>
        <CardTitle>行動予約（24ターン先まで）</CardTitle>
        {loading ? (
          <p className="text-sm text-(--color-text-faint)">読み込み中……</p>
        ) : (
          <ol className="flex flex-col gap-1 text-sm">
            {Array.from({ length: 24 }, (_, i) => queue.find((q) => q.slot_index === i)).map((q, i) => (
              <li
                key={i}
                className={[
                  'flex items-center justify-between rounded-lg px-2 py-1',
                  i === 0 ? 'bg-(--color-crimson-500)/10 font-medium' : '',
                ].join(' ')}
              >
                <span className="flex items-center gap-2 text-(--color-text-faint)">
                  <span>+{i}</span>
                  <span className="font-mono text-xs tabular-nums">{slotTimeLabel(i)}</span>
                </span>
                <span className={q && q.command_code !== 0 ? 'text-(--color-text)' : 'text-(--color-text-faint)'}>
                  {q ? (q.label || COMMAND_LABELS[q.command_code] || '不明') : '未定'}
                </span>
              </li>
            ))}
          </ol>
        )}
      </Card>

      <Card glass className="lg:col-span-3">
        <CardTitle>行動記録</CardTitle>
        {loading ? (
          <p className="text-sm text-(--color-text-faint)">読み込み中……</p>
        ) : logs.length === 0 ? (
          <p className="text-sm text-(--color-text-faint)">まだ記録はありません。</p>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {logs.map((l) => (
              <li key={l.id} className="flex gap-3 border-b border-(--color-border)/60 pb-2 last:border-0">
                <span className="shrink-0 font-mono text-xs text-(--color-text-faint)">
                  {new Date(l.created_at).toLocaleString('ja-JP')}
                </span>
                <span className="text-(--color-text)">{l.message}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-(--color-text-faint)">{label}</div>
      <div className="font-mono font-semibold text-(--color-text)">{value}</div>
    </div>
  );
}
