// Suisho-BM: adapter for ShogiHome's wasm engine ABI (shogihome-wasm-engine/1).
// Linked with --pre-js. The interface is the same as the YaneuraOu wasm build:
// postMessage / addMessageListener / removeMessageListener / terminate.
//
// Commands go straight to usi_command(), which only queues them for the USI loop
// running on its own pthread, so this thread is never blocked (not even while
// searching) and "stop" always gets through.
(function () {
  var listeners = [];
  var terminated = false;

  // Emscripten calls this once per line written to stdout, on this thread
  // (output from the search threads is proxied here).
  Module["print"] = function (line) {
    if (terminated) return; // nothing may be output after quit / terminate()
    var text = String(line);
    var current = listeners.slice();
    for (var i = 0; i < current.length; i++) current[i](text);
  };

  Module["addMessageListener"] = function (listener) {
    listeners.push(listener);
  };

  Module["removeMessageListener"] = function (listener) {
    var idx = listeners.indexOf(listener);
    if (idx >= 0) listeners.splice(idx, 1);
  };

  Module["terminate"] = function () {
    if (terminated) return;
    terminated = true;
    listeners = [];
    PThread.terminateAllThreads();
  };

  Module["postMessage"] = function (command) {
    if (terminated) return;
    var line = String(command);
    if (line.trim() === "quit") {
      Module["terminate"]();
      return;
    }
    Module["ccall"]("usi_command", null, ["string"], [line]);
  };
})();
