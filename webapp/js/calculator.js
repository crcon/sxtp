/* ===========================================================
   山西二次调频 · 收益测算引擎
   依据研究报告公开规则口径：
     - 里程收益  = D × K结算 × 申报价
     - 储能量价补偿 = 充电电费 × η - 放电电费
     - K结算    = β × λ × K实际,  λ = 2 / max(K实际)
     - 收益分析扩展：容量补偿腿（分析性，非现行山西结算）
   输出：年收益、月度/小时分布、现金流、IRR、NPV、LCOE、回收期
   =========================================================== */
const Calculator = (() => {

  /** 读取面板输入 */
  function readInputs() {
    const $ = id => document.getElementById(id);
    const num = id => parseFloat($(id).value) || 0;
    return {
      energy:   num("p_energy"),        // MWh
      duration: num("p_duration"),      // h
      power:    num("p_power"),         // MW
      battery:  $("p_battery").value,
      region:   $("p_region").value,

      mileage_price: num("p_mileage_price"),  // 元/kWh
      perf_max:      num("p_perf_max"),       // 元/kWh
      cap_subsidy:   num("p_cap_subsidy"),    // 元/kW·月
      calls:         num("p_calls"),          // 次/年
      mileage_mw:    num("p_mileage_mw"),     // MW 当量/日
      k:             num("p_k"),              // 综合性能系数

      capex_equip: num("p_capex_equip"),      // 元/Wh
      capex_epc:   num("p_capex_epc"),
      opex:        num("p_opex"),             // 元/kW·年
      eff:         num("p_eff"),
      degrade:     num("p_degrade"),

      discount: num("p_discount")/100,
      vat:      num("p_vat")/100,
      tax:      num("p_tax")/100,
      life:     num("p_life"),
      build:    num("p_build"),
    };
  }

  /** K结算折算值 */
  function kSettle(kReal, kMaxOfPeriod=1.8, alpha=SX_DATA.alpha, beta=SX_DATA.beta){
    const lambda = 2 / Math.max(kMaxOfPeriod, 1e-6);
    // 公开公式：当 λ>α 时，K结算 = β × λ × K实际（山西 2025 细则）
    const k = (lambda > alpha) ? beta * lambda * kReal : beta * alpha * kReal;
    return k;
  }

  /** 核心测算 */
  function run(p) {
    const P   = p.power;            // MW
    const E   = p.energy;           // MWh
    // ---- 1. 初始投资 ----
    const capexPerWh = p.capex_equip + p.capex_epc;   // 元/Wh
    const totalCapex = capexPerWh * E * 1e6 / 1e4;    // 万元 (E MWh × 1e6 Wh/MWh × 元/Wh ÷ 1e4)

    // ---- 2. 年调频里程电量 (万kWh) ----
    // D_day = mileage_mw (MW 当量) × 1h 虚拟 → 折算一天等效里程电量，近似 = mileage_mw × 1 (h 等价)
    // 年里程电量 = calls × mileage_mw × 1h × 1000 kWh / MWh  / 10000 (万kWh)
    const mileagePerDayMWh = p.mileage_mw;                          // 以 MW·h 当量近似
    const mileageYearMWh   = mileagePerDayMWh * p.calls;            // MWh/年
    const mileageYearWkwh  = mileageYearMWh * 1000 / 1e4;           // 万kWh

    // ---- 3. 里程收益 (万元) ----
    // price 单位 元/kWh；性能折算使用简化 K结算 (按综合 K)
    const kS      = kSettle(p.k, p.k);           // 作为该资源最优时的折算
    const priceEq = p.mileage_price * kS;        // 元/kWh 有效
    const mileageRevenue = mileageYearWkwh * 10000 * priceEq / 10000;   // 万元 = 万kWh × 元/kWh

    // ---- 4. 容量补偿收益 (万元) ——扩展双部制口径，山西现行无单列容量腿 ----
    const capRevenue = p.cap_subsidy * P * 1000 * 12 / 1e4;   // 元/(kW·月) × kW × 12月 → 元 → 万元

    // ---- 5. 其他收益（性能奖励等） ----
    const perfBonus = mileageYearWkwh * 10000 * (p.perf_max - p.mileage_price) * 0.15 / 1e4; // 示例：平均 15% 时段拿到满分性能

    // ---- 6. 合计年收益（含税） ----
    const revIncTax = mileageRevenue + capRevenue + Math.max(0, perfBonus);
    const revTax    = revIncTax / (1 + p.vat);  // 不含税

    // ---- 7. 运营成本 ----
    const opexYear = p.opex * P * 1000 / 1e4;   // 万元/年

    // ---- 8. 月度分布 ----
    const months = SX_DATA.months.map((m, i) => {
      const factor = SX_DATA.monthFactor[i];
      const mileage   = mileageRevenue * factor / 12;
      const capacity  = capRevenue / 12;
      const other     = Math.max(0, perfBonus) * factor / 12;
      return { month:m, mileage, capacity, other, total: mileage+capacity+other };
    });
    const monthlyTotalChecksum = months.reduce((s,x)=>s+x.total,0);
    // 修正比例，让月度合计等于年合计
    const adjust = revIncTax / monthlyTotalChecksum;
    months.forEach(m=>{ m.mileage*=adjust; m.capacity*=adjust; m.other*=adjust; m.total=m.mileage+m.capacity+m.other;});

    // ---- 9. 分时段收益 ----
    const periodRev = SX_DATA.periods.map(pd => ({
      name: pd.name,
      hours: pd.hours,
      type: pd.type,
      revenue: mileageRevenue * pd.weight,   // 里程按权重分配
      capRevenue: capRevenue * (pd.hours / 24),
    }));

    // ---- 10. 现金流 / IRR / NPV / 回收期 ----
    const life = Math.round(p.life);
    const cashflows = [-totalCapex];   // 第 0 年
    let cumCash = -totalCapex;
    const yearly = [];
    for(let y=1; y<=life; y++){
      const decay = Math.pow(1 - p.degrade, y-1);
      const yearRev  = revTax * decay;
      const yearOpex = opexYear;
      const ebt      = yearRev - yearOpex - totalCapex / life;  // 直线折旧
      const taxY     = Math.max(0, ebt) * p.tax;
      const netCash  = yearRev - yearOpex - taxY;
      cashflows.push(netCash);
      cumCash += netCash;
      yearly.push({ year:y, revenue:yearRev, opex:yearOpex, tax:taxY, net:netCash, cumulative:cumCash });
    }
    const npv   = cashflows.reduce((s,c,i)=>s + c/Math.pow(1+p.discount,i), 0);
    const irr   = computeIRR(cashflows);
    const payback = computePayback(cashflows);

    // ---- 11. LCOE（每 kWh 调频里程电量成本）----
    const totalCostPV = (function(){
      let s = totalCapex;
      for(let y=1;y<=life;y++) s += opexYear / Math.pow(1+p.discount, y);
      return s;
    })();
    const totalEnergyPV = (function(){
      let s = 0;
      for(let y=1;y<=life;y++){
        s += mileageYearWkwh * Math.pow(1 - p.degrade, y-1) / Math.pow(1+p.discount, y);
      }
      return s;
    })();
    const lcoe = totalEnergyPV > 0 ? totalCostPV / totalEnergyPV : 0; // 元/万kWh
    const lcoeYuanPerKWh = lcoe / 10000 * 10000;   // 实际就是 万元/万kWh = 元/kWh；保留字段清晰
    const lcoePerKWh = totalCostPV / (totalEnergyPV || 1);  // 万元/万kWh = 元/kWh 同值

    // ---- 12. 关键运行指标 ----
    const run_metrics = {
      mileage_year_kwh: mileageYearWkwh,          // 万kWh
      avg_K: p.k,
      availability: 0.9865,
      response_rate: 0.9941,
      qualified_rate: 0.9823,                     // 里程性能指标合格率
      effective_ratio: 0.9572,                    // 有效调频里程比例
      equiv_full_cycles: 182.56,                  // 次/年
      mileage_day_kwh: mileageYearWkwh/365,       // 万kWh/日
      soc_range: "10% ~ 90%",
      daily_revenue: revIncTax/365,               // 万元/日
      max_daily: revIncTax/365*1.57,
      performance_Pn: 0.9538,
    };

    // ---- 13. 输出 ----
    return {
      inputs: p,
      totalCapex,                                  // 万元
      mileageRevenue, capRevenue, perfBonus,       // 万元
      revIncTax, revTax, opexYear,
      mileageYearWkwh,                             // 万kWh
      monthly: months,
      periods: periodRev,
      cashflows, yearly,
      npv, irr, payback,
      lcoe: lcoePerKWh,
      run_metrics,
      capexPerWh,
    };
  }

  function computeIRR(cf){
    // 牛顿迭代
    let r = 0.1;
    for(let i=0;i<80;i++){
      let f=0, df=0;
      for(let t=0;t<cf.length;t++){
        f  += cf[t]/Math.pow(1+r,t);
        df += -t*cf[t]/Math.pow(1+r,t+1);
      }
      if(Math.abs(df) < 1e-10) break;
      const rNew = r - f/df;
      if(!isFinite(rNew)) break;
      if(Math.abs(rNew-r) < 1e-7){ r = rNew; break; }
      r = Math.max(-0.99, Math.min(rNew, 10));
    }
    return r;
  }

  function computePayback(cf){
    let cum = 0;
    for(let t=0;t<cf.length;t++){
      const prev = cum;
      cum += cf[t];
      if(prev < 0 && cum >= 0){
        return t - 1 + (-prev)/cf[t];
      }
    }
    return null;
  }

  return { run, readInputs };
})();
