import { useEffect, useMemo, useState } from 'react';
import { fetchTowns, fetchCountries, fetchAdjacency, fetchMapLog } from '../../lib/game';
import type { CharacterRow, TownRow, CountryRow, MapLogRow } from '../../lib/database.types';
import { ELEMENT_COLORS } from '../../lib/constants';
import { Card, CardTitle } from '../ui/Card';
import { Badge } from '../ui/StatBar';

export default function MapPanel({ character }: { character: CharacterRow }) {
  const [towns, setTowns] = useState<TownRow[]>([]);
  const [countries, setCountries] = useState<CountryRow[]>([]);
  const [adjacency, setAdjacency] = useState<Map<number, number[]>>(new Map());
  const [chronicle, setChronicle] = useState<MapLogRow[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchTowns(), fetchCountries(), fetchAdjacency(), fetchMapLog('chronicle', 15)])
      .then(([t, c, a, l]) => {
        setTowns(t);
        setCountries(c);
        setAdjacency(a);
        setChronicle(l);
        setSelected(character.position_town_id ?? t[0]?.id ?? null);
      })
      .finally(() => setLoading(false));
  }, []);

  const { cols, rows } = useMemo(() => {
    const maxX = towns.reduce((m, t) => Math.max(m, t.x), 0);
    const maxY = towns.reduce((m, t) => Math.max(m, t.y), 0);
    return { cols: maxX + 1, rows: maxY + 1 };
  }, [towns]);

  const selectedTown = towns.find((t) => t.id === selected) ?? null;
  const selectedCountry = selectedTown ? countries.find((c) => c.id === selectedTown.country_id) ?? null : null;
  const neighborIds = new Set(selected ? adjacency.get(selected) ?? [] : []);

  function colorFor(t: TownRow) {
    const country = countries.find((c) => c.id === t.country_id);
    if (!country) return { bg: 'var(--color-surface-hover)', text: 'var(--color-text-faint)', ring: 'transparent' };
    return ELEMENT_COLORS[country.element % ELEMENT_COLORS.length];
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
      <Card glass className="overflow-x-auto">
        <CardTitle>天下図</CardTitle>
        {loading ? (
          <p className="text-sm text-(--color-text-faint)">読み込み中……</p>
        ) : (
          <div
            className="grid gap-1.5"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(2.75rem, 1fr))`, gridTemplateRows: `repeat(${rows}, 2.75rem)` }}
          >
            {towns.map((t) => {
              const c = colorFor(t);
              const isMe = t.id === character.position_town_id;
              const isSelected = t.id === selected;
              const isNeighbor = neighborIds.has(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelected(t.id)}
                  style={{
                    gridColumn: t.x + 1,
                    gridRow: t.y + 1,
                    backgroundColor: c.bg,
                    color: c.text,
                    boxShadow: isSelected
                      ? `0 0 0 2px ${c.ring}, 0 0 0 4px var(--color-bg)`
                      : isNeighbor
                      ? `0 0 0 2px var(--color-accent)`
                      : 'none',
                  }}
                  className="flex cursor-pointer flex-col items-center justify-center rounded-lg px-1 text-center text-[10px] font-medium leading-tight transition-transform hover:scale-105"
                  title={t.name}
                >
                  <span className="line-clamp-1 w-full">{t.name}</span>
                  {isMe && <span className="text-[9px] opacity-90">（現在地）</span>}
                </button>
              );
            })}
          </div>
        )}
      </Card>

      <div className="flex flex-col gap-4">
        <Card glass>
          <CardTitle>町の情報</CardTitle>
          {selectedTown ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-(--color-text)">{selectedTown.name}</h3>
                {selectedCountry ? <Badge tone="gold">{selectedCountry.name}</Badge> : <Badge>無所属</Badge>}
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                <InfoRow label="人口" value={selectedTown.population.toLocaleString()} />
                <InfoRow label="農業" value={`${selectedTown.agri} / ${selectedTown.agri_cap}`} />
                <InfoRow label="商業" value={`${selectedTown.commerce} / ${selectedTown.commerce_cap}`} />
                <InfoRow label="城壁" value={`${selectedTown.castle} / ${selectedTown.castle_cap}`} />
                <InfoRow label="民忠" value={selectedTown.loyalty.toString()} />
                <InfoRow label="城壁耐久" value={selectedTown.castle_defense.toString()} />
                <InfoRow label="技術" value={selectedTown.tech.toString()} />
                <InfoRow label="米相場" value={selectedTown.market_rate.toString()} />
              </div>
            </div>
          ) : (
            <p className="text-sm text-(--color-text-faint)">町を選択してください。</p>
          )}
        </Card>

        <Card glass>
          <CardTitle>史書（最新の出来事）</CardTitle>
          {chronicle.length === 0 ? (
            <p className="text-sm text-(--color-text-faint)">記録がありません。</p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {chronicle.map((l) => (
                <li key={l.id} className="border-b border-(--color-border)/60 pb-2 last:border-0">
                  <span className="mr-2 font-mono text-xs text-(--color-text-faint)">
                    {new Date(l.created_at).toLocaleDateString('ja-JP')}
                  </span>
                  <span className="text-(--color-text)">{l.message}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between rounded-lg bg-(--color-surface-hover) px-2.5 py-1.5">
      <span className="text-(--color-text-faint)">{label}</span>
      <span className="font-mono font-medium text-(--color-text)">{value}</span>
    </div>
  );
}
