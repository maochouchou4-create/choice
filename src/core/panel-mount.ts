import ActionOptionsPanel from '@/components/ActionOptionsPanel.vue';
import { chat } from '@sillytavern/script';
import { generateOptions, generatorState } from '@/core/generator';
import { getMessageSwipeId, storeGeneration } from '@/core/options-store';
import { pinia } from '@/pinia';
import { useGlobalSettingsStore } from '@/store/global-settings';
import { usePanelStateStore } from '@/store/panel-state';
import { eventSource, event_types } from '@sillytavern/scripts/events';

export function initPanelMount() {
  const $container = $('<div id="choice-panel-mount"></div>').appendTo('#chat');

  const app = createApp(ActionOptionsPanel);
  app.use(pinia);
  app.config.globalProperties.t = t;
  app.mount($container[0]);

  const panelStore = usePanelStateStore(pinia);

  const getPanelMessageId = (): number | null => {
    try {
      for (let i = chat.length - 1; i >= 0; i--) {
        // chat[] 元素是 ST 原生楼层结构（is_user/is_system/mes 等字段在 StChatMessage 上），
        // @sillytavern/script 导出的 chat 类型是 TavernHelper 子集，需显式断言
        const message = chat[i] as StChatMessage | undefined;
        if (message && !message.is_user && !message.is_system) {
          return i;
        }
      }
    } catch (error) {
      console.error('[Choice] getPanelMessageId failed', error);
    }
    return null;
  };

  const reposition = () => {
    try {
      const $last = $('#chat .mes.last_mes');
      if ($last.length) {
        $container.insertAfter($last);
      } else {
        $container.appendTo('#chat');
      }
    } catch (error) {
      console.error('[Choice] reposition failed', error);
    }
  };

  const resync = () => {
    try {
      reposition();
      const messageId = getPanelMessageId();
      if (messageId === null) {
        panelStore.clear();
        return;
      }
      panelStore.load(messageId, getMessageSwipeId(messageId));
    } catch (error) {
      console.error('[Choice] resync failed', error);
    }
  };

  const onMessageReceived = async (messageId: number, type: string) => {
    try {
      resync();
      if (!(chat[messageId] as StChatMessage | undefined)?.mes?.trim()) {
        return;
      }
      if (type === 'quiet') {
        return;
      }
      if (messageId === 0) {
        return;
      }
      const gs = useGlobalSettingsStore(pinia);
      if (!gs.settings.auto_generate) {
        return;
      }
      if (generatorState.loading) {
        return;
      }
      const swipeId = getMessageSwipeId(messageId);
      const generation = await generateOptions({ messageId, swipeId });
      if (!generation) {
        return;
      }
      storeGeneration(messageId, swipeId, generation);
      panelStore.setCollapsed(false);
      resync();
    } catch (error) {
      console.error('[Choice] onMessageReceived failed', error);
    }
  };

  const safeResync = () => {
    try {
      resync();
    } catch (error) {
      console.error('[Choice] safeResync failed', error);
    }
  };

  eventSource.on(event_types.MESSAGE_RECEIVED, onMessageReceived);
  eventSource.on(event_types.MESSAGE_SWIPED, safeResync);
  eventSource.on(event_types.MESSAGE_DELETED, safeResync);
  eventSource.on(event_types.MESSAGE_UPDATED, safeResync);
  eventSource.on(event_types.USER_MESSAGE_RENDERED, () => {
    safeResync();
    panelStore.setCollapsed(true);
  });
  eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, safeResync);
  eventSource.on(event_types.CHAT_CHANGED, safeResync);
  eventSource.on(event_types.MORE_MESSAGES_LOADED, safeResync);
  eventSource.on(event_types.APP_READY, safeResync);
  eventSource.on(event_types.GENERATION_ENDED, safeResync);

  resync();
  let pollCount = 0;
  const pollInterval = setInterval(() => {
    safeResync();
    pollCount++;
    if (pollCount >= 15) {
      clearInterval(pollInterval);
    }
  }, 2000);
}
