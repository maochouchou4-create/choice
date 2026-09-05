import toastr from 'toastr';
import { useGlobalSettingsStore } from '@/store/global-settings';

/** 与酒馆 generate 端点对接的消息格式：system/user/assistant 三态分离。
 *  不拼成单段字符串塞进单条消息，遵循"提示词组装走角色结构"的架构约束。 */
export type ChatMsg = { role: 'system' | 'user' | 'assistant'; content: string };

const GENERATE_URL = '/api/backends/chat-completions/generate';

/** DeepSeek 专用调用档案——无 UI 无存档，调整＝改这里→build→推 fork→TT 更新即生效。
 *  - REASONING_EFFORT：V4 思考强度 low/high/max。默认 low（用户拍板：high 档思考过久）。
 *    注意传输通道：TT 后端对 openai 源的 reasoning_effort 有 OpenAI 模型白名单（deepseek
 *    会被静默丢弃）、对 deepseek 源会把 low/medium 折叠成 high——所以走 custom_include_body
 *    （服务层在 payload 构建后无条件合并，官方注释"final upstream intent"），这是唯一能把
 *    真实 low 送到 DeepSeek 的路径（源码核实：payload/openai.rs:163 + additional_parameters.rs:68）。
 *  - 思考默认开启（v4 模型特性）；关闭需 thinking.type=disabled，未启用。
 *  - temperature/top_p 不发：V4 思考模式下官方文档明确"设置不报错但不生效"。
 *  - 非流式：弱网下流式断流（body_interrupted）面更大，整响应一次拿更稳。 */
const DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1';
const DEEPSEEK_MODEL = 'deepseek-v4-flash';
/** 官方档位映射（thinking_mode 指南核实）：low→low，medium/high/xhigh→high，max→max；
 *  思考强度唯一可靠闸门＝此参数，必须走 custom_include_body 通道发真值 */
const REASONING_EFFORT = 'low';
/** 思考+正文共享此额度（官方未文档化思维链是否计入，但 2026-09-05 实案证实计入：
 *  思维链 6570 字即耗尽 4096，finish_reason=length、正文 0 字）。官方上限 384K，
 *  此处 16k 远未到顶，仅为正文永不被思考截断的保险值 */
const MAX_TOKENS = 16384;
const TIMEOUT_SECONDS = 180;
/** 网络类错误自动重试次数（治弱网抖动+空正文），硬编码不设 UI */
const RETRY_COUNT = 2;

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
  for (let attempt = 0; attempt < RETRY_COUNT + 1; attempt++) {
    const attemptController = new AbortController();
    const onExternalAbort = () => attemptController.abort();
    externalSignal?.addEventListener('abort', onExternalAbort, { once: true });
    const timeoutId = setTimeout(() => attemptController.abort(), TIMEOUT_SECONDS * 1000);

    try {
      const resp = await fetch(GENERATE_URL, {
        method: 'POST',
        headers: window.SillyTavern?.getContext?.()?.getRequestHeaders?.() ?? {},
        body: JSON.stringify({
          chat_completion_source: 'openai',
          reverse_proxy: DEEPSEEK_BASE_URL,
          proxy_password: key,
          model: DEEPSEEK_MODEL,
          messages,
          max_tokens: MAX_TOKENS,
          stream: false,
          custom_include_body: JSON.stringify({ reasoning_effort: REASONING_EFFORT }),
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

      if (attempt < RETRY_COUNT) {
        toastr.info(e instanceof EmptyContentError ? `模型输出为空，自动重试 (${attempt + 1}/${RETRY_COUNT})...` : `网络波动，正在重试 (${attempt + 1}/${RETRY_COUNT})...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } finally {
      clearTimeout(timeoutId);
      externalSignal?.removeEventListener('abort', onExternalAbort);
    }
  }

  throw lastError;
}
