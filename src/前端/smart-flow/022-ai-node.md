---
title: "Smart Flow 022：AI 节点"
icon: "robot"
date: 2026-07-05
category:
  - "前端"
tag:
  - "Smart Flow"
  - "Workflow"
  - "AI"
  - "Credential"
star: true
---

# 022: AI 节点

提交：`8c80e7a 022:ai节点`

对比基准：`3cb8965 021:tally表单触发webhook`

本文写于 2026-07-05。这个提交的目标是把 AI 能力作为一种 workflow 执行节点接入画布，让用户可以在 React Flow 里配置 Provider、模型、凭证和 Prompt，并把 AI 结果写回 workflow context，供后续节点继续使用。

## 这个提交解决的问题

021 提交已经支持 Tally webhook 触发 workflow，也支持 HTTP Request 节点消费上下文变量。但 workflow 还缺少一个核心执行能力：

```txt
上游节点产出数据
  -> AI 节点读取 context
  -> 使用 Prompt 调用模型
  -> 把模型结果写回 context
  -> 下游节点继续消费 AI 结果
```

022 的核心能力是：

1. 用户可以从节点选择器添加 AI 节点。
2. AI 节点可以打开配置弹窗，选择 Qwen、DeepSeek 或 Gemini。
3. 用户可以选择已有凭证，或在弹窗里直接保存新的 API Key。
4. 凭证不直接存进 React Flow node data，而是加密保存在 `Credential` 表。
5. workflow 保存时，节点配置和 `credentialId` 会被分别落库。
6. Inngest 执行时，AI executor 根据节点配置和凭证调用 AI SDK。
7. 执行状态通过 Inngest Realtime 回到画布节点。

## 前端视角的整体架构

```txt
Node Selector
  -> 添加 NodeType.AI
  -> React Flow 使用 AiNode 渲染
  -> AiNode 打开 AiDialog
  -> AiDialog 使用 react-hook-form + zod 校验配置
  -> useCredentialsByProvider 查询已有凭证
  -> useCreateCredential 保存新 API Key
  -> updateNodeData 写入节点配置
  -> workflows.update 保存 workflow
  -> 服务端拆分 node.data 和 credentialId
  -> Inngest 执行 workflow
  -> aiExecutor 读取 Credential、渲染 Prompt、调用 AI SDK
  -> 返回 context[variableName]
  -> useNodeStatus 订阅 realtime status 并更新节点 UI
```

这个设计的关键点是把“前端可编辑配置”和“敏感凭证”分开：

```txt
React Flow node.data
  保存 provider、model、prompt、temperature 等非敏感配置

Node.credentialId
  只保存凭证 ID

Credential.encryptedApiKey
  服务端加密保存 API Key
```

这样前端仍然能完整恢复节点配置，但不会把 API Key 明文塞进 workflow JSON。

## 依赖设计

文件：

- `package.json`
- `package-lock.json`

新增依赖：

```json
"@ai-sdk/alibaba": "^1.0.34",
"@ai-sdk/deepseek": "^2.0.44"
```

已有依赖里已经有：

```json
"@ai-sdk/google": "^3.0.83",
"ai": "^6.0.208",
"handlebars": "^4.7.8"
```

解释：

- `ai` 是 Vercel AI SDK 的核心包，执行器里用 `generateText` 统一调用文本生成。
- `@ai-sdk/alibaba` 用于 Qwen。
- `@ai-sdk/deepseek` 用于 DeepSeek。
- `@ai-sdk/google` 用于 Gemini。
- `handlebars` 用于把 workflow context 渲染进 Prompt，例如 `{{tally.answersByLabel.email}}`。

这样做的原因是执行器不直接手写各家 HTTP API，而是通过 AI SDK 抹平不同 Provider 的调用差异。前端只需要保存 `provider + model + credentialId + prompt`，执行器根据 provider 创建对应模型。

## 数据库模型

文件：

- `prisma/schema.prisma`
- `prisma/migrations/20260705091539_ai_credentials_schema/migration.sql`

### Provider 枚举

```prisma
enum CredentialProvider {
  QWEN
  DEEPSEEK
  GEMINI
}
```

解释：

`CredentialProvider` 把凭证归类到固定 Provider。前端选择 Provider 时使用同一个枚举，所以 UI、tRPC 输入校验、Prisma 存储和执行器分支都共享同一套类型。

为什么这样设计：

- 避免前端传任意字符串导致执行器无法判断。
- 方便按 Provider 查询凭证。
- 方便未来扩展新的 Provider。

### Credential 表

```prisma
model Credential {
  id              String             @id @default(cuid())
  userId          String
  user            User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  name            String
  provider        CredentialProvider
  encryptedApiKey String
  apiKeyPreview   String?
  baseUrl         String?
  metadata        Json               @default("{}")
  nodes           Node[]
  createdAt       DateTime           @default(now())
  updatedAt       DateTime           @updatedAt

  @@index([userId])
  @@index([userId, provider])
}
```

解释：

- `userId` 表示凭证属于哪个用户。
- `provider` 表示这个 API Key 是 Qwen、DeepSeek 还是 Gemini。
- `encryptedApiKey` 存密文，不存明文。
- `apiKeyPreview` 只保存类似 `****1234` 的预览，用于前端下拉框展示。
- `baseUrl` 支持用户配置代理地址或兼容 OpenAI 风格的服务地址。
- `metadata` 预留扩展字段。
- `nodes` 是反向关系，表示哪些节点引用了这个凭证。

为什么这样设计：

前端节点只需要知道“选中了哪个凭证”，不应该持有 API Key。真正执行时由服务端根据 `credentialId + userId + provider` 取凭证，既能保护密钥，也能防止用户引用别人的凭证。

### Node 类型和凭证关联

```prisma
enum NodeType {
  INITIAL
  MANUAL_TRIGGER
  HTTP_REQUEST
  TALLY_FORM_TRIGGER
  AI
}
```

