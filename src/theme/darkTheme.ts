export function applyDarkTheme() {
  try {
    const id = 'wplace-dark-theme';
    if (document.getElementById(id)) return;
    const css = `
      :root {
        color-scheme: dark;
        --color-base-100: oklch(12% 0 0);
        --color-base-200: oklch(18% 0 0);
        --color-base-300: oklch(25% 0 0);
        --color-base-content: oklch(95% 0 0);
        --color-primary: oklch(65% .2 260);
        --color-primary-content: oklch(100% 0 260);
        --color-secondary: oklch(70% .15 280);
        --color-secondary-content: oklch(12% 0 280);
        --color-accent: oklch(65% .2 340);
        --color-accent-content: oklch(10% 0 340);
        --color-neutral: oklch(90% 0 255);
        --color-neutral-content: oklch(15% 0 255);
        --color-info: oklch(70% .1 210);
        --color-info-content: oklch(12% 0 210);
        --color-success: oklch(65% .12 150);
        --color-success-content: oklch(12% 0 150);
        --color-warning: oklch(75% .15 80);
        --color-warning-content: oklch(12% 0 80);
        --color-error: oklch(70% .15 30);
        --color-error-content: oklch(12% 0 30);
      }

      
      .btn { --btn-noise: none !important; }
    `;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = css;
    document.head.appendChild(style);
  } catch {}
}
