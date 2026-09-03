import { chat_metadata, saveCharacterDebounced, saveSettingsDebounced, this_chid } from '@sillytavern/script';
import { extension_settings, saveMetadataDebounced } from '@sillytavern/scripts/extensions';
import { eventSource, event_types } from '@sillytavern/scripts/events';
import { uuidv4 } from '@sillytavern/scripts/utils';
import {
  GlobalSettings,
  SCHEMA_VERSION,
  setting_field,
} from '@/type/settings';
// 不能依赖 unplugin-auto-import——它只覆盖 vue/pinia/@vueuse/zod 等预设，
// 本仓库自有模块漏导入时构建不报错（rollup 视为全局引用），直到运行时才 ReferenceError
import { detectSTTheme, getSTInkFallback, watchSTTheme } from '@/core/theme-detector';
import { getStCharacter } from '@/core/st-character';
import { DEFAULT_MASTER_POOL } from '@/core/default-pool';

/** 出厂默认条目池：13 组 52 条（详见 src/core/default-pool.ts 的设计注释）。
 *  恢复默认 / 全新档案共用此单一事实源。 */
function buildDefaultEntries(): PoolEntry[] {
  return DEFAULT_MASTER_POOL.map(e => ({ ...e }));
}

import type {
  GlobalSettings as GlobalSettingsType,
  PoolConfig,
  PoolConfigEntry,
  PoolEntry,
  FilterGroup,
  RegexLibraryEntry,
  FilterGroupEntry,
} from '@/type/settings';
import { validateInplace } from '@/util/zod';