```prisma
model Node {
  id                String       @id @default(cuid())
  workflowId        String
  workflow          Workflow     @relation(fields: [workflowId], references: [id], onDelete: Cascade)
  name              String
  type              NodeType
  position          Json
  data              Json         @default("{}")
  credentialId      String?
  credential        Credential?  @relation(fields: [credentialId], references: [id], onDelete: SetNull)
  outputConnections Connection[] @relation("FromNode")
  inputConnections  Connection[] @relation("ToNode")

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([workflowId])
  @@index([credentialId])
}
```

解释：

- `NodeType.AI` 让数据库能保存 AI 节点。
- `data` 保存节点通用配置，例如 model、prompt、variableName。
- `credentialId` 单独保存凭证引用。
- `onDelete: SetNull` 表示凭证删除后，节点还在，但凭证引用变成空。前端可以显示“需要重新配置”。

为什么 `credentialId` 不直接放进 `data`：

1. 服务端可以用外键约束凭证是否存在。
2. 可以用 Prisma 关系表达凭证和节点的引用关系。
3. 可以单独索引 `credentialId`。
4. workflow JSON 不会和敏感凭证体系混在一起。

## 凭证加密工具

文件：

- `src/lib/credential-secrets.ts`

### 只允许服务端使用

```ts
import "server-only";
```

解释：

`server-only` 可以防止这个模块被 Client Component 引入。因为里面包含加解密逻辑和服务端环境变量读取，不能进入浏览器 bundle。

### 选择加密算法和 IV 长度

```ts
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
```

解释：

- `aes-256-gcm` 提供加密和认证标签，能发现密文是否被篡改。
- GCM 常用 12 字节 IV。

### 派生加密 Key

```ts
const getEncryptionKey = () => {
  const secret =
    process.env.CREDENTIAL_ENCRYPTION_KEY ||
    process.env.BETTER_AUTH_SECRET ||
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET;

  if (!secret) {
    throw new Error(
      "CREDENTIAL_ENCRYPTION_KEY is required to encrypt user credentials",
    );
  }

  return createHash("sha256").update(secret).digest();
};
```

解释：

前端保存新 API Key 时，最终会走到服务端 `credentials.create`。服务端需要稳定的密钥来加密用户 API Key。

这里按优先级读取环境变量，并用 `sha256` 得到 32 字节 key，满足 AES-256 需要。

为什么这样设计：

- 本地开发可以复用已有 auth secret。
- 生产环境最好显式配置 `CREDENTIAL_ENCRYPTION_KEY`。
- 不把原始环境变量直接当 key 使用，统一变成固定长度。

### 加密 API Key

```ts
export const encryptSecret = (value: string) => {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    iv.toString("base64"),
    authTag.toString("base64"),
    encrypted.toString("base64"),
  ].join(".");
};
```

解释：

这段代码把 API Key 加密成：

```txt
iv.authTag.encrypted
```

每一部分都用 base64 存储，中间用点号拼接。`iv` 用随机值，保证同一个 API Key 多次保存时密文也不同。

### 解密 API Key

```ts
export const decryptSecret = (value: string) => {
  const [iv, authTag, encrypted] = value.split(".");

  if (!iv || !authTag || !encrypted) {
    throw new Error("Invalid encrypted credential payload");
  }

  const decipher = createDecipheriv(
    ALGORITHM,
    getEncryptionKey(),
    Buffer.from(iv, "base64"),
  );

  decipher.setAuthTag(Buffer.from(authTag, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, "base64")),
    decipher.final(),
  ]).toString("utf8");
};
```

解释：

执行 AI 节点时，服务端读取 `Credential.encryptedApiKey`，再用这段逻辑还原明文 API Key。`setAuthTag` 会校验密文完整性，如果密文或 key 不对，解密会失败。

### 生成前端预览

```ts
export const previewSecret = (value: string) => {
  const suffix = value.slice(-4);
  return suffix ? `****${suffix}` : "****";
};
```

解释：

前端下拉框不展示完整 API Key，只展示最后 4 位，帮助用户识别凭证。

## 凭证 tRPC Router

文件：

- `src/app/features/credentials/server/routers.ts`
- `src/trpc/routers/_app.ts`

### Router 注册

```ts
import { credentialsRouter } from "@/app/features/credentials/server/routers";
import { workflowsRouter } from "@/app/features/workflows/server/routers";
import { createTRPCRouter } from "../init";

export const appRouter = createTRPCRouter({
  workflows: workflowsRouter,
  credentials: credentialsRouter,
});
```

解释：

`credentialsRouter` 注册到根 router 后，前端才能通过 `useTRPC()` 拿到：

```txt
trpc.credentials.create
trpc.credentials.getByProvider
trpc.credentials.remove
```

### 安全返回字段

```ts
const safeCredentialSelect = {
  id: true,
  name: true,
  provider: true,
  apiKeyPreview: true,
  baseUrl: true,
  createdAt: true,
  updatedAt: true,
} as const;
```

解释：

所有凭证查询和 mutation 都只返回这些字段，不返回 `encryptedApiKey`。

为什么这样设计：

即使是密文，也没有必要发送到浏览器。前端只需要 `id/name/provider/apiKeyPreview/baseUrl` 来展示和选择。

### 规范化 Gemini Base URL

```ts
const normalizeGeminiBaseUrl = (baseUrl: string) => {
  try {
    const url = new URL(baseUrl);
    url.search = "";
    url.hash = "";

    const modelsIndex = url.pathname.indexOf("/models/");
    if (modelsIndex >= 0) {
      url.pathname = url.pathname.slice(0, modelsIndex);
    }

    url.pathname = url.pathname.replace(/\/interactions\/?$/, "");

    return url.toString().replace(/\/$/, "");
  } catch {
    return baseUrl;
  }
};
```

解释：

Gemini 的 SDK 调用里使用的是：

```ts
createGoogleGenerativeAI(options).interactions(model)
```

如果用户把完整模型端点、`/models/...` 或 `/interactions` 填进 Base URL，SDK 可能会拼出错误 URL。所以服务端在保存前做一次规整。

