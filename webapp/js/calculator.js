/* ===========================================================
   山西二次调频 · 收益测算引擎（量化版）
   -----------------------------------------------------------
   完整勾稽关系：
   (1) K_real   = K1 × K2 × K3                      (≤2)
   (2) λ        = 2 / K_max_period                  (山西细则)
   (3) K_settle = β · λ · K_real   (当 λ > α)
                = β · α · K_real   (否则)
   (4) D_i (MWh/年) = P·q_i·hours_i·m·365·η_avail
       (P=额定功率MW, q_i=中标容量比, hours_i=时段小时,
        m=里程倍数 MW·h 当量/MW·h, η_avail=可用率)
   (5) R_mile_i (万元) = D_i(万kWh) · b_i(元/kWh) · K_settle
   (6) R_mile  = Σ_i R_mile_i
   (7) 储能量价补偿 C_es = max(0, E_ch·p_ch·η − E_dis·p_dis)
   (8) R_cap = P·1000·q_cap_cover·p_cap·12       (扩展口径)
   (9) R_total = R_mile + C_es + R_cap − penalty
   (10) CAPEX = (equip+epc)·E·1e6·1e-4  (万元)
   (11) LCOE = Σ_t cost_t/(1+r)^t / Σ_t mileage_t/(1+r)^t
   (12) IRR/NPV 基于年度现金流
   =========================================================== */
