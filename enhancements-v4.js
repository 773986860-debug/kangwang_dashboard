(function(){
  if(!document.querySelector('#skuFilter') || document.querySelector('#lineMulti')) return;
  const allLines=[...new Set(cube.skuIndex.map(x=>x.line))].sort();
  const urlLines=(new URLSearchParams(location.search).get('lines')||'').split(',').map(decodeURIComponent).filter(Boolean);
  state.lines=urlLines.length?urlLines:(state.line!=='all'?[state.line]:[]);
  state.line='all';

  const oldSelect=$('#lineFilter');oldSelect.hidden=true;
  oldSelect.insertAdjacentHTML('afterend',`<div id="lineMulti" class="multi-select"><div class="multi-actions"><button type="button" data-multi="all">全选</button><button type="button" data-multi="clear">清空</button></div>${allLines.map(x=>`<label><input type="checkbox" value="${esc(x)}"> <span>${esc(x)}</span></label>`).join('')}</div>`);

  function checkedLines(){return $$('#lineMulti input:checked').map(x=>x.value)}
  function syncChecks(){const chosen=new Set(state.lines);$$('#lineMulti input').forEach(x=>x.checked=chosen.has(x.value))}
  function refreshSku(query=''){
    const q=query.trim().toLowerCase(), selected=state.sku||$('#skuFilter').value||'all', selectedLines=checkedLines();
    const list=cube.skuIndex.filter(x=>(!selectedLines.length||selectedLines.includes(x.line))&&(!q||`${x.name}${x.sku}`.toLowerCase().includes(q))).slice(0,160);
    $('#skuFilter').innerHTML=`<option value="all">全部 SKU（${list.length}）</option>`+list.map(x=>`<option value="${esc(x.sku)}">${esc(x.line)}｜${esc(x.name)} · ${esc(x.sku)}</option>`).join('');
    if([...$('#skuFilter').options].some(o=>o.value===selected))$('#skuFilter').value=selected;
  }

  rows=function(){return cube.dailySku.filter(r=>r.date>=state.start&&r.date<=state.end&&(state.shop==='all'||r.shop===state.shop)&&(!state.lines.length||state.lines.includes(r.line))&&(!state.sku||r.sku===state.sku))};
  syncUrl=function(){const q=new URLSearchParams();if(state.section!=='overview')q.set('view',state.section);q.set('range',state.range);q.set('start',state.start);q.set('end',state.end);if(state.shop!=='all')q.set('shop',state.shop);if(state.lines.length)q.set('lines',state.lines.join(','));if(state.sku)q.set('sku',state.sku);history.replaceState({},'',`${location.pathname}?${q}`)};
  renderBreadcrumb=function(){let html='<button data-level="all">全部类目</button>';if(state.lines.length)html+=`<span>›</span><strong>${state.lines.map(esc).join(' + ')}</strong>`;if(state.sku){const item=cube.skuIndex.find(x=>x.sku===state.sku);html+=`<span>›</span><strong>${esc(item?.name||state.sku)}</strong>`}$('#breadcrumb').innerHTML=html;const back=$('#backLevel');back.hidden=!state.lines.length&&!state.sku;back.textContent=state.sku?'← 返回类目组合':'← 清除类目筛选';back.onclick=()=>{if(state.sku)state.sku=null;else state.lines=[];syncChecks();refreshSku();renderAll()};$('#breadcrumb [data-level="all"]').onclick=()=>{state.lines=[];state.sku=null;syncChecks();refreshSku();renderAll()}};
  renderFilters=function(){const chips=[];if(state.shop!=='all')chips.push({key:'shop',label:`店铺：${state.shop}`});state.lines.forEach(x=>chips.push({key:'line',value:x,label:`类目：${x}`}));if(state.sku)chips.push({key:'sku',label:`SKU：${state.sku}`});$('#activeFilters').innerHTML=chips.map(x=>`<button class="filter-chip removable" data-clear="${x.key}" data-value="${esc(x.value||'')}" title="点击移除">${esc(x.label)}<b>×</b></button>`).join('');$('#filterCount').textContent=chips.length;$$('.filter-chip.removable').forEach(b=>b.onclick=()=>{if(b.dataset.clear==='shop')state.shop='all';if(b.dataset.clear==='line')state.lines=state.lines.filter(x=>x!==b.dataset.value);if(b.dataset.clear==='sku')state.sku=null;$('#shopFilter').value=state.shop;syncChecks();refreshSku();renderAll()})};
  renderLines=function(list){const lines=aggregate(list,'line').sort((a,b)=>b.gmv-a.gmv),max=Math.max(...lines.map(x=>x.gmv),1);$('#lineRanking').innerHTML=lines.map(d=>`<button class="drill-row ${state.lines.includes(d.id)?'selected':''}" data-line="${esc(d.id)}"><strong>${esc(d.id)}</strong><span class="mini-track"><i style="width:${d.gmv/max*100}%"></i></span><span class="value">${money(d.gmv)}</span></button>`).join('')||'<div class="empty-state">暂无类目数据</div>';$$('.drill-row').forEach(b=>b.onclick=()=>{state.sku=null;state.lines=state.lines.includes(b.dataset.line)?state.lines.filter(x=>x!==b.dataset.line):[...state.lines,b.dataset.line];syncChecks();refreshSku();renderAll()})};

  $$('#lineMulti input').forEach(x=>x.onchange=()=>refreshSku($('#skuSearch').value));
  $$('#lineMulti [data-multi]').forEach(b=>b.onclick=()=>{$$('#lineMulti input').forEach(x=>x.checked=b.dataset.multi==='all');refreshSku($('#skuSearch').value)});
  $('#skuSearch').oninput=e=>refreshSku(e.target.value);
  $('#applyFilters').onclick=()=>{state.shop=$('#shopFilter').value;state.lines=checkedLines();state.sku=$('#skuFilter').value==='all'?null:$('#skuFilter').value;drawer(false);renderAll();if(state.sku)setTimeout(()=>$('#skuDetail').scrollIntoView({behavior:'smooth',block:'start'}),100)};
  $('#resetFilters').onclick=()=>{state.shop='all';state.lines=[];state.sku=null;$('#shopFilter').value='all';$('#skuSearch').value='';syncChecks();refreshSku();renderAll()};
  $('#closeSku').onclick=()=>{state.sku=null;$('#skuFilter').value='all';renderAll();$('#lineRanking').scrollIntoView({behavior:'smooth',block:'center'})};
  syncChecks();refreshSku();renderAll();
})();
