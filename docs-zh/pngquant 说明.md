## 使用 PNGQUANT 优化图片（可选）

本插件可以选择使用 [pngquant](https://pngquant.org/) 来优化 PNG 图片，从而显著减小文件大小。**pngquant 不包含在本插件中，必须单独安装。**

**许可证信息：**

pngquant 由 `libimagequant` 驱动，该库采用 GPLv3+ 和商业许可证双重许可。由于本插件通过标准输入/输出将 `pngquant` 作为独立的外部进程调用，并且*不*分发 `libimagequant` 的代码，因此您使用本插件*不需要*将自己的作品以 GPL 许可证发布。但是，如果您选择安装和使用 `pngquant`，您需要自行遵守 `libimagequant` 许可证的条款。

**安装方法：**

* **Windows：** 从 [pngquant 官网](https://pngquant.org/) 下载 `pngquant.exe` 可执行文件，将其放置在系统 PATH 目录中，或在插件设置中指定可执行文件的完整路径。
* **macOS：** 使用 Homebrew 安装：`brew install pngquant`
* **Linux：** 使用发行版的包管理器安装（例如 `apt-get install pngquant`、`yum install pngquant` 等）。
