import type { PoolEntry } from '@/type/settings';

/** 条目池唯一事实源（无存档无 UI，改条目＝改本文件→build→推 fork）。
 *  出厂默认：12 组 49 条（含 1 条 pinned 转场推进）。
 *  抽取＝均匀随机无放回（weight/分组轮抽已删）；场景适配＝候选超发+AI 终选，
 *  场景性强的条目挂自由文本 condition 交由生成 AI 判断；category 仅作组织标签。 */
export const DEFAULT_MASTER_POOL: PoolEntry[] = [
  {
    'id': '06281157-6887-483e-b9e8-a00f1f2f646e\r',
    'type': '顺势而为',
    'content': '不预设特定策略，让角色顺着当前情境做出最自然的反应，行动与情绪贴合角色既有性格',
    'rule': '',
    'pinned': false,
    'category': '稳态基线',
    'condition': ''
  },
  {
    'id': '46f40348-1295-4590-bf13-20148f1a6878\r',
    'type': '就地取材',
    'content': '抓住当前环境中的具体物件或空间特征，做出有目的性的互动行为',
    'rule': '',
    'pinned': false,
    'category': '环境互动',
    'condition': ''
  },
  {
    'id': 'ac7a380e-0fc8-4a8e-9cb3-708a65a262bc\r',
    'type': '转场推进',
    'content': '用一两句精炼的叙述完成时间跳跃或地点切换，快速进入下一段剧情',
    'rule': '此项固定生成，不参与随机抽取',
    'pinned': true,
    'category': '剧情引擎',
    'condition': ''
  },
  {
    'id': 'd7b1c9b6-b4e6-4142-bece-d8a60891674a\r',
    'type': '意外走向',
    'content': '利用当前场景中被忽略的细节或信息差，制造一个意料之外但情理之中的转折',
    'rule': '',
    'pinned': false,
    'category': '剧情引擎',
    'condition': ''
  },
  {
    'id': '184ab76e-eff4-4077-92d5-a5546334156d\r',
    'type': '突发变故',
    'content': '引入一个来自场景外部的干扰——突然的访客、消息、声响或异动——打断当前节奏、改变走向',
    'rule': '干扰必须与既有世界观和场景设定相容，不得凭空引入新人物或超展开',
    'pinned': false,
    'category': '剧情引擎',
    'condition': ''
  },
  {
    'id': '723b408e-8bf3-49a5-bef9-b1bc00bd841e\r',
    'type': '旧事重提',
    'content': '由眼前的某个具体事物自然勾起一段往事，用简短回忆映照当下处境，再收回到现实',
    'rule': '回忆篇幅不超过两三句，重点在回忆与当下的映照，不写大段闪回',
    'pinned': false,
    'category': '剧情引擎',
    'condition': ''
  },
  {
    'id': '1e873462-c053-4ada-a15b-88ffcb3a9281\r',
    'type': '软性时限',
    'content': '为当前局势引入一个自然的时间压力——店要打烊、对方即将离开、约定临近——制造紧迫感',
    'rule': '',
    'pinned': false,
    'category': '剧情引擎',
    'condition': ''
  },
  {
    'id': '44e3e679-b7df-4c69-8ffb-f9e73e5d706a\r',
    'type': '创意脑洞',
    'content': '跳出当前思路的惯性，提出一个出人意料但仍在情理边缘内的互动或行动方向',
    'rule': '创意不得破坏世界观基本设定，追求新奇而非荒诞',
    'pinned': false,
    'category': '剧情引擎',
    'condition': ''
  },
  {
    'id': '00d078ed-f187-4e96-af8e-75b8bf0a0653\r',
    'type': '主动收束',
    'content': '主动为当前场景画上句号——提出告别、送行、转场提议或对当下话题做个总结——把故事推向下一个阶段',
    'rule': '收束须自然有礼，不生硬掐断仍有张力的对话',
    'pinned': false,
    'category': '剧情引擎',
    'condition': ''
  },
  {
    'id': '4cd6cf68-d8e1-4914-8ee1-9013b443a21c\r',
    'type': '背景揭示',
    'content': '借机揭开一段此前埋下的伏笔或角色不为人知的背景信息，让剧情向人物纵深展开',
    'rule': '',
    'pinned': false,
    'category': '剧情引擎',
    'condition': ''
  },
  {
    'id': '244fae0b-b392-4a82-a074-159f1385d80d\r',
    'type': '暧昧触碰',
    'content': '在不逾越角色关系边界的前提下，通过细微的肢体动作或含蓄的暗示拉近情感距离',
    'rule': '',
    'pinned': false,
    'category': '情感升温',
    'condition': '双方关系已有暧昧张力或好感基础'
  },
  {
    'id': '41727a9d-360b-46ea-a7ce-a4e84d1f32b5\r',
    'type': '温暖靠近',
    'content': '通过表达理解、分享类似经历或提供实际帮助，缩短与对方的心理距离',
    'rule': '',
    'pinned': false,
    'category': '情感升温',
    'condition': ''
  },
  {
    'id': '2e82721d-0214-4275-9668-5a2581413a1c\r',
    'type': '卸下防备',
    'content': '在信任足够的前提下，坦露一件平日不愿提起的心事或软肋，以真实的脆弱换取对方更深的回应',
    'rule': '',
    'pinned': false,
    'category': '情感升温',
    'condition': '双方已建立足够信任，且当前氛围私密安全'
  },
  {
    'id': '49a7b08d-bf09-41da-8546-97c9d79bc8c0\r',
    'type': '一诺千金',
    'content': '针对对方最在意的顾虑给出明确的表态或承诺，并配一个立刻可兑现的小行动作为证明',
    'rule': '',
    'pinned': false,
    'category': '情感升温',
    'condition': '对方存在明显的不安或顾虑，需要确定感'
  },
  {
    'id': 'ddaac18b-bd46-495e-b151-a6b6e01c8d6a\r',
    'type': '情感深入',
    'content': '把话题引向更深的情感层——剖析自己此刻的感受、或温柔地询问对方内心真实的想法',
    'rule': '',
    'pinned': false,
    'category': '情感升温',
    'condition': ''
  },
  {
    'id': '4484b7b6-2821-4754-b747-5adf5dcac9a4\r',
    'type': '表白时机',
    'content': '抓住当下的氛围与契机，把一直没说出口的心意挑明，或用行动让心意不言自明',
    'rule': '',
    'pinned': false,
    'category': '情感升温',
    'condition': '双方关系已到临界点，再进一步或彻底错过'
  },
  {
    'id': '978a0b7c-b0b8-417e-950b-ec6af837885a\r',
    'type': '轻松调侃',
    'content': '用一句俏皮话、一个自嘲的举动或反差感十足的小动作，冲淡空气中的紧张',
    'rule': '',
    'pinned': false,
    'category': '言语交锋',
    'condition': ''
  },
  {
    'id': 'dc6a7605-07a9-44f5-8e6a-02cdd0b51b31\r',
    'type': '打破沉默',
    'content': '主动挑起一个全新话题或行动，把场面从冷场僵持中带出来',
    'rule': '',
    'pinned': false,
    'category': '言语交锋',
    'condition': ''
  },
  {
    'id': 'cc75f877-77c5-441c-9920-8e1154886f54\r',
    'type': '借力打力',
    'content': '把对方施加的压力、抛出的话题或设下的圈套接过来转化为对己方有利的筹码，顺势反制',
    'rule': '',
    'pinned': false,
    'category': '言语交锋',
    'condition': ''
  },
  {
    'id': '57a69ff3-cf96-4296-9c49-e333d58e9a0f\r',
    'type': '社交应对',
    'content': '在多人在场或公开场合的语境下，得体地接住场面——应对他人目光、维护气氛或给自己留面子',
    'rule': '',
    'pinned': false,
    'category': '言语交锋',
    'condition': '场景中除主要互动对象外还有其他人在场'
  },
  {
    'id': '965bf4b0-3460-48ff-9490-be7bbbfa3dc0\r',
    'type': '幽默吐槽',
    'content': '以内心吐槽或当面打趣的方式，对眼前的荒诞之处轻轻戳破，制造喜剧感',
    'rule': '',
    'pinned': false,
    'category': '言语交锋',
    'condition': ''
  },
  {
    'id': 'd89e6439-75db-4825-9ce5-1a9bacd3b4d3\r',
    'type': '旁敲侧击',
    'content': '不直接点破，用看似无关的话题、玩笑或举动迂回试探对方的真实态度与底线',
    'rule': '',
    'pinned': false,
    'category': '试探刺探',
    'condition': ''
  },
  {
    'id': '3150bca0-167f-4940-b1db-eb7c2b4bb3ae\r',
    'type': '追根究底',
    'content': '盯住对方话语中含糊其辞或前后矛盾的细节追问下去，挖掘其刻意回避的部分',
    'rule': '',
    'pinned': false,
    'category': '试探刺探',
    'condition': ''
  },
  {
    'id': '9b7e2f6c-0eba-4f3b-aea4-df3da5f7550d\r',
    'type': '悬疑探索',
    'content': '对场景中可疑的痕迹、反常的细节或不完整的信息展开调查与求证',
    'rule': '',
    'pinned': false,
    'category': '试探刺探',
    'condition': '场景中存在未被解释的疑点或线索'
  },
  {
    'id': '959c288c-1c3e-4c13-9b8c-2f8a86fc4abe\r',
    'type': '防线试探',
    'content': '故意做出一个略微越界的举动或说一句意味深长的话，观察对方的反应以确认关系的真实边界',
    'rule': '试探幅度须小而可收回，不得一步跨过对方底线',
    'pinned': false,
    'category': '试探刺探',
    'condition': ''
  },
  {
    'id': '6a362775-f9b4-4505-9f06-76ea5e8769d4\r',
    'type': '谋定后动',
    'content': '暂不采取行动，先在心里盘算各方立场、动机与可用筹码，暗中酝酿一个具体可行的计划',
    'rule': '',
    'pinned': false,
    'category': '策略谋划',
    'condition': ''
  },
  {
    'id': 'a9fca7c6-483b-4b01-ab14-a263b479eac5\r',
    'type': '长线布局',
    'content': '放下眼前的得失，做一个为更远目标铺路的安排或取舍',
    'rule': '',
    'pinned': false,
    'category': '策略谋划',
    'condition': ''
  },
  {
    'id': '1d41e1f2-97f0-4df4-9bb0-df70a3e207d7\r',
    'type': '借势用势',
    'content': '识别当前局面里可借的力——他人的意图、场合的规则、正在发生的趋势——把自己想做的事顺势嫁接上去',
    'rule': '',
    'pinned': false,
    'category': '策略谋划',
    'condition': ''
  },
  {
    'id': 'ab5a0747-af8a-4a81-8f66-5dfe01c42d95\r',
    'type': '信息交易',
    'content': '把自己掌握而对方想要的信息当作筹码，换取对方手中的东西或承诺',
    'rule': '交易内容须与当前上下文中双方确实持有的信息相符',
    'pinned': false,
    'category': '策略谋划',
    'condition': ''
  },
  {
    'id': '03b44d45-699f-4fa4-a8ab-08433349f719\r',
    'type': '邀请同行',
    'content': '向对方发出一个具体的共同行动邀请——一起做某事、去某处、参与某个计划',
    'rule': '',
    'pinned': false,
    'category': '合作协作',
    'condition': ''
  },
  {
    'id': 'a1c8dd69-932f-44dd-b12d-f5229b717acf\r',
    'type': '分工托付',
    'content': '把一件自己不便出面或独力难支的事，郑重地托付或提议分工给在场的某个人',
    'rule': '',
    'pinned': false,
    'category': '合作协作',
    'condition': ''
  },
  {
    'id': '9302679d-6659-471e-a5bd-bb7c312ae984\r',
    'type': '共同行动',
    'content': '不商量、不请示，直接开始做一件需要对方配合的事，用行动本身发出协作的邀请',
    'rule': '',
    'pinned': false,
    'category': '合作协作',
    'condition': ''
  },
  {
    'id': '992fee46-7bff-474c-be32-72d486554a36\r',
    'type': '牺牲付出',
    'content': '为保护或成全某人，主动承担代价、让出利益或揽下风险，用付出本身表达分量',
    'rule': '牺牲须出自角色当下的真实动机，不写成自我感动',
    'pinned': false,
    'category': '合作协作',
    'condition': ''
  },
  {
    'id': '19972820-8a7b-4bd6-8c89-ac203ec98dfd\r',
    'type': '借物传意',
    'content': '借助递出、挪动或摆弄眼前的某件物品，让物件替自己传话——递伞、推过去一杯热茶、把某个东西轻轻合上',
    'rule': '',
    'pinned': false,
    'category': '环境互动',
    'condition': ''
  },
  {
    'id': '904f43eb-a931-49f1-940b-e336d44a758d\r',
    'type': '空间掌控',
    'content': '通过调整自己与对方的空间关系——靠近一步、拉开距离、换到对方身边坐下——改变两人之间的气场',
    'rule': '',
    'pinned': false,
    'category': '环境互动',
    'condition': ''
  },
  {
    'id': '151e3652-6ec2-4504-ac20-be761454e244\r',
    'type': '他人视角',
    'content': '暂时离开当前角色的视线，以在场另一位角色的眼睛观察同一时刻发生的事情',
    'rule': '只写该角色能看到、感知到的内容，不得泄露其视角之外的信息',
    'pinned': false,
    'category': '留白镜头',
    'condition': ''
  },
  {
    'id': '2301ee04-8f95-4ae1-8acc-371126dd6782\r',
    'type': '悄然旁观',
    'content': '不主动介入对话，通过眼神、姿态或细微情绪变化传递态度，保持沉默但并非无动于衷',
    'rule': '此项不涉及对白，纯粹依靠动作与内心活动',
    'pinned': false,
    'category': '留白镜头',
    'condition': ''
  },
  {
    'id': 'adc2e8e3-183b-4d2b-947d-93f4f91d6efa\r',
    'type': '感官沉浸',
    'content': '放慢节奏，通过五感细节描摹当前氛围与对方的细微状态，让画面先于行动',
    'rule': '',
    'pinned': false,
    'category': '留白镜头',
    'condition': ''
  },
  {
    'id': '07368053-fd05-4de2-abb7-68d773a3ec6e\r',
    'type': '分岔回望',
    'content': '在内心回望此前某个分岔的选择，短暂呈现\'如果当时\'的想象，再收回当下',
    'rule': '',
    'pinned': false,
    'category': '留白镜头',
    'condition': ''
  },
  {
    'id': '4eff7291-0037-495c-bab0-b46adb72b183\r',
    'type': '正面交锋',
    'content': '主动挑起或正面回应一场冲突，把潜藏的矛盾摆上台面，迫使双方亮明真实立场',
    'rule': '',
    'pinned': false,
    'category': '冲突对抗',
    'condition': '场景中存在真实矛盾或立场对立，而非日常闲聊'
  },
  {
    'id': '6319000e-37ab-4519-9061-f3d44da66fea\r',
    'type': '退避三舍',
    'content': '察觉气氛或局势于己不利时，暂时抽身、沉默或岔开话题，为后续行动保留回旋余地',
    'rule': '',
    'pinned': false,
    'category': '冲突对抗',
    'condition': ''
  },
  {
    'id': '3c18bbe8-5b3e-4041-9495-9e12867063a0\r',
    'type': '冲突升级',
    'content': '主动加码——把小摩擦推向公开对立，或让暗斗转为明争，逼局面提前摊牌',
    'rule': '升级须有角色可自洽的动机，不为吵而吵',
    'pinned': false,
    'category': '冲突对抗',
    'condition': ''
  },
  {
    'id': '1f6d087a-0c28-429c-ab49-fabe90e88566\r',
    'type': '立场宣示',
    'content': '不做任何攻击动作，只是清晰地、不容误解地亮出自己的底线与立场，让对方知道再进一步意味着什么',
    'rule': '',
    'pinned': false,
    'category': '冲突对抗',
    'condition': ''
  },
  {
    'id': '3da59b71-4f2e-4882-bede-620f16db0890\r',
    'type': '正面治愈',
    'content': '用行动化解眼前的矛盾或低气压——道歉、补偿、或做出一个让步姿态——让关系回到可呼吸的状态',
    'rule': '',
    'pinned': false,
    'category': '正向缓和',
    'condition': ''
  },
  {
    'id': 'd9ea7a95-2d00-426a-98b1-3286332037a0\r',
    'type': '缓和降温',
    'content': '给滚烫的场面降火：主动放软语气、转移焦点到轻松的事、或提议先搁置争议',
    'rule': '',
    'pinned': false,
    'category': '正向缓和',
    'condition': ''
  },
  {
    'id': '824d18ee-c236-46a6-93ee-9050f68087a1\r',
    'type': '关系修复',
    'content': '向一段出现裂痕的关系伸出手——重提共同回忆、承认自己的一份责任、或做出修复性的举动',
    'rule': '',
    'pinned': false,
    'category': '正向缓和',
    'condition': '双方之间存在尚未愈合的嫌隙或误会'
  },
  {
    'id': 'eb3fbe40-2ae7-449c-aaf7-eca8c92bf0b8\r',
    'type': '大胆尝试',
    'content': '当常规手段不足以推动局面时，采取一个带有明显风险但可能改变局势走向的行动',
    'rule': '',
    'pinned': false,
    'category': '冒险高能',
    'condition': ''
  },
  {
    'id': 'b721a677-a5e4-42aa-ae65-15f404bac99a\r',
    'type': '动作冒险',
    'content': '以身体动作为主语——追逐、攀爬、躲避、动手操作——用高画面感的动作直接应对眼前的局面',
    'rule': '',
    'pinned': false,
    'category': '冒险高能',
    'condition': ''
  },
  {
    'id': '48d05b30-19d6-4324-9bca-9f047d954c36\r',
    'type': '激进突破',
    'content': '放弃迂回，用最直接甚至粗暴的方式撕开当前的僵局或困境',
    'rule': '',
    'pinned': false,
    'category': '冒险高能',
    'condition': ''
  },
];
