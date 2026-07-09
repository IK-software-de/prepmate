// Compiles a dart2wasm-generated main module from `source` which can then
// instantiatable via the `instantiate` method.
//
// `source` needs to be a `Response` object (or promise thereof) e.g. created
// via the `fetch()` JS API.
export async function compileStreaming(source) {
  const builtins = {builtins: ['js-string']};
  return new CompiledApp(
      await WebAssembly.compileStreaming(source, builtins), builtins);
}

// Compiles a dart2wasm-generated wasm modules from `bytes` which is then
// instantiatable via the `instantiate` method.
export async function compile(bytes) {
  const builtins = {builtins: ['js-string']};
  return new CompiledApp(await WebAssembly.compile(bytes, builtins), builtins);
}

// DEPRECATED: Please use `compile` or `compileStreaming` to get a compiled app,
// use `instantiate` method to get an instantiated app and then call
// `invokeMain` to invoke the main function.
export async function instantiate(modulePromise, importObjectPromise) {
  var moduleOrCompiledApp = await modulePromise;
  if (!(moduleOrCompiledApp instanceof CompiledApp)) {
    moduleOrCompiledApp = new CompiledApp(moduleOrCompiledApp);
  }
  const instantiatedApp = await moduleOrCompiledApp.instantiate(await importObjectPromise);
  return instantiatedApp.instantiatedModule;
}

// DEPRECATED: Please use `compile` or `compileStreaming` to get a compiled app,
// use `instantiate` method to get an instantiated app and then call
// `invokeMain` to invoke the main function.
export const invoke = (moduleInstance, ...args) => {
  moduleInstance.exports.$invokeMain(args);
}

class CompiledApp {
  constructor(module, builtins) {
    this.module = module;
    this.builtins = builtins;
  }

