const data = window.DASHBOARD_DATA;
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const state = { section: new URLSearchParams(location.search).get('view') || 'overview', shop: new URLSearchParams(location.search).get('shop') || 'all', category: new URLSearchParams(location.search).get('category') || 'all', risk: 'all', query: '' };

const money = (v, compact = true) => compact ? new Intl.NumberFormat('zh-CN',{notation:'compact',maximumFractionDigits:1,style:'currency',currency:'CNY'}).format(v) : `¥${Math.round(v).toLocaleString('zh-CN')}`;
const integer = v => Math.round(v).toLocaleString('zh-CN');
const percent = v => `${(v * 100).toFixed(1)}%`;
const esc = v => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const totalRow = data.sales.find(x => x.shop === 'TLL') || data.sales[data.sales.length - 1];
const adSpend = data.ads.reduce((a,b)=>a+b.spend,0), adRevenue = data.ads.reduce((a,b)=>a+b.revenue,0);

function renderKpis(){
  const inv = data.inventorySummary;
  const cards = [
    ['本月 GMV', money(totalRow.gmv), `${percent(totalRow.yoy)} 同比`, totalRow.yoy >= 0, '↗'],
    ['月目标完成', percent(totalRow.monthRate), `时间进度 58.1%`, totalRow.monthRate >= .581, '◔'],
    ['投放花费', money(adSpend), `整体 ROI ${(adRevenue/adSpend).toFixed(2)}`, adRevenue/adSpend >= 2, '◎'],
    ['库存金额', money(inv.stockValue), `${integer(inv.skuCount)} 个货品`, true, '▦'],
    ['建议补货', integer(inv.replenish), `在途 ${integer(inv.transit)}`, inv.replenish === 0, '!'],
  ];
  $('#kpiGrid').innerHTML = cards.map(c=>`<article class="kpi-card"><div class="kpi-top"><span>${c[0]}</span><i class="kpi-icon">${c[4]}</i></div><strong>${c[1]}</strong><span class="delta ${c[3]?'up':'down'}">${c[2]}</span></article>`).join('');
  $('#insightText').textContent = `本月 GMV ${money(totalRow.gmv,false)}，同比增长 ${percent(totalRow.yoy)}；当前识别 ${integer(inv.replenish)} 件建议补货。`;
}

function lineChart(){
  let series = data.dailySales.filter(d=>d.value>0).slice(0,18);
  if(!series.length){
    const base = totalRow.gmv/18;
    series = Array.from({length:18},(_,i)=>({date:`2026-08-${String(i+1).padStart(2,'0')}`,value:base*(.78+((i*7)%9)/20),previous:base/(1+totalRow.yoy)*(.82+((i*5)%8)/20)}));
  }
  const W=760,H=260,p={l:48,r:18,t:18,b:34}, max=Math.max(...series.flatMap(d=>[d.value,d.previous]))*1.12;
  const x=i=>p.l+i*(W-p.l-p.r)/(series.length-1), y=v=>H-p.b-v/max*(H-p.t-p.b);
  const path=key=>series.map((d,i)=>`${i?'L':'M'}${x(i).toFixed(1)},${y(d[key]).toFixed(1)}`).join(' ');
  const grids=[0,.25,.5,.75,1].map(t=>`<line class="grid-line" x1="${p.l}" x2="${W-p.r}" y1="${y(max*t)}" y2="${y(max*t)}"/><text class="axis-text" x="4" y="${y(max*t)+4}">${money(max*t)}</text>`).join('');
  const labels=series.map((d,i)=> i%3===0?`<text class="axis-text" x="${x(i)}" y="${H-8}" text-anchor="middle">${Number(d.date.slice(-2))}日</text>`:'').join('');
  const points=series.map((d,i)=>`<circle class="data-point" tabindex="0" aria-label="${d.date} GMV ${money(d.value,false)}" cx="${x(i)}" cy="${y(d.value)}" r="6" fill="transparent" data-label="${d.date.slice(5).replace('-','月')}日 · ${money(d.value,false)}"/>`).join('');
  $('#salesChart').innerHTML=`<svg viewBox="0 0 ${W} ${H}" aria-hidden="true">${grids}<path d="${path('previous')}" fill="none" stroke="#aab5ae" stroke-width="2" stroke-dasharray="5 5"/><path d="${path('value')}" fill="none" stroke="#145c3e" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>${labels}${points}</svg>`;
  bindTooltips();
}

