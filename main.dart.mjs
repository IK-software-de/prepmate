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
      AG: x0 => x0.first(),
      AH: (x0,x1) => { x0.scrollTop = x1 },
      AI: x0 => x0.offsetWidth,
      AJ: (o, a) => o == a,
      AK: (x0,x1) => x0.sqlite3_value_type(x1),
      AL: () => globalThis.navigator,
      AM: x0 => x0.href,
      AN: x0 => x0.value,
      AO: x0 => x0.response,
      AP: x0 => x0.location,
      AQ: x0 => x0.whiteBalanceMode,
      AR: x0 => x0.stream,
      AS: (x0,x1) => { x0.onchange = x1 },
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
      BG: x0 => x0.next(),
      BH: (x0,x1,x2) => x0.setSelectionRange(x1,x2),
      BI: x0 => x0.stopPropagation(),
      BJ: (o, t) => typeof o === t,
      BK: (x0,x1,x2) => x0.sqlite3_extended_result_codes(x1,x2),
      BL: (x0,x1) => globalThis.fetch(x0,x1),
      BM: (x0,x1) => x0.openCursor(x1),
      BN: x0 => x0.done,
      BO: (x0,x1,x2) => x0.setRequestHeader(x1,x2),
      BP: (x0,x1) => x0.getModifierState(x1),
      BQ: (x0,x1) => { x0.exposureMode = x1 },
      BR: x0 => x0.play(),
      BS: x0 => x0.type,
      C: Function.prototype.call.bind(Number.prototype.toString),
      CB: x0 => new Uint16Array(x0),
      CC: (o, start, length) => new Int8Array(o.buffer, o.byteOffset + start, length),
      CD: x0 => x0.tabIndex,
      CE: x0 => globalThis.parseFloat(x0),
      CF: x0 => x0.touches,
      CG: x0 => x0.current(),
      CH: (x0,x1) => { x0.value = x1 },
      CI: x0 => x0.disabled,
      CJ: x0 => x0.r,
      CK: (x0,x1,x2,x3,x4) => x0.sqlite3_open_v2(x1,x2,x3,x4),
      CL: (x0,x1) => x0.sqlite3session_delete(x1),
      CM: x0 => x0.arrayBuffer(),
      CN: x0 => x0.cancel(),
      CO: (x0,x1) => { x0.responseType = x1 },
      CP: x0 => x0.metaKey,
      CQ: x0 => x0.exposureMode,
      CR: x0 => x0.paused,
      CS: x0 => x0.lastModified,
      D: Function.prototype.call.bind(BigInt.prototype.toString),
      DB: x0 => new Int32Array(x0),
      DC: (x0,x1) => x0.querySelector(x1),
      DD: (x0,x1) => x0.contains(x1),
      DE: (x0,x1) => x0.getComputedStyle(x1),
      DF: x0 => x0.pressure,
      DG: (x0,x1) => new Intl.v8BreakIterator(x0,x1),
      DH: (x0,x1,x2) => x0.setSelectionRange(x1,x2),
      DI: (x0,x1) => { x0.min = x1 },
      DJ: x0 => x0.c,
      DK: x0 => x0.sqlite3_initialize(),
      DL: (x0,x1,x2,x3) => x0.register(x1,x2,x3),
      DM: () => globalThis.Blob,
      DN: x0 => x0.body,
      DO: () => new XMLHttpRequest(),
      DP: x0 => x0.altKey,
      DQ: (x0,x1) => { x0.focusMode = x1 },
      DR: (x0,x1,x2,x3) => x0.drawImage(x1,x2,x3),
      DS: x0 => x0.name,
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
      EG: x0 => x0.v8BreakIterator,
      EH: (x0,x1) => { x0.value = x1 },
      EI: (x0,x1) => { x0.max = x1 },
      EJ: x0 => x0.p,
      EK: (x0,x1,x2,x3) => x0.dart_sqlite3_register_vfs(x1,x2,x3),
      EL: (x0,x1) => x0.unregister(x1),
      EM: x0 => x0.value,
      EN: x0 => x0.headers,
      EO: () => new FileReader(),
      EP: x0 => x0.ctrlKey,
      EQ: x0 => x0.focusMode,
      ER: (x0,x1,x2,x3,x4) => x0.getImageData(x1,x2,x3,x4),
      ES: (x0,x1) => x0.item(x1),
      F: () => new Error().stack,
      FB: x0 => new Uint32Array(x0),
      FC: x0 => x0.length,
      FD: x0 => x0.parentNode,
      FE: x0 => x0.computedStyleMap(),
      FF: x0 => x0.tiltX,
      FG: () => globalThis.Intl,
      FH: s => {
        if (/[[\]{}()*+?.\\^$|]/.test(s)) {
            s = s.replace(/[[\]{}()*+?.\\^$|]/g, '\\$&');
        }
        return s;
      },
      FI: (x0,x1) => { x0.disabled = x1 },
      FJ: x0 => x0.i,
      FK: (x0,x1,x2) => x0.transaction(x1,x2),
      FL: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      FM: x0 => x0.key,
      FN: x0 => x0.signal,
      FO: (x0,x1) => x0.readAsArrayBuffer(x1),
      FP: x0 => x0.isComposing,
      FQ: x0 => x0.enumerateDevices(),
      FR: (x0,x1,x2) => x0.readBarcodes(x1,x2),
      FS: x0 => x0.length,
      G: s => JSON.stringify(s),
      GB: x0 => new Float32Array(x0),
      GC: (x0,x1) => x0.querySelectorAll(x1),
      GD: x0 => x0.tagName,
      GE: (x0,x1) => x0.get(x1),
      GF: x0 => x0.pointerType,
      GG: (x0,x1) => x0.segment(x1),
      GH: x0 => x0.value,
      GI: (x0,x1) => { x0.scrollLeft = x1 },
      GJ: x0 => x0.port1,
      GK: x0 => x0.close(),
      GL: x0 => new FinalizationRegistry(x0),
      GM: x0 => x0.continue(),
      GN: x0 => x0.abort(),
      GO: x0 => x0.result,
      GP: x0 => x0.code,
      GQ: x0 => x0.deviceId,
      GR: x0 => x0.text,
      GS: x0 => x0.files,
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
      HG: x0 => x0.index,
      HH: x0 => x0.selectionDirection,
      HI: (x0,x1) => { x0.spellcheck = x1 },
      HJ: (x0,x1) => x0.sqlite3_finalize(x1),
      HK: (wasmFunction,f) => finalizeWrapper(f, function() { return wasmFunction(f,arguments.length) }),
      HL: () => globalThis.FinalizationRegistry,
      HM: x0 => x0.error,
      HN: x0 => x0.naturalHeight,
      HO: () => new XMLHttpRequest(),
      HP: x0 => x0.repeat,
      HQ: x0 => x0.kind,
      HR: x0 => x0.format,
      HS: x0 => x0.target,
      I: Function.prototype.call.bind(String.prototype.indexOf),
      IB: x0 => new Float64Array(x0),
      IC: x0 => x0.remove(),
      ID: x0 => x0.clientY,
      IE: (x0,x1) => { x0.textContent = x1 },
      IF: x0 => x0.getCoalescedEvents(),
      IG: x0 => x0.next(),
      IH: x0 => x0.selectionStart,
      II: (x0,x1) => { x0.disabled = x1 },
      IJ: (x0,x1) => x0.sqlite3_reset(x1),
      IK: () => globalThis.Promise.resolve(),
      IL: (x0,x1) => x0.sqlite3changeset_finalize(x1),
      IM: x0 => x0.result,
      IN: x0 => x0.naturalWidth,
      IO: (x0,x1,x2,x3) => x0.open(x1,x2,x3),
      IP: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      IQ: x0 => x0.mediaDevices,
      IR: x0 => x0.bytes,
      IS: (x0,x1) => x0.replaceChildren(x1),
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
      JG: x0 => x0.value,
      JH: x0 => x0.selectionEnd,
      JI: (x0,x1) => x0.getRandomValues(x1),
      JJ: x0 => x0.buffer,
      JK: (x0,x1) => x0.then(x1),
      JL: x0 => x0.exports,
      JM: (x0,x1) => globalThis.IDBKeyRange.bound(x0,x1),
      JN: (x0,x1) => x0.createElement(x1),
      JO: x0 => x0.send(),
      JP: x0 => x0.userAgent,
      JQ: x0 => x0.facingMode,
      JR: x0 => x0.y,
      JS: x0 => x0.click(),
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
      KG: x0 => x0.done,
      KH: x0 => x0.value,
      KI: () => globalThis.crypto,
      KJ: (x0,x1) => x0.sqlite3_errstr(x1),
      KK: x0 => x0.abort(),
      KL: x0 => x0.call(),
      KM: x0 => x0.length,
      KN: (x0,x1) => { x0.pointerEvents = x1 },
      KO: x0 => x0.type,
      KP: (x0,x1,x2,x3) => x0.open(x1,x2,x3),
      KQ: x0 => x0.mediaDevices,
      KR: x0 => x0.x,
      KS: (x0,x1,x2) => x0.setAttribute(x1,x2),
      L: o => o === undefined,
      LB: (x0,x1,x2) => new Uint8Array(x0,x1,x2),
      LC: (x0,x1,x2,x3) => x0.setProperty(x1,x2,x3),
      LD: x0 => x0.getBoundingClientRect(),
      LE: (x0,x1) => x0.matchMedia(x1),
      LF: (x0,x1) => x0[x1],
      LG: (o, m, a) => o[m].apply(o, a),
      LH: x0 => x0.selectionDirection,
      LI: l => new DataView(new ArrayBuffer(l)),
      LJ: (x0,x1) => x0.sqlite3_errmsg(x1),
      LK: x0 => x0.commit(),
      LL: x0 => x0.instance,
      LM: (x0,x1) => x0.get(x1),
      LN: (x0,x1) => { x0.height = x1 },
      LO: x0 => x0.response,
      LP: (x0,x1) => x0.key(x1),
      LQ: () => globalThis.BarcodeDetector.getSupportedFormats(),
      LR: x0 => x0.bottomLeft,
      LS: (x0,x1) => { x0.accept = x1 },
      M: o => String(o),
      MB: (x0,x1,x2) => new DataView(x0,x1,x2),
      MC: x0 => x0.style,
      MD: (ms, c) =>
      setTimeout(() => dartInstance.exports.$invokeCallback(c),ms),
      ME: x0 => x0.matches,
      MF: x0 => x0.index,
      MG: x0 => x0.iterator,
      MH: x0 => x0.selectionStart,
      MI: (a, i) => a.splice(i, 1),
      MJ: (x0,x1) => x0.sqlite3_error_offset(x1),
      MK: (wasmFunction,f) => finalizeWrapper(f, function() { return wasmFunction(f,arguments.length) }),
      ML: (x0,x1,x2) => x0.instantiateStreaming(x1,x2),
      MM: (x0,x1) => x0.index(x1),
      MN: (x0,x1) => { x0.width = x1 },
      MO: (x0,x1) => { x0.responseType = x1 },
      MP: x0 => x0.length,
      MQ: (x0,x1) => x0.call(x1),
      MR: x0 => x0.bottomRight,
      MS: (x0,x1) => { x0.multiple = x1 },
      N: (c) =>
      queueMicrotask(() => dartInstance.exports.$invokeCallback(c)),
      NB: (o, p) => o[p],
      NC: x0 => x0.debugShowSemanticsNodes,
      ND: s => new Date(s * 1000).getTimezoneOffset() * 60,
      NE: o => typeof o === 'function' && o[jsWrappedDartFunctionSymbol] === true,
      NF: s => s.toUpperCase(),
      NG: () => globalThis.Symbol,
      NH: x0 => x0.selectionEnd,
      NI: a => a.pop(),
      NJ: (x0,x1) => x0.sqlite3_extended_errcode(x1),
      NK: (wasmFunction,f) => finalizeWrapper(f, function() { return wasmFunction(f,arguments.length) }),
      NL: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      NM: x0 => x0.openKeyCursor(),
      NN: x0 => x0.style,
      NO: x0 => x0.vendor,
      NP: (x0,x1) => x0.canShare(x1),
      NQ: x0 => x0.reset,
      NR: x0 => x0.topRight,
      NS: (x0,x1) => { x0.type = x1 },
      O: (x0,x1) => x0.didCreateEngineInitializer(x1),
      OB: (o) => new DataView(o.buffer, o.byteOffset, o.byteLength),
      OC: o => o,
      OD: Date.now,
      OE: f => f.dartFunction,
      OF: x0 => x0.pop(),
      OG: (x0,x1) => new Intl.Segmenter(x0,x1),
      OH: x0 => x0.keyCode,
      OI: (map, o, v) => map.set(o, v),
      OJ: (x0,x1) => x0.sqlite3_step(x1),
      OK: (x0,x1) => { x0.onerror = x1 },
      OL: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1) { return wasmFunction(f,arguments.length,x0,x1) }),
      OM: x0 => x0.primaryKey,
      ON: (x0,x1) => { x0.src = x1 },
      OO: x0 => x0.navigator,
      OP: (x0,x1) => x0.share(x1),
      OQ: x0 => x0.stopContinuousDecode,
      OR: x0 => x0.topLeft,
      OS: () => globalThis.removeSplashFromWeb(),
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
      PG: x0 => x0.Segmenter,
      PH: (x0,x1) => x0.scrollIntoView(x1),
      PI: (map, o) => map.get(o),
      PJ: (x0,x1,x2,x3,x4) => x0.dart_sqlite3_bind_blob(x1,x2,x3,x4),
      PK: x0 => new DOMException(x0),
      PL: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1,x2,x3,x4) { return wasmFunction(f,arguments.length,x0,x1,x2,x3,x4) }),
      PM: (x0,x1,x2) => x0.open(x1,x2),
      PN: () => globalThis.document,
      PO: () => globalThis.window,
      PP: x0 => x0.message,
      PQ: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1) { return wasmFunction(f,arguments.length,x0,x1) }),
      PR: x0 => x0.position,
      PS: x0 => x0.length,
      Q: (wasmFunction,f) => finalizeWrapper(f, function() { return wasmFunction(f,arguments.length) }),
      QB: o => o.byteOffset,
      QC: (x0,x1) => x0.warn(x1),
      QD: (x0,x1) => x0.closest(x1),
      QE: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1) { return wasmFunction(f,arguments.length,x0,x1) }),
      QF: (a, s) => a.join(s),
      QG: x0 => x0.buffer,
      QH: x0 => x0.multiViewEnabled,
      QI: () => new WeakMap(),
      QJ: (x0,x1) => x0.dart_sqlite3_malloc(x1),
      QK: x0 => x0.error,
      QL: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1,x2) { return wasmFunction(f,arguments.length,x0,x1,x2) }),
      QM: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      QN: x0 => x0.src,
      QO: (x0,x1) => x0.get(x1),
      QP: (x0,x1,x2) => ({files: x0,title: x1,text: x2}),
      QQ: (x0,x1,x2,x3) => x0.call(x1,x2,x3),
      QR: x0 => x0.isValid,
      QS: x0 => x0.getReader(),
      R: (x0,x1) => ({initializeEngine: x0,autoStart: x1}),
      RB: o => o.buffer,
      RC: x0 => x0.console,
      RD: x0 => x0.bottom,
      RE: (p, s, f) => p.then(s, (e) => f(e, e === undefined)),
      RF: (x0,x1) => x0.error(x1),
      RG: x0 => x0.wasmMemory,
      RH: (x0,x1) => x0.replaceWith(x1),
      RI: x0 => new WeakRef(x0),
      RJ: (x0,x1,x2,x3,x4) => x0.dart_sqlite3_bind_text(x1,x2,x3,x4),
      RK: (x0,x1) => { x0.onabort = x1 },
      RL: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1,x2,x3) { return wasmFunction(f,arguments.length,x0,x1,x2,x3) }),
      RM: (x0,x1) => { x0.onupgradeneeded = x1 },
      RN: (x0,x1) => x0.revokeObjectURL(x1),
      RO: x0 => x0.body,
      RP: (x0,x1) => ({files: x0,text: x1}),
      RQ: x0 => x0.text,
      RR: (x0,x1,x2,x3) => ({formats: x0,tryHarder: x1,tryRotate: x2,tryInvert: x3}),
      RS: x0 => x0.value,
      S: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1) { return wasmFunction(f,arguments.length,x0,x1) }),
      SB: Function.prototype.call.bind(DataView.prototype.getUint8),
      SC: () => globalThis.window,
      SD: x0 => x0.top,
      SE: (o, i) => o[i],
      SF: () => globalThis.console,
      SG: () => globalThis.window._flutter_skwasmInstance,
      SH: (x0,x1) => { x0.type = x1 },
      SI: x0 => x0.deref(),
      SJ: (x0,x1,x2,x3) => x0.sqlite3_bind_double(x1,x2,x3),
      SK: (x0,x1) => { x0.oncomplete = x1 },
      SL: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1,x2,x3) { return wasmFunction(f,arguments.length,x0,x1,x2,x3) }),
      SM: x0 => ({autoIncrement: x0}),
      SN: (x0,x1) => { x0.src = x1 },
      SO: x0 => x0.headers,
      SP: (x0,x1) => ({files: x0,title: x1}),
      SQ: x0 => x0.barcodeFormat,
      SR: (x0,x1,x2) => ({tryHarder: x0,tryRotate: x1,tryInvert: x2}),
      SS: x0 => x0.done,
      T: x0 => new Promise(x0),
      TB: (b, o) => new DataView(b, o),
      TC: (o, c) => o instanceof c,
      TD: x0 => x0.right,
      TE: o => o.length,
      TF: s => s.trimRight(),
      TG: () => new TextDecoder(),
      TH: (x0,x1) => { x0.className = x1 },
      TI: () => globalThis.WeakRef,
      TJ: (x0,x1,x2,x3) => x0.sqlite3_bind_int64(x1,x2,x3),
      TK: (x0,x1) => x0.objectStore(x1),
      TL: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1,x2) { return wasmFunction(f,arguments.length,x0,x1,x2) }),
      TM: (x0,x1,x2) => x0.createObjectStore(x1,x2),
      TN: (x0,x1,x2,x3,x4) => globalThis.createImageBitmap(x0,x1,x2,x3,x4),
      TO: (x0,x1) => x0.getItem(x1),
      TP: x0 => ({files: x0}),
      TQ: x0 => x0.rawBytes,
      TR: () => globalThis.ZXingWASM,
      TS: x0 => x0.read(),
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
      UG: (d, digits) => d.toFixed(digits),
      UH: (x0,x1) => { x0.tabIndex = x1 },
      UI: () => new MessageChannel(),
      UJ: x0 => globalThis.BigInt(x0),
      UK: (x0,x1) => globalThis.Atomics.load(x0,x1),
      UL: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1) { return wasmFunction(f,arguments.length,x0,x1) }),
      UM: x0 => ({unique: x0}),
      UN: x0 => x0.naturalHeight,
      UO: x0 => x0.localStorage,
      UP: (x0,x1) => ({title: x0,text: x1}),
      UQ: x0 => x0.y,
      UR: (x0,x1) => { x0.height = x1 },
      US: (x0,x1) => new OffscreenCanvas(x0,x1),
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
      VG: x0 => x0.maxHeight,
      VH: (x0,x1) => { x0.name = x1 },
      VI: x0 => new BroadcastChannel(x0),
      VJ: (x0,x1,x2) => x0.sqlite3_bind_null(x1,x2),
      VK: (x0,x1,x2) => globalThis.Atomics.wait(x0,x1,x2),
      VL: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1) { return wasmFunction(f,arguments.length,x0,x1) }),
      VM: (x0,x1,x2,x3) => x0.createIndex(x1,x2,x3),
      VN: x0 => x0.naturalWidth,
      VO: (x0,x1,x2,x3) => x0.replaceState(x1,x2,x3),
      VP: x0 => ({text: x0}),
      VQ: x0 => x0.x,
      VR: (x0,x1) => { x0.width = x1 },
      VS: x0 => x0.assetBase,
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
      WG: x0 => x0.maxWidth,
      WH: (x0,x1) => { x0.placeholder = x1 },
      WI: (x0,x1,x2,x3) => x0.addEventListener(x1,x2,x3),
      WJ: (x0,x1) => x0.sqlite3_bind_parameter_count(x1),
      WK: (x0,x1,x2) => globalThis.Atomics.notify(x0,x1,x2),
      WL: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      WM: (x0,x1) => x0.createObjectStore(x1),
      WN: x0 => x0.decode(),
      WO: x0 => x0.history,
      WP: x0 => x0.document,
      WQ: x0 => x0.resultPoints,
      WR: x0 => x0.height,
      WS: x0 => x0.loader,
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
      XG: x0 => x0.minHeight,
      XH: (x0,x1) => { x0.autocomplete = x1 },
      XI: (x0,x1,x2,x3) => x0.removeEventListener(x1,x2,x3),
      XJ: (x0,x1) => x0.sqlite3_stmt_isexplain(x1),
      XK: (x0,x1,x2) => globalThis.Atomics.store(x0,x1,x2),
      XL: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1,x2,x3) { return wasmFunction(f,arguments.length,x0,x1,x2,x3) }),
      XM: x0 => x0.oldVersion,
      XN: (x0,x1) => { x0.decoding = x1 },
      XO: x0 => x0.href,
      XP: (x0,x1) => { x0.transform = x1 },
      XQ: x0 => x0.message,
      XR: x0 => x0.width,
      XS: () => globalThis._flutter,
      Y: (o0, o1) => [o0, o1],
      YB: (t, s) => t.set(s),
      YC: o => o instanceof RegExp,
      YD: x0 => x0.offsetY,
      YE: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      YF: x0 => x0.height,
      YG: x0 => x0.minWidth,
      YH: (x0,x1) => { x0.name = x1 },
      YI: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      YJ: (x0,x1) => x0.dart_sqlite3_free(x1),
      YK: (x0,x1,x2) => x0.setInt32(x1,x2),
      YL: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1,x2,x3) { return wasmFunction(f,arguments.length,x0,x1,x2,x3) }),
      YM: () => globalThis.indexedDB,
      YN: (x0,x1) => { x0.crossOrigin = x1 },
      YO: x0 => x0.location,
      YP: x0 => x0.style,
      YQ: x0 => x0.videoElement,
      YR: (x0,x1) => { x0.srcObject = x1 },
      Z: (o0, o1, o2) => [o0, o1, o2],
      ZB: Function.prototype.call.bind(DataView.prototype.setFloat32),
      ZC: (string, times) => string.repeat(times),
      ZD: x0 => x0.offsetX,
      ZE: x0 => new window.FinalizationRegistry(x0),
      ZF: x0 => x0.width,
      ZG: x0 => x0.debugSkipFontRetryDelay,
      ZH: (x0,x1) => { x0.placeholder = x1 },
      ZI: x0 => globalThis.Array.isArray(x0),
      ZJ: (x0,x1,x2,x3,x4,x5,x6) => x0.sqlite3_prepare_v3(x1,x2,x3,x4,x5,x6),
      ZK: (x0,x1,x2) => x0.setBigInt64(x1,x2),
      ZL: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1) { return wasmFunction(f,arguments.length,x0,x1) }),
      ZM: (x0,x1) => ({name: x0,length: x1}),
      ZN: (x0,x1) => x0.createObjectURL(x1),
      ZO: (x0,x1) => x0.removeItem(x1),
      ZP: x0 => x0.getVideoTracks(),
      ZQ: x0 => x0.decodeContinuously,
      ZR: x0 => ({willReadFrequently: x0}),
      a: (o0, o1, o2, o3) => [o0, o1, o2, o3],
      aB: Function.prototype.call.bind(DataView.prototype.getFloat32),
      aC: x0 => x0.dotAll,
      aD: x0 => x0.type,
      aE: (x0,x1) => x0.unregister(x1),
      aF: x0 => x0.clientHeight,
      aG: x0 => x0.status,
      aH: (x0,x1) => { x0.action = x1 },
      aI: x0 => x0.table,
      aJ: (x0,x1,x2,x3,x4,x5) => x0.sqlite3_exec(x1,x2,x3,x4,x5),
      aK: (x0,x1,x2) => new DataView(x0,x1,x2),
      aL: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1) { return wasmFunction(f,arguments.length,x0,x1) }),
      aM: (x0,x1) => x0.update(x1),
      aN: x0 => x0.URL,
      aO: (x0,x1,x2) => x0.setItem(x1,x2),
      aP: x0 => x0.getSettings(),
      aQ: (x0,x1) => new ZXing.BrowserMultiFormatReader(x0,x1),
      aR: (x0,x1,x2) => x0.getContext(x1,x2),
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
      bG: (x0,x1,x2) => x0.set(x1,x2),
      bH: (x0,x1) => { x0.method = x1 },
      bI: x0 => x0.kind,
      bJ: (x0,x1) => x0.sqlite3_last_insert_rowid(x1),
      bK: () => globalThis.Uint8Array,
      bL: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1) { return wasmFunction(f,arguments.length,x0,x1) }),
      bM: x0 => x0.name,
      bN: x0 => new Blob(x0),
      bO: (x0,x1) => new WebSocket(x0,x1),
      bP: x0 => x0.facingMode,
      bQ: (x0,x1) => ({width: x0,height: x1}),
      bR: () => new BarcodeDetector(),
      c: o => o,
      cB: Function.prototype.call.bind(DataView.prototype.getUint32),
      cC: x0 => x0.ignoreCase,
      cD: x0 => x0.platform,
      cE: (s) => +s,
      cF: (x0,x1) => { x0.content = x1 },
      cG: x0 => x0.arrayBuffer(),
      cH: (x0,x1) => { x0.noValidate = x1 },
      cI: x0 => x0.data,
      cJ: x0 => globalThis.Number(x0),
      cK: x0 => x0.communicationBuffer,
      cL: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1) { return wasmFunction(f,arguments.length,x0,x1) }),
      cM: x0 => globalThis.IDBKeyRange.only(x0),
      cN: x0 => x0.close(),
      cO: x0 => x0.reason,
      cP: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      cQ: (x0,x1,x2) => ({width: x0,height: x1,facingMode: x2}),
      cR: x0 => ({formats: x0}),
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
      dG: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof ArrayBuffer) return 1;
        if (globalThis.SharedArrayBuffer !== undefined &&
            o instanceof SharedArrayBuffer) {
          return 2;
        }
        return 3;
      },
      dH: (x0,x1) => x0.removeAttribute(x1),
      dI: x0 => x0.close(),
      dJ: (x0,x1,x2) => x0.sqlite3_column_name(x1,x2),
      dK: () => globalThis.Int32Array,
      dL: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1) { return wasmFunction(f,arguments.length,x0,x1) }),
      dM: (x0,x1,x2) => x0.put(x1,x2),
      dN: (x0,x1) => ({frameIndex: x0,completeFramesOnly: x1}),
      dO: x0 => x0.code,
      dP: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      dQ: x0 => x0.facingMode,
      dR: x0 => new BarcodeDetector(x0),
      e: () => globalThis,
      eB: Function.prototype.call.bind(DataView.prototype.getInt32),
      eC: (string, token) => string.split(token),
      eD: () => globalThis.document,
      eE: s => s.trim(),
      eF: x0 => x0.head,
      eG: (x0,x1) => x0.fetch(x1),
      eH: x0 => x0.isConnected,
      eI: (x0,x1) => x0.postMessage(x1),
      eJ: (x0,x1,x2) => x0.sqlite3_column_blob(x1,x2),
      eK: x0 => x0.byteLength,
      eL: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1) { return wasmFunction(f,arguments.length,x0,x1) }),
      eM: (x0,x1) => x0.getKey(x1),
      eN: (x0,x1) => x0.decode(x1),
      eO: (x0,x1,x2) => x0.close(x1,x2),
      eP: (x0,x1) => x0.append(x1),
      eQ: x0 => x0.height,
      eR: (x0,x1) => x0.detect(x1),
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
      fG: x0 => x0.fontFallbackBaseUrl,
      fH: x0 => x0.click(),
      fI: (x0,x1) => ({kind: x0,table: x1}),
      fJ: (x0,x1,x2) => x0.sqlite3_column_bytes(x1,x2),
      fK: x0 => x0.synchronizationBuffer,
      fL: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      fM: (x0,x1) => x0.delete(x1),
      fN: x0 => x0.displayHeight,
      fO: (x0,x1) => x0.close(x1),
      fP: (x0,x1) => x0.createElement(x1),
      fQ: x0 => x0.width,
      fR: x0 => x0.rawValue,
      g: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      gB: o => o instanceof Uint16Array,
      gC: (a, i) => a[i],
      gD: x0 => x0.hasFocus(),
      gE: x0 => x0.preventDefault(),
      gF: x0 => x0.firstChild,
      gG: (handle) => clearInterval(handle),
      gH: (x0,x1) => x0.getElementsByClassName(x1),
      gI: x0 => new Worker(x0),
      gJ: (x0,x1,x2) => x0.sqlite3_column_text(x1,x2),
      gK: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      gL: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1,x2) { return wasmFunction(f,arguments.length,x0,x1,x2) }),
      gM: (x0,x1) => x0.put(x1),
      gN: x0 => x0.displayWidth,
      gO: x0 => x0.close(),
      gP: (x0,x1) => { x0.onpause = x1 },
      gQ: x0 => x0.attachStreamToVideo,
      gR: x0 => x0.format,
      h: (x0,x1) => ({addView: x0,removeView: x1}),
      hB: Function.prototype.call.bind(DataView.prototype.getUint16),
      hC: a => a.length,
      hD: x0 => x0.relatedTarget,
      hE: x0 => x0.parent,
      hF: x0 => x0.viewConstraints,
      hG: (ms, c) =>
      setInterval(() => dartInstance.exports.$invokeCallback(c), ms),
      hH: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const setValue = dartInstance.exports.$wasmF32ArraySet;
        for (let i = 0; i < length; i++) {
          setValue(wasmArray, wasmArrayOffset + i, jsArray[jsArrayOffset + i]);
        }
      },
      hI: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      hJ: (x0,x1,x2) => x0.sqlite3_column_double(x1,x2),
      hK: (o, p, v) => o[p] = v,
      hL: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      hM: (x0,x1,x2) => x0.postMessage(x1,x2),
      hN: x0 => x0.duration,
      hO: (x0,x1) => x0.send(x1),
      hP: (x0,x1) => { x0.onplay = x1 },
      hQ: () => new Map(),
      hR: x0 => x0.y,
      i: (l, r) => l === r,
      iB: o => o instanceof Int16Array,
      iC: (x0,x1) => x0.test(x1),
      iD: x0 => x0.shiftKey,
      iE: x0 => x0.timeStamp,
      iF: x0 => x0.hostElement,
      iG: () => Date.now(),
      iH: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const setValue = dartInstance.exports.$wasmF64ArraySet;
        for (let i = 0; i < length; i++) {
          setValue(wasmArray, wasmArrayOffset + i, jsArray[jsArrayOffset + i]);
        }
      },
      iI: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      iJ: (x0,x1,x2) => x0.sqlite3_column_int64(x1,x2),
      iK: (x0,x1,x2) => x0.postMessage(x1,x2),
      iL: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      iM: x0 => x0.port2,
      iN: x0 => x0.image,
      iO: x0 => x0.readyState,
      iP: (x0,x1) => { x0.controls = x1 },
      iQ: (x0,x1,x2) => x0.set(x1,x2),
      iR: x0 => x0.x,
      j: x0 => x0.random(),
      jB: Function.prototype.call.bind(DataView.prototype.getInt16),
      jC: x0 => x0.userAgent,
      jD: (decoder, codeUnits) => decoder.decode(codeUnits),
      jE: (x0,x1) => x0.hasAttribute(x1),
      jF: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      jG: (x0,x1,x2,x3) => x0.pushState(x1,x2,x3),
      jH: (x0,x1) => x0.dispatchEvent(x1),
      jI: (x0,x1) => x0.postMessage(x1),
      jJ: (x0,x1,x2) => x0.sqlite3_column_type(x1,x2),
      jK: x0 => new SharedArrayBuffer(x0),
      jL: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      jM: (x0,x1) => new SharedWorker(x0,x1),
      jN: (x0,x1,x2,x3,x4) => ({type: x0,data: x1,premultiplyAlpha: x2,colorSpaceConversion: x3,preferAnimation: x4}),
      jO: (x0,x1) => { x0.binaryType = x1 },
      jP: (x0,x1) => { x0.pointerEvents = x1 },
      jQ: (x0,x1) => x0.querySelector(x1),
      jR: x0 => x0.cornerPoints,
      k: o => o,
      kB: o => o instanceof Uint8ClampedArray,
      kC: x0 => x0.navigator,
      kD: () => new TextDecoder("utf-8", {fatal: true}),
      kE: x0 => x0.buttons,
      kF: x0 => ({runApp: x0}),
      kG: x0 => x0.history,
      kH: (x0,x1) => x0.createEvent(x1),
      kI: (x0,x1) => { x0.onerror = x1 },
      kJ: (x0,x1) => x0.sqlite3_column_count(x1),
      kK: (x0,x1,x2,x3) => ({clientVersion: x0,root: x1,synchronizationBuffer: x2,communicationBuffer: x3}),
      kL: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1,x2,x3,x4) { return wasmFunction(f,arguments.length,x0,x1,x2,x3,x4) }),
      kM: x0 => x0.start(),
      kN: x0 => new window.ImageDecoder(x0),
      kO: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      kP: (x0,x1) => { x0.transformOrigin = x1 },
      kQ: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      kR: x0 => x0.body,
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
      lG: (x0,x1,x2,x3) => x0.replaceState(x1,x2,x3),
      lH: (x0,x1,x2,x3) => x0.initEvent(x1,x2,x3),
      lI: x0 => x0.terminate(),
      lJ: (x0,x1) => x0.sqlite3_changes(x1),
      lK: x0 => x0.close(),
      lL: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1,x2,x3) { return wasmFunction(f,arguments.length,x0,x1,x2,x3) }),
      lM: x0 => x0.port,
      lN: x0 => x0.name,
      lO: (x0,x1) => { x0.onmessage = x1 },
      lP: (x0,x1) => { x0.objectFit = x1 },
      lQ: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      lR: x0 => globalThis.URL.revokeObjectURL(x0),
      m: () => globalThis.Math,
      mB: Function.prototype.call.bind(DataView.prototype.setInt32),
      mC: Object.is,
      mD: (a, i, v) => a[i] = v,
      mE: x0 => x0.y,
      mF: Function.prototype.call.bind(DataView.prototype.setBigInt64),
      mG: o => {
        const proto = Object.getPrototypeOf(o);
        return proto === Object.prototype || proto === null;
      },
      mH: x0 => x0.readText(),
      mI: (x0,x1) => { x0.onmessage = x1 },
      mJ: (x0,x1) => x0.sqlite3_close_v2(x1),
      mK: x0 => x0.getSize(),
      mL: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1,x2,x3) { return wasmFunction(f,arguments.length,x0,x1,x2,x3) }),
      mM: x0 => x0.baseURI,
      mN: x0 => x0.repetitionCount,
      mO: x0 => x0.baseURI,
      mP: (x0,x1) => { x0.width = x1 },
      mQ: (x0,x1) => x0.appendChild(x1),
      mR: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
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
      nG: o => Object.keys(o),
      nH: x0 => x0.clipboard,
      nI: () => {
        return typeof process != "undefined" &&
               Object.prototype.toString.call(process) == "[object process]" &&
               process.platform == "win32"
      },
      nJ: (x0,x1,x2,x3,x4,x5,x6) => x0.dart_sqlite3_create_function_v2(x1,x2,x3,x4,x5,x6),
      nK: (x0,x1) => x0.truncate(x1),
      nL: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1,x2,x3) { return wasmFunction(f,arguments.length,x0,x1,x2,x3) }),
      nM: () => globalThis.document,
      nN: x0 => x0.frameCount,
      nO: (x0,x1) => x0.transferFromImageBitmap(x1),
      nP: (x0,x1) => { x0.height = x1 },
      nQ: x0 => x0.head,
      nR: (x0,x1,x2,x3) => x0.toBlob(x1,x2,x3),
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
      oG: x0 => x0.state,
      oH: (x0,x1) => x0.writeText(x1),
      oI: () => {
        // On browsers return `globalThis.location.href`
        if (globalThis.location != null) {
          return globalThis.location.href;
        }
        return null;
      },
      oJ: (x0,x1,x2,x3) => x0.sqlite3_result_error(x1,x2,x3),
      oK: x0 => ({at: x0}),
      oL: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1) { return wasmFunction(f,arguments.length,x0,x1) }),
      oM: () => new AbortController(),
      oN: x0 => x0.selectedTrack,
      oO: (x0,x1) => x0.getContext(x1),
      oP: x0 => x0.getSupportedConstraints(),
      oQ: (x0,x1) => { x0.onerror = x1 },
      oR: x0 => globalThis.URL.createObjectURL(x0),
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
      pF: () => typeof dartUseDateNowForTicks !== "undefined",
      pG: x0 => x0.state,
      pH: x0 => x0.unlock(),
      pI: (o, p) => p in o,
      pJ: (x0,x1,x2) => x0.sqlite3_result_subtype(x1,x2),
      pK: (x0,x1) => x0.write(x1),
      pL: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1) { return wasmFunction(f,arguments.length,x0,x1) }),
      pM: (x0,x1,x2,x3,x4,x5) => ({method: x0,headers: x1,body: x2,credentials: x3,redirect: x4,signal: x5}),
      pN: x0 => x0.completed,
      pO: (x0,x1) => { x0.height = x1 },
      pP: x0 => ({ideal: x0}),
      pQ: (x0,x1) => x0.removeChild(x1),
      pR: x0 => x0.size,
      q: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      qB: Function.prototype.call.bind(DataView.prototype.setUint8),
      qC: (x0,x1) => { x0.nonce = x1 },
      qD: x0 => x0.visibilityState,
      qE: x0 => x0.scrollLeft,
      qF: () => Date.now(),
      qG: (x0,x1) => x0.go(x1),
      qH: (x0,x1) => x0.lock(x1),
      qI: x0 => x0.groups,
      qJ: (x0,x1,x2,x3,x4) => x0.sqlite3_result_blob64(x1,x2,x3,x4),
      qK: (x0,x1,x2) => x0.write(x1,x2),
      qL: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1,x2,x3,x4) { return wasmFunction(f,arguments.length,x0,x1,x2,x3,x4) }),
      qM: (x0,x1) => globalThis.fetch(x0,x1),
      qN: x0 => x0.ready,
      qO: (x0,x1) => { x0.width = x1 },
      qP: (x0,x1,x2) => ({width: x0,height: x1,deviceId: x2}),
      qQ: (x0,x1) => { x0.onload = x1 },
      qR: (x0,x1,x2,x3,x4,x5) => x0.drawImage(x1,x2,x3,x4,x5),
      r: (x0,x1) => x0.focus(x1),
      rB: Function.prototype.call.bind(DataView.prototype.setInt8),
      rC: x0 => x0.nonce,
      rD: (x0,x1,x2) => x0.removeEventListener(x1,x2),
      rE: x0 => x0.offsetLeft,
      rF: () => 1000 * performance.now(),
      rG: x0 => x0.hash,
      rH: x0 => x0.orientation,
      rI: (o, offsetInBytes, lengthInBytes) => {
        var dst = new ArrayBuffer(lengthInBytes);
        new Uint8Array(dst).set(new Uint8Array(o, offsetInBytes, lengthInBytes));
        return new DataView(dst);
      },
      rJ: (x0,x1,x2,x3,x4) => x0.sqlite3_result_text(x1,x2,x3,x4),
      rK: x0 => x0.createSyncAccessHandle(),
      rL: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1) { return wasmFunction(f,arguments.length,x0,x1) }),
      rM: (x0,x1) => x0.get(x1),
      rN: x0 => x0.tracks,
      rO: x0 => x0.height,
      rP: x0 => ({video: x0}),
      rQ: (x0,x1) => { x0.src = x1 },
      rR: (x0,x1) => x0.getContext(x1),
      s: () => ({}),
      sB: Function.prototype.call.bind(DataView.prototype.getInt8),
      sC: () => globalThis.window.flutterConfiguration,
      sD: x0 => x0.disconnect(),
      sE: x0 => x0.offsetParent,
      sF: (x0,x1) => x0.requestAnimationFrame(x1),
      sG: x0 => x0.location,
      sH: (x0,x1) => x0.querySelector(x1),
      sI: (a, s, e) => a.slice(s, e),
      sJ: (x0,x1,x2) => x0.sqlite3_result_double(x1,x2),
      sK: x0 => ({create: x0}),
      sL: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1) { return wasmFunction(f,arguments.length,x0,x1) }),
      sM: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1,x2) { return wasmFunction(f,arguments.length,x0,x1,x2) }),
      sN: () => globalThis.window.ImageDecoder,
      sO: x0 => x0.width,
      sP: (x0,x1) => ({width: x0,height: x1}),
      sQ: (x0,x1) => { x0.crossOrigin = x1 },
      sR: x0 => x0.height,
      t: (o, p, v) => o[p] = v,
      tB: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof Int8Array) return 1;
        return 2;
      },
      tC: (x0,x1) => x0.attachShadow(x1),
      tD: x0 => new Intl.Locale(x0),
      tE: (o, p, r) => o.replace(p, () => r),
      tF: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      tG: x0 => x0.search,
      tH: (x0,x1) => { x0.title = x1 },
      tI: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      tJ: (x0,x1,x2) => x0.sqlite3_result_int64(x1,x2),
      tK: (x0,x1,x2) => x0.getFileHandle(x1,x2),
      tL: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1,x2) { return wasmFunction(f,arguments.length,x0,x1,x2) }),
      tM: (x0,x1) => x0.forEach(x1),
      tN: x0 => x0.decode(),
      tO: x0 => x0.rasterEndMilliseconds,
      tP: (x0,x1,x2) => ({width: x0,height: x1,facingMode: x2}),
      tQ: (x0,x1) => { x0.lang = x1 },
      tR: x0 => x0.width,
      u: () => [],
      uB: (o, start, length) => new Float64Array(o.buffer, o.byteOffset + start, length),
      uC: (x0,x1) => x0.createElement(x1),
      uD: x0 => x0.region,
      uE: (o, p, r) => o.replaceAll(p, () => r),
      uF: x0 => x0.now(),
      uG: x0 => x0.pathname,
      uH: (x0,x1) => x0.vibrate(x1),
      uI: (x0,x1) => x0.postMessage(x1),
      uJ: (x0,x1) => x0.sqlite3_result_null(x1),
      uK: x0 => ({create: x0}),
      uL: (x0,x1) => x0.getBigInt64(x1),
      uM: x0 => x0.name,
      uN: (x0,x1,x2,x3) => x0.open(x1,x2,x3),
      uO: x0 => x0.rasterStartMilliseconds,
      uP: (x0,x1) => x0.getUserMedia(x1),
      uQ: (x0,x1) => { x0.type = x1 },
      uR: x0 => x0.remove(),
      v: (a, i) => a.push(i),
      vB: (o, start, length) => new Float32Array(o.buffer, o.byteOffset + start, length),
      vC: x0 => x0.scale,
      vD: x0 => x0.script,
      vE: x0 => x0.deltaMode,
      vF: x0 => x0.performance,
      vG: x0 => x0.parentElement,
      vH: x0 => x0.content,
      vI: x0 => x0.close(),
      vJ: (x0,x1) => x0.sqlite3_value_blob(x1),
      vK: (x0,x1,x2) => x0.getDirectoryHandle(x1,x2),
      vL: (x0,x1) => x0.getInt32(x1),
      vM: x0 => x0.statusText,
      vN: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      vO: x0 => x0.imageBitmaps,
      vP: x0 => x0.deviceId,
      vQ: (x0,x1) => { x0.defer = x1 },
      vR: (x0,x1) => { x0.src = x1 },
      w: x0 => new Int8Array(x0),
      wB: (o, start, length) => new Uint32Array(o.buffer, o.byteOffset + start, length),
      wC: x0 => x0.visualViewport,
      wD: x0 => x0.language,
      wE: x0 => x0.deltaY,
      wF: x0 => new Uint8Array(x0),
      wG: (x0,x1) => x0.querySelectorAll(x1),
      wH: x0 => x0.document,
      wI: (x0,x1) => ({i: x0,p: x1}),
      wJ: (x0,x1) => x0.sqlite3_value_bytes(x1),
      wK: (x0,x1) => new URL(x0,x1),
      wL: (x0,x1) => x0.read(x1),
      wM: x0 => x0.url,
      wN: (x0,x1,x2) => x0.addEventListener(x1,x2),
      wO: x0 => x0.canvasKitMaximumSurfaces,
      wP: x0 => x0.getCapabilities(),
      wQ: (x0,x1) => { x0.async = x1 },
      wR: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
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
      xF: (x0,x1,x2) => x0.slice(x1,x2),
      xG: (x0,x1) => x0.removeProperty(x1),
      xH: (x0,x1,x2) => x0.insertBefore(x1,x2),
      xI: () => new Array(),
      xJ: (x0,x1) => x0.sqlite3_value_text(x1),
      xK: x0 => x0.pathname,
      xL: (x0,x1,x2) => x0.read(x1,x2),
      xM: x0 => x0.status,
      xN: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      xO: x0 => x0.nextSibling,
      xP: () => ({}),
      xQ: (x0,x1) => { x0.id = x1 },
      xR: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      y: x0 => new Uint8Array(x0),
      yB: (o, start, length) => new Uint16Array(o.buffer, o.byteOffset + start, length),
      yC: x0 => x0.height,
      yD: (x0,x1) => x0.observe(x1),
      yE: x0 => x0.wheelDeltaY,
      yF: (x0,x1) => x0.decode(x1),
      yG: (x0,x1) => x0.add(x1),
      yH: x0 => x0.id,
      yI: (x0,x1) => ({c: x0,r: x1}),
      yJ: (x0,x1) => x0.sqlite3_value_double(x1),
      yK: x0 => x0.getDirectory(),
      yL: x0 => x0.flush(),
      yM: x0 => x0.getReader(),
      yN: x0 => x0.send(),
      yO: (x0,x1) => x0.debug(x1),
      yP: (x0,x1) => x0.applyConstraints(x1),
      yQ: x0 => x0.videoHeight,
      yR: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      z: x0 => new Uint8ClampedArray(x0),
      zB: (o, start, length) => new Int16Array(o.buffer, o.byteOffset + start, length),
      zC: x0 => x0.width,
      zD: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1) { return wasmFunction(f,arguments.length,x0,x1) }),
      zE: x0 => x0.wheelDeltaX,
      zF: (x0,x1) => x0.adoptText(x1),
      zG: x0 => x0.data,
      zH: x0 => x0.offsetHeight,
      zI: (x0,x1) => { x0.onmessage = x1 },
      zJ: (x0,x1) => x0.sqlite3_value_int64(x1),
      zK: x0 => x0.storage,
      zL: () => globalThis.WebAssembly,
      zM: x0 => x0.read(),
      zN: x0 => x0.status,
      zO: x0 => x0.hostElement,
      zP: (x0,x1) => { x0.whiteBalanceMode = x1 },
      zQ: x0 => x0.videoWidth,
      zR: (x0,x1) => { x0.oncancel = x1 },

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
