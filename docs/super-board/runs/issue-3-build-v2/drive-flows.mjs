// RN Hermes CDP driver — probe + flow choreography, no external deps.
// Usage: node /tmp/rn-driver.mjs <mode>   mode: probe | drive
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';

// ws client from the main repo's node_modules (worktree ships none); the
// inspector proxy's verifyClient requires an Origin header (see
// InspectorProxy.js #createDebuggerConnectionWSServer).
const require2 = createRequire('/Users/gauwan/Codespaces/dayli-step-tracker/package.json');
const WS = require2('ws');

const MODE = process.argv[2] ?? 'probe';
const EV_DIR = '/tmp/issue3-evidence';
execSync(`mkdir -p ${EV_DIR}`);

const targets = JSON.parse(execSync('curl -s --max-time 3 http://127.0.0.1:8081/json/list').toString());
const target = targets[0];
if (!target) { console.error('NO_TARGET'); process.exit(1); }
console.log('target:', target.title);

let ws = null;
let msgId = 0;
const pending = new Map();

function send(method, params = {}, timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    const id = ++msgId;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
    const t = setTimeout(() => {
      if (pending.has(id)) { pending.delete(id); reject(new Error('timeout ' + method)); }
    }, timeoutMs);
    if (typeof t.unref === 'function') t.unref();
  });
}

function onMessage(data) {
  const msg = JSON.parse(data.toString());
  if (msg.id && pending.has(msg.id)) {
    const { resolve } = pending.get(msg.id);
    pending.delete(msg.id);
    resolve(msg);
  }
}

function evaluateRaw(expression) { return send('Runtime.evaluate', { expression, returnByValue: true }); }

async function evalJson(expression) {
  const res = await evaluateRaw(expression);
  if (res.error) throw new Error('cdp error: ' + JSON.stringify(res.error));
  if (res.result?.exceptionDetails) {
    throw new Error('eval exception: ' + JSON.stringify(res.result.exceptionDetails).slice(0, 800));
  }
  const v = res.result?.result?.value;
  return typeof v === 'string' ? JSON.parse(v) : v;
}

