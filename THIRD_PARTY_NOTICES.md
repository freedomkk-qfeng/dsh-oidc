# 第三方声明

**简体中文** | [English](THIRD_PARTY_NOTICES.en.md)

`dsh-oidc` 使用 MIT 许可证，并与以下直接声明的软件包互操作。精确版本记录在 `package-lock.json` 中；间接依赖的许可证文件保留在各自发布包内。

## 运行时 Peer（源码未复制进本仓库）

- DeepSeek Harness `0.1.2-rc.1` 软件包和 `@deepseek-ai/cordis` `4.0.2`——MIT，Copyright (c) 2026 DeepSeek，<https://github.com/deepseek-ai/deepseek-harness>
- `@earendil-works/pi-ai` `^0.84.2`（已审查源码 Runtime 中为 `0.84.4`）——MIT，<https://github.com/earendil-works/pi>
- React `18.x`——MIT，Copyright (c) Facebook, Inc. and its affiliates，<https://github.com/facebook/react>

本仓库使用这些软件包的公开 API，不 vendor 其源码。它们作为 peer dependency 出现，不表示其作者认可本项目。

## 浏览器产物中包含的代码

生成的 `lib/client.js` 打包了 Zod：

### Zod 4.4.3

以下许可证正文保持英文原文：

MIT License

Copyright (c) 2025 Colin McDonnell

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

源码：<https://github.com/colinhacks/zod>

## 仅开发使用的工具

仓库还声明 tsdown（MIT）、TypeScript（Apache-2.0）、Ajv（MIT）、YAML（ISC）和 `@types/react`（MIT），用于构建与校验。它们不包含在 npm 包运行时文件中。发布前应根据 lockfile 审查其间接许可证和安装脚本。

在 `0.1.0` lockfile 中，npm 报告 `@google/genai`（无操作 preinstall）和 `protobufjs`（postinstall）包含安装脚本；二者均来自 `@earendil-works/pi-ai` peer 依赖树。准备安装期间，npm allow-scripts 策略未批准这些脚本。每次 lockfile 变化后，发布经理必须重新审查；`npm audit` 报告零已知漏洞不能替代该审查。

准备好的 lockfile 含 230 个带许可证元数据的软件包条目：MIT 170 个、Apache-2.0 45 个、BSD-3-Clause 12 个、ISC 2 个和 0BSD 1 个。这只是清单结果，不构成法律意见；发布经理必须从最终 lockfile 重新生成并审查。