const applyDefaults = (validated: GlobalSettingsType) => {
  if ((validated.schema_version ?? 0) < 9) {
    // 旧三层池数据迁移：收集 → 去重 → 合并为 master_pool + 自动配置
    const oldGlobalPool: PoolEntry[] = (_.get(extension_settings, [setting_field, 'pool']) as PoolEntry[]) ?? [];
    const oldGlobalGen = _.get(extension_settings, [setting_field, 'generation']);
    let charName = '';
    let oldCharPool: PoolEntry[] = [];
    try {
      const ch = getStCharacter(this_chid);
      if (ch) {
        charName = ch.name || '';
        oldCharPool = (_.get(ch, ['data', 'extensions', setting_field, 'pool']) as PoolEntry[]) ?? [];
      }
    } catch {
      // 角色数据不可用时跳过
    }
    let oldChatPool: PoolEntry[] = [];
    try {
      const cMeta = chat_metadata?.[setting_field];
      if (cMeta) {
        oldChatPool = (cMeta.pool as PoolEntry[]) ?? [];
      }
    } catch {
      // 聊天元数据不可用时跳过迁移，使用默认值
    }

    // 按 type 去重合并：相同 type 只保留第一条（优先级：聊天 > 角色 > 全局）
    const seen = new Map<string, PoolEntry>();
    for (const e of oldChatPool) {
      if (!seen.has(e.type)) seen.set(e.type, e);
    }
    for (const e of oldCharPool) {
      if (!seen.has(e.type)) seen.set(e.type, e);
    }
    for (const e of oldGlobalPool) {
      if (!seen.has(e.type)) seen.set(e.type, e);
    }
    validated.master_pool = [...seen.values()];

    const configs: PoolConfig[] = [];
    const makeEntries = (pool: PoolEntry[]): PoolConfigEntry[] =>
      pool.map(e => ({ entry_id: e.id, pinned: e.pinned, weight: e.weight, condition: e.condition }));

    if (oldGlobalPool.length > 0) {
      configs.push({
        id: uuidv4(),
        name: '全局默认',
        entries: makeEntries(oldGlobalPool),
        is_default: true,
        generation: (oldGlobalGen as any) ?? {
          count_mode: '4',
          categories_enabled: true,
          shuffle_final: true,
          pinned_overflow: 'send_all',
          candidate_multiplier: 2,
        },
      });
    }

    if (oldCharPool.length > 0) {
      const charConfigId = uuidv4();
      configs.push({
        id: charConfigId,
        name: charName ? `角色 ${charName}` : '角色默认',
        entries: makeEntries(oldCharPool),
        is_default: configs.length === 0,
        generation: {
          count_mode: '4',
          categories_enabled: true,
          shuffle_final: true,
          pinned_overflow: 'send_all',
          candidate_multiplier: 2,
        },
      });
      try {
        const ch = getStCharacter(this_chid);
        if (ch) {
          _.set(ch, ['data', 'extensions', setting_field], charConfigId);
          // 旧 pool 字段被 config 体系取代，删除残留；extensions 可能在异常卡上缺失
          delete ch.data?.extensions?.[setting_field]?.pool;
          saveCharacterDebounced();
        }
      } catch {
        // 角色绑定失败时静默跳过
      }
    }

    if (oldChatPool.length > 0) {
      const chatConfigId = uuidv4();
      configs.push({
        id: chatConfigId,
        name: '聊天默认',
        entries: makeEntries(oldChatPool),
        is_default: configs.length === 0,
        generation: {
          count_mode: '4',
          categories_enabled: true,
          shuffle_final: true,
          pinned_overflow: 'send_all',
          candidate_multiplier: 2,
        },
      });
      try {
        const cMeta = chat_metadata?.[setting_field];
        if (cMeta) {
          cMeta.config_id = chatConfigId;
          delete cMeta.pool;
          saveMetadataDebounced();
        }
      } catch {
        // 聊天绑定失败时静默跳过
      }
    }

    // 如果没有任何配置，创建默认配置（含 4 条预设条目）
    if (configs.length === 0) {
      const defaultEntries = buildDefaultEntries();
      validated.master_pool = [...defaultEntries];
      configs.push({
        id: uuidv4(),
        name: '默认配置',
        entries: defaultEntries.map(e => ({
          entry_id: e.id,
          pinned: e.pinned,
          weight: e.weight,
          condition: e.condition,
        })),
        is_default: true,
        generation: {
          count_mode: '4',
          categories_enabled: true,
          shuffle_final: true,
          pinned_overflow: 'send_all',
          candidate_multiplier: 2,
        },
      });
    }

    validated.configs = configs;

    // 清理旧字段
    delete (validated as any).pool;
    delete (validated as any).generation;
  }

  if ((validated.schema_version ?? 0) < 8) {
    try {
      const chatWI = chat_metadata?.[setting_field]?.world_info;
      if (chatWI && chatWI.enabled !== undefined) {
        validated.world_info = {
          ...validated.world_info,
          enabled: chatWI.enabled ?? true,
        };
      }
    } catch {
      // chat_metadata 不可用时跳过迁移，使用默认值
    }
  }

  if ((validated.schema_version ?? 0) < 10) {
    // 移除 pinned_follows_condition（条件改为 AI 判断）
    for (const cfg of validated.configs) {
      delete (cfg.generation as any).pinned_follows_condition;
    }
    // 填充 group_order：从现有条目的 category 去重后按字母排序
    if (!validated.group_order || validated.group_order.length === 0) {
      const cats = new Set<string>();
      for (const e of validated.master_pool) {
        if (e.category.trim()) cats.add(e.category.trim());
      }
      validated.group_order = [...cats].sort();
    }
  }

  if ((validated.schema_version ?? 0) < 13) {
    // v13: 对已迁移但池为空的用户，补建默认条目和配置
    if (validated.master_pool.length === 0 && validated.configs.length === 0) {
      const defaultEntries = buildDefaultEntries();
      validated.master_pool = [...defaultEntries];
      validated.configs = [
        {
          id: uuidv4(),
          name: '默认配置',
          entries: defaultEntries.map(e => ({
            entry_id: e.id,
            pinned: e.pinned,
            weight: e.weight,
            condition: e.condition,
          })),
          is_default: true,
          generation: {
            count_mode: '4',
            categories_enabled: true,
            shuffle_final: true,
            pinned_overflow: 'send_all',
            candidate_multiplier: 2,
          },
        },
      ];
    }
  }

  // v18: 旧 theme 字段迁移到 theme_mode
  if ((validated.schema_version ?? 0) < 18) {
    const oldTheme = (validated.ui as any).theme;
    if (oldTheme && (validated.ui as any).theme_mode === undefined) {
      (validated.ui as any).theme_mode = oldTheme;
    }
  }

  validated.schema_version = SCHEMA_VERSION;
};

