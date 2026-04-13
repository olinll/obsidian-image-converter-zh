# Obsidian 图片转换器

让 Obsidian 中的图片管理更加便捷。

> 本仓库为中文本地化版本，所有插件界面均已翻译为中文。

## 功能特性

支持的图片格式：WEBP、JPG、PNG、HEIC、TIF

- **转换**：自动将拖放/粘贴的图片转换为 WEBP、JPG 或 PNG
- **压缩**：通过指定 1-100 的质量值来减小文件大小
- **调整大小**（破坏性和非破坏性）
  - 自动读取图片尺寸并应用到图片链接，例如：将图片宽度应用到 `|width` 或指定任意自定义尺寸
  - 通过拖拽图片边缘或滚轮调整大小（例如 **CMD+滚轮**）
  - 调整**原始**图片大小（宽度、高度、最长边、最短边、适应、填充）
- **对齐**（左、右、居中）并使文字环绕图片，无需在链接中使用任何自定义语法
- **图片标注和标记工具**：直接在 Obsidian 内对图片进行绘制、书写、涂鸦、标注
- **裁剪、旋转和翻转图片**
- **自定义文件管理和重命名**：
  - **重命名**：使用变量（如 `{notename}`、`{imagename}`）自动重命名图片。[支持的变量列表](#变量参考)
  - **输出**：使用变量将图片整理到自定义输出文件夹
- **纯 JavaScript 实现**，完全**离线**运行。无需外部 API 或二进制依赖（如 ImageMagick、Cloudinary、FFmpeg、sharp 等），保持轻量、便携和安全

## 其他功能

- **批量处理**：在单篇笔记或整个仓库中转换、压缩和调整所有图片的大小
- **与其他 Markdown 编辑器兼容**：支持 **Markdown 链接**用于图片，**Wiki 链接**用于其他链接
- **自定义右键菜单**：
  - 复制到剪贴板
  - 复制为 Base64 编码图片
  - 调整刚点击的原始图片大小
  - **从仓库中删除图片** — 同时移除图片及其链接

---

## 新功能：笔记属性变量与拼音首字母

本版本新增了三个变量，特别适合中文用户使用：

### `{pinyin}`

将笔记名称转换为拼音首字母（小写）。

| 笔记名称 | 结果 |
|---------|------|
| 我的笔记 | `wdbj` |
| 图片转换器 | `tpzhq` |
| Hello世界 | `hellosj` |

**使用示例**：文件名模板设为 `{pinyin}-{timestamp}`，笔记名为「我的笔记」时，图片将命名为 `wdbj-1713012345678`。

### `{property:key}`

从笔记的 frontmatter（YAML 元数据）中读取指定属性的值。如果属性不存在或为空，则返回空字符串。

**示例**：笔记 frontmatter 为：

```yaml
---
alias: my-note
category: tech
---
```

| 变量 | 结果 |
|-----|------|
| `{property:alias}` | `my-note` |
| `{property:category}` | `tech` |
| `{property:不存在的key}` | （空） |

### `{property:key:pinyin}`

从笔记的 frontmatter 中读取指定属性的值。如果属性不存在或为空，**回退为笔记名称的拼音首字母**。

这个变量非常适合中文笔记场景：在 frontmatter 中设定英文别名作为图片文件名，如果没有设定则自动使用拼音首字母。

**示例**：

笔记名为「深度学习入门」，frontmatter 为：

```yaml
---
alias: deep-learning-intro
---
```

| 变量 | 结果 | 说明 |
|-----|------|------|
| `{property:alias:pinyin}` | `deep-learning-intro` | 属性存在，使用属性值 |

如果 frontmatter 中没有 `alias` 字段：

| 变量 | 结果 | 说明 |
|-----|------|------|
| `{property:alias:pinyin}` | `sdxxrm` | 属性不存在，回退为拼音首字母 |

### 推荐配置

对于中文用户，推荐的文件名模板：

```
{property:alias:pinyin}-{date:YYYYMMDDHHmmss}
```

这样配置后：
- 如果笔记有 `alias` 属性 → 使用别名（如 `deep-learning-intro-20240413143025`）
- 如果没有 `alias` 属性 → 使用拼音首字母（如 `sdxxrm-20240413143025`）

配合文件夹模板 `img/{notename}/`，可以将图片整齐地组织在与笔记同名的子文件夹中。

---

## 变量参考

完整变量列表请参考 [变量参考指南](docs-zh/变量参考指南.md)。

### 基本文件信息

| 变量 | 说明 | 示例 |
|-----|------|------|
| `{imagename}` | 原始图片文件名（不含扩展名） | `vacation-photo` |
| `{notename}` | 当前笔记名称 | `我的笔记` |
| `{notename_nospaces}` | 笔记名称（空格替换为下划线） | `我的笔记` |
| `{pinyin}` | 笔记名称的拼音首字母 | `wdbj` |
| `{filetype}` | 文件扩展名 | `jpg` |
| `{parentfolder}` | 父文件夹名 | `Photos` |
| `{notepath}` | 当前笔记的完整路径 | `Documents/我的笔记` |
| `{notefolder}` | 当前笔记所在文件夹名 | `Documents` |
| `{vaultname}` | 仓库名称 | `我的知识库` |

### 笔记属性（Frontmatter）

| 变量 | 说明 | 示例 |
|-----|------|------|
| `{property:key}` | 读取 frontmatter 中的属性值 | `{property:alias}` → `my-note` |
| `{property:key:pinyin}` | 读取属性值，不存在则回退为拼音首字母 | `{property:alias:pinyin}` → `my-note` 或 `wdbj` |

### 日期和时间

| 变量 | 说明 | 示例 |
|-----|------|------|
| `{date:YYYY-MM-DD}` | 自定义日期格式 | `2024-04-13` |
| `{today}` | 今天日期 | `2024-04-13` |
| `{timestamp}` | Unix 时间戳 | `1713012345` |
| `{time}` | 当前时间 | `14-30-45` |

### 哈希和唯一标识符

| 变量 | 说明 | 示例 |
|-----|------|------|
| `{MD5:filename}` | 文件名的 MD5 哈希 | `a1b2c3d4...` |
| `{sha256:image}` | 图片内容的 SHA-256 哈希 | `e5f6a7b8...` |
| `{uuid}` | 随机 UUID | `550e8400-...` |
| `{counter:000}` | 递增计数器 | `001` |

---

## 文档

- [变量参考指南](docs-zh/变量参考指南.md) — 所有支持的变量及用例示例
- [标注工具](docs-zh/标注工具.md) — 图片标注和标记工具说明
- [图片压缩质量分析](docs-zh/图片压缩质量分析.md) — 图片格式 vs 质量 vs 文件大小的实证分析
- [文件大小说明](docs-zh/文件大小说明.md) — 插件如何选择最小输出的详细说明
- [pngquant 说明](docs-zh/pngquant%20说明.md) — 可选的 PNG 优化工具安装指南

---

## 安装方法

1. 从最新发布页面下载 `main.js`、`styles.css`、`manifest.json` 文件
2. 在 `仓库文件夹/.obsidian/plugins/` 内创建名为 `obsidian-image-converter` 的新文件夹（如果 plugins 文件夹不存在，请手动创建）
3. 将下载的文件移动到 `obsidian-image-converter` 文件夹中
4. 在 Obsidian 中启用插件

## 问题与支持

发现 bug 或需要帮助？[提交 issue](https://github.com/xRyul/obsidian-image-converter/issues)

## 许可证

MIT License - 参见 [LICENSE](LICENSE)

## 致谢

- 原始灵感来自 [musug 的插件](https://github.com/musug/obsidian-paste-png-to-jpeg)
- [FabricJS](https://fabricjs.com/) 提供标注功能
