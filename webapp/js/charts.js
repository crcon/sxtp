/* ===========================================================
   图表渲染（Chart.js）
   =========================================================== */
const Charts = (() => {
  let instances = [];
  const destroyAll = () => { instances.forEach(c=>c.destroy()); instances = []; };
  const register   = c => { instances.push(c); return c; };

  const COLORS = {
    blue:"#3b82f6", green:"#10b981", orange:"#f59e0b",
    purple:"#8b5cf6", red:"#ef4444", cyan:"#06b6d4", gray:"#94a3b8",
  };

  const baseOpts = {
    responsive:true, maintainAspectRatio:false,
    plugins:{
      legend:{ labels:{font:{size:11}, color:"#6b7280", boxWidth:10} },
      tooltip:{ backgroundColor:"#1f2937", padding:10, cornerRadius:6, titleFont:{size:12}, bodyFont:{size:12} },
    },
    scales:{
      x:{ grid:{color:"#eef1f6",drawBorder:false}, ticks:{color:"#9ca3af",font:{size:11}} },
      y:{ grid:{color:"#eef1f6",drawBorder:false}, ticks:{color:"#9ca3af",font:{size:11}} },
    },
  };

  function donut(r){
    const el = document.getElementById("chart-donut");
    if(!el) return;
    register(new Chart(el,{
      type:"doughnut",
      data:{
        labels:["调频里程收益","容量补偿收益","其他收益"],
        datasets:[{
          data:[r.mileageRevenue, r.capRevenue, Math.max(0,r.perfBonus)],
          backgroundColor:[COLORS.blue, COLORS.green, COLORS.orange],
          borderWidth:0, cutout:"70%",
        }],
      },
      options:{ ...baseOpts, plugins:{...baseOpts.plugins, legend:{display:false}}, scales:{} },
    }));
  }

  function monthly(r, id="chart-monthly"){
    const el = document.getElementById(id);
    if(!el) return;
    register(new Chart(el,{
      type:"bar",
      data:{
        labels:r.monthly.map(m=>m.month),
        datasets:[
          { label:"总收益", data:r.monthly.map(m=>m.total), backgroundColor:COLORS.blue, borderRadius:3, barPercentage:.65 },
          { label:"调频里程（万元）", data:r.monthly.map(m=>m.mileage), backgroundColor:COLORS.green, borderRadius:3, barPercentage:.65 },
        ],
      },
      options:baseOpts,
    }));
  }

  function cashflow(r, id="chart-cashflow"){
    const el = document.getElementById(id);
    if(!el) return;
    const labels = ["建设期", ...r.yearly.map(y=>`第${y.year}年`)];
    register(new Chart(el,{
      data:{
        labels,
        datasets:[
          { type:"bar", label:"现金流入", data:[0, ...r.yearly.map(y=>y.revenue)], backgroundColor:COLORS.blue, borderRadius:3 },
          { type:"bar", label:"现金流出", data:[-r.totalCapex, ...r.yearly.map(y=>-(y.opex+y.tax))], backgroundColor:COLORS.orange, borderRadius:3 },
          { type:"line", label:"净现金流", data:[-r.totalCapex, ...r.yearly.map(y=>y.cumulative)], borderColor:COLORS.red, backgroundColor:"transparent", tension:.3, pointRadius:2 },
        ],
      },
      options:baseOpts,
    }));
  }

  function period(r){
    const el = document.getElementById("chart-period");
    if(!el) return;
    register(new Chart(el,{
      type:"bar",
      data:{
        labels:r.periods.map(p=>p.name),
        datasets:[
          { label:"里程收益", data:r.periods.map(p=>p.revenue), backgroundColor:COLORS.blue, borderRadius:4 },
          { label:"容量补偿", data:r.periods.map(p=>p.capRevenue), backgroundColor:COLORS.green, borderRadius:4 },
        ],
      },
      options:baseOpts,
    }));
  }

  function daily(r){
    const el = document.getElementById("chart-daily");
    if(!el) return;
    const labels = Array.from({length:30},(_,i)=>`D${i+1}`);
    const rev=[], mil=[];
    for(let i=0;i<30;i++){
      const f = 0.85 + 0.3 * Math.sin(i/5) * Math.cos(i/11);
      rev.push(r.revIncTax/365 * (1 + f*0.3));
      mil.push(r.mileageYearWkwh/365 * (1 + f*0.3));
    }
    register(new Chart(el,{
      data:{ labels, datasets:[
        { type:"bar", label:"日收益（万元）", data:rev, backgroundColor:COLORS.blue, yAxisID:"y", borderRadius:3 },
        { type:"line", label:"日里程（万kWh）", data:mil, borderColor:COLORS.orange, backgroundColor:"transparent", yAxisID:"y1", tension:.3, pointRadius:1 },
      ]},
      options:{ ...baseOpts, scales:{
        x:baseOpts.scales.x,
        y:{...baseOpts.scales.y, position:"left", title:{display:true,text:"万元",font:{size:10},color:"#9ca3af"}},
        y1:{...baseOpts.scales.y, position:"right", title:{display:true,text:"万kWh",font:{size:10},color:"#9ca3af"}, grid:{display:false}},
      }},
    }));
  }

  function sensitivity(r){
    const el = document.getElementById("chart-sensitivity");
    if(!el) return;
    const factors = ["里程价格","日均里程","综合性能K","设备投资","运维成本","充放电效率"];
    const base = r.irr;
    // 模拟：里程/K/价格正相关；capex/opex 负相关
    const neg20 = [ base*0.6,  base*0.55, base*0.75, base*1.25, base*1.05, base*0.92 ];
    const pos20 = [ base*1.35, base*1.40, base*1.22, base*0.75, base*0.95, base*1.08 ];
    register(new Chart(el,{
      type:"bar",
      data:{ labels:factors, datasets:[
        { label:"-20%", data:neg20.map(v=>v*100), backgroundColor:COLORS.red, borderRadius:3 },
        { label:"基线",  data:factors.map(()=>base*100), backgroundColor:COLORS.gray, borderRadius:3 },
        { label:"+20%", data:pos20.map(v=>v*100), backgroundColor:COLORS.green, borderRadius:3 },
      ]},
      options:{ ...baseOpts, indexAxis:"y",
        scales:{ x:{...baseOpts.scales.x, title:{display:true,text:"IRR (%)",font:{size:10},color:"#9ca3af"}}, y:baseOpts.scales.y }},
    }));
    // 热力表
    const mapDiv = document.getElementById("heatmap");
    if(mapDiv){
      const xs = [0.008,0.010,0.012,0.014,0.016];       // 里程价格
      const ys = [300,400,500,600,700];                 // 日均里程
      const irrBase = r.irr, priceBase=r.inputs.mileage_price, milBase=r.inputs.mileage_mw;
      let html = `<table class="data"><thead><tr><th>日均里程↓ / 里程价格→</th>${xs.map(x=>`<th class='num'>${x.toFixed(3)}</th>`).join("")}</tr></thead><tbody>`;
      ys.forEach(y=>{
        html += `<tr><td>${y} MW</td>`;
        xs.forEach(x=>{
          const scale = (x/priceBase)*(y/milBase);
          const irrCell = irrBase * (0.2 + 0.8*scale);     // 粗略估计
          const pctv = irrCell*100;
          const bg = pctv>=18?"#10b981":pctv>=14?"#34d399":pctv>=10?"#fde68a":pctv>=6?"#fca5a5":"#f87171";
          html += `<td class="num" style="background:${bg};color:${pctv>=10?'#0f172a':'#fff'}">${pctv.toFixed(1)}%</td>`;
        });
        html += `</tr>`;
      });
      html += `</tbody></table>`;
      mapDiv.innerHTML = html;
    }
  }

  function soc(){
    const el = document.getElementById("chart-soc");
    if(!el) return;
    const labels = Array.from({length:96},(_,i)=>`${Math.floor(i/4).toString().padStart(2,"0")}:${(i%4)*15}`.padEnd(5,"0"));
    const data = labels.map((_,i)=>{
      const t = i/4;
      return 50 + 25*Math.sin(t/3) + 8*Math.sin(t*2) + (Math.random()-0.5)*4;
    });
    register(new Chart(el,{
      type:"line",
      data:{ labels, datasets:[
        { label:"SOC (%)", data, borderColor:COLORS.purple, backgroundColor:"rgba(139,92,246,0.1)", tension:.35, fill:true, pointRadius:0 },
      ]},
      options:{ ...baseOpts, scales:{...baseOpts.scales, y:{...baseOpts.scales.y, min:0, max:100}}},
    }));
  }

  function perf(){
    const el = document.getElementById("chart-perf");
    if(!el) return;
    register(new Chart(el,{
      type:"radar",
      data:{
        labels:["K1 调节速率","K2 调节精度","K3 响应时间","可用率","响应达标率","里程合格率"],
        datasets:[{
          label:"实测", data:[1.72, 0.97, 0.99, 98.6, 99.4, 98.2],
          backgroundColor:"rgba(59,130,246,0.2)", borderColor:COLORS.blue, pointBackgroundColor:COLORS.blue,
        },{
          label:"行业均值", data:[1.45, 0.93, 0.96, 96.0, 97.0, 95.0],
          backgroundColor:"rgba(245,158,11,0.15)", borderColor:COLORS.orange, pointBackgroundColor:COLORS.orange,
        }],
      },
      options:{ responsive:true, maintainAspectRatio:false, scales:{ r:{angleLines:{color:"#e6ebf3"}, grid:{color:"#e6ebf3"}, pointLabels:{font:{size:11},color:"#6b7280"}}}},
    }));
  }

  function mileage(r){
    const el = document.getElementById("chart-mileage");
    if(!el) return;
    register(new Chart(el,{
      type:"bar",
      data:{ labels:SX_DATA.months, datasets:[{
        label:"调频里程电量（万kWh）",
        data:SX_DATA.monthFactor.map(f=>r.mileageYearWkwh*f/12),
        backgroundColor:COLORS.cyan, borderRadius:4,
      }]},
      options:baseOpts,
    }));
  }

  function payback(r){
    const el = document.getElementById("chart-payback");
    if(!el) return;
    const labels = ["建设期", ...r.yearly.map(y=>`Y${y.year}`)];
    const cum = [-r.totalCapex, ...r.yearly.map(y=>y.cumulative)];
    register(new Chart(el,{
      type:"line",
      data:{ labels, datasets:[{
        label:"累计现金流（万元）", data:cum,
        borderColor:COLORS.blue, backgroundColor:"rgba(59,130,246,0.1)", fill:true, tension:.25, pointRadius:3,
      }]},
      options:baseOpts,
    }));
  }

  return { destroyAll, donut, monthly, cashflow, period, daily, sensitivity, soc, perf, mileage, payback };
})();
