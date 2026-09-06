import toastr from 'toastr';
import { useGlobalSettingsStore } from '@/store/global-settings';

/** 与酒馆 generate 端点对接的消息格式：system/user/assistant 三态分离。
 *  不拼成单段字符串塞进单条消息，遵循"提示词组装走角色结构"的架构约束。 */
export type ChatMsg = { role: 'system' | 'user' | 'assistant'; content: string };

const GENERATE_URL = '/api/backends/chat-completions/generate';

/** DeepSeek 专用模型档案——换模型＝改这一个对象→build→推 fork→TT 更新即生效。
 *  非本档案承载的能力（前缀续写等）用到时再查官方文档/社区经验，按需扩展。
 *
 *  换模型检查清单（逐项核对新模型文档/实测）：
 *  ① model/baseUrl：模型名与端点；② reasoningEffort：档位语义与传输通道（见下）；
 *  ③ maxTokens：输出上限、思维链是否计入额度；④ stream：流式断流表现；
 *  ⑤ 输出遵从度：<options> 块格式与禁用符号（解析端 options-parse.ts）；
 *  ⑥ 空正文/思维链吞正文怪癖（EmptyContentError 重试已兜底）。
 *
 *  - reasoningEffort='low'：V4 思考强度 low/high/max，默认 low（用户拍板：high 档思考过久）。
 *    传输通道：TT 后端对 openai 源的 reasoning_effort 有 OpenAI 模型白名单（deepseek 会被
 *    静默丢弃）、对 deepseek 源会把 low/medium 折叠成 high——走 custom_include_body（服务层
 *    在 payload 构建后无条件合并，官方注释"final upstream intent"）是唯一能送真值的路径
 *    （源码核实：payload/openai.rs:163 + additional_parameters.rs:68）。
 *  - maxTokens=16384：思考+正文共享额度（官方未文档化思维链是否计入，2026-09-05 实案证实
 *    计入：思维链 6570 字耗尽 4096 即正文 0 字）。官方上限 384K，16k 为正文不被截断的保险值。
 *  - stream=false：弱网下流式断流（body_interrupted）面更大，整响应一次拿更稳。
 *  - temperature/top_p 不发：V4 思考模式官方明确"设置不报错但不生效"。 */
export const MODEL_PROFILE = {
  baseUrl: 'https://api.deepseek.com/v1',
  model: 'deepseek-v4-flash',
  reasoningEffort: 'low',
  maxTokens: 16384,
  stream: false,
  timeoutSeconds: 180,
  retryCount: 2,
} as const;

/** 模型返回 stop 但正文为空——V4 思考模型偶发把全部输出写进思维链
 *  （2026-09-05 实案×2：1158 额度截断已修，1163 stop+content 空为自发怪癖），
 *  视为可重试失败 */
class EmptyContentError extends Error {}

/** 判断错误是否可重试：网络错误（TypeError）、5xx、空正文可重试；
 *  4xx、AbortError、API 级错误（data.error）不重试。 */
function isRetryableError(e: unknown): boolean {
  if (e instanceof DOMException && e.name === 'AbortError') return false;
  if (e instanceof EmptyContentError) return true;
  if (e instanceof TypeError) return true;
  if (e instanceof Error) {
    const m = e.message.match(/^API 请求失败 \((\d{3})\)/);
    if (m) return parseInt(m[1], 10) >= 500;
  }
  return false;
}

/** DeepSeek 唯一调用入口（经酒馆 generate 端点转发，绕开 TavernHelper 预设注入）。
 *  每次尝试独立 AbortController + 超时，外部取消信号联动所有尝试；重试间隔 1 秒。 */
export async function callDeepSeekWithRetry(messages: ChatMsg[], externalSignal?: AbortSignal): Promise<string> {
  const key = useGlobalSettingsStore().settings.deepseek_key;
  if (!key) {
    throw new Error('DeepSeek key 未配置（写入本地 settings.json 的 extension_settings.choice.deepseek_key）');
  }

  let lastError: unknown;
  for (let attempt = 0; attempt < MODEL_PROFILE.retryCount + 1; attempt++) {
    const attemptController = new AbortController();
    const onExternalAbort = () => attemptController.abort();
    externalSignal?.addEventListener('abort', onExternalAbort, { once: true });
    const timeoutId = setTimeout(() => attemptController.abort(), MODEL_PROFILE.timeoutSeconds * 1000);

    try {
      const resp = await fetch(GENERATE_URL, {
        method: 'POST',
        headers: window.SillyTavern?.getContext?.()?.getRequestHeaders?.() ?? {},
        body: JSON.stringify({
          chat_completion_source: 'openai',
          reverse_proxy: MODEL_PROFILE.baseUrl,
          proxy_password: key,
          model: MODEL_PROFILE.model,
          messages,
          max_tokens: MODEL_PROFILE.maxTokens,
          stream: MODEL_PROFILE.stream,
          custom_include_body: JSON.stringify({ reasoning_effort: MODEL_PROFILE.reasoningEffort }),
        }),
        signal: attemptController.signal,
      });

      if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        throw new Error(`API 请求失败 (${resp.status}): ${text.slice(0, 300)}`);
      }

      const data = await resp.json();
      if (data?.error) throw new Error(data.error.message || 'API 返回错误');
      const content = (data?.choices?.[0]?.message?.content ?? data?.choices?.[0]?.text ?? '').trim();
      if (!content) throw new EmptyContentError('模型返回空正文');
      return content;
    } catch (e) {
      lastError = e;

      if (externalSignal?.aborted) throw e;
      if (!isRetryableError(e)) throw e;

      if (attempt < MODEL_PROFILE.retryCount) {
        toastr.info(
          e instanceof EmptyContentError
            ? `模型输出为空，自动重试 (${attempt + 1}/${MODEL_PROFILE.retryCount})...`
            : `网络波动，正在重试 (${attempt + 1}/${MODEL_PROFILE.retryCount})...`,
        );
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } finally {
      clearTimeout(timeoutId);
      externalSignal?.removeEventListener('abort', onExternalAbort);
    }
  }

  throw lastError;
}
