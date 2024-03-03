var fetchList = __Prefetch_List__;
var searchParams = new URL(document.location).searchParams;


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
function createLink(url) {
  var link = document.createElement('link');
  link.rel = 'preload';
  link.href = url;
  link.as = "fetch";
  link.setAttribute('crossorigin', "use-credentials");
  return link;
}
function init() {
  if (!fetchList || fetchList.length === 0) {
    return;
  }
  // 提前请求，缓存数据
  var fragment = document.createDocumentFragment();
  fetchList.forEach((request) => {
    var { path, params } = request;
    var url = new URL(path, window.location.origin);
    var newUrl = url;
    if (params) {
      var formatedParams = formatParams(params);
      var newParams = new URLSearchParams([
        ...Array.from(url.searchParams.entries()),
        ...Object.entries(formatedParams)
      ]).toString();
      newUrl = new URL(`${url.origin}${url.pathname}?${newParams}`);
    }
    var link = createLink(newUrl);
    fragment.appendChild(link);
  });
  document.head.append(fragment);
}
init();