### 通用 Base URL 处理

```ts
const normalizedBaseUrl = (
  provider: CredentialProvider,
  value?: string | null,
) => {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  const withoutTrailingSlash = trimmed.replace(/\/+$/, "");

  return provider === CredentialProvider.GEMINI
    ? normalizeGeminiBaseUrl(withoutTrailingSlash)
    : withoutTrailingSlash;
};
```

解释：

这段逻辑把空字符串变成 `null`，去掉末尾 `/`，并对 Gemini 做特殊处理。这样执行器拿到的 `baseUrl` 更稳定。

### 创建凭证

```ts
create: protectedProcedure
  .input(
    z.object({
      name: z.string().trim().optional(),
      provider: credentialProviderSchema,
      apiKey: z.string().trim().min(1, "API key is required"),
      baseUrl: z.string().trim().optional(),
    }),
  )
  .mutation(({ ctx, input }) => {
    const apiKey = input.apiKey.trim();
    const providerName = input.provider.toLowerCase();
    const name = input.name?.trim() || `${providerName} credential`;

    return prisma.credential.create({
      data: {
        userId: ctx.auth.user.id,
        name,
        provider: input.provider,
        encryptedApiKey: encryptSecret(apiKey),
        apiKeyPreview: previewSecret(apiKey),
        baseUrl: normalizedBaseUrl(input.provider, input.baseUrl),
      },
      select: safeCredentialSelect,
    });
  }),
```

解释：

前端在 AI 弹窗里输入新 API Key 时，会调用这个 mutation。服务端会：

1. 使用当前登录用户的 `ctx.auth.user.id` 绑定归属。
2. 对 API Key 加密。
3. 生成预览字符串。
4. 保存 Provider 和 Base URL。
5. 只返回安全字段。

### 按 Provider 查询凭证

```ts
getByProvider: protectedProcedure
  .input(
    z.object({
      provider: credentialProviderSchema,
    }),
  )
  .query(({ ctx, input }) => {
    return prisma.credential.findMany({
      where: {
        userId: ctx.auth.user.id,
        provider: input.provider,
      },
      orderBy: {
        updatedAt: "desc",
      },
      select: safeCredentialSelect,
    });
  }),
```

解释：

AI 弹窗选择 Provider 后，只展示该 Provider 下的凭证。这样不会让用户在 Gemini 节点里误选 DeepSeek API Key。

## 前端凭证 Hooks

文件：

- `src/app/features/credentials/hooks/use-credentials.ts`

### 查询当前 Provider 凭证

```ts
export const useCredentialsByProvider = (provider: CredentialProvider) => {
  const trpc = useTRPC();

  return useQuery(trpc.credentials.getByProvider.queryOptions({ provider }));
};
```

解释：

这是 AI 弹窗里的凭证下拉框数据来源。`provider` 改变时，query key 也会改变，React Query 会请求对应 Provider 的凭证列表。

### 创建凭证并刷新列表

```ts
export const useCreateCredential = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation(
    trpc.credentials.create.mutationOptions({
      onSuccess: (credential) => {
        toast.success(`Credential "${credential.name}" created`);
        void queryClient.invalidateQueries(
          trpc.credentials.getByProvider.queryFilter({
            provider: credential.provider,
          }),
        );
      },
      onError: (error) => {
        toast.error(`Failed to create credential: ${error.message}`);
      },
    }),
  );
};
```

解释：

AI 弹窗保存新 API Key 成功后，需要让凭证下拉框看到新凭证。这里用 `invalidateQueries` 刷新当前 Provider 的凭证列表。

为什么这样设计：

凭证是服务端状态，应该用 React Query 管理缓存；节点配置是画布本地状态，才用 React Flow 的 `updateNodeData`。

## AI Provider 配置

文件：

- `src/app/features/excutions/components/ai/constants.ts`

### 默认 Provider

```ts
export const DEFAULT_AI_PROVIDER = CredentialProvider.QWEN;
```

解释：

新建 AI 节点时默认选择 Qwen，降低第一次配置成本。

### Provider 和模型列表

```ts
export const AI_PROVIDER_OPTIONS = [
  {
    provider: CredentialProvider.QWEN,
    label: "Qwen",
    defaultModel: "qwen3.7-plus",
    models: [
      "qwen3.7-plus",
      "qwen3.7-max",
      "qwen3.7-max-preview",
      "qwen3.6-flash",
      "qwen-plus-latest",
      "qwen-plus",
    ],
  },
  {
    provider: CredentialProvider.DEEPSEEK,
    label: "DeepSeek",
    defaultModel: "deepseek-v4-flash",
    models: [
      "deepseek-v4-flash",
      "deepseek-v4-pro",
      "deepseek-chat",
      "deepseek-reasoner",
    ],
  },
  {
    provider: CredentialProvider.GEMINI,
    label: "Gemini",
    defaultModel: "gemini-3.5-flash",
    models: [
      "gemini-3.5-flash",
      "gemini-flash-latest",
      "gemini-3-flash-preview",
      "gemini-3.1-pro-preview",
      "gemini-3.1-flash-lite",
      "gemini-2.5-pro",
      "gemini-2.5-flash",
    ],
  },
] as const;
```

解释：

这里集中管理 Provider label、默认模型和模型下拉列表。前端弹窗、节点描述和默认值都从这里读取。

为什么这样设计：

如果把模型列表散落在多个组件里，新增模型时容易漏改。集中配置让 UI 和默认值保持一致。

### 获取 Provider 配置

```ts
export const getAiProviderConfig = (provider: CredentialProvider) => {
  return (
    AI_PROVIDER_OPTIONS.find((option) => option.provider === provider) ||
    AI_PROVIDER_OPTIONS[0]
  );
};
```

解释：

根据 Prisma 枚举找到对应前端配置。如果找不到，回退到第一个配置，避免 UI 崩溃。

## AI 配置弹窗

文件：

- `src/app/features/excutions/components/ai/dialog.tsx`

### 数字字符串校验

