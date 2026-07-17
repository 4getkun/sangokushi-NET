// 原典 ini_file/com_list.ini 相当。GAME_LOGIC_SPEC.md 第4章のコマンドID表そのまま。
export const COMMAND = {
  NONE: 0,
  NOUGYOU: 1,
  SYOUGYOU: 2,
  SHIRO: 3,
  RICE_GIVE: 8,
  GET_SOL2: 10,
  KUNREN: 11,
  TOWN_DEF: 12,
  BATTLE2: 18,
  BUY2: 19,
  MOVE2: 20,
  SHIKAN: 21,
  ARM_BUY2: 22,
  DEF_BUY2: 23,
  GET_MAN2: 25,
  TANREN2: 27,
  SYUUGOU: 28,
  TEC: 29,
  SHIRO_TAI: 30,
} as const;

export const COMMAND_LABELS: Record<number, string> = {
  [COMMAND.NONE]: '何もしない',
  [COMMAND.NOUGYOU]: '農業開発',
  [COMMAND.SYOUGYOU]: '商業振興',
  [COMMAND.SHIRO]: '城壁建築',
  [COMMAND.RICE_GIVE]: '米施与',
  [COMMAND.GET_SOL2]: '徴兵',
  [COMMAND.KUNREN]: '兵士訓練',
  [COMMAND.TOWN_DEF]: '城の守備',
  [COMMAND.BATTLE2]: '攻撃',
  [COMMAND.BUY2]: '米売買',
  [COMMAND.MOVE2]: '移動',
  [COMMAND.SHIKAN]: '仕官',
  [COMMAND.ARM_BUY2]: '装備購入',
  [COMMAND.DEF_BUY2]: '書物購入',
  [COMMAND.GET_MAN2]: '登用',
  [COMMAND.TANREN2]: '鍛錬',
  [COMMAND.SYUUGOU]: '集合',
  [COMMAND.TEC]: '技術開発',
  [COMMAND.SHIRO_TAI]: '城壁耐久力強化',
};

export const SOL_TYPE = ['歩兵', '弩兵', '弓騎兵', '山地兵', '連弩兵', '伝令兵'] as const;
export const SOL_PRICE = [10, 20, 30, 50, 70, 100] as const;

// 原典 ini_file/index.ini の $ELE_BG（国テーマカラー、8色）を
// OKLCHベースの本デザインシステムに合わせて再設計した値。
export const ELEMENT_COLORS: { bg: string; text: string; ring: string }[] = [
  { bg: 'oklch(0.42 0.02 60)', text: 'oklch(0.95 0.01 60)', ring: 'oklch(0.55 0.02 60)' },
  { bg: 'oklch(0.50 0.19 25)', text: 'oklch(0.98 0 0)', ring: 'oklch(0.60 0.19 25)' },
  { bg: 'oklch(0.50 0.14 240)', text: 'oklch(0.98 0 0)', ring: 'oklch(0.62 0.13 240)' },
  { bg: 'oklch(0.50 0.12 155)', text: 'oklch(0.98 0 0)', ring: 'oklch(0.62 0.12 155)' },
  { bg: 'oklch(0.55 0.10 95)', text: 'oklch(0.16 0 0)', ring: 'oklch(0.65 0.10 95)' },
  { bg: 'oklch(0.55 0.09 200)', text: 'oklch(0.98 0 0)', ring: 'oklch(0.65 0.09 200)' },
  { bg: 'oklch(0.62 0.13 85)', text: 'oklch(0.16 0 0)', ring: 'oklch(0.72 0.13 85)' },
  { bg: 'oklch(0.48 0.15 330)', text: 'oklch(0.98 0 0)', ring: 'oklch(0.58 0.15 330)' },
];

export const OFFICER_ROLES = [
  { code: 0, key: 'gunshi_character_id', label: '軍師' },
  { code: 1, key: 'dai_character_id', label: '大将軍' },
  { code: 2, key: 'uma_character_id', label: '騎馬将軍' },
  { code: 3, key: 'goei_character_id', label: '護衛将軍' },
  { code: 4, key: 'yumi_character_id', label: '弓将軍' },
  { code: 5, key: 'hei_character_id', label: '将軍' },
] as const;

export const RANK_TITLE_TIER_SIZE = 500; // $LANK

// 原典 image/0.gif 〜 98.gif（ini_file/index.ini の $CHARA_IMAGE=98）相当。
// 武将作成時のイメージ選択に使う、原典の肖像画像一式。
export const PORTRAIT_COUNT = 99;

// public/portraits/ 以下の画像は、GitHub Pagesのプロジェクトページ配信
// （astro.config.mjs の base設定）によりルート直下ではなくサブパス配信になるため、
// 単純な "/portraits/N.gif" 決め打ちだとbase未対応で404になる。
// import.meta.env.BASE_URL は astro.config.mjs の base 設定値を反映した
// 実行時の基点パス（末尾スラッシュ付き）なので、これを使って組み立てる。
const BASE = import.meta.env.BASE_URL ?? '/';
export function portraitUrl(n: number): string {
  return `${BASE}${BASE.endsWith('/') ? '' : '/'}portraits/${n}.gif`;
}
