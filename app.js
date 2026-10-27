/* =============================================================
 * 可视化导论 · AI × 新质生产力 —— 交互逻辑（固定浅色主题 · 中英双语）
 * ============================================================= */
(() => {
  "use strict";

  const DATA = window.NQSL_DATA;
  const I18N = window.NQSL_I18N;
  const LANG_KEY = "nqsl-lang";
  const charts = {};
  let chinaGeo = null;

  /* ============ 语言 ============ */
  let lang = localStorage.getItem(LANG_KEY) ||
    ((navigator.language || "zh").toLowerCase().startsWith("zh") ? "zh" : "en");

  const t = (key, ...args) => {
    const v = I18N[lang][key];
    return typeof v === "function" ? v(...args) : (v !== undefined ? v : key);
  };
  const isEn = () => lang === "en";
  /** 取数据对象的本地化字段：优先 enKey，回退中文 */
  const pick = (o, zhKey, enKey) => (isEn() && o && o[enKey] != null ? o[enKey] : o[zhKey]);
  /** 省份显示名（地图 data.name 必须保持中文以匹配 GeoJSON，仅显示时本地化） */
  const provName = (p) => (isEn() ? (p.en || p.name) : p.name);

  const REGION_EN = {
    "长三角": "Yangtze Delta", "京津冀": "Jing-Jin-Ji", "粤港澳": "Greater Bay",
    "中部": "Central", "西部": "West", "东北": "Northeast",
    "环渤海": "Bohai Rim", "东南": "Southeast",
  };
  const regionName = (r) => (isEn() ? (REGION_EN[r] || r) : r);

  /* ============ 工具 ============ */
  const $ = (id) => document.getElementById(id);
  const cssVar = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const txt = () => ({ color: cssVar("--text-dim"), fontFamily: "inherit" });
  const fmt = (n) => (n >= 1000 ? n.toLocaleString("en-US") : String(n));

  function initChart(key, el) {
    if (charts[key]) charts[key].dispose();
    const c = echarts.init(el);
    charts[key] = c;
    return c;
  }

  /* ============ 静态文案注入 ============ */
  function applyStaticCopy() {
    document.documentElement.lang = isEn() ? "en" : "zh-CN";
    document.title = t("docTitle");

    document.querySelectorAll("[data-i18n]").forEach((el) => {
      el.textContent = t(el.dataset.i18n);
    });
    document.querySelectorAll("[data-i18n-html]").forEach((el) => {
      el.innerHTML = t(el.dataset.i18nHtml);
    });
    document.querySelectorAll("[data-i18n-label]").forEach((el) => {
      el.setAttribute("aria-label", t(el.dataset.i18nLabel));
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      el.setAttribute("placeholder", t(el.dataset.i18nPlaceholder));
    });
  }

  function bindLangToggle() {
    $("langToggle").addEventListener("click", () => {
      lang = isEn() ? "zh" : "en";
      localStorage.setItem(LANG_KEY, lang);
      renderAll();
    });
  }

  /* ============ 导航 ============ */
  function bindNav() {
    const toggle = $("navToggle");
    const links = $("navLinks");
    toggle.addEventListener("click", () => {
      const open = links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    links.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", () => {
        links.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      })
    );
  }

  function bindScrollProgress() {
    const bar = $("scrollProgressBar");
    const navA = [...document.querySelectorAll(".nav-links a[data-nav]")];
    const secs = navA.map((a) => document.querySelector(a.getAttribute("href"))).filter(Boolean);
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = `${max > 0 ? (window.scrollY / max) * 100 : 0}%`;
      let idx = 0;
      secs.forEach((s, i) => {
        if (s.getBoundingClientRect().top <= window.innerHeight * 0.38) idx = i;
      });
      navA.forEach((a, i) => a.classList.toggle("active", i === idx));
    };
    document.addEventListener("scroll", update, { passive: true });
    update();
  }

  function revealAll() {
    document.querySelectorAll(".reveal, .industry-card").forEach((el) => el.classList.add("in-view"));
  }

  function bindReveal() {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!("IntersectionObserver" in window) || reduce) { revealAll(); return; }
    document.documentElement.classList.add("js-anim");

    let fired = false;
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => {
        if (!e.isIntersecting) return;
        fired = true;
        e.target.classList.add("in-view");
        io.unobserve(e.target);
      });
    }, { threshold: 0.15 });
    document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

    // 兜底：某些环境（后台标签页、无合成的无头浏览器）观察器可能始终不回调
    setTimeout(() => { if (!fired) revealAll(); }, 2500);
  }

  /* ============ Hero 粒子 ============ */
  function bindHeroCanvas() {
    const canvas = $("heroCanvas");
    const ctx = canvas.getContext("2d");
    let w, h, ps, rafId = null, running = false;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const resize = () => {
      w = canvas.width = canvas.offsetWidth * dpr;
      h = canvas.height = canvas.offsetHeight * dpr;
    };
    const make = () => {
      const n = Math.min(70, Math.floor((w * h) / 48000));
      ps = Array.from({ length: n }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        r: Math.random() * 1.7 + 0.6,
        vx: (Math.random() - 0.5) * 0.22, vy: (Math.random() - 0.5) * 0.22,
      }));
    };
    const draw = (advance) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "rgba(16, 60, 92, .40)";
      ps.forEach((p) => {
        if (advance) {
          p.x += p.vx; p.y += p.vy;
          if (p.x < 0 || p.x > w) p.vx *= -1;
          if (p.y < 0 || p.y > h) p.vy *= -1;
        }
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * dpr, 0, Math.PI * 2); ctx.fill();
      });
      ctx.strokeStyle = "rgba(16, 60, 92, .09)";
      for (let i = 0; i < ps.length; i++)
        for (let j = i + 1; j < ps.length; j++) {
          const a = ps[i], b = ps[j];
          if (Math.hypot(a.x - b.x, a.y - b.y) < 125 * dpr) {
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
    };
    const tick = () => { draw(true); rafId = requestAnimationFrame(tick); };
    const start = () => { if (running || reduceMotion) return; running = true; tick(); };
    const stop = () => { running = false; if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; } };

    resize(); make(); draw(false);
    if (!reduceMotion) {
      // 首屏滚出视口后停止动画：省 CPU，也让页面能进入空闲状态
      const io = new IntersectionObserver((es) => es.forEach((e) => (e.isIntersecting ? start() : stop())), { threshold: 0 });
      io.observe(canvas);
    }
    window.addEventListener("resize", () => { resize(); make(); if (!running) draw(false); });
  }

  /* ============ Hero 指标 ============ */
  function renderHeroStats() {
    const box = $("heroStats");
    box.innerHTML = DATA.kpis.slice(0, 3).map((k) => `<div class="hero-stat">
        <b><span class="cnum" data-t="${k.value}" data-d="${k.decimals}">0</span><small>${pick(k, "suffix", "suffixEn")}</small></b>
        <span>${pick(k, "label", "labelEn")}</span></div>`).join("");

    const nums = [...box.querySelectorAll(".cnum")];
    const setFinal = (el) => { el.textContent = (+el.dataset.t).toFixed(+el.dataset.d); };
    if (!("IntersectionObserver" in window) ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      nums.forEach(setFinal); return;
    }
    const countUp = (el) => {
      const target = +el.dataset.t, dec = +el.dataset.d, t0 = performance.now();
      const step = (now) => {
        const p = Math.min(1, (now - t0) / 1300);
        el.textContent = (target * (1 - Math.pow(1 - p, 3))).toFixed(dec);
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    const done = new Set();
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => { if (e.isIntersecting) { done.add(e.target); countUp(e.target); io.unobserve(e.target); } });
    }, { threshold: 0.5 });
    nums.forEach((el) => io.observe(el));
    setTimeout(() => nums.forEach((el) => { if (!done.has(el)) setFinal(el); }), 2500);
  }

  /* ============ 时间线 ============ */
  function renderTimeline() {
    $("timeline").innerHTML = DATA.timeline.map((d) => `
      <div class="timeline-item" role="listitem">
        <div class="t-time">${d.time}</div>
        <h4>${pick(d, "title", "titleEn")}</h4>
        <p>${pick(d, "desc", "descEn")}</p>
      </div>`).join("");
  }

  /* =========================================================
   * 滚动叙事
   * ======================================================= */
  let storyStep = 0;

  function storyOption(step) {
    const m = DATA.macro;
    const A = cssVar("--accent"), A2 = cssVar("--accent-2"), A3 = cssVar("--accent-3");
    const border = cssVar("--card-border");
    const base = {
      textStyle: txt(), animationDuration: 700, animationEasing: "cubicOut",
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    };
    const axis = {
      grid: { left: 62, right: 62, top: 46, bottom: 34 },
      xAxis: { type: "category", data: m.years.map(String), axisLine: { lineStyle: { color: border } }, axisTick: { show: false } },
    };

    if (step === 0) {
      return { ...base, ...axis,
        legend: { data: [t("legendScale")], top: 4, textStyle: txt() },
        yAxis: { type: "value", name: t("axisYi"), splitLine: { lineStyle: { color: border } } },
        series: [{
          id: "scale", name: t("legendScale"), type: "bar", barWidth: "52%",
          data: m.scale, universalTransition: { enabled: true },
          itemStyle: { borderRadius: [6, 6, 0, 0], color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: A }, { offset: 1, color: A3 }]) },
          label: { show: true, position: "top", formatter: (p) => fmt(p.value), color: cssVar("--text"), fontSize: 11 },
        }] };
    }

    if (step === 1) {
      return { ...base, ...axis,
        legend: { data: [t("legendScale"), t("legendGrowth")], top: 4, textStyle: txt() },
        yAxis: [
          { type: "value", name: t("axisYi"), splitLine: { lineStyle: { color: border } } },
          { type: "value", name: t("axisGrowth"), min: 0, max: 40, splitLine: { show: false }, axisLabel: { formatter: "{value}%" } },
        ],
        series: [
          { id: "scale", name: t("legendScale"), type: "bar", barWidth: "46%", data: m.scale,
            universalTransition: { enabled: true },
            itemStyle: { borderRadius: [6, 6, 0, 0], color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: A }, { offset: 1, color: A3 }]) } },
          { id: "growth", name: t("legendGrowth"), type: "line", yAxisIndex: 1, smooth: true, symbolSize: 8,
            data: m.growth, lineStyle: { color: A2, width: 3 }, itemStyle: { color: A2 },
            label: { show: true, formatter: "{c}%", color: A2, fontSize: 11, position: "top" },
            markPoint: { symbolSize: 48, data: [{ coord: ["2025", m.growth[6]], value: t("markRebound") }],
              itemStyle: { color: "rgba(204,95,27,.18)" }, label: { color: A2, fontSize: 10, fontWeight: 700 } } },
        ] };
    }

    if (step === 2) {
      return { ...base, ...axis,
        legend: { data: [t("legendCompute")], top: 4, textStyle: txt() },
        yAxis: { type: "value", name: t("axisEflops"), splitLine: { lineStyle: { color: border } } },
        series: [{
          id: "scale", name: t("legendCompute"), type: "line", smooth: true, data: m.compute,
          universalTransition: { enabled: true }, symbolSize: 9,
          lineStyle: { color: A, width: 3 }, itemStyle: { color: A },
          areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: "rgba(10,134,168,.38)" }, { offset: 1, color: "rgba(10,134,168,.02)" }]) },
          label: { show: true, position: "top", formatter: (p) => fmt(p.value), color: cssVar("--text"), fontSize: 11 },
        }] };
    }

    if (step === 3) {
      return { ...base,
        tooltip: { trigger: "item", formatter: "{b}：{c}%" },
        legend: { bottom: 6, textStyle: txt() },
        color: [A, A2, A3, cssVar("--good"), cssVar("--warn"), cssVar("--text-faint")],
        series: [{
          id: "scale", name: t("patentTitle"), type: "pie",
          radius: ["38%", "64%"], center: ["50%", "46%"],
          data: m.patentShare.map((d) => ({ name: pick(d, "name", "en"), value: d.value })),
          universalTransition: { enabled: true },
          itemStyle: { borderColor: cssVar("--card"), borderWidth: 2 },
          label: { formatter: "{b}\n{c}%", color: cssVar("--text"), fontSize: 11 },
          emphasis: { scaleSize: 8 },
        }] };
    }

    const r = m.radar;
    return { ...base,
      tooltip: { trigger: "item" },
      legend: { bottom: 6, data: r.series.map((x) => pick(x, "name", "en")), textStyle: txt() },
      radar: {
        indicator: r.indicators.map((x) => ({ name: pick(x, "name", "en"), max: x.max })),
        center: ["50%", "47%"], radius: "62%",
        axisName: { color: cssVar("--text-dim"), fontSize: 11 },
        splitLine: { lineStyle: { color: border } },
        splitArea: { areaStyle: { color: ["transparent"] } },
        axisLine: { lineStyle: { color: border } },
      },
      series: [{ type: "radar", symbolSize: 5, data: [
        { value: r.series[0].value, name: pick(r.series[0], "name", "en"),
          lineStyle: { color: cssVar("--text-faint"), width: 2, type: "dashed" },
          itemStyle: { color: cssVar("--text-faint") }, areaStyle: { color: "rgba(113,126,150,.14)" } },
        { value: r.series[1].value, name: pick(r.series[1], "name", "en"),
          lineStyle: { color: A, width: 3 }, itemStyle: { color: A }, areaStyle: { color: "rgba(10,134,168,.22)" } },
      ] }] };
  }

  function renderStoryStep(step, force) {
    const c = charts.story;
    if (!c) return;
    if (!force && step === storyStep) return;
    storyStep = step;
    c.setOption(storyOption(step), { notMerge: true });
    $("storyBadge").textContent = pick(DATA.scrollSteps[step], "hint", "hintEn");
    $("storyStepNum").textContent = `${step + 1} / ${DATA.scrollSteps.length}`;
    document.querySelectorAll(".step").forEach((el, i) => el.classList.toggle("active", i === step));
  }

  let storyBound = false;
  function setupStory() {
    $("scrollySteps").innerHTML = DATA.scrollSteps.map((s, i) => `
      <div class="step${i === storyStep ? " active" : ""}" data-step="${i}">
        <div class="step-inner">
          <div class="step-num">STEP ${String(i + 1).padStart(2, "0")}</div>
          <h3>${pick(s, "title", "titleEn")}</h3>
          <p>${pick(s, "body", "bodyEn")}</p>
          <p class="step-hint">▸ ${pick(s, "hint", "hintEn")}</p>
        </div>
      </div>`).join("");

    initChart("story", $("storyChart"));
    renderStoryStep(storyStep, true);

    if (storyBound) return;   // 语言切换时不重复绑定观察器
    storyBound = true;

    const stepEls = () => [...document.querySelectorAll(".step")];
    let ioFired = false;
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (es) => es.forEach((e) => { if (e.isIntersecting) { ioFired = true; renderStoryStep(+e.target.dataset.step); } }),
        { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
      );
      stepEls().forEach((el) => io.observe(el));
    }
    // 兜底：观察器不回调时改用滚动位置推算当前步骤
    const fallback = () => {
      const mid = window.innerHeight / 2;
      let best = 0, bestDist = Infinity;
      stepEls().forEach((el, i) => {
        const r = el.getBoundingClientRect();
        const d = Math.abs((r.top + r.bottom) / 2 - mid);
        if (d < bestDist) { bestDist = d; best = i; }
      });
      renderStoryStep(best);
    };
    setTimeout(() => {
      if (ioFired) return;
      document.addEventListener("scroll", fallback, { passive: true });
      fallback();
    }, 2500);
  }

  /* =========================================================
   * 桑基图
   * ======================================================= */
  function renderSankey() {
    const c = initChart("sankey", $("sankeyChart"));
    const nameMap = {};
    DATA.sankey.nodes.forEach((n) => { nameMap[n.name] = pick(n, "name", "en"); });
    const pal = [cssVar("--accent"), cssVar("--accent-3"), cssVar("--accent-2"), cssVar("--good"), cssVar("--warn")];

    c.setOption({
      textStyle: txt(),
      tooltip: { trigger: "item", triggerOn: "mousemove",
        formatter: (p) => p.dataType === "edge"
          ? `${p.data.source} → ${p.data.target}<br/>${p.data.value}`
          : `<b>${p.name}</b>` },
      series: [{
        type: "sankey", left: 8, right: isEn() ? 150 : 110, top: 14, bottom: 14,
        nodeWidth: 14, nodeGap: 9, nodeAlign: "justify",
        emphasis: { focus: "adjacency" }, color: pal,
        lineStyle: { color: "gradient", opacity: 0.4, curveness: 0.5 },
        label: { color: cssVar("--text"), fontSize: 11 },
        itemStyle: { borderWidth: 0 },
        data: DATA.sankey.nodes.map((n) => ({ name: nameMap[n.name] })),
        links: DATA.sankey.links.map((l) => ({ source: nameMap[l.source], target: nameMap[l.target], value: l.value })),
      }],
    }, { notMerge: true });
  }

  /* =========================================================
   * 多视图联动
   * ======================================================= */
  const REGION_COLORS = {
    "长三角": "#0a86a8", "京津冀": "#cc5f1b", "粤港澳": "#4850c4",
    "中部": "#1b9460", "西部": "#a8780a", "东北": "#c2415f",
    "环渤海": "#7a5bd0", "东南": "#128c84",
  };

  const DIMS = [
    { key: "scale",   zh: "产业规模", en: "Size" },
    { key: "firms",   zh: "企业数",   en: "Firms" },
    { key: "compute", zh: "智能算力", en: "Computing" },
    { key: "patents", zh: "专利",     en: "Patents" },
    { key: "talent",  zh: "人才指数", en: "Talent" },
    { key: "growth",  zh: "增速",     en: "Growth" },
  ];
  const dimName = (d) => (isEn() ? d.en : d.zh);

  const link = {
    yearIdx: DATA.years.length - 1,
    selected: null,
    regions: new Set(),
    brushed: null,
    playing: false,
    timer: null,
  };

  const valueAt = (p) => p.series[link.yearIdx];

  function activeProvinces() {
    return DATA.provinces.filter((p, i) => {
      if (link.regions.size && !link.regions.has(p.region)) return false;
      if (link.brushed && !link.brushed.has(i)) return false;
      return true;
    });
  }

  function pushLinked() {
    renderMap(false); renderRank(false); renderScatter(false); renderDetail(); updateStatus();
  }
  function rebuildLinked() {
    link.brushed = null;
    renderMap(true); renderRank(true); renderParallel(); renderScatter(true); renderDetail(); updateStatus();
  }

  function updateStatus() {
    const act = activeProvinces();
    const parts = [t("statusAll", act.length)];
    if (link.regions.size) parts.push(t("statusRegion", [...link.regions].map(regionName).join(" / ")));
    if (link.brushed) parts.push(t("statusBrushed"));
    if (link.selected) {
      const p = DATA.provinces.find((x) => x.name === link.selected);
      parts.push(t("statusSelected", p ? provName(p) : link.selected));
    }
    $("filterStatus").textContent = parts.join("　|　");
  }

  function select(name) {
    link.selected = link.selected === name ? null : name;
    pushLinked();
  }

  /* ---- 地图 ---- */
  function mapSeriesData() {
    const act = new Set(activeProvinces().map((p) => p.name));
    return DATA.provinces.map((p) => {
      const on = act.has(p.name), sel = link.selected === p.name;
      return {
        name: p.name,   // 必须为中文，用于匹配 GeoJSON
        value: valueAt(p),
        itemStyle: sel
          ? { areaColor: cssVar("--accent-2"), borderColor: cssVar("--text"), borderWidth: 1.6 }
          : on ? {} : { areaColor: "rgba(120,134,160,.12)", opacity: 0.4 },
      };
    }).concat(DATA.mapExtra.map((e) => ({ ...e, itemStyle: { areaColor: "rgba(120,134,160,.12)" } })));
  }

  function renderMap(full) {
    const el = $("mapChart");
    if (!full && charts.map) {
      charts.map.setOption({ series: [{ data: mapSeriesData() }] });
      return;
    }
    const build = (geo) => {
      if (!echarts.getMap("china")) echarts.registerMap("china", geo);
      const c = initChart("map", el);
      c.setOption({
        textStyle: txt(),
        tooltip: { trigger: "item", formatter: (p) => {
          const prov = DATA.provinces.find((x) => x.name === p.name);
          if (!prov) return `${p.name}<br/>${t("tipNoData")}`;
          return `<b>${provName(prov)}</b>　<span style="opacity:.7">${regionName(prov.region)}</span><br/>
            ${t("tipScaleYear", DATA.years[link.yearIdx])}：${fmt(Math.round(valueAt(prov)))} ${t("tipUnitYi")}<br/>
            ${t("tipFirms")} ${prov.firms} ${t("tipFirmsUnit")}　${t("tipCompute")} ${prov.compute} EFLOPS<br/>
            <span style="opacity:.6">${t("tipClickHint")}</span>`;
        } },
        visualMap: {
          min: 0, max: 6500, left: 12, bottom: 12, calculable: true,
          text: [t("vmHigh"), t("vmLow")], textStyle: txt(), itemHeight: 110,
          inRange: { color: ["#dbeaf2", cssVar("--accent-3"), cssVar("--accent"), cssVar("--accent-2")] },
        },
        series: [{
          type: "map", map: "china", roam: true, scaleLimit: { min: 1, max: 5 },
          label: { show: false },
          itemStyle: { borderColor: "rgba(13,21,36,.18)", borderWidth: 0.6 },
          emphasis: { itemStyle: { areaColor: cssVar("--warn") }, label: { show: true, color: "#fff", fontSize: 10 } },
          selectedMode: false,
          data: mapSeriesData(),
        }],
      }, { notMerge: true });

      c.off("click");
      c.on("click", (p) => { if (DATA.provinces.some((x) => x.name === p.name)) select(p.name); });
    };

    if (chinaGeo) { build(chinaGeo); return; }
    fetch("./assets/vendor/china.json")
      .then((r) => r.json())
      .then((geo) => { chinaGeo = geo; build(geo); })
      .catch(() => {
        el.innerHTML = '<p style="padding:2rem;color:var(--text-faint)">地图数据加载失败 / Map data failed to load（assets/vendor/china.json）</p>';
      });
  }

  /* ---- 排行条形图 ---- */
  const rankTop = () => activeProvinces().slice().sort((a, b) => valueAt(b) - valueAt(a)).slice(0, 10).reverse();

  const rankSeriesData = (top) => top.map((p) => ({
    value: Math.round(valueAt(p)),
    itemStyle: {
      borderRadius: [0, 5, 5, 0],
      color: link.selected === p.name ? cssVar("--accent-2") : (REGION_COLORS[p.region] || cssVar("--accent")),
      opacity: link.selected && link.selected !== p.name ? 0.4 : 1,
    },
  }));

  function renderRank(full) {
    const top = rankTop();
    const bindClick = (c) => { c.off("click"); c.on("click", (p) => select(top[p.dataIndex].name)); };

    if (!full && charts.rank) {
      charts.rank.setOption({
        title: { text: t("rankTitle", DATA.years[link.yearIdx]) },
        yAxis: { data: top.map(provName) },
        series: [{ data: rankSeriesData(top) }],
      });
      bindClick(charts.rank);
      return;
    }

    const c = initChart("rank", $("rankChart"));
    c.setOption({
      textStyle: txt(),
      grid: { left: 6, right: 58, top: 30, bottom: 6, containLabel: true },
      title: { text: t("rankTitle", DATA.years[link.yearIdx]), left: 0, top: 0,
        textStyle: { fontSize: 13, color: cssVar("--text-dim"), fontWeight: 600 } },
      tooltip: { trigger: "item", formatter: (p) => `${p.name}：${fmt(Math.round(p.value))} ${t("tipUnitYi")}` },
      xAxis: { type: "value", show: false },
      yAxis: { type: "category", data: top.map(provName),
        axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { fontSize: 12, color: cssVar("--text-dim") } },
      series: [{ type: "bar", barWidth: "62%", data: rankSeriesData(top),
        label: { show: true, position: "right", formatter: (p) => fmt(p.value), fontSize: 11, color: cssVar("--text-dim") } }],
    }, { notMerge: true });
    bindClick(c);
  }

  /* ---- 平行坐标 ---- */
  function renderParallel() {
    const c = initChart("parallel", $("parallelChart"));
    const border = cssVar("--card-border");

    c.setOption({
      textStyle: txt(),
      tooltip: { trigger: "item", formatter: (p) => `<b>${p.name}</b>` },
      parallelAxis: DIMS.map((d, i) => {
        // 规模/企业数/专利跨越两三个数量级，用对数轴才看得出中小省份差异
        const logMin = { scale: 10, firms: 10, patents: 0.2 }[d.key];
        const ax = { dim: i, id: `pax${i}`, name: dimName(d),
          nameTextStyle: { color: cssVar("--text-dim"), fontSize: 12 },
          axisLine: { lineStyle: { color: border } },
          axisLabel: { color: cssVar("--text-faint"), fontSize: 10 } };
        if (logMin !== undefined) { ax.type = "log"; ax.min = logMin; }
        return ax;
      }),
      parallel: { left: 46, right: 56, top: 38, bottom: 24,
        parallelAxisDefault: { areaSelectStyle: { width: 16, color: cssVar("--accent"), opacity: 0.22 } } },
      series: [{
        type: "parallel", smooth: true, lineStyle: { width: 1.4, opacity: 0.55 },
        emphasis: { lineStyle: { width: 3, opacity: 1 } },
        data: DATA.provinces.map((p) => ({
          name: provName(p),
          value: DIMS.map((d) => p[d.key]),
          lineStyle: { color: REGION_COLORS[p.region] || cssVar("--accent") },
        })),
      }],
    }, { notMerge: true });

    // 刷选联动：用官方示例的 getRawIndicesByActiveState 读取激活的线，
    // 它已处理好多轴同时刷选的交集逻辑，比自行比对区间可靠
    c.off("axisareaselected");
    c.on("axisareaselected", () => {
      try {
        const s0 = c.getModel().getSeries()[0];
        const idx = s0.getRawIndicesByActiveState("active");
        link.brushed = idx && idx.length && idx.length < DATA.provinces.length ? new Set(idx) : null;
      } catch (err) {
        console.warn("平行坐标刷选状态读取失败，已忽略：", err);
        link.brushed = null;
      }
      pushLinked();
    });
  }

  /* ---- 气泡散点 ---- */
  function scatterSeriesData() {
    const act = new Set(activeProvinces().map((p) => p.name));
    return DATA.provinces.map((p) => {
      const on = act.has(p.name), sel = link.selected === p.name;
      const short = isEn() ? (p.en || p.name) : p.name.replace(/[省市]$|维吾尔自治区|壮族自治区|回族自治区|自治区/g, "");
      return {
        name: p.name, value: [p.scale, p.growth], prov: p,
        itemStyle: {
          color: REGION_COLORS[p.region] || cssVar("--accent"),
          opacity: sel ? 1 : on ? 0.75 : 0.12,
          borderColor: sel ? cssVar("--text") : "transparent",
          borderWidth: sel ? 2.4 : 0,
        },
        label: { show: sel || p.scale > 2000, position: "top", formatter: short,
          fontSize: 11, color: cssVar("--text-dim") },
      };
    });
  }

  function renderScatter(full) {
    if (!full && charts.scatter) {
      charts.scatter.setOption({ series: [{ data: scatterSeriesData() }] });
      return;
    }
    const c = initChart("scatter", $("scatterChart"));
    const border = cssVar("--card-border");
    const maxFirms = Math.max(...DATA.provinces.map((p) => p.firms));

    c.setOption({
      textStyle: txt(),
      grid: { left: 56, right: 24, top: 24, bottom: 48 },
      tooltip: { trigger: "item", formatter: (p) => {
        const d = p.data.prov;
        return `<b>${provName(d)}</b>　<span style="opacity:.7">${regionName(d.region)}</span><br/>
          ${fmt(d.scale)} ${t("tipUnitYi")}　${t("tipGrowth")} ${d.growth}%<br/>
          ${t("tipFirms")} ${d.firms}　${t("tipCompute")} ${d.compute} EFLOPS`;
      } },
      xAxis: { type: "log", name: t("scatterXName"), nameLocation: "middle", nameGap: 30,
        nameTextStyle: { color: cssVar("--text-faint"), fontSize: 11 }, min: 10, max: 8000,
        splitLine: { lineStyle: { color: border } }, axisLine: { lineStyle: { color: border } } },
      yAxis: { type: "value", name: t("scatterYName"), min: 10, max: 38,
        nameTextStyle: { color: cssVar("--text-faint"), fontSize: 11 },
        splitLine: { lineStyle: { color: border } }, axisLine: { lineStyle: { color: border } } },
      series: [{ type: "scatter",
        symbolSize: (v, p) => 8 + Math.sqrt(p.data.prov.firms / maxFirms) * 28,
        data: scatterSeriesData() }],
    }, { notMerge: true });

    c.off("click");
    c.on("click", (p) => select(p.data.name));
  }

  /* ---- 详情雷达 ---- */
  function renderDetail() {
    const body = $("detailBody");
    if (!link.selected) {
      body.innerHTML = `<p class="detail-empty">${t("detailEmpty")}</p>`;
      if (charts.detail) { charts.detail.dispose(); delete charts.detail; }
      return;
    }
    const p = DATA.provinces.find((x) => x.name === link.selected);
    if (!p) return;

    body.innerHTML = `
      <div>
        <p class="detail-name">${provName(p)}</p>
        <p class="detail-region">${regionName(p.region)}　· ${p.measured ? t("measuredNote") : t("estimatedNote")}</p>
        ${p.hub ? `<span class="detail-hub">⚡ ${pick(p, "hub", "hubEn")}</span>` : ""}
      </div>
      <div class="detail-radar" id="detailRadar"></div>
      <div class="detail-figs">
        <div class="detail-fig"><b>${fmt(p.scale)}</b><span>${t("figScale")}</span></div>
        <div class="detail-fig"><b>${p.compute}</b><span>${t("figCompute")}</span></div>
        <div class="detail-fig"><b>${p.growth}%</b><span>${t("figGrowth")}</span></div>
      </div>`;

    const maxes = {};
    DIMS.forEach((d) => { maxes[d.key] = Math.max(...DATA.provinces.map((x) => x[d.key])); });

    const c = initChart("detail", $("detailRadar"));
    const col = REGION_COLORS[p.region] || cssVar("--accent");
    c.setOption({
      textStyle: txt(),
      tooltip: { trigger: "item" },
      radar: {
        indicator: DIMS.map((d) => ({ name: dimName(d), max: 100 })),
        center: ["50%", "54%"], radius: "64%",
        axisName: { color: cssVar("--text-dim"), fontSize: 11 },
        splitLine: { lineStyle: { color: cssVar("--card-border") } },
        splitArea: { areaStyle: { color: ["transparent"] } },
        axisLine: { lineStyle: { color: cssVar("--card-border") } },
      },
      series: [{ type: "radar", symbolSize: 4, data: [{
        name: provName(p),
        value: DIMS.map((d) => Math.round((p[d.key] / maxes[d.key]) * 100)),
        lineStyle: { color: col, width: 2.5 }, itemStyle: { color: col },
        areaStyle: { color: col + "3d" },
      }] }],
    }, { notMerge: true });
  }

  /* ---- 控制条 ---- */
  let atlasBound = false;
  function renderAtlasControls() {
    const regions = [...new Set(DATA.provinces.map((p) => p.region))];
    $("regionGroup").innerHTML = `<label>${t("ctrlRegion")}</label>` +
      regions.map((r) => `<button class="region-chip${link.regions.has(r) ? " on" : ""}" type="button" data-region="${r}">${regionName(r)}</button>`).join("");
    $("playBtn").textContent = link.playing ? t("ctrlPause") : t("ctrlPlay");
    $("yearOut").textContent = DATA.years[link.yearIdx];

    if (atlasBound) return;
    atlasBound = true;

    $("regionGroup").addEventListener("click", (e) => {
      const b = e.target.closest("[data-region]");
      if (!b) return;
      const r = b.dataset.region;
      if (link.regions.has(r)) link.regions.delete(r); else link.regions.add(r);
      b.classList.toggle("on", link.regions.has(r));
      pushLinked();
    });

    const slider = $("yearSlider"), out = $("yearOut");
    slider.max = String(DATA.years.length - 1);
    slider.value = String(link.yearIdx);
    slider.addEventListener("input", () => {
      link.yearIdx = +slider.value;
      out.textContent = DATA.years[link.yearIdx];
      renderMap(false); renderRank(false); updateStatus();
    });

    const playBtn = $("playBtn");
    const stop = () => {
      link.playing = false; clearInterval(link.timer); link.timer = null;
      playBtn.textContent = t("ctrlPlay");
    };
    playBtn.addEventListener("click", () => {
      if (link.playing) { stop(); return; }
      link.playing = true; playBtn.textContent = t("ctrlPause");
      link.yearIdx = 0;
      link.timer = setInterval(() => {
        slider.value = String(link.yearIdx);
        out.textContent = DATA.years[link.yearIdx];
        renderMap(false); renderRank(false); updateStatus();
        if (link.yearIdx >= DATA.years.length - 1) { stop(); return; }
        link.yearIdx += 1;
      }, 900);
    });

    $("resetBtn").addEventListener("click", () => {
      stop();
      link.selected = null; link.regions.clear(); link.brushed = null;
      link.yearIdx = DATA.years.length - 1;
      slider.value = String(link.yearIdx);
      out.textContent = DATA.years[link.yearIdx];
      document.querySelectorAll(".region-chip.on").forEach((b) => b.classList.remove("on"));
      renderParallel();
      pushLinked();
    });
  }

  /* =========================================================
   * 旭日图
   * ======================================================= */
  function sceneEmptyPanel() {
    $("scenePanel").innerHTML = `<h3>${t("scenePanelTitle")}</h3><p class="scene-empty">${t("sceneEmpty")}</p>`;
  }

  function renderSunburst() {
    const c = initChart("sunburst", $("sunburstChart"));
    const pal = [cssVar("--accent"), cssVar("--accent-2"), cssVar("--good"), cssVar("--accent-3"), cssVar("--warn")];
    const localize = (n) => ({
      name: pick(n, "name", "en"),
      value: n.value,
      desc: pick(n, "desc", "descEn"),
      children: n.children ? n.children.map(localize) : undefined,
    });

    c.setOption({
      textStyle: txt(),
      tooltip: { trigger: "item", formatter: (p) => `<b>${p.name}</b>${p.data.desc ? "<br/>" + p.data.desc : ""}` },
      color: pal,
      series: [{
        type: "sunburst",
        data: DATA.penetration.children.map(localize),
        radius: ["16%", "92%"], center: ["50%", "50%"],
        nodeClick: "rootToNode", sort: null,
        emphasis: { focus: "ancestor" },
        levels: [
          {},
          { r0: "16%", r: "48%",
            itemStyle: { borderWidth: 2, borderColor: cssVar("--card") },
            label: { rotate: "tangential", fontSize: 12, fontWeight: 700, color: "#fff" } },
          { r0: "49%", r: "88%",
            itemStyle: { borderWidth: 1.5, borderColor: cssVar("--card") },
            label: { align: "right", fontSize: 10, color: cssVar("--text") } },
        ],
      }],
    }, { notMerge: true });

    sceneEmptyPanel();
    c.off("click");
    c.on("click", (p) => {
      const parent = p.treePathInfo && p.treePathInfo.length > 1
        ? p.treePathInfo[p.treePathInfo.length - 2].name : "";
      $("scenePanel").innerHTML = `
        <h3>${t("scenePanelTitle")}</h3>
        <p class="scene-title">${p.name}</p>
        ${parent && parent !== p.name ? `<p class="scene-parent">${t("sceneParent", parent)}</p>` : ""}
        <p class="scene-desc">${p.data.desc || t("sceneDefault")}</p>
        ${p.data.value ? `<p class="scene-val">${t("sceneVal", p.data.value)}</p>` : ""}`;
    });
  }

  /* =========================================================
   * 斜率图
   * ======================================================= */
  function renderSlope() {
    const c = initChart("slope", $("slopeChart"));
    const FIELD_COLORS = {
      "医疗": cssVar("--accent"), "金融": cssVar("--accent-2"),
      "农业": cssVar("--good"), "制造": cssVar("--accent-3"),
    };
    const FIELD_EN = { "医疗": "Healthcare", "金融": "Finance", "农业": "Agriculture", "制造": "Manufacturing" };
    const fieldLabel = (f) => (isEn() ? FIELD_EN[f] : f);
    const border = cssVar("--card-border");
    const items = DATA.efficiency.items;

    c.setOption({
      textStyle: txt(),
      grid: { left: 62, right: isEn() ? 210 : 165, top: 36, bottom: 34 },
      tooltip: { trigger: "item", formatter: (p) => {
        const it = items.find((x) => pick(x, "name", "nameEn") === p.seriesName);
        return `<b>${p.seriesName}</b><br/>${t("slopeTipIndex")}: ${p.value}<br/>${t("slopeTipReal")}: ${it ? pick(it, "raw", "rawEn") : ""}`;
      } },
      legend: { top: 2, textStyle: txt(), data: Object.keys(FIELD_COLORS).map(fieldLabel),
        selectedMode: false, itemWidth: 12, itemHeight: 8 },
      xAxis: {
        // 类目轴的 boundaryGap 只接受布尔值；true 时两类目落在 25% / 75% 处
        type: "category", data: [t("slopeBefore"), t("slopeAfter")], boundaryGap: true,
        axisLine: { lineStyle: { color: border } }, axisTick: { show: false },
        axisLabel: { fontSize: 13, fontWeight: 600, color: cssVar("--text-dim") },
      },
      yAxis: {
        // min 略低于最小值 1，避免最低点被压在轴线上
        type: "log", min: 0.7, max: 140, name: t("slopeYName"),
        nameTextStyle: { color: cssVar("--text-faint"), fontSize: 11 },
        splitLine: { lineStyle: { color: border, type: "dashed" } },
        axisLine: { lineStyle: { color: border } },
      },
      series: [
        // 仅用于图例配色说明的占位系列
        ...Object.entries(FIELD_COLORS).map(([f, col]) => ({
          name: fieldLabel(f), type: "line", data: [], itemStyle: { color: col }, lineStyle: { color: col },
        })),
        ...items.map((it) => ({
          name: pick(it, "name", "nameEn"), type: "line", symbolSize: 9,
          data: [it.before, it.after],
          lineStyle: { color: FIELD_COLORS[it.field], width: 2.2, opacity: 0.85 },
          itemStyle: { color: FIELD_COLORS[it.field] },
          endLabel: { show: true, formatter: `${pick(it, "name", "nameEn")}　${pick(it, "raw", "rawEn")}`,
            fontSize: 11, color: cssVar("--text-dim"), distance: 8 },
          emphasis: { lineStyle: { width: 4, opacity: 1 }, focus: "series" },
        })),
      ],
    }, { notMerge: true });
  }

  /* =========================================================
   * 行业案例卡
   * ======================================================= */
  function renderIndustries() {
    const grid = $("industryGrid");
    grid.innerHTML = DATA.industries.map((d) => {
      const h = d.headline, he = d.headlineEn || {};
      const unit = isEn() && he.unit != null ? he.unit : h.unit;
      const metric = isEn() && he.metric != null ? he.metric : h.metric;
      const fromL = isEn() && he.fromLabel != null ? he.fromLabel : h.fromLabel;
      const toL = isEn() && he.toLabel != null ? he.toLabel : h.toLabel;
      const chips = isEn() && d.chipsEn ? d.chipsEn : d.chips;
      return `
      <article class="industry-card">
        <div class="industry-head">
          <span class="industry-icon">${d.icon}</span>
          <span class="industry-tag">${pick(d, "tag", "tagEn")}</span>
        </div>
        <h3>${pick(d, "title", "titleEn")}</h3>
        <div class="industry-headline">
          <span class="hl-from">${h.from}</span>
          <span class="hl-arrow">→</span>
          <span class="hl-to">${h.to}</span>
          <span class="hl-unit">${unit}</span>
          <span class="hl-metric">${metric}（${fromL} → ${toL}）</span>
        </div>
        <p class="industry-desc">${pick(d, "desc", "descEn")}</p>
        <div class="chip-row">${chips.map((ch) => `<span class="chip">${ch}</span>`).join("")}</div>
      </article>`;
    }).join("");

    const cards = [...grid.querySelectorAll(".industry-card")];
    if (!("IntersectionObserver" in window)) { cards.forEach((c) => c.classList.add("in-view")); return; }
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in-view"); io.unobserve(e.target); } }),
      { threshold: 0.12 }
    );
    cards.forEach((el) => io.observe(el));
    setTimeout(() => cards.forEach((c) => c.classList.add("in-view")), 2500);
  }

  /* =========================================================
   * 力导向图谱
   * ======================================================= */
  function renderGraph() {
    const c = initChart("graph", $("graphChart"));
    const g = DATA.graph;
    const nameMap = {};
    g.nodes.forEach((n) => { nameMap[n.name] = pick(n, "name", "en"); });
    const pal = [cssVar("--accent"), cssVar("--accent-3"), cssVar("--warn"), cssVar("--good"), cssVar("--accent-2")];

    c.setOption({
      textStyle: txt(),
      tooltip: { formatter: (p) => (p.dataType === "node" ? `<b>${p.name}</b>` : `${p.data.source} → ${p.data.target}`) },
      legend: { data: g.categories.map((x) => pick(x, "name", "en")), top: 2, textStyle: txt(), itemWidth: 10, itemHeight: 10 },
      series: [{
        type: "graph", layout: "force", roam: true, draggable: true,
        categories: g.categories.map((x) => ({ name: pick(x, "name", "en") })),
        color: pal,
        label: { show: true, color: cssVar("--text"), fontSize: 12, position: "right" },
        edgeSymbol: ["none", "arrow"], edgeSymbolSize: 7,
        lineStyle: { color: "source", curveness: 0.14, opacity: 0.45 },
        emphasis: { focus: "adjacency", lineStyle: { width: 3, opacity: 1 } },
        force: { repulsion: 300, edgeLength: [80, 160], gravity: 0.09, friction: 0.12 },
        data: g.nodes.map((n) => ({ name: nameMap[n.name], symbolSize: n.symbolSize, category: n.category })),
        links: g.links.map((l) => ({ source: nameMap[l.source], target: nameMap[l.target] })),
      }],
    }, { notMerge: true });
  }

  let graphSearchBound = false;
  function bindGraphSearch() {
    if (graphSearchBound) return;
    graphSearchBound = true;
    $("graphSearch").addEventListener("input", (e) => {
      const q = e.target.value.trim();
      const c = charts.graph;
      if (!c) return;
      c.dispatchAction({ type: "downplay", seriesIndex: 0 });
      if (!q) return;
      const names = DATA.graph.nodes.map((n) => pick(n, "name", "en"));
      const idx = names.findIndex((n) => n.toLowerCase().includes(q.toLowerCase()));
      if (idx >= 0) {
        c.dispatchAction({ type: "highlight", seriesIndex: 0, dataIndex: idx });
        c.dispatchAction({ type: "showTip", seriesIndex: 0, dataIndex: idx });
      }
    });
  }

  /* =========================================================
   * 展望 / 页脚
   * ======================================================= */
  function renderOutlook() {
    const o = DATA.outlook;
    $("outlookNow").textContent = t("outlookNow");
    $("outlookTarget").textContent = t("outlookTarget");
    const fill = () => { $("outlookFill").style.width = `${(o.current / o.target) * 100}%`; };
    if (!("IntersectionObserver" in window)) { fill(); return; }
    let done = false;
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => { if (e.isIntersecting) { done = true; fill(); io.unobserve(e.target); } });
    }, { threshold: 0.4 });
    io.observe($("outlookBar"));
    setTimeout(() => { if (!done) fill(); }, 2500);
  }

  const METHODS = [
    { zh: ["柱状图 / 柱线组合图", "用长度编码数量，叠加折线表达第二指标（双轴）"], en: ["Bar & combo chart", "Length encodes quantity; a line adds a second metric on a dual axis"] },
    { zh: ["面积图", "强调量级累积与增长的连续性"], en: ["Area chart", "Emphasises accumulation and continuity of growth"] },
    { zh: ["环形图", "用角度编码构成占比，适合少量类别"], en: ["Donut chart", "Angle encodes share; suited to few categories"] },
    { zh: ["雷达图", "多维度轮廓对比，适合看整体形状变化"], en: ["Radar chart", "Compares multidimensional profiles at a glance"] },
    { zh: ["桑基图 Sankey", "用连线宽度编码流量，表达多级流转关系"], en: ["Sankey diagram", "Link width encodes volume across multi-stage flows"] },
    { zh: ["分级统计地图", "用颜色明度编码地理单元的数值高低"], en: ["Choropleth map", "Lightness encodes value across geographic units"] },
    { zh: ["平行坐标图", "六维数据同屏，支持在任意轴上刷选过滤"], en: ["Parallel coordinates", "Six dimensions at once, brushable on any axis"] },
    { zh: ["气泡散点图", "位置+面积+颜色三重编码，一图看四个变量"], en: ["Bubble scatter", "Position, area and colour encode four variables at once"] },
    { zh: ["旭日图 Sunburst", "层级结构可视化，支持逐层下钻"], en: ["Sunburst chart", "Hierarchy visualisation with level-by-level drill-down"] },
    { zh: ["斜率图 Slope Chart", "用斜率直观编码前后变化的幅度"], en: ["Slope chart", "Slope directly encodes magnitude of before/after change"] },
    { zh: ["力导向图", "表达节点间的拓扑关系与传导路径"], en: ["Force-directed graph", "Shows topology and transmission paths between nodes"] },
    { zh: ["多视图联动", "Brushing & Linking：多图共享选择状态并同步响应"], en: ["Brushing & linking", "Multiple views share one selection state and respond in sync"] },
  ];

  function renderFooter() {
    $("methodSummary").textContent = t("methodSummary", METHODS.length);
    $("methodGrid").innerHTML = METHODS.map((m) => {
      const [n, d] = isEn() ? m.en : m.zh;
      return `<div class="method-item"><b>${n}</b><span>${d}</span></div>`;
    }).join("");
    $("dataNote").textContent = pick(DATA.meta, "note", "noteEn");
    $("sourceList").innerHTML = DATA.sources
      .map((s) => `<li><a href="${s.url}" target="_blank" rel="noopener">${s.text}</a></li>`).join("");
  }

  /* ============ resize ============ */
  function bindResize() {
    let timer;
    window.addEventListener("resize", () => {
      clearTimeout(timer);
      timer = setTimeout(() => Object.values(charts).forEach((c) => c && c.resize()), 160);
    });
  }

  /* ============ 渲染全部（首次 + 语言切换） ============ */
  function renderAll() {
    applyStaticCopy();
    renderHeroStats();
    renderTimeline();
    setupStory();
    renderSankey();
    renderAtlasControls();
    rebuildLinked();
    renderSunburst();
    renderSlope();
    renderIndustries();
    renderGraph();
    renderOutlook();
    renderFooter();
  }

  function init() {
    bindLangToggle();
    bindNav();
    bindScrollProgress();
    bindHeroCanvas();
    renderAll();
    bindGraphSearch();
    bindReveal();
    bindResize();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