```ts
const optionalNumericString = (min: number, max: number, integer = false) =>
  z
    .string()
    .optional()
    .refine(
      (value) => {
        if (!value) {
          return true;
        }

        const numberValue = Number(value);

        if (!Number.isFinite(numberValue)) {
          return false;
        }

        if (integer && !Number.isInteger(numberValue)) {
          return false;
        }

        return numberValue >= min && numberValue <= max;
      },
      { message: `Enter a number from ${min} to ${max}` },
    );
```

解释：

表单里的 `temperature` 和 `maxOutputTokens` 来自 `<Input type="number">`，React Hook Form 里仍然按字符串处理更方便。这个 helper 允许空值，但如果用户填写了值，就必须在合法范围内。

### 自定义模型标记

```ts
const CUSTOM_MODEL_VALUE = "__custom_model__";

const isPresetModel = (models: readonly string[], model?: string) => {
  return Boolean(model && models.includes(model));
};
```

解释：

模型下拉框既支持预设模型，也支持手动输入新模型 ID。`CUSTOM_MODEL_VALUE` 是 Select 内部用的特殊值，不会保存到节点配置里。

为什么这样设计：

AI 模型更新很快。如果只允许预设列表，用户必须等代码更新才能用新模型。自定义模型输入保留了前端的灵活性。

### 表单 Schema

```ts
const formSchema = z
  .object({
    variableName: z
      .string()
      .min(1, { message: "Variable name is required" })
      .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
        message:
          "Variable name must start with a letter or underscore and contain only letters, numbers, underscores, and $",
      }),
    provider: z.enum(CredentialProvider),
    model: z.string().min(1, "Model is required"),
    credentialId: z.string().optional(),
    newCredentialName: z.string().optional(),
    apiKey: z.string().optional(),
    baseUrl: z.string().optional(),
    systemPrompt: z.string().optional(),
    prompt: z.string().min(1, "Prompt is required"),
    temperature: optionalNumericString(0, 2),
    maxOutputTokens: optionalNumericString(1, 128000, true),
  })
  .refine((values) => Boolean(values.credentialId || values.apiKey?.trim()), {
    message: "Select a credential or enter a new API key",
    path: ["credentialId"],
  });
```

解释：

这段 schema 约束了 AI 节点配置：

- `variableName` 必须是可作为模板变量使用的名称。
- `provider` 必须来自 Prisma 的 `CredentialProvider`。
- `model` 和 `prompt` 必填。
- `credentialId` 和 `apiKey` 至少有一个。
- `temperature` 是 0 到 2。
- `maxOutputTokens` 是整数。

为什么这样设计：

错误越早在前端表单拦截，执行时失败越少。尤其是 `variableName`，如果允许空格或特殊字符，后续节点通过 `{{xxx}}` 访问时会很难理解。

### 节点保存的数据结构

```ts
export type AiNodeConfigData = {
  variableName: string;
  provider: CredentialProvider;
  model: string;
  credentialId: string;
  systemPrompt?: string;
  prompt: string;
  temperature?: number;
  maxOutputTokens?: number;
};

export type AiDialogData = Partial<AiNodeConfigData>;
```

解释：

`AiNodeConfigData` 是弹窗提交后写入 React Flow node data 的结构。`AiDialogData` 用 `Partial`，因为新节点一开始可能没有任何配置。

### 默认值

```ts
const getDefaultValues = (data?: AiDialogData): FormValues => {
  const provider = data?.provider || DEFAULT_AI_PROVIDER;
  const providerConfig = getAiProviderConfig(provider);

  return {
    variableName: data?.variableName || "aiResult",
    provider,
    model: data?.model || providerConfig.defaultModel,
    credentialId: data?.credentialId || undefined,
    newCredentialName: "",
    apiKey: "",
    baseUrl: "",
    systemPrompt: data?.systemPrompt || "",
    prompt: data?.prompt || "",
    temperature:
      data?.temperature === undefined ? "" : String(data.temperature),
    maxOutputTokens:
      data?.maxOutputTokens === undefined ? "" : String(data.maxOutputTokens),
  };
};
```

解释：

弹窗打开时用当前节点数据恢复表单。如果节点还没配置，就使用默认 Provider、默认模型和默认输出变量 `aiResult`。

注意：`apiKey` 不从节点数据恢复，因为 API Key 不存到 node data。

### 初始化表单并在打开时重置

```ts
const form = useForm<FormValues>({
  resolver: zodResolver(formSchema),
  defaultValues: getDefaultValues(data),
});

useEffect(() => {
  if (open) {
    form.reset(getDefaultValues(data));
  }
}, [open, data, form]);
```

解释：

`NodeConfigDialog` 是受控弹窗。每次打开时重置表单，确保用户看到的是当前节点最新配置，而不是上一次关闭前残留的临时输入。

### 监听 Provider 和凭证

```ts
const provider = form.watch("provider");
const credentialId = form.watch("credentialId");
const apiKey = form.watch("apiKey");
const variableName = form.watch("variableName") || "aiResult";
const providerConfig = useMemo(
  () => getAiProviderConfig(provider),
  [provider],
);
const credentials = useCredentialsByProvider(provider);
```

解释：

- `provider` 决定模型列表和凭证列表。
- `credentialId` 决定 API Key 输入框是否显示 required 提示。
- `apiKey` 决定是否展示 Base URL 字段。
- `variableName` 用来实时展示后续节点的模板写法。

### 提交流程

