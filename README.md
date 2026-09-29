# quill-format-blockquote

为 Quill 2.0.3 及更高的 2.x 版本提供支持分组和嵌套的引用块格式。

## 安装

```sh
npm install quill quill-format-blockquote
```

## 使用

在页面中添加编辑器元素：

```html
<div id="editor"></div>
```

创建编辑器前注册引用块格式，并在 Quill 主题样式之后导入本包的 CSS：

```js
import Quill from 'quill'
import Blockquote, { matchBlockquote } from 'quill-format-blockquote'
import 'quill/dist/quill.snow.css'
import 'quill-format-blockquote/style.css'

Quill.register(Blockquote, true)

const quill = new Quill('#editor', {
  theme: 'snow',
  modules: {
    toolbar: [['bold', 'italic', 'blockquote']],
    clipboard: {
      matchers: [['blockquote', matchBlockquote]],
    },
  },
})
```

工具栏使用标准的 `blockquote` 格式名称。注册 `Blockquote` 时会同时注册 `BlockquoteContainer`。

## 导入和导出 HTML

按上述示例配置 `matchBlockquote` 后，在粘贴 HTML、转换 HTML 或向编辑器加载初始 HTML 时，都能保留引用块的分组和嵌套结构。

```js
quill.clipboard.dangerouslyPasteHTML(
  '<blockquote><p>第一段</p><p>第二段</p><blockquote><p>嵌套引用</p></blockquote></blockquote>'
)

const html = quill.getSemanticHTML()
```

`getSemanticHTML()` 会导出标准的嵌套 `<blockquote><p>...</p></blockquote>` 标记，并保留行内格式。

为已有编辑器添加匹配器：

```js
import { addBlockquoteMatcher } from 'quill-format-blockquote'

const removeMatcher = addBlockquoteMatcher(quill.clipboard)

// 不再需要此匹配器时，调用该函数将其移除。
removeMatcher()
```

如果已经配置了 `matchBlockquote`，此辅助函数会保留现有匹配器，不会重复添加。

## 通过代码设置引用块

使用 `true` 设置顶层引用块，使用 `false` 移除引用块格式：

```js
quill.formatLine(0, 1, 'blockquote', true)
quill.formatLine(0, 1, 'blockquote', false)
```

使用 `true` 设置格式的相邻行会合并为同一个引用块。使用分组 ID 可以让引用块保持独立，使用斜杠分隔的路径可以创建嵌套引用块：

```js
import { createBlockquoteGroup } from 'quill-format-blockquote'

const root = createBlockquoteGroup()
const child = createBlockquoteGroup()

quill.setText('第一段\n嵌套段落\n')
quill.formatLine(0, 1, 'blockquote', root)
quill.formatLine('第一段\n'.length, 1, 'blockquote', `${root}/${child}`)
```

路径中首个分组 ID 相同的行属于同一个根引用块，根 ID 不同的引用块则保持独立。使用 `getBlockquotePath(value)` 可以将引用块格式值解析为路径片段数组。

## 配置

- 如果使用 Quill 的 `formats` 允许列表，请加入 `'blockquote'`；其所需的容器会自动包含在内。
- 如果使用自定义 Parchment 注册表，请在该注册表中同时注册 `Blockquote` 和具名导出的 `BlockquoteContainer`。
- 在 SSR 应用中，请仅在客户端加载本包，因为它依赖浏览器 DOM。
