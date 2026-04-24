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
      case "prices":      html = Views.prices(); break;
      case "devices":     html = Views.devices(r); break;
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
    render(state.view);
  }

  function resetInputs(){
    const D = DEFAULT_PARAMS;
    const set = (id,v)=>{ const el=document.getElementById(id); if(el) el.value = v; };
    set("p_energy",D.energy); set("p_duration",D.duration); set("p_power",D.power);
    set("p_mileage_price",D.mileage_price); set("p_perf_max",D.perf_max); set("p_cap_subsidy",D.cap_subsidy);
    set("p_calls",D.calls); set("p_mileage_mw",D.mileage_mw); set("p_k",D.k);
    set("p_capex_equip",D.capex_equip); set("p_capex_epc",D.capex_epc); set("p_opex",D.opex);
    set("p_eff",D.eff); set("p_degrade",D.degrade);
    set("p_discount",D.discount); set("p_vat",D.vat); set("p_tax",D.tax); set("p_life",D.life); set("p_build",D.build);
    recalc();
  }

  function exportReport(){
    const r = state.result; if(!r) return;
    const rows = [
      ["山西独立储能二次调频收益测算报告",""],
      ["生成时间", new Date().toLocaleString("zh-CN")],
      ["",""],
      ["【项目参数】",""],
      ["储能容量（MWh）", r.inputs.energy],
      ["额定功率（MW）", r.inputs.power],
      ["储能时长（h）", r.inputs.duration],
      ["【收益结果】",""],
      ["年收益含税（万元）", r.revIncTax.toFixed(2)],
      ["年收益税后（万元）", r.revTax.toFixed(2)],
      ["调频里程收益（万元）", r.mileageRevenue.toFixed(2)],
      ["容量补偿收益（万元）", r.capRevenue.toFixed(2)],
      ["年调频里程电量（万kWh）", r.mileageYearWkwh.toFixed(2)],
      ["【财务指标】",""],
      ["总投资（万元）", r.totalCapex.toFixed(2)],
      ["投资回收期（年）", r.payback? r.payback.toFixed(2):"—"],
      ["IRR（%）", (r.irr*100).toFixed(2)],
      ["NPV（万元）", r.npv.toFixed(2)],
      ["LCOE（元/kWh）", r.lcoe.toFixed(3)],
    ];
    const csv = "\ufeff" + rows.map(x=>x.join(",")).join("\n");
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

    recalc();
  });
})();