```ts
const handleSubmit = form.handleSubmit(async (values) => {
  let nextCredentialId = values.credentialId;
  const newApiKey = values.apiKey?.trim();

  if (newApiKey) {
    let credential: Awaited<ReturnType<typeof createCredential.mutateAsync>>;

    try {
      credential = await createCredential.mutateAsync({
        provider: values.provider,
        name:
          values.newCredentialName?.trim() ||
          `${getAiProviderConfig(values.provider).label} API key`,
        apiKey: newApiKey,
        baseUrl: values.baseUrl?.trim() || undefined,
      });
    } catch {
      form.setError("apiKey", {
        message: "Failed to save credential. Check API key and Base URL.",
      });
      return;
    }

    nextCredentialId = credential.id;
  }

  if (!nextCredentialId) {
    form.setError("credentialId", {
      message: "Select a credential or enter a new API key",
    });
    return;
  }

  onSubmit({
    variableName: values.variableName.trim(),
    provider: values.provider,
    model: values.model,
    credentialId: nextCredentialId,
    systemPrompt: values.systemPrompt?.trim() || undefined,
    prompt: values.prompt,
    temperature: values.temperature ? Number(values.temperature) : undefined,
    maxOutputTokens: values.maxOutputTokens
      ? Number(values.maxOutputTokens)
      : undefined,
  });

  onOpenChange(false);
});
```

解释：

这段是弹窗最核心的前端流程：

1. 如果用户输入了新 API Key，就先调用 `createCredential.mutateAsync` 保存凭证。
2. 保存成功后拿到 `credential.id`。
3. 如果没有已有凭证也没有新凭证，就在表单里报错。
4. 最后调用 `onSubmit`，把节点配置写回 React Flow。
5. 关闭弹窗。

为什么新 API Key 先保存，再更新节点：

节点保存的只是 `credentialId`。如果凭证保存失败，就不能让节点引用一个不存在的凭证。

### Provider 选择

```tsx
<Select
  value={field.value}
  onValueChange={(value) => {
    const nextProvider = value as CredentialProvider;
    const nextConfig = getAiProviderConfig(nextProvider);
    field.onChange(nextProvider);
    form.setValue("model", nextConfig.defaultModel);
    form.setValue("credentialId", undefined);
  }}
>
```

解释：

切换 Provider 时：

- 表单 Provider 更新。
- 模型重置成新 Provider 的默认模型。
- 凭证清空，防止 Qwen 节点继续引用 DeepSeek 凭证。

### 模型选择和自定义模型

```tsx
<Select
  value={
    isPresetModel(providerConfig.models, field.value)
      ? field.value
      : CUSTOM_MODEL_VALUE
  }
  onValueChange={(value) => {
    field.onChange(value === CUSTOM_MODEL_VALUE ? "" : value);
  }}
>
```

```tsx
{!isPresetModel(providerConfig.models, field.value) && (
  <FormControl>
    <Input
      className="mt-2"
      placeholder={`${providerConfig.defaultModel} or provider model id`}
      value={field.value}
      onChange={field.onChange}
    />
  </FormControl>
)}
```

解释：

如果当前模型不在预设列表里，Select 显示为 `Custom model ID`，下面展示一个输入框。这样同一个字段 `model` 同时支持下拉选择和自由输入。

### 凭证下拉

```tsx
<Select
  value={field.value}
  onValueChange={field.onChange}
  disabled={credentials.isLoading || !credentials.data?.length}
>
```

```tsx
{credentials.data?.map((credential) => (
  <SelectItem key={credential.id} value={credential.id}>
    {credential.name}
    {credential.apiKeyPreview ? ` (${credential.apiKeyPreview})` : ""}
  </SelectItem>
))}
```

解释：

凭证列表来自 `useCredentialsByProvider(provider)`。前端只展示凭证名和 key 预览，不展示密钥本身。

### 新凭证输入

```tsx
<Input
  type="password"
  placeholder={credentialId ? "Optional" : "Required"}
  {...field}
/>
```

解释：

用户可以选择已有凭证，也可以输入新 API Key。输入框用 `password`，避免明文直接显示在界面上。

### Base URL 条件展示

```tsx
{apiKey?.trim() && (
  <FormField
    control={form.control}
    name="baseUrl"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Base URL</FormLabel>
        <FormControl>
          <Input
            placeholder={
              provider === CredentialProvider.GEMINI
                ? "Leave empty or https://generativelanguage.googleapis.com/v1beta"
                : "https://api.example.com/v1"
            }
            {...field}
          />
        </FormControl>
        {provider === CredentialProvider.GEMINI && (
          <FormDescription>
            Gemini 通常留空；不要填写 /interactions 或 /models 端点。
          </FormDescription>
        )}
        <FormMessage />
      </FormItem>
    )}
  />
)}
```

解释：

只有用户准备保存新 API Key 时才展示 Base URL，因为已有凭证的 Base URL 已经存在服务端。Gemini 给出额外提示，是因为它的 SDK 地址拼接规则更容易被用户填错。

### Prompt 配置

```tsx
<Textarea
  placeholder="Summarize this data: {{json myApiCall.httpResponse.data}}"
  className="min-h-28 font-mono text-sm"
  {...field}
/>
```

解释：

Prompt 支持 Handlebars 模板。用户可以引用上游节点写入 context 的变量，也可以用 `{{json xxx}}` 把对象格式化成 JSON 字符串。

## AI 节点组件

文件：

- `src/app/features/excutions/components/ai/node.tsx`

### 节点类型定义

```ts
type AiNodeData = AiDialogData;

type AiNodeType = Node<AiNodeData, "AI">;
```

解释：

React Flow 的节点数据就是弹窗数据。`"AI"` 对应 Prisma 的 `NodeType.AI`。

### 状态订阅

```ts
const nodeStatus = useNodeStatus({
  nodeId: props.id,
  channel: AI_CHANNEL_NAME,
  topic: "status",
  refreshToken: fetchAiRealtimeToken,
});
```

解释：

AI 节点和 HTTP Request、Tally 节点一样使用 realtime status。执行器发布 `loading/success/error`，前端节点通过 `useNodeStatus` 更新边框状态。

### 节点描述

```ts
const nodeData = props.data;
const providerConfig = nodeData.provider
  ? getAiProviderConfig(nodeData.provider)
  : null;
const description =
  providerConfig && nodeData.model && nodeData.prompt
    ? `${providerConfig.label} / ${nodeData.model}: ${nodeData.prompt.slice(0, 48)}`
    : "Not configured";
```

解释：

