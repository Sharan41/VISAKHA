/* dc-lite: tiny runtime that drives each page's Component class (state, renderVals, lifecycle)
   against its HTML template ({{holes}}, <sc-if>, <sc-for>). No dependencies. */
(function () {
  var HOLE = /\{\{\s*([^}]*?)\s*\}\}/g;
  function get(path, scope) {
    if (path === 'true') return true;
    if (path === 'false') return false;
    if (path === 'null') return null;
    if (/^-?\d+(\.\d+)?$/.test(path)) return Number(path);
    var p = path.split('.'), v = scope[p[0]];
    for (var i = 1; i < p.length && v != null; i++) v = v[p[i]];
    return v;
  }
  function whole(str) { var m = (str || '').match(/^\s*\{\{\s*([^}]*?)\s*\}\}\s*$/); return m && m[1]; }
  function interp(str, scope) {
    return str.replace(HOLE, function (m, p) { var v = get(p, scope); return v == null || v === false ? '' : String(v); });
  }
  function compileChildren(parent) {
    var fns = [];
    Array.prototype.slice.call(parent.childNodes).forEach(function (n) { var f = compileNode(n); if (f) fns.push(f); });
    return function (s) { for (var i = 0; i < fns.length; i++) fns[i](s); };
  }
  function compileNode(node) {
    if (node.nodeType === 3) {
      if (node.nodeValue.indexOf('{{') < 0) return null;
      var t = node.nodeValue;
      return function (s) { var v = interp(t, s); if (node.nodeValue !== v) node.nodeValue = v; };
    }
    if (node.nodeType !== 1) return null;
    var tag = node.tagName.toLowerCase();
    if (tag === 'sc-if') {
      var path = whole(node.getAttribute('value'));
      var kids = Array.prototype.slice.call(node.childNodes);
      var inner = compileChildren(node);
      var shown = true;
      return function (s) {
        var on = !!get(path, s);
        if (on !== shown) {
          kids.forEach(function (k) { if (on) node.appendChild(k); else if (k.parentNode === node) node.removeChild(k); });
          shown = on;
        }
        if (on) inner(s);
      };
    }
    if (tag === 'sc-for') {
      var lp = whole(node.getAttribute('list')), as = node.getAttribute('as') || 'item';
      var tpl = document.createDocumentFragment();
      while (node.firstChild) tpl.appendChild(node.firstChild);
      var inst = [];
      return function (s) {
        var list = get(lp, s) || [];
        while (inst.length < list.length) {
          var el = document.createElement('sc-item');
          el.appendChild(tpl.cloneNode(true));
          var fn = compileChildren(el);
          node.appendChild(el);
          inst.push({ el: el, fn: fn });
        }
        while (inst.length > list.length) node.removeChild(inst.pop().el);
        for (var i = 0; i < list.length; i++) {
          var sc = Object.create(s); sc[as] = list[i]; sc.$index = i;
          inst[i].fn(sc);
        }
      };
    }
    var binds = [];
    Array.prototype.slice.call(node.attributes).forEach(function (a) {
      if (a.value.indexOf('{{') < 0) return;
      node.removeAttribute(a.name);
      var name = a.name.replace(/^data-dc-/, '');
      if (/^on[a-z]+$/i.test(name)) {
        var ev = name.slice(2).toLowerCase(), hp = whole(a.value);
        node.addEventListener(ev, function (e) { var h = node.__dch && node.__dch[ev]; if (h) h(e); });
        binds.push(function (s) { (node.__dch = node.__dch || {})[ev] = get(hp, s); });
        return;
      }
      var w = whole(a.value), tplv = a.value;
      binds.push(function (s) {
        var v = w ? get(w, s) : interp(tplv, s);
        if (typeof v === 'boolean' && !/^(aria|data)-/.test(name)) v = v ? '' : null;
        if (v == null) node.removeAttribute(name);
        else if (node.getAttribute(name) !== String(v)) node.setAttribute(name, String(v));
      });
    });
    var kidsFn = compileChildren(node);
    return function (s) { for (var i = 0; i < binds.length; i++) binds[i](s); kidsFn(s); };
  }
  function DCLogic(props) { this.props = props || {}; this.state = {}; }
  DCLogic.prototype.setState = function (s, cb) {
    if (typeof s === 'function') s = s(this.state, this.props);
    Object.assign(this.state, s);
    this.forceUpdate(); if (cb) cb();
  };
  DCLogic.prototype.forceUpdate = function () {
    var self = this; if (self.__q) return; self.__q = true;
    Promise.resolve().then(function () { self.__q = false; self.__render && self.__render(); });
  };
  DCLogic.prototype.renderVals = function () { return {}; };
  window.DCLogic = DCLogic;
  window.DCLite = {
    mount: function (C, props) {
      var run = function () {
        var root = document.getElementById('app');
        var fn = compileChildren(root);
        var comp = new C(props || {});
        comp.__render = function () { fn(comp.renderVals()); };
        comp.__render();
        if (comp.componentDidMount) comp.componentDidMount();
        window.addEventListener('pagehide', function () { if (comp.componentWillUnmount) comp.componentWillUnmount(); });
        window.__comp = comp;
      };
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
    }
  };
  function fit() { var w = window.innerWidth; document.body.style.zoom = w < 1440 ? (w / 1440) : ''; }
  fit(); window.addEventListener('resize', fit);
})();
