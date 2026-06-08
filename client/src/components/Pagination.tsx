export const PAGE_SIZE = 20;

export function paginate<T>(items: T[], page: number, size = PAGE_SIZE) {
  const total = items.length;
  const pages = Math.max(1, Math.ceil(total / size));
  const p = Math.min(Math.max(1, page), pages);
  const start = (p - 1) * size;
  return { slice: items.slice(start, start + size), page: p, pages, total, start, size };
}

export function Pagination({
  total, page, pages, start, size, onPage,
}: {
  total: number; page: number; pages: number; start: number; size: number; onPage: (p: number) => void;
}) {
  if (total === 0) return null;
  if (pages <= 1) {
    return <div className="pagination"><span className="pagination-info">{total} item{total !== 1 ? 's' : ''}</span></div>;
  }
  return (
    <div className="pagination">
      <span className="pagination-info">Showing {start + 1}–{Math.min(start + size, total)} of {total}</span>
      <div className="pagination-btns">
        <button className="page-btn" disabled={page <= 1} onClick={() => onPage(page - 1)}>← Prev</button>
        <button className="page-btn active">{page} / {pages}</button>
        <button className="page-btn" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next →</button>
      </div>
    </div>
  );
}
