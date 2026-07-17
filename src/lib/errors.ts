// Supabase-js のエラー（PostgrestError等）は `Error` のインスタンスではなく、
// { message, details, hint, code } を持つただのプレーンオブジェクトとして
// throw / reject される。そのため `err instanceof Error ? err.message : fallback`
// という判定だけを各所に書くと、RPC側が明示的に raise exception したはずの
// 本来のエラーメッセージ（例:「国への貢献が足りません（貢献値500以上が必要です）。」）
// が常に握りつぶされ、汎用フォールバック文言しか画面に出ない。
//
// ここでは Error インスタンスに限らず、message プロパティを持つオブジェクト
// 全般から文字列を拾えるようにする。
export function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  if (
    err &&
    typeof err === 'object' &&
    'message' in err &&
    typeof (err as { message?: unknown }).message === 'string' &&
    (err as { message: string }).message
  ) {
    return (err as { message: string }).message;
  }
  return fallback;
}
