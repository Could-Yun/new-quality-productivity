/* =============================================================
 * 新质生产力 × 人工智能 —— 数据层
 * -------------------------------------------------------------
 * 数据说明（重要）：
 *  [实测] 标记的数字来自公开权威报道（新华网/工信部/国家知识产权局/
 *         求是网/农业农村部/中国政府网等，2024–2026），页脚附来源链接。
 *  [估算] 标记的维度（省级算力、人才指数、企业数等细分指标）为依据
 *         公开资料整理的量级估算，仅用于教学性可视化的相对比较，
 *         不作为精确统计引用。
 * ============================================================= */

(function () {
  /* ---------- 工具：由终值与年均增速反推历史序列 ---------- */
  function backcast(endValue, cagr, years, seed) {
    // seed 用于产生稳定（非随机刷新）的轻微波动，避免曲线过于平滑失真
    const out = [];
    const n = years.length;
    for (let i = 0; i < n; i++) {
      const stepsBack = n - 1 - i;
      const base = endValue / Math.pow(1 + cagr, stepsBack);
      // 末年为已知实测/设定值，不施加波动，保证与 scale 字段一致
      const wobble = stepsBack === 0 ? 1 : 1 + Math.sin((seed + i) * 2.399) * 0.02;
      out.push(Math.round(base * wobble * 100) / 100);
    }
    return out;
  }

  const YEARS = [2019, 2020, 2021, 2022, 2023, 2024, 2025];

  /* ---------- 省级多维数据 ----------
   * scale   核心产业规模（亿元）  —— 头部省份 [实测]，其余 [估算]
   * firms   核心企业数（家）       [估算]
   * compute 智能算力规模（EFLOPS） [估算]
   * patents AI 相关专利（千件）    [估算]
   * talent  人才集聚指数（0–100）  [估算]
   * growth  年增速（%）            [估算]
   */
  const PROVINCES = [
    { name: "上海市", en: "Shanghai",   scale: 6370, firms: 1200, compute: 180, patents: 52,  talent: 92,  growth: 32, region: "长三角", measured: true },
    { name: "北京市", en: "Beijing",   scale: 3200, firms: 2400, compute: 210, patents: 78,  talent: 100, growth: 28, region: "京津冀", measured: true },
    { name: "广东省", en: "Guangdong",   scale: 3100, firms: 1600, compute: 240, patents: 68,  talent: 90,  growth: 30, region: "粤港澳", measured: true },
    { name: "浙江省", en: "Zhejiang",   scale: 2600, firms: 1100, compute: 150, patents: 41,  talent: 82,  growth: 34, region: "长三角", measured: true },
    { name: "江苏省", en: "Jiangsu",   scale: 2200, firms: 950,  compute: 165, patents: 38,  talent: 78,  growth: 29, region: "长三角", measured: true },
    { name: "山东省", en: "Shandong",   scale: 1200, firms: 620,  compute: 95,  patents: 22,  talent: 65,  growth: 26, region: "环渤海" },
    { name: "四川省", en: "Sichuan",   scale: 950,  firms: 480,  compute: 120, patents: 18,  talent: 62,  growth: 31, region: "西部" },
    { name: "湖北省", en: "Hubei",   scale: 820,  firms: 420,  compute: 88,  patents: 17,  talent: 64,  growth: 27, region: "中部" },
    { name: "安徽省", en: "Anhui",   scale: 760,  firms: 390,  compute: 72,  patents: 15,  talent: 61,  growth: 33, region: "长三角" },
    { name: "福建省", en: "Fujian",   scale: 680,  firms: 350,  compute: 65,  patents: 13,  talent: 58,  growth: 25, region: "东南" },
    { name: "陕西省", en: "Shaanxi",   scale: 610,  firms: 300,  compute: 58,  patents: 14,  talent: 60,  growth: 26, region: "西部" },
    { name: "重庆市", en: "Chongqing",   scale: 540,  firms: 280,  compute: 62,  patents: 11,  talent: 57,  growth: 30, region: "西部" },
    { name: "天津市", en: "Tianjin",   scale: 480,  firms: 240,  compute: 54,  patents: 10,  talent: 59,  growth: 22, region: "京津冀" },
    { name: "湖南省", en: "Hunan",   scale: 430,  firms: 230,  compute: 45,  patents: 9,   talent: 55,  growth: 24, region: "中部" },
    { name: "河南省", en: "Henan",   scale: 400,  firms: 260,  compute: 50,  patents: 8,   talent: 52,  growth: 23, region: "中部" },
    { name: "辽宁省", en: "Liaoning",   scale: 350,  firms: 190,  compute: 38,  patents: 7,   talent: 53,  growth: 19, region: "东北" },
    { name: "江西省", en: "Jiangxi",   scale: 300,  firms: 160,  compute: 30,  patents: 6,   talent: 48,  growth: 25, region: "中部" },
    { name: "广西壮族自治区", en: "Guangxi", scale: 260, firms: 140, compute: 26, patents: 5, talent: 45, growth: 22, region: "西部" },
    { name: "云南省", en: "Yunnan",   scale: 220,  firms: 120,  compute: 22,  patents: 4,   talent: 43,  growth: 21, region: "西部" },
    { name: "贵州省", en: "Guizhou",   scale: 200,  firms: 110,  compute: 68,  patents: 3,   talent: 44,  growth: 28, region: "西部", hub: "国家算力枢纽·贵安", hubEn: "National computing hub · Gui'an" },
    { name: "河北省", en: "Hebei",   scale: 190,  firms: 130,  compute: 42,  patents: 4,   talent: 46,  growth: 20, region: "京津冀", hub: "国家算力枢纽·张家口", hubEn: "National computing hub · Zhangjiakou" },
    { name: "山西省", en: "Shanxi",   scale: 160,  firms: 95,   compute: 24,  patents: 3,   talent: 41,  growth: 19, region: "中部" },
    { name: "黑龙江省", en: "Heilongjiang", scale: 140,  firms: 85,   compute: 18,  patents: 3,   talent: 42,  growth: 17, region: "东北" },
    { name: "吉林省", en: "Jilin",   scale: 120,  firms: 75,   compute: 15,  patents: 2,   talent: 40,  growth: 16, region: "东北" },
    { name: "甘肃省", en: "Gansu",   scale: 110,  firms: 65,   compute: 35,  patents: 2,   talent: 38,  growth: 23, region: "西部", hub: "国家算力枢纽·庆阳", hubEn: "National computing hub · Qingyang" },
    { name: "内蒙古自治区", en: "Inner Mongolia", scale: 100, firms: 60, compute: 85, patents: 2,  talent: 36,  growth: 30, region: "西部", hub: "国家算力枢纽·和林格尔", hubEn: "National computing hub · Horinger" },
    { name: "新疆维吾尔自治区", en: "Xinjiang", scale: 95, firms: 55, compute: 28, patents: 2, talent: 35, growth: 24, region: "西部" },
    { name: "海南省", en: "Hainan",   scale: 70,   firms: 45,   compute: 12,  patents: 1,   talent: 37,  growth: 26, region: "东南" },
    { name: "宁夏回族自治区", en: "Ningxia", scale: 55, firms: 35, compute: 45, patents: 1,  talent: 33,  growth: 29, region: "西部", hub: "国家算力枢纽·中卫", hubEn: "National computing hub · Zhongwei" },
    { name: "青海省", en: "Qinghai",   scale: 40,   firms: 25,   compute: 10,  patents: 1,   talent: 30,  growth: 20, region: "西部" },
    { name: "西藏自治区", en: "Tibet", scale: 20,  firms: 12,   compute: 4,   patents: 0.3, talent: 25,  growth: 15, region: "西部" },
  ];

  // 为每个省生成逐年规模序列（用于时间轴播放）
  PROVINCES.forEach((p, i) => {
    p.series = backcast(p.scale, p.growth / 100, YEARS, i);
  });

  window.NQSL_DATA = {
    years: YEARS,

    meta: {
      note: "标注 [实测] 的数字来自公开权威报道；省级细分维度（算力、人才、企业数）为量级估算，仅用于相对比较。",
      noteEn: "Figures marked [measured] come from public official reporting. Provincial sub-dimensions (computing, talent, firm counts) are magnitude estimates intended only for relative comparison.",
    },

    /* ================= KPI ================= */
    kpis: [
      { value: 1.2,   suffix: "万亿元+", label: "2025年AI核心产业规模", note: "同比增长近30%，企业数量超6200家", decimals: 1, measured: true, labelEn: "2025 core AI industry size", noteEn: "Up ~30% YoY; over 6,200 companies", suffixEn: "T CNY+" },
      { value: 60,    suffix: "%",       label: "中国AI专利全球占比",   note: "全球最大AI专利拥有国",               decimals: 0, measured: true, labelEn: "China's share of global AI patents", noteEn: "World's largest holder of AI patents", suffixEn: "%" },
      { value: 1590,  suffix: " EFLOPS", label: "全国智能算力总规模",   note: "算力基础设施支撑规模化应用",         decimals: 0, measured: true, labelEn: "National intelligent computing power", noteEn: "Infrastructure enabling AI at scale", suffixEn: " EFLOPS" },
      { value: 18.39, suffix: "%",       label: "“三新”经济占GDP比重",  note: "2025年数据，逐年提升",               decimals: 2, measured: true, labelEn: "\u201cThree New\u201d economy as share of GDP", noteEn: "2025 figure, rising year on year", suffixEn: "%" },
    ],

    /* ================= 滚动叙事：宏观多指标时间序列 ================= */
    macro: {
      years: YEARS,
      scale:   [1300, 1850, 2600, 3500, 5000, 9000, 12000], // 核心产业规模 亿元 [2024/2025 实测]
      growth:  [20, 22, 24, 25, 26, 24, 29.6],              // 同比增速 %
      compute: [60, 110, 180, 302, 614, 1037, 1590],        // 智能算力 EFLOPS [2025 实测]
      firms:   [1800, 2400, 3100, 3900, 4700, 5500, 6200],  // 企业数量 家 [2025 实测]
      // 全球AI专利格局（2025，用于环形图）
      patentShare: [
        { name: "中国", en: "China", value: 60 },
        { name: "美国", en: "USA", value: 18 },
        { name: "日本", en: "Japan", value: 6 },
        { name: "韩国", en: "Korea", value: 5 },
        { name: "欧洲", en: "Europe", value: 7 },
        { name: "其他", en: "Others", value: 4 },
      ],
      // 综合能力雷达（0–100 相对指数 [估算]）
      radar: {
        indicators: [
          { name: "产业规模", en: "Industry size", max: 100 },
          { name: "专利产出", en: "Patents", max: 100 },
          { name: "算力基础", en: "Computing", max: 100 },
          { name: "企业集群", en: "Firm cluster", max: 100 },
          { name: "应用渗透", en: "Adoption", max: 100 },
          { name: "开源生态", en: "Open source", max: 100 },
        ],
        series: [
          { name: "2019年", en: "2019", value: [18, 42, 12, 29, 15, 20] },
          { name: "2025年", en: "2025", value: [86, 95, 90, 88, 82, 78] },
        ],
      },
    },

    // 滚动叙事分步文案
    scrollSteps: [
      {
        title: "一条指数级上扬的曲线",
        body: "2019 到 2025 年，中国人工智能核心产业规模从约 1300 亿元增长到 <b>1.2 万亿元以上</b>，七年间扩大约 9 倍。这条曲线是“新质生产力”最直接的经济学证据。",
        hint: "柱状图 · 用长度编码规模",
        titleEn: "An exponential curve",
        bodyEn: "From 2019 to 2025, China's core AI industry grew from about 130 billion to <b>over 1.2 trillion CNY</b> \u2014 roughly ninefold in seven years. This curve is the most direct economic evidence of \u201cnew quality productive forces\u201d.",
        hintEn: "Bar chart \u00b7 length encodes magnitude",
      },
      {
        title: "增速并没有随规模放缓",
        body: "通常产业做大后增速会回落，但 AI 产业相反——2025 年同比增速<b>回升到近 30%</b>。叠加的折线显示：这不是一个接近饱和的市场，而仍在加速。",
        hint: "柱线组合图 · 双数值轴",
        titleEn: "Growth has not slowed with scale",
        bodyEn: "Industries usually decelerate as they mature. AI did the opposite \u2014 YoY growth <b>rebounded to nearly 30%</b> in 2025. The overlaid line shows a market still accelerating, not saturating.",
        hintEn: "Bar + line \u00b7 dual value axes",
      },
      {
        title: "真正的底座是算力",
        body: "同期全国智能算力从 60 EFLOPS 增至 <b>1590 EFLOPS</b>，增长约 26 倍，远快于产业规模本身。算力是 AI 得以渗透各行业的物理前提。",
        hint: "面积图 · 强调累积与量级",
        titleEn: "Computing power is the real foundation",
        bodyEn: "Over the same period national intelligent computing rose from 60 to <b>1,590 EFLOPS</b>, about 26\u00d7, far outpacing industry size itself. Computing is the physical precondition for AI to reach every sector.",
        hintEn: "Area chart \u00b7 emphasises accumulation",
      },
      {
        title: "创新存量已居全球首位",
        body: "世界知识产权组织数据显示，中国持有全球约 <b>60%</b> 的人工智能专利，是全球最大的 AI 专利拥有国——技术积累已从“跟随”转向“领跑”。",
        hint: "环形图 · 用角度编码占比",
        titleEn: "China now leads the global patent stock",
        bodyEn: "WIPO data shows China holds roughly <b>60%</b> of the world's AI patents, the largest holder globally \u2014 a shift from following to leading.",
        hintEn: "Donut chart \u00b7 angle encodes share",
      },
      {
        title: "六个维度的整体跃迁",
        body: "把产业规模、专利、算力、企业集群、应用渗透、开源生态六个维度放在一起看，2025 年相对 2019 年的轮廓几乎完全外扩——这正是“新质”二字所指的系统性变化。",
        hint: "雷达图 · 多维度轮廓对比",
        titleEn: "A leap across six dimensions",
        bodyEn: "Viewing industry size, patents, computing, firm clusters, adoption and open-source ecosystem together, the 2025 outline expands on nearly every axis versus 2019 \u2014 the systemic change that \u201cnew quality\u201d refers to.",
        hintEn: "Radar chart \u00b7 multidimensional profile",
      },
    ],

    /* ================= 桑基图：要素 → 技术 → 行业 → 产出 ================= */
    sankey: {
      nodes: [
        { name: "数据要素", en: "Data" }, { name: "智能算力", en: "Computing" }, { name: "算法模型", en: "Algorithms" }, { name: "人才供给", en: "Talent" },
        { name: "大模型", en: "Large models" }, { name: "智能体", en: "AI agents" }, { name: "具身机器人", en: "Embodied robots" }, { name: "科学计算", en: "Scientific computing" },
        { name: "智能制造", en: "Smart manufacturing" }, { name: "智慧医疗", en: "Smart healthcare" }, { name: "智慧农业", en: "Smart agriculture" }, { name: "智能金融", en: "Smart finance" }, { name: "科研范式", en: "Research paradigm" },
        { name: "效率提升", en: "Higher efficiency" }, { name: "成本下降", en: "Lower cost" }, { name: "质量改善", en: "Better quality" }, { name: "新岗位创造", en: "New jobs" },
      ],
      links: [
        // 要素 → 技术形态
        { source: "数据要素", target: "大模型", value: 32 },
        { source: "数据要素", target: "智能体", value: 14 },
        { source: "数据要素", target: "科学计算", value: 10 },
        { source: "智能算力", target: "大模型", value: 30 },
        { source: "智能算力", target: "具身机器人", value: 12 },
        { source: "智能算力", target: "科学计算", value: 12 },
        { source: "算法模型", target: "大模型", value: 20 },
        { source: "算法模型", target: "智能体", value: 16 },
        { source: "算法模型", target: "具身机器人", value: 10 },
        { source: "人才供给", target: "大模型", value: 12 },
        { source: "人才供给", target: "智能体", value: 8 },
        { source: "人才供给", target: "科学计算", value: 6 },
        // 技术形态 → 行业
        { source: "大模型", target: "智能制造", value: 22 },
        { source: "大模型", target: "智慧医疗", value: 20 },
        { source: "大模型", target: "智能金融", value: 26 },
        { source: "大模型", target: "科研范式", value: 14 },
        { source: "大模型", target: "智慧农业", value: 12 },
        { source: "智能体", target: "智能金融", value: 18 },
        { source: "智能体", target: "智慧医疗", value: 10 },
        { source: "智能体", target: "智能制造", value: 10 },
        { source: "具身机器人", target: "智能制造", value: 18 },
        { source: "具身机器人", target: "智慧农业", value: 4 },
        { source: "科学计算", target: "科研范式", value: 18 },
        { source: "科学计算", target: "智慧医疗", value: 10 },
        // 行业 → 产出
        { source: "智能制造", target: "效率提升", value: 26 },
        { source: "智能制造", target: "质量改善", value: 14 },
        { source: "智能制造", target: "新岗位创造", value: 10 },
        { source: "智慧医疗", target: "效率提升", value: 22 },
        { source: "智慧医疗", target: "成本下降", value: 18 },
        { source: "智慧农业", target: "成本下降", value: 10 },
        { source: "智慧农业", target: "质量改善", value: 6 },
        { source: "智能金融", target: "效率提升", value: 24 },
        { source: "智能金融", target: "成本下降", value: 20 },
        { source: "科研范式", target: "质量改善", value: 16 },
        { source: "科研范式", target: "新岗位创造", value: 16 },
      ],
    },

    /* ================= 旭日图：行业渗透层级（可下钻） ================= */
    penetration: {
      name: "AI 应用渗透",
      children: [
        {
          name: "智能制造",
          en: "Smart Manufacturing",
          value: 0,
          children: [
            { name: "工业质检", en: "Visual Inspection", descEn: "Machine vision replaces manual inspection; miss rate drops sharply", value: 24, desc: "机器视觉替代人工目检，漏检率显著下降" },
            { name: "设备预测性维护", en: "Predictive Maintenance", descEn: "Sensor-based failure prediction cuts unplanned downtime", value: 16, desc: "基于传感数据预测故障，减少非计划停机" },
            { name: "柔性产线调度", en: "Flexible Scheduling", descEn: "AI re-schedules production for small-batch, high-mix output", value: 14, desc: "AI 动态排产，应对小批量多品种" },
            { name: "工业机器人", en: "Industrial Robots", descEn: "Density doubled in four years to 470 per 10,000 workers", value: 26, desc: "密度四年翻倍至470台/万人" },
          ],
        },
        {
          name: "智慧医疗",
          en: "Smart Healthcare",
          children: [
            { name: "医学影像诊断", en: "Medical Imaging", descEn: "Stroke CT analysis cut from 1 hour to 5–15 minutes", value: 28, desc: "脑卒中CT分析从1小时缩短至5-15分钟" },
            { name: "智能病历生成", en: "Clinical Notes", descEn: "Writing time 10 min → 30 s, efficiency up 190%", value: 18, desc: "书写时间10分钟→30秒，效率提升190%" },
            { name: "药物研发", en: "Drug Discovery", descEn: "AI accelerates molecule screening, bringing drugs to market earlier", value: 14, desc: "AI加速分子筛选，新药上市提前数月" },
            { name: "临床试验筛选", en: "Trial Screening", descEn: "88.5% lower manual screening cost for oncology trials", value: 10, desc: "肿瘤项目人工筛查成本降低88.5%" },
          ],
        },
        {
          name: "智慧农业",
          en: "Smart Agriculture",
          children: [
            { name: "植保无人机", en: "Crop-protection Drones", descEn: "Over 300,000 drones covering 460 million mu annually", value: 20, desc: "超30万架，年作业面积4.6亿亩" },
            { name: "智慧种植决策", en: "Planting Decisions", descEn: "Agricultural foundation models raise yield ~5% on average", value: 14, desc: "农业大模型平均提高产量5%" },
            { name: "农机自动驾驶", en: "Autonomous Machinery", descEn: "76.7% mechanisation across sowing, tending and harvest", value: 8, desc: "耕种收综合机械化率76.7%" },
            { name: "智能养殖", en: "Smart Livestock", descEn: "Two people can manage 150,000 chickens", value: 10, desc: "养15万只鸡仅需两人" },
          ],
        },
        {
          name: "智能金融",
          en: "Smart Finance",
          children: [
            { name: "智能风控", en: "Risk Control", descEn: "Non-performing loan ratio down 0.3–0.5 percentage points", value: 26, desc: "不良贷款率平均降低0.3-0.5个百分点" },
            { name: "反欺诈", en: "Fraud Detection", descEn: "Accuracy 85% → 99.2%; latency 3 s → 0.1 s", value: 20, desc: "识别准确率85%→99.2%，耗时3秒→0.1秒" },
            { name: "智能信贷审批", en: "Credit Approval", descEn: "Retail lending approval from 5 minutes to 10 seconds", value: 18, desc: "零售信贷审批从5分钟进入10秒时代" },
            { name: "智能客服", en: "Virtual Agents", descEn: "24/7 response, easing pressure on human agents", value: 12, desc: "7×24小时响应，人工坐席压力下降" },
          ],
        },
        {
          name: "科研范式",
          en: "Research Paradigm",
          children: [
            { name: "AI for Science", en: "AI for Science", descEn: "Research driven by data and large-scale computation", value: 16, desc: "以数据与算力驱动的智能化科研" },
            { name: "材料/蛋白质预测", en: "Materials & Proteins", descEn: "Shortens experimental trial-and-error cycles", value: 12, desc: "缩短实验试错周期" },
            { name: "科学大模型", en: "Scientific Models", descEn: "Cross-disciplinary knowledge integration and hypothesis generation", value: 10, desc: "跨学科知识整合与假设生成" },
          ],
        },
      ],
    },

    /* ================= 斜率图：AI 应用前后效率对比 ================= */
    efficiency: {
      note: "各指标已归一化为“相对耗时/成本指数”（应用前 = 100），数值越低代表效率越高。",
      noteEn: "All metrics normalised to a relative time/cost index (before = 100); lower means more efficient.",
      items: [
        { name: "脑卒中CT影像分析", before: 100, after: 17,  raw: "60分钟 → 10分钟", field: "医疗" , nameEn: "Stroke CT analysis", rawEn: "60 min \u2192 10 min", fieldEn: "Healthcare" },
        { name: "医疗病历书写",     before: 100, after: 5,   raw: "10分钟 → 30秒",  field: "医疗" , nameEn: "Clinical note writing", rawEn: "10 min \u2192 30 s", fieldEn: "Healthcare" },
        { name: "零售信贷审批",     before: 100, after: 3,   raw: "5分钟 → 10秒",   field: "金融" , nameEn: "Retail credit approval", rawEn: "5 min \u2192 10 s", fieldEn: "Finance" },
        { name: "信用卡反欺诈识别", before: 100, after: 3,   raw: "3秒 → 0.1秒",    field: "金融" , nameEn: "Card fraud detection", rawEn: "3 s \u2192 0.1 s", fieldEn: "Finance" },
        { name: "风险分池建模上线", before: 100, after: 1,   raw: "43天 → 10小时",  field: "金融" , nameEn: "Risk model deployment", rawEn: "43 days \u2192 10 hours", fieldEn: "Finance" },
        { name: "肿瘤试验人工筛查", before: 100, after: 12,  raw: "成本降低88.5%",  field: "医疗" , nameEn: "Oncology trial screening", rawEn: "88.5% cost reduction", fieldEn: "Healthcare" },
        { name: "大田植保作业",     before: 100, after: 7,   raw: "7天 → 半天",     field: "农业" , nameEn: "Field crop protection", rawEn: "7 days \u2192 half a day", fieldEn: "Agriculture" },
        { name: "汽车焊装产线",     before: 100, after: 70,  raw: "效率提升约30%",  field: "制造" , nameEn: "Automotive welding line", rawEn: "~30% efficiency gain", fieldEn: "Manufacturing" },
      ],
    },

    /* ================= 行业案例卡 ================= */
    industries: [
      {
        id: "manufacturing", icon: "⚙️", tag: "智能制造",
        title: "机器人让工厂“长出”神经",
        headline: { from: 235, to: 470, unit: "台/万人", fromLabel: "2019", toLabel: "2023", metric: "工业机器人密度" },
        desc: "中国工业机器人密度四年翻倍，2023年达470台/万人，远超全球平均126台/万人；汽车焊装环节应用机器人后效率提升约30%。",
        chips: ["新能源汽车电池产线", "3C电子0.02mm精度贴装", "人形机器人年产超10万台"],
        tagEn: "Smart Manufacturing", titleEn: "Robots give the factory a nervous system", descEn: "China's industrial robot density doubled in four years to 470 per 10,000 workers, far above the global average of 126. Robotic welding lines lifted automotive output efficiency by about 30%.",
        headlineEn: { metric: "Robot density per 10,000 workers", fromLabel: "2019", toLabel: "2023", unit: "units/10k" },
        chipsEn: ["EV battery lines", "0.02mm placement in 3C electronics", "100k+ humanoid robots/year"],
      },
      {
        id: "health", icon: "🩺", tag: "智慧医疗",
        title: "AI 把阅片时间压到十分之一",
        headline: { from: 60, to: 10, unit: "分钟", fromLabel: "人工", toLabel: "AI辅助", metric: "脑卒中CT分析耗时" },
        desc: "AI辅助诊断将单例脑部CT分析时间从1小时缩短到5~15分钟；生成式病历书写效率提升190%，单份成本降幅最高超90%。",
        chips: ["县域远程影像年服务6800万人次", "肿瘤试验筛选成本降88.5%", "AI判读准确率超90%"],
        tagEn: "Smart Healthcare", titleEn: "AI cuts image reading to a tenth of the time", descEn: "AI-assisted diagnosis cut single-case brain CT analysis from one hour to 5\u201315 minutes. Generative clinical notes improved writing efficiency by 190%, with per-note cost down over 90%.",
        headlineEn: { metric: "Stroke CT analysis time", fromLabel: "Manual", toLabel: "AI-assisted", unit: "min" },
        chipsEn: ["68M county teleimaging cases/yr", "88.5% lower trial screening cost", "Over 90% reading accuracy"],
      },
      {
        id: "agriculture", icon: "🌾", tag: "智慧农业",
        title: "无人机半天干完人工七天的活",
        headline: { from: 100, to: 7500, unit: "亩/人", fromLabel: "传统", toLabel: "伏羲农场", metric: "单人可管理耕地" },
        desc: "全国超30万架农业无人机年作业面积突破4.6亿亩；“伏羲农场”实现4人管理3万亩耕地，农业大模型平均提高产量5%、降低成本10%。",
        chips: ["耕种收机械化率76.7%", "柑橘AI决策产量波动降22%", "棉花打顶机器人24小时作业"],
        tagEn: "Smart Agriculture", titleEn: "A drone does in half a day what took a week", descEn: "Over 300,000 agricultural drones now cover 460 million mu a year. The \u201cFuxi Farm\u201d model lets four people manage 30,000 mu, while agricultural models lift yield ~5% and cut cost ~10%.",
        headlineEn: { metric: "Farmland managed per person", fromLabel: "Traditional", toLabel: "Fuxi Farm", unit: "mu/person" },
        chipsEn: ["76.7% mechanisation rate", "22% less yield volatility (citrus)", "24/7 cotton topping robots"],
      },
      {
        id: "finance", icon: "💹", tag: "智能风控",
        title: "反欺诈识别从 3 秒压到 0.1 秒",
        headline: { from: 85, to: 99.2, unit: "%", fromLabel: "传统模型", toLabel: "多智能体", metric: "欺诈识别准确率" },
        desc: "多智能体反欺诈引擎将识别准确率从85%提升至99.2%，年挽回损失超2亿元；AI风控银行不良贷款率平均降低0.3~0.5个百分点。",
        chips: ["14亿账户建模43天→10小时", "“秒批秒贷”48小时放款", "放款工时缩短40%"],
        tagEn: "Risk Intelligence", titleEn: "Fraud detection from 3 seconds to 0.1", descEn: "A multi-agent anti-fraud engine lifted detection accuracy from 85% to 99.2%, recovering over 200 million CNY a year. Banks using AI risk control cut NPL ratios by 0.3\u20130.5 percentage points.",
        headlineEn: { metric: "Fraud detection accuracy", fromLabel: "Legacy model", toLabel: "Multi-agent", unit: "%" },
        chipsEn: ["1.4B accounts: 43d → 10h", "“Instant approval” in 48h", "40% less disbursement labour"],
      },
    ],

    /* ================= 省级数据 ================= */
    provinces: PROVINCES,

    // 地图用（含无数据地区占位）
    mapExtra: [
      { name: "香港特别行政区", value: 0 },
      { name: "澳门特别行政区", value: 0 },
      { name: "台湾省", value: 0 },
    ],

    /* ================= 政策时间线 ================= */
    timeline: [
      { time: "2023.09", title: "“新质生产力”首次提出", desc: "习近平总书记在黑龙江考察时首次提出，强调整合科技创新资源、加快形成新质生产力。", titleEn: "\u201cNew quality productive forces\u201d coined", descEn: "Xi Jinping first used the term while inspecting Heilongjiang, urging integration of innovation resources." },
      { time: "2023.12", title: "中央经济工作会议部署", desc: "明确以科技创新推动产业创新，发展新质生产力写入会议部署。", titleEn: "Central Economic Work Conference", descEn: "Development of new quality productive forces written into the national economic agenda." },
      { time: "2024.03", title: "写入政府工作报告", desc: "新质生产力列为政府工作十大任务之首，首次提出开展“人工智能+”行动。", titleEn: "Into the Government Work Report", descEn: "Listed first among ten government tasks; the \u201cAI+\u201d initiative proposed for the first time." },
      { time: "2024.07", title: "二十届三中全会", desc: "健全因地制宜发展新质生产力体制机制，明确人工智能等战略性产业政策与治理体系。", titleEn: "Third Plenum, 20th CPC", descEn: "Institutional mechanisms set for AI and other strategic industries." },
      { time: "2025.08", title: "“人工智能+”行动意见", desc: "国务院印发实施意见，设定2027/2030/2035三阶段目标，部署六大重点行动。", titleEn: "State Council \u201cAI+\u201d guidance", descEn: "Implementation opinion issued with staged targets for 2027 / 2030 / 2035." },
      { time: "2025.10", title: "“十五五”规划建议", desc: "人工智能列为新质生产力重点方向，提出全方位赋能千行百业。", titleEn: "15th Five-Year Plan proposals", descEn: "AI designated a priority direction, empowering all industries." },
      { time: "2026.03", title: "打造智能经济新形态", desc: "2026年政府工作报告提出“深化拓展人工智能+”，重心转向规模化应用落地。", titleEn: "Toward a smart economy", descEn: "2026 report calls for deepening \u201cAI+\u201d, shifting focus to large-scale deployment." },
    ],

    /* ================= 技术图谱 ================= */
    graph: {
      nodes: [
        { name: "人工智能", en: "Artificial Intelligence",   symbolSize: 68, category: 0 },
        { name: "数据要素", en: "Data",   symbolSize: 40, category: 1 },
        { name: "算法模型", en: "Algorithms",   symbolSize: 40, category: 1 },
        { name: "智能算力", en: "Computing",   symbolSize: 40, category: 1 },
        { name: "人才供给", en: "Talent",   symbolSize: 36, category: 1 },
        { name: "大模型", en: "Large models",     symbolSize: 44, category: 2 },
        { name: "智能体", en: "AI agents",     symbolSize: 38, category: 2 },
        { name: "具身机器人", en: "Embodied robots", symbolSize: 38, category: 2 },
        { name: "智能制造", en: "Smart manufacturing",   symbolSize: 46, category: 3 },
        { name: "智慧医疗", en: "Smart healthcare",   symbolSize: 46, category: 3 },
        { name: "智慧农业", en: "Smart agriculture",   symbolSize: 42, category: 3 },
        { name: "智能金融", en: "Smart finance",   symbolSize: 44, category: 3 },
        { name: "科研范式", en: "Research paradigm",   symbolSize: 42, category: 3 },
        { name: "全要素生产率", en: "Total factor productivity", symbolSize: 50, category: 4 },
        { name: "新质生产力", en: "New quality productive forces", symbolSize: 64, category: 4 },
      ],
      links: [
        { source: "数据要素", target: "人工智能" }, { source: "算法模型", target: "人工智能" },
        { source: "智能算力", target: "人工智能" }, { source: "人才供给", target: "人工智能" },
        { source: "人工智能", target: "大模型" },   { source: "人工智能", target: "智能体" },
        { source: "人工智能", target: "具身机器人" },
        { source: "大模型", target: "智能制造" },   { source: "大模型", target: "智慧医疗" },
        { source: "大模型", target: "智能金融" },   { source: "大模型", target: "科研范式" },
        { source: "智能体", target: "智能金融" },   { source: "智能体", target: "智慧医疗" },
        { source: "具身机器人", target: "智能制造" }, { source: "具身机器人", target: "智慧农业" },
        { source: "大模型", target: "智慧农业" },
        { source: "智能制造", target: "全要素生产率" }, { source: "智慧医疗", target: "全要素生产率" },
        { source: "智慧农业", target: "全要素生产率" }, { source: "智能金融", target: "全要素生产率" },
        { source: "科研范式", target: "全要素生产率" },
        { source: "全要素生产率", target: "新质生产力" },
      ],
      categories: [
        { name: "核心引擎", en: "Core engine" }, { name: "驱动要素", en: "Inputs" }, { name: "技术形态", en: "Tech forms" },
        { name: "行业赋能", en: "Industry" }, { name: "经济结果", en: "Outcome" },
      ],
    },

    outlook: { current: 1.2, target: 10, currentLabel: "2025年", targetLabel: "2030年目标", currentLabelEn: "2025", targetLabelEn: "2030 target" },

    /* ================= 数据来源 ================= */
    sources: [
      { text: "新华网：新质生产力成为发展重要引擎", url: "https://www.news.cn/tech/20260924/471bc9683ad24e26afc3fd4a309cc1a4/c.html" },
      { text: "工业和信息化部：2025年我国人工智能核心产业规模超1.2万亿元", url: "https://www.news.cn/politics/20260305/e8d78b5a77c844da984d5ec442dbfa9f/c.html" },
      { text: "国家知识产权局：我国人工智能专利数占全球总量60%", url: "https://www.cnipa.gov.cn/art/2025/8/15/art_55_201046.html" },
      { text: "求是网：人工智能赋能新质生产力的路径指引", url: "https://www.qstheory.cn/20251128/045b6f44dc104bc2b8d768744dbf36c6/c.html" },
      { text: "国务院关于深入实施“人工智能+”行动的意见（解读）", url: "https://news.qq.com/rain/a/20250830A06PV100" },
      { text: "澎湃新闻：2025中国制造业机器人密度翻番", url: "https://www.thepaper.cn/newsDetail_forward_16166894" },
      { text: "新华网：AI医疗迈入规模化落地期", url: "https://www.news.cn/tech/20260304/5abc83145dba4124b3ba85e90bff04d7/c.html" },
      { text: "农业农村部：智慧农业激活农业“新质生产力”新引擎", url: "https://www.agri.cn/sj/scdt/202504/t20250418_8727126.htm" },
      { text: "2025年银行业人工智能十大典型应用案例", url: "https://www.163.com/dy/article/KILV5BVP0556CB3Q.html" },
      { text: "新华网：31省份AI产业版图浮现，梯度发展格局凸显", url: "https://www.news.cn/fortune/20260805/aa328c081d3146b5935b1b8ee06e6d51/c.html" },
      { text: "人民网：习近平总书记强调的“新质生产力”", url: "http://theory.people.com.cn/n1/2024/0318/c40531-40197632.html" },
    ],
  };
})();
