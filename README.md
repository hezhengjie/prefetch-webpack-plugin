# h-prefetch-webpack-plugin

## Introduction

一个页面渲染最耗时的不过资源加载和接口请求，资源加载可以使用缓存等方式进行优化，那么接口请求呢？接口请求无法进行提前缓存，那么我们可以将其提前加载。

现代前端页面的接口请求大多是在JS中发起，也就意味着需要等JS加载完成，并执行的时候，才开始接口请求，两个最耗时的步骤是同步顺序执行，这非常耗时。

所以这个插件可以将一部分GET请求提前塞入html中，做预请求，提前到和JS资源并行请求，等JS开始执行时，可以直接使用提前请求到的接口数据，从而提升页面性能。

## Install

Using npm:

```$ npm install --save-dev h-prefetch-webpack-plugin```

or using yarn:

```$ yarn add h-prefetch-webpack-plugin --dev```

## Usage

该webpack plugin 需要配合html-webpack-plugin 插件进行使用

```
const HtmlWebpackPlugin = require('html-webpack-plugin');
const PreFetchPlugin = require('h-prefetch-webpack-plugin'); 

// webpack config
{
  ...
  plugins: [

    new HtmlWebpackPlugin({
      filename: 'index.html',
    }),
    new PreFetchPlugin({
      prefetchList: [
        {
          path: '/test',
          params: {
            id: ({ searchParams }) => `${searchParams.get('id')}`,
          }
        }
      ]
    })
  ]
}
```

## Configuration

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| mode|'preload'\|'proxy'\|'auto'| 预请求的模式，默认为auto|
| prefetchList  |  PrefetchItem[] | 需要提前请求的接口列表 |

### PrefetchItem

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| path  |  String | 接口路径 |
| params  |  Object | 接口参数 |
| headers  |  Object | 接口需要的特殊headers |

> params和headers支持String或者Function的方式，如果是Function的方式，会传入searchParams（页面url上的params）和url(页面Url), 使用如下：

```
{
  path: '/test',
  params: {
    name: 'user1',
    id: ({ searchParams,url }) => {
      return searchParams.get('id');
    }
  }
}
```


### Mode
**preload模式**  
该模式使用浏览器原生的preload能力进行预请求，也就是会在html中插入<link ref="preload">的标签，如果请求上没有定制header的话，建议使用这种模式。

**proxy模式**

该模式会使用代理fetch和xhr的方式进行预请求，适合有定制header的请求

**auto模式**

该模式会先判断是否支持浏览器原生的preload，如果不支持则使用proxy模式，如果支持，则会根据每个请求是否有header，智能使用
preload模式或者proxy模式。

**注意：该模式在html中引入的js代码量较大，所以如果明确可以使用preload模式的，建议主动声明preload模式。**