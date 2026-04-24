/* 山西二次调频市场基础数据 —— 依据研究报告公开规则整理 */
const SX_DATA = {
  // 5 时段划分（山西细则）
  periods: [
    { name: "00:00-06:00", hours: 6, cap: [5, 15],  type: "后夜",   weight: 0.15 },
    { name: "06:00-12:00", hours: 6, cap: [5, 15],  type: "早高峰", weight: 0.22 },
    { name: "12:00-16:00", hours: 4, cap: [10,15],  type: "中午低谷", weight: 0.16 },
    { name: "16:00-21:00", hours: 5, cap: [10,15],  type: "晚高峰", weight: 0.30 },
    { name: "21:00-24:00", hours: 3, cap: [5, 15],  type: "夜间",   weight: 0.17 },
  ],
  // 需求区间（直调发电需求最大值的 5%-15%）
  demandRange: [0.05, 0.15],
  // 性能系数归一化参数（Kpmin=1, Kpsat=6）
  Kpmin: 1,
  Kpsat: 6,
  // α、β（K结算折算系数）
  alpha: 0.5,
  beta:  0.8,
  // 调频指令最短历时
  minInstructionSec: 30,
  // 独立储能额定速率上限
  maxRampMWmin: 60,
  // 性能系数上限
  KpMax: 2,
  // 调频里程价格上限（元/MW，即 0.015 元/kWh 每一次 1MW·30s 累计）
  mileageCapYuanPerMW: 15,
  // 月份名
  months: ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"],
  // 月度里程强度系数（夏/冬调频更频繁）
  monthFactor: [1.02,0.95,0.92,0.90,0.94,1.05,1.12,1.10,0.98,0.92,0.98,1.12],

  // 政策条目（右侧"市场规则"面板展示）
  marketRules: [
    { k:"里程价格",    v:"0.260 元/kWh（分时段 5-15 元/MW 申报区间）" },
    { k:"性能补偿",    v:"0 ~ 0.300 元/kWh，K结算=β·λ·K实际" },
    { k:"容量补偿",    v:"12 元/kW·月（分析性扩展口径）" },
    { k:"考核指标",    v:"里程电量、响应时间、调节精度" },
    { k:"结算周期",    v:"日清算、月结算、随电费结算" },
    { k:"数据来源",    v:"山西电力交易中心（2024 版）" },
  ],
};

// 默认参数（对齐 UI 示意图）
const DEFAULT_PARAMS = {
  energy:200, duration:2, power:100, battery:"磷酸铁锂", region:"山西省",
  mileage_price:0.012, perf_max:0.015, cap_subsidy:12,
  calls:365, mileage_mw:500, k:1.80,
  capex_equip:0.90, capex_epc:0.20, opex:18, eff:0.88, degrade:0.020,
  discount:8.00, vat:13, tax:25, life:15, build:6,
};
