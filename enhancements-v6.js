(function bootCategoryClarity(attempt=0){
  if(!document.querySelector('#ketoconazoleParent')){if(attempt<40)setTimeout(()=>bootCategoryClarity(attempt+1),50);return}
  if(document.documentElement.dataset.categoryClarity)return;
  document.documentElement.dataset.categoryClarity='true';
  const originalRenderKpis=renderKpis;
  renderKpis=function(list){
    originalRenderKpis(list);
    const t=totals(list),roi=t.spend?t.adRevenue/t.spend:0;
    const direct=aggregate(list,'line'), selenium=direct.find(x=>x.id==='二硫化硒'), youth=direct.find(x=>x.id==='二硫化硒青少年');
    const root=new Map();direct.forEach(x=>{const id=['酮康唑 OTC','酮康唑 RX'].includes(x.id)?'酮康唑':x.id,current=root.get(id)||{id,gmv:0};current.gmv+=x.gmv;root.set(id,current)});
    const top=[...root.values()].sort((a,b)=>b.gmv-a.gmv)[0];
    if(!t.gmv){$('#insightTitle').textContent='当前范围暂无经营数据';$('#insightText').textContent='请调整日期、店铺或类目筛选。';return}
    const title=top?.id==='二硫化硒'?'二硫化硒（不含青少年）':top?.id||'当前类目';
    $('#insightTitle').textContent=`${title}贡献额领先，投放 ROI ${roi.toFixed(2)}`;
    const split=selenium&&youth?`二硫化硒 ${money(selenium.gmv,false)}；二硫化硒青少年 ${money(youth.gmv,false)}，两类独立统计。`:`所选时段 GMV ${money(t.gmv,false)}，成交 ${integer(t.orders)} 单。`;
    $('#insightText').textContent=split;
  };
  $$('#lineMulti label').forEach(label=>{const value=label.querySelector('input')?.value;if(value==='二硫化硒'||value==='二硫化硒青少年'){const span=label.querySelector('span');if(span&&!span.querySelector('small'))span.insertAdjacentHTML('beforeend',' <small class="independent-note">独立类目</small>')}});
  renderAll();
})();
