/* ===========================================================
   应用控制 —— 路由、事件、刷新
   =========================================================== */
(function(){
  const state = { view:"overview", result:null };

  const VIEW_META = {
    overview:   { title:"收益测算总览",        sub:"山西独立储能二次调频项目收益测算与分析" },
    params:     { title:"参数输入",           sub:"项目基础参数 · 市场参数 · 成本与财务参数" },
    calc:       { title:"收益测算",           sub:"基于山西 2025 细则口径的收益测算" },
    hourly:     { title:"小时收益明细",        sub:"山西 5 时段分时段收益分布" },
    daily:      { title:"日收益明细",          sub:"近 30 日运行收益样本" },
    monthly:    { title:"月度收益分析",        sub:"全年 12 个月收益分布与明细" },
    mileage:    { title:"调频电量分析",        sub:"月度调频里程电量分布" },
    soc:        { title:"SOC 运行分析",        sub:"典型日 SOC 曲线与循环统计" },
    performance:{ title:"性能指标分析",        sub:"K1/K2/K3 性能系数与行业对比" },
    cashflow:   { title:"现金流分析",          sub:"全生命周期现金流与年度明细" },
    payback:    { title:"投资回收期",          sub:"累计现金流、IRR 与 NPV" },
    sensitivity:{ title:"敏感性分析",          sub:"单因素 ± 扰动与双因素热力图" },
    prices:     { title:"电价与补偿标准",      sub:"山西二次调频市场公开价格与补偿规则" },
    devices:    { title:"设备参数",            sub:"储能系统技术参数与 CAPEX 构成" },
    policy:     { title:"政策与计算方法",      sub:"政策框架、出清与结算机制、计算模型" },
    checks:     { title:"勾稽关系校验",        sub:"全平台输入→输出的双向验证与公式一致性" },
  };

  function render(view){
    state.view = view;
    const r = state.result;
    const meta = VIEW_META[view] || VIEW_META.overview;
    document.getElementById("viewTitle").textContent = meta.title;
    document.getElementById("viewSub").textContent   = meta.sub;

    // 切换激活态
    document.querySelectorAll(".nav-item").forEach(el=>{
      el.classList.toggle("active", el.dataset.view === view);
    });

    Charts.destroyAll();
    const content = document.getElementById("content");

    let html = "";
    switch(view){
      case "overview":    html = Views.overview(r); break;
      case "monthly":     html = Views.monthly(r); break;
      case "hourly":      html = Views.hourly(r); break;
      case "daily":       html = Views.daily(r); break;
      case "cashflow":    html = Views.cashflow(r); break;
      case "sensitivity": html = Views.sensitivity(r); break;
      case "soc":         html = Views.socView(r); break;
      case "performance": html = Views.perfView(r); break;
      case "mileage":     html = Views.mileageView(r); break;
      case "payback":     html = Views.payback(r); break;
      case "prices":      html = Views.prices(r); break;
      case "devices":     html = Views.devices(r); break;
      case "checks":      html = Views.checksView(r); break;
      case "policy":
      case "params":
      case "calc":        html = Views.policy(); break;
      default:            html = Views.overview(r);
    }
    content.innerHTML = html;

    // 绘图
    setTimeout(()=>{
      switch(view){
        case "overview":
          Charts.donut(r); Charts.monthly(r,"chart-monthly"); Charts.cashflow(r,"chart-cashflow"); break;
        case "monthly":     Charts.monthly(r,"chart-monthly-big"); break;
        case "hourly":      Charts.period(r); break;
        case "daily":       Charts.daily(r); break;
        case "cashflow":    Charts.cashflow(r,"chart-cashflow-big"); break;
        case "sensitivity": Charts.sensitivity(r); break;
        case "soc":         Charts.soc(); break;
        case "performance": Charts.perf(); break;
        case "mileage":     Charts.mileage(r); break;
        case "payback":     Charts.payback(r); break;
      }
    }, 30);
  }

  function recalc(){
    const p = Calculator.readInputs();
    state.result = Calculator.run(p);
    updateMiniIndicators(state.result);
    render(state.view);
  }

  function updateMiniIndicators(r){
    const setText = (id,v)=>{ const el=document.getElementById(id); if(el) el.textContent = v; };
    setText("v_K_real",   r.K_real.toFixed(3));
    setText("v_K_settle", r.K_settle.toFixed(3));
    const mini = document.getElementById("checkMini");
    if(mini){
      const ok = r.checks.filter(c=>c.ok).length, total = r.checks.length;
      mini.textContent = `勾稽 ${ok}/${total} 通过`;
      mini.classList.toggle("ok",  ok===total);
      mini.classList.toggle("fail", ok<total);
    }
  }

  function resetInputs(){
    Object.entries(DEFAULT_PARAMS).forEach(([k,v])=>{
      const el = document.getElementById("p_"+k);
      if(el) el.value = v;
    });
    recalc();
  }

  function exportReport(){
    const r = state.result; if(!r) return;
    const periodRows = r.periods.map(pd => [
      `【时段】${pd.name} ${pd.type}`,
      `申报价=${pd.bid}元/kWh, 中标容量比=${(pd.q*100).toFixed(1)}%, 里程电量=${pd.mileage_Wkwh.toFixed(2)}万kWh, 里程收益=${pd.mileage_revenue.toFixed(2)}万元`
    ]);
    const checkRows = r.checks.map(c => [
      `【勾稽】${c.name}`,
      `${c.ok?"✓":"✗"}  左=${typeof c.left==="number"?c.left.toFixed(4):c.left}, 右=${typeof c.right==="number"?c.right.toFixed(4):c.right} ${c.unit||""}`
    ]);
    const rows = [
      ["山西独立储能二次调频收益测算报告",""],
      ["生成时间", new Date().toLocaleString("zh-CN")],
      ["",""],
      ["【项目参数】",""],
      ["储能容量（MWh）", r.inputs.energy],
      ["额定功率（MW）", r.inputs.power],
      ["储能时长（h）", r.inputs.duration],
      ["充放电效率 η", r.inputs.eff],
      ["K_real (K1·K2·K3)", r.K_real.toFixed(3)],
      ["K_settle (β·λ·K_real)", r.K_settle.toFixed(3)],
      ["",""],
      ["【5时段明细】",""],
      ...periodRows,
      ["",""],
      ["【收益结果】",""],
      ["年收益含税（万元）", r.rev_incl_tax.toFixed(2)],
      ["年收益不含税（万元）", r.rev_excl_tax.toFixed(2)],
      ["里程收益 R_mileage（万元）", r.R_mileage.toFixed(2)],
      ["容量补偿 R_cap（万元）", r.R_cap.toFixed(2)],
      ["量价补偿 C_es（万元）", r.R_ces.toFixed(2)],
      ["考核扣款（万元）", r.penalty.toFixed(2)],
      ["年调频里程电量（万kWh）", r.mileage_year_Wkwh.toFixed(2)],
      ["",""],
      ["【财务指标】",""],
      ["总投资（万元）", r.total_capex.toFixed(2)],
      ["单位 CAPEX（元/Wh）", r.capex_per_wh.toFixed(2)],
      ["年运维成本（万元）", r.opex_year.toFixed(2)],
      ["投资回收期（年）", r.payback? r.payback.toFixed(2):"—"],
      ["IRR（%）", (r.irr*100).toFixed(2)],
      ["NPV（万元）", r.npv.toFixed(2)],
      ["LCOE（元/kWh）", r.lcoe.toFixed(3)],
      ["",""],
      ["【勾稽关系校验】",""],
      ...checkRows,
    ];
    const csv = "\ufeff" + rows.map(x=>x.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv],{type:"text/csv;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "山西二次调频收益测算报告.csv";
    a.click(); URL.revokeObjectURL(url);
  }

  // ---- 绑定 ----
  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".nav-item[data-view]").forEach(el=>{
      el.addEventListener("click", e=>{ e.preventDefault(); render(el.dataset.view); });
    });
    document.getElementById("btnCalc").addEventListener("click", recalc);
    document.getElementById("btnReset").addEventListener("click", resetInputs);
    document.getElementById("btnExport").addEventListener("click", exportReport);
    document.getElementById("btnTheme").addEventListener("click", ()=>{
      const cur = document.documentElement.getAttribute("data-theme");
      document.documentElement.setAttribute("data-theme", cur==="dark"?"":"dark");
      recalc();
    });

    // 输入自动重算（防抖）
    let timer;
    document.querySelectorAll(".panel input, .panel select").forEach(el=>{
      el.addEventListener("input", ()=>{ clearTimeout(timer); timer = setTimeout(recalc, 400); });
    });

    // 面板可折叠
    document.querySelectorAll(".expandable").forEach(h=>{
      h.style.cursor = "pointer";
      h.addEventListener("click", ()=>{
        const targetId = h.dataset.target;
        const tgt = targetId && document.getElementById(targetId);
        if(!tgt) return;
        const open = tgt.style.display !== "none";
        tgt.style.display = open ? "none" : "";
        const arrow = h.querySelector(".arrow");
        if(arrow) arrow.textContent = open ? "▸" : "▾";
      });
    });

    recalc();
  });
})();
