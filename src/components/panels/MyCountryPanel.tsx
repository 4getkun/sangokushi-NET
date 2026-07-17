import { useEffect, useState } from 'react';
import {
  fetchCountries, fetchCountryMembers, fetchLocalRules, fetchUnits,
  kingDirective, kingAppoint, kingDismiss, kingSetEntryMessage,
  postLocalRule, deleteLocalRule, setLoyalty, createUnit, joinUnit, leaveOrDisbandUnit,
} from '../../lib/game';
import type { CharacterRow, CountryRow, LocalRulePostRow, UnitRow } from '../../lib/database.types';
import { OFFICER_ROLES, ELEMENT_COLORS } from '../../lib/constants';
import { Card, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/StatBar';

export default function MyCountryPanel({
  character,
  onChanged,
}: {
  character: CharacterRow;
  onChanged: () => void;
}) {
  const [country, setCountry] = useState<CountryRow | null>(null);
  const [members, setMembers] = useState<CharacterRow[]>([]);
  const [rules, setRules] = useState<LocalRulePostRow[]>([]);
  const [units, setUnits] = useState<UnitRow[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    if (character.country_id === null) { setLoading(false); return; }
    setLoading(true);
    Promise.all([
      fetchCountries(),
      fetchCountryMembers(character.country_id),
      fetchLocalRules(character.country_id),
      fetchUnits(character.country_id),
    ])
      .then(([countries, m, r, u]) => {
        setCountry(countries.find((c) => c.id === character.country_id) ?? null);
        setMembers(m);
        setRules(r);
        setUnits(u);
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, [character.country_id]);

  if (character.country_id === null) {
    return (
      <Card glass>
        <CardTitle>我が国</CardTitle>
        <p className="text-sm text-(--color-text-muted)">
          あなたはまだどの国にも仕官していません。「軍議」タブから、
          無所属の町にいる場合は建国、他国の町にいる場合は「仕官」コマンドで参加できます。
        </p>
      </Card>
    );
  }

  if (loading || !country) {
    return (
      <Card glass>
        <p className="text-sm text-(--color-text-faint)">読み込み中……</p>
      </Card>
    );
  }

  const isKing = character.id === country.king_character_id;
  const color = ELEMENT_COLORS[country.element % ELEMENT_COLORS.length];

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_1fr]">
      <div className="flex flex-col gap-4">
        <Card glass>
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 shrink-0 rounded-xl"
              style={{ backgroundColor: color.bg, boxShadow: `0 0 0 2px ${color.ring}` }}
            />
            <div>
              <h2 className="text-xl font-bold text-(--color-text)">{country.name}</h2>
              <p className="text-sm text-(--color-text-muted)">
                建国 {country.founded_turns} ターン目 ・ 在籍武将 {members.length} 名
              </p>
            </div>
            {isKing && <Badge tone="crimson">あなたは君主です</Badge>}
          </div>

          {country.announcement && (
            <p className="mt-4 whitespace-pre-wrap rounded-xl bg-(--color-surface-hover) p-3 text-sm text-(--color-text)">
              {country.announcement}
            </p>
          )}
        </Card>

        <Card glass>
          <CardTitle>役職</CardTitle>
          <ul className="flex flex-col gap-2 text-sm">
            <OfficerRow label="君主" character={members.find((m) => m.id === country.king_character_id)} />
            {OFFICER_ROLES.map((role) => (
              <OfficerRow
                key={role.code}
                label={role.label}
                character={members.find((m) => m.id === (country as any)[role.key])}
              />
            ))}
          </ul>
        </Card>

        {isKing && (
          <KingControls
            country={country}
            members={members}
            onChanged={() => {
              load();
              onChanged();
            }}
          />
        )}

        <UnitsCard
          units={units}
          character={character}
          onChanged={() => {
            load();
            onChanged();
          }}
        />
      </div>

      <div className="flex flex-col gap-4">
        <MembersCard members={members} king={country.king_character_id} />
        <LocalRulesCard
          rules={rules}
          onChanged={() => {
            load();
            onChanged();
          }}
        />
        <LoyaltyCard character={character} onChanged={onChanged} />
      </div>
    </div>
  );
}

function OfficerRow({ label, character }: { label: string; character?: CharacterRow }) {
  return (
    <li className="flex items-center justify-between rounded-lg bg-(--color-surface-hover) px-3 py-2">
      <span className="text-(--color-text-faint)">{label}</span>
      <span className="font-medium text-(--color-text)">{character ? character.display_name : '空席'}</span>
    </li>
  );
}

function MembersCard({ members, king }: { members: CharacterRow[]; king: string | null }) {
  return (
    <Card glass>
      <CardTitle>在籍武将一覧</CardTitle>
      <ul className="flex max-h-72 flex-col gap-1.5 overflow-y-auto text-sm">
        {[...members]
          .sort((a, b) => b.rank_points - a.rank_points)
          .map((m) => (
            <li key={m.id} className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-(--color-surface-hover)">
              <span className="text-(--color-text)">
                {m.display_name}
                {m.id === king && <span className="ml-1 text-(--color-gold-600)">★</span>}
              </span>
              <span className="font-mono text-xs text-(--color-text-faint)">{m.rank_points.toLocaleString()} 点</span>
            </li>
          ))}
      </ul>
    </Card>
  );
}

function KingControls({
  country,
  members,
  onChanged,
}: {
  country: CountryRow;
  members: CharacterRow[];
  onChanged: () => void;
}) {
  const [announcement, setAnnouncement] = useState(country.announcement ?? '');
  const [entryMessage, setEntryMessage] = useState(country.entry_message ?? '');
  const [appointTarget, setAppointTarget] = useState('');
  const [appointRole, setAppointRole] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function saveAnnouncement() {
    setBusy(true);
    setError(null);
    try {
      await kingDirective(announcement);
      setNotice('国内布告を更新しました。');
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新に失敗しました。');
    } finally {
      setBusy(false);
    }
  }

  async function saveEntryMessage() {
    setBusy(true);
    setError(null);
    try {
      await kingSetEntryMessage(entryMessage);
      setNotice('仕官時メッセージを更新しました。');
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新に失敗しました。');
    } finally {
      setBusy(false);
    }
  }

  async function appoint() {
    if (!appointTarget) return;
    setBusy(true);
    setError(null);
    try {
      await kingAppoint(appointTarget, appointRole);
      setNotice('任命しました。');
      setAppointTarget('');
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : '任命に失敗しました。');
    } finally {
      setBusy(false);
    }
  }

  async function dismiss(id: string) {
    setBusy(true);
    setError(null);
    try {
      await kingDismiss(id);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : '解任に失敗しました。');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card glass className="border-(--color-gold-500)/30">
      <CardTitle>君主権限</CardTitle>
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-(--color-text-muted)">国内布告</span>
          <textarea value={announcement} onChange={(e) => setAnnouncement(e.target.value)} rows={3} className={inputCls} />
          <Button type="button" variant="secondary" onClick={saveAnnouncement} disabled={busy} className="mt-1 self-start">
            布告を更新
          </Button>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-(--color-text-muted)">仕官時メッセージ</span>
          <textarea value={entryMessage} onChange={(e) => setEntryMessage(e.target.value)} rows={2} className={inputCls} />
          <Button type="button" variant="secondary" onClick={saveEntryMessage} disabled={busy} className="mt-1 self-start">
            メッセージを更新
          </Button>
        </label>

        <div>
          <span className="mb-1 block text-sm text-(--color-text-muted)">役職任命</span>
          <div className="flex flex-wrap gap-2">
            <select value={appointTarget} onChange={(e) => setAppointTarget(e.target.value)} className={inputCls + ' flex-1'}>
              <option value="">武将を選択</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.display_name}</option>
              ))}
            </select>
            <select value={appointRole} onChange={(e) => setAppointRole(Number(e.target.value))} className={inputCls + ' w-32'}>
              {OFFICER_ROLES.map((r) => (
                <option key={r.code} value={r.code}>{r.label}</option>
              ))}
            </select>
            <Button type="button" onClick={appoint} disabled={busy || !appointTarget}>任命</Button>
          </div>
        </div>

        <div>
          <span className="mb-1 block text-sm text-(--color-text-muted)">解任</span>
          <div className="flex flex-wrap gap-1.5">
            {OFFICER_ROLES.filter((r) => (country as any)[r.key]).map((r) => {
              const m = members.find((mm) => mm.id === (country as any)[r.key]);
              if (!m) return null;
              return (
                <button
                  key={r.code}
                  type="button"
                  onClick={() => dismiss(m.id)}
                  disabled={busy}
                  className="cursor-pointer rounded-full border border-(--color-border) px-3 py-1 text-xs text-(--color-text-muted) hover:border-(--color-crimson-500) hover:text-(--color-crimson-500)"
                >
                  {r.label}: {m.display_name} を解任
                </button>
              );
            })}
          </div>
        </div>

        {error && <p className="text-sm text-(--color-crimson-500)">{error}</p>}
        {notice && <p className="text-sm text-(--color-jade-500)">{notice}</p>}
      </div>
    </Card>
  );
}