画布上的节点不展示完整配置，只展示关键信息：

```txt
Qwen / qwen3.7-plus: Summarize...
```

如果缺少配置，就显示 `Not configured`，提醒用户需要打开弹窗。

### 保存配置到 React Flow

```ts
const handleSubmit = (data: AiNodeConfigData) => {
  updateNodeData(props.id, data);
};
```

解释：

弹窗提交后并不直接请求保存 workflow，而是先更新 React Flow 本地节点数据。后续由编辑器已有保存流程统一把 nodes/edges 保存到服务端。

### 渲染节点和弹窗

```tsx
return (
  <>
    <BaseExecutionNode
      {...props}
      id={props.id}
      icon={BotIcon}
      status={nodeStatus}
      name="AI"
      description={description}
      onSettings={handleOpenSettings}
      onDoubleClick={handleOpenSettings}
    />

    <AiDialog
      open={dialogOpen}
      onOpenChange={setDialogOpen}
      data={nodeData}
      onSubmit={handleSubmit}
    />
  </>
);
```

解释：

AI 节点复用 `BaseExecutionNode`，保持和 HTTP Request 一致的视觉结构、删除按钮、设置入口和双击配置体验。

## Realtime Channel 和 Token

文件：

- `src/app/inngest/channels/ai.ts`
- `src/app/features/excutions/components/ai/actions.ts`

### Channel

```ts
export const AI_CHANNEL_NAME = "ai-execution";

export const aiChannel = channel(AI_CHANNEL_NAME).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>(),
);
```

解释：

这个 channel 专门承载 AI 节点执行状态。消息结构包含：

- `nodeId`：让前端知道是哪一个节点。
- `status`：让 UI 显示 loading、success 或 error。

### 订阅 Token

```ts
"use server";

export type AiToken = Realtime.Token<typeof aiChannel, ["status"]>;

export async function fetchAiRealtimeToken(): Promise<AiToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: aiChannel(),
    topics: ["status"],
  });

  return token;
}
```

解释：

前端不能直接生成 Inngest Realtime token，所以这里用 Server Action。`useNodeStatus` 会调用 `fetchAiRealtimeToken`，再建立订阅。

## 节点注册和选择器

文件：

- `src/app/config/initial-node.tsx`
- `src/components/node-selector.tsx`

### React Flow 注册 AI 节点

```ts
export const nodeComponents = {
  [NodeType.INITIAL]: InitialNode,
  [NodeType.HTTP_REQUEST]: HttpRequestNode,
  [NodeType.MANUAL_TRIGGER]: ManualTriggerNode,
  [NodeType.TALLY_FORM_TRIGGER]: TallyTriggerNode,
  [NodeType.AI]: AiNode,
} as const satisfies NodeTypes;
```

解释：

数据库里的 `NodeType.AI` 必须映射到前端 `AiNode` 组件。否则 workflow 可以保存 AI 类型，但 React Flow 不知道怎么渲染。

### 节点选择器增加 AI

```ts
const executionNodes: NodeTypeOption[] = [
  {
    type: NodeType.HTTP_REQUEST,
    label: "HTTP请求",
    description: "建立HTTP请求",
    icon: GlobeIcon,
  },
  {
    type: NodeType.AI,
    label: "AI",
    description: "调用 Qwen、DeepSeek 或 Gemini",
    icon: BotIcon,
  },
];
```

解释：

AI 是 execution node，不是 trigger node。它不会启动 workflow，而是在 workflow 已经开始后处理上下文数据。

### 抽出 NodeOptionButton

```tsx
function NodeOptionButton({
  nodeType,
  onSelect,
}: {
  nodeType: NodeTypeOption;
  onSelect: (selection: NodeTypeOption) => void;
}) {
  const Icon = nodeType.icon;

  return (
    <Button
      key={nodeType.type}
      type="button"
      variant="ghost"
      className="w-full justify-start h-auto py-5 px-4 rounded-none border-l-2 border-transparent hover:border-l-primary"
      onClick={() => onSelect(nodeType)}
    >
      <span className="flex items-center gap-6 w-full overflow-hidden">
        {typeof Icon === "string" ? (
          <Image
            src={Icon}
            alt={nodeType.label}
            width={20}
            height={20}
            className="size-5 shrink-0 object-contain rounded-sm"
          />
        ) : (
          <Icon className="size-5 shrink-0" />
        )}
        <span className="flex min-w-0 flex-col items-start text-left">
          <span className="font-medium text-sm">{nodeType.label}</span>
          <span className="truncate text-xs text-muted-foreground">
            {nodeType.description}
          </span>
        </span>
      </span>
    </Button>
  );
}
```

解释：

这个组件让 trigger nodes 和 execution nodes 复用同一套 UI。它同时支持：

- Lucide icon 组件。
- 图片路径 icon。

这对 AI 节点很重要，因为 AI 使用 `BotIcon`，Tally 使用图片。

## Workflow 保存和读取

文件：

- `src/app/features/workflows/server/routers.ts`

### 拆分 credentialId

```ts
const splitCredentialFromNodeData = (data?: Record<string, unknown>) => {
  const { credentialId, ...nodeData } = data ?? {};

  return {
    nodeData,
    credentialId:
      typeof credentialId === "string" && credentialId ? credentialId : null,
  };
};
```

解释：

前端 `AiDialog` 最终会把 `credentialId` 写进 React Flow node data。服务端保存 workflow 时，需要把它从通用 JSON 里拆出来，存到 `Node.credentialId` 字段。

为什么这样设计：

前端可以用一个统一的 node data 对象编辑配置；服务端保存时再根据数据库结构拆分。

### 保存前校验凭证归属

```ts
const credentialIds = [
  ...new Set(
    nodes.flatMap((node) => {
      const { credentialId } = splitCredentialFromNodeData(node.data);
      return credentialId ? [credentialId] : [];
    }),
  ),
];

if (credentialIds.length > 0) {
  const credentialCount = await prisma.credential.count({
    where: {
      id: {
        in: credentialIds,
      },
      userId: ctx.auth.user.id,
    },
  });

  if (credentialCount !== credentialIds.length) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "One or more credentials do not belong to this user",
    });
  }
}
```

