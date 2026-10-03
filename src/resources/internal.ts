type QueryValue =
  | string
  | number
  | boolean
  | readonly (string | number | boolean)[]
  | null
  | undefined;

export function toQs(q: Record<string, QueryValue>): string {
  const entries = Object.entries(q)
    .filter(([, v]) => v != null)
    .flatMap(([k, v]) =>
      Array.isArray(v)
        ? v.map((item) => [k, String(item)] as [string, string])
        : [[k, String(v)] as [string, string]],
    );
  return entries.length ? `?${new URLSearchParams(entries).toString()}` : '';
}
