import { useCallback, useMemo, useState } from 'react';

// Reusable multi-select state for list sections. Tracks a Set of ids and
// exposes helpers to toggle one, select/clear many, and query state.
export function useSelection<T extends string | number>() {
  const [sel, setSel] = useState<Set<T>>(new Set());

  const toggle = useCallback((id: T) => {
    setSel((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }, []);

  const clear = useCallback(() => setSel(new Set()), []);
  const replace = useCallback((ids: T[]) => setSel(new Set(ids)), []);
  const isSelected = useCallback((id: T) => sel.has(id), [sel]);

  // Select all of `ids` if not all are selected, otherwise clear them.
  const toggleAll = useCallback((ids: T[]) => {
    setSel((s) => {
      const allSelected = ids.length > 0 && ids.every((i) => s.has(i));
      return allSelected ? new Set() : new Set(ids);
    });
  }, []);

  const ids = useMemo(() => Array.from(sel), [sel]);

  return { ids, size: sel.size, toggle, toggleAll, clear, replace, isSelected };
}