解释：

这是安全边界。用户保存 workflow 时，服务端检查所有 `credentialId` 是否都属于当前用户。

为什么这样设计：

不能信任浏览器传来的 `credentialId`。如果不校验，用户可能手动构造请求引用别人的凭证。

### 落库时分开保存

```ts
await tx.node.createMany({
  data: nodes.map((node) => {
    const { nodeData, credentialId } = splitCredentialFromNodeData(
      node.data,
    );

    return {
      id: node.id,
      workflowId: id,
      name: node.type || "unknown",
      position: node.position,
      type: node.type as NodeType,
      data: nodeData as Prisma.InputJsonValue,
      credentialId,
    };
  }),
});
```

解释：

`nodeData` 进入 JSON 字段，`credentialId` 进入独立外键字段。

### 读取时合并回前端数据

```ts
const nodes: Node[] = workflow.nodes.map((node) => {
  const { nodeData } = splitCredentialFromNodeData(
    (node.data as Record<string, unknown>) || {},
  );

  return {
    id: node.id,
    type: node.type,
    position: node.position as { x: number; y: number },
    data: {
      ...nodeData,
      ...(node.credentialId ? { credentialId: node.credentialId } : {}),
    },
  };
});
```

解释：

前端编辑器希望拿到完整 node data，所以服务端读取 workflow 时又把 `credentialId` 合并回 `data`。这让 `AiDialog` 可以直接从 `props.data.credentialId` 恢复表单。

## 执行器类型和注册

文件：

- `src/app/features/excutions/type.ts`
- `src/app/features/excutions/lib/executor-registy.ts`

### 统一执行器参数

```ts
export interface NodeExecutorParams<TData = Record<string, unknown>> {
  data: TData;
  nodeId: string;
  context: WorkflowContext;
  step: StepTools;
  publish: Realtime.PublishFn;
}

export type NodeExecutor<TData = Record<string, unknown>> = (
  params: NodeExecutorParams<TData>,
) => Promise<WorkflowContext>;
```

解释：

每个节点执行器都接收同一套参数：

- `data` 是节点配置。
- `nodeId` 用于状态发布和 step key。
- `context` 是 workflow 当前上下文。
- `step` 是 Inngest step 工具。
- `publish` 用于发布 realtime 状态。

AI executor 和 HTTP executor 使用同一套接口，所以可以被统一调度。

### 注册 AI executor

```ts
const executorRegistry = {
  [NodeType.INITIAL]: manualTriggerExecutor,
  [NodeType.MANUAL_TRIGGER]: manualTriggerExecutor,
  [NodeType.HTTP_REQUEST]: httpRequestExecutor,
  [NodeType.TALLY_FORM_TRIGGER]: tallyTriggerExecutor,
  [NodeType.AI]: aiExecutor,
} satisfies Record<NodeType, NodeExecutor<never>>;
```

解释：

执行引擎不关心每种节点的内部逻辑，只根据 `NodeType` 找 executor。新增 AI 节点只需要注册一次。

## Inngest 执行链路

文件：

- `src/app/inngest/functions.ts`

### 注册 AI channel

```ts
channels: [
  httpRequestChannel(),
  manualTriggerChannel(),
  tallyTriggerChannel(),
  aiChannel(),
],
```

解释：

Inngest function 必须声明会使用哪些 realtime channel。AI executor 才能调用 `publish(aiChannel().status(...))`。

### 准备排序后的节点

```ts
const sortedNodes = await step.run("prepare-workflow", async () => {
  const workflow = await prisma.workflow.findUniqueOrThrow({
    where: { id: workflowId },
    include: {
      nodes: true,
      connections: true,
    },
  });

  return topologicalSort(workflow.nodes, workflow.connections);
});
```

解释：

022 仍然使用拓扑排序顺序执行节点。也就是说节点执行顺序由连接关系决定，当前还没有分支跳转，分支能力是 023 才引入的。

### 合并 credentialId 到执行器 data

```ts
const nodeData = {
  ...((node.data as Record<string, unknown>) || {}),
  ...(node.credentialId ? { credentialId: node.credentialId } : {}),
};
```

解释：

数据库里 `credentialId` 是独立字段，但 AI executor 希望从 `data.credentialId` 读取。执行前把它合并进去，可以保持 executor 参数统一。

### 执行节点

```ts
context = await executor({
  data: nodeData,
  nodeId: node.id,
  context,
  step,
  publish,
});
```

解释：

每个节点 executor 返回新的 context，后一个节点拿到前一个节点的结果。AI 节点也是这样把输出写给下游。

## AI executor

文件：

- `src/app/features/excutions/components/ai/executor.ts`

### 注册 Handlebars json helper

```ts
Handlebars.registerHelper("json", (context) => {
  const jsonString = JSON.stringify(context, null, 2);
  const safeString = new Handlebars.SafeString(jsonString);
  return safeString;
});
```

解释：

用户可以在 Prompt 中写：

```txt
{{json myApiCall.httpResponse.data}}
```

这样对象会被格式化为 JSON 字符串，而不是 `[object Object]`。

### AI 节点数据类型

```ts
type AiData = {
  variableName?: string;
  provider?: CredentialProvider;
  model?: string;
  credentialId?: string;
  systemPrompt?: string;
  prompt?: string;
  temperature?: number;
  maxOutputTokens?: number;
};
```

解释：

这个类型和 `AiNodeConfigData` 对齐，但执行器里都写成可选，是因为运行时数据来自数据库，必须防御缺失配置。

### 创建模型

