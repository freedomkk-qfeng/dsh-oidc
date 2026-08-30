# 华东师范大学参考组合

**简体中文** | [English](ecnu-reference.en.md)

本仓库仅以华东师范大学 / ChatECNU 作为通用标准的一项具体参考实现。公开示例全部使用占位符，不包含生产 endpoint、OIDC Client ID、API Key、Token、个人数据或 Logo 资产。

参考文件为 [`examples/ecnu.enterprise-profile.example.json`](../examples/ecnu.enterprise-profile.example.json)。

## 预期组合

现有 ChatECNU Work 产品可以表达为组合结构，而不是单体实现：

```text
DeepSeek Harness
  + dsh-oidc
      - 标准 OIDC 身份
      - worker-user-center-v1 Key Binding
      - ECNU Enterprise Profile
      - 声明式 ChatECNU Provider/模型
      - 有边界的品牌/账号 UI 和共用企业模型设置 UI
  + ECNU 产品插件
      - 面向纯文本 ecnu-max 的图像理解回退
      - 企业搜索通路和 DSH 官方结果渲染
      - 产品预设、Skill 和资源
      - native 桌面账号 adapter 与操作系统凭据保险库
      - 配额或机构特有业务 UI
  + 桌面外壳、打包与更新器
```

纯 Web DSH 使用 Web 后端和适合宿主的 Credential Provider。ChatECNU Work 桌面端使用 native 后端，并把现有 Wails 实现保留在 `enterpriseAccounts` 后面。两者都通过 `dsh-oidc` 渲染企业模型区域；桌面 adapter 只额外声明可变配置和重启能力。两种模式都不改变 OIDC 或 Key Binding 服务端契约。

## 身份预期

OIDC Provider 应返回标准 UserInfo：

```json
{
  "sub": "opaque-stable-subject",
  "name": "Display Name"
}
```

如果没有 `name`，UI 会降级显示 `sub`。插件不会调用 ECNU 私有人员信息接口，也不会映射 `data.attributes.XM` 等路径。这是有意设计：机构 OIDC 服务应提供标准 claim。

## 模型示例

占位示例展示了两类常见模型事实：

- `ecnu-max`：纯文本、大上下文、支持选择 reasoning effort；
- `ecnu-plus`：原生文本/图片输入，支持 thinking，但不支持选择 reasoning-effort 参数。

对 `ecnu-plus` 设置 `supportsReasoningEffort: false`，会移除不支持的 effort 参数但保留 thinking。对 `ecnu-max`，独立的 ECNU 图像理解插件可注册 `enterpriseTransforms`，在不修改 Profile、不替换 Provider 路由的情况下增加聚合图像能力。

## 任何公开发布之前

ECNU 维护者必须另行批准：

- GitHub 组织和仓库可见性；
- 版权主体表述；
- 校名、ChatECNU 名称和品牌值的使用；
- 公开支持和安全联系地址；
- npm 包名发布；
- 清除全部内部 endpoint、标识符、日志、归档和凭据；
- 生产部署的隐私与安全审查。

存在这份参考文档不代表已获准发布任何机构基础设施细节或品牌资产。