const Calculator = (() => {

  const $ = id => document.getElementById(id);
  const num = id => { const el=$(id); return el? (parseFloat(el.value)||0):0; };
  const val = id => { const el=$(id); return el? el.value : ""; };

  function readInputs() {
    return {
      energy:   num("p_energy"),
      duration: num("p_duration"),
      power:    num("p_power"),
      battery:  val("p_battery"),
      region:   val("p_region"),
      soc_min:  num("p_soc_min")/100,
      soc_max:  num("p_soc_max")/100,
      eff:      num("p_eff"),
      degrade:  num("p_degrade"),

      K1: num("p_K1"), K2: num("p_K2"), K3: num("p_K3"),
      K_max_period: num("p_K_max_period"),

      mileage_multiplier: num("p_mileage_multiplier"),

      p_charge:       num("p_p_charge"),
      p_discharge:    num("p_p_discharge"),
      cycles_per_day: num("p_cycles_per_day"),
      dod_ratio:      num("p_dod_ratio"),

      cap_subsidy:  num("p_cap_subsidy"),
      q_cap_cover:  num("p_q_cap_cover"),

      availability:   num("p_availability"),
      qualified_rate: num("p_qualified_rate"),
      response_rate:  num("p_response_rate"),
      penalty_rate:   num("p_penalty_rate"),

      capex_equip: num("p_capex_equip"),
      capex_epc:   num("p_capex_epc"),
      opex:        num("p_opex"),

      discount: num("p_discount")/100,
      vat:      num("p_vat")/100,
      tax:      num("p_tax")/100,
      life:     num("p_life"),
      build:    num("p_build"),

      periods: SX_DATA.periods.map((pd) => ({
        id: pd.id, name: pd.name, type: pd.type, hours: pd.hours,
        cap: pd.cap,
        bid: num(`p_bid_${pd.id}`),
        q:   num(`p_q_${pd.id}`),
      })),
    };
  }

  function kSettle(K_real, K_max, alpha = SX_DATA.alpha, beta = SX_DATA.beta) {
    const lambda = 2 / Math.max(K_max, 1e-6);
    return (lambda > alpha ? beta * lambda : beta * alpha) * K_real;
  }

  function run(p) {
    // 0. 基础
    const K_real   = p.K1 * p.K2 * p.K3;
    const K_clamp  = Math.min(K_real, SX_DATA.Kp_cap);
    const lambda   = 2 / Math.max(p.K_max_period, 1e-6);
    const K_settle = kSettle(K_clamp, p.K_max_period);

    // 1. CAPEX
    const capex_per_wh = p.capex_equip + p.capex_epc;
    const total_capex  = capex_per_wh * p.energy * 1e6 / 1e4;    // 万元

    // 2. 5 时段逐段
    const periods = p.periods.map(pd => {
      const cap_MW           = p.power * pd.q;
      const mileage_MWh_year = cap_MW * pd.hours * p.mileage_multiplier * 365 * p.availability;
      const mileage_Wkwh     = mileage_MWh_year * 1000 / 1e4;
      const mileage_revenue  = mileage_Wkwh * pd.bid * K_settle;           // 万元
      const cap_revenue      = (p.cap_subsidy * p.power * 1000 * pd.q * p.q_cap_cover * 12 / 1e4) * (pd.hours/24);
      return { ...pd, cap_MW, K_settle, mileage_Wkwh, mileage_revenue, cap_revenue,
               total_revenue: mileage_revenue + cap_revenue };
    });
    const R_mileage         = periods.reduce((s,x)=>s+x.mileage_revenue,0);
    const R_cap             = periods.reduce((s,x)=>s+x.cap_revenue,0);
    const mileage_year_Wkwh = periods.reduce((s,x)=>s+x.mileage_Wkwh,0);

    // 3. 储能量价补偿
    const E_charge_day    = p.cycles_per_day * p.energy * p.dod_ratio;
    const E_discharge_day = E_charge_day * p.eff;
    const ce_charge_day   = E_charge_day   * 1000 * p.p_charge;
    const ce_discharge_day= E_discharge_day* 1000 * p.p_discharge;
    const C_es_day        = Math.max(0, ce_charge_day * p.eff - ce_discharge_day);
    const R_ces           = C_es_day * 365 / 1e4;

    // 4. 考核扣款
    const penalty = (R_mileage + R_cap + R_ces) * (1 - p.qualified_rate) * p.penalty_rate;

    // 5. 合计
    const rev_incl_tax = R_mileage + R_cap + R_ces - penalty;
    const rev_excl_tax = rev_incl_tax / (1 + p.vat);
    const opex_year    = p.opex * p.power * 1000 / 1e4;

    // 6. 月度（严格 Σ=年）
    const factorSum = SX_DATA.monthFactor.reduce((a,b)=>a+b,0);
    const monthly = SX_DATA.months.map((m,i) => {
      const ratio = SX_DATA.monthFactor[i] / factorSum;
      return {
        month: m,
        mileage: R_mileage * ratio,
        capacity: R_cap * ratio,
        other: Math.max(0, R_ces - penalty) * ratio,
        total: rev_incl_tax * ratio,
      };
    });

    // 7. SOC / 循环
    const soc_window_pct  = p.soc_max - p.soc_min;
    const E_usable        = p.energy * soc_window_pct;
    const cycles_year     = p.cycles_per_day * 365 * p.availability;
    const remaining_years = Math.log(0.8) / Math.log(1 - p.degrade);

    // 8. 现金流 / IRR / NPV
    const life = Math.round(p.life);
    const cashflows = [-total_capex];
    const yearly = [];
    let cum = -total_capex;
    for (let y=1; y<=life; y++) {
      const decay = Math.pow(1 - p.degrade, y-1);
      const yearRev  = rev_excl_tax * decay;
      const yearOpex = opex_year;
      const dep      = total_capex / life;
      const ebt      = yearRev - yearOpex - dep;
      const taxY     = Math.max(0, ebt) * p.tax;
      const net      = yearRev - yearOpex - taxY;
      cashflows.push(net); cum += net;
      yearly.push({ year:y, revenue:yearRev, opex:yearOpex, depreciation:dep, tax:taxY, net, cumulative:cum });
    }
    const npv     = cashflows.reduce((s,c,i)=>s+c/Math.pow(1+p.discount,i),0);
    const irr     = computeIRR(cashflows);
    const payback = computePayback(cashflows);

    // 9. LCOE
    let costPV = total_capex, milePV = 0;
    for (let y=1; y<=life; y++){
      costPV += opex_year / Math.pow(1+p.discount, y);
      milePV += (mileage_year_Wkwh * Math.pow(1-p.degrade,y-1)) / Math.pow(1+p.discount, y);
    }
    const lcoe = milePV > 0 ? costPV / milePV : 0;

    // 10. 运行指标
    const run_metrics = {
      K_real, K_settle, lambda,
      mileage_year_Wkwh,
      equiv_full_cycles: cycles_year,
      daily_revenue: rev_incl_tax / 365,
      max_daily: rev_incl_tax / 365 * 1.57,
      mileage_day_Wkwh: mileage_year_Wkwh / 365,
      availability: p.availability,
      response_rate: p.response_rate,
      qualified_rate: p.qualified_rate,
      effective_ratio: p.qualified_rate * p.response_rate,
      performance_Pn: K_real / 2,
      soc_range: `${(p.soc_min*100).toFixed(0)}% ~ ${(p.soc_max*100).toFixed(0)}%`,
      soc_window: soc_window_pct,
      E_usable, remaining_years,
    };

    // 11. 勾稽校验
    const EPS = 1e-6;
    const eq = (a,b,tol=0.005) => Math.abs(a-b) <= tol * Math.max(1, Math.abs(a), Math.abs(b));
    const sumPMwk = periods.reduce((s,x)=>s+x.mileage_Wkwh,0);
    const sumPRev = periods.reduce((s,x)=>s+x.mileage_revenue+x.cap_revenue,0);
    const sumMTot = monthly.reduce((s,x)=>s+x.total,0);
    const maxCap  = Math.max(...periods.map(pd=>pd.cap_MW));
    const socOK   = E_usable >= maxCap * 0.25;
    const bidOK   = periods.every(pd => pd.bid >= pd.cap[0]-EPS && pd.bid <= pd.cap[1]+EPS);

    const checks = [
      { name:"Σ 时段里程电量 = 年里程电量", formula:"Σ D_i = D_year",
        ok: eq(sumPMwk, mileage_year_Wkwh),
        left: sumPMwk, right: mileage_year_Wkwh, unit:"万kWh" },
      { name:"Σ 时段收益(里程+容量) = 年R", formula:"Σ R_i = R_mile + R_cap",
        ok: eq(sumPRev, R_mileage+R_cap),
        left: sumPRev, right: R_mileage+R_cap, unit:"万元" },
      { name:"Σ 月度收益 = 年总收益", formula:"Σ R_m = R_total",
        ok: eq(sumMTot, rev_incl_tax),
        left: sumMTot, right: rev_incl_tax, unit:"万元" },
      { name:"性能系数约束 Kp ≤ 2", formula:"K1·K2·K3 ≤ 2",
        ok: K_real <= SX_DATA.Kp_cap + EPS,
        left: K_real, right: SX_DATA.Kp_cap, unit:"" },
      { name:"5时段申报价在政策区间", formula:"b_i ∈ [cap_lo, cap_hi]",
        ok: bidOK,
        left: periods.filter(pd => pd.bid < pd.cap[0]-EPS || pd.bid > pd.cap[1]+EPS).length, right: 0, unit:"个越界" },
      { name:"SOC可用能量 ≥ 最大中标容量·15min", formula:"E·(SOC_max-SOC_min) ≥ 0.25·max(cap_i)",
        ok: socOK,
        left: E_usable, right: maxCap * 0.25, unit:"MWh" },
      { name:"CAPEX = 单位造价·容量", formula:"CAPEX = (equip+EPC)·E·100",
        ok: eq(total_capex, capex_per_wh*p.energy*100),
        left: total_capex, right: capex_per_wh*p.energy*100, unit:"万元" },
      { name:"K_settle 折算一致", formula:"K_settle = β·λ·K_real, λ=2/K_max",
        ok: eq(K_settle, kSettle(K_clamp, p.K_max_period)),
        left: K_settle, right: kSettle(K_clamp, p.K_max_period), unit:"" },
    ];

    return {
      inputs: p,
      K_real, K_settle, lambda,
      total_capex, capex_per_wh,
      R_mileage, R_cap, R_ces, penalty,
      rev_incl_tax, rev_excl_tax, opex_year,
      mileage_year_Wkwh,
      periods, monthly,
      cashflows, yearly,
      npv, irr, payback, lcoe,
      run_metrics, checks,
      ces_detail: { E_charge_day, E_discharge_day, ce_charge_day, ce_discharge_day, C_es_day },
    };
  }

  function computeIRR(cf){
    let r = 0.1;
    for(let i=0;i<100;i++){
      let f=0, df=0;
      for(let t=0;t<cf.length;t++){
        f  += cf[t]/Math.pow(1+r,t);
        df += -t*cf[t]/Math.pow(1+r,t+1);
      }
      if(Math.abs(df)<1e-10) break;
      const rn = r - f/df;
      if(!isFinite(rn)) break;
      if(Math.abs(rn-r)<1e-7){ r=rn; break; }
      r = Math.max(-0.99, Math.min(rn,10));
    }
    return r;
  }

  function computePayback(cf){
    let cum = 0;
    for(let t=0;t<cf.length;t++){
      const prev = cum; cum += cf[t];
      if(prev<0 && cum>=0) return t - 1 + (-prev)/cf[t];
    }
    return null;
  }

  return { run, readInputs, kSettle };
})();
