// Compiles a dart2wasm-generated main module from `source` which can then
// be instantiated via the `instantiate` method.
//
// `source` needs to be a `Response` object (or promise thereof) e.g. created
// via the `fetch()` JS API.
export async function compileStreaming(source) {
  const builtins = {builtins: ['js-string']};
  return new CompiledApp(
      await WebAssembly.compileStreaming(source, builtins), builtins);
}

// Compiles a dart2wasm-generated wasm module from `bytes` which is then
// instantiable via the `instantiate` method.
export async function compile(bytes) {
  const builtins = {builtins: ['js-string']};
  return new CompiledApp(await WebAssembly.compile(bytes, builtins), builtins);
}

class CompiledApp {
  constructor(module, builtins) {
    this.module = module;
    this.builtins = builtins;
  }

  // The second argument is an options object containing:
  // `loadDeferredModules` is a JS function that takes an array of module names
  //   matching wasm files produced by the dart2wasm compiler. It also takes a
  //   callback that should be invoked for each loaded module with 2 arguments:
  //   (1) the module name, (2) the loaded module in a format supported by
  //   `WebAssembly.compile` or `WebAssembly.compileStreaming`. The callback
  //   returns a Promise that resolves when the module is instantiated.
  //   loadDeferredModules should return a Promise that resolves when all the
  //   modules have been loaded and the callback promises have resolved.
  // `loadDeferredId` is a JS function that takes load ID produced by the
  //   compiler when the `use-load-ids` option is passed. Each load ID maps to
  //   one or more wasm files as specified in the emitted JSON file. It also
  //   takes a callback that should be invoked for each loaded module with 2
  //   arguments: (1) the module name, (2) the loaded module in a format
  //   supported by `WebAssembly.compile` or `WebAssembly.compileStreaming`.
  //   The callback returns a Promise that resolves when the module is
  //   instantiated.
  //   loadDeferredId should return a Promise that resolves when all the
  //   modules have been loaded and the callback promises have resolved.
  async instantiate(additionalImports, {loadDeferredModules, loadDeferredId} = {}) {
    let dartInstance;

    // Prints to the console
    function printToConsole(value) {
      if (typeof dartPrint == "function") {
        dartPrint(value);
        return;
      }
      if (typeof console == "object" && typeof console.log != "undefined") {
        console.log(value);
        return;
      }
      if (typeof print == "function") {
        print(value);
        return;
      }

      throw "Unable to print message: " + value;
    }

    // A special symbol attached to functions that wrap Dart functions.
    const jsWrappedDartFunctionSymbol = Symbol("JSWrappedDartFunction");

    function finalizeWrapper(dartFunction, wrapped) {
      wrapped.dartFunction = dartFunction;
      wrapped[jsWrappedDartFunctionSymbol] = true;
      return wrapped;
    }

    // Imports
    const dart2wasm = {
            AB: x0 => new Int16Array(x0),
      AC: (o, start, length) => new Uint8ClampedArray(o.buffer, o.byteOffset + start, length),
      AD: x0 => x0.screen,
      AE: x0 => new ResizeObserver(x0),
      AF: x0 => x0.key,
      AG: x0 => x0.pathname,
      AH: (x0,x1,x2,x3) => x0.initEvent(x1,x2,x3),
      AI: x0 => x0.offsetWidth,
      AJ: x0 => x0.buffer,
      AK: x0 => x0.abort(),
      AL: x0 => x0.call(),
      AM: (x0,x1) => x0.index(x1),
      AN: (x0,x1) => { x0.pointerEvents = x1 },
      AO: x0 => x0.type,
      AP: (x0,x1,x2,x3) => x0.open(x1,x2,x3),
      AQ: x0 => x0.reset,
      AR: x0 => x0.topRight,
      AS: (x0,x1) => { x0.type = x1 },
      B: s => printToConsole(s),
      BB: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const getValue = dartInstance.exports.$wasmI16ArrayGet;
        for (let i = 0; i < length; i++) {
          jsArray[jsArrayOffset + i] = getValue(wasmArray, wasmArrayOffset + i);
        }
      },
      BC: (o, start, length) => new Uint8Array(o.buffer, o.byteOffset + start, length),
      BD: o => {
        if (o === null || o === undefined) return 0;
        if (typeof(o) === 'string') return 1;
        return 2;
      },
      BE: (x0,x1) => x0.getPropertyValue(x1),
      BF: x0 => x0.identifier,
      BG: x0 => x0.parentElement,
      BH: x0 => x0.readText(),
      BI: x0 => x0.stopPropagation(),
      BJ: (x0,x1) => x0.sqlite3_errstr(x1),
      BK: x0 => x0.commit(),
      BL: x0 => x0.instance,
      BM: x0 => x0.openKeyCursor(),
      BN: (x0,x1) => { x0.height = x1 },
      BO: x0 => x0.response,
      BP: (x0,x1) => x0.key(x1),
      BQ: x0 => x0.stopContinuousDecode,
      BR: x0 => x0.topLeft,
      BS: x0 => x0.length,
      C: Function.prototype.call.bind(Number.prototype.toString),
      CB: x0 => new Uint16Array(x0),
      CC: (o, start, length) => new Int8Array(o.buffer, o.byteOffset + start, length),
      CD: x0 => x0.tabIndex,
      CE: x0 => globalThis.parseFloat(x0),
      CF: x0 => x0.touches,
      CG: (x0,x1) => x0.querySelectorAll(x1),
      CH: x0 => x0.clipboard,
      CI: x0 => x0.disabled,
      CJ: (x0,x1) => x0.sqlite3_errmsg(x1),
      CK: (wasmFunction,f) => finalizeWrapper(f, function() { return wasmFunction(f,arguments.length) }),
      CL: (x0,x1,x2) => x0.instantiateStreaming(x1,x2),
      CM: x0 => x0.primaryKey,
      CN: (x0,x1) => { x0.width = x1 },
      CO: (x0,x1) => { x0.responseType = x1 },
      CP: x0 => x0.length,
      CQ: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1) { return wasmFunction(f,arguments.length,x0,x1) }),
      CR: x0 => x0.position,
      CS: x0 => x0.getReader(),
      D: Function.prototype.call.bind(BigInt.prototype.toString),
      DB: x0 => new Int32Array(x0),
      DC: (x0,x1) => x0.querySelector(x1),
      DD: (x0,x1) => x0.contains(x1),
      DE: (x0,x1) => x0.getComputedStyle(x1),
      DF: x0 => x0.pressure,
      DG: (x0,x1) => x0.requestAnimationFrame(x1),
      DH: (x0,x1) => x0.writeText(x1),
      DI: (x0,x1) => { x0.min = x1 },
      DJ: (x0,x1) => x0.sqlite3_error_offset(x1),
      DK: (wasmFunction,f) => finalizeWrapper(f, function() { return wasmFunction(f,arguments.length) }),
      DL: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      DM: (x0,x1,x2) => x0.open(x1,x2),
      DN: x0 => x0.style,
      DO: x0 => x0.vendor,
      DP: (x0,x1) => x0.canShare(x1),
      DQ: (x0,x1,x2,x3) => x0.call(x1,x2,x3),
      DR: x0 => x0.isValid,
      DS: x0 => x0.value,
      E: (exn) => {
        let stackString = exn.toString();
        let frames = stackString.split('\n');
        let drop = 4;
        if (frames[0].startsWith('Error')) {
            drop += 1;
        }
        return frames.slice(drop).join('\n');
      },
      EB: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const getValue = dartInstance.exports.$wasmI32ArrayGet;
        for (let i = 0; i < length; i++) {
          jsArray[jsArrayOffset + i] = getValue(wasmArray, wasmArrayOffset + i);
        }
      },
      EC: (x0,x1) => x0.item(x1),
      ED: x0 => x0.activeElement,
      EE: x0 => x0.documentElement,
      EF: x0 => x0.tiltY,
      EG: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      EH: x0 => x0.unlock(),
      EI: (x0,x1) => { x0.max = x1 },
      EJ: (x0,x1) => x0.sqlite3_extended_errcode(x1),
      EK: (x0,x1) => { x0.onerror = x1 },
      EL: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1) { return wasmFunction(f,arguments.length,x0,x1) }),
      EM: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      EN: (x0,x1) => { x0.src = x1 },
      EO: x0 => x0.navigator,
      EP: (x0,x1) => x0.share(x1),
      EQ: x0 => x0.text,
      ER: (x0,x1,x2,x3) => ({formats: x0,tryHarder: x1,tryRotate: x2,tryInvert: x3}),
      ES: x0 => x0.done,
      F: () => new Error().stack,
      FB: x0 => new Uint32Array(x0),
      FC: x0 => x0.length,
      FD: x0 => x0.parentNode,
      FE: x0 => x0.computedStyleMap(),
      FF: x0 => x0.tiltX,
      FG: x0 => x0.now(),
      FH: (x0,x1) => x0.lock(x1),
      FI: (x0,x1) => { x0.disabled = x1 },
      FJ: (x0,x1) => x0.sqlite3_step(x1),
      FK: x0 => new DOMException(x0),
      FL: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1,x2,x3,x4) { return wasmFunction(f,arguments.length,x0,x1,x2,x3,x4) }),
      FM: (x0,x1) => { x0.onupgradeneeded = x1 },
      FN: () => globalThis.document,
      FO: () => globalThis.window,
      FP: x0 => x0.message,
      FQ: x0 => x0.barcodeFormat,
      FR: (x0,x1,x2) => ({tryHarder: x0,tryRotate: x1,tryInvert: x2}),
      FS: x0 => x0.read(),
      G: s => JSON.stringify(s),
      GB: x0 => new Float32Array(x0),
      GC: (x0,x1) => x0.querySelectorAll(x1),
      GD: x0 => x0.tagName,
      GE: (x0,x1) => x0.get(x1),
      GF: x0 => x0.pointerType,
      GG: x0 => x0.performance,
      GH: x0 => x0.orientation,
      GI: (x0,x1) => { x0.scrollLeft = x1 },
      GJ: (x0,x1,x2,x3,x4) => x0.dart_sqlite3_bind_blob(x1,x2,x3,x4),
      GK: x0 => x0.error,
      GL: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1,x2) { return wasmFunction(f,arguments.length,x0,x1,x2) }),
      GM: x0 => ({autoIncrement: x0}),
      GN: x0 => x0.src,
      GO: (x0,x1) => x0.get(x1),
      GP: (x0,x1) => ({files: x0,text: x1}),
      GQ: x0 => x0.rawBytes,
      GR: () => globalThis.ZXingWASM,
      GS: (x0,x1) => new OffscreenCanvas(x0,x1),
      H: Function.prototype.call.bind(Number.prototype.toString),
      HB: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const getValue = dartInstance.exports.$wasmF32ArrayGet;
        for (let i = 0; i < length; i++) {
          jsArray[jsArrayOffset + i] = getValue(wasmArray, wasmArrayOffset + i);
        }
      },
      HC: (x0,x1) => x0.getAttribute(x1),
      HD: x0 => x0.target,
      HE: (o, p) => p in o,
      HF: x0 => x0.pointerId,
      HG: (d, digits) => d.toFixed(digits),
      HH: (x0,x1) => x0.querySelector(x1),
      HI: (x0,x1) => { x0.spellcheck = x1 },
      HJ: (x0,x1) => x0.dart_sqlite3_malloc(x1),
      HK: (x0,x1) => { x0.onabort = x1 },
      HL: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1,x2,x3) { return wasmFunction(f,arguments.length,x0,x1,x2,x3) }),
      HM: (x0,x1,x2) => x0.createObjectStore(x1,x2),
      HN: (x0,x1) => x0.revokeObjectURL(x1),
      HO: x0 => x0.body,
      HP: x0 => ({files: x0}),
      HQ: x0 => x0.y,
      HR: (x0,x1) => { x0.height = x1 },
      HS: x0 => x0.assetBase,
      I: Function.prototype.call.bind(String.prototype.indexOf),
      IB: x0 => new Float64Array(x0),
      IC: x0 => x0.remove(),
      ID: x0 => x0.clientY,
      IE: (x0,x1) => { x0.textContent = x1 },
      IF: x0 => x0.getCoalescedEvents(),
      IG: x0 => x0.maxHeight,
      IH: (x0,x1) => { x0.title = x1 },
      II: (x0,x1) => { x0.disabled = x1 },
      IJ: (x0,x1,x2,x3,x4) => x0.dart_sqlite3_bind_text(x1,x2,x3,x4),
      IK: (x0,x1) => { x0.oncomplete = x1 },
      IL: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1,x2,x3) { return wasmFunction(f,arguments.length,x0,x1,x2,x3) }),
      IM: x0 => ({unique: x0}),
      IN: (x0,x1) => { x0.src = x1 },
      IO: x0 => x0.headers,
      IP: x0 => ({text: x0}),
      IQ: x0 => x0.x,
      IR: (x0,x1) => { x0.width = x1 },
      IS: x0 => x0.loader,
      J: (s, p, i) => s.lastIndexOf(p, i),
      JB: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const getValue = dartInstance.exports.$wasmF64ArrayGet;
        for (let i = 0; i < length; i++) {
          jsArray[jsArrayOffset + i] = getValue(wasmArray, wasmArrayOffset + i);
        }
      },
      JC: (x0,x1) => x0.appendChild(x1),
      JD: x0 => x0.clientX,
      JE: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      JF: (x0,x1) => x0.getModifierState(x1),
      JG: x0 => x0.maxWidth,
      JH: (x0,x1) => x0.vibrate(x1),
      JI: (x0,x1) => x0.getRandomValues(x1),
      JJ: (x0,x1,x2,x3) => x0.sqlite3_bind_double(x1,x2,x3),
      JK: (x0,x1) => x0.objectStore(x1),
      JL: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1,x2) { return wasmFunction(f,arguments.length,x0,x1,x2) }),
      JM: (x0,x1,x2,x3) => x0.createIndex(x1,x2,x3),
      JN: (x0,x1,x2,x3,x4) => globalThis.createImageBitmap(x0,x1,x2,x3,x4),
      JO: (x0,x1) => x0.getItem(x1),
      JP: (x0,x1) => { x0.transform = x1 },
      JQ: x0 => x0.resultPoints,
      JR: x0 => x0.height,
      JS: () => globalThis._flutter,
      K: (exn) => {
        if (exn instanceof Error) {
          return exn.stack;
        } else {
          return null;
        }
      },
      KB: x0 => new ArrayBuffer(x0),
      KC: (x0,x1) => x0.append(x1),
      KD: (x0,x1,x2) => x0.setAttribute(x1,x2),
      KE: x0 => x0.matches,
      KF: s => s.trimLeft(),
      KG: x0 => x0.minHeight,
      KH: x0 => x0.arrayBuffer(),
      KI: () => globalThis.crypto,
      KJ: (x0,x1,x2,x3) => x0.sqlite3_bind_int64(x1,x2,x3),
      KK: (x0,x1) => globalThis.Atomics.load(x0,x1),
      KL: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1) { return wasmFunction(f,arguments.length,x0,x1) }),
      KM: (x0,x1) => x0.createObjectStore(x1),
      KN: x0 => x0.naturalHeight,
      KO: x0 => x0.localStorage,
      KP: x0 => x0.style,
      KQ: x0 => x0.message,
      KR: x0 => x0.width,
      L: o => o === undefined,
      LB: (x0,x1,x2) => new Uint8Array(x0,x1,x2),
      LC: (x0,x1,x2,x3) => x0.setProperty(x1,x2,x3),
      LD: x0 => x0.getBoundingClientRect(),
      LE: (x0,x1) => x0.matchMedia(x1),
      LF: (x0,x1) => x0[x1],
      LG: x0 => x0.minWidth,
      LH: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof ArrayBuffer) return 1;
        if (globalThis.SharedArrayBuffer !== undefined &&
            o instanceof SharedArrayBuffer) {
          return 2;
        }
        return 3;
      },
      LI: l => new DataView(new ArrayBuffer(l)),
      LJ: x0 => globalThis.BigInt(x0),
      LK: (x0,x1,x2) => globalThis.Atomics.wait(x0,x1,x2),
      LL: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1) { return wasmFunction(f,arguments.length,x0,x1) }),
      LM: x0 => x0.oldVersion,
      LN: x0 => x0.naturalWidth,
      LO: (x0,x1,x2,x3) => x0.replaceState(x1,x2,x3),
      LP: x0 => x0.getVideoTracks(),
      LQ: x0 => x0.videoElement,
      LR: (x0,x1) => { x0.srcObject = x1 },
      M: o => String(o),
      MB: (x0,x1,x2) => new DataView(x0,x1,x2),
      MC: x0 => x0.style,
      MD: (ms, c) =>
      setTimeout(() => dartInstance.exports.$invokeCallback(c),ms),
      ME: x0 => x0.matches,
      MF: x0 => x0.index,
      MG: (x0,x1) => x0.removeProperty(x1),
      MH: x0 => x0.status,
      MI: (a, i) => a.splice(i, 1),
      MJ: (x0,x1,x2) => x0.sqlite3_bind_null(x1,x2),
      MK: (x0,x1,x2) => globalThis.Atomics.notify(x0,x1,x2),
      ML: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      MM: () => globalThis.indexedDB,
      MN: x0 => x0.decode(),
      MO: x0 => x0.history,
      MP: x0 => x0.getSettings(),
      MQ: x0 => x0.decodeContinuously,
      MR: x0 => ({willReadFrequently: x0}),
      N: (c) =>
      queueMicrotask(() => dartInstance.exports.$invokeCallback(c)),
      NB: (o, p) => o[p],
      NC: x0 => x0.debugShowSemanticsNodes,
      ND: s => new Date(s * 1000).getTimezoneOffset() * 60,
      NE: o => typeof o === 'function' && o[jsWrappedDartFunctionSymbol] === true,
      NF: s => s.toUpperCase(),
      NG: (x0,x1) => x0.add(x1),
      NH: (x0,x1) => x0.fetch(x1),
      NI: a => a.pop(),
      NJ: (x0,x1) => x0.sqlite3_bind_parameter_count(x1),
      NK: (x0,x1,x2) => globalThis.Atomics.store(x0,x1,x2),
      NL: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1,x2,x3) { return wasmFunction(f,arguments.length,x0,x1,x2,x3) }),
      NM: (x0,x1) => ({name: x0,length: x1}),
      NN: (x0,x1) => { x0.decoding = x1 },
      NO: x0 => x0.href,
      NP: x0 => x0.facingMode,
      NQ: (x0,x1) => new ZXing.BrowserMultiFormatReader(x0,x1),
      NR: (x0,x1,x2) => x0.getContext(x1,x2),
      O: (x0,x1) => x0.didCreateEngineInitializer(x1),
      OB: (o) => new DataView(o.buffer, o.byteOffset, o.byteLength),
      OC: o => o,
      OD: Date.now,
      OE: f => f.dartFunction,
      OF: x0 => x0.pop(),
      OG: x0 => x0.data,
      OH: x0 => x0.content,
      OI: (map, o, v) => map.set(o, v),
      OJ: (x0,x1) => x0.sqlite3_stmt_isexplain(x1),
      OK: x0 => new Worker(x0),
      OL: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1,x2,x3) { return wasmFunction(f,arguments.length,x0,x1,x2,x3) }),
      OM: (x0,x1) => x0.update(x1),
      ON: (x0,x1) => { x0.crossOrigin = x1 },
      OO: x0 => x0.location,
      OP: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      OQ: (x0,x1) => ({width: x0,height: x1}),
      OR: () => new BarcodeDetector(),
      P: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      PB: Function.prototype.call.bind(Object.getOwnPropertyDescriptor(DataView.prototype, 'byteLength').get),
      PC: o => {
        if (o === undefined || o === null) return 0;
        if (typeof o === 'boolean') return 1;
        return 2;
      },
      PD: (handle) => clearTimeout(handle),
      PE: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      PF: x0 => x0.flags,
      PG: (x0,x1) => { x0.scrollTop = x1 },
      PH: x0 => x0.document,
      PI: (map, o) => map.get(o),
      PJ: (x0,x1) => x0.dart_sqlite3_free(x1),
      PK: () => globalThis.Uint8Array,
      PL: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1) { return wasmFunction(f,arguments.length,x0,x1) }),
      PM: x0 => x0.name,
      PN: (x0,x1) => x0.createObjectURL(x1),
      PO: (x0,x1) => x0.removeItem(x1),
      PP: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      PQ: (x0,x1,x2) => ({width: x0,height: x1,facingMode: x2}),
      PR: x0 => ({formats: x0}),
      Q: (wasmFunction,f) => finalizeWrapper(f, function() { return wasmFunction(f,arguments.length) }),
      QB: o => o.byteOffset,
      QC: (x0,x1) => x0.warn(x1),
      QD: (x0,x1) => x0.closest(x1),
      QE: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1) { return wasmFunction(f,arguments.length,x0,x1) }),
      QF: (a, s) => a.join(s),
      QG: (x0,x1,x2) => x0.setSelectionRange(x1,x2),
      QH: () => typeof dartUseDateNowForTicks !== "undefined",
      QI: () => new WeakMap(),
      QJ: (x0,x1,x2,x3,x4,x5,x6) => x0.sqlite3_prepare_v3(x1,x2,x3,x4,x5,x6),
      QK: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof DataView) return 1;
        return 2;
      },
      QL: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1) { return wasmFunction(f,arguments.length,x0,x1) }),
      QM: x0 => globalThis.IDBKeyRange.only(x0),
      QN: x0 => x0.URL,
      QO: (x0,x1,x2) => x0.setItem(x1,x2),
      QP: (x0,x1) => x0.append(x1),
      QQ: x0 => x0.facingMode,
      QR: x0 => new BarcodeDetector(x0),
      R: (x0,x1) => ({initializeEngine: x0,autoStart: x1}),
      RB: o => o.buffer,
      RC: x0 => x0.console,
      RD: x0 => x0.bottom,
      RE: (p, s, f) => p.then(s, (e) => f(e, e === undefined)),
      RF: (x0,x1) => x0.error(x1),
      RG: (x0,x1) => { x0.value = x1 },
      RH: () => Date.now(),
      RI: () => new MessageChannel(),
      RJ: (x0,x1,x2,x3,x4,x5) => x0.sqlite3_exec(x1,x2,x3,x4,x5),
      RK: () => globalThis.DataView,
      RL: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1) { return wasmFunction(f,arguments.length,x0,x1) }),
      RM: (x0,x1,x2) => x0.put(x1,x2),
      RN: x0 => new Blob(x0),
      RO: (x0,x1) => new WebSocket(x0,x1),
      RP: (x0,x1) => x0.createElement(x1),
      RQ: x0 => x0.height,
      RR: (x0,x1) => x0.detect(x1),
      S: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1) { return wasmFunction(f,arguments.length,x0,x1) }),
      SB: Function.prototype.call.bind(DataView.prototype.getUint8),
      SC: () => globalThis.window,
      SD: x0 => x0.top,
      SE: (o, i) => o[i],
      SF: () => globalThis.console,
      SG: (x0,x1,x2) => x0.setSelectionRange(x1,x2),
      SH: () => 1000 * performance.now(),
      SI: x0 => new BroadcastChannel(x0),
      SJ: (x0,x1,x2) => x0.sqlite3_column_name(x1,x2),
      SK: x0 => x0.communicationBuffer,
      SL: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1) { return wasmFunction(f,arguments.length,x0,x1) }),
      SM: (x0,x1) => x0.getKey(x1),
      SN: x0 => x0.close(),
      SO: x0 => x0.reason,
      SP: () => globalThis.document,
      SQ: x0 => x0.width,
      SR: x0 => x0.rawValue,
      T: x0 => new Promise(x0),
      TB: (b, o) => new DataView(b, o),
      TC: (o, c) => o instanceof c,
      TD: x0 => x0.right,
      TE: o => o.length,
      TF: s => s.trimRight(),
      TG: (x0,x1) => { x0.value = x1 },
      TH: x0 => new Uint8Array(x0),
      TI: (x0,x1,x2,x3) => x0.addEventListener(x1,x2,x3),
      TJ: (x0,x1,x2) => x0.sqlite3_column_blob(x1,x2),
      TK: () => globalThis.Int32Array,
      TL: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1) { return wasmFunction(f,arguments.length,x0,x1) }),
      TM: (x0,x1) => x0.delete(x1),
      TN: (x0,x1) => ({frameIndex: x0,completeFramesOnly: x1}),
      TO: x0 => x0.code,
      TP: (x0,x1) => { x0.onpause = x1 },
      TQ: x0 => x0.attachStreamToVideo,
      TR: x0 => x0.format,
      U: (x0,x1,x2) => x0.call(x1,x2),
      UB: (b, o, l) => new DataView(b, o, l),
      UC: (x0,x1) => x0.exec(x1),
      UD: x0 => x0.left,
      UE: o => {
        if (o === undefined) return 1;
        var type = typeof o;
        if (type === 'boolean') return 2;
        if (type === 'number') return 3;
        if (type === 'string') return 4;
        if (o instanceof Array) return 5;
        if (ArrayBuffer.isView(o)) {
          if (o instanceof Int8Array) return 6;
          if (o instanceof Uint8Array) return 7;
          if (o instanceof Uint8ClampedArray) return 8;
          if (o instanceof Int16Array) return 9;
          if (o instanceof Uint16Array) return 10;
          if (o instanceof Int32Array) return 11;
          if (o instanceof Uint32Array) return 12;
          if (o instanceof Float32Array) return 13;
          if (o instanceof Float64Array) return 14;
          if (o instanceof DataView) return 15;
        }
        if (o instanceof ArrayBuffer) return 16;
        // Feature check for `SharedArrayBuffer` before doing a type-check.
        if (globalThis.SharedArrayBuffer !== undefined &&
            o instanceof SharedArrayBuffer) {
            return 17;
        }
        if (o instanceof Promise) return 18;
        return 19;
      },
      UF: x0 => x0.blur(),
      UG: s => {
        if (/[[\]{}()*+?.\\^$|]/.test(s)) {
            s = s.replace(/[[\]{}()*+?.\\^$|]/g, '\\$&');
        }
        return s;
      },
      UH: (x0,x1,x2) => x0.slice(x1,x2),
      UI: (x0,x1,x2,x3) => x0.removeEventListener(x1,x2,x3),
      UJ: (x0,x1,x2) => x0.sqlite3_column_bytes(x1,x2),
      UK: x0 => x0.byteLength,
      UL: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1) { return wasmFunction(f,arguments.length,x0,x1) }),
      UM: (x0,x1) => x0.put(x1),
      UN: (x0,x1) => x0.decode(x1),
      UO: (x0,x1,x2) => x0.close(x1,x2),
      UP: (x0,x1) => { x0.onplay = x1 },
      UQ: () => new Map(),
      UR: x0 => x0.y,
      V: (constructor, args) => {
        const factoryFunction = constructor.bind.apply(
            constructor, [null, ...args]);
        return new factoryFunction();
      },
      VB: Function.prototype.call.bind(DataView.prototype.getFloat64),
      VC: x0 => x0.length,
      VD: x0 => x0.clientY,
      VE: x0 => x0.language,
      VF: x0 => x0.button,
      VG: x0 => x0.value,
      VH: (x0,x1) => x0.decode(x1),
      VI: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      VJ: (x0,x1,x2) => x0.sqlite3_column_text(x1,x2),
      VK: x0 => x0.synchronizationBuffer,
      VL: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      VM: (x0,x1,x2) => x0.postMessage(x1,x2),
      VN: x0 => x0.displayHeight,
      VO: (x0,x1) => x0.close(x1),
      VP: (x0,x1) => { x0.controls = x1 },
      VQ: (x0,x1,x2) => x0.set(x1,x2),
      VR: x0 => x0.x,
      W: x0 => new Array(x0),
      WB: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof Float64Array) return 1;
        return 2;
      },
      WC: (x0,x1) => { x0.lastIndex = x1 },
      WD: x0 => x0.clientX,
      WE: (x0,x1,x2,x3) => x0.register(x1,x2,x3),
      WF: x0 => x0.innerHeight,
      WG: x0 => x0.selectionDirection,
      WH: (x0,x1) => x0.adoptText(x1),
      WI: x0 => globalThis.Array.isArray(x0),
      WJ: (x0,x1,x2) => x0.sqlite3_column_double(x1,x2),
      WK: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      WL: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1,x2) { return wasmFunction(f,arguments.length,x0,x1,x2) }),
      WM: x0 => x0.port2,
      WN: x0 => x0.displayWidth,
      WO: x0 => x0.close(),
      WP: (x0,x1) => { x0.pointerEvents = x1 },
      WQ: (x0,x1) => x0.querySelector(x1),
      WR: x0 => x0.cornerPoints,
      X: o => [o],
      XB: Function.prototype.call.bind(DataView.prototype.setFloat64),
      XC: (s, m) => {
        try {
          return new RegExp(s, m);
        } catch (e) {
          return String(e);
        }
      },
      XD: x0 => x0.changedTouches,
      XE: () => globalThis.window.FinalizationRegistry,
      XF: x0 => x0.innerWidth,
      XG: x0 => x0.selectionStart,
      XH: x0 => x0.first(),
      XI: x0 => x0.table,
      XJ: x0 => globalThis.Number(x0),
      XK: (o, p, v) => o[p] = v,
      XL: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      XM: x0 => x0.terminate(),
      XN: x0 => x0.duration,
      XO: (x0,x1) => x0.send(x1),
      XP: (x0,x1) => { x0.transformOrigin = x1 },
      XQ: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      XR: x0 => x0.body,
      Y: (o0, o1) => [o0, o1],
      YB: (t, s) => t.set(s),
      YC: o => o instanceof RegExp,
      YD: x0 => x0.offsetY,
      YE: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      YF: x0 => x0.height,
      YG: x0 => x0.selectionEnd,
      YH: x0 => x0.next(),
      YI: x0 => x0.kind,
      YJ: (x0,x1,x2) => x0.sqlite3_column_int64(x1,x2),
      YK: (x0,x1,x2) => x0.postMessage(x1,x2),
      YL: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      YM: (x0,x1) => new SharedWorker(x0,x1),
      YN: x0 => x0.image,
      YO: x0 => x0.readyState,
      YP: (x0,x1) => { x0.objectFit = x1 },
      YQ: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      YR: x0 => globalThis.URL.revokeObjectURL(x0),
      Z: (o0, o1, o2) => [o0, o1, o2],
      ZB: Function.prototype.call.bind(DataView.prototype.setFloat32),
      ZC: (string, times) => string.repeat(times),
      ZD: x0 => x0.offsetX,
      ZE: x0 => new window.FinalizationRegistry(x0),
      ZF: x0 => x0.width,
      ZG: x0 => x0.value,
      ZH: x0 => x0.current(),
      ZI: x0 => x0.data,
      ZJ: (x0,x1,x2) => x0.sqlite3_column_type(x1,x2),
      ZK: x0 => new SharedArrayBuffer(x0),
      ZL: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      ZM: x0 => x0.start(),
      ZN: (x0,x1,x2,x3,x4) => ({type: x0,data: x1,premultiplyAlpha: x2,colorSpaceConversion: x3,preferAnimation: x4}),
      ZO: (x0,x1) => { x0.binaryType = x1 },
      ZP: (x0,x1) => { x0.width = x1 },
      ZQ: (x0,x1) => x0.appendChild(x1),
      ZR: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      a: (o0, o1, o2, o3) => [o0, o1, o2, o3],
      aB: Function.prototype.call.bind(DataView.prototype.getFloat32),
      aC: x0 => x0.dotAll,
      aD: x0 => x0.type,
      aE: (x0,x1) => x0.unregister(x1),
      aF: x0 => x0.clientHeight,
      aG: x0 => x0.selectionDirection,
      aH: (x0,x1) => new Intl.v8BreakIterator(x0,x1),
      aI: x0 => x0.close(),
      aJ: (x0,x1) => x0.sqlite3_column_count(x1),
      aK: (x0,x1,x2,x3) => ({clientVersion: x0,root: x1,synchronizationBuffer: x2,communicationBuffer: x3}),
      aL: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1,x2,x3,x4) { return wasmFunction(f,arguments.length,x0,x1,x2,x3,x4) }),
      aM: x0 => x0.port,
      aN: x0 => new window.ImageDecoder(x0),
      aO: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      aP: (x0,x1) => { x0.height = x1 },
      aQ: x0 => x0.head,
      aR: (x0,x1,x2,x3) => x0.toBlob(x1,x2,x3),
      b: (x0,x1,x2) => { x0[x1] = x2 },
      bB: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof Float32Array) return 1;
        return 2;
      },
      bC: x0 => x0.unicode,
      bD: x0 => x0.maxTouchPoints,
      bE: (x0,x1) => x0.contains(x1),
      bF: x0 => x0.clientWidth,
      bG: x0 => x0.selectionStart,
      bH: x0 => x0.v8BreakIterator,
      bI: (x0,x1) => x0.postMessage(x1),
      bJ: (x0,x1) => x0.sqlite3_last_insert_rowid(x1),
      bK: x0 => x0.close(),
      bL: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1,x2,x3) { return wasmFunction(f,arguments.length,x0,x1,x2,x3) }),
      bM: x0 => new WeakRef(x0),
      bN: x0 => x0.name,
      bO: (x0,x1) => { x0.onmessage = x1 },
      bP: x0 => x0.getSupportedConstraints(),
      bQ: (x0,x1) => { x0.onerror = x1 },
      bR: x0 => globalThis.URL.createObjectURL(x0),
      c: o => o,
      cB: Function.prototype.call.bind(DataView.prototype.getUint32),
      cC: x0 => x0.ignoreCase,
      cD: x0 => x0.platform,
      cE: (s) => +s,
      cF: (x0,x1) => { x0.content = x1 },
      cG: x0 => x0.selectionEnd,
      cH: () => globalThis.Intl,
      cI: (x0,x1) => ({kind: x0,table: x1}),
      cJ: (x0,x1) => x0.sqlite3_close_v2(x1),
      cK: x0 => x0.getSize(),
      cL: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1,x2,x3) { return wasmFunction(f,arguments.length,x0,x1,x2,x3) }),
      cM: x0 => x0.deref(),
      cN: x0 => x0.repetitionCount,
      cO: x0 => x0.baseURI,
      cP: x0 => ({ideal: x0}),
      cQ: (x0,x1) => x0.removeChild(x1),
      cR: x0 => x0.size,
      d: (o, p) => o[p],
      dB: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof Uint32Array) return 1;
        return 2;
      },
      dC: x0 => x0.multiline,
      dD: x0 => x0.body,
      dE: s => {
        if (!/^\s*[+-]?(?:Infinity|NaN|(?:\.\d+|\d+(?:\.\d*)?)(?:[eE][+-]?\d+)?)\s*$/.test(s)) {
          return NaN;
        }
        return parseFloat(s);
      },
      dF: (x0,x1) => { x0.name = x1 },
      dG: x0 => x0.keyCode,
      dH: (x0,x1) => x0.segment(x1),
      dI: () => {
        return typeof process != "undefined" &&
               Object.prototype.toString.call(process) == "[object process]" &&
               process.platform == "win32"
      },
      dJ: (x0,x1,x2,x3,x4,x5,x6) => x0.dart_sqlite3_create_function_v2(x1,x2,x3,x4,x5,x6),
      dK: (x0,x1) => x0.truncate(x1),
      dL: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1,x2,x3) { return wasmFunction(f,arguments.length,x0,x1,x2,x3) }),
      dM: () => globalThis.WeakRef,
      dN: x0 => x0.frameCount,
      dO: (x0,x1) => x0.transferFromImageBitmap(x1),
      dP: (x0,x1,x2) => ({width: x0,height: x1,deviceId: x2}),
      dQ: (x0,x1) => { x0.onload = x1 },
      dR: (x0,x1,x2,x3,x4,x5) => x0.drawImage(x1,x2,x3,x4,x5),
      e: () => globalThis,
      eB: Function.prototype.call.bind(DataView.prototype.getInt32),
      eC: (string, token) => string.split(token),
      eD: () => globalThis.document,
      eE: s => s.trim(),
      eF: x0 => x0.head,
      eG: (x0,x1) => x0.scrollIntoView(x1),
      eH: x0 => x0.index,
      eI: () => {
        // On browsers return `globalThis.location.href`
        if (globalThis.location != null) {
          return globalThis.location.href;
        }
        return null;
      },
      eJ: (x0,x1,x2,x3) => x0.sqlite3_result_error(x1,x2,x3),
      eK: x0 => ({at: x0}),
      eL: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1) { return wasmFunction(f,arguments.length,x0,x1) }),
      eM: () => new AbortController(),
      eN: x0 => x0.selectedTrack,
      eO: (x0,x1) => x0.getContext(x1),
      eP: x0 => ({video: x0}),
      eQ: (x0,x1) => { x0.src = x1 },
      eR: (x0,x1) => x0.getContext(x1),
      f: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      fB: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof Int32Array) return 1;
        return 2;
      },
      fC: o => o instanceof Array,
      fD: (x0,x1,x2) => x0.addEventListener(x1,x2),
      fE: x0 => x0.classList,
      fF: (x0,x1) => x0.removeChild(x1),
      fG: x0 => x0.multiViewEnabled,
      fH: x0 => x0.next(),
      fI: (o, p) => p in o,
      fJ: (x0,x1,x2) => x0.sqlite3_result_subtype(x1,x2),
      fK: (x0,x1) => x0.write(x1),
      fL: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1) { return wasmFunction(f,arguments.length,x0,x1) }),
      fM: (x0,x1,x2,x3,x4,x5) => ({method: x0,headers: x1,body: x2,credentials: x3,redirect: x4,signal: x5}),
      fN: x0 => x0.completed,
      fO: (x0,x1) => { x0.height = x1 },
      fP: (x0,x1) => ({width: x0,height: x1}),
      fQ: (x0,x1) => { x0.crossOrigin = x1 },
      fR: x0 => x0.height,
      g: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      gB: o => o instanceof Uint16Array,
      gC: (a, i) => a[i],
      gD: x0 => x0.hasFocus(),
      gE: x0 => x0.preventDefault(),
      gF: x0 => x0.firstChild,
      gG: (x0,x1) => x0.replaceWith(x1),
      gH: x0 => x0.value,
      gI: x0 => x0.groups,
      gJ: (x0,x1,x2,x3,x4) => x0.sqlite3_result_blob64(x1,x2,x3,x4),
      gK: (x0,x1,x2) => x0.write(x1,x2),
      gL: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1,x2,x3,x4) { return wasmFunction(f,arguments.length,x0,x1,x2,x3,x4) }),
      gM: (x0,x1) => globalThis.fetch(x0,x1),
      gN: x0 => x0.ready,
      gO: (x0,x1) => { x0.width = x1 },
      gP: (x0,x1,x2) => ({width: x0,height: x1,facingMode: x2}),
      gQ: (x0,x1) => { x0.lang = x1 },
      gR: x0 => x0.width,
      h: (x0,x1) => ({addView: x0,removeView: x1}),
      hB: Function.prototype.call.bind(DataView.prototype.getUint16),
      hC: a => a.length,
      hD: x0 => x0.relatedTarget,
      hE: x0 => x0.parent,
      hF: x0 => x0.viewConstraints,
      hG: (x0,x1) => { x0.type = x1 },
      hH: x0 => x0.done,
      hI: (o, offsetInBytes, lengthInBytes) => {
        var dst = new ArrayBuffer(lengthInBytes);
        new Uint8Array(dst).set(new Uint8Array(o, offsetInBytes, lengthInBytes));
        return new DataView(dst);
      },
      hJ: (x0,x1,x2,x3,x4) => x0.sqlite3_result_text(x1,x2,x3,x4),
      hK: x0 => x0.createSyncAccessHandle(),
      hL: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1) { return wasmFunction(f,arguments.length,x0,x1) }),
      hM: (x0,x1) => x0.get(x1),
      hN: x0 => x0.tracks,
      hO: x0 => x0.height,
      hP: (x0,x1) => x0.getUserMedia(x1),
      hQ: (x0,x1) => { x0.type = x1 },
      hR: x0 => x0.remove(),
      i: (l, r) => l === r,
      iB: o => o instanceof Int16Array,
      iC: (x0,x1) => x0.test(x1),
      iD: x0 => x0.shiftKey,
      iE: x0 => x0.timeStamp,
      iF: x0 => x0.hostElement,
      iG: (x0,x1) => { x0.className = x1 },
      iH: (o, m, a) => o[m].apply(o, a),
      iI: (a, s, e) => a.slice(s, e),
      iJ: (x0,x1,x2) => x0.sqlite3_result_double(x1,x2),
      iK: x0 => ({create: x0}),
      iL: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1) { return wasmFunction(f,arguments.length,x0,x1) }),
      iM: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1,x2) { return wasmFunction(f,arguments.length,x0,x1,x2) }),
      iN: () => globalThis.window.ImageDecoder,
      iO: x0 => x0.width,
      iP: x0 => x0.deviceId,
      iQ: (x0,x1) => { x0.defer = x1 },
      iR: (x0,x1) => { x0.src = x1 },
      j: x0 => x0.random(),
      jB: Function.prototype.call.bind(DataView.prototype.getInt16),
      jC: x0 => x0.userAgent,
      jD: (decoder, codeUnits) => decoder.decode(codeUnits),
      jE: (x0,x1) => x0.hasAttribute(x1),
      jF: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      jG: (x0,x1) => { x0.tabIndex = x1 },
      jH: x0 => x0.iterator,
      jI: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      jJ: (x0,x1,x2) => x0.sqlite3_result_int64(x1,x2),
      jK: (x0,x1,x2) => x0.getFileHandle(x1,x2),
      jL: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1,x2) { return wasmFunction(f,arguments.length,x0,x1,x2) }),
      jM: (x0,x1) => x0.forEach(x1),
      jN: x0 => x0.decode(),
      jO: x0 => x0.rasterEndMilliseconds,
      jP: x0 => x0.getCapabilities(),
      jQ: (x0,x1) => { x0.async = x1 },
      jR: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      k: o => o,
      kB: o => o instanceof Uint8ClampedArray,
      kC: x0 => x0.navigator,
      kD: () => new TextDecoder("utf-8", {fatal: true}),
      kE: x0 => x0.buttons,
      kF: x0 => ({runApp: x0}),
      kG: (x0,x1) => { x0.name = x1 },
      kH: () => globalThis.Symbol,
      kI: (x0,x1) => x0.postMessage(x1),
      kJ: (x0,x1) => x0.sqlite3_result_null(x1),
      kK: x0 => ({create: x0}),
      kL: (x0,x1) => x0.read(x1),
      kM: x0 => x0.name,
      kN: (x0,x1,x2,x3) => x0.open(x1,x2,x3),
      kO: x0 => x0.rasterStartMilliseconds,
      kP: () => ({}),
      kQ: (x0,x1) => { x0.id = x1 },
      kR: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      l: o => {
        if (o === undefined || o === null) return 0;
        if (typeof o === 'number') return 1;
        return 2;
      },
      lB: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof Uint8Array) return 1;
        return 2;
      },
      lC: Function.prototype.call.bind(String.prototype.toLowerCase),
      lD: () => new TextDecoder("utf-8", {fatal: false}),
      lE: x0 => x0.ctrlKey,
      lF: Function.prototype.call.bind(DataView.prototype.getBigInt64),
      lG: (x0,x1) => { x0.placeholder = x1 },
      lH: (x0,x1) => new Intl.Segmenter(x0,x1),
      lI: x0 => x0.close(),
      lJ: (x0,x1) => x0.sqlite3_value_blob(x1),
      lK: (x0,x1,x2) => x0.getDirectoryHandle(x1,x2),
      lL: (x0,x1,x2) => x0.read(x1,x2),
      lM: x0 => x0.statusText,
      lN: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      lO: x0 => x0.imageBitmaps,
      lP: (x0,x1) => x0.applyConstraints(x1),
      lQ: x0 => x0.videoHeight,
      lR: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      m: () => globalThis.Math,
      mB: Function.prototype.call.bind(DataView.prototype.setInt32),
      mC: Object.is,
      mD: (a, i, v) => a[i] = v,
      mE: x0 => x0.y,
      mF: Function.prototype.call.bind(DataView.prototype.setBigInt64),
      mG: (x0,x1) => { x0.autocomplete = x1 },
      mH: x0 => x0.Segmenter,
      mI: (x0,x1) => ({i: x0,p: x1}),
      mJ: (x0,x1) => x0.sqlite3_value_bytes(x1),
      mK: (x0,x1) => new URL(x0,x1),
      mL: x0 => x0.flush(),
      mM: x0 => x0.url,
      mN: (x0,x1,x2) => x0.addEventListener(x1,x2),
      mO: x0 => x0.canvasKitMaximumSurfaces,
      mP: (x0,x1) => { x0.whiteBalanceMode = x1 },
      mQ: x0 => x0.videoWidth,
      mR: (x0,x1) => { x0.oncancel = x1 },
      n: (x0,x1) => x0.prepend(x1),
      nB: Function.prototype.call.bind(DataView.prototype.setUint32),
      nC: x0 => x0.vendor,
      nD: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const setValue = dartInstance.exports.$wasmI8ArraySet;
        for (let i = 0; i < length; i++) {
          setValue(wasmArray, wasmArrayOffset + i, jsArray[jsArrayOffset + i]);
        }
      },
      nE: x0 => x0.x,
      nF: (o, start, length) => new BigInt64Array(o.buffer, o.byteOffset + start, length),
      nG: (x0,x1) => { x0.name = x1 },
      nH: x0 => x0.buffer,
      nI: () => new Array(),
      nJ: (x0,x1) => x0.sqlite3_value_text(x1),
      nK: x0 => x0.pathname,
      nL: () => globalThis.WebAssembly,
      nM: x0 => x0.status,
      nN: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      nO: x0 => x0.nextSibling,
      nP: x0 => x0.whiteBalanceMode,
      nQ: x0 => x0.stream,
      nR: (x0,x1) => { x0.onchange = x1 },
      o: (x0,x1,x2,x3) => x0.addEventListener(x1,x2,x3),
      oB: Function.prototype.call.bind(DataView.prototype.setInt16),
      oC: (x0,x1) => x0.createTextNode(x1),
      oD: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const setValue = dartInstance.exports.$wasmI16ArraySet;
        for (let i = 0; i < length; i++) {
          setValue(wasmArray, wasmArrayOffset + i, jsArray[jsArrayOffset + i]);
        }
      },
      oE: x0 => x0.scrollTop,
      oF: o => o.byteLength,
      oG: (x0,x1) => { x0.placeholder = x1 },
      oH: x0 => x0.wasmMemory,
      oI: (x0,x1) => ({c: x0,r: x1}),
      oJ: (x0,x1) => x0.sqlite3_value_double(x1),
      oK: x0 => x0.getDirectory(),
      oL: x0 => x0.href,
      oM: x0 => x0.getReader(),
      oN: x0 => x0.send(),
      oO: (x0,x1) => x0.debug(x1),
      oP: (x0,x1) => { x0.exposureMode = x1 },
      oQ: x0 => x0.play(),
      oR: x0 => x0.type,
      p: b => !!b,
      pB: Function.prototype.call.bind(DataView.prototype.setUint16),
      pC: (x0,x1) => { x0.id = x1 },
      pD: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const setValue = dartInstance.exports.$wasmI32ArraySet;
        for (let i = 0; i < length; i++) {
          setValue(wasmArray, wasmArrayOffset + i, jsArray[jsArrayOffset + i]);
        }
      },
      pE: x0 => x0.offsetTop,
      pF: (x0,x1,x2,x3) => x0.pushState(x1,x2,x3),
      pG: (x0,x1) => { x0.action = x1 },
      pH: () => globalThis.window._flutter_skwasmInstance,
      pI: (x0,x1) => { x0.onmessage = x1 },
      pJ: (x0,x1) => x0.sqlite3_value_int64(x1),
      pK: x0 => x0.storage,
      pL: (x0,x1) => x0.openCursor(x1),
      pM: x0 => x0.read(),
      pN: x0 => x0.status,
      pO: x0 => x0.hostElement,
      pP: x0 => x0.exposureMode,
      pQ: x0 => x0.paused,
      pR: x0 => x0.lastModified,
      q: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      qB: Function.prototype.call.bind(DataView.prototype.setUint8),
      qC: (x0,x1) => { x0.nonce = x1 },
      qD: x0 => x0.visibilityState,
      qE: x0 => x0.scrollLeft,
      qF: x0 => x0.history,
      qG: (x0,x1) => { x0.method = x1 },
      qH: () => new TextDecoder(),
      qI: (o, a) => o == a,
      qJ: (x0,x1) => x0.sqlite3_value_type(x1),
      qK: () => globalThis.navigator,
      qL: x0 => x0.arrayBuffer(),
      qM: x0 => x0.value,
      qN: x0 => x0.response,
      qO: x0 => x0.location,
      qP: (x0,x1) => { x0.focusMode = x1 },
      qQ: (x0,x1,x2,x3) => x0.drawImage(x1,x2,x3),
      qR: x0 => x0.name,
      r: (x0,x1) => x0.focus(x1),
      rB: Function.prototype.call.bind(DataView.prototype.setInt8),
      rC: x0 => x0.nonce,
      rD: (x0,x1,x2) => x0.removeEventListener(x1,x2),
      rE: x0 => x0.offsetLeft,
      rF: (x0,x1,x2,x3) => x0.replaceState(x1,x2,x3),
      rG: (x0,x1) => { x0.noValidate = x1 },
      rH: x0 => x0.debugSkipFontRetryDelay,
      rI: (o, t) => typeof o === t,
      rJ: (x0,x1,x2) => x0.sqlite3_extended_result_codes(x1,x2),
      rK: (x0,x1) => globalThis.fetch(x0,x1),
      rL: () => globalThis.Blob,
      rM: x0 => x0.done,
      rN: (x0,x1,x2) => x0.setRequestHeader(x1,x2),
      rO: (x0,x1) => x0.getModifierState(x1),
      rP: x0 => x0.focusMode,
      rQ: (x0,x1,x2,x3,x4) => x0.getImageData(x1,x2,x3,x4),
      rR: (x0,x1) => x0.item(x1),
      s: () => ({}),
      sB: Function.prototype.call.bind(DataView.prototype.getInt8),
      sC: () => globalThis.window.flutterConfiguration,
      sD: x0 => x0.disconnect(),
      sE: x0 => x0.offsetParent,
      sF: o => {
        const proto = Object.getPrototypeOf(o);
        return proto === Object.prototype || proto === null;
      },
      sG: (x0,x1) => x0.removeAttribute(x1),
      sH: (x0,x1,x2) => x0.set(x1,x2),
      sI: x0 => x0.r,
      sJ: (x0,x1,x2,x3,x4) => x0.sqlite3_open_v2(x1,x2,x3,x4),
      sK: (x0,x1) => x0.sqlite3session_delete(x1),
      sL: x0 => x0.value,
      sM: x0 => x0.cancel(),
      sN: (x0,x1) => { x0.responseType = x1 },
      sO: x0 => x0.metaKey,
      sP: x0 => x0.enumerateDevices(),
      sQ: (x0,x1,x2) => x0.readBarcodes(x1,x2),
      sR: x0 => x0.length,
      t: (o, p, v) => o[p] = v,
      tB: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof Int8Array) return 1;
        return 2;
      },
      tC: (x0,x1) => x0.attachShadow(x1),
      tD: x0 => new Intl.Locale(x0),
      tE: (o, p, r) => o.replace(p, () => r),
      tF: o => Object.keys(o),
      tG: x0 => x0.isConnected,
      tH: x0 => x0.fontFallbackBaseUrl,
      tI: x0 => x0.c,
      tJ: x0 => x0.sqlite3_initialize(),
      tK: (x0,x1,x2,x3) => x0.register(x1,x2,x3),
      tL: x0 => x0.key,
      tM: x0 => x0.body,
      tN: () => new XMLHttpRequest(),
      tO: x0 => x0.altKey,
      tP: x0 => x0.deviceId,
      tQ: x0 => x0.text,
      tR: x0 => x0.files,
      u: () => [],
      uB: (o, start, length) => new Float64Array(o.buffer, o.byteOffset + start, length),
      uC: (x0,x1) => x0.createElement(x1),
      uD: x0 => x0.region,
      uE: (o, p, r) => o.replaceAll(p, () => r),
      uF: x0 => x0.state,
      uG: x0 => x0.click(),
      uH: (handle) => clearInterval(handle),
      uI: x0 => x0.p,
      uJ: (x0,x1,x2,x3) => x0.dart_sqlite3_register_vfs(x1,x2,x3),
      uK: (x0,x1) => x0.unregister(x1),
      uL: x0 => x0.continue(),
      uM: x0 => x0.headers,
      uN: () => new FileReader(),
      uO: x0 => x0.ctrlKey,
      uP: x0 => x0.kind,
      uQ: x0 => x0.format,
      uR: x0 => x0.target,
      v: (a, i) => a.push(i),
      vB: (o, start, length) => new Float32Array(o.buffer, o.byteOffset + start, length),
      vC: x0 => x0.scale,
      vD: x0 => x0.script,
      vE: x0 => x0.deltaMode,
      vF: x0 => x0.state,
      vG: (x0,x1) => x0.getElementsByClassName(x1),
      vH: (ms, c) =>
      setInterval(() => dartInstance.exports.$invokeCallback(c), ms),
      vI: x0 => x0.i,
      vJ: (x0,x1,x2) => x0.transaction(x1,x2),
      vK: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      vL: x0 => x0.error,
      vM: x0 => x0.signal,
      vN: (x0,x1) => x0.readAsArrayBuffer(x1),
      vO: x0 => x0.isComposing,
      vP: x0 => x0.mediaDevices,
      vQ: x0 => x0.bytes,
      vR: (x0,x1) => x0.replaceChildren(x1),
      w: x0 => new Int8Array(x0),
      wB: (o, start, length) => new Uint32Array(o.buffer, o.byteOffset + start, length),
      wC: x0 => x0.visualViewport,
      wD: x0 => x0.language,
      wE: x0 => x0.deltaY,
      wF: (x0,x1) => x0.go(x1),
      wG: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const setValue = dartInstance.exports.$wasmF32ArraySet;
        for (let i = 0; i < length; i++) {
          setValue(wasmArray, wasmArrayOffset + i, jsArray[jsArrayOffset + i]);
        }
      },
      wH: () => Date.now(),
      wI: x0 => x0.port1,
      wJ: x0 => x0.close(),
      wK: x0 => new FinalizationRegistry(x0),
      wL: x0 => x0.result,
      wM: x0 => x0.abort(),
      wN: x0 => x0.result,
      wO: x0 => x0.code,
      wP: x0 => x0.facingMode,
      wQ: x0 => x0.y,
      wR: x0 => x0.click(),
      x: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const getValue = dartInstance.exports.$wasmI8ArrayGet;
        for (let i = 0; i < length; i++) {
          jsArray[jsArrayOffset + i] = getValue(wasmArray, wasmArrayOffset + i);
        }
      },
      xB: (o, start, length) => new Int32Array(o.buffer, o.byteOffset + start, length),
      xC: x0 => x0.devicePixelRatio,
      xD: x0 => x0.languages,
      xE: x0 => x0.deltaX,
      xF: x0 => x0.hash,
      xG: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const setValue = dartInstance.exports.$wasmF64ArraySet;
        for (let i = 0; i < length; i++) {
          setValue(wasmArray, wasmArrayOffset + i, jsArray[jsArrayOffset + i]);
        }
      },
      xH: (x0,x1,x2) => x0.insertBefore(x1,x2),
      xI: (x0,x1) => x0.sqlite3_changes(x1),
      xJ: (wasmFunction,f) => finalizeWrapper(f, function() { return wasmFunction(f,arguments.length) }),
      xK: () => globalThis.FinalizationRegistry,
      xL: (x0,x1) => globalThis.IDBKeyRange.bound(x0,x1),
      xM: x0 => x0.naturalHeight,
      xN: () => new XMLHttpRequest(),
      xO: x0 => x0.repeat,
      xP: x0 => x0.mediaDevices,
      xQ: x0 => x0.x,
      xR: (x0,x1,x2) => x0.setAttribute(x1,x2),
      y: x0 => new Uint8Array(x0),
      yB: (o, start, length) => new Uint16Array(o.buffer, o.byteOffset + start, length),
      yC: x0 => x0.height,
      yD: (x0,x1) => x0.observe(x1),
      yE: x0 => x0.wheelDeltaY,
      yF: x0 => x0.location,
      yG: (x0,x1) => x0.dispatchEvent(x1),
      yH: x0 => x0.id,
      yI: (x0,x1) => x0.sqlite3_finalize(x1),
      yJ: () => globalThis.Promise.resolve(),
      yK: (x0,x1) => x0.sqlite3changeset_finalize(x1),
      yL: x0 => x0.length,
      yM: x0 => x0.naturalWidth,
      yN: (x0,x1,x2,x3) => x0.open(x1,x2,x3),
      yO: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      yP: () => globalThis.BarcodeDetector.getSupportedFormats(),
      yQ: x0 => x0.bottomLeft,
      yR: (x0,x1) => { x0.accept = x1 },
      z: x0 => new Uint8ClampedArray(x0),
      zB: (o, start, length) => new Int16Array(o.buffer, o.byteOffset + start, length),
      zC: x0 => x0.width,
      zD: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1) { return wasmFunction(f,arguments.length,x0,x1) }),
      zE: x0 => x0.wheelDeltaX,
      zF: x0 => x0.search,
      zG: (x0,x1) => x0.createEvent(x1),
      zH: x0 => x0.offsetHeight,
      zI: (x0,x1) => x0.sqlite3_reset(x1),
      zJ: (x0,x1) => x0.then(x1),
      zK: x0 => x0.exports,
      zL: (x0,x1) => x0.get(x1),
      zM: (x0,x1) => x0.createElement(x1),
      zN: x0 => x0.send(),
      zO: x0 => x0.userAgent,
      zP: (x0,x1) => x0.call(x1),
      zQ: x0 => x0.bottomRight,
      zR: (x0,x1) => { x0.multiple = x1 },

    };

    const baseImports = {
      _: dart2wasm,
      Math: Math,
      Date: Date,
      Object: Object,
      Array: Array,
      Reflect: Reflect,
      WebAssembly: {
        JSTag: WebAssembly.JSTag,
      },
      "": new Proxy({}, { get(_, prop) { return prop; } }),

    };

    const jsStringPolyfill = {
      "charCodeAt": (s, i) => s.charCodeAt(i),
      "compare": (s1, s2) => {
        if (s1 < s2) return -1;
        if (s1 > s2) return 1;
        return 0;
      },
      "concat": (s1, s2) => s1 + s2,
      "equals": (s1, s2) => s1 === s2,
      "fromCharCode": (i) => String.fromCharCode(i),
      "length": (s) => s.length,
      "substring": (s, a, b) => s.substring(a, b),
      "fromCharCodeArray": (a, start, end) => {
        if (end <= start) return '';

        const read = dartInstance.exports.$wasmI16ArrayGet;
        let result = '';
        let index = start;
        const chunkLength = Math.min(end - index, 500);
        let array = new Array(chunkLength);
        while (index < end) {
          const newChunkLength = Math.min(end - index, 500);
          for (let i = 0; i < newChunkLength; i++) {
            array[i] = read(a, index++);
          }
          if (newChunkLength < chunkLength) {
            array = array.slice(0, newChunkLength);
          }
          result += String.fromCharCode(...array);
        }
        return result;
      },
      "intoCharCodeArray": (s, a, start) => {
        if (s === '') return 0;

        const write = dartInstance.exports.$wasmI16ArraySet;
        for (var i = 0; i < s.length; ++i) {
          write(a, start++, s.charCodeAt(i));
        }
        return s.length;
      },
      "test": (s) => typeof s == "string",
    };


    

    dartInstance = await WebAssembly.instantiate(this.module, {
      ...baseImports,
      ...additionalImports,
      
      "wasm:js-string": jsStringPolyfill,
    });

    return new InstantiatedApp(this, dartInstance);
  }
}

class InstantiatedApp {
  constructor(compiledApp, instantiatedModule) {
    this.compiledApp = compiledApp;
    this.instantiatedModule = instantiatedModule;
  }

  // Call the main function with the given arguments.
  invokeMain(...args) {
    this.instantiatedModule.exports.$invokeMain(args);
  }
}
