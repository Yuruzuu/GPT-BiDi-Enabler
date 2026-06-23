// Flip ChatGPT's voice "rollout_policy" so the gated 'wingman' model ("Bidi 1")
// appears in the voice-model picker. Runs in the page's MAIN world at document_start.
(function () {
  var ENABLE = 'available_default';
  var OFF = /^(unavailable|not_available|none|control|disabled|off|hidden)$/i;

  // Patch the Statsig bootstrap as it's parsed.
  function patch(o, seen) {
    if (!o || typeof o !== 'object' || seen.has(o)) return;
    seen.add(o);
    if (Array.isArray(o)) { for (var i = 0; i < o.length; i++) patch(o[i], seen); return; }
    if (typeof o.rollout_policy === 'string' && OFF.test(o.rollout_policy)) o.rollout_policy = ENABLE;
    for (var k in o) { try { patch(o[k], seen); } catch (e) {} }
  }

  var parse = JSON.parse;
  JSON.parse = function (text, reviver) {
    var v = parse.call(this, text, reviver);
    try { patch(v, new WeakSet()); } catch (e) {}
    return v;
  };

  // Patch the same field in any JSON config refreshed over the network.
  var rxA = /("rollout_policy"\s*:\s*")(unavailable|not_available|none|control|disabled|off|hidden)(")/g;
  var rxB = /(\\"rollout_policy\\"\s*:\s*\\")(unavailable|not_available|none|control|disabled|off|hidden)(\\")/g;

  var fetch0 = window.fetch;
  window.fetch = function () {
    var args = arguments;
    return fetch0.apply(this, args).then(function (resp) {
      try {
        var ct = (resp.headers && resp.headers.get('content-type')) || '';
        if (ct.indexOf('application/json') === -1) return resp; // skips chat SSE
        return resp.clone().text().then(function (t) {
          if (t.indexOf('rollout_policy') === -1) return resp;
          var f = t.replace(rxA, '$1' + ENABLE + '$3').replace(rxB, '$1' + ENABLE + '$3');
          return f === t ? resp : new Response(f, { status: resp.status, statusText: resp.statusText, headers: resp.headers });
        }).catch(function () { return resp; });
      } catch (e) { return resp; }
    });
  };
})();
