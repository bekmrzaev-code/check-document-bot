// Minimal imperative toast — mirrors the original dashboard behaviour.
let el: HTMLElement | null = null;
let timer: ReturnType<typeof setTimeout>;

function ensure(): HTMLElement {
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    document.body.appendChild(el);
  }
  return el;
}

export function toast(message: string, ms = 3000): void {
  const e = ensure();
  e.textContent = message;
  e.classList.add('show');
  clearTimeout(timer);
  timer = setTimeout(() => e.classList.remove('show'), ms);
}
