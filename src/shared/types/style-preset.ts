export type PresetCategory = 'business' | 'education' | 'content' | 'short_video' | 'emotional'

export interface StylePreset {
  id: string
  name: string
  category: PresetCategory
  description: string
  icon: string
  tone: { style: string; vocabulary: string; emotion: string }
  pacing: { overall: string; cutRhythm: string; transitionPreference: string }
  audience: { level: string; jargon: 'none' | 'low' | 'medium' | 'high'; depth: 'overview' | 'balanced' | 'deep'; expectedTakeaway: string }
  visual: { colorPalette: string; subtitleStyle: string; coverStyle: string; imageGenPrompt?: string }
  audio: { bgmStyle: string; voiceRole: string; originalSound: 'keep' | 'replace' | 'mix'; mixRatio?: string }
  editing: { silenceThreshold: number; fillerWordStrategy: 'aggressive' | 'moderate' | 'lenient'; highlightBias: string[]; minClipDuration: number }
  source: 'builtin' | 'user'
  createdAt?: string
}

export const BUILTIN_PRESETS: StylePreset[] = [
  {
    id: 'product-launch', name: '产品发布会', category: 'business', description: '新品发布、品牌升级、技术展示', icon: '🚀',
    tone: { style: '专业、振奋、自信', vocabulary: '避免口语化，适度使用行业术语，强调技术领先', emotion: '从冷静的技术铺垫逐渐过渡到激昂的市场愿景' },
    pacing: { overall: '中速，关键数据处自然停顿0.5s以强调', cutRhythm: '快切为主，平均镜头3-5s，产品特写镜头可延长至8s', transitionPreference: '硬切为主，章节切换用0.3s淡入淡出' },
    audience: { level: '行业人士/科技爱好者', jargon: 'medium', depth: 'balanced', expectedTakeaway: '产品核心优势 + 市场领先地位 + 行动号召（预约/购买）' },
    visual: { colorPalette: '深蓝+白+科技紫点缀，冷色调，高对比度', subtitleStyle: '简约无衬线体，白色字+半透明黑底，底部居中，关键数据放大1.5倍', coverStyle: '产品特写居中+大标题字在下方+品牌logo左上角', imageGenPrompt: 'clean product photography, dark studio lighting, cinematic, 8K' },
    audio: { bgmStyle: '渐进式电子/科技感，无歌词，0:00-0:30铺垫，0:30起加入鼓点，高潮段低频增强', voiceRole: '沉稳男声或中性女声，30-35岁，语速中速偏快，关键句尾音下沉以增加权威感', originalSound: 'mix', mixRatio: '原声20% + 解说80%' },
    editing: { silenceThreshold: 1.5, fillerWordStrategy: 'aggressive', highlightBias: ['产品特写', '数据展示', 'CEO讲话', '用户证言'], minClipDuration: 2 },
    source: 'builtin',
  },
  {
    id: 'tutorial-course', name: '教程/课程', category: 'education', description: '教学视频、在线课程、操作演示', icon: '📚',
    tone: { style: '清晰、耐心、鼓励', vocabulary: '口语化但规范，新概念首次出现加解释', emotion: '始终保持温和鼓励，难点处放慢节奏，完成处给予肯定' },
    pacing: { overall: '慢速清晰，复杂步骤重复一遍，操作间隙留3s供观众跟做', cutRhythm: '慢切，静态操作画面可停留10-15s，切换前加操作提示字幕', transitionPreference: '章节间用标题卡片过渡，步骤间用简单硬切' },
    audience: { level: '初学者至中级', jargon: 'low', depth: 'deep', expectedTakeaway: '掌握具体技能，能独立完成操作' },
    visual: { colorPalette: '浅灰+蓝色强调，柔和暖光，避免刺眼', subtitleStyle: '清晰无衬线，黑色字+白边，底部居中，代码/命令用等宽字体高亮', coverStyle: '课程标题大字+核心技能关键词标签云', imageGenPrompt: 'clean educational illustration, flat design, light background, friendly' },
    audio: { bgmStyle: '无BGM或极轻量Lo-Fi，操作演示时完全静默以避免干扰', voiceRole: '温暖中性声，25-30岁，语速中速偏慢，清晰发音', originalSound: 'replace' },
    editing: { silenceThreshold: 2.0, fillerWordStrategy: 'moderate', highlightBias: ['操作演示', '关键步骤', '总结回顾'], minClipDuration: 3 },
    source: 'builtin',
  },
  {
    id: 'vlog-daily', name: 'Vlog/日常', category: 'content', description: '生活记录、旅行、探店、日常碎片', icon: '🎬',
    tone: { style: '轻松、第一人称、有温度', vocabulary: '日常口语，允许适度语气词保留（"哇""哈哈""绝了"），像和朋友聊天', emotion: '自然流露，开心时笑，惊叹时夸张，不做作' },
    pacing: { overall: '快节奏但不赶，跟随BGM节拍自然切换', cutRhythm: '混合节奏，静态画面1-2s快速闪过（蒙太奇），重点场景10-20s完整保留', transitionPreference: '大量使用J-cut（声音先入），转场用缩放/旋转动效，慎用淡入淡出' },
    audience: { level: '大众观众', jargon: 'none', depth: 'overview', expectedTakeaway: '感受到博主的个性和生活态度' },
    visual: { colorPalette: '暖色调，饱和度+10%，肤色保护，呈现电影感青橙色调', subtitleStyle: '活泼手写体或圆体，白色+黑边，位置不固定（跟随画面焦点移动），关键词彩色高亮', coverStyle: '博主本人+场景拼贴，手写风格标题', imageGenPrompt: 'warm cinematic, golden hour, lifestyle photography, cozy' },
    audio: { bgmStyle: 'Lo-Fi / Indie Pop / Jazz Hip-Hop，有歌词但音量压低至-18dB避免抢人声', voiceRole: '博主本人原声为主，AI仅补充过渡段落', originalSound: 'keep', mixRatio: '原声80% + BGM20%' },
    editing: { silenceThreshold: 1.0, fillerWordStrategy: 'lenient', highlightBias: ['情绪反应', '美景', '美食特写', '有趣互动'], minClipDuration: 1.5 },
    source: 'builtin',
  },
  {
    id: 'douyin-commerce', name: '抖音带货', category: 'short_video', description: '直播切片、好物分享、带货种草', icon: '🛒',
    tone: { style: '快节奏、强对比、直接', vocabulary: '口语化+网络流行语，频繁使用"你""竟然""居然"，制造紧迫感', emotion: '开场3s制造悬念/痛点，中间强力论证，结尾强行动号召' },
    pacing: { overall: '极快，无任何拖沓，每句话都是信息或情绪', cutRhythm: '极快切（1-3s/镜头），前3s必须有画面变化或文字弹出', transitionPreference: '硬切+缩放冲击+文字弹跳动画，禁用慢速转场' },
    audience: { level: '大众消费者', jargon: 'none', depth: 'overview', expectedTakeaway: '这个产品解决我的痛点 + 现在买最划算' },
    visual: { colorPalette: '高饱和度、暖色+红/橙强调、对比度+20%', subtitleStyle: '大字幕（占屏幕1/5），明黄/亮红+粗黑边，逐字弹出动画，价格数字放大3倍', coverStyle: '产品+使用效果对比+大字价格标签', imageGenPrompt: 'bold product shot, bright studio light, vibrant colors, e-commerce style' },
    audio: { bgmStyle: '抖音热歌/卡点音乐，Drop段配合促销信息，全程有BGM', voiceRole: '快语速，男性以激昂为主，女性以亲切但紧迫为主，句尾上扬制造悬念', originalSound: 'mix', mixRatio: '原声50% + AI解说50% + BGM30%（叠加混音）' },
    editing: { silenceThreshold: 0.5, fillerWordStrategy: 'aggressive', highlightBias: ['痛点场景', '效果对比', '价格信息', '限时优惠', '用户好评'], minClipDuration: 1 },
    source: 'builtin',
  },
]
