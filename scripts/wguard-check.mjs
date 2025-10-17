import fs from 'fs/promises';
import path from 'path';
import process from 'process';

const root = process.cwd();
const srcDir = path.join(root, 'src');
const include = new Set(['.ts', '.svelte']);

async function walk(dir) {
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      out.push(...await walk(p));
    } else if (e.isFile()) {
      const ext = path.extname(e.name).toLowerCase();
      if (include.has(ext)) out.push(p);
    }
  }
  return out;
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function lineOf(content, idx) {
  let count = 1;
  for (let i = 0; i < idx; i++) if (content.charCodeAt(i) === 10) count++;
  return count;
}

function checkAssignments(content, filePath) {
  const issues = [];
  const checks = [
    { type: 'createElement', re: /(const|let|var)\s+([A-Za-z_]\w*)\s*=\s*document\.createElement\(\s*(['"`])([^'"`]+)\3\s*\)/g, expect: 'dataset' },
    { type: 'new Image', re: /(const|let|var)\s+([A-Za-z_]\w*)\s*=\s*new\s+Image\s*\(\s*\)/g, expect: 'dataset' },
    { type: 'createComment', re: /(const|let|var)\s+([A-Za-z_]\w*)\s*=\s*document\.createComment\(\s*[^)]*\)/g, expect: 'wguard' },
    { type: 'createDocumentFragment', re: /(const|let|var)\s+([A-Za-z_]\w*)\s*=\s*document\.createDocumentFragment\(\s*\)/g, expect: 'wguard' }
  ];
  for (const c of checks) {
    let m;
    while ((m = c.re.exec(content)) !== null) {
      const varName = m[2];
      const idx = m.index;
      const win = content.slice(idx, idx + 400);
      let ok = false;
      if (c.expect === 'dataset') {
        const reOldStyle = new RegExp('(?:\\b' + escapeRe(varName) + '\\b|\\(' + escapeRe(varName) + '\\s+as\\s+[^\\)]*\\))[\\s\\S]{0,200}dataset\\.wguard\\s*=\\s*(["\'])WGuard\\1');
        const reNewStyle = new RegExp('markElement\\s*\\(\\s*' + escapeRe(varName) + '\\s*\\)');
        ok = reOldStyle.test(win) || reNewStyle.test(win);
      } else if (c.expect === 'wguard') {
        const reOldStyle = new RegExp('(?:\\b' + escapeRe(varName) + '\\b|\\(' + escapeRe(varName) + '\\s+as\\s+[^\\)]*\\))[\\s\\S]{0,200}\\.wguard\\s*=\\s*(["\'])WGuard\\1');
        const reNewStyle = new RegExp('markElement\\s*\\(\\s*' + escapeRe(varName) + '\\s*\\)');
        ok = reOldStyle.test(win) || reNewStyle.test(win);
      }
      if (!ok) {
        issues.push({ file: filePath, line: lineOf(content, idx), varName, type: c.type });
      }
    }
  }
  return issues;
}

async function run() {
  const files = await walk(srcDir);
  const allIssues = [];
  for (const f of files) {
    const content = await fs.readFile(f, 'utf8');
    const rel = path.relative(root, f);
    const issues = checkAssignments(content, rel);
    if (issues.length) allIssues.push(...issues);
  }
  if (allIssues.length) {
    console.log('WGUARD CHECK FAILED');
    for (const it of allIssues) {
      console.log(`${it.file}:${it.line} ${it.type} ${it.varName} missing WGuard label`);
    }
    process.exitCode = 1;
  } else {
    console.log('WGUARD CHECK OK');
  }
}

run().catch(e => { console.error('WGUARD CHECK ERROR', e && e.message ? e.message : String(e)); process.exitCode = 2; });
