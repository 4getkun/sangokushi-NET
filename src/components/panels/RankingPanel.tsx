import { useEffect, useState } from 'react';
import { fetchRanking, fetchCountries } from '../../lib/game';
import type { CharacterRow, CountryRow } from '../../lib/database.types';
import { RANK_TITLE_TIER_SIZE } from '../../lib/constants';
import { Card, CardTitle } from '../ui/Card';
import { Badge } from '../ui/StatBar';

const TABS = [
  { key: 'rank_points' as const, label: '武勲点' },
  { key: 'battle_wins' as const, label: '戦績' },
  { key: 'merit' as const, label: '功績' },
  { key: 'leadership' as const, label: '統率' },
];

// 原典 ranking.cgi 相当: 武勲点を$LANK（500点）単位で称号ランクに変換する。
function rankTitle(points: number) {
  const tier = Math.floor(points / RANK_TITLE_TIER_SIZE);
  const titles = ['新参', '一兵卒', '什長', '隊長', '校尉', '将軍', '大将軍', '軍師', '覇王'];
  return titles[Math.min(tier, titles.length - 1)];
}

export default function RankingPanel() {
  const [sortKey, setSortKey] = useState<(typeof TABS)[number]['key']>('rank_points');
  const [rows, setRows] = useState<CharacterRow[]>([]);
  const [countries, setCountries] = useState<CountryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchRanking(sortKey, 100), fetchCountries()])
      .then(([r, c]) => {
        setRows(r);
        setCountries(c);
      })
      .finally(() => setLoading(false));
  }, [sortKey]);

  return (
    <Card glass>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <CardTitle className="mb-0">武勲録</CardTitle>
        <div className="flex gap-1 rounded-xl bg-(--color-surface-hover) p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setSortKey(t.key)}
              className={[
                'cursor-pointer rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                sortKey === t.key
                  ? 'bg-(--color-crimson-500) text-white shadow-sm'
                  : 'text-(--color-text-muted) hover:text-(--color-text)',
              ].join(' ')}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-(--color-text-faint)">読み込み中……</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-(--color-border) text-left text-xs text-(--color-text-faint)">
                <th className="py-2 pr-2 font-medium">順位</th>
                <th className="py-2 pr-2 font-medium">武将名</th>
                <th className="py-2 pr-2 font-medium">所属</th>
                <th className="py-2 pr-2 font-medium">称号</th>
                <th className="py-2 pr-2 text-right font-medium">
                  {TABS.find((t) => t.key === sortKey)?.label}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const country = countries.find((c) => c.id === r.country_id);
                return (
                  <tr key={r.id} className="border-b border-(--color-border)/50 last:border-0">
                    <td className="py-2 pr-2 font-mono text-(--color-text-faint)">{i + 1}</td>
                    <td className="py-2 pr-2 font-medium text-(--color-text)">{r.display_name}</td>
                    <td className="py-2 pr-2">
                      {country ? <Badge tone="gold">{country.name}</Badge> : <Badge>無所属</Badge>}
                    </td>
                    <td className="py-2 pr-2 text-(--color-text-muted)">{rankTitle(r.rank_points)}</td>
                    <td className="py-2 pr-2 text-right font-mono tabular-nums text-(--color-text)">
                      {(r[sortKey] as number).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
