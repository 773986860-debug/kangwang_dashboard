(function bootSkuMulti(attempt=0){
  if(!document.querySelector('#ketoconazoleParent')||!document.documentElement.dataset.categoryClarity){if(attempt<50)setTimeout(()=>bootSkuMulti(attempt+1),50);return}
  if(document.querySelector('#skuMulti'))return;
  const url=new URLSearchParams(location.search),urlSkus=(url.get('skus')||'').split(',').filter(Boolean);
  state.skus=urlSkus.length?urlSkus:[];
  const oldSelect=$('#skuFilter');oldSelect.hidden=true;
  oldSelect.insertAdjacentHTML('afterend','<div id="skuMulti" class="sku-multi"><div class="sku-multi-actions"><button type="button" data-sku-action="visible">全选可见</button><button type="button" data-sku-action="clear">清空 SKU</button><span id="skuSelectedCount">已选 0</span></div><div id="skuChecks"></div></div>');

  const selectedLinesFromUi=()=>$$('#lineMulti input:checked').filter(x=>x.id!=='ketoconazoleParent').map(x=>x.value);
  const selectedSkusFromUi=()=>$$('#skuChecks input:checked').map(x=>x.value);
  function buildSkuChecks(query=''){
    const pending=new Set([...state.skus,...selectedSkusFromUi()]),lines=selectedLinesFromUi(),q=query.trim().toLowerCase();
    const candidates=cube.skuIndex.filter(x=>(!lines.length||lines.includes(x.line))&&(!q||`${x.name}${x.sku}`.toLowerCase().includes(q))).slice(0,186);
    $('#skuChecks').innerHTML=candidates.map(x=>`<label><input type="checkbox" value="${esc(x.sku)}" ${pending.has(x.sku)?'checked':''}><span><b>${esc(x.name)}</b><small>${esc(x.line)} · ${esc(x.sku)}</small></span></label>`).join('')||'<div class="sku-empty">没有匹配的 SKU</div>';
    updateCount();
    $$('#skuChecks input').forEach(x=>x.onchange=updateCount);
  }
  function updateCount(){const count=selectedSkusFromUi().length;$('#skuSelectedCount').textContent=`已选 ${count}`}
  function syncSkuChecks(){const chosen=new Set(state.skus);$$('#skuChecks input').forEach(x=>x.checked=chosen.has(x.value));updateCount()}

  rows=function(){return cube.dailySku.filter(r=>r.date>=state.start&&r.date<=state.end&&(state.shop==='all'||r.shop===state.shop)&&(!state.lines.length||state.lines.includes(r.line))&&(!state.skus.length||state.skus.includes(r.sku)))};
  const previousSync=syncUrl;syncUrl=function(){previousSync();const q=new URLSearchParams(location.search);q.delete('sku');if(state.skus.length)q.set('skus',state.skus.join(','));else q.delete('skus');if(state.sku)q.set('sku',state.sku);history.replaceState({},'',`${location.pathname}?${q}`)};
  const previousDetail=renderDetail;renderDetail=function(list){previousDetail(state.sku?list.filter(r=>r.sku===state.sku):list)};
  renderFilters=function(){const chips=[];if(state.shop!=='all')chips.push({key:'shop',label:`店铺：${state.shop}`});const kids=['酮康唑 OTC','酮康唑 RX'],both=kids.every(x=>state.lines.includes(x));if(both)chips.push({key:'ket',label:'类目：酮康唑（OTC + RX）'});state.lines.filter(x=>!both||!kids.includes(x)).forEach(x=>chips.push({key:'line',value:x,label:`类目：${x}`}));state.skus.forEach(s=>{const item=cube.skuIndex.find(x=>x.sku===s);chips.push({key:'filterSku',value:s,label:`SKU：${item?.name||s}`})});if(state.sku)chips.push({key:'detail',label:`正在查看：${state.sku}`});$('#activeFilters').innerHTML=chips.map(x=>`<button class="filter-chip removable" data-clear="${x.key}" data-value="${esc(x.value||'')}">${esc(x.label)}<b>×</b></button>`).join('');$('#filterCount').textContent=chips.filter(x=>x.key!=='detail').length;$$('.filter-chip.removable').forEach(b=>b.onclick=()=>{if(b.dataset.clear==='shop')state.shop='all';if(b.dataset.clear==='ket')state.lines=state.lines.filter(x=>!kids.includes(x));if(b.dataset.clear==='line')state.lines=state.lines.filter(x=>x!==b.dataset.value);if(b.dataset.clear==='filterSku')state.skus=state.skus.filter(x=>x!==b.dataset.value);if(b.dataset.clear==='detail')state.sku=null;buildSkuChecks($('#skuSearch').value);syncSkuChecks();renderAll()})};
  renderInventory=function(){let rs=base.inventory.filter(d=>(state.shop==='all'||d.shop.includes(state.shop))&&(!state.skus.length||state.skus.includes(d.sku))&&(!state.query||`${d.name}${d.sku}`.toLowerCase().includes(state.query)));if(state.risk==='urgent')rs=rs.filter(d=>d.replenish>0);if(state.risk==='slow')rs=rs.filter(d=>d.days>60);rs=rs.slice(0,12);const badge=d=>d.replenish>0?['red','需补货']:d.days>60?['amber','高周转']:['green','平稳'];$('#inventoryBody').innerHTML=rs.map(d=>{const b=badge(d);return`<tr><td>${esc(d.name)}<br><small>${esc(d.sku)}</small></td><td>${esc(d.shop)}</td><td>${integer(d.stock)}</td><td>${integer(d.inTransit)}</td><td>${integer(d.sales30)}</td><td>${d.days?d.days.toFixed(1):'-'}</td><td>${integer(d.replenish)}</td><td><span class="badge ${b[0]}">${b[1]}</span></td></tr>`}).join('')||'<tr><td colspan="8">库存表中没有匹配记录</td></tr>';$('#inventoryCards').innerHTML=rs.map(d=>{const b=badge(d);return`<article class="inventory-card"><div class="title"><div><h4>${esc(d.name)}</h4><small>${esc(d.shop)} · ${esc(d.sku)}</small></div><span class="badge ${b[0]}">${b[1]}</span></div><dl><div><dt>现货</dt><dd>${integer(d.stock)}</dd></div><div><dt>在途</dt><dd>${integer(d.inTransit)}</dd></div><div><dt>建议补货</dt><dd>${integer(d.replenish)}</dd></div></dl></article>`}).join('')};

  $('#skuSearch').oninput=e=>buildSkuChecks(e.target.value);
  $$('#lineMulti input').forEach(x=>{const old=x.onchange;x.onchange=e=>{if(old)old.call(x,e);buildSkuChecks($('#skuSearch').value)}});
  $$('#lineMulti button').forEach(x=>{const old=x.onclick;x.onclick=e=>{if(old)old.call(x,e);buildSkuChecks($('#skuSearch').value)}});
  $$('[data-sku-action]').forEach(b=>b.onclick=()=>{if(b.dataset.skuAction==='visible')$$('#skuChecks input').forEach(x=>x.checked=true);else{state.skus=[];$$('#skuChecks input').forEach(x=>x.checked=false)}updateCount()});
  $('#applyFilters').onclick=()=>{state.shop=$('#shopFilter').value;state.lines=selectedLinesFromUi();state.skus=selectedSkusFromUi();state.categoryFocus=['酮康唑 OTC','酮康唑 RX'].every(x=>state.lines.includes(x))?'酮康唑':null;state.sku=null;drawer(false);renderAll()};
  $('#resetFilters').onclick=()=>{state.shop='all';state.lines=[];state.skus=[];state.sku=null;state.categoryFocus=null;$('#shopFilter').value='all';$('#skuSearch').value='';$$('#lineMulti input').forEach(x=>{x.checked=false;x.indeterminate=false});buildSkuChecks();renderAll()};
  $('#closeSku').onclick=()=>{state.sku=null;renderAll();$('#skuRanking').scrollIntoView({behavior:'smooth',block:'center'})};
  buildSkuChecks();renderAll();
})();