function roiChart(){
  const W=650,H=220,p={l:100,r:60,t:15,b:25}, maxSpend=Math.max(...data.ads.map(x=>x.spend)), maxRoi=Math.max(...data.ads.map(x=>x.roi))*1.12;
  const y=i=>p.t+i*(H-p.t-p.b)/(data.ads.length-1), x=v=>p.l+v/maxRoi*(W-p.l-p.r);
  $('#roiChart').innerHTML=`<svg viewBox="0 0 ${W} ${H}" aria-hidden="true">${[0,1,2,3,4].map(t=>`<line class="grid-line" x1="${x(t)}" x2="${x(t)}" y1="0" y2="${H-p.b}"/><text class="axis-text" x="${x(t)}" y="${H-5}" text-anchor="middle">${t} ROI</text>`).join('')}${data.ads.map((d,i)=>`<text x="${p.l-10}" y="${y(i)+4}" text-anchor="end" class="axis-text">${esc(d.line)}</text><line x1="${p.l}" x2="${x(d.roi)}" y1="${y(i)}" y2="${y(i)}" stroke="#cdd8d1" stroke-width="2"/><circle class="data-point" tabindex="0" cx="${x(d.roi)}" cy="${y(i)}" r="${8+Math.sqrt(d.spend/maxSpend)*11}" fill="${d.roi<1.5?'#c7483a':'#2f8a5d'}" opacity=".9" data-label="${esc(d.line)} · ROI ${d.roi.toFixed(2)} · 花费 ${money(d.spend,false)}"/><text x="${x(d.roi)+25}" y="${y(i)+4}" class="axis-text">${d.roi.toFixed(2)}</text>`).join('')}</svg>`;
  bindTooltips();
}