function shot(name) {
  execSync(`xcrun simctl io booted screenshot ${EV_DIR}/${name}.png`);
  console.log('shot:', name);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- in-app expression builders -------------------------------------------
// The App renders Pressables whose onPress we invoke; the a11y tree is read
// from the same live fiber tree.

const JS_HELPERS = `
globalThis.__sb = (() => {
  const hook = globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__;
  if (!hook) return { error: 'no devtools hook' };
  const rendererId = Number([...hook.renderers.keys()][0]);
  const roots = hook.getFiberRoots(rendererId);
  if (!roots || roots.size === 0) return { error: 'no fiber roots' };
  const out = { pressables: [], a11y: [] };
  const seen = new Set();
  function styleText(style) {
    try {
      if (style == null) return null;
      if (Array.isArray(style)) return style.map(styleText);
      if (typeof style === 'object' && style !== null) {
        const keys = Object.keys(style);
        const flat = { __keys: keys };
        for (const k of keys) {
          const v = style[k];
          if (typeof v !== 'function') flat[k] = v;
        }
        return flat;
      }
      return style; // opaque registered id (number)
    } catch (e) { return 'ERR'; }
  }
  function walk(fiber, depth) {
    while (fiber && depth < 200) {
      if (seen.has(fiber)) return;
      seen.add(fiber);
      const p = fiber.memoizedProps;
      if (p && typeof p === 'object') {
        if (typeof p.onPress === 'function') {
          out.pressables.push({
            role: p.accessibilityRole ?? null,
            label: p.accessibilityLabel ?? null,
            state: p.accessibilityState ?? null,
            testID: p.testID ?? null,
            disabled: !!p.disabled,
            style: styleText(p.style),
            fn: String(p.onPress).slice(0, 100),
          });
        }
        if (p.accessibilityLabel != null || p.accessible === true) {
          out.a11y.push({
            label: p.accessibilityLabel ?? null,
            role: p.accessibilityRole ?? null,
            state: p.accessibilityState ?? null,
            accessible: p.accessible === true,
          });
        }
      }
      if (fiber.child) walk(fiber.child, depth + 1);
      fiber = fiber.sibling;
    }
  }
  for (const root of roots) walk(root.current, 0);
  return out;
})();
`;

function findPressable(tree, match) {
  return tree.pressables.find((p) =>
    !p.disabled && p.label != null && match(p.label, p));
}

async function dumpState(tag) {
  const tree = await evalJson(JS_HELPERS);
  const fs = await import('node:fs');
  fs.writeFileSync(`${EV_DIR}/a11y-${tag}.json`, JSON.stringify(tree, null, 2));
  return tree;
}

async function pressByLabel(tree, predicate, tag) {
  const p = findPressable(tree, predicate);
  if (!p) {
    throw new Error(`pressable not found for ${tag}; have: ` +
      tree.pressables.map((x) => x.label).join(' | '));
  }
  // invoke through a fresh tree lookup to press the CURRENT rendered control
  const expr = `
    (() => {
      const hook = globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__;
      const rendererId = Number([...hook.renderers.keys()][0]);
      const roots = hook.getFiberRoots(rendererId);
      const seen = new Set();
      const wanted = ${JSON.stringify(p.label)};
      let pressed = null;
      function walk(fiber, depth) {
        while (fiber && depth < 200 && !pressed) {
          if (!seen.has(fiber)) {
            seen.add(fiber);
            const pr = fiber.memoizedProps;
            if (pr && typeof pr === 'object' && typeof pr.onPress === 'function' &&
                !pr.disabled && pr.accessibilityLabel === wanted) {
              pr.onPress();
              pressed = true;
            }
            if (fiber.child) walk(fiber.child, depth + 1);
          }
          fiber = fiber.sibling;
        }
      }
      for (const root of roots) walk(root.current, 0);
      return JSON.stringify({ pressed });
    })()
  `;
  const res = await evalJson(expr);
  if (!res.pressed) throw new Error('press failed for ' + tag);
  console.log('pressed:', tag, '→', JSON.stringify(p.label).slice(0, 60));
  await sleep(900);
}

// ---------------------------------------------------------------------------
async function connect() {
  ws = new WS(target.webSocketDebuggerUrl, {
    perMessageDeflate: false,
    headers: { Origin: 'http://127.0.0.1:8081' },
  });
  ws.on('message', (data) => onMessage(data));
  await new Promise((resolve, reject) => {
    ws.on('open', resolve);
    ws.on('error', (e) => reject(new Error('ws error: ' + (e.message ?? 'unknown'))));
  });
  await send('Runtime.enable');
}

async function probeMode() {
  await connect();
  const info = await evalJson(`JSON.stringify({
    hasHook: !!globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__,
    renderers: [...(globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__?.renderers?.keys?.() ?? [])],
    hermes: !!globalThis.HermesInternal,
  })`);
  console.log('probe:', JSON.stringify(info));
  const tree = await dumpState('probe');
  console.log('pressables:', tree.pressables.length, 'a11y:', tree.a11y.length);
  console.log('labels:', tree.pressables.map((p) => `[${p.role}] ${p.label}`).join('\n  '));
  ws.close();
  process.exit(0);
}

async function driveMode() {
  await connect();

  // Step 1: launch state = Today
  let tree = await dumpState('01-launch-today');
  shot('01-launch-today');

  // AC1: primary navigation to Progress
  await pressByLabel(tree, (l) => l === 'Progress', 'tab-progress');
  tree = await dumpState('02-progress');
  shot('02-progress');

  // AC2: Settings reachable from Progress
  await pressByLabel(tree, (l) => l === 'Open Settings', 'open-settings-from-progress');
  tree = await dumpState('03-settings-from-progress');
  shot('03-settings-from-progress');
  const backLabel = findPressable(tree, () => true) && tree.pressables
    .map((p) => p.label).find((l) => l && l.startsWith('Back to'));
  console.log('settings back label (expect Back to Progress):', backLabel);

  // Return path: back to Progress
  await pressByLabel(tree, (l) => l === 'Back to Progress', 'back-to-progress');
  tree = await dumpState('04-back-on-progress');
  shot('04-back-on-progress');

  // AC2: Settings reachable from Today
  await pressByLabel(tree, (l) => l === 'Today', 'tab-today');
  tree = await dumpState('05-back-on-today');
  await pressByLabel(tree, (l) => l === 'Open Settings', 'open-settings-from-today');
  tree = await dumpState('06-settings-from-today');
  shot('06-settings-from-today');

  // AC3: goal destination
  await pressByLabel(tree, (l) => l && l.startsWith('Daily step goal.'), 'goal-row');
  tree = await dumpState('07-goal-destination');
  shot('07-goal-destination');
  await pressByLabel(tree, (l) => l === 'Back to Settings', 'back-to-settings');
  tree = await dumpState('08-settings-again');

  // AC3+AC4: language destination, switch to Vietnamese
  await pressByLabel(tree, (l) => l && l.startsWith('Language.'), 'language-row');
  tree = await dumpState('09-language-destination');
  shot('09-language-destination');
  await pressByLabel(tree, (l) => l === 'Tiếng Việt', 'vi-option');
  tree = await dumpState('10-language-vietnamese');
  shot('10-language-vietnamese');

  // Vietnamese: health destination
  await pressByLabel(tree, (l) => l === 'Quay lại Cài đặt', 'back-to-settings-vi');
  tree = await dumpState('11-settings-vi');
  await pressByLabel(tree, (l) => l && l.startsWith('Quyền truy cập Sức khỏe'), 'health-row-vi');
  tree = await dumpState('12-health-vietnamese');
  shot('12-health-vietnamese');

  // Vietnamese: clear-data confirmation preview (native Alert)
  await pressByLabel(tree, (l) => l === 'Quay lại Cài đặt', 'back-to-settings-vi2');
  tree = await dumpState('13-settings-vi2');
  await pressByLabel(tree, (l) => l && l.startsWith('Xóa dữ liệu ứng dụng'), 'clear-data-row-vi');
  await sleep(1200);
  shot('14-clear-data-preview-vi');
  await dumpState('15-clear-preview-behind-alert');

  // Native Alert buttons are not in the React tree; relaunch resets the
  // temporary language (documented phase behaviour) and dismisses the alert.
  ws.close();
  execSync('xcrun simctl terminate booted com.anonymous.dayli-step-tracker || true');
  await sleep(1200);
  execSync('xcrun simctl launch booted com.anonymous.dayli-step-tracker');
  await sleep(9000);
  shot('16-relaunch-today-english');

  console.log('DRIVE COMPLETE');
  process.exit(0);
}

(MODE === 'drive' ? driveMode : probeMode)().catch((e) => {
  console.error('FATAL:', e.message);
  try { ws && ws.close(); } catch {}
  process.exit(1);
});
