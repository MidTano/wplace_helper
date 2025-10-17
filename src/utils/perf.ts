const isDev = typeof import.meta !== 'undefined' && !!(import.meta as any).env?.DEV;
let lcp = 0;
let fcp = 0;
let cls = 0;
let longTasks = 0;
let longTaskTotal = 0;
let navTimings: Record<string, number> = {};
let marks: Record<string, number> = {};
function now() { try { return performance.now(); } catch { return 0; } }
export function perfMark(name: string) { try { if (isDev) { performance.mark(name); marks[name] = now(); } } catch {} }
export function perfMeasure(name: string, start: string, end: string) { try { if (isDev) { performance.measure(name, start, end); } } catch {} }
function setupPO() {
  if (!isDev) return;
  try {
    try {
      const poPaint = new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          if (e.name === 'first-contentful-paint') { fcp = fcp || e.startTime; }
        }
      });
      poPaint.observe({ type: 'paint', buffered: true } as any);
    } catch {}
    try {
      const poLcp = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last = entries[entries.length - 1];
        if (last) { lcp = last.startTime; }
      });
      poLcp.observe({ type: 'largest-contentful-paint', buffered: true } as any);
    } catch {}
    try {
      const poCls = new PerformanceObserver((list) => {
        for (const e of list.getEntries() as any) { if (!e.hadRecentInput) { cls += e.value || 0; } }
      });
      poCls.observe({ type: 'layout-shift', buffered: true } as any);
    } catch {}
    try {
      const poLt = new PerformanceObserver((list) => {
        for (const e of list.getEntries() as any) { longTasks++; longTaskTotal += Math.max(0, Math.round(e.duration)); }
      });
      poLt.observe({ type: 'longtask', buffered: true } as any);
    } catch {}
    try {
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | any;
      if (nav) {
        navTimings = {
          domContentLoaded: Math.round(nav.domContentLoadedEventEnd || 0),
          loadEventEnd: Math.round(nav.loadEventEnd || 0),
          transferSize: Number(nav.transferSize || 0),
          decodedBodySize: Number(nav.decodedBodySize || 0)
        };
      }
    } catch {}
  } catch {}
}
function report() {
  if (!isDev) return;
  try {
    const boot = marks['wguard:bootstrap:end'] && marks['wguard:bootstrap:start'] ? Math.max(0, Math.round(marks['wguard:bootstrap:end'] - marks['wguard:bootstrap:start'])) : 0;
    const mount = marks['mount:end'] && marks['mount:start'] ? Math.max(0, Math.round(marks['mount:end'] - marks['mount:start'])) : 0;
    const copy = marks['copyStyles:end'] && marks['copyStyles:start'] ? Math.max(0, Math.round(marks['copyStyles:end'] - marks['copyStyles:start'])) : 0;
    const data = {
      fcp: Math.round(fcp || 0),
      lcp: Math.round(lcp || 0),
      cls: Number(cls.toFixed(4)),
      longTasks,
      longTaskTotal,
      bootMs: boot,
      mountMs: mount,
      copyStylesMs: copy,
      nav: navTimings
    };
    console.group('wph:perf');
    console.table(data as any);
    console.groupEnd();
    return data;
  } catch {}
}
export function setupPerfObserver() { setupPO(); try { (window as any).wphPerfReport = report; } catch {} }
