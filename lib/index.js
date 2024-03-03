const fs = require('fs');
const Mode = {
  "Preload": 'preload',
  "Proxy": 'proxy',
  "Auto": 'auto'
}
class PreFetchPlugin {
  prefetchList = [];
  mode = Mode.Auto;
  constructor(options) {
    const { prefetchList = [], mode } = options;
    console.log('mode:',mode,',prefetchList:', prefetchList);
    this.prefetchList = this.formatPreFetch(prefetchList);
    this.mode = this.checkMode(mode);
  }

  apply(compiler) {
    compiler.hooks.compilation.tap("PreFetchPlugin", (compilation) => {
      if (this.prefetchList && this.prefetchList.length > 0) {
        const insertContent = this.genHtml();
        // 插件逻辑 调用compilation提供的plugin方法
        compilation.plugin(
          "html-webpack-plugin-before-html-processing",
          function (htmlPluginData) {
            let resultHTML = htmlPluginData.html.replace(
              "</head>", insertContent + '</head>'
            );
            // 返回修改后的结果
            htmlPluginData.html = resultHTML;
          })
      }
    });
  }
  checkMode(mode) {
    if (mode && Object.values(Mode).includes(mode)) {
      return mode;
    }
    else {
      return Mode.auto;
    }
  }
  formatPreFetch(prefetchList) {
    if (prefetchList && prefetchList instanceof Array) {
      return prefetchList.map((prefetchItem) => {
        const { path, params, headers } = prefetchItem;
        return {
          path: path,
          params: this.parseVariable(params),
          headers: this.parseVariable(headers),
        }
      })
    }
    return prefetchList;
  }
  // 处理插值参数
  parseVariable(params) {
    if (!params) {
      return null;
    }
    const newParams = {}
    Object.keys(params).forEach((key) => {
      if (params[key] instanceof Function) {
        newParams[key] = {
          type: "Function",
          content: params[key].toString()
        }
      }
      else {
        newParams[key] = {
          type: "String",
          content: params[key].toString()
        }
      }
    })
    return newParams;
  }
  genHtml() {
    if (this.mode === Mode.Proxy) {
      return this.genProxyModeHtml();
    }
    else if (this.mode === Mode.Preload) {
      return this.genPreloadModeHtml();
    }
    else {
      return this.genAutoModeHtml();
    }

  }
  genProxyModeHtml() {
    try {
      const htmlContent = fs.readFileSync('./prefecthCode.js', {
        encoding: 'utf8'
      });
      const insertContent = htmlContent.replace('__Prefetch_List__', JSON.stringify(this.prefetchList));
      return `<script>
        ${insertContent}
      </script>`
    } catch (err) {
      console.error('生成预插入代码失败', err);
    }
  }
  genPreloadModeHtml() {
    try {
      let insertContent = '';
      let dynamicCreateList = [];
      this.prefetchList.forEach((preFetchData) => {
        const { params, path } = preFetchData;
        if (params) {
          // 有参数，则使用动态生成
          dynamicCreateList.push(preFetchData);
        }
        else {
          const link = '<link rel = "preload" href="' + path + '" as="fetch" crossorigin = "use-credentials"/>'
          insertContent += link;
        }
      });
      if (dynamicCreateList.length > 0) {
        const htmlContent = fs.readFileSync('./prefecthCodePreloadMode.js', {
          encoding: 'utf8'
        });
        const insertContentDynamicCreateList = htmlContent.replace('__Prefetch_List__', JSON.stringify(dynamicCreateList));
        insertContent += `<script>
      ${insertContentDynamicCreateList}
    </script>`
      }
      return insertContent;
    } catch (err) {
      console.error('生成预插入代码失败', err);
    }
  }
  genAutoModeHtml() {
    try {
      const htmlContent = fs.readFileSync('./prefecthCodeAutoMode.js', {
        encoding: 'utf8'
      });
      const insertContent = htmlContent.replace('__Prefetch_List__', JSON.stringify(this.prefetchList));
      return `<script>
        ${insertContent}
      </script>`
    } catch (err) {
      console.error('生成预插入代码失败', err);
    }
  }
}

module.exports = PreFetchPlugin;