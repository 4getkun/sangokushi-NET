import { supabase } from './supabase';
import type {
  CharacterRow, TownRow, CountryRow, ItemCatalogRow, CommandQueueRow,
  CharacterLogRow, MapLogRow, MailRecipientKind, BbsScope,
  UnitRow, LocalRulePostRow, CountryBbsPostRow,
} from './database.types';

// ---------------------------------------------------------------------
// 認証
// ---------------------------------------------------------------------
export async function signUp(email: string, password: string) {
  // emailRedirectToを明示しないと、確認メールのリンク先はSupabase側の
  // 「Site URL」設定に丸投げになる。ダッシュボードの設定値がズレると
  // （実際、一度ズレて404事故が起きた）気づきにくいため、ここで
  // ブラウザの実行時情報から確実に正しいURL（GitHub Pagesのサブパス込み）
  // を組み立てて明示的に渡す。Supabase側の「Redirect URLs」許可リストに
  // https://4getkun.github.io/sangokushi-NET/** を登録済みなので検証も通る。
  const emailRedirectTo = `${window.location.origin}${import.meta.env.BASE_URL}`;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo },
  });
  if (error) throw error;
  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

// ---------------------------------------------------------------------
// キャラクター
// ---------------------------------------------------------------------
export async function fetchMyCharacter(): Promise<CharacterRow | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data, error } = await supabase.from('characters').select('*').eq('id', auth.user.id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function createCharacter(params: {
  loginName: string; displayName: string; portrait: number; townId: number;
  str: number; int: number; lea: number; newCountryName?: string; newCountryElement?: number;
}): Promise<CharacterRow> {
  const { data, error } = await supabase.rpc('create_character', {
    p_login_name: params.loginName,
    p_display_name: params.displayName,
    p_portrait: params.portrait,
    p_town_id: params.townId,
    p_str: params.str,
    p_int: params.int,
    p_lea: params.lea,
    p_new_country_name: params.newCountryName ?? null,
    p_new_country_element: params.newCountryElement ?? null,
  });
  if (error) throw error;
  return data as CharacterRow;
}

// ---------------------------------------------------------------------
// 世界状態
// ---------------------------------------------------------------------
export async function fetchTowns(): Promise<TownRow[]> {
  const { data, error } = await supabase.from('towns').select('*').order('id');
  if (error) throw error;
  return data ?? [];
}

export async function fetchAdjacency(): Promise<Map<number, number[]>> {
  const { data, error } = await supabase.from('town_adjacency').select('*');
  if (error) throw error;
  const map = new Map<number, number[]>();
  for (const row of data ?? []) {
    if (!map.has(row.town_id)) map.set(row.town_id, []);
    map.get(row.town_id)!.push(row.adjacent_town_id);
  }
  return map;
}

export async function fetchCountries(): Promise<CountryRow[]> {
  const { data, error } = await supabase.from('countries').select('*').order('id');
  if (error) throw error;
  return data ?? [];
}

export async function fetchItemCatalog(): Promise<ItemCatalogRow[]> {
  const { data, error } = await supabase.from('item_catalog').select('*').order('kind').order('id');
  if (error) throw error;
  return data ?? [];
}

// 1ターン＝何秒か (TIME_REMAKE, game_config.time_remake)。
// 行動予約欄で「このスロットは何時何分に実行されるか」を計算するために使う。
let cachedTimeRemakeSeconds: number | null = null;
export async function fetchTimeRemakeSeconds(): Promise<number> {
  if (cachedTimeRemakeSeconds !== null) return cachedTimeRemakeSeconds;
  const { data, error } = await supabase
    .from('game_config').select('value').eq('key', 'time_remake').single();
  if (error) throw error;
  cachedTimeRemakeSeconds = data?.value ?? 3600;
  return cachedTimeRemakeSeconds;
}

export async function fetchMapLog(channel: 'event' | 'chronicle', limit = 20): Promise<MapLogRow[]> {
  const { data, error } = await supabase
    .from('map_log').select('*').eq('channel', channel)
    .order('created_at', { ascending: false }).limit(limit);
  if (error) throw error;
  return data ?? [];
}

// ---------------------------------------------------------------------
// コマンドキュー
// ---------------------------------------------------------------------
export async function fetchMyQueue(characterId: string): Promise<CommandQueueRow[]> {
  const { data, error } = await supabase
    .from('command_queue').select('*').eq('character_id', characterId).order('slot_index');
  if (error) throw error;
  return data ?? [];
}

export async function fetchMyLogs(characterId: string, limit = 20): Promise<CharacterLogRow[]> {
  const { data, error } = await supabase
    .from('character_logs').select('*').eq('character_id', characterId)
    .order('created_at', { ascending: false }).limit(limit);
  if (error) throw error;
  return data ?? [];
}

export interface ReserveCommandParams {
  slotIndices: number[];
  commandCode: number;
  targetTownId?: number;
  targetItemId?: number;
  quantity?: number;
  troopType?: number;
  buyType?: number;
  statChoice?: number;
  targetCharacterId?: string;
  message?: string;
}

export async function reserveCommand(p: ReserveCommandParams): Promise<void> {
  const { error } = await supabase.rpc('reserve_command', {
    p_slot_indices: p.slotIndices,
    p_command_code: p.commandCode,
    p_target_town_id: p.targetTownId ?? null,
    p_target_item_id: p.targetItemId ?? null,
    p_quantity: p.quantity ?? null,
    p_troop_type: p.troopType ?? null,
    p_buy_type: p.buyType ?? null,
    p_stat_choice: p.statChoice ?? null,
    p_target_character_id: p.targetCharacterId ?? null,
    p_message: p.message ?? null,
  });
  if (error) throw error;
}

// ---------------------------------------------------------------------
// 君主・外交・部隊（必要最小限のラッパー）
// ---------------------------------------------------------------------
export async function kingDirective(message: string) {
  const { error } = await supabase.rpc('king_directive', { p_message: message });
  if (error) throw error;
}

export async function kingAppoint(targetCharacterId: string, role: number) {
  const { error } = await supabase.rpc('king_appoint', { p_target_character_id: targetCharacterId, p_role: role });
  if (error) throw error;
}

export async function kingDismiss(targetCharacterId: string) {
  const { error } = await supabase.rpc('king_dismiss', { p_target_character_id: targetCharacterId });
  if (error) throw error;
}

export async function respondRecruitmentOffer(offerId: number, accept: boolean) {
  const { error } = await supabase.rpc('respond_recruitment_offer', { p_offer_id: offerId, p_accept: accept });
  if (error) throw error;
}

export async function sendMail(kind: MailRecipientKind, body: string, opts?: { characterId?: string; countryId?: number }) {
  const { error } = await supabase.rpc('send_mail', {
    p_recipient_kind: kind,
    p_recipient_character_id: opts?.characterId ?? null,
    p_recipient_country_id: opts?.countryId ?? null,
    p_body: body,
  });
  if (error) throw error;
}

export async function postCountryBbs(title: string, body: string, scope: BbsScope = 'country') {
  const { error } = await supabase.rpc('post_country_bbs', { p_title: title, p_body: body, p_scope: scope, p_parent_post_id: null });
  if (error) throw error;
}

export async function createUnit(name: string, message: string) {
  const { error } = await supabase.rpc('create_unit', { p_name: name, p_message: message });
  if (error) throw error;
}

export async function joinUnit(unitId: number) {
  const { error } = await supabase.rpc('join_unit', { p_unit_id: unitId });
  if (error) throw error;
}

export async function toggleUnitRecruiting() {
  const { error } = await supabase.rpc('toggle_unit_recruiting');
  if (error) throw error;
}

export async function leaveOrDisbandUnit() {
  const { error } = await supabase.rpc('leave_or_disband_unit');
  if (error) throw error;
}

export async function kingSetEntryMessage(message: string) {
  const { error } = await supabase.rpc('king_set_entry_message', { p_message: message });
  if (error) throw error;
}

export async function postLocalRule(body: string, scope: BbsScope = 'country') {
  const { error } = await supabase.rpc('post_local_rule', { p_body: body, p_scope: scope });
  if (error) throw error;
}

export async function deleteLocalRule(ruleId: number) {
  const { error } = await supabase.rpc('delete_local_rule', { p_rule_id: ruleId });
  if (error) throw error;
}

// 原典の仕様どおり、忠誠度は自己申告で設定できる（自己セット可能バグを意図的に保持）。
export async function setLoyalty(value: number) {
  const { error } = await supabase.rpc('set_loyalty', { p_value: value });
  if (error) throw error;
}

// ---------------------------------------------------------------------
// 一覧系（我が国タブ・武勲録タブ用）
// ---------------------------------------------------------------------
export async function fetchAllCharacters(): Promise<CharacterRow[]> {
  const { data, error } = await supabase.from('characters').select('*');
  if (error) throw error;
  return data ?? [];
}

export async function fetchCountryMembers(countryId: number): Promise<CharacterRow[]> {
  const { data, error } = await supabase.from('characters').select('*').eq('country_id', countryId);
  if (error) throw error;
  return data ?? [];
}

export async function fetchRanking(
  orderBy: 'rank_points' | 'battle_wins' | 'merit' | 'str' | 'leadership',
  limit = 100
): Promise<CharacterRow[]> {
  const { data, error } = await supabase
    .from('characters').select('*').order(orderBy, { ascending: false }).limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function fetchUnits(countryId: number): Promise<UnitRow[]> {
  const { data, error } = await supabase.from('units').select('*').eq('country_id', countryId).order('id');
  if (error) throw error;
  return data ?? [];
}

export async function fetchLocalRules(countryId: number): Promise<LocalRulePostRow[]> {
  const { data, error } = await supabase
    .from('local_rule_posts').select('*').eq('country_id', countryId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchCountryBbs(countryId: number): Promise<CountryBbsPostRow[]> {
  const { data, error } = await supabase
    .from('country_bbs_posts').select('*').eq('country_id', countryId)
    .order('created_at', { ascending: false }).limit(50);
  if (error) throw error;
  return data ?? [];
}
