var fetchList = __Prefetch_List__;
var prefetchResponseAttr = ['response', 'status', 'responseURL', 'readyState'];
var preFetchData = new Map();
var searchParams = new URL(document.location).searchParams;

function xhrHookFunction(fun) {
  return function () {
    var args = Array.prototype.slice.call(arguments)
    // 将open参数存入xhr, 在其它事件回调中可以获取到。
    if (fun === 'open') {
      this.xhr.open_args = args;
    }
    if (fun === 'send') {
      // 发起send后，发现有值，则立即返回
      var url = this.xhr.open_args[1];
      if (preFetchData && url && preFetchData.has(url)) {
        var preFetchPromise = preFetchData.get(url);
        preFetchPromise.then((res) => res.json()).then((response) => {
          this.xhr.prefetch_response = response;
          this.xhr.prefetch_status = 200;
          this.xhr.prefetch_responseURL = url;
          this.xhr.prefetch_readyState = 4;
          var loadEvent = new ProgressEvent("load", {
            type: 'load'
          });
          prefetchResponseAttr.forEach((key) => {
            Object.defineProperty(this.xhr, key, {
              get: () => {
                return this.xhr[`prefetch_${key}`];
              }
            })
          })

          console.log('this', this, 'xhr', this.xhr);
          this.dispatchEvent(loadEvent);
          preFetchData.devare(url);
          if (preFetchData.size === 0) {
            //清空之后，去除hook
            unXhrHook();
            unFetchHook();
          }
        });
        return () => { };
      }
    }
    return this.xhr[fun].apply(this.xhr, args);
  }
}
function getterFactory(attr) {
  return function () {
    var value = this.hasOwnProperty(attr + "_") ? this[attr + "_"] : this.xhr[attr];
    return value;
  }
}
function setterFactory(attr) {
  return function (value) {
    var _this = this;
    var xhr = this.xhr;
    this[attr + "_"] = value;
    if (/^on/.test(attr)) {
      // note：间接的在真实的xhr上给事件绑定函数
      xhr[attr] = function (e) {
        console.log('e', e);
        value.call(_this, e);
      }
    } else {
      try {
        // 并非xhr的所有属性都是可写的
        xhr[attr] = value;
      } catch (e) {
        console.warn('xhr的' + attr + '属性不可写')
      }
    }
  }
}
function xhrHook() {
  // 存储真实的xhr构造器, 在取消hook时，可恢复
  window.originXhr = window.originXhr || window.XMLHttpRequest
  // 重写XMLHttpRequest构造函数
  window.XMLHttpRequest = function () {
    var xhr = new window.originXhr();
    // 真实的xhr实例存储到自定义的xhr属性中
    this.xhr = xhr;
    // 遍历实例及其原型上的属性（实例和原型链上有相同属性时，取实例属性）
    for (var attr in xhr) {
      if (Object.prototype.toString.call(xhr[attr]) === '[object Function]') {
        this[attr] = xhrHookFunction(attr); // 接管xhr function

      }
      else {
        Object.defineProperty(this, attr, { // 接管xhr attr、event
          get: getterFactory(attr),
          set: setterFactory(attr),
          enumerable: true
        })
      }
    }
  }
}
function unXhrHook() {
  if (window.originXhr) {
    window.XMLHttpRequest = window.originXhr;
    window.originXhr = undefined;
  }
}
function fetchHook() {
  window.originFetch = window.fetch.bind(window);
  window.fetch = (url, config) => {
    var key = url;
    if (preFetchData && key && preFetchData.has(key)) {
      var preFetchPromise = preFetchData.get(key);;
      preFetchData.devare(url);
      if (preFetchData.size === 0) {
        //清空之后，去除hook
        unXhrHook();
        unFetchHook();
      }
      return preFetchPromise;
    }
    else {
      return window.originFetch(url, config)
    }
  }
}
function unFetchHook() {
  if (window.originFetch) {
    window.fetch = window.originFetch;
    window.originFetch = undefined;
  }
}

function formatParams(params) {
  if (!params) {
    return {}
  }
  var newParams = {}
  Object.keys(params).forEach((key) => {
    var { type, content } = params[key];
    if (type === 'Function') {
      var func = eval(content);
      newParams[key] = func({ searchParams: searchParams, url: location.href });
    }
    else {
      newParams[key] = content;
    }
  })
  return newParams;
}
function init() {
  // 提前请求，缓存数据
  if (fetchList && fetchList.length > 0) {
    fetchList.forEach((request) => {
      var { path, params, headers } = request;
      var formatedParams = formatParams(params);
      var formatedHeaders = formatParams(headers);
      var url = new URL(path, window.location.origin);
      var newParams = new URLSearchParams([
        ...Array.from(url.searchParams.entries()),
        ...Object.entries(formatedParams)
      ]).toString();
      var newUrl = new URL(`${url.origin}${url.pathname}?${newParams}`);
      var fetchPromise = fetch(newUrl,
        {
          method: "GET",
          mode: "cors",
          cache: "no-cache",
          credentials: "include",
          headers: formatedHeaders
        })
      preFetchData.set(newUrl.href, fetchPromise);
    })
    fetchHook();
    xhrHook();
  }
}
init();