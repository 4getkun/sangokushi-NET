# 三国志NET フロントエンド

「三国志NET」（原典: 素のPerl CGI + Shift-JISフラットファイルDB）を、
[pomofree](https://github.com/) と同じ技術スタックで移植したフロントエンドです。

- **Astro** (`output: "static"`) — 静的サイトとしてビルドし、GitHub Pagesで配信
- **React** — ゲーム画面全体を単一の `client:load` アイランド（`GameApp.tsx`）として実装。
  タブ切り替えはReact側のstateで行うため、ページ遷移でタイマーや入力中のフォームが飛ばない
- **Tailwind CSS v4** — CSS-firstの `@theme` 設定（`tailwind.config.js` は使用しない）
- **Supabase** — 認証（Auth）とデータベース（Postgres + RLS + RPC）。ゲームロジックは
  `supabase/migrations/` 側のSQL関数として実装されており、フロントエンドはあくまで
  それを呼び出すクライアントに徹しています
- ライト/ダークモード切り替え（原典には存在しない、本移植での追加機能）

原典のゲームロジック仕様は `../docs/GAME_LOGIC_SPEC.md`、DB/RPCの実装は `../supabase/` を参照してください。

## デザインシステム

`src/styles/global.css` に、OKLCH広色域を用いた2020年代以降のトレンドに沿ったデザイントークンを定義しています。

- **朱(crimson)** — 主アクセント。攻撃・警告・王朝の色
- **金(gold)** — 副アクセント。資源・実績・君主の色
- **翡翠(jade)** — 内政・成功・成長の色
- **藍(azure)** — 情報・水系・リンクの色
- **墨(ink)** — ウォームニュートラル（純グレーではなく僅かに暖色寄り）

ダークモードは暖かみのある濃紺墨色の背景にヴィヴィッドなアクセントグロー、
ライトモードは純白ではなく生成り（米紙）色の背景を採用しています。
ヘッダーやカードにはガラスモーフィズム（`backdrop-filter: blur`）、
ソフトな大きめの角丸・シャドウを使用しています。

ライト/ダークの切り替えはヘッダー右側のトグルスイッチから行えます。選択は
`localStorage` に保存され、次回訪問時にも復元されます（OSのカラースキーム設定もフォールバックとして尊重します）。

## セットアップ

```bash
npm install
cp .env.example .env
# .env にSupabaseプロジェクトのURLとanon keyを設定
npm run dev
```

### 環境変数

| 変数名 | 説明 |
| --- | --- |
| `PUBLIC_SUPABASE_URL` | SupabaseプロジェクトのURL |
| `PUBLIC_SUPABASE_ANON_KEY` | Supabaseのanon key |

`PUBLIC_` プレフィックスはAstroの規約で、ビルド時にクライアントサイドのバンドルへ埋め込まれます
（秘匿情報ではなく、RLSで保護された公開キーです）。

## 開発コマンド

```bash
npm run dev      # 開発サーバー
npm run build    # 本番ビルド（dist/ に出力）
npm run preview  # ビルド結果のプレビュー
npm run check    # astro check（TypeScript / JSXの型チェック）
```

`npm run build` と `npm run check` はいずれも本リポジトリでエラー0件を確認済みです。

## GitHub Pagesへのデプロイ

`.github/workflows/deploy.yml` が `main` ブランチへのpushをトリガーに自動ビルド・デプロイを行います。

1. リポジトリの Settings → Pages → Source を "GitHub Actions" に設定
2. Settings → Secrets and variables → Actions に以下を登録
   - `PUBLIC_SUPABASE_URL`
   - `PUBLIC_SUPABASE_ANON_KEY`
3. `main` にpushすると自動的にビルド・デプロイされます

リポジトリ名でプロジェクトページとして配信する場合（`https://<user>.github.io/<repo>/`）は、
`astro.config.mjs` の `base: '/<repo>/'` のコメントアウトを外してください。
ユーザー/組織ページ（`https://<user>.github.io/`）として配信する場合はそのままで構いません。

## ディレクトリ構成

```
src/
  components/
    GameApp.tsx          # 唯一のReactアイランド。認証〜タブ切り替えまでの状態を保持
    ThemeToggle.tsx       # ライト/ダークモード切り替え（追加機能）
    panels/                # 本陣・軍議・天下図・我が国・武勲録の各タブ
    ui/                     # Card / Button / StatBar などの共通UI部品
  layouts/
    BaseLayout.astro       # FOUC対策のテーマ初期化スクリプトを含む共通レイアウト
  lib/
    supabase.ts             # Supabaseクライアント
    database.types.ts       # 手書きのDB型定義（型生成を行う場合は `supabase gen types typescript` で再生成）
    constants.ts             # コマンドID・国テーマカラーなど原典由来の定数
    game.ts                   # Supabase呼び出しのラッパー関数群
  pages/
    index.astro                # エントリーポイント。<GameApp client:load /> を配置
  styles/
    global.css                  # デザインシステム（Tailwind v4 @theme）
```

## 原典との対応・既知の仕様

バックエンド（Supabase migrations）は「まず原典どおりに実装し、後で修正する」方針のもと、
原典に存在した挙動・不具合をあえてそのまま再現しています（例: 忠誠度の自己申告制、
兵種切り替えの非対称なクランプ処理、国内お触れ削除時の投稿者チェック省略など）。
フロントエンドは原則としてバックエンドAPIをそのまま呼び出すだけの薄いクライアントであり、
これらの挙動に対する独自の補正は行っていません。詳細は `../docs/GAME_LOGIC_SPEC.md` の
「既知の不具合」セクションを参照してください。

唯一、原典に存在しなかった新機能として、認証をSupabase Authに置き換えたこと、
ターン処理を `pg_cron` による定期実行に置き換えたこと（静的サイトには「毎アクセス時に処理」という
原典のフックが存在しないため）、そして本ドキュメント冒頭のライト/ダークモード切り替えがあります。