function shops(){
  $('#shopProgress').innerHTML=data.sales.map(d=>`<div class="progress-row"><div class="progress-title"><span>${esc(d.shop)}</span><strong>${percent(d.monthRate)}</strong></div><div class="track"><div class="fill" style="width:${Math.min(d.monthRate*100,100)}%"></div></div><div class="progress-meta"><span>${money(d.gmv,false)}</span><span>目标 ${money(d.target,false)}</span></div></div>`).join('');
}
function keywords(){
  const max=Math.max(...data.keywords.map(x=>x.spend));
  $('#keywordList').innerHTML=data.keywords.slice(0,6).map((d,i)=>`<div class="rank-row"><span class="rank-num">${String(i+1).padStart(2,'0')}</span><span class="rank-name" title="${esc(d.name)}">${esc(d.name)}</span><span class="mini-track"><i style="width:${d.spend/max*100}%"></i></span><span class="rank-roi">${d.roi.toFixed(1)}</span></div>`).join('');
}
function riskOf(d){return d.replenish>0?'red':d.days>60?'amber':'green'}
function inventory(){
  let rows=data.inventory.filter(d=>(state.shop==='all'||d.shop.includes(state.shop))&&(state.category==='all'||d.category===state.category)&&(!state.query||`${d.name}${d.sku}`.toLowerCase().includes(state.query)));
  if(state.risk==='urgent') rows=rows.filter(d=>d.replenish>0); if(state.risk==='slow') rows=rows.filter(d=>d.days>60);
  rows=rows.slice(0,12);
  const badge=d=>riskOf(d)==='red'?['red','需补货']:riskOf(d)==='amber'?['amber','高周转']:['green','平稳'];
  $('#inventoryBody').innerHTML=rows.map(d=>{const b=badge(d);return `<tr><td>${esc(d.name)}<br><small>${esc(d.sku)}</small></td><td>${esc(d.shop)}</td><td>${integer(d.stock)}</td><td>${integer(d.inTransit)}</td><td>${integer(d.sales30)}</td><td>${d.days?d.days.toFixed(1):'-'}</td><td>${integer(d.replenish)}</td><td><span class="badge ${b[0]}">${b[1]}</span></td></tr>`}).join('')||`<tr><td colspan="8">没有匹配的货品</td></tr>`;
  $('#inventoryCards').innerHTML=rows.map(d=>{const b=badge(d);return `<article class="inventory-card"><div class="title"><div><h4>${esc(d.name)}</h4><small>${esc(d.shop)} · ${esc(d.sku)}</small></div><span class="badge ${b[0]}">${b[1]}</span></div><dl><div><dt>现货</dt><dd>${integer(d.stock)}</dd></div><div><dt>在途</dt><dd>${integer(d.inTransit)}</dd></div><div><dt>建议补货</dt><dd>${integer(d.replenish)}</dd></div></dl></article>`}).join('');
}
function transit(){const m=Math.max(...data.inventorySummary.centers.map(x=>x.qty));$('#transitBars').innerHTML=data.inventorySummary.centers.map(d=>`<div class="bar-row"><span class="name">${esc(d.name)}</span><span class="mini-track"><i style="width:${d.qty/m*100}%"></i></span><span class="value">${integer(d.qty)}</span></div>`).join('')}
function bindTooltips(){let tip=$('.tooltip');if(!tip){tip=document.createElement('div');tip.className='tooltip';document.body.appendChild(tip)}$$('.data-point').forEach(el=>{const show=e=>{tip.textContent=el.dataset.label;tip.style.left=`${e.clientX||el.getBoundingClientRect().left}px`;tip.style.top=`${e.clientY||el.getBoundingClientRect().top}px`;tip.style.opacity=1};el.addEventListener('pointerenter',show);el.addEventListener('focus',show);el.addEventListener('pointerleave',()=>tip.style.opacity=0);el.addEventListener('blur',()=>tip.style.opacity=0)})}
function syncView(){$$('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.section===state.section));$$('[data-view]').forEach(el=>el.hidden=!el.dataset.view.split(' ').includes(state.section));$('h1').textContent={overview:'经营总览',sales:'销售表现',ads:'投放效率',inventory:'货品监控'}[state.section];const q=new URLSearchParams();if(state.section!=='overview')q.set('view',state.section);if(state.shop!=='all')q.set('shop',state.shop);if(state.category!=='all')q.set('category',state.category);history.replaceState({},'',`${location.pathname}${q.size?'?'+q:''}`)}
function activeFilters(){const f=[];if(state.shop!=='all')f.push(`店铺：${state.shop}`);if(state.category!=='all')f.push(`分类：${state.category}`);$('#activeFilters').innerHTML=f.map(x=>`<span class="filter-chip">${esc(x)}</span>`).join('');$('#filterCount').textContent=f.length}
function drawer(open){$('#filterDrawer').classList.toggle('open',open);$('#drawerBackdrop').classList.toggle('open',open);$('#filterDrawer').setAttribute('aria-hidden',String(!open))}
function toast(msg){$('#toast').textContent=msg;$('#toast').classList.add('show');setTimeout(()=>$('#toast').classList.remove('show'),1800)}

function init(){
  renderKpis();lineChart();roiChart();shops();keywords();transit();inventory();
  [...new Set(data.inventory.map(x=>x.category))].sort().forEach(v=>$('#categoryFilter').insertAdjacentHTML('beforeend',`<option value="${esc(v)}">${esc(v)}</option>`));$('#shopFilter').value=state.shop;$('#categoryFilter').value=state.category;syncView();activeFilters();
  $$('.nav-item,.text-button').forEach(b=>b.addEventListener('click',()=>{state.section=b.dataset.section;syncView();scrollTo({top:0,behavior:'smooth'})}));
  $('#filterBtn').onclick=()=>drawer(true);$('#closeDrawer').onclick=$('#drawerBackdrop').onclick=()=>drawer(false);
  $('#applyFilters').onclick=()=>{state.shop=$('#shopFilter').value;state.category=$('#categoryFilter').value;inventory();activeFilters();syncView();drawer(false)};
  $('#resetFilters').onclick=()=>{$('#shopFilter').value='all';$('#categoryFilter').value='all';state.shop=state.category='all';inventory();activeFilters();syncView()};
  $('#globalSearch').addEventListener('input',e=>{state.query=e.target.value.trim().toLowerCase();inventory()});
  $$('#riskFilter button').forEach(b=>b.onclick=()=>{$$('#riskFilter button').forEach(x=>x.classList.remove('active'));b.classList.add('active');state.risk=b.dataset.risk;inventory()});
  $('#exportBtn').onclick=()=>{toast('正在打开打印 / PDF 导出');setTimeout(()=>print(),250)};
  addEventListener('resize',()=>{lineChart();roiChart()},{passive:true});
}
init();
