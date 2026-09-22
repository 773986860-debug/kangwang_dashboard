(function(){
  'use strict';
  let attempts=0,trafficMetric='uv';
  function boot(){
    attempts++;
    if(!window.DASHBOARD_TRAFFIC||typeof state==='undefined'||typeof renderKpis!=='function'||!document.querySelector('#kpiGrid')){if(attempts<200)setTimeout(boot,50);return}
    if(document.documentElement.dataset.trafficSource==='ready')return;document.documentElement.dataset.trafficSource='ready';install();
    const previous=renderKpis;renderKpis=function(list){previous(list);renderTraffic()};renderTraffic();
  }
  function install(){
    if(document.querySelector('#trafficSources'))return;const panel=document.createElement('section');panel.id='trafficSources';panel.className='panel traffic-sources';panel.dataset.view='overview sales';panel.innerHTML=[
      '<div class="panel-head traffic-head"><div><span class="section-kicker">类目流量来源</span><h3>流量结构与成交贡献</h3><p id="trafficScope"></p></div><div class="segmented" id="trafficMetric"><button class="active" data-metric="uv">按访客</button><button data-metric="gmv">按成交金额</button></div></div>',
      '<div class="traffic-summary" id="trafficSummary"></div><div class="traffic-layout"><div><h4 id="trafficRankTitle">来源贡献排行</h4><div id="trafficBars" class="traffic-bars"></div></div>',
      '<div class="traffic-table-wrap"><table class="traffic-table"><thead><tr><th>流量来源</th><th>访客</th><th>访客贡献</th><th>浏览量</th><th>成交转化</th><th>成交金额</th><th>金额贡献</th><th>较上月同期访客</th></tr></thead><tbody id="trafficBody"></tbody></table></div></div><p class="traffic-note">访客与成交按来源汇总；多类目选择时为所选类目合计。</p>'
    ].join('');const goal=document.querySelector('#goalProgress');(goal||document.querySelector('#kpiGrid')).insertAdjacentElement('afterend',panel);document.querySelectorAll('#trafficMetric button').forEach(b=>b.onclick=()=>{trafficMetric=b.dataset.metric;document.querySelectorAll('#trafficMetric button').forEach(x=>x.classList.toggle('active',x===b));renderTraffic()});
  }
  const n=v=>Number(v)||0,fmt=v=>Math.round(n(v)).toLocaleString('zh-CN'),money=v=>new Intl.NumberFormat('zh-CN',{style:'currency',currency:'CNY',notation:'compact',maximumFractionDigits:1}).format(n(v)),pct=v=>(n(v)*100).toFixed(1)+'%';
  function previousMonth(iso){if(!iso)return null;const p=iso.split('-').map(Number),y=p[1]===1?p[0]-1:p[0],m=p[1]===1?12:p[1]-1,d=Math.min(p[2],new Date(y,m,0).getDate());return y+'-'+String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0')}
  function categories(){const lines=Array.isArray(state.lines)?state.lines:(state.line&&state.line!=='all'?[state.line]:[]);return lines}
  function scoped(start,end){const lines=categories();return window.DASHBOARD_TRAFFIC.rows.filter(x=>x.date>=start&&x.date<=end&&(!lines.length||lines.includes(x.category)))}
  function total(rows){return rows.reduce((a,x)=>{['pv','uv','cart','orderCustomers','orderAmount','buyers','gmv','orders'].forEach(k=>a[k]+=n(x[k]));return a},{pv:0,uv:0,cart:0,orderCustomers:0,orderAmount:0,buyers:0,gmv:0,orders:0})}
  function delta(current,previous){return previous?current/previous-1:null}
  function deltaText(value){return value==null?'上月同期无数据':('较上月同期 '+(value>=0?'+':'')+(value*100).toFixed(1)+'%')}
  function aggregate(rows){const map=new Map();rows.forEach(x=>{const key=x.primary+'｜'+x.secondary,a=map.get(key)||{key,primary:x.primary,secondary:x.secondary,pv:0,uv:0,buyers:0,gmv:0,orders:0};['pv','uv','buyers','gmv','orders'].forEach(k=>a[k]+=n(x[k]));map.set(key,a)});return[...map.values()]}
  function renderTraffic(){
    const panel=document.querySelector('#trafficSources');if(!panel)return;panel.hidden=!['overview','sales'].includes(state.section);if(panel.hidden)return;if(!state.start||!state.end){if(typeof resolveDates==='function')resolveDates();if(!state.start||!state.end)return}const start=state.start,end=state.end,prevStart=previousMonth(start),prevEnd=previousMonth(end),currentRows=scoped(start,end),previousRows=scoped(prevStart,prevEnd),cur=total(currentRows),prev=total(previousRows),lines=categories();
    document.querySelector('#trafficScope').textContent=(lines.length?lines.join(' + '):'全部类目')+' · '+start.replaceAll('-','.')+'—'+end.replaceAll('-','.')+'，对比上月同期 '+prevStart.replaceAll('-','.')+'—'+prevEnd.replaceAll('-','.');
    const cards=[['访客数',fmt(cur.uv),deltaText(delta(cur.uv,prev.uv))],['浏览量',fmt(cur.pv),deltaText(delta(cur.pv,prev.pv))],['成交客户',fmt(cur.buyers),deltaText(delta(cur.buyers,prev.buyers))],['成交转化率',pct(cur.uv?cur.buyers/cur.uv:0),(prev.uv?'上月同期 '+pct(prev.buyers/prev.uv):'上月同期无数据')],['成交金额',money(cur.gmv),deltaText(delta(cur.gmv,prev.gmv))]];
    document.querySelector('#trafficSummary').innerHTML=cards.map(x=>'<article><span>'+esc(x[0])+'</span><strong>'+esc(x[1])+'</strong><small class="'+(x[2].includes('-')?'down':'')+'">'+esc(x[2])+'</small></article>').join('');
    const sources=aggregate(currentRows),previousMap=new Map(aggregate(previousRows).map(x=>[x.key,x])),metricTotal=sources.reduce((s,x)=>s+n(x[trafficMetric]),0),uvTotal=sources.reduce((s,x)=>s+x.uv,0),gmvTotal=sources.reduce((s,x)=>s+x.gmv,0);sources.sort((a,b)=>n(b[trafficMetric])-n(a[trafficMetric]));const top=sources.slice(0,15),max=Math.max(1,...top.map(x=>n(x[trafficMetric])));
    document.querySelector('#trafficRankTitle').textContent=trafficMetric==='uv'?'来源访客贡献':'来源成交贡献';document.querySelector('#trafficBars').innerHTML=top.slice(0,10).map(x=>'<div class="traffic-bar"><div><strong>'+esc(x.secondary)+'</strong><small>'+esc(x.primary)+'</small></div><span><i style="width:'+(n(x[trafficMetric])/max*100).toFixed(1)+'%"></i></span><b>'+(trafficMetric==='uv'?fmt(x.uv):money(x.gmv))+'<small>'+pct(metricTotal?n(x[trafficMetric])/metricTotal:0)+'</small></b></div>').join('')||'<div class="traffic-empty">当前类目或日期没有流量来源数据</div>';
    document.querySelector('#trafficBody').innerHTML=top.map(x=>{const old=previousMap.get(x.key),change=old&&old.uv?x.uv/old.uv-1:null;return'<tr><td><strong>'+esc(x.secondary)+'</strong><small>'+esc(x.primary)+'</small></td><td>'+fmt(x.uv)+'</td><td>'+pct(uvTotal?x.uv/uvTotal:0)+'</td><td>'+fmt(x.pv)+'</td><td>'+pct(x.uv?x.buyers/x.uv:0)+'</td><td>'+money(x.gmv)+'</td><td>'+pct(gmvTotal?x.gmv/gmvTotal:0)+'</td><td class="'+(change!=null&&change<0?'down':'up')+'">'+(change==null?'—':((change>=0?'+':'')+(change*100).toFixed(1)+'%'))+'</td></tr>'}).join('')||'<tr><td colspan="8" class="traffic-empty">当前类目或日期没有流量来源数据</td></tr>';
  }
  boot();
})();
