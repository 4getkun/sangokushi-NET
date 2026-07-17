import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  fetchTowns, fetchAdjacency, fetchItemCatalog, fetchMyQueue, reserveCommand,
} from '../../lib/game';
import type { CharacterRow, TownRow, ItemCatalogRow, CommandQueueRow } from '../../lib/database.types';
import { COMMAND, COMMAND_LABELS, SOL_TYPE, SOL_PRICE } from '../../lib/constants';
import { Card, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';

const COMMAND_ORDER = [
  COMMAND.NOUGYOU, COMMAND.SYOUGYOU, COMMAND.SHIRO, COMMAND.SHIRO_TAI, COMMAND.TEC,
  COMMAND.KUNREN, COMMAND.TOWN_DEF, COMMAND.GET_SOL2, COMMAND.TANREN2,
  COMMAND.MOVE2, COMMAND.BATTLE2, COMMAND.SYUUGOU,
  COMMAND.BUY2, COMMAND.RICE_GIVE, COMMAND.ARM_BUY2, COMMAND.DEF_BUY2,
  COMMAND.SHIKAN, COMMAND.GET_MAN2,
];

const STAT_CHOICES = [
  { code: 0, label: '武力' },
  { code: 1, label: '知力' },
  { code: 2, label: '統率' },
  { code: 3, label: '魅力' },
];

export default function CommandPanel({
  character,
  onChanged,
}: {
  character: CharacterRow;
  onChanged: () => void;
}) {
  const [towns, setTowns] = useState<TownRow[]>([]);
  const [adjacency, setAdjacency] = useState<Map<number, number[]>>(new Map());
  const [items, setItems] = useState<ItemCatalogRow[]>([]);
  const [queue, setQueue] = useState<CommandQueueRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [command, setCommand] = useState<number>(COMMAND.NOUGYOU);
  const [slots, setSlots] = useState<number[]>([]);
  const [targetTownId, setTargetTownId] = useState<number | ''>('');
  const [targetItemId, setTargetItemId] = useState<number | ''>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [troopType, setTroopType] = useState<number>(0);
  const [buyType, setBuyType] = useState<number>(0);
  const [statChoice, setStatChoice] = useState<number>(0);
  const [targetCharacterId, setTargetCharacterId] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function load() {
    setLoading(true);
    Promise.all([fetchTowns(), fetchAdjacency(), fetchItemCatalog(), fetchMyQueue(character.id)])
      .then(([t, a, i, q]) => {
        setTowns(t);
        setAdjacency(a);
        setItems(i);
        setQueue(q);
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, [character.id]);

  const emptySlots = useMemo(
    () => Array.from({ length: 24 }, (_, i) => i).filter((i) => {
      const q = queue.find((q) => q.slot_index === i);
      return !q || q.command_code === COMMAND.NONE;
    }),
    [queue]
  );

  const adjacentTowns = useMemo(() => {
    if (!character.position_town_id) return [];
    const ids = adjacency.get(character.position_town_id) ?? [];
    return towns.filter((t) => ids.includes(t.id));
  }, [adjacency, towns, character.position_town_id]);

  const needsTown = command === COMMAND.MOVE2 || command === COMMAND.BATTLE2;
  const needsBuy = command === COMMAND.BUY2;
  const needsWeapon = command === COMMAND.ARM_BUY2;
  const needsBook = command === COMMAND.DEF_BUY2;
  const needsTroop = command === COMMAND.GET_SOL2;
  const needsStat = command === COMMAND.TANREN2;
  const needsTargetChar = command === COMMAND.GET_MAN2;
  const needsRiceQty = command === COMMAND.RICE_GIVE;

  function toggleSlot(i: number) {
    setSlots((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i].sort((a, b) => a - b)));
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (slots.length === 0) { setError('予約するターン（枠）を1つ以上選択してください。'); return; }
    if (needsTown && targetTownId === '') { setError('対象の町を選択してください。'); return; }
    if ((needsWeapon || needsBook) && targetItemId === '') { setError('購入する品目を選択してください。'); return; }
    if (needsTargetChar && !targetCharacterId) { setError('対象武将のIDを指定してください。'); return; }

    setBusy(true);
    try {
      await reserveCommand({
        slotIndices: slots,
        commandCode: command,
        targetTownId: needsTown ? Number(targetTownId) : undefined,
        targetItemId: (needsWeapon || needsBook) ? Number(targetItemId) : undefined,
        quantity: needsTroop || needsBuy || needsRiceQty ? quantity : undefined,
        troopType: needsTroop ? troopType : undefined,
        buyType: needsBuy ? buyType : undefined,
        statChoice: needsStat ? statChoice : undefined,
        targetCharacterId: needsTargetChar ? targetCharacterId : undefined,
        message: needsTargetChar ? message : undefined,
      });
      setNotice('コマンドを予約しました。');
      setSlots([]);
      load();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : '予約に失敗しました。');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_1fr]">
      <Card glass>
        <CardTitle>コマンド予約</CardTitle>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-(--color-text-muted)">実行するコマンド</span>
            <select
              value={command}
              onChange={(e) => setCommand(Number(e.target.value))}
              className={inputCls}
            >
              {COMMAND_ORDER.map((c) => (
                <option key={c} value={c}>{COMMAND_LABELS[c]}</option>
              ))}
            </select>
          </label>

          {needsTown && (
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-(--color-text-muted)">
                対象の町（隣接する町のみ移動・攻撃可能 — 原典どおり）
              </span>
              <select value={targetTownId} onChange={(e) => setTargetTownId(Number(e.target.value))} className={inputCls}>
                <option value="">選択してください</option>
                {adjacentTowns.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </label>
          )}

          {needsBuy && (
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-(--color-text-muted)">売買種別</span>
                <select value={buyType} onChange={(e) => setBuyType(Number(e.target.value))} className={inputCls}>
                  <option value={0}>米を買う</option>
                  <option value={1}>米を売る</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-(--color-text-muted)">数量</span>
                <input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className={inputCls} />
              </label>
            </div>
          )}

          {needsRiceQty && (
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-(--color-text-muted)">施与する米の量</span>
              <input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className={inputCls} />
            </label>
          )}

          {(needsWeapon || needsBook) && (
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-(--color-text-muted)">{needsWeapon ? '購入する武具' : '購入する書物'}</span>
              <select value={targetItemId} onChange={(e) => setTargetItemId(Number(e.target.value))} className={inputCls}>
                <option value="">選択してください</option>
                {items.filter((it) => it.kind === (needsWeapon ? 'weapon' : 'book')).map((it) => (
                  <option key={it.id} value={it.id}>{it.name}（{it.price.toLocaleString()}金）</option>
                ))}
              </select>
            </label>
          )}

          {needsTroop && (
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-(--color-text-muted)">兵種</span>
                <select value={troopType} onChange={(e) => setTroopType(Number(e.target.value))} className={inputCls}>
                  {SOL_TYPE.map((s, i) => (
                    <option key={i} value={i}>{s}（{SOL_PRICE[i]}金/人）</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-(--color-text-muted)">徴兵数</span>
                <input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className={inputCls} />
              </label>
            </div>
          )}

          {needsStat && (
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-(--color-text-muted)">鍛錬する能力</span>
              <select value={statChoice} onChange={(e) => setStatChoice(Number(e.target.value))} className={inputCls}>
                {STAT_CHOICES.map((s) => (
                  <option key={s.code} value={s.code}>{s.label}</option>
                ))}
              </select>
            </label>
          )}

          {needsTargetChar && (
            <div className="grid grid-cols-1 gap-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-(--color-text-muted)">対象武将ID</span>
                <input value={targetCharacterId} onChange={(e) => setTargetCharacterId(e.target.value)} className={inputCls} placeholder="対象のログインIDまたは内部ID" />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-(--color-text-muted)">口説き文句</span>
                <textarea value={message} onChange={(e) => setMessage(e.target.value)} className={inputCls} rows={2} />
              </label>
            </div>
          )}

          <div>
            <span className="mb-2 block text-sm text-(--color-text-muted)">予約する枠（複数選択可・空き枠のみ）</span>
            {loading ? (
              <p className="text-sm text-(--color-text-faint)">読み込み中……</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {emptySlots.length === 0 && <p className="text-sm text-(--color-text-faint)">空き枠がありません。</p>}
                {emptySlots.map((i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleSlot(i)}
                    className={[
                      'h-8 w-8 cursor-pointer rounded-lg text-xs font-mono transition-colors',
                      slots.includes(i)
                        ? 'bg-(--color-crimson-500) text-white'
                        : 'bg-(--color-surface-hover) text-(--color-text-muted) hover:bg-(--color-crimson-500)/20',
                    ].join(' ')}
                  >
                    +{i}
                  </button>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-sm text-(--color-crimson-500)">{error}</p>}
          {notice && <p className="text-sm text-(--color-jade-500)">{notice}</p>}

          <Button type="submit" disabled={busy} className="mt-1 w-full">
            {busy ? '予約中……' : `${slots.length || 0}枠に予約する`}
          </Button>
        </form>
      </Card>

      <Card glass>
        <CardTitle>現在の予約状況</CardTitle>
        {loading ? (
          <p className="text-sm text-(--color-text-faint)">読み込み中……</p>
        ) : (
          <ol className="grid grid-cols-4 gap-1.5 text-xs sm:grid-cols-6">
            {Array.from({ length: 24 }, (_, i) => queue.find((q) => q.slot_index === i)).map((q, i) => {
              const filled = !!q && q.command_code !== COMMAND.NONE;
              return (
                <li
                  key={i}
                  className={[
                    'flex flex-col items-center justify-center gap-0.5 rounded-lg p-1.5 text-center',
                    filled ? 'bg-(--color-jade-500)/12' : 'bg-(--color-surface-hover)',
                  ].join(' ')}
                  title={q?.label || (q ? COMMAND_LABELS[q.command_code] : '未定')}
                >
                  <span className="font-mono text-(--color-text-faint)">+{i}</span>
                  <span className="line-clamp-1 w-full text-(--color-text)">
                    {filled ? (COMMAND_LABELS[q!.command_code] ?? '？') : '―'}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
        <p className="mt-3 text-xs text-(--color-text-faint)">
          コマンドはターンごとに自動処理されます（原典の「毎アクセス時に処理」を、静的サイト向けに定期実行へ置き換え）。
        </p>
      </Card>
    </div>
  );
}

const inputCls =
  'w-full rounded-lg border border-(--color-border) bg-(--color-bg-elevated) px-3 py-2 text-(--color-text) outline-none focus:border-(--color-accent)';