function LocalRulesCard({ rules, onChanged }: { rules: LocalRulePostRow[]; onChanged: () => void }) {
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function post() {
    if (!body.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await postLocalRule(body);
      setBody('');
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : '投稿に失敗しました。');
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    setBusy(true);
    setError(null);
    try {
      await deleteLocalRule(id);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : '削除に失敗しました。');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card glass>
      <CardTitle>国内掲示板（お触れ）</CardTitle>
      <div className="mb-3 flex gap-2">
        <input value={body} onChange={(e) => setBody(e.target.value)} className={`${inputCls} min-w-0 flex-1`} placeholder="お触れを投稿……" />
        <Button type="button" onClick={post} disabled={busy || !body.trim()}>投稿</Button>
      </div>
      {error && <p className="mb-3 text-sm text-(--color-crimson-500)">{error}</p>}
      <ul className="flex max-h-64 flex-col gap-2 overflow-y-auto text-sm">
        {rules.length === 0 && <p className="text-(--color-text-faint)">まだ投稿がありません。</p>}
        {rules.map((r) => (
          <li key={r.id} className="flex items-start justify-between gap-2 rounded-lg bg-(--color-surface-hover) px-3 py-2">
            <div>
              <p className="text-(--color-text)">{r.body}</p>
              <p className="text-xs text-(--color-text-faint)">{new Date(r.created_at).toLocaleString('ja-JP')}</p>
            </div>
            <button
              type="button"
              onClick={() => remove(r.id)}
              disabled={busy}
              className="shrink-0 cursor-pointer text-xs text-(--color-text-faint) hover:text-(--color-crimson-500)"
            >
              削除
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function UnitsCard({
  units,
  character,
  onChanged,
}: {
  units: UnitRow[];
  character: CharacterRow;
  onChanged: () => void;
}) {
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 所属部隊は unit_members で管理されるため厳密な判定はサーバー側に委ねるが、
  // 自分が部隊長になっている部隊があるかどうかはこのビューでも判定できる。
  const ownUnit = units.find((u) => u.leader_character_id === character.id) ?? null;

  async function create() {
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await createUnit(name, message);
      setName('');
      setMessage('');
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : '部隊の結成に失敗しました。');
    } finally {
      setBusy(false);
    }
  }

  async function join(unitId: number) {
    setBusy(true);
    setError(null);
    try {
      await joinUnit(unitId);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : '参加に失敗しました。');
    } finally {
      setBusy(false);
    }
  }

  async function disband() {
    setBusy(true);
    setError(null);
    try {
      await leaveOrDisbandUnit();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : '解散に失敗しました。');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card glass>
      <CardTitle>部隊</CardTitle>
      {error && <p className="mb-3 text-sm text-(--color-crimson-500)">{error}</p>}
      <ul className="mb-3 flex flex-col gap-2 text-sm">
        {units.length === 0 && <p className="text-(--color-text-faint)">部隊はまだありません。</p>}
        {units.map((u) => (
          <li key={u.id} className="flex items-center justify-between gap-2 rounded-lg bg-(--color-surface-hover) px-3 py-2">
            <div>
              <p className="font-medium text-(--color-text)">
                {u.name}
                {u.id === ownUnit?.id && <span className="ml-1.5 text-(--color-gold-600)">（部隊長）</span>}
              </p>
              {u.recruit_message && <p className="text-xs text-(--color-text-faint)">{u.recruit_message}</p>}
            </div>
            {u.id === ownUnit?.id ? (
              <Button type="button" variant="danger" onClick={disband} disabled={busy}>解散</Button>
            ) : (
              <Button type="button" variant="secondary" onClick={() => join(u.id)} disabled={busy || u.recruiting_closed}>
                {u.recruiting_closed ? '募集終了' : '参加'}
              </Button>
            )}
          </li>
        ))}
      </ul>
      {!ownUnit && (
        <div className="flex flex-col gap-2 border-t border-(--color-border) pt-3">
          <span className="text-sm text-(--color-text-muted)">新しい部隊を作る</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="部隊名" className={inputCls} />
          <input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="募集メッセージ" className={inputCls} />
          <Button type="button" variant="secondary" onClick={create} disabled={busy || !name.trim()} className="self-start">
            部隊を結成
          </Button>
        </div>
      )}
    </Card>
  );
}

function LoyaltyCard({ character, onChanged }: { character: CharacterRow; onChanged: () => void }) {
  const [value, setValue] = useState(character.loyalty);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await setLoyalty(value);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : '申告に失敗しました。');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card glass>
      <CardTitle>忠誠度申告</CardTitle>
      <p className="mb-2 text-xs text-(--color-text-faint)">
        ※原典の仕様上、忠誠度は自己申告制です（第三者による査定機構は存在しません）。
      </p>
      {error && <p className="mb-2 text-sm text-(--color-crimson-500)">{error}</p>}
      <div className="flex items-center gap-3">
        <input
          type="range" min={0} max={100} value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          className="h-1.5 flex-1 cursor-pointer accent-(--color-jade-500)"
        />
        <span className="w-10 text-right font-mono text-sm">{value}</span>
      </div>
      <Button type="button" variant="secondary" onClick={save} disabled={busy} className="mt-3 w-full">
        申告する
      </Button>
    </Card>
  );
}

const inputCls =
  'w-full rounded-lg border border-(--color-border) bg-(--color-bg-elevated) px-3 py-2 text-(--color-text) outline-none focus:border-(--color-accent)';
