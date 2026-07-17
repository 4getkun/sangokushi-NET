import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { createCharacter, fetchTowns, fetchCountries } from '../../lib/game';
import type { TownRow, CountryRow } from '../../lib/database.types';
import { ELEMENT_COLORS } from '../../lib/constants';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

const STAT_TOTAL = 150;

export default function CharacterCreateForm({ onCreated }: { onCreated: () => void }) {
  const [towns, setTowns] = useState<TownRow[]>([]);
  const [countries, setCountries] = useState<CountryRow[]>([]);
  const [loginName, setLoginName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [portrait, setPortrait] = useState(0);
  const [townId, setTownId] = useState<number | null>(null);
  const [str, setStr] = useState(50);
  const [intStat, setIntStat] = useState(50);
  const [lea, setLea] = useState(50);
  const [countryName, setCountryName] = useState('');
  const [element, setElement] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTowns().then(setTowns).catch(() => {});
    fetchCountries().then(setCountries).catch(() => {});
  }, []);

  const selectedTown = towns.find((t) => t.id === townId) ?? null;
  const isFounding = !!selectedTown && selectedTown.country_id === null;
  const remaining = STAT_TOTAL - (str + intStat + lea);
  const countryName_ = (id: number | null) => countries.find((c) => c.id === id)?.name ?? '';

  const townOptions = useMemo(
    () =>
      [...towns].sort((a, b) => a.id - b.id).map((t) => ({
        ...t,
        label: `${t.name}${t.country_id !== null ? `【${countryName_(t.country_id)}】` : '【無所属】'}`,
      })),
    [towns, countries]
  );

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (townId === null) { setError('拠点となる町を選択してください。'); return; }
    if (remaining !== 0) { setError(`能力値の合計は150にしてください（あと${remaining}）。`); return; }
    if (isFounding && (countryName.length < 2 || countryName.length > 8)) {
      setError('建国する国名は2〜8文字で入力してください。'); return;
    }
    setBusy(true);
    try {
      await createCharacter({
        loginName, displayName, portrait, townId, str, int: intStat, lea,
        newCountryName: isFounding ? countryName : undefined,
        newCountryElement: isFounding ? element : undefined,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : '作成に失敗しました。');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card glass className="w-full">
      <h2 className="mb-1 text-xl font-bold text-(--color-text)">武将を創る</h2>
      <p className="mb-6 text-sm text-(--color-text-muted)">
        能力値の合計は必ず150になるよう配分してください（原典の仕様どおり）。
      </p>

      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="ID（半角英数字 4〜8文字）">
            <input
              required pattern="[0-9a-zA-Z]{4,8}" value={loginName}
              onChange={(e) => setLoginName(e.target.value)} className={inputCls}
            />
          </Field>
          <Field label="武将名（4〜12文字）">
            <input
              required minLength={4} maxLength={12} value={displayName}
              onChange={(e) => setDisplayName(e.target.value)} className={inputCls}
            />
          </Field>
        </div>

        <Field label="肖像（お好みの番号をお選びください）">
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 8 }, (_, i) => i).map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => setPortrait(i)}
                className={[
                  'flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border font-mono text-sm transition-colors',
                  portrait === i
                    ? 'border-(--color-crimson-500) bg-(--color-crimson-500)/15 text-(--color-crimson-500)'
                    : 'border-(--color-border) text-(--color-text-muted) hover:border-(--color-accent)/50',
                ].join(' ')}
                aria-label={`肖像${i}`}
              >
                {i}
              </button>
            ))}
          </div>
        </Field>

        <Field label="拠点となる町">
          <select
            required value={townId ?? ''} onChange={(e) => setTownId(Number(e.target.value))}
            className={inputCls}
          >
            <option value="" disabled>選択してください</option>
            {townOptions.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </Field>

        {isFounding && (
          <div className="rounded-xl border border-(--color-gold-500)/40 bg-(--color-gold-500)/10 p-4">
            <p className="mb-3 text-sm font-medium text-(--color-gold-600)">
              この町は無所属です。あなたが君主として建国します。
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="国名（2〜8文字）">
                <input
                  required minLength={2} maxLength={8} value={countryName}
                  onChange={(e) => setCountryName(e.target.value)} className={inputCls}
                />
              </Field>
              <Field label="国の色">
                <div className="flex flex-wrap gap-2 pt-1">
                  {ELEMENT_COLORS.map((c, i) => (
                    <button
                      key={i} type="button" onClick={() => setElement(i)}
                      className="h-8 w-8 cursor-pointer rounded-full ring-offset-2 ring-offset-(--color-surface) transition-transform hover:scale-110"
                      style={{ backgroundColor: c.bg, boxShadow: element === i ? `0 0 0 2px ${c.ring}` : 'none' }}
                      aria-label={`テーマカラー${i + 1}`}
                    />
                  ))}
                </div>
              </Field>
            </div>
          </div>
        )}

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-(--color-text-muted)">能力値配分</span>
            <span className={`text-sm font-mono tabular-nums ${remaining === 0 ? 'text-(--color-jade-500)' : 'text-(--color-crimson-500)'}`}>
              残り {remaining}
            </span>
          </div>
          <div className="flex flex-col gap-3">
            <StatSlider label="武力" value={str} onChange={setStr} />
            <StatSlider label="知力" value={intStat} onChange={setIntStat} />
            <StatSlider label="統率" value={lea} onChange={setLea} />
          </div>
        </div>

        {error && <p className="text-sm text-(--color-crimson-500)">{error}</p>}

        <Button type="submit" disabled={busy} className="mt-2 w-full">
          {busy ? '作成中……' : '武将を創る'}
        </Button>
      </form>
    </Card>
  );
}

const inputCls =
  'w-full rounded-lg border border-(--color-border) bg-(--color-bg-elevated) px-3 py-2 text-(--color-text) outline-none focus:border-(--color-accent)';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-(--color-text-muted)">{label}</span>
      {children}
    </label>
  );
}

function StatSlider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-12 shrink-0 text-sm text-(--color-text-muted)">{label}</span>
      <input
        type="range" min={5} max={100} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 flex-1 cursor-pointer accent-(--color-crimson-500)"
      />
      <span className="w-8 shrink-0 text-right font-mono text-sm tabular-nums text-(--color-text)">{value}</span>
    </div>
  );
}