```ts
const createLanguageModel = ({
  provider,
  model,
  apiKey,
  baseUrl,
}: CreateModelInput): LanguageModel => {
  const options = {
    apiKey,
    ...(baseUrl ? { baseURL: baseUrl } : {}),
  };

  switch (provider) {
    case CredentialProvider.QWEN:
      return createAlibaba(options)(model);
    case CredentialProvider.DEEPSEEK:
      return createDeepSeek(options)(model);
    case CredentialProvider.GEMINI:
      return createGoogleGenerativeAI(options).interactions(model);
    default:
      throw new NonRetriableError(`AI node: Unsupported provider ${provider}`);
  }
};
```

解释：

执行器把统一的节点配置转换成 AI SDK 的 `LanguageModel`。

为什么这样设计：

Provider 差异集中在一个函数里。后续新增 Provider 时，前端常量、Prisma enum 和这里的 `switch` 一起扩展即可。

### 发布状态

```ts
const publishStatus = async (
  publish: Parameters<NodeExecutor>[0]["publish"],
  nodeId: string,
  status: "loading" | "success" | "error",
) => {
  await publish(aiChannel().status({ nodeId, status }));
};
```

解释：

抽成 helper 可以避免执行器里重复写 `aiChannel().status(...)`。每次配置错误、调用成功或异常都会发布状态。

### 配置校验

```ts
if (!data.variableName) {
  await publishStatus(publish, nodeId, "error");
  throw new NonRetriableError("AI node: Variable name is missing");
}

if (!data.provider) {
  await publishStatus(publish, nodeId, "error");
  throw new NonRetriableError("AI node: Provider is missing");
}

if (!data.model) {
  await publishStatus(publish, nodeId, "error");
  throw new NonRetriableError("AI node: Model is missing");
}

if (!data.credentialId) {
  await publishStatus(publish, nodeId, "error");
  throw new NonRetriableError("AI node: Credential is missing");
}

if (!data.prompt) {
  await publishStatus(publish, nodeId, "error");
  throw new NonRetriableError("AI node: Prompt is missing");
}
```

解释：

虽然前端表单已经校验，但执行器仍然做运行时校验。因为节点数据可能来自旧数据、手动请求或数据库异常状态。

`NonRetriableError` 表示这是配置问题，不需要 Inngest 重试。

### 渲染 Prompt

```ts
const systemPrompt = data.systemPrompt
  ? Handlebars.compile(data.systemPrompt)(context)
  : undefined;
const prompt = Handlebars.compile(data.prompt)(context);
```

解释：

AI 节点可以消费上游 context。比如上游 HTTP 节点输出 `myApiCall`，Prompt 可以写：

```txt
Summarize {{json myApiCall.httpResponse.data}}
```

执行器会在调用模型前把模板渲染成最终文本。

### 在 Inngest step 中读取凭证并调用模型

```ts
const result = await step.run(`ai-generate-text-${nodeId}`, async () => {
  const node = await prisma.node.findUnique({
    where: { id: nodeId },
    select: {
      workflow: {
        select: {
          userId: true,
        },
      },
    },
  });

  if (!node) {
    throw new NonRetriableError("AI node: Node not found");
  }

  const credential = await prisma.credential.findFirst({
    where: {
      id: credentialId,
      userId: node.workflow.userId,
      provider,
    },
  });

  if (!credential) {
    throw new NonRetriableError("AI node: Credential not found");
  }

  const apiKey = decryptSecret(credential.encryptedApiKey);
  const model = createLanguageModel({
    provider,
    model: modelName,
    apiKey,
    baseUrl: credential.baseUrl,
  });

  const response = await generateText({
    model,
    system: systemPrompt,
    prompt,
    temperature: data.temperature,
    maxOutputTokens: data.maxOutputTokens,
    maxRetries: 0,
  });

  return {
    text: response.text,
    usage: response.usage,
    finishReason: response.finishReason,
    providerMetadata: response.providerMetadata,
  };
});
```

解释：

这段是 AI 节点真正执行的地方：

1. 根据 `nodeId` 找到节点所属 workflow 的 `userId`。
2. 用 `credentialId + userId + provider` 查凭证。
3. 解密 API Key。
4. 创建 AI SDK model。
5. 调用 `generateText`。
6. 返回文本、token usage、finishReason 和 provider metadata。

为什么要先通过 `nodeId` 找 `userId`：

执行器收到的是节点配置，不应该相信其中的 `credentialId`。通过节点所属 workflow 的用户再次过滤凭证，可以保证执行时也不会越权。

### 写回 context

```ts
return {
  ...context,
  [variableName]: {
    ...result,
    provider,
    model: modelName,
  },
};
```

解释：

如果用户配置的 `variableName` 是 `aiResult`，下游节点就可以使用：

```txt
{{aiResult.text}}
{{aiResult.model}}
{{json aiResult.usage}}
```

这是 workflow 节点之间传递结果的核心机制。

## 最终数据流示例

假设用户配置：

```txt
variableName: aiSummary
provider: QWEN
model: qwen3.7-plus
prompt: Summarize {{json myApiCall.httpResponse.data}}
```

执行时：

```txt
HTTP Request 节点
  -> context.myApiCall.httpResponse.data

AI 节点
  -> 渲染 Prompt
  -> 调用 Qwen
  -> context.aiSummary = {
       text,
       usage,
       finishReason,
       providerMetadata,
       provider,
       model
     }

下游节点
  -> 使用 {{aiSummary.text}}
```

## 设计总结

022 的实现重点不是单独画一个 AI 卡片，而是建立了一条完整的前端到执行层链路：

- 节点选择器让用户能添加 AI 节点。
- React Flow 节点组件负责展示状态和打开配置。
- 表单弹窗负责校验、创建凭证、写回节点数据。
- tRPC Router 负责安全保存凭证。
- workflow Router 负责把 `credentialId` 从 node data 拆到外键字段。
- Inngest function 负责把节点数据和凭证 ID 合并给 executor。
- AI executor 负责渲染 Prompt、读取凭证、调用模型、写回 context。

这套设计让 AI 节点保持了和已有 HTTP Request 节点一致的节点抽象，同时新增了凭证安全边界，后续扩展更多 AI Provider 或更多 AI 节点能力时，不需要重写画布和 workflow 调度模型。
