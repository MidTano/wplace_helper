let cachedAttrName: string | null = null;
let cachedAttrValue: string | null = null;
const markSymbol: unique symbol = Symbol('wguard_mark');

export function getDynamicAttribute(): { name: string; value: string } {
  if (cachedAttrName && cachedAttrValue) {
    return { name: cachedAttrName, value: cachedAttrValue };
  }

  try {
    const cached = sessionStorage.getItem('wguard:user-config');
    if (cached) {
      const data = JSON.parse(cached);
      const attr = data?.config?.obfuscation?.dataAttribute;
      if (attr && typeof attr === 'string' && attr.startsWith('data-')) {
        cachedAttrName = attr;
        cachedAttrValue = attr.replace('data-', '');
        return { name: cachedAttrName, value: cachedAttrValue };
      }
    }
  } catch {}

  cachedAttrName = 'data-wguard';
  cachedAttrValue = 'WGuard';
  return { name: cachedAttrName, value: cachedAttrValue };
}

export function setDynamicAttribute(element: HTMLElement | Element): void {
  try {
    const { name, value } = getDynamicAttribute();
    element.setAttribute(name, value);
  } catch {}
}

export function markElement(element: HTMLElement | Element): void {
  try {
    (element as any)[markSymbol] = true;
  } catch {}
  try {
    const { name } = getDynamicAttribute();
    element.setAttribute(name, name.replace('data-', ''));
    try { (element as any).removeAttribute && (element as any).removeAttribute(name); } catch {}
  } catch {}
}
