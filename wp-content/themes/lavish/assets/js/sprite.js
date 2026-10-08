/* Injects assets/icons.svg into the document so <use href="#icon-id">
   resolves locally. Inline injection avoids the external-reference
   inconsistencies between browsers and keeps icons recolourable via
   currentColor. */

(function () {
  'use strict';

  fetch((window.LV ? LV.theme + '/' : '') + 'assets/icons.svg')
    .then(function (r) {
      if (!r.ok) throw new Error(r.status + ' ' + r.statusText);
      return r.text();
    })
    .then(function (svg) {
      var host = document.createElement('div');
      host.setAttribute('aria-hidden', 'true');
      host.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
      host.innerHTML = svg;
      document.body.insertBefore(host, document.body.firstChild);
      document.dispatchEvent(new CustomEvent('lv:sprite-loaded'));
    })
    .catch(function (err) {
      console.error('[sprite] ' + err.message);
    });
})();
