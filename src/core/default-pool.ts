import type { PoolEntry } from '@/type/settings';

/** 条目池唯一事实源（无存档无 UI，改条目＝改本文件→build→推 fork）。
 *  出厂默认：10 组 84 条（含 1 条 pinned 转场推进，不占随机名额，实际随机池 83 条）。
 *  设计哲学：条目＝通用行动原型，不预设人设；人设是"颜料"，由生成 AI 在改写时上色。
 *  措辞全面中性化，禁止自带城府/老练气质；无条件挂载机制（原 [条件] 已删）。
 *  id 采用「组前缀-序号」语义化命名，仅作唯一标识，无外部契约。
 *  分组框架由子代理两轮审计打磨（2026-09-05），单轴＝行动的主要作用层面。 */
export const DEFAULT_MASTER_POOL: PoolEntry[] = [
  // ── A 日常共处：把"待在一起的时间"过出内容 ──
  { id: 'daily-01', type: '打破沉默', content: '安静或冷场之中自然开个话头，让对话重新流动起来', rule: '', pinned: false, category: '日常共处' },
  { id: 'daily-02', type: '闲话日常', content: '说说今天遇到的琐事见闻，让对话落回生活的地面', rule: '', pinned: false, category: '日常共处' },
  { id: 'daily-03', type: '玩笑与吐槽', content: '用玩笑调侃对方或吐槽眼前的事，调节当下的气氛', rule: '', pinned: false, category: '日常共处' },
  { id: 'daily-04', type: '一起吃饭', content: '提议同席、分享手边的食物，或约一顿饭', rule: '', pinned: false, category: '日常共处' },
  { id: 'daily-05', type: '一起去逛', content: '约对方逛街、逛店、买菜，来一场边走边看的出行', rule: '', pinned: false, category: '日常共处' },
  { id: 'daily-06', type: '一起消磨', content: '散步、发呆、看同一处风景，不为什么地一起待着', rule: '', pinned: false, category: '日常共处' },
  { id: 'daily-07', type: '日常照顾', content: '递水、添衣、提醒休息，用小事照看对方的生活', rule: '', pinned: false, category: '日常共处' },
  { id: 'daily-08', type: '应对在场其他人', content: '与在场的第三方寒暄、周旋或解围，照应场面', rule: '', pinned: false, category: '日常共处' },
  { id: 'daily-09', type: '认识与联系', content: '初识时自我介绍破冰，或自然地留下再联系的线索', rule: '', pinned: false, category: '日常共处' },
  { id: 'daily-10', type: '多待一会儿', content: '找个自然的理由同路、晚走，把共处的时间再延长一些', rule: '', pinned: false, category: '日常共处' },

  // ── B 靠近与接触：用身体距离、视线与接触替嘴说话 ──
  { id: 'touch-01', type: '缩短距离', content: '坐近一点、走近一点，让两人之间的空间距离变小', rule: '', pinned: false, category: '靠近与接触' },
  { id: 'touch-02', type: '保持注视', content: '看着对方，让视线在他脸上多停留一会儿', rule: '', pinned: false, category: '靠近与接触' },
  { id: 'touch-03', type: '轻轻的接触', content: '碰一下对方的手臂、肩头，做一个短暂而轻浅的接触', rule: '', pinned: false, category: '靠近与接触' },
  { id: 'touch-04', type: '并肩的步调', content: '并排走时悄悄对齐速度与位置，让两个人的步调合上', rule: '', pinned: false, category: '靠近与接触' },
  { id: 'touch-05', type: '递接的接触', content: '递还物品的时候，让指尖的接触自然发生', rule: '', pinned: false, category: '靠近与接触' },
  { id: 'touch-06', type: '拉住挽留', content: '在对方转身要离开的瞬间，伸手拉住', rule: '', pinned: false, category: '靠近与接触' },
  { id: 'touch-07', type: '拥抱依靠', content: '张开怀抱抱住对方，或把重心靠向对方', rule: '', pinned: false, category: '靠近与接触' },
  { id: 'touch-08', type: '退开半步', content: '主动拉开一点身体距离，给彼此留出空隙或回避什么', rule: '', pinned: false, category: '靠近与接触' },
  { id: 'touch-09', type: '亲昵的小动作', content: '牵手、靠肩、揉头发，做关系亲近之后才有的日常小动作', rule: '', pinned: false, category: '靠近与接触' },

  // ── C 心意交换：让心里的话流向对方，也邀请对方的心意流回来 ──
  { id: 'heart-01', type: '直说感受', content: '把此刻的心情原样说出来，不绕弯子', rule: '', pinned: false, category: '心意交换' },
  { id: 'heart-02', type: '卸下防备', content: '主动示弱，把平时不给人看的一面交出去', rule: '', pinned: false, category: '心意交换' },
  { id: 'heart-03', type: '聊更深处', content: '把话题从表层带进更深的地方——在意什么、害怕什么、看重什么', rule: '', pinned: false, category: '心意交换' },
  { id: 'heart-04', type: '交心往事', content: '讲一段自己的过去，交出一段亲身经历', rule: '回忆篇幅不超过三句', pinned: false, category: '心意交换' },
  { id: 'heart-05', type: '说出心意', content: '把喜欢说出口，让心意落到明面上', rule: '说完停在等待回应处，不代写对方反应', pinned: false, category: '心意交换' },
  { id: 'heart-06', type: '确认心意', content: '想知道对方怎么想，直接或委婉地问清楚', rule: '', pinned: false, category: '心意交换' },
  { id: 'heart-07', type: '许下约定', content: '提出一个只属于两个人的约定', rule: '', pinned: false, category: '心意交换' },
  { id: 'heart-08', type: '交换秘密', content: '我告诉你一件事，你也告诉我一件，各自交出一个秘密', rule: '', pinned: false, category: '心意交换' },
  { id: 'heart-09', type: '提起以后', content: '聊聊将来的打算，让"以后"出现在两个人的话题里', rule: '', pinned: false, category: '心意交换' },
  { id: 'heart-10', type: '说出在意', content: '道谢、夸奖、说牵挂，把在意用话说出口', rule: '', pinned: false, category: '心意交换' },

  // ── D 被动应对：接住对方刚抛来的球——刺激来自对方，落点是回应 ──
  { id: 'react-01', type: '被撩之后', content: '接住对方的撩拨或调笑，做出自己的回应——顶回去、装傻还是脸红都行', rule: '', pinned: false, category: '被动应对' },
  { id: 'react-02', type: '被指责时', content: '面对对方的指责，辩解、承认，或说出自己的委屈', rule: '', pinned: false, category: '被动应对' },
  { id: 'react-03', type: '面对告白', content: '接住对方的告白，给出接受、婉拒或请对方等待的回应', rule: '', pinned: false, category: '被动应对' },
  { id: 'react-04', type: '被误解时', content: '被冤枉或误会时澄清事实，或暂不辩解', rule: '', pinned: false, category: '被动应对' },
  { id: 'react-05', type: '被帮助后', content: '接受对方的帮助，并回应这份好意', rule: '', pinned: false, category: '被动应对' },
  { id: 'react-06', type: '被冷落时', content: '被晾在一边时，直接发问、试探着靠近，或安然自处', rule: '', pinned: false, category: '被动应对' },
  { id: 'react-07', type: '接住玩笑', content: '对方的调侃或刁难，顺势接下并回敬过去', rule: '', pinned: false, category: '被动应对' },
  { id: 'react-08', type: '面对突然接触', content: '被突然拉住、搂住、碰到时，做出即时的反应', rule: '', pinned: false, category: '被动应对' },
  { id: 'react-09', type: '被托付要事', content: '对方把重要的事交到自己手上，权衡接与不接', rule: '', pinned: false, category: '被动应对' },

  // ── E 自我安顿：处理自己的内心波动与状态——刺激源在自己 ──
  { id: 'self-01', type: '稳住心神', content: '心乱时深呼吸、整理思绪，先让自己站稳', rule: '', pinned: false, category: '自我安顿' },
  { id: 'self-02', type: '掩饰失态', content: '脸红、失言之后，努力装作若无其事', rule: '', pinned: false, category: '自我安顿' },
  { id: 'self-03', type: '处理尴尬', content: '冷场或出丑之后，用自嘲把场面带过去', rule: '', pinned: false, category: '自我安顿' },
  { id: 'self-04', type: '承认疲惫', content: '累了就说累，不再硬撑', rule: '', pinned: false, category: '自我安顿' },
  { id: 'self-05', type: '克制冲动', content: '话到嘴边又咽回去，先按住性子想一下再说', rule: '', pinned: false, category: '自我安顿' },
  { id: 'self-06', type: '暂离片刻', content: '找个借口离开现场一小会儿，给自己留点空间', rule: '', pinned: false, category: '自我安顿' },
  { id: 'self-07', type: '豁出去', content: '克服犹豫，鼓起勇气做平时不敢做的事', rule: '', pinned: false, category: '自我安顿' },

  // ── F 冲突与界限：分歧的升级与降温、界限划定、裂痕修复与关系结束 ──
  { id: 'clash-01', type: '摆到台面上', content: '不再回避，把分歧正面谈开', rule: '', pinned: false, category: '冲突与界限' },
  { id: 'clash-02', type: '给气氛降温', content: '火药味上来时先撤火，岔开话题或放软语气', rule: '', pinned: false, category: '冲突与界限' },
  { id: 'clash-03', type: '亮明底线', content: '告诉对方哪里是自己的界限，不能碰', rule: '', pinned: false, category: '冲突与界限' },
  { id: 'clash-04', type: '不退让', content: '态度放得更坚决，明确表示这次不让步', rule: '', pinned: false, category: '冲突与界限' },
  { id: 'clash-05', type: '说不与拒绝', content: '拒绝对方的请求或邀约，把"不"说出口', rule: '', pinned: false, category: '冲突与界限' },
  { id: 'clash-06', type: '道歉认错', content: '承认是自己不对，把道歉好好说出口', rule: '', pinned: false, category: '冲突与界限' },
  { id: 'clash-07', type: '主动和好', content: '冷战或决裂之后先伸出手，试探着把关系修回来', rule: '', pinned: false, category: '冲突与界限' },
  { id: 'clash-08', type: '暂时退开', content: '从冲突现场先撤一步，避免当场激化', rule: '', pinned: false, category: '冲突与界限' },
  { id: 'clash-09', type: '好聚好散', content: '体面地结束这段关系——放手、告别、送上祝福', rule: '', pinned: false, category: '冲突与界限' },

  // ── G 协作与付出：一起做事，以及单方面为对方多做一点 ──
  { id: 'coop-01', type: '发出邀约', content: '约对方一起做某件具体的事', rule: '', pinned: false, category: '协作与付出' },
  { id: 'coop-02', type: '分工协作', content: '把事情拆开分头做、托付给对方，或开口求助', rule: '', pinned: false, category: '协作与付出' },
  { id: 'coop-03', type: '并肩做事', content: '不分你我，和对方一起动手做同一件事', rule: '', pinned: false, category: '协作与付出' },
  { id: 'coop-04', type: '让渡与付出', content: '让出自己的便利、时间或利益，成全对方', rule: '', pinned: false, category: '协作与付出' },
  { id: 'coop-05', type: '安慰开解', content: '对方低落时劝解开导，或想办法逗TA开心', rule: '', pinned: false, category: '协作与付出' },
  { id: 'coop-06', type: '守护陪伴', content: '什么都不做，只是安静地留在对方身边', rule: '', pinned: false, category: '协作与付出' },
  { id: 'coop-07', type: '照顾对方', content: '对方生病、受伤、喝醉时，实际地照料', rule: '', pinned: false, category: '协作与付出' },
  { id: 'coop-08', type: '替对方出头', content: '对方被为难时，站到TA这边', rule: '', pinned: false, category: '协作与付出' },
  { id: 'coop-09', type: '倾听心事', content: '请对方说出来，自己只管好好接住', rule: '', pinned: false, category: '协作与付出' },

  // ── H 探索与冒险：对真相、往事与未知的好奇，以及在未知中的行动 ──
  { id: 'explore-01', type: '查证不解', content: '眼前的疑点促使去查看、验证', rule: '', pinned: false, category: '探索与冒险' },
  { id: 'explore-02', type: '把话问到底', content: '对在意的事追问下去，不停在表面的答案上', rule: '', pinned: false, category: '探索与冒险' },
  { id: 'explore-03', type: '从侧面了解', content: '不直接问，绕个弯从别的话题或别人那里打听', rule: '', pinned: false, category: '探索与冒险' },
  { id: 'explore-04', type: '重提往事', content: '翻出两个人共同经历的旧事，重新聊起', rule: '', pinned: false, category: '探索与冒险' },
  { id: 'explore-05', type: '打量四周', content: '注意环境里的细节，察觉不对劲的地方', rule: '', pinned: false, category: '探索与冒险' },
  { id: 'explore-06', type: '求证疑惑', content: '心里对对方有疑虑，当面问清楚', rule: '', pinned: false, category: '探索与冒险' },
  { id: 'explore-07', type: '冒险一试', content: '危机或不确定面前，选择行动而不是等待', rule: '', pinned: false, category: '探索与冒险' },

  // ── I 叙事与节奏：故事推进层。含 pinned 条目；多为"作者型"选项 ──
  { id: 'scene-01', type: '转场推进', content: '推进到下一个时间、地点或场景，让故事翻页', rule: '用一两句精炼叙述完成时间或地点切换，不展开新剧情事件', pinned: true, category: '叙事与节奏' },
  { id: 'scene-02', type: '顺势延展', content: '不引入新事件，让当前的时刻自然延续、发酵', rule: '', pinned: false, category: '叙事与节奏' },
  { id: 'scene-03', type: '小小的意外', content: '引入一个小插曲，让剧情轻轻偏移一点点', rule: '', pinned: false, category: '叙事与节奏' },
  { id: 'scene-04', type: '突发状况', content: '引入一个较大的外部事件，打乱当前的节奏', rule: '事件必须与既有世界观和场景相容，不得凭空引入新人物', pinned: false, category: '叙事与节奏' },
  { id: 'scene-05', type: '自然的时限', content: '给场景一个自然的时间压力或终点——店要打烊了、车快来了', rule: '', pinned: false, category: '叙事与节奏' },
  { id: 'scene-06', type: '脑洞展开', content: '提出一个跳出常规但仍在情理边缘的展开方向', rule: '', pinned: false, category: '叙事与节奏' },
  { id: 'scene-07', type: '为一幕收尾', content: '主动给当前一幕画上句号——告别、道晚安、落幕', rule: '', pinned: false, category: '叙事与节奏' },

  // ── J 环境与镜头：动作落在物件、空间与画面上，而非对话 ──
  { id: 'lens-01', type: '用手边的东西', content: '摆弄、使用眼前的物品，让手上有戏', rule: '', pinned: false, category: '环境与镜头' },
  { id: 'lens-02', type: '借物传意', content: '借一件物品把心意递过去——递杯热饮、把伞倾向对方', rule: '', pinned: false, category: '环境与镜头' },
  { id: 'lens-03', type: '换个位置', content: '从当前位置挪去别处——窗边、门外、离对方更近的地方', rule: '', pinned: false, category: '环境与镜头' },
  { id: 'lens-04', type: '他人视角', content: '以另一位在场角色的视角，写一段此刻的画面', rule: '镜头型条目而非某角色的行动：选定一位在场角色，以TA的视角写其能看到、感知到的内容，不得泄露TA视角之外的信息', pinned: false, category: '环境与镜头' },
  { id: 'lens-05', type: '退到一旁', content: '从互动中退出来，在一旁安静地看着', rule: '', pinned: false, category: '环境与镜头' },
  { id: 'lens-06', type: '慢下来感受', content: '放慢节奏，用感官细写此刻的声音、气味与温度', rule: '', pinned: false, category: '环境与镜头' },
  { id: 'lens-07', type: '抽离回望', content: '从当下抽离一瞬，回望这段关系或这一天', rule: '', pinned: false, category: '环境与镜头' },
];
