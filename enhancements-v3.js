(function(){
  const originalRenderFilters = renderFilters;

  function skuOptions(query=''){
    const q=query.trim().toLowerCase(), selected=$('#skuFilter').value||state.sku||'all';
    const options=cube.skuIndex.filter(x=>(state.line==='all'||x.line===state.line)&&(!q||`${x.name}${x.sku}`.toLowerCase().includes(q))).slice(0,120);
    $('#skuFilter').innerHTML=`<option value="all">全部 SKU（${options.length}）</option>`+options.map(x=>`<option value="${esc(x.sku)}">${esc(x.name)} · ${esc(x.sku)}</option>`).join('');
    if([...$('#skuFilter').options].some(o=>o.value===selected))$('#skuFilter').value=selected;
  }

  renderBreadcrumb = function(){
    let html='<button data-level="all">全部类目</button>';
    if(state.line!=='all')html+=`<span>›</span><button data-level="line">${esc(state.line)}</button>`;
    if(state.sku){const item=cube.skuIndex.find(x=>x.sku===state.sku);html+=`<span>›</span><strong>${esc(item?.name||state.sku)}</strong>`}
    $('#breadcrumb').innerHTML=html;
    const back=$('#backLevel');back.hidden=state.line==='all'&&!state.sku;back.textContent=state.sku?'← 返回所属类目':'← 返回全部类目';
    back.onclick=()=>{if(state.sku)state.sku=null;else state.line='all';$('#lineFilter').value=state.line;skuOptions();renderAll()};
    $$('#breadcrumb button').forEach(b=>b.onclick=()=>{if(b.dataset.level==='all'){state.line='all';state.sku=null}else if(b.dataset.level==='line')state.sku=null;$('#lineFilter').value=state.line;skuOptions();renderAll()});
  };

  renderFilters = function(){
    originalRenderFilters();
    const host=$('#activeFilters');
    [...host.children].forEach((chip,i)=>{const labels=[];if(state.shop!=='all')labels.push('shop');if(state.line!=='all')labels.push('line');if(state.sku)labels.push('sku');const key=labels[i];chip.outerHTML=`<button class="filter-chip removable" data-clear="${key}" title="点击移除">${chip.textContent}<b>×</b></button>`});
    $$('.filter-chip.removable').forEach(b=>b.onclick=()=>{if(b.dataset.clear==='shop')state.shop='all';if(b.dataset.clear==='line'){state.line='all';state.sku=null}if(b.dataset.clear==='sku')state.sku=null;$('#shopFilter').value=state.shop;$('#lineFilter').value=state.line;skuOptions();renderAll()});
  };

  $('#lineFilter').addEventListener('change',()=>{const previous=state.line;state.line=$('#lineFilter').value;if(previous!==state.line)$('#skuFilter').value='all';skuOptions($('#skuSearch').value)});
  $('#skuSearch').addEventListener('input',e=>skuOptions(e.target.value));
  $('#skuFilter').addEventListener('dblclick',()=>$('#applyFilters').click());
  $('#applyFilters').onclick=()=>{state.shop=$('#shopFilter').value;state.line=$('#lineFilter').value;state.sku=$('#skuFilter').value==='all'?null:$('#skuFilter').value;if(state.sku&&state.line==='all'){const item=cube.skuIndex.find(x=>x.sku===state.sku);if(item)state.line=item.line}drawer(false);renderAll();if(state.sku)setTimeout(()=>$('#skuDetail').scrollIntoView({behavior:'smooth',block:'start'}),100)};
  $('#resetFilters').onclick=()=>{state.shop=state.line='all';state.sku=null;$('#shopFilter').value=$('#lineFilter').value='all';$('#skuSearch').value='';skuOptions();renderAll()};
  $('#closeSku').onclick=()=>{state.sku=null;$('#skuFilter').value='all';renderAll();$('#lineRanking').scrollIntoView({behavior:'smooth',block:'center'})};
  skuOptions();renderAll();
})();
