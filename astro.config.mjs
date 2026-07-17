import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// GitHub Pages配信を想定した設定。
// リポジトリ名に合わせて `site` / `base` を書き換えること
// （例: ユーザーページ以外の場合は base: '/sangokushi-NET/' のようにリポジトリ名を入れる）。
export default defineConfig({
  output: 'static',
  site: 'https://forgetkun.github.io',
  // base: '/sangokushi-NET/', // プロジェクトページとして配信する場合はコメントを外す
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
  },
});
