/* ===========================================================
   视图渲染 —— 生成各模块 HTML
   =========================================================== */
const Views = (() => {

  const fmt = (n, d=2) => (n==null||!isFinite(n)) ? "-" :
    Number(n).toLocaleString("zh-CN",{minimumFractionDigits:d,maximumFractionDigits:d});
  const pct = (n, d=2) => (n==null||!isFinite(n)) ? "-" : (n*100).toFixed(d)+" %";

  // --------- 总览 ---------
  function overview(r){
    const kpis = `
      <div class="kpis">
        <div class="kpi k1">
          <div class="label">年收益（含税）</div>
          <div class="value">${fmt(r.revIncTax)}<span class="unit">万元</span></div>
          <div class="sub">税后：${fmt(r.revTax)} 万元</div>
          <div class="icon">📊</div>
        </div>
        <div class="kpi k2">
          <div class="label">年均调频里程电量</div>
          <div class="value">${fmt(r.mileageYearWkwh)}<span class="unit">万kWh</span></div>
          <div class="sub">日均：${fmt(r.mileageYearWkwh/365)} 万kWh</div>
          <div class="icon">⚡</div>
        </div>
        <div class="kpi k3">
          <div class="label">年均调频里程收益</div>
          <div class="value">${fmt(r.mileageRevenue)}<span class="unit">万元</span></div>
          <div class="sub">占总收益 ${pct(r.mileageRevenue/r.revIncTax)}</div>
          <div class="icon">💰</div>
        </div>
        <div class="kpi k4">
          <div class="label">投资回收期（含税）</div>
          <div class="value">${r.payback? fmt(r.payback,2):"—"}<span class="unit">年</span></div>
          <div class="sub">静态回收期</div>
          <div class="icon">🧭</div>
        </div>
        <div class="kpi k5">
          <div class="label">IRR（税后）</div>
          <div class="value">${pct(r.irr)}</div>
          <div class="sub">内部收益率</div>
          <div class="icon">📈</div>
        </div>
        <div class="kpi k6">
          <div class="label">项目净现值（税后）</div>
          <div class="value">${fmt(r.npv)}<span class="unit">万元</span></div>
          <div class="sub">折现率 ${(r.inputs.discount*100).toFixed(2)}%</div>
          <div class="icon">💎</div>
        </div>
      </div>
    `;

    const row1 = `
      <div class="row row-3">
        <div class="card">
          <div class="card-header">
            <div class="card-title">收益构成<small>（年）</small></div>
            <span class="card-sub">ⓘ</span>
          </div>
          <div class="donut-wrap">
            <div class="donut-outer">
              <canvas id="chart-donut"></canvas>
              <div class="donut-center">
                <div class="v">${fmt(r.revIncTax,2)}</div>
                <div class="l">年收益（含税）</div>
              </div>
            </div>
            <div class="legend">
              <div class="legend-row"><span class="legend-dot" style="background:#3b82f6"></span>调频里程收益 <b>${fmt(r.mileageRevenue)}</b> 万元 (${pct(r.mileageRevenue/r.revIncTax)})</div>
              <div class="legend-row"><span class="legend-dot" style="background:#10b981"></span>容量补偿收益 <b>${fmt(r.capRevenue)}</b> 万元 (${pct(r.capRevenue/r.revIncTax)})</div>
              <div class="legend-row"><span class="legend-dot" style="background:#f59e0b"></span>其他收益 <b>${fmt(Math.max(0,r.perfBonus))}</b> 万元 (${pct(Math.max(0,r.perfBonus)/r.revIncTax)})</div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <div class="card-title">月度收益趋势<small>（含税）</small></div>
            <div class="card-tabs"><span class="on">万元</span><span>万元/年</span></div>
          </div>
          <div class="chart-wrap"><canvas id="chart-monthly"></canvas></div>
        </div>

        <div class="card">
          <div class="card-header">
            <div class="card-title">年现金流<small>（万元）</small></div>
            <span class="card-sub">ⓘ</span>
          </div>
          <div class="chart-wrap"><canvas id="chart-cashflow"></canvas></div>
        </div>
      </div>
    `;

    const row2 = `
      <div class="row row-2">
        <div class="card">
          <div class="card-header"><div class="card-title">关键运行指标<small>（年）</small></div></div>
          <div class="kv-grid">
            <table class="kv-table">
              <tr><th>指标</th><th class="num">数值</th></tr>
              <tr><td>调频里程电量（万kWh）</td><td>${fmt(r.run_metrics.mileage_year_kwh)}</td></tr>
              <tr><td>调频里程收益（万元）</td><td>${fmt(r.mileageRevenue)}</td></tr>
              <tr><td>等效满充满放次数（次/年）</td><td>${fmt(r.run_metrics.equiv_full_cycles)}</td></tr>
              <tr><td>有效调频里程比例</td><td>${pct(r.run_metrics.effective_ratio)}</td></tr>
              <tr><td>SOC运行区间</td><td>${r.run_metrics.soc_range}</td></tr>
              <tr><td>可用率</td><td>${pct(r.run_metrics.availability)}</td></tr>
            </table>
            <table class="kv-table">
              <tr><th>指标</th><th class="num">数值</th></tr>
              <tr><td>调频里程性能指标合格率</td><td>${pct(r.run_metrics.qualified_rate)}</td></tr>
              <tr><td>响应时间达标率</td><td>${pct(r.run_metrics.response_rate)}</td></tr>
              <tr><td>里程率 (%Pn)</td><td>${pct(r.run_metrics.performance_Pn)}</td></tr>
              <tr><td>日均调频里程电量（万kWh）</td><td>${fmt(r.run_metrics.mileage_day_kwh)}</td></tr>
              <tr><td>日均收益（万元）</td><td>${fmt(r.run_metrics.daily_revenue)}</td></tr>
              <tr><td>最大单日收益（万元）</td><td>${fmt(r.run_metrics.max_daily)}</td></tr>
            </table>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><div class="card-title">财务指标<small>（含税）</small></div></div>
          <table class="kv-table">
            <tr><th>指标</th><th class="num">数值</th></tr>
            <tr><td>总投资（万元）</td><td>${fmt(r.totalCapex)}</td></tr>
            <tr><td>建设期（个月）</td><td>${r.inputs.build}</td></tr>
            <tr><td>项目周期（年）</td><td>${r.inputs.life}</td></tr>
            <tr><td>年运维成本（万元）</td><td>${fmt(r.opexYear)}</td></tr>
            <tr><td>年均净收益（万元）</td><td>${fmt(r.yearly.reduce((s,x)=>s+x.net,0)/r.inputs.life)}</td></tr>
            <tr><td>LCOE（元/kWh）</td><td>${fmt(r.lcoe,3)}</td></tr>
          </table>
        </div>
      </div>
    `;

    const row3 = `
      <div class="row row-2">
        <div class="card">
          <div class="card-header"><div class="card-title">收益明细<small>（年）</small></div></div>
          <div class="table-wrap">
          <table class="data">
            <thead><tr><th>项目</th><th class="num">调频里程（万kWh）</th><th class="num">单价（元/kWh）</th><th class="num">收益（万元）</th><th class="num">占比</th></tr></thead>
            <tbody>
              <tr><td>二次调频里程</td><td class="num">${fmt(r.mileageYearWkwh)}</td><td class="num">${fmt(r.inputs.mileage_price*r.inputs.k,4)}</td><td class="num">${fmt(r.mileageRevenue)}</td><td class="num">${pct(r.mileageRevenue/r.revIncTax)}</td></tr>
              <tr><td>容量补偿</td><td class="num">—</td><td class="num">—</td><td class="num">${fmt(r.capRevenue)}</td><td class="num">${pct(r.capRevenue/r.revIncTax)}</td></tr>
              <tr><td>其他收益</td><td class="num">—</td><td class="num">—</td><td class="num">${fmt(Math.max(0,r.perfBonus))}</td><td class="num">${pct(Math.max(0,r.perfBonus)/r.revIncTax)}</td></tr>
              <tr class="total"><td>合计</td><td class="num">${fmt(r.mileageYearWkwh)}</td><td class="num">${fmt(r.inputs.mileage_price*r.inputs.k,4)}</td><td class="num">${fmt(r.revIncTax)}</td><td class="num">100.00 %</td></tr>
            </tbody>
          </table>
          </div>
          <div class="card-sub" style="margin-top:6px">注：调频里程单价为加权平均值，包含里程价格和性能折算。</div>
        </div>

        <div class="card">
          <div class="card-header"><div class="card-title">山西二次调频市场规则<small>（摘要）</small></div></div>
          <ul class="rules">
            ${SX_DATA.marketRules.map(x=>`<li><b>${x.k}</b><span>${x.v}</span></li>`).join("")}
          </ul>
        </div>
      </div>
    `;

    return kpis + row1 + row2 + row3;
  }

  // --------- 月度分析 ---------
  function monthly(r){
    return `
      <div class="card">
        <div class="card-header"><div class="card-title">月度收益分布（含税，万元）</div></div>
        <div class="chart-wrap lg"><canvas id="chart-monthly-big"></canvas></div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">月度明细</div></div>
        <div class="table-wrap"><table class="data">
          <thead><tr><th>月份</th><th class="num">里程收益</th><th class="num">容量补偿</th><th class="num">其他</th><th class="num">合计（万元）</th></tr></thead>
          <tbody>
            ${r.monthly.map(m=>`<tr><td>${m.month}</td><td class="num">${fmt(m.mileage)}</td><td class="num">${fmt(m.capacity)}</td><td class="num">${fmt(m.other)}</td><td class="num">${fmt(m.total)}</td></tr>`).join("")}
            <tr class="total"><td>合计</td><td class="num">${fmt(r.mileageRevenue)}</td><td class="num">${fmt(r.capRevenue)}</td><td class="num">${fmt(Math.max(0,r.perfBonus))}</td><td class="num">${fmt(r.revIncTax)}</td></tr>
          </tbody>
        </table></div>
      </div>`;
  }

  // --------- 小时/分时段 ---------
  function hourly(r){
    const periodRows = r.periods.map(p=>`
      <tr>
        <td>${p.name}</td><td>${p.type}</td>
        <td class="num">${p.hours}</td>
        <td class="num">${fmt(p.revenue/365*10)}</td>
        <td class="num">${fmt(p.revenue)}</td>
        <td class="num">${fmt(p.capRevenue)}</td>
        <td class="num">${fmt(p.revenue+p.capRevenue)}</td>
      </tr>`).join("");
    return `
      <div class="card">
        <div class="card-header"><div class="card-title">分时段收益分布（山西 5 时段）</div></div>
        <div class="chart-wrap lg"><canvas id="chart-period"></canvas></div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">分时段明细（年）</div></div>
        <div class="table-wrap"><table class="data">
          <thead><tr><th>时段</th><th>类型</th><th class="num">小时数</th><th class="num">日均收益(元)</th><th class="num">里程收益(万元)</th><th class="num">容量补偿(万元)</th><th class="num">合计(万元)</th></tr></thead>
          <tbody>${periodRows}</tbody>
        </table></div>
      </div>`;
  }

  // --------- 日收益明细 ---------
  function daily(r){
    // 生成 30 天样本
    const days = [];
    for(let i=1;i<=30;i++){
      const f = 0.85 + 0.3 * Math.sin(i/5) * Math.cos(i/11) + 0.15*(Math.random()-0.5);
      const rev = r.revIncTax/365 * (1 + f*0.3);
      const mileage = r.mileageYearWkwh/365 * (1 + f*0.3);
      days.push({d:i, rev, mileage, cap:r.capRevenue/365, k:r.inputs.k*(0.92+Math.random()*0.15)});
    }
    return `
      <div class="card">
        <div class="card-header"><div class="card-title">近 30 日收益与里程趋势</div></div>
        <div class="chart-wrap lg"><canvas id="chart-daily"></canvas></div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">日收益明细（示例）</div></div>
        <div class="table-wrap"><table class="data">
          <thead><tr><th>日序</th><th class="num">里程电量(万kWh)</th><th class="num">里程收益(万元)</th><th class="num">容量补偿(万元)</th><th class="num">合计收益(万元)</th><th class="num">性能K</th></tr></thead>
          <tbody>${days.map(x=>`<tr><td>Day ${x.d}</td><td class="num">${fmt(x.mileage)}</td><td class="num">${fmt(x.rev-x.cap)}</td><td class="num">${fmt(x.cap)}</td><td class="num">${fmt(x.rev)}</td><td class="num">${fmt(x.k,3)}</td></tr>`).join("")}</tbody>
        </table></div>
      </div>`;
  }

  // --------- 现金流 ---------
  function cashflow(r){
    return `
      <div class="card">
        <div class="card-header"><div class="card-title">全生命周期现金流（${r.inputs.life} 年）</div></div>
        <div class="chart-wrap lg"><canvas id="chart-cashflow-big"></canvas></div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">年度现金流明细</div></div>
        <div class="table-wrap"><table class="data">
          <thead><tr><th>年份</th><th class="num">税后收益</th><th class="num">运维成本</th><th class="num">所得税</th><th class="num">净现金流</th><th class="num">累计现金流</th></tr></thead>
          <tbody>
            <tr><td>建设期</td><td class="num">—</td><td class="num">—</td><td class="num">—</td><td class="num">-${fmt(r.totalCapex)}</td><td class="num">-${fmt(r.totalCapex)}</td></tr>
            ${r.yearly.map(y=>`<tr><td>第 ${y.year} 年</td><td class="num">${fmt(y.revenue)}</td><td class="num">${fmt(y.opex)}</td><td class="num">${fmt(y.tax)}</td><td class="num">${fmt(y.net)}</td><td class="num" style="color:${y.cumulative>=0?'var(--green)':'var(--red)'}">${fmt(y.cumulative)}</td></tr>`).join("")}
          </tbody>
        </table></div>
      </div>`;
  }

  // --------- 敏感性分析 ---------
  function sensitivity(r){
    return `
      <div class="card">
        <div class="card-header"><div class="card-title">IRR 敏感性分析 —— 单因素 ±20%</div></div>
        <div class="chart-wrap lg"><canvas id="chart-sensitivity"></canvas></div>
        <div class="card-sub" style="margin-top:8px">基线 IRR = ${pct(r.irr)}；对以下因素做 ±10% / ±20% 扰动，其余因素不变。</div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">双因素热力表 —— 里程价格 × 日均里程</div></div>
        <div id="heatmap"></div>
      </div>`;
  }

  // --------- SOC / 性能 / 里程 ---------
  function socView(r){
    return `
      <div class="card"><div class="card-header"><div class="card-title">典型日 SOC 运行曲线</div></div>
        <div class="chart-wrap lg"><canvas id="chart-soc"></canvas></div>
      </div>
      <div class="card"><div class="card-header"><div class="card-title">SOC 使用统计</div></div>
        <table class="kv-table">
          <tr><td>运行 SOC 窗口</td><td>${r.run_metrics.soc_range}</td></tr>
          <tr><td>年等效满充满放次数</td><td>${fmt(r.run_metrics.equiv_full_cycles)} 次</td></tr>
          <tr><td>充放电效率</td><td>${pct(r.inputs.eff)}</td></tr>
          <tr><td>年度容量衰减</td><td>${pct(r.inputs.degrade)}</td></tr>
          <tr><td>剩余寿命（容量 80%）</td><td>${fmt(Math.log(0.8)/Math.log(1-r.inputs.degrade),1)} 年</td></tr>
        </table>
      </div>`;
  }

  function perfView(r){
    return `
      <div class="card"><div class="card-header"><div class="card-title">性能指标分布（K1 调节速率 / K2 调节精度 / K3 响应时间）</div></div>
        <div class="chart-wrap lg"><canvas id="chart-perf"></canvas></div>
      </div>
      <div class="card"><div class="card-header"><div class="card-title">性能参数说明</div></div>
        <table class="kv-table">
          <tr><th>参数</th><th class="num">典型值</th></tr>
          <tr><td>K1 调节速率</td><td>1.2 ~ 1.8（储能优势区间）</td></tr>
          <tr><td>K2 调节精度（偏差量 1% Pn / 最小 1MW）</td><td>≥ 0.95</td></tr>
          <tr><td>K3 响应时间（标准 60s）</td><td>0.98 ~ 1.00</td></tr>
          <tr><td>Kp = K1·K2·K3</td><td>≤ 2.0（国家上限）</td></tr>
          <tr><td>K结算 = β·λ·K实际（α=0.5, β=0.8）</td><td>λ = 2 / max(K实际)</td></tr>
          <tr><td>性能指标归一化（Kpmin=1, Kpsat=6）</td><td>分段线性</td></tr>
        </table>
      </div>`;
  }

  function mileageView(r){
    return `
      <div class="card"><div class="card-header"><div class="card-title">月度调频里程电量（万kWh）</div></div>
        <div class="chart-wrap lg"><canvas id="chart-mileage"></canvas></div>
      </div>`;
  }

  function payback(r){
    return `
      <div class="card">
        <div class="card-header"><div class="card-title">累计现金流与投资回收</div></div>
        <div class="chart-wrap lg"><canvas id="chart-payback"></canvas></div>
        <div class="card-sub" style="margin-top:8px">静态回收期：<b>${r.payback? fmt(r.payback,2):"—"}</b> 年；IRR：<b>${pct(r.irr)}</b>；NPV：<b>${fmt(r.npv)}</b> 万元。</div>
      </div>`;
  }

  // --------- 基础数据 ---------
  function prices(){
    return `
      <div class="card"><div class="card-header"><div class="card-title">山西二次调频市场 · 价格与补偿标准</div></div>
        <div class="table-wrap"><table class="data">
          <thead><tr><th>项目</th><th>标准</th><th>说明</th></tr></thead>
          <tbody>
            <tr><td>里程申报价上限</td><td>15 元/MW</td><td>国家价格机制通知；性能系数上限 2</td></tr>
            <tr><td>日间分时段区间（5-15 元/MW）</td><td>00:00-06:00 / 06:00-12:00 / 21:00-24:00</td><td>后夜、早高峰、夜间</td></tr>
            <tr><td>日间分时段区间（10-15 元/MW）</td><td>12:00-16:00 / 16:00-21:00</td><td>中午低谷、晚高峰</td></tr>
            <tr><td>储能调频量价补偿</td><td>充电电费×η − 放电电费</td><td>差额为负不补，独立储能专项</td></tr>
            <tr><td>性能折算（K结算）</td><td>β·λ·K实际；α=0.5，β=0.8</td><td>λ = 2 / max(K实际)</td></tr>
            <tr><td>结算方式</td><td>pay-as-bid 按申报价</td><td>日清月结、随电费结算</td></tr>
            <tr><td>分摊方式</td><td>跨省外送分担 + 省内按比例分摊</td><td>居民/农业/光伏扶贫暂免</td></tr>
            <tr><td>需求区间</td><td>直调发电需求最大值的 5%-15%</td><td>调度可动态调整</td></tr>
          </tbody>
        </table></div>
      </div>`;
  }

  function devices(r){
    return `
      <div class="card"><div class="card-header"><div class="card-title">设备参数</div></div>
        <table class="kv-table">
          <tr><td>储能容量</td><td>${r.inputs.energy} MWh</td></tr>
          <tr><td>储能时长</td><td>${r.inputs.duration} h</td></tr>
          <tr><td>额定功率</td><td>${r.inputs.power} MW</td></tr>
          <tr><td>电池类型</td><td>${r.inputs.battery}</td></tr>
          <tr><td>充放电效率</td><td>${pct(r.inputs.eff)}</td></tr>
          <tr><td>年衰减率</td><td>${pct(r.inputs.degrade)}</td></tr>
          <tr><td>调节速率上限</td><td>≤ 60 MW/min（山西独立储能规则）</td></tr>
          <tr><td>调节精度偏差量</td><td>1% Pn，最小 1 MW</td></tr>
          <tr><td>标准响应时间</td><td>60 s</td></tr>
          <tr><td>设备 CAPEX</td><td>${r.inputs.capex_equip} 元/Wh</td></tr>
          <tr><td>EPC CAPEX</td><td>${r.inputs.capex_epc} 元/Wh</td></tr>
          <tr><td>合计 CAPEX</td><td>${fmt(r.capexPerWh,2)} 元/Wh = ${fmt(r.totalCapex)} 万元</td></tr>
        </table>
      </div>`;
  }

  // --------- 政策方法页 ---------
  function policy(){
    return `<div class="card"><div class="policy-article">
      <h2>一、山西二次调频市场政策框架</h2>
      <p>山西二次调频市场当前已从"辅助服务补偿规则"走到"与现货衔接的分时段市场化交易"阶段。核心特征是<b>容量申报、性能排序、按申报价结算、按实际调节深度付费</b>的单里程制，并对独立储能叠加<b>能量价差补偿</b>。</p>
      <ul>
        <li>国家层面：《电力辅助服务市场价格机制通知》(2024) + 《电力辅助服务市场基本规则》(2025)；</li>
        <li>山西层面：《关于完善山西电力辅助服务市场有关事项的通知》(2024.6) + 《山西电力二次调频辅助服务市场交易实施细则》(2025.4)；</li>
        <li>现货衔接：独立储能中标后，运行上下限扣除中标容量再进入现货出清。</li>
      </ul>

      <h2>二、出清与结算机制</h2>
      <h3>五时段交易</h3>
      <p>按 00-06 / 06-12 / 12-16 / 16-21 / 21-24 五个时段分别报价；竞价日 8:30 前发布开市信息，8:30-9:30 报价，9:30-10:30 出清，17:30 前发布结果。</p>
      <h3>性能排序出清</h3>
      <span class="formula">排序价 C = 申报价 b ÷ 归一化历史性能 K<sub>norm</sub></span>
      <p>K<sub>norm</sub> 采用分段函数：K ≥ Kpsat(6) 记 1，K ≤ Kpmin(1) 记 0.1；Kpmin = 1 的资源不予调用。</p>
      <h3>结算公式（山西现行口径）</h3>
      <span class="formula">调频收益 = 实际调节深度 D<sup>R</sup> × 性能折算 K<sub>结算</sub> × 申报价 b</span>
      <span class="formula">K<sub>结算</sub> = β · λ · K<sub>实际</sub>；λ = 2 / max(K<sub>实际</sub>)；α = 0.5, β = 0.8</span>
      <p>pay-as-bid 机制，每个资源按<b>自己的申报价</b>结算，非统一出清价。</p>

      <h2>三、独立储能专项规则</h2>
      <span class="formula">调频量价补偿 = 调频时段充电电费 × η − 调频时段放电电费 （差值为负不补）</span>
      <ul>
        <li>调节速率上限 60 MW/分钟；偏差量按额定功率的 1%，最小 1 MW；标准响应时间 60s；</li>
        <li>中标后运行上下限扣除中标容量；试验期间不获得收益。</li>
      </ul>

      <h2>四、项目收益测算模型</h2>
      <h3>现行规则口径（本平台默认）</h3>
      <span class="formula">R<sub>current</sub>(s) = D(s) × K<sub>settle</sub>(s) × b(s) + C<sub>es</sub>(s)</span>

      <h3>扩展双部制口径（分析性工具，非山西现行结算）</h3>
      <span class="formula">R<sub>ext</sub>(s) = Q<sub>cap</sub>·h·P<sub>cap</sub> + D·K·P<sub>mile</sub> + C<sub>es</sub> − C<sub>deg</sub> − OC</span>
      <div class="note">扩展口径用于检验：现行 15 元/MW 的里程价格上限，在高现货时段是否足以覆盖容量保留机会成本。对煤机敏感，对储能次之。</div>

      <h2>五、财务模型</h2>
      <ul>
        <li><b>CAPEX</b> = (设备 + EPC) × 容量；含税按增值税 13% 计。</li>
        <li><b>年度退化</b>：按 (1 − degrade)<sup>y-1</sup> 递减。</li>
        <li><b>所得税</b>：25%，折旧按项目周期直线法。</li>
        <li><b>LCOE</b>（元/kWh 调频里程）= Σ 成本现值 / Σ 里程电量现值。</li>
        <li><b>IRR</b>：牛顿迭代；<b>NPV</b>：按折现率计算净现值；<b>回收期</b>：累计现金流首次转正年。</li>
      </ul>

      <h2>六、数据与验证</h2>
      <p>实际建模需要：AGC 指令与响应曲线（秒级）、基准出力/运行上下限、市场申报与出清结果、电能量价格、SOC 与效率、机组技术与成本参数。公开数据仅披露均值/极值/均价，完整投标栈不可得，外部建模以区间估计为主。</p>
    </div></div>`;
  }

  return { overview, monthly, hourly, daily, cashflow, sensitivity, socView, perfView, mileageView, payback, prices, devices, policy };
})();