export const useGlobalSettingsStore = defineStore('global-settings', () => {
  // 迁移逻辑处理的是未经 Zod 验证的旧存档，字段形态不可知，显式 any；
  // 且 extension_settings 的类型声明不含 choice 命名空间键，_.get 会推断成 undefined/never
  const existing = _.get(extension_settings, setting_field) as any;

  // 旧 entry_ids → entries 格式转换：必须在 Zod 验证之前执行，
  // 否则 Zod 会因 entries 为 undefined 而报错
  const rawConfigs: any[] = _.get(existing, 'configs', []) ?? [];
  const needsConversion = rawConfigs.some((c: any) => c.entry_ids !== undefined || c.entries === undefined);
  if (needsConversion && rawConfigs.length > 0) {
    const masterPool: PoolEntry[] = (_.get(existing, 'master_pool') as PoolEntry[]) ?? [];
    const masterMap = new Map(masterPool.map(e => [e.id, e]));
    for (const cfg of rawConfigs) {
      // 如果存在旧格式 entry_ids，转换为 entries
      if (Array.isArray(cfg.entry_ids)) {
        cfg.entries = cfg.entry_ids.map((id: string) => {
          const src = masterMap.get(id);
          return {
            entry_id: id,
            pinned: src?.pinned ?? false,
            weight: src?.weight ?? 1,
            condition: src?.condition ?? '',
          };
        });
        delete cfg.entry_ids;
      }
      // 兜底：确保 entries 始终是数组
      if (!Array.isArray(cfg.entries)) {
        cfg.entries = [];
      }
    }
    _.set(extension_settings, [setting_field, 'configs'], rawConfigs);
    saveSettingsDebounced();
  }

  // v14 迁移（必须在 Zod 验证前执行，因为 schema 已将 text 改为 type）
  const rawPool = _.get(existing, 'master_pool');
  if (Array.isArray(rawPool) && rawPool.length > 0 && rawPool[0].text !== undefined) {
    for (const e of rawPool) {
      e.type = e.text ?? '';
      e.content = '';
      e.rule = '';
      delete e.text;
    }
  }

  // 注意：曾有一个 v14 迁移块把 chat_filter_groups.character_id 从字符串转 number，
  // 方向与现行 schema（z.preprocess(String) 归一化为字符串）相反，已删除——
  // schema 的 preprocess 已兼容旧数字/旧字符串存档，保留该块只会误导后人。

  const validated = validateInplace(GlobalSettings, existing);

  const needsMigration = (validated.schema_version ?? 0) < SCHEMA_VERSION;
  if (needsMigration) {
    applyDefaults(validated);
    _.set(extension_settings, setting_field, klona(validated));
    saveSettingsDebounced();
  }

  // 显式标注：ref() 的 UnwrapRef 推断遇 zod4 输出类型（含 StandardSchema 符号键）会退化成 any，
  // 导致所有消费方 settings.configs/master_pool 等变 any[]，回调参数全变隐式 any
  const settings = ref<GlobalSettingsType>(validated);

  watch(
    settings,
    new_settings => {
      _.set(extension_settings, setting_field, klona(new_settings));
      saveSettingsDebounced();
    },
    { deep: true },
  );

  const currentPresetName = ref<string | null>(null);
  // this_chid 在酒馆 1.18 实测是字符串（如 "2"），旧版本可能是数字——统一归一化为字符串，
  // 与 FilterGroup.character_id 的 schema 归一化保持一致，否则 === 比较会因类型不一致失配
  const normChid = (v: string | number | null | undefined) => (v == null ? undefined : String(v));
  const currentCharacterId = ref<string | undefined>(normChid(this_chid));

  function syncPresetName() {
    try {
      const presetEl = $('#settings_preset_openai');
      if (presetEl.length) {
        currentPresetName.value = presetEl.find(':selected').text() || null;
      }
    } catch {
      /* DOM 不可用时跳过 */
    }
  }
  syncPresetName();

  try {
    eventSource.on(event_types.OAI_PRESET_CHANGED_AFTER, () => syncPresetName());
    eventSource.on(event_types.CHARACTER_PAGE_LOADED, () => {
      currentCharacterId.value = normChid(this_chid);
    });
    eventSource.on(event_types.CHAT_CHANGED, () => {
      currentCharacterId.value = normChid(this_chid);
    });
  } catch {
    /* eventSource 不可用时静默跳过 */
  }

  const sortedEnabledFilterRules = computed(() => {
    const preset = currentPresetName.value;
    const chid = currentCharacterId.value;
    const fs = settings.value.filter_settings;
    const library = fs.regex_library ?? [];
    const libMap = new Map(library.map(e => [e.id, e]));
    return (fs.groups ?? [])
      .filter(g => {
        if (!g.enabled) return false;
        if (g.preset_name !== null && g.preset_name !== preset) return false;
        if (g.character_id !== null && g.character_id !== chid) return false;
        return true;
      })
      .flatMap(g =>
        (g.entries ?? [])
          .map(e => {
            if (e.library_entry_id) {
              const libEntry = libMap.get(e.library_entry_id);
              if (!libEntry) return null;
              return {
                type: libEntry.type,
                pattern: libEntry.pattern,
                // ?? 兜底：老存档/裸 push 的条目可能没有 replace 字段
                replace: libEntry.replace ?? '',
                start: libEntry.start,
                end: libEntry.end,
              };
            }
            return e.inline_rule;
          })
          // filter(Boolean) 不收窄类型：下游（generator 的 tag/regex 判别）需要排除 null 后的联合
          .filter((r): r is NonNullable<typeof r> => r !== null),
      );
  });

  function addFilterGroup(area: 'global' | 'preset' | 'character') {
    const fs = settings.value.filter_settings;
    const group: FilterGroup = {
      id: uuidv4(),
      name: '新分组',
      enabled: true,
      entries: [],
      preset_name: area === 'preset' ? currentPresetName.value : null,
      character_id: area === 'character' ? (currentCharacterId.value ?? null) : null,
    };
    fs.groups.push(group);
    return group;
  }

  function removeFilterGroup(id: string) {
    const fs = settings.value.filter_settings;
    const idx = fs.groups.findIndex(g => g.id === id);
    if (idx !== -1) fs.groups.splice(idx, 1);
  }

  function addFilterGroupEntry(groupId: string, entry: FilterGroupEntry) {
    const fs = settings.value.filter_settings;
    const group = fs.groups.find(g => g.id === groupId);
    if (group) group.entries.push(entry);
  }

  function removeFilterGroupEntry(groupId: string, entryIdx: number) {
    const fs = settings.value.filter_settings;
    const group = fs.groups.find(g => g.id === groupId);
    if (group) group.entries.splice(entryIdx, 1);
  }

  function addRegexLibraryEntry(category: string = ''): RegexLibraryEntry {
    const fs = settings.value.filter_settings;
    const entry: RegexLibraryEntry = {
      id: uuidv4(),
      name: '',
      type: 'tag',
      pattern: '',
      replace: '',
      start: '',
      end: '',
      category,
    };
    fs.regex_library.push(entry);
    return entry;
  }

  function removeRegexLibraryEntry(id: string) {
    const fs = settings.value.filter_settings;
    const idx = fs.regex_library.findIndex(e => e.id === id);
    if (idx !== -1) fs.regex_library.splice(idx, 1);
    for (const group of fs.groups) {
      group.entries = group.entries.filter(e => e.library_entry_id !== id);
    }
  }

  function updateRegexLibraryEntry(id: string, patch: Partial<RegexLibraryEntry>) {
    const fs = settings.value.filter_settings;
    const entry = fs.regex_library.find(e => e.id === id);
    if (entry) Object.assign(entry, patch);
  }

  function renameRegexLibraryGroup(oldCategory: string, newCategory: string) {
    const fs = settings.value.filter_settings;
    for (const entry of fs.regex_library) {
      if (entry.category === oldCategory) {
        entry.category = newCategory;
      }
    }
    const libGroups = fs.library_groups ?? [];
    const idx = libGroups.indexOf(oldCategory);
    if (idx !== -1) libGroups[idx] = newCategory;
  }

  function deleteRegexLibraryGroup(category: string) {
    const fs = settings.value.filter_settings;
    const ids = new Set(fs.regex_library.filter(e => e.category === category).map(e => e.id));
    fs.regex_library = fs.regex_library.filter(e => e.category !== category);
    const libGroups = fs.library_groups ?? [];
    const idx = libGroups.indexOf(category);
    if (idx !== -1) libGroups.splice(idx, 1);
    for (const group of fs.groups) {
      group.entries = group.entries.filter(e => !ids.has(e.library_entry_id ?? ''));
    }
  }

  function factoryReset() {
    const fresh = validateInplace(GlobalSettings, {});
    fresh.schema_version = SCHEMA_VERSION;
    // 不能整体覆盖 filter_settings：validateInplace 产出的对象带 Zod 默认字段，
    // 若覆盖成缺 library_groups 的裸对象，之后 RegexLibraryDialog.createGroup 的 `?? []`
    // 兜底会拿到临时数组，新建分组写入静默丢失（直到刷新页面才恢复）
    fresh.filter_settings.regex_library = [];
    fresh.filter_settings.groups = [];
    fresh.filter_settings.library_groups = [];

    const defaultEntries = buildDefaultEntries();
    fresh.master_pool = [...defaultEntries];
    fresh.configs = [
      {
        id: uuidv4(),
        name: '默认配置',
        entries: defaultEntries.map(e => ({
          entry_id: e.id,
          pinned: e.pinned,
          weight: e.weight,
          condition: e.condition,
        })),
        is_default: true,
        generation: {
          count_mode: '4',
          categories_enabled: true,
          shuffle_final: true,
          pinned_overflow: 'send_all',
          candidate_multiplier: 2,
        },
      },
    ];

    settings.value = fresh;
  }

  // ST 主题自动检测：当 theme_mode 为 'auto' 时，监听 ST 主题变化
  let stopThemeWatcher: (() => void) | null = null;

  function resolveTheme(): 'st' | 'dark' | 'light' {
    const mode = settings.value.ui.theme_mode;
    if (mode === 'st' || mode === 'dark' || mode === 'light') return mode;
    return detectSTTheme();
  }

  function startThemeWatcher() {
    stopThemeWatcher?.();
    stopThemeWatcher = watchSTTheme(() => {
      // 触发响应式更新，让 watchEffect 重新执行
      settings.value = { ...settings.value };
    });
  }

  startThemeWatcher();

  watchEffect(() => {
    const ui = settings.value.ui;
    const theme = resolveTheme();
    document.documentElement.setAttribute('data-choice-theme', theme);

    // st 跟随模式的对比度守卫：ST 极端主题下用兜底墨色覆盖派生值；
    // 离开 st 或对比恢复时必须移除行内覆盖，否则残留上一次主题的墨色
    if (theme === 'st') {
      const fallback = getSTInkFallback();
      if (fallback) {
        document.documentElement.style.setProperty('--choice-text', fallback.text);
        document.documentElement.style.setProperty('--choice-text-secondary', fallback.secondary);
        document.documentElement.style.setProperty('--choice-text-muted', fallback.muted);
      } else {
        document.documentElement.style.removeProperty('--choice-text');
        document.documentElement.style.removeProperty('--choice-text-secondary');
        document.documentElement.style.removeProperty('--choice-text-muted');
      }
    } else {
      document.documentElement.style.removeProperty('--choice-text');
      document.documentElement.style.removeProperty('--choice-text-secondary');
      document.documentElement.style.removeProperty('--choice-text-muted');
    }

    const scaleMap = { small: 0.85, medium: 1, large: 1.2 };
    document.documentElement.style.setProperty('--choice-font-scale', String(scaleMap[ui.font_size]));
  });

  return {
    settings,
    sortedEnabledFilterRules,
    currentPresetName,
    currentCharacterId,
    syncPresetName,
    factoryReset,
    addFilterGroup,
    removeFilterGroup,
    addFilterGroupEntry,
    removeFilterGroupEntry,
    addRegexLibraryEntry,
    removeRegexLibraryEntry,
    updateRegexLibraryEntry,
    renameRegexLibraryGroup,
    deleteRegexLibraryGroup,
  };
});
