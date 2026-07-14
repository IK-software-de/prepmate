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
      _756: x0 => x0.baseURI,
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
      _1292: (x0,x1) => x0.canShare(x1),
      _1293: (x0,x1) => x0.share(x1),
      _1296: (x0,x1) => ({files: x0,text: x1}),
      _1298: x0 => ({files: x0}),
      _1300: x0 => ({text: x0}),
      _1301: (x0,x1) => x0.createElement(x1),
      _1302: x0 => x0.click(),
      _1303: x0 => x0.remove(),
      _1306: x0 => globalThis.URL.revokeObjectURL(x0),
      _1307: (x0,x1,x2,x3) => x0.drawImage(x1,x2,x3),
      _1308: (x0,x1,x2,x3,x4,x5) => x0.drawImage(x1,x2,x3,x4,x5),
      _1309: x0 => globalThis.URL.createObjectURL(x0),
      _1310: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1310(f,arguments.length,x0) }),
      _1311: (x0,x1,x2,x3) => x0.toBlob(x1,x2,x3),
      _1312: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1312(f,arguments.length,x0) }),
      _1313: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1313(f,arguments.length,x0) }),
      _1314: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1314(f,arguments.length,x0) }),
      _1315: (x0,x1) => x0.querySelector(x1),
      _1316: (x0,x1) => x0.append(x1),
      _1317: (x0,x1,x2) => x0.setAttribute(x1,x2),
      _1318: (x0,x1) => x0.replaceChildren(x1),
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
      _1363: x0 => x0.call(),
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
      _1396: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1396(f,arguments.length,x0) }),
      _1397: x0 => new FinalizationRegistry(x0),
      _1398: (x0,x1,x2,x3) => x0.register(x1,x2,x3),
      _1400: (x0,x1) => x0.unregister(x1),
      _1402: () => globalThis.WeakRef,
      _1403: () => globalThis.FinalizationRegistry,
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
      _1439: (o, a) => o == a,
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
      _1578: (o, p) => p in o,
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
      _1607: x0 => x0.groups,
      _1608: x0 => x0.flags,
      _1609: x0 => x0.multiline,
      _1610: x0 => x0.ignoreCase,
      _1611: x0 => x0.unicode,
      _1612: x0 => x0.dotAll,
      _1613: (x0,x1) => { x0.lastIndex = x1 },
      _1614: (o, p) => p in o,
      _1615: (o, p) => o[p],
      _1616: (o, p, v) => o[p] = v,
      _1618: x0 => x0.arrayBuffer(),
      _1619: (x0,x1) => x0.sqlite3changeset_finalize(x1),
      _1620: (x0,x1) => x0.sqlite3session_delete(x1),
      _1621: (x0,x1) => x0.sqlite3_close_v2(x1),
      _1622: (x0,x1) => x0.sqlite3_finalize(x1),
      _1623: (x0,x1) => x0.dart_sqlite3_malloc(x1),
      _1624: (x0,x1) => x0.dart_sqlite3_free(x1),
      _1626: x0 => x0.sqlite3_initialize(),
      _1632: (x0,x1,x2,x3,x4) => x0.sqlite3_open_v2(x1,x2,x3,x4),
      _1633: (x0,x1) => x0.sqlite3_extended_errcode(x1),
      _1634: (x0,x1) => x0.sqlite3_errmsg(x1),
      _1635: (x0,x1) => x0.sqlite3_errstr(x1),
      _1636: (x0,x1) => x0.sqlite3_error_offset(x1),
      _1637: (x0,x1,x2) => x0.sqlite3_extended_result_codes(x1,x2),
      _1641: (x0,x1,x2,x3,x4,x5) => x0.sqlite3_exec(x1,x2,x3,x4,x5),
      _1642: (x0,x1,x2,x3,x4,x5,x6) => x0.sqlite3_prepare_v3(x1,x2,x3,x4,x5,x6),
      _1643: (x0,x1) => x0.sqlite3_bind_parameter_count(x1),
      _1644: (x0,x1,x2) => x0.sqlite3_bind_null(x1,x2),
      _1645: (x0,x1,x2,x3) => x0.sqlite3_bind_int64(x1,x2,x3),
      _1646: (x0,x1,x2,x3) => x0.sqlite3_bind_double(x1,x2,x3),
      _1647: (x0,x1,x2,x3,x4) => x0.dart_sqlite3_bind_text(x1,x2,x3,x4),
      _1648: (x0,x1,x2,x3,x4) => x0.dart_sqlite3_bind_blob(x1,x2,x3,x4),
      _1650: (x0,x1) => x0.sqlite3_column_count(x1),
      _1651: (x0,x1,x2) => x0.sqlite3_column_name(x1,x2),
      _1652: (x0,x1,x2) => x0.sqlite3_column_type(x1,x2),
      _1653: (x0,x1,x2) => x0.sqlite3_column_int64(x1,x2),
      _1654: (x0,x1,x2) => x0.sqlite3_column_double(x1,x2),
      _1655: (x0,x1,x2) => x0.sqlite3_column_bytes(x1,x2),
      _1656: (x0,x1,x2) => x0.sqlite3_column_text(x1,x2),
      _1657: (x0,x1,x2) => x0.sqlite3_column_blob(x1,x2),
      _1658: (x0,x1) => x0.sqlite3_value_type(x1),
      _1660: (x0,x1) => x0.sqlite3_value_int64(x1),
      _1661: (x0,x1) => x0.sqlite3_value_double(x1),
      _1662: (x0,x1) => x0.sqlite3_value_bytes(x1),
      _1663: (x0,x1) => x0.sqlite3_value_text(x1),
      _1664: (x0,x1) => x0.sqlite3_value_blob(x1),
      _1665: (x0,x1) => x0.sqlite3_result_null(x1),
      _1666: (x0,x1,x2) => x0.sqlite3_result_int64(x1,x2),
      _1667: (x0,x1,x2) => x0.sqlite3_result_double(x1,x2),
      _1668: (x0,x1,x2,x3,x4) => x0.sqlite3_result_text(x1,x2,x3,x4),
      _1669: (x0,x1,x2,x3,x4) => x0.sqlite3_result_blob64(x1,x2,x3,x4),
      _1670: (x0,x1,x2,x3) => x0.sqlite3_result_error(x1,x2,x3),
      _1671: (x0,x1,x2) => x0.sqlite3_result_subtype(x1,x2),
      _1674: (x0,x1) => x0.sqlite3_step(x1),
      _1675: (x0,x1) => x0.sqlite3_reset(x1),
      _1676: (x0,x1) => x0.sqlite3_changes(x1),
      _1677: (x0,x1) => x0.sqlite3_stmt_isexplain(x1),
      _1679: (x0,x1) => x0.sqlite3_last_insert_rowid(x1),
      _1696: (x0,x1,x2,x3) => x0.dart_sqlite3_register_vfs(x1,x2,x3),
      _1699: (x0,x1,x2,x3,x4,x5,x6) => x0.dart_sqlite3_create_function_v2(x1,x2,x3,x4,x5,x6),
      _1704: (x0,x1) => new URL(x0,x1),
      _1705: (x0,x1) => globalThis.fetch(x0,x1),
      _1706: (x0,x1,x2) => x0.postMessage(x1,x2),
      _1707: (x0,x1,x2) => x0.postMessage(x1,x2),
      _1709: (x0,x1) => ({i: x0,p: x1}),
      _1710: (x0,x1) => ({c: x0,r: x1}),
      _1711: x0 => x0.i,
      _1712: x0 => x0.p,
      _1713: x0 => x0.c,
      _1714: x0 => x0.r,
      _1715: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1715(f,arguments.length,x0) }),
      _1716: (x0,x1) => x0.postMessage(x1),
      _1717: x0 => x0.close(),
      _1719: x0 => new Worker(x0),
      _1721: x0 => x0.getDirectory(),
      _1722: x0 => ({create: x0}),
      _1723: (x0,x1,x2) => x0.getFileHandle(x1,x2),
      _1724: x0 => x0.createSyncAccessHandle(),
      _1725: x0 => x0.close(),
      _1728: x0 => x0.close(),
      _1731: (x0,x1,x2) => x0.open(x1,x2),
      _1732: x0 => x0.abort(),
      _1735: (x0,x1,x2) => x0.getDirectoryHandle(x1,x2),
      _1740: x0 => ({create: x0}),
      _1745: (x0,x1) => new SharedWorker(x0,x1),
      _1746: x0 => x0.start(),
      _1747: x0 => x0.terminate(),
      _1748: () => new MessageChannel(),
      _1753: x0 => globalThis.BigInt(x0),
      _1754: x0 => globalThis.Number(x0),
      _1761: () => globalThis.navigator,
      _1762: (x0,x1) => x0.read(x1),
      _1763: (x0,x1,x2) => x0.read(x1,x2),
      _1764: (x0,x1) => x0.write(x1),
      _1765: (x0,x1,x2) => x0.write(x1,x2),
      _1768: x0 => ({at: x0}),
      _1769: x0 => x0.getSize(),
      _1770: (x0,x1) => x0.truncate(x1),
      _1771: x0 => x0.flush(),
      _1774: x0 => x0.synchronizationBuffer,
      _1775: x0 => x0.communicationBuffer,
      _1776: (x0,x1,x2,x3) => ({clientVersion: x0,root: x1,synchronizationBuffer: x2,communicationBuffer: x3}),
      _1777: x0 => new SharedArrayBuffer(x0),
      _1778: x0 => ({autoIncrement: x0}),
      _1779: (x0,x1,x2) => x0.createObjectStore(x1,x2),
      _1780: x0 => ({unique: x0}),
      _1781: (x0,x1,x2,x3) => x0.createIndex(x1,x2,x3),
      _1782: (x0,x1) => x0.createObjectStore(x1),
      _1783: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1783(f,arguments.length,x0) }),
      _1784: (x0,x1,x2) => x0.transaction(x1,x2),
      _1785: x0 => x0.commit(),
      _1786: (x0,x1) => x0.objectStore(x1),
      _1787: (module,f) => finalizeWrapper(f, function() { return module.exports._1787(f,arguments.length) }),
      _1788: x0 => new DOMException(x0),
      _1789: (module,f) => finalizeWrapper(f, function() { return module.exports._1789(f,arguments.length) }),
      _1790: (x0,x1) => globalThis.IDBKeyRange.bound(x0,x1),
      _1792: (x0,x1) => x0.index(x1),
      _1793: x0 => x0.openKeyCursor(),
      _1794: (x0,x1) => x0.getKey(x1),
      _1795: (x0,x1) => x0.get(x1),
      _1796: (x0,x1) => x0.openCursor(x1),
      _1797: (x0,x1) => ({name: x0,length: x1}),
      _1798: (x0,x1) => x0.put(x1),
      _1799: x0 => globalThis.IDBKeyRange.only(x0),
      _1800: (x0,x1,x2) => x0.put(x1,x2),
      _1801: (x0,x1) => x0.update(x1),
      _1802: (x0,x1) => x0.delete(x1),
      _1803: x0 => x0.name,
      _1804: x0 => x0.length,
      _1805: x0 => new BroadcastChannel(x0),
      _1806: x0 => globalThis.Array.isArray(x0),
      _1807: (x0,x1) => x0.postMessage(x1),
      _1808: x0 => x0.close(),
      _1809: (x0,x1) => ({kind: x0,table: x1}),
      _1810: x0 => x0.kind,
      _1811: x0 => x0.table,
      _1812: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1812(f,arguments.length,x0) }),
      _1813: (module,f) => finalizeWrapper(f, function(x0,x1) { return module.exports._1813(f,arguments.length,x0,x1) }),
      _1814: (module,f) => finalizeWrapper(f, function(x0,x1,x2,x3,x4) { return module.exports._1814(f,arguments.length,x0,x1,x2,x3,x4) }),
      _1815: (module,f) => finalizeWrapper(f, function(x0,x1,x2) { return module.exports._1815(f,arguments.length,x0,x1,x2) }),
      _1816: (module,f) => finalizeWrapper(f, function(x0,x1,x2,x3) { return module.exports._1816(f,arguments.length,x0,x1,x2,x3) }),
      _1817: (module,f) => finalizeWrapper(f, function(x0,x1,x2,x3) { return module.exports._1817(f,arguments.length,x0,x1,x2,x3) }),
      _1818: (module,f) => finalizeWrapper(f, function(x0,x1,x2) { return module.exports._1818(f,arguments.length,x0,x1,x2) }),
      _1819: (module,f) => finalizeWrapper(f, function(x0,x1) { return module.exports._1819(f,arguments.length,x0,x1) }),
      _1820: (module,f) => finalizeWrapper(f, function(x0,x1) { return module.exports._1820(f,arguments.length,x0,x1) }),
      _1821: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1821(f,arguments.length,x0) }),
      _1822: (module,f) => finalizeWrapper(f, function(x0,x1,x2,x3) { return module.exports._1822(f,arguments.length,x0,x1,x2,x3) }),
      _1823: (module,f) => finalizeWrapper(f, function(x0,x1,x2,x3) { return module.exports._1823(f,arguments.length,x0,x1,x2,x3) }),
      _1824: (module,f) => finalizeWrapper(f, function(x0,x1) { return module.exports._1824(f,arguments.length,x0,x1) }),
      _1825: (module,f) => finalizeWrapper(f, function(x0,x1) { return module.exports._1825(f,arguments.length,x0,x1) }),
      _1826: (module,f) => finalizeWrapper(f, function(x0,x1) { return module.exports._1826(f,arguments.length,x0,x1) }),
      _1827: (module,f) => finalizeWrapper(f, function(x0,x1) { return module.exports._1827(f,arguments.length,x0,x1) }),
      _1828: (module,f) => finalizeWrapper(f, function(x0,x1) { return module.exports._1828(f,arguments.length,x0,x1) }),
      _1829: (module,f) => finalizeWrapper(f, function(x0,x1) { return module.exports._1829(f,arguments.length,x0,x1) }),
      _1830: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1830(f,arguments.length,x0) }),
      _1831: (module,f) => finalizeWrapper(f, function(x0,x1,x2) { return module.exports._1831(f,arguments.length,x0,x1,x2) }),
      _1832: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1832(f,arguments.length,x0) }),
      _1833: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1833(f,arguments.length,x0) }),
      _1834: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1834(f,arguments.length,x0) }),
      _1835: (module,f) => finalizeWrapper(f, function(x0,x1,x2,x3,x4) { return module.exports._1835(f,arguments.length,x0,x1,x2,x3,x4) }),
      _1836: (module,f) => finalizeWrapper(f, function(x0,x1,x2,x3) { return module.exports._1836(f,arguments.length,x0,x1,x2,x3) }),
      _1837: (module,f) => finalizeWrapper(f, function(x0,x1,x2,x3) { return module.exports._1837(f,arguments.length,x0,x1,x2,x3) }),
      _1838: (module,f) => finalizeWrapper(f, function(x0,x1,x2,x3) { return module.exports._1838(f,arguments.length,x0,x1,x2,x3) }),
      _1839: (module,f) => finalizeWrapper(f, function(x0,x1) { return module.exports._1839(f,arguments.length,x0,x1) }),
      _1840: (module,f) => finalizeWrapper(f, function(x0,x1) { return module.exports._1840(f,arguments.length,x0,x1) }),
      _1841: (module,f) => finalizeWrapper(f, function(x0,x1,x2,x3,x4) { return module.exports._1841(f,arguments.length,x0,x1,x2,x3,x4) }),
      _1842: (module,f) => finalizeWrapper(f, function(x0,x1) { return module.exports._1842(f,arguments.length,x0,x1) }),
      _1843: (module,f) => finalizeWrapper(f, function(x0,x1) { return module.exports._1843(f,arguments.length,x0,x1) }),
      _1844: (module,f) => finalizeWrapper(f, function(x0,x1,x2) { return module.exports._1844(f,arguments.length,x0,x1,x2) }),
      _1845: (x0,x1,x2) => x0.instantiateStreaming(x1,x2),
      _1846: x0 => x0.continue(),
      _1847: () => globalThis.indexedDB,
      _1848: (x0,x1,x2) => globalThis.Atomics.wait(x0,x1,x2),
      _1850: (x0,x1,x2) => globalThis.Atomics.notify(x0,x1,x2),
      _1851: (x0,x1,x2) => globalThis.Atomics.store(x0,x1,x2),
      _1852: (x0,x1) => globalThis.Atomics.load(x0,x1),
      _1853: () => globalThis.Int32Array,
      _1855: () => globalThis.Uint8Array,
      _1857: () => globalThis.DataView,
      _1859: x0 => x0.byteLength,
      _1860: () => new XMLHttpRequest(),
      _1861: (x0,x1,x2,x3) => x0.open(x1,x2,x3),
      _1865: x0 => x0.send(),
      _1867: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1867(f,arguments.length,x0) }),
      _1868: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1868(f,arguments.length,x0) }),
      _1873: (x0,x1) => new WebSocket(x0,x1),
      _1874: (x0,x1) => x0.send(x1),
      _1875: (x0,x1,x2) => x0.close(x1,x2),
      _1876: (x0,x1) => x0.close(x1),
      _1877: x0 => x0.close(),
      _1886: () => new FileReader(),
      _1887: (x0,x1) => x0.readAsArrayBuffer(x1),
      _1888: () => new AbortController(),
      _1889: x0 => x0.abort(),
      _1890: (x0,x1,x2,x3,x4,x5) => ({method: x0,headers: x1,body: x2,credentials: x3,redirect: x4,signal: x5}),
      _1891: (x0,x1) => globalThis.fetch(x0,x1),
      _1892: (x0,x1) => x0.get(x1),
      _1893: (module,f) => finalizeWrapper(f, function(x0,x1,x2) { return module.exports._1893(f,arguments.length,x0,x1,x2) }),
      _1894: (x0,x1) => x0.forEach(x1),
      _1895: x0 => x0.getReader(),
      _1896: x0 => x0.cancel(),
      _1897: x0 => x0.read(),
      _1898: (module,f) => finalizeWrapper(f, function(x0) { return module.exports._1898(f,arguments.length,x0) }),
      _1899: x0 => x0.attachStreamToVideo,
      _1901: x0 => x0.decodeContinuously,
      _1905: x0 => x0.reset,
      _1907: x0 => x0.stopContinuousDecode,
      _1909: x0 => x0.stream,
      _1910: x0 => x0.videoElement,
      _1911: (x0,x1,x2,x3) => x0.replaceState(x1,x2,x3),
      _1912: (x0,x1) => x0.key(x1),
      _1914: x0 => x0.facingMode,
      _1915: x0 => x0.getSettings(),
      _1916: (x0,x1) => ({width: x0,height: x1}),
      _1917: (x0,x1,x2) => ({width: x0,height: x1,facingMode: x2}),
      _1918: (x0,x1) => x0.item(x1),
      _1919: o => o instanceof Array,
      _1923: a => a.pop(),
      _1924: (a, i) => a.splice(i, 1),
      _1925: (a, s) => a.join(s),
      _1926: (a, s, e) => a.slice(s, e),
      _1928: (a, b) => a == b ? 0 : (a > b ? 1 : -1),
      _1929: a => a.length,
      _1931: (a, i) => a[i],
      _1932: (a, i, v) => a[i] = v,
      _1934: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof ArrayBuffer) return 1;
        if (globalThis.SharedArrayBuffer !== undefined &&
            o instanceof SharedArrayBuffer) {
          return 2;
        }
        return 3;
      },
      _1935: (o, offsetInBytes, lengthInBytes) => {
        var dst = new ArrayBuffer(lengthInBytes);
        new Uint8Array(dst).set(new Uint8Array(o, offsetInBytes, lengthInBytes));
        return new DataView(dst);
      },
      _1936: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof DataView) return 1;
        return 2;
      },
      _1937: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof Uint8Array) return 1;
        return 2;
      },
      _1938: (o, start, length) => new Uint8Array(o.buffer, o.byteOffset + start, length),
      _1939: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof Int8Array) return 1;
        return 2;
      },
      _1940: (o, start, length) => new Int8Array(o.buffer, o.byteOffset + start, length),
      _1941: o => o instanceof Uint8ClampedArray,
      _1942: (o, start, length) => new Uint8ClampedArray(o.buffer, o.byteOffset + start, length),
      _1943: o => o instanceof Uint16Array,
      _1944: (o, start, length) => new Uint16Array(o.buffer, o.byteOffset + start, length),
      _1945: o => o instanceof Int16Array,
      _1946: (o, start, length) => new Int16Array(o.buffer, o.byteOffset + start, length),
      _1947: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof Uint32Array) return 1;
        return 2;
      },
      _1948: (o, start, length) => new Uint32Array(o.buffer, o.byteOffset + start, length),
      _1949: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof Int32Array) return 1;
        return 2;
      },
      _1950: (o, start, length) => new Int32Array(o.buffer, o.byteOffset + start, length),
      _1952: (o, start, length) => new BigInt64Array(o.buffer, o.byteOffset + start, length),
      _1953: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof Float32Array) return 1;
        return 2;
      },
      _1954: (o, start, length) => new Float32Array(o.buffer, o.byteOffset + start, length),
      _1955: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof Float64Array) return 1;
        return 2;
      },
      _1956: (o, start, length) => new Float64Array(o.buffer, o.byteOffset + start, length),
      _1957: (a, i) => a.push(i),
      _1958: (t, s) => t.set(s),
      _1959: l => new DataView(new ArrayBuffer(l)),
      _1960: (o) => new DataView(o.buffer, o.byteOffset, o.byteLength),
      _1961: o => o.byteLength,
      _1962: o => o.buffer,
      _1963: o => o.byteOffset,
      _1964: Function.prototype.call.bind(Object.getOwnPropertyDescriptor(DataView.prototype, 'byteLength').get),
      _1965: (b, o) => new DataView(b, o),
      _1966: (b, o, l) => new DataView(b, o, l),
      _1967: Function.prototype.call.bind(DataView.prototype.getUint8),
      _1968: Function.prototype.call.bind(DataView.prototype.setUint8),
      _1969: Function.prototype.call.bind(DataView.prototype.getInt8),
      _1970: Function.prototype.call.bind(DataView.prototype.setInt8),
      _1971: Function.prototype.call.bind(DataView.prototype.getUint16),
      _1972: Function.prototype.call.bind(DataView.prototype.setUint16),
      _1973: Function.prototype.call.bind(DataView.prototype.getInt16),
      _1974: Function.prototype.call.bind(DataView.prototype.setInt16),
      _1975: Function.prototype.call.bind(DataView.prototype.getUint32),
      _1976: Function.prototype.call.bind(DataView.prototype.setUint32),
      _1977: Function.prototype.call.bind(DataView.prototype.getInt32),
      _1978: Function.prototype.call.bind(DataView.prototype.setInt32),
      _1981: Function.prototype.call.bind(DataView.prototype.getBigInt64),
      _1982: Function.prototype.call.bind(DataView.prototype.setBigInt64),
      _1983: Function.prototype.call.bind(DataView.prototype.getFloat32),
      _1984: Function.prototype.call.bind(DataView.prototype.setFloat32),
      _1985: Function.prototype.call.bind(DataView.prototype.getFloat64),
      _1986: Function.prototype.call.bind(DataView.prototype.setFloat64),
      _1987: Function.prototype.call.bind(Number.prototype.toString),
      _1988: Function.prototype.call.bind(BigInt.prototype.toString),
      _1989: Function.prototype.call.bind(Number.prototype.toString),
      _1990: (d, digits) => d.toFixed(digits),
      _1994: (module,f) => finalizeWrapper(f, function() { return module.exports._1994(f,arguments.length) }),
      _1995: () => globalThis.Promise.resolve(),
      _1996: (x0,x1) => x0.then(x1),
      _1999: (x0,x1) => x0.getContext(x1),
      _2015: () => globalThis.document,
      _2017: () => globalThis.console,
      _2022: (x0,x1) => { x0.height = x1 },
      _2024: (x0,x1) => { x0.width = x1 },
      _2026: (x0,x1) => { x0.pointerEvents = x1 },
      _2035: x0 => x0.style,
      _2038: x0 => x0.src,
      _2039: (x0,x1) => { x0.src = x1 },
      _2040: x0 => x0.naturalWidth,
      _2041: x0 => x0.naturalHeight,
      _2056: (x0,x1) => x0.error(x1),
      _2061: x0 => x0.status,
      _2062: (x0,x1) => { x0.responseType = x1 },
      _2064: x0 => x0.response,
      _2065: x0 => x0.x,
      _2066: x0 => x0.y,
      _2115: (x0,x1) => { x0.responseType = x1 },
      _2116: x0 => x0.response,
      _2163: (x0,x1) => { x0.lang = x1 },
      _2192: x0 => x0.style,
      _2205: (x0,x1) => { x0.oncancel = x1 },
      _2211: (x0,x1) => { x0.onchange = x1 },
      _2251: (x0,x1) => { x0.onerror = x1 },
      _2267: (x0,x1) => { x0.onload = x1 },
      _2291: (x0,x1) => { x0.onpause = x1 },
      _2293: (x0,x1) => { x0.onplay = x1 },
      _2624: (x0,x1) => { x0.src = x1 },
      _2635: x0 => x0.width,
      _2637: x0 => x0.height,
      _2764: x0 => x0.videoWidth,
      _2765: x0 => x0.videoHeight,
      _2813: x0 => x0.paused,
      _2828: (x0,x1) => { x0.controls = x1 },
      _3119: (x0,x1) => { x0.accept = x1 },
      _3133: x0 => x0.files,
      _3159: (x0,x1) => { x0.multiple = x1 },
      _3177: (x0,x1) => { x0.type = x1 },
      _3427: (x0,x1) => { x0.src = x1 },
      _3429: (x0,x1) => { x0.type = x1 },
      _3433: (x0,x1) => { x0.async = x1 },
      _3435: (x0,x1) => { x0.defer = x1 },
      _3437: (x0,x1) => { x0.crossOrigin = x1 },
      _3471: x0 => x0.width,
      _3472: (x0,x1) => { x0.width = x1 },
      _3473: x0 => x0.height,
      _3474: (x0,x1) => { x0.height = x1 },
      _3895: () => globalThis.window,
      _3938: x0 => x0.location,
      _3939: x0 => x0.history,
      _3957: x0 => x0.navigator,
      _4221: x0 => x0.localStorage,
      _4229: x0 => x0.href,
      _4327: x0 => x0.mediaDevices,
      _4343: x0 => x0.userAgent,
      _4344: x0 => x0.vendor,
      _4356: x0 => x0.storage,
      _4394: x0 => x0.data,
      _4424: x0 => x0.port1,
      _4425: x0 => x0.port2,
      _4427: (x0,x1) => { x0.onmessage = x1 },
      _4437: (x0,x1) => { x0.onmessage = x1 },
      _4505: x0 => x0.port,
      _4540: x0 => x0.length,
      _4757: x0 => x0.readyState,
      _4770: (x0,x1) => { x0.binaryType = x1 },
      _4773: x0 => x0.code,
      _4774: x0 => x0.reason,
      _6441: x0 => x0.type,
      _6442: x0 => x0.target,
      _6482: x0 => x0.signal,
      _6554: () => globalThis.document,
      _6636: x0 => x0.body,
      _6638: x0 => x0.head,
      _6967: (x0,x1) => { x0.id = x1 },
      _8313: x0 => x0.value,
      _8315: x0 => x0.done,
      _8474: x0 => x0.size,
      _8475: x0 => x0.type,
      _8481: x0 => x0.name,
      _8482: x0 => x0.lastModified,
      _8487: x0 => x0.length,
      _8493: x0 => x0.result,
      _8989: x0 => x0.url,
      _8991: x0 => x0.status,
      _8993: x0 => x0.statusText,
      _8994: x0 => x0.headers,
      _8995: x0 => x0.body,
      _9007: x0 => x0.instance,
      _9009: () => globalThis.WebAssembly,
      _9031: x0 => x0.exports,
      _9039: x0 => x0.buffer,
      _9796: x0 => x0.label,
      _9818: x0 => x0.facingMode,
      _10032: x0 => x0.width,
      _10034: x0 => x0.height,
      _10040: x0 => x0.facingMode,
      _10445: x0 => x0.result,
      _10446: x0 => x0.error,
      _10457: (x0,x1) => { x0.onupgradeneeded = x1 },
      _10459: x0 => x0.oldVersion,
      _10538: x0 => x0.key,
      _10539: x0 => x0.primaryKey,
      _10541: x0 => x0.value,
      _10546: x0 => x0.error,
      _10548: (x0,x1) => { x0.onabort = x1 },
      _10550: (x0,x1) => { x0.oncomplete = x1 },
      _10552: (x0,x1) => { x0.onerror = x1 },
      _11542: (x0,x1) => { x0.height = x1 },
      _11736: (x0,x1) => { x0.objectFit = x1 },
      _11866: (x0,x1) => { x0.pointerEvents = x1 },
      _12164: (x0,x1) => { x0.transform = x1 },
      _12168: (x0,x1) => { x0.transformOrigin = x1 },
      _12232: (x0,x1) => { x0.width = x1 },
      _12600: x0 => x0.name,
      _12601: x0 => x0.message,
      _12697: x0 => x0.href,
      _12712: x0 => x0.pathname,
      _13346: x0 => x0.message,

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