  // The second argument is an options object containing:
  // `loadDeferredModules` is a JS function that takes an array of module names
  //   matching wasm files produced by the dart2wasm compiler. It also takes a
  //   callback that should be invoked for each loaded module with 2 arugments:
  //   (1) the module name, (2) the loaded module in a format supported by
  //   `WebAssembly.compile` or `WebAssembly.compileStreaming`. The callback
  //   returns a Promise that resolves when the module is instantiated.
  //   loadDeferredModules should return a Promise that resolves when all the
  //   modules have been loaded and the callback promises have resolved.
  // `loadDeferredId` is a JS function that takes load ID produced by the
  //   compiler when the `load-ids` option is passed. Each load ID maps to one
  //   or more wasm files as specified in the emitted JSON file. It also takes a
  //   callback that should be invoked for each loaded module with 2 arugments:
  //   (1) the module name, (2) the loaded module in a format supported by
  //   `WebAssembly.compile` or `WebAssembly.compileStreaming`. The callback
  //   returns a Promise that resolves when the module is instantiated.
  //   loadDeferredModules should return a Promise that resolves when all the
  //   modules have been loaded and the callback promises have resolved.
  // `loadDynamicModule` is a JS function that takes two string names matching,
  //   in order, a wasm file produced by the dart2wasm compiler during dynamic
  //   module compilation and a corresponding js file produced by the same
  //   compilation. It also takes a callback that should be invoked with the
  //   loaded module in a format supported by `WebAssembly.compile` or
  //   `WebAssembly.compileStreaming` and the result of using the JS 'import'
  //   API on the js file path. It should return a Promise that resolves when
  //   all the modules have been loaded and the callback promises have resolved.
  async instantiate(additionalImports,
      {loadDeferredModules, loadDynamicModule, loadDeferredId} = {}) {
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
            _1: (decoder, codeUnits) => decoder.decode(codeUnits),
      _2: () => new TextDecoder("utf-8", {fatal: true}),
      _3: () => new TextDecoder("utf-8", {fatal: false}),
      _4: (s) => +s,
      _5: x0 => new Uint8Array(x0),
      _6: (x0,x1,x2) => x0.set(x1,x2),
      _7: (x0,x1) => x0.transferFromImageBitmap(x1),
      _9: (x0,x1,x2) => x0.slice(x1,x2),
      _10: (x0,x1) => x0.decode(x1),
      _11: (x0,x1) => x0.segment(x1),
      _12: () => new TextDecoder(),
      _13: (x0,x1) => x0.get(x1),
      _14: x0 => x0.buffer,
      _15: x0 => x0.wasmMemory,
      _16: () => globalThis.window._flutter_skwasmInstance,
      _17: x0 => x0.rasterStartMilliseconds,
      _18: x0 => x0.rasterEndMilliseconds,
      _19: x0 => x0.imageBitmaps,
      _135: (x0,x1) => x0.appendChild(x1),
      _166: (x0,x1,x2) => x0.addEventListener(x1,x2),
      _167: (x0,x1,x2) => x0.removeEventListener(x1,x2),
      _168: (x0,x1) => new OffscreenCanvas(x0,x1),
      _169: x0 => x0.remove(),
      _170: (x0,x1) => x0.append(x1),
      _172: x0 => x0.unlock(),
      _173: x0 => x0.getReader(),
      _174: (x0,x1) => x0.item(x1),
      _175: x0 => x0.next(),
      _176: x0 => x0.now(),
      _177: (x0,x1) => x0.revokeObjectURL(x1),
      _178: x0 => x0.close(),
      _179: (x0,x1,x2,x3,x4) => ({type: x0,data: x1,premultiplyAlpha: x2,colorSpaceConversion: x3,preferAnimation: x4}),
      _180: x0 => new window.ImageDecoder(x0),
      _181: (x0,x1) => ({frameIndex: x0,completeFramesOnly: x1}),
      _182: (x0,x1) => x0.decode(x1),
      _183: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._183(f,arguments.length,x0) }),
      _184: (x0,x1,x2,x3) => x0.addEventListener(x1,x2,x3),
      _186: (x0,x1) => x0.getModifierState(x1),
      _187: x0 => x0.preventDefault(),
      _188: x0 => x0.stopPropagation(),
      _189: (x0,x1) => x0.removeProperty(x1),
      _190: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._190(f,arguments.length,x0) }),
      _191: x0 => new window.FinalizationRegistry(x0),
      _192: (x0,x1,x2,x3) => x0.register(x1,x2,x3),
      _194: (x0,x1) => x0.unregister(x1),
      _195: (x0,x1) => x0.prepend(x1),
      _196: x0 => new Intl.Locale(x0),
      _197: (x0,x1) => x0.observe(x1),
      _198: x0 => x0.disconnect(),
      _199: (x0,x1) => x0.getAttribute(x1),
      _200: (x0,x1) => x0.contains(x1),
      _201: (x0,x1) => x0.querySelector(x1),
      _202: (x0,x1) => x0.matchMedia(x1),
      _203: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._203(f,arguments.length,x0) }),
      _204: (x0,x1,x2) => x0.call(x1,x2),
      _205: x0 => x0.blur(),
      _206: x0 => x0.hasFocus(),
      _207: (x0,x1) => x0.removeAttribute(x1),
      _208: (x0,x1,x2) => x0.insertBefore(x1,x2),
      _209: (x0,x1) => x0.hasAttribute(x1),
      _210: (x0,x1) => x0.getModifierState(x1),
      _211: (x0,x1) => x0.createTextNode(x1),
      _212: x0 => x0.getBoundingClientRect(),
      _213: (x0,x1) => x0.replaceWith(x1),
      _214: (x0,x1) => x0.contains(x1),
      _215: (x0,x1) => x0.closest(x1),
      _216: () => new Array(),
      _653: x0 => new Uint8Array(x0),
      _656: () => globalThis.window.flutterConfiguration,
      _658: x0 => x0.assetBase,
      _663: x0 => x0.canvasKitMaximumSurfaces,
      _664: x0 => x0.debugShowSemanticsNodes,
      _665: x0 => x0.hostElement,
      _666: x0 => x0.multiViewEnabled,
      _667: x0 => x0.nonce,
      _669: x0 => x0.fontFallbackBaseUrl,
      _679: x0 => x0.console,
      _680: x0 => x0.devicePixelRatio,
      _681: x0 => x0.document,
      _682: x0 => x0.history,
      _683: x0 => x0.innerHeight,
      _684: x0 => x0.innerWidth,
      _685: x0 => x0.location,
      _686: x0 => x0.navigator,
      _687: x0 => x0.visualViewport,
      _688: x0 => x0.performance,
      _689: x0 => x0.parent,
      _691: x0 => x0.URL,
      _693: (x0,x1) => x0.getComputedStyle(x1),
      _694: x0 => x0.screen,
      _695: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._695(f,arguments.length,x0) }),
      _696: (x0,x1) => x0.requestAnimationFrame(x1),
      _700: (x0,x1) => x0.warn(x1),
      _702: (x0,x1) => x0.debug(x1),
      _703: x0 => globalThis.parseFloat(x0),
      _704: () => globalThis.window,
      _705: () => globalThis.Intl,
      _706: () => globalThis.Symbol,
      _707: (x0,x1,x2,x3,x4) => globalThis.createImageBitmap(x0,x1,x2,x3,x4),
      _709: x0 => x0.clipboard,
      _710: x0 => x0.maxTouchPoints,
      _711: x0 => x0.vendor,
      _712: x0 => x0.language,
      _713: x0 => x0.platform,
      _714: x0 => x0.userAgent,
      _715: (x0,x1) => x0.vibrate(x1),
      _716: x0 => x0.languages,
      _717: x0 => x0.documentElement,
      _718: (x0,x1) => x0.querySelector(x1),
      _719: (x0,x1) => x0.querySelectorAll(x1),
      _721: (x0,x1) => x0.createElement(x1),
      _724: (x0,x1) => x0.createEvent(x1),
      _725: x0 => x0.activeElement,
      _728: x0 => x0.head,
      _729: x0 => x0.body,
      _731: (x0,x1) => { x0.title = x1 },
      _734: x0 => x0.visibilityState,
      _735: () => globalThis.document,
      _736: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._736(f,arguments.length,x0) }),
      _737: (x0,x1) => x0.dispatchEvent(x1),
      _745: x0 => x0.target,
      _747: x0 => x0.timeStamp,
      _748: x0 => x0.type,
      _750: (x0,x1,x2,x3) => x0.initEvent(x1,x2,x3),
      _757: x0 => x0.firstChild,
      _761: x0 => x0.parentElement,
      _763: (x0,x1) => { x0.textContent = x1 },
      _764: x0 => x0.parentNode,
      _765: x0 => x0.nextSibling,
      _766: (x0,x1) => x0.removeChild(x1),
      _767: x0 => x0.isConnected,
      _775: x0 => x0.clientHeight,
      _776: x0 => x0.clientWidth,
      _777: x0 => x0.offsetHeight,
      _778: x0 => x0.offsetWidth,
      _779: x0 => x0.id,
      _780: (x0,x1) => { x0.id = x1 },
      _783: (x0,x1) => { x0.spellcheck = x1 },
      _784: x0 => x0.tagName,
      _785: x0 => x0.style,
      _787: (x0,x1) => x0.querySelectorAll(x1),
      _788: (x0,x1,x2) => x0.setAttribute(x1,x2),
      _789: x0 => x0.tabIndex,
      _790: (x0,x1) => { x0.tabIndex = x1 },
      _791: (x0,x1) => x0.focus(x1),
      _792: x0 => x0.scrollTop,
      _793: (x0,x1) => { x0.scrollTop = x1 },
      _794: (x0,x1) => { x0.scrollLeft = x1 },
      _795: x0 => x0.scrollLeft,
      _796: x0 => x0.classList,
      _797: (x0,x1) => x0.scrollIntoView(x1),
      _800: (x0,x1) => { x0.className = x1 },
      _802: (x0,x1) => x0.getElementsByClassName(x1),
      _803: x0 => x0.click(),
      _804: (x0,x1) => x0.attachShadow(x1),
      _807: x0 => x0.computedStyleMap(),
      _808: (x0,x1) => x0.get(x1),
      _814: (x0,x1) => x0.getPropertyValue(x1),
      _815: (x0,x1,x2,x3) => x0.setProperty(x1,x2,x3),
      _816: x0 => x0.offsetLeft,
      _817: x0 => x0.offsetTop,
      _818: x0 => x0.offsetParent,
      _820: (x0,x1) => { x0.name = x1 },
      _821: x0 => x0.content,
      _822: (x0,x1) => { x0.content = x1 },
      _826: (x0,x1) => { x0.src = x1 },
      _827: x0 => x0.naturalWidth,
      _828: x0 => x0.naturalHeight,
      _832: (x0,x1) => { x0.crossOrigin = x1 },
      _834: (x0,x1) => { x0.decoding = x1 },
      _835: x0 => x0.decode(),
      _840: (x0,x1) => { x0.nonce = x1 },
      _845: (x0,x1) => { x0.width = x1 },
      _847: (x0,x1) => { x0.height = x1 },
      _850: (x0,x1) => x0.getContext(x1),
      _918: x0 => x0.width,
      _919: x0 => x0.height,
      _921: (x0,x1) => x0.fetch(x1),
      _922: x0 => x0.status,
      _923: x0 => x0.headers,
      _924: x0 => x0.body,
      _925: x0 => x0.arrayBuffer(),
      _928: x0 => x0.read(),
      _929: x0 => x0.value,
      _930: x0 => x0.done,
      _937: x0 => x0.name,
      _938: x0 => x0.x,
      _939: x0 => x0.y,
      _942: x0 => x0.top,
      _943: x0 => x0.right,
      _944: x0 => x0.bottom,
      _945: x0 => x0.left,
      _955: x0 => x0.height,
      _956: x0 => x0.width,
      _957: x0 => x0.scale,
      _958: (x0,x1) => { x0.value = x1 },
      _961: (x0,x1) => { x0.placeholder = x1 },
      _963: (x0,x1) => { x0.name = x1 },
      _964: x0 => x0.selectionDirection,
      _965: x0 => x0.selectionStart,
      _966: x0 => x0.selectionEnd,
      _969: x0 => x0.value,
      _971: (x0,x1,x2) => x0.setSelectionRange(x1,x2),
      _972: x0 => x0.readText(),
      _973: (x0,x1) => x0.writeText(x1),
      _975: x0 => x0.altKey,
      _976: x0 => x0.code,
      _977: x0 => x0.ctrlKey,
      _978: x0 => x0.key,
      _979: x0 => x0.keyCode,
      _980: x0 => x0.location,
      _981: x0 => x0.metaKey,
      _982: x0 => x0.repeat,
      _983: x0 => x0.shiftKey,
      _984: x0 => x0.isComposing,
      _986: x0 => x0.state,
      _987: (x0,x1) => x0.go(x1),
      _989: (x0,x1,x2,x3) => x0.pushState(x1,x2,x3),
      _990: (x0,x1,x2,x3) => x0.replaceState(x1,x2,x3),
      _991: x0 => x0.pathname,
      _992: x0 => x0.search,
      _993: x0 => x0.hash,
      _997: x0 => x0.state,
      _1000: (x0,x1) => x0.createObjectURL(x1),
      _1002: x0 => new Blob(x0),
      _1012: x0 => x0.matches,
      _1016: x0 => x0.matches,
      _1020: x0 => x0.relatedTarget,
      _1022: x0 => x0.clientX,
      _1023: x0 => x0.clientY,
      _1024: x0 => x0.offsetX,
      _1025: x0 => x0.offsetY,
      _1028: x0 => x0.button,
      _1029: x0 => x0.buttons,
      _1030: x0 => x0.ctrlKey,
      _1034: x0 => x0.pointerId,
      _1035: x0 => x0.pointerType,
      _1036: x0 => x0.pressure,
      _1037: x0 => x0.tiltX,
      _1038: x0 => x0.tiltY,
      _1039: x0 => x0.getCoalescedEvents(),
      _1042: x0 => x0.deltaX,
      _1043: x0 => x0.deltaY,
      _1044: x0 => x0.wheelDeltaX,
      _1045: x0 => x0.wheelDeltaY,
      _1046: x0 => x0.deltaMode,
      _1053: x0 => x0.changedTouches,
      _1056: x0 => x0.clientX,
      _1057: x0 => x0.clientY,
      _1060: x0 => x0.data,
      _1063: (x0,x1) => { x0.disabled = x1 },
      _1065: (x0,x1) => { x0.type = x1 },
      _1066: (x0,x1) => { x0.max = x1 },
      _1067: (x0,x1) => { x0.min = x1 },
      _1068: x0 => x0.value,
      _1069: (x0,x1) => { x0.value = x1 },
      _1070: x0 => x0.disabled,
      _1071: (x0,x1) => { x0.disabled = x1 },
      _1073: (x0,x1) => { x0.placeholder = x1 },
      _1075: (x0,x1) => { x0.name = x1 },
      _1076: (x0,x1) => { x0.autocomplete = x1 },
      _1078: x0 => x0.selectionDirection,
      _1079: x0 => x0.selectionStart,
      _1081: x0 => x0.selectionEnd,
      _1084: (x0,x1,x2) => x0.setSelectionRange(x1,x2),
      _1085: (x0,x1) => x0.add(x1),
      _1087: (x0,x1) => { x0.noValidate = x1 },
      _1088: (x0,x1) => { x0.method = x1 },
      _1089: (x0,x1) => { x0.action = x1 },
      _1114: x0 => x0.orientation,
      _1115: x0 => x0.width,
      _1116: x0 => x0.height,
      _1117: (x0,x1) => x0.lock(x1),
      _1136: x0 => new ResizeObserver(x0),
      _1139: (module,f) => finalizeWrapper(f, function(x0,x1) { return module.exports._1139(f,arguments.length,x0,x1) }),
      _1147: x0 => x0.length,
      _1148: x0 => x0.iterator,
      _1149: x0 => x0.Segmenter,
      _1150: x0 => x0.v8BreakIterator,
      _1151: (x0,x1) => new Intl.Segmenter(x0,x1),
      _1154: x0 => x0.language,
      _1155: x0 => x0.script,
      _1156: x0 => x0.region,
      _1174: x0 => x0.done,
      _1175: x0 => x0.value,
      _1176: x0 => x0.index,
      _1180: (x0,x1) => new Intl.v8BreakIterator(x0,x1),
      _1181: (x0,x1) => x0.adoptText(x1),
      _1182: x0 => x0.first(),
      _1183: x0 => x0.next(),
      _1184: x0 => x0.current(),
      _1186: () => globalThis.window.FinalizationRegistry,
      _1197: x0 => x0.hostElement,
      _1198: x0 => x0.viewConstraints,
      _1201: x0 => x0.maxHeight,
      _1202: x0 => x0.maxWidth,
      _1203: x0 => x0.minHeight,
      _1204: x0 => x0.minWidth,
      _1205: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1205(f,arguments.length,x0) }),
      _1206: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1206(f,arguments.length,x0) }),
      _1207: (x0,x1) => ({addView: x0,removeView: x1}),
      _1210: x0 => x0.loader,
      _1211: () => globalThis._flutter,
      _1212: (x0,x1) => x0.didCreateEngineInitializer(x1),
      _1213: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1213(f,arguments.length,x0) }),
      _1214: (module,f) => finalizeWrapper(f, function() { return module.exports._1214(f,arguments.length) }),
      _1215: (x0,x1) => ({initializeEngine: x0,autoStart: x1}),
      _1218: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1218(f,arguments.length,x0) }),
      _1219: x0 => ({runApp: x0}),
      _1221: (module,f) => finalizeWrapper(f, function(x0,x1) { return module.exports._1221(f,arguments.length,x0,x1) }),
      _1222: x0 => new Promise(x0),
      _1223: x0 => x0.length,
      _1224: () => globalThis.window.ImageDecoder,
      _1225: x0 => x0.tracks,
      _1227: x0 => x0.completed,
      _1229: x0 => x0.image,
      _1235: x0 => x0.displayWidth,
      _1236: x0 => x0.displayHeight,
      _1237: x0 => x0.duration,
      _1240: x0 => x0.ready,
      _1241: x0 => x0.selectedTrack,
      _1242: x0 => x0.repetitionCount,
      _1243: x0 => x0.frameCount,
      _1292: x0 => globalThis.URL.revokeObjectURL(x0),
      _1293: x0 => x0.remove(),
      _1294: (x0,x1,x2,x3) => x0.drawImage(x1,x2,x3),
      _1295: (x0,x1,x2,x3,x4,x5) => x0.drawImage(x1,x2,x3,x4,x5),
      _1296: x0 => globalThis.URL.createObjectURL(x0),
      _1297: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1297(f,arguments.length,x0) }),
      _1298: (x0,x1,x2,x3) => x0.toBlob(x1,x2,x3),
      _1299: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1299(f,arguments.length,x0) }),
      _1300: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1300(f,arguments.length,x0) }),
      _1301: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1301(f,arguments.length,x0) }),
      _1302: (x0,x1) => x0.querySelector(x1),
      _1303: (x0,x1) => x0.createElement(x1),
      _1304: (x0,x1) => x0.append(x1),
      _1305: (x0,x1,x2) => x0.setAttribute(x1,x2),
      _1306: (x0,x1) => x0.replaceChildren(x1),
      _1307: x0 => x0.click(),
      _1308: (x0,x1) => x0.canShare(x1),
      _1309: (x0,x1) => x0.share(x1),
      _1312: (x0,x1) => ({files: x0,text: x1}),
      _1314: x0 => ({files: x0}),
      _1316: x0 => ({text: x0}),
      _1319: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1319(f,arguments.length,x0) }),
      _1320: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1320(f,arguments.length,x0) }),
      _1321: x0 => x0.getVideoTracks(),
      _1322: x0 => x0.getSupportedConstraints(),
      _1323: x0 => ({video: x0}),
      _1324: x0 => ({facingMode: x0}),
      _1325: (x0,x1) => x0.getUserMedia(x1),
      _1327: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1327(f,arguments.length,x0) }),
      _1328: (x0,x1) => x0.removeChild(x1),
      _1329: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1329(f,arguments.length,x0) }),
      _1330: (x0,x1) => x0.appendChild(x1),
      _1331: () => new Map(),
      _1332: (x0,x1,x2) => x0.set(x1,x2),
      _1333: (x0,x1,x2,x3) => x0.call(x1,x2,x3),
      _1334: (module,f) => finalizeWrapper(f, function(x0,x1) { return module.exports._1334(f,arguments.length,x0,x1) }),
      _1335: (x0,x1) => x0.call(x1),
      _1336: (x0,x1) => new ZXing.BrowserMultiFormatReader(x0,x1),
      _1338: x0 => x0.play(),
      _1344: (x0,x1) => x0.createElement(x1),
      _1350: (x0,x1,x2) => x0.addEventListener(x1,x2),
      _1352: (x0,x1,x2,x3) => x0.addEventListener(x1,x2,x3),
      _1353: (x0,x1,x2,x3) => x0.removeEventListener(x1,x2,x3),
      _1359: (x0,x1,x2,x3) => x0.open(x1,x2,x3),
      _1364: x0 => x0.decode(),
      _1365: (x0,x1,x2,x3) => x0.open(x1,x2,x3),
      _1366: (x0,x1,x2) => x0.setRequestHeader(x1,x2),
      _1367: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1367(f,arguments.length,x0) }),
      _1368: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1368(f,arguments.length,x0) }),
      _1369: x0 => x0.send(),
      _1370: () => new XMLHttpRequest(),
      _1371: (x0,x1) => x0.getItem(x1),
      _1372: (x0,x1) => x0.removeItem(x1),
      _1373: (x0,x1,x2) => x0.setItem(x1,x2),
      _1377: x0 => x0.barcodeFormat,
      _1378: x0 => x0.text,
      _1379: x0 => x0.rawBytes,
      _1380: x0 => x0.resultPoints,
      _1382: Date.now,
      _1384: s => new Date(s * 1000).getTimezoneOffset() * 60,
      _1385: s => {
        if (!/^\s*[+-]?(?:Infinity|NaN|(?:\.\d+|\d+(?:\.\d*)?)(?:[eE][+-]?\d+)?)\s*$/.test(s)) {
          return NaN;
        }
        return parseFloat(s);
      },
      _1386: () => typeof dartUseDateNowForTicks !== "undefined",
      _1387: () => 1000 * performance.now(),
      _1388: () => Date.now(),
      _1389: () => {
        // On browsers return `globalThis.location.href`
        if (globalThis.location != null) {
          return globalThis.location.href;
        }
        return null;
      },
      _1390: () => {
        return typeof process != "undefined" &&
               Object.prototype.toString.call(process) == "[object process]" &&
               process.platform == "win32"
      },
      _1391: () => new WeakMap(),
      _1392: (map, o) => map.get(o),
      _1393: (map, o, v) => map.set(o, v),
      _1394: x0 => new WeakRef(x0),
      _1395: x0 => x0.deref(),
      _1402: () => globalThis.WeakRef,
      _1405: s => JSON.stringify(s),
      _1406: s => printToConsole(s),
      _1407: o => {
        if (o === null || o === undefined) return 0;
        if (typeof(o) === 'string') return 1;
        return 2;
      },
      _1408: (o, p, r) => o.replaceAll(p, () => r),
      _1409: (o, p, r) => o.replace(p, () => r),
      _1410: Function.prototype.call.bind(String.prototype.toLowerCase),
      _1411: s => s.toUpperCase(),
      _1412: s => s.trim(),
      _1413: s => s.trimLeft(),
      _1414: s => s.trimRight(),
      _1415: (string, times) => string.repeat(times),
      _1416: Function.prototype.call.bind(String.prototype.indexOf),
      _1417: (s, p, i) => s.lastIndexOf(p, i),
      _1418: (string, token) => string.split(token),
      _1419: Object.is,
      _1423: (o, t) => typeof o === t,
      _1424: (o, c) => o instanceof c,
      _1425: o => Object.keys(o),
      _1478: x0 => new Array(x0),
      _1480: x0 => x0.length,
      _1482: (x0,x1) => x0[x1],
      _1483: (x0,x1,x2) => { x0[x1] = x2 },
      _1486: (x0,x1,x2) => new DataView(x0,x1,x2),
      _1488: x0 => new Int8Array(x0),
      _1489: (x0,x1,x2) => new Uint8Array(x0,x1,x2),
      _1491: x0 => new Uint8ClampedArray(x0),
      _1493: x0 => new Int16Array(x0),
      _1495: x0 => new Uint16Array(x0),
      _1497: x0 => new Int32Array(x0),
      _1499: x0 => new Uint32Array(x0),
      _1501: x0 => new Float32Array(x0),
      _1503: x0 => new Float64Array(x0),
      _1527: x0 => x0.random(),
      _1528: (x0,x1) => x0.getRandomValues(x1),
      _1529: () => globalThis.crypto,
      _1530: () => globalThis.Math,
      _1543: (ms, c) =>
      setTimeout(() => dartInstance.exports.$invokeCallback(c),ms),
      _1544: (handle) => clearTimeout(handle),
      _1545: (ms, c) =>
      setInterval(() => dartInstance.exports.$invokeCallback(c), ms),
      _1546: (handle) => clearInterval(handle),
      _1547: (c) =>
      queueMicrotask(() => dartInstance.exports.$invokeCallback(c)),
      _1548: () => Date.now(),
      _1549: () => new Error().stack,
      _1550: (exn) => {
        let stackString = exn.toString();
        let frames = stackString.split('\n');
        let drop = 4;
        if (frames[0].startsWith('Error')) {
            drop += 1;
        }
        return frames.slice(drop).join('\n');
      },
      _1551: (s, m) => {
        try {
          return new RegExp(s, m);
        } catch (e) {
          return String(e);
        }
      },
      _1552: (x0,x1) => x0.exec(x1),
      _1553: (x0,x1) => x0.test(x1),
      _1554: x0 => x0.pop(),
      _1556: o => o === undefined,
      _1558: o => typeof o === 'function' && o[jsWrappedDartFunctionSymbol] === true,
      _1560: o => {
        const proto = Object.getPrototypeOf(o);
        return proto === Object.prototype || proto === null;
      },
      _1561: o => o instanceof RegExp,
      _1562: (l, r) => l === r,
      _1563: o => o,
      _1564: o => {
        if (o === undefined || o === null) return 0;
        if (typeof o === 'number') return 1;
        return 2;
      },
      _1565: o => o,
      _1566: o => {
        if (o === undefined || o === null) return 0;
        if (typeof o === 'boolean') return 1;
        return 2;
      },
      _1567: o => o,
      _1568: b => !!b,
      _1569: o => o.length,
      _1571: (o, i) => o[i],
      _1572: f => f.dartFunction,
      _1573: () => ({}),
      _1574: () => [],
      _1576: () => globalThis,
      _1577: (constructor, args) => {
        const factoryFunction = constructor.bind.apply(
            constructor, [null, ...args]);
        return new factoryFunction();
      },
      _1579: (o, p) => o[p],
      _1580: (o, p, v) => o[p] = v,
      _1581: (o, m, a) => o[m].apply(o, a),
      _1583: o => String(o),
      _1584: (p, s, f) => p.then(s, (e) => f(e, e === undefined)),
      _1585: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1585(f,arguments.length,x0) }),
      _1586: (module,f) => finalizeWrapper(f, function(x0,x1) { return module.exports._1586(f,arguments.length,x0,x1) }),
      _1587: o => {
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
      _1588: o => [o],
      _1589: (o0, o1) => [o0, o1],
      _1590: (o0, o1, o2) => [o0, o1, o2],
      _1591: (o0, o1, o2, o3) => [o0, o1, o2, o3],
      _1592: (exn) => {
        if (exn instanceof Error) {
          return exn.stack;
        } else {
          return null;
        }
      },
      _1593: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const getValue = dartInstance.exports.$wasmI8ArrayGet;
        for (let i = 0; i < length; i++) {
          jsArray[jsArrayOffset + i] = getValue(wasmArray, wasmArrayOffset + i);
        }
      },
      _1594: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const setValue = dartInstance.exports.$wasmI8ArraySet;
        for (let i = 0; i < length; i++) {
          setValue(wasmArray, wasmArrayOffset + i, jsArray[jsArrayOffset + i]);
        }
      },
      _1595: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const getValue = dartInstance.exports.$wasmI16ArrayGet;
        for (let i = 0; i < length; i++) {
          jsArray[jsArrayOffset + i] = getValue(wasmArray, wasmArrayOffset + i);
        }
      },
      _1596: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const setValue = dartInstance.exports.$wasmI16ArraySet;
        for (let i = 0; i < length; i++) {
          setValue(wasmArray, wasmArrayOffset + i, jsArray[jsArrayOffset + i]);
        }
      },
      _1597: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const getValue = dartInstance.exports.$wasmI32ArrayGet;
        for (let i = 0; i < length; i++) {
          jsArray[jsArrayOffset + i] = getValue(wasmArray, wasmArrayOffset + i);
        }
      },
      _1598: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const setValue = dartInstance.exports.$wasmI32ArraySet;
        for (let i = 0; i < length; i++) {
          setValue(wasmArray, wasmArrayOffset + i, jsArray[jsArrayOffset + i]);
        }
      },
      _1599: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const getValue = dartInstance.exports.$wasmF32ArrayGet;
        for (let i = 0; i < length; i++) {
          jsArray[jsArrayOffset + i] = getValue(wasmArray, wasmArrayOffset + i);
        }
      },
      _1600: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const setValue = dartInstance.exports.$wasmF32ArraySet;
        for (let i = 0; i < length; i++) {
          setValue(wasmArray, wasmArrayOffset + i, jsArray[jsArrayOffset + i]);
        }
      },
      _1601: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const getValue = dartInstance.exports.$wasmF64ArrayGet;
        for (let i = 0; i < length; i++) {
          jsArray[jsArrayOffset + i] = getValue(wasmArray, wasmArrayOffset + i);
        }
      },
      _1602: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const setValue = dartInstance.exports.$wasmF64ArraySet;
        for (let i = 0; i < length; i++) {
          setValue(wasmArray, wasmArrayOffset + i, jsArray[jsArrayOffset + i]);
        }
      },
      _1603: x0 => new ArrayBuffer(x0),
      _1604: s => {
        if (/[[\]{}()*+?.\\^$|]/.test(s)) {
            s = s.replace(/[[\]{}()*+?.\\^$|]/g, '\\$&');
        }
        return s;
      },
      _1606: x0 => x0.index,
      _1608: x0 => x0.flags,
      _1609: x0 => x0.multiline,
      _1610: x0 => x0.ignoreCase,
      _1611: x0 => x0.unicode,
      _1612: x0 => x0.dotAll,
      _1613: (x0,x1) => { x0.lastIndex = x1 },
      _1614: (o, p) => p in o,
      _1615: (o, p) => o[p],
      _1833: x0 => new BroadcastChannel(x0),
      _1835: (x0,x1) => x0.postMessage(x1),
      _1836: x0 => x0.close(),
      _1854: () => new XMLHttpRequest(),
      _1855: (x0,x1,x2,x3) => x0.open(x1,x2,x3),
      _1859: x0 => x0.send(),
      _1861: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1861(f,arguments.length,x0) }),
      _1862: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1862(f,arguments.length,x0) }),
      _1867: (x0,x1) => new WebSocket(x0,x1),
      _1868: (x0,x1) => x0.send(x1),
      _1869: (x0,x1,x2) => x0.close(x1,x2),
      _1870: (x0,x1) => x0.close(x1),
      _1871: x0 => x0.close(),
      _1880: () => new FileReader(),
      _1881: (x0,x1) => x0.readAsArrayBuffer(x1),
      _1882: () => new AbortController(),
      _1883: x0 => x0.abort(),
      _1884: (x0,x1,x2,x3,x4,x5) => ({method: x0,headers: x1,body: x2,credentials: x3,redirect: x4,signal: x5}),
      _1885: (x0,x1) => globalThis.fetch(x0,x1),
      _1886: (x0,x1) => x0.get(x1),
      _1887: (module,f) => finalizeWrapper(f, function(x0,x1,x2) { return module.exports._1887(f,arguments.length,x0,x1,x2) }),
      _1888: (x0,x1) => x0.forEach(x1),
      _1889: x0 => x0.getReader(),
      _1890: x0 => x0.cancel(),
      _1891: x0 => x0.read(),
      _1892: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1892(f,arguments.length,x0) }),
      _1893: x0 => x0.attachStreamToVideo,
      _1895: x0 => x0.decodeContinuously,
      _1899: x0 => x0.reset,
      _1901: x0 => x0.stopContinuousDecode,
      _1903: x0 => x0.stream,
      _1904: x0 => x0.videoElement,
      _1905: (x0,x1,x2,x3) => x0.replaceState(x1,x2,x3),
      _1906: (x0,x1) => x0.key(x1),
      _1908: x0 => x0.facingMode,
      _1909: x0 => x0.getSettings(),
      _1910: (x0,x1) => ({width: x0,height: x1}),
      _1911: (x0,x1,x2) => ({width: x0,height: x1,facingMode: x2}),
      _1912: (x0,x1) => x0.item(x1),
      _1913: o => o instanceof Array,
      _1917: a => a.pop(),
      _1918: (a, i) => a.splice(i, 1),
      _1919: (a, s) => a.join(s),
      _1920: (a, s, e) => a.slice(s, e),
      _1922: (a, b) => a == b ? 0 : (a > b ? 1 : -1),
      _1923: a => a.length,
      _1925: (a, i) => a[i],
      _1926: (a, i, v) => a[i] = v,
      _1928: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof ArrayBuffer) return 1;
        if (globalThis.SharedArrayBuffer !== undefined &&
            o instanceof SharedArrayBuffer) {
          return 2;
        }
        return 3;
      },
      _1929: (o, offsetInBytes, lengthInBytes) => {
        var dst = new ArrayBuffer(lengthInBytes);
        new Uint8Array(dst).set(new Uint8Array(o, offsetInBytes, lengthInBytes));
        return new DataView(dst);
      },
      _1931: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof Uint8Array) return 1;
        return 2;
      },
      _1932: (o, start, length) => new Uint8Array(o.buffer, o.byteOffset + start, length),
      _1933: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof Int8Array) return 1;
        return 2;
      },
      _1934: (o, start, length) => new Int8Array(o.buffer, o.byteOffset + start, length),
      _1935: o => o instanceof Uint8ClampedArray,
      _1936: (o, start, length) => new Uint8ClampedArray(o.buffer, o.byteOffset + start, length),
      _1937: o => o instanceof Uint16Array,
      _1938: (o, start, length) => new Uint16Array(o.buffer, o.byteOffset + start, length),
      _1939: o => o instanceof Int16Array,
      _1940: (o, start, length) => new Int16Array(o.buffer, o.byteOffset + start, length),
      _1941: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof Uint32Array) return 1;
        return 2;
      },
      _1942: (o, start, length) => new Uint32Array(o.buffer, o.byteOffset + start, length),
      _1943: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof Int32Array) return 1;
        return 2;
      },
      _1944: (o, start, length) => new Int32Array(o.buffer, o.byteOffset + start, length),
      _1946: (o, start, length) => new BigInt64Array(o.buffer, o.byteOffset + start, length),
      _1947: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof Float32Array) return 1;
        return 2;
      },
      _1948: (o, start, length) => new Float32Array(o.buffer, o.byteOffset + start, length),
      _1949: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof Float64Array) return 1;
        return 2;
      },
      _1950: (o, start, length) => new Float64Array(o.buffer, o.byteOffset + start, length),
      _1951: (a, i) => a.push(i),
      _1952: (t, s) => t.set(s),
      _1953: l => new DataView(new ArrayBuffer(l)),
      _1954: (o) => new DataView(o.buffer, o.byteOffset, o.byteLength),
      _1955: o => o.byteLength,
      _1956: o => o.buffer,
      _1957: o => o.byteOffset,
      _1958: Function.prototype.call.bind(Object.getOwnPropertyDescriptor(DataView.prototype, 'byteLength').get),
      _1959: (b, o) => new DataView(b, o),
      _1960: (b, o, l) => new DataView(b, o, l),
      _1961: Function.prototype.call.bind(DataView.prototype.getUint8),
      _1962: Function.prototype.call.bind(DataView.prototype.setUint8),
      _1963: Function.prototype.call.bind(DataView.prototype.getInt8),
      _1964: Function.prototype.call.bind(DataView.prototype.setInt8),
      _1965: Function.prototype.call.bind(DataView.prototype.getUint16),
      _1966: Function.prototype.call.bind(DataView.prototype.setUint16),
      _1967: Function.prototype.call.bind(DataView.prototype.getInt16),
      _1968: Function.prototype.call.bind(DataView.prototype.setInt16),
      _1969: Function.prototype.call.bind(DataView.prototype.getUint32),
      _1970: Function.prototype.call.bind(DataView.prototype.setUint32),
      _1971: Function.prototype.call.bind(DataView.prototype.getInt32),
      _1972: Function.prototype.call.bind(DataView.prototype.setInt32),
      _1975: Function.prototype.call.bind(DataView.prototype.getBigInt64),
      _1976: Function.prototype.call.bind(DataView.prototype.setBigInt64),
      _1977: Function.prototype.call.bind(DataView.prototype.getFloat32),
      _1978: Function.prototype.call.bind(DataView.prototype.setFloat32),
      _1979: Function.prototype.call.bind(DataView.prototype.getFloat64),
      _1980: Function.prototype.call.bind(DataView.prototype.setFloat64),
      _1981: Function.prototype.call.bind(Number.prototype.toString),
      _1982: Function.prototype.call.bind(BigInt.prototype.toString),
      _1983: Function.prototype.call.bind(Number.prototype.toString),
      _1984: (d, digits) => d.toFixed(digits),
      _1990: (x0,x1) => x0.getContext(x1),
      _2006: () => globalThis.document,
      _2008: () => globalThis.console,
      _2013: (x0,x1) => { x0.height = x1 },
      _2015: (x0,x1) => { x0.width = x1 },
      _2017: (x0,x1) => { x0.pointerEvents = x1 },
      _2026: x0 => x0.style,
      _2029: x0 => x0.src,
      _2030: (x0,x1) => { x0.src = x1 },
      _2031: x0 => x0.naturalWidth,
      _2032: x0 => x0.naturalHeight,
      _2047: (x0,x1) => x0.error(x1),
      _2052: x0 => x0.status,
      _2053: (x0,x1) => { x0.responseType = x1 },
      _2055: x0 => x0.response,
      _2056: x0 => x0.x,
      _2057: x0 => x0.y,
      _2106: (x0,x1) => { x0.responseType = x1 },
      _2107: x0 => x0.response,
      _2154: (x0,x1) => { x0.lang = x1 },
      _2183: x0 => x0.style,
      _2196: (x0,x1) => { x0.oncancel = x1 },
      _2202: (x0,x1) => { x0.onchange = x1 },
      _2242: (x0,x1) => { x0.onerror = x1 },
      _2258: (x0,x1) => { x0.onload = x1 },
      _2282: (x0,x1) => { x0.onpause = x1 },
      _2284: (x0,x1) => { x0.onplay = x1 },
      _2615: (x0,x1) => { x0.src = x1 },
      _2626: x0 => x0.width,
      _2628: x0 => x0.height,
      _2755: x0 => x0.videoWidth,
      _2756: x0 => x0.videoHeight,
      _2804: x0 => x0.paused,
      _2819: (x0,x1) => { x0.controls = x1 },
      _3110: (x0,x1) => { x0.accept = x1 },
      _3124: x0 => x0.files,
      _3150: (x0,x1) => { x0.multiple = x1 },
      _3168: (x0,x1) => { x0.type = x1 },
      _3418: (x0,x1) => { x0.src = x1 },
      _3420: (x0,x1) => { x0.type = x1 },
      _3424: (x0,x1) => { x0.async = x1 },
      _3426: (x0,x1) => { x0.defer = x1 },
      _3428: (x0,x1) => { x0.crossOrigin = x1 },
      _3462: x0 => x0.width,
      _3463: (x0,x1) => { x0.width = x1 },
      _3464: x0 => x0.height,
      _3465: (x0,x1) => { x0.height = x1 },
      _3886: () => globalThis.window,
      _3929: x0 => x0.location,
      _3930: x0 => x0.history,
      _3948: x0 => x0.navigator,
      _4212: x0 => x0.localStorage,
      _4220: x0 => x0.href,
      _4318: x0 => x0.mediaDevices,
      _4334: x0 => x0.userAgent,
      _4335: x0 => x0.vendor,
      _4385: x0 => x0.data,
      _4428: (x0,x1) => { x0.onmessage = x1 },
      _4531: x0 => x0.length,
      _4748: x0 => x0.readyState,
      _4761: (x0,x1) => { x0.binaryType = x1 },
      _4764: x0 => x0.code,
      _4765: x0 => x0.reason,
      _6432: x0 => x0.type,
      _6433: x0 => x0.target,
      _6473: x0 => x0.signal,
      _6545: () => globalThis.document,
      _6627: x0 => x0.body,
      _6629: x0 => x0.head,
      _6958: (x0,x1) => { x0.id = x1 },
      _8304: x0 => x0.value,
      _8306: x0 => x0.done,
      _8465: x0 => x0.size,
      _8466: x0 => x0.type,
      _8472: x0 => x0.name,
      _8473: x0 => x0.lastModified,
      _8478: x0 => x0.length,
      _8484: x0 => x0.result,
      _8980: x0 => x0.url,
      _8982: x0 => x0.status,
      _8984: x0 => x0.statusText,
      _8985: x0 => x0.headers,
      _8986: x0 => x0.body,
      _9787: x0 => x0.label,
      _9809: x0 => x0.facingMode,
      _10023: x0 => x0.width,
      _10025: x0 => x0.height,
      _10031: x0 => x0.facingMode,
      _11534: (x0,x1) => { x0.height = x1 },
      _11728: (x0,x1) => { x0.objectFit = x1 },
      _11858: (x0,x1) => { x0.pointerEvents = x1 },
      _12156: (x0,x1) => { x0.transform = x1 },
      _12160: (x0,x1) => { x0.transformOrigin = x1 },
      _12224: (x0,x1) => { x0.width = x1 },
      _12592: x0 => x0.name,
      _12593: x0 => x0.message,
      _13338: x0 => x0.message,

    };

    const baseImports = {
      dart2wasm: dart2wasm,
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
    dartInstance.exports.$setThisModule(dartInstance);

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
