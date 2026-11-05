/** Shared DOM helpers for screens. */

import { t, type StringKey } from '../i18n';

export function uiRoot(): HTMLElement {
  return document.getElementById('ui-root')!;
}

/** Remove all full-screen .screen elements (overlays keep theirs). */
export function clearScreens(): void {
  for (const el of uiRoot().querySelectorAll('.screen')) el.remove();
}

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function btn(labelKey: StringKey, onClick: () => void, extra = ''): HTMLButtonElement {
  const b = el('button', `arcade-btn ${extra}`.trim(), t(labelKey));
  b.addEventListener('click', onClick);
  return b;
}

/** Escape/click-outside helper for modal overlays. */
export function onEscape(handler: () => void): () => void {
  const fn = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') handler();
  };
  window.addEventListener('keydown', fn);
  return () => window.removeEventListener('keydown', fn);
}
