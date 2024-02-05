const fs = require('fs');

class PreFetchPlugin {
  prefetchList = [];
  constructor(options) {
    const { prefetchList = [] } = options;
    console.log('prefetchList:', prefetchList);
    this.prefetchList = this.formatPreFetch(prefetchList);
  }

  apply(compiler) {
    compiler.hooks.compilation.tap("PreFetchPlugin", (compilation) => {
      if (this.prefetchList && this.prefetchList.length > 0) {
        const insertContent = this.genHtml();
        // 插件逻辑 调用compilation提供的plugin方法
        compilation.plugin(
          "html-webpack-plugin-before-html-processing",
          function (htmlPluginData) {
            let result = `
                <script>
                    ${insertContent}
                </script>
            `;
            let resultHTML = htmlPluginData.html.replace(
              "</head>", result + '</head>'
            );
            // 返回修改后的结果
            htmlPluginData.html = resultHTML;
          })
      }
    });
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
      return {}
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
    try {
      const htmlContent = fs.readFileSync('./prefecthCode.js', {
        encoding: 'utf8'
      });
      return htmlContent.replace('__Prefetch_List__', JSON.stringify(this.prefetchList));
    } catch (err) {
      console.error('生成预插入代码失败', err);
    }
  }
}

module.exports = PreFetchPlugin;