'use strict';
/* ================= 测试基座（角色 A 独占） =================
 * 解析壳 index.html 中 <script src="src/..."> 的顺序，按序读取 src/*.js 并拼接为
 * 一段脚本，在 vm sandbox（document/Image/Matter/localStorage 桩）中执行。
 * 供 tests/smoke.cjs 与各 tests/feat-*.cjs 复用；暴露 boot() 与常用句柄。
 */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const ROOT = path.resolve(__dirname, '..');

/* 读壳 → 抓本地脚本链 → 拼接源码。srcs 顺序即浏览器加载顺序（契约之一）。 */
function concatSource() {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const srcs = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)]
    .map(m => m[1])
    .filter(s => /^src\/[\w.-]+\.js$/.test(s));
  if (!srcs.length) throw new Error('index.html 壳中未找到 src/*.js 脚本链');
  const code = srcs.map(s => {
    const p = path.join(ROOT, s);
    if (!fs.existsSync(p)) throw new Error('脚本链引用了不存在的文件: ' + s);
    return fs.readFileSync(p, 'utf8');
  }).join('\n;\n');
  return { html, srcs, code };
}

/* 与原 smoke.cjs 完全一致的环境桩；额外把 drawCalls/listeners/elements 挂到 sandbox 上 */
function makeSandbox() {
  const { code } = concatSource();
  const drawCalls = [];
  const context = new Proxy({}, { get: (_, key) => key === 'drawImage' ? ((image) => drawCalls.push(image.src)) : key === 'createLinearGradient' ? (() => ({ addColorStop() { } })) : (() => { }), set: () => true });
  const listeners = new Map();
  const elements = new Map();
  function element(id) {
    return {
      style: {}, dataset: {}, textContent: '', innerHTML: '',
      classList: { _s: new Set(), add(c) { this._s.add(c) }, remove(c) { this._s.delete(c) }, contains(c) { return this._s.has(c) } },
      addEventListener(type, fn) { listeners.set(id + '|' + type, fn) }, appendChild() { }, remove() { },
      querySelectorAll() { return [element(), element(), element()] }, getContext() { return context },
      getBoundingClientRect() { return { left: 0, top: 0, width: 1280, height: 720 } },
      setPointerCapture() { }, dispatchEvent() { return true }
    };
  }
  const sandbox = {
    console, Math, Map, Set, Promise, performance, innerWidth: 1280, innerHeight: 720, devicePixelRatio: 1,
    Matter: require('../vendor/matter.min.js'),
    localStorage: { getItem() { return null }, setItem() { } },
    document: {
      querySelector(id) { if (!elements.has(id)) elements.set(id, element(id)); return elements.get(id) },
      createElement: element, body: element('#body'), addEventListener() { }
    },
    Image: class {
      set src(value) { assert.ok(fs.existsSync(path.join(ROOT, value)), value); this._src = value; this.complete = true; this.naturalWidth = 512; this.naturalHeight = 512; queueMicrotask(() => { if (typeof this.onload === 'function') this.onload() }) }
      get src() { return this._src }
    },
    requestAnimationFrame() { }, setTimeout() { }, addEventListener() { },
    __listeners: listeners, __drawCalls: drawCalls, __elements: elements, __source: code
  };
  sandbox.window = sandbox;
  return sandbox;
}

/* 建 sandbox 并执行拼接后的游戏脚本；返回 vm.createContext 后的 context 本身，
 * 并挂 sandbox 自引用，兼容两种消费方式（勿删，B/C 测试两种写法都可能出现）：
 *   const ctx = boot(); vm.runInContext(断言代码, ctx)          —— 直接当 context 用
 *   const { sandbox } = boot(); harness.run(sandbox, 断言代码)  —— 解构用法
 * 元信息句柄挂在 context 上：__source（拼接源码）/__html/__srcs/__listeners/__drawCalls 等。
 * 资源预载走 queueMicrotask，断言前需先 await harness.tick()。 */
function boot() {
  const { code, html, srcs } = concatSource();
  const sandbox = makeSandbox();
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  sandbox.__html = html; sandbox.__srcs = srcs; sandbox.sandbox = sandbox;
  return sandbox;
}
function tick() { return new Promise(resolve => setImmediate(resolve)) }

/* 在已 boot 的 sandbox 中执行一段断言代码（与原 smoke 的 runInContext 用法一致） */
function run(sandbox, code) { return vm.runInContext(code, sandbox) }

/* 常用工具：从拼接源码里按名字截函数体（字符串级断言用） */
function cutFn(src, name) { const i = src.indexOf(name); return i < 0 ? '' : src.slice(i, src.indexOf('\n}', i) + 2) }

module.exports = { ROOT, concatSource, makeSandbox, boot, tick, run, cutFn };
