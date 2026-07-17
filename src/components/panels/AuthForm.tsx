import { useState, type FormEvent } from 'react';
import { signIn, signUp } from '../../lib/game';
import { errorMessage } from '../../lib/errors';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

export default function AuthForm({ onAuthed }: { onAuthed: () => void }) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === 'signin') {
        await signIn(email, password);
        onAuthed();
      } else {
        await signUp(email, password);
        setNotice('確認メールを送信しました。メール内のリンクから認証を完了してください。');
      }
    } catch (err) {
      setError(errorMessage(err, '不明なエラーが発生しました。'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card glass className="w-full">
      <h1 className="mb-1 text-center text-2xl font-bold text-(--color-text)">三国志NET</h1>
      <p className="mb-6 text-center text-sm text-(--color-text-muted)">
        {mode === 'signin' ? 'ログインして天下統一を目指せ' : '新規アカウント登録'}
      </p>

      <form onSubmit={submit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-(--color-text-muted)">メールアドレス</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-(--color-border) bg-(--color-bg-elevated) px-3 py-2 text-(--color-text) outline-none focus:border-(--color-accent)"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-(--color-text-muted)">パスワード</span>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border border-(--color-border) bg-(--color-bg-elevated) px-3 py-2 text-(--color-text) outline-none focus:border-(--color-accent)"
          />
        </label>

        {error && <p className="text-sm text-(--color-crimson-500)">{error}</p>}
        {notice && <p className="text-sm text-(--color-jade-500)">{notice}</p>}

        <Button type="submit" disabled={busy} className="mt-2 w-full">
          {busy ? '処理中……' : mode === 'signin' ? 'ログイン' : 'アカウント作成'}
        </Button>
      </form>

      <button
        type="button"
        onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
        className="mt-4 w-full text-center text-xs text-(--color-text-faint) hover:text-(--color-accent) cursor-pointer"
      >
        {mode === 'signin' ? 'アカウントをお持ちでない方はこちら' : 'すでにアカウントをお持ちの方はこちら'}
      </button>
    </Card>
  );
}
