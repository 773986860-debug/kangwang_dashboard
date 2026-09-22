(function(){
  'use strict';
  let attempts=0;
  function boot(){
    attempts++;
    if(typeof base==='undefined'||typeof state==='undefined'||typeof renderKpis!=='function'||!document.querySelector('#kpiGrid')){if(attempts<160)setTimeout(boot,50);return}
    if(document.documentElement.dataset.goalProgress==='ready')return;
    document.documentElement.dataset.goalProgress='ready';install();
    const previous=renderKpis;renderKpis=function(list){previous(list);renderGoals()};renderGoals();
  }
  function install(){
    if(document.querySelector('#goalProgress'))return;
    const section=document.createElement('section');section.id='goalProgress';section.className='panel goal-progress';section.dataset.view='overview sales ads';
    section.innerHTML='<div class="panel-head goal-head"><div><span class="section-kicker">目标管理</span><h3>月度目标与达成进度</h3><p id="goalScope"></p></div><div class="goal-legend"><span><i class="goal-dot actual"></i>实际达成</span><span><i class="goal-dot time"></i>时间进度</span></div></div><div id="goalSummary" class="goal-summary"></div><div class="goal-columns"><div><h4>销售目标</h4><div id="categoryGoals" class="goal-list"></div></div><div><h4>投放预算</h4><div id="adGoals" class="goal-list"></div></div></div><div id="skuGoals" class="sku-goals"></div>';
    document.querySelector('#kpiGrid').insertAdjacentElement('afterend',section);
  }
  const n=v=>Number(v)||0;
  const yuan=v=>new Intl.NumberFormat('zh-CN',{style:'currency',currency:'CNY',notation:'compact',maximumFractionDigits:1}).format(v||0);
  const percent=v=>v==null?'未设置':(v*100).toFixed(1)+'%';
  function selectedCategories(){const lines=Array.isArray(state.lines)?state.lines:[];return lines.length?lines:(state.line&&state.line!=='all'?[state.line]:[])}
  function matchesCategory(name,selected){if(!selected.length)return true;if(selected.includes(name))return true;if(name==='酮康唑'&&selected.includes('酮康唑 OTC')&&selected.includes('酮康唑 RX'))return true;return false}
  function renderGoals(){
    const host=document.querySelector('#goalProgress'),g=base.goals;if(!host)return;
    if(!g||!g.overall){host.hidden=true;return}host.hidden=false;
    const selected=selectedCategories(),skus=Array.isArray(state.skus)?state.skus:[];if(state.sku&&!skus.includes(state.sku))skus.push(state.sku);
    const all=!selected.length&&!skus.length,o=g.overall,time=n(o.timeProgress),att=n(o.attainment),variance=att-time;
    document.querySelector('#goalScope').textContent=g.month.replace('-','年')+'月 · 截至 '+g.snapshot.slice(5).replace('-','月')+'日；目标模块为月累计口径，不随上方日期区间变化';
    const summary=all?[
      ['月度 GMV 目标',yuan(o.gmvTarget),'全渠道目标'],['MTD 实际',yuan(o.actual),'截至当前快照'],['目标达成率',percent(o.attainment),'已完成月目标'],['时间进度',percent(o.timeProgress),'本月应有进度'],['进度偏差',(variance>=0?'+':'')+(variance*100).toFixed(1)+'pp',variance>=0?'领先时间进度':'落后时间进度']
    ]:[['筛选目标范围',selected.length?selected.join(' + '):(skus.length+' 个 SKU'),'按当前类目 / SKU 筛选'],['数据月份',g.month.replace('-','年')+'月','截至 '+g.snapshot],['目标口径','月累计','与日期筛选独立']];
    document.querySelector('#goalSummary').innerHTML=summary.map((x,i)=>'<article class="goal-card '+(i===4&&variance<0?'behind':'')+'"><span>'+esc(x[0])+'</span><strong>'+esc(x[1])+'</strong><small>'+esc(x[2])+'</small></article>').join('');
    let cats=(g.categories||[]).filter(x=>matchesCategory(x.name,selected));
    document.querySelector('#categoryGoals').innerHTML=cats.length?cats.map(x=>goalRow(x.name,x.actual,x.gmvTarget,x.attainment,x.mtdAttainment,'GMV')).join(''):'<div class="goal-empty">当前筛选没有设置销售目标</div>';
    let ads=(g.adBudgets||[]).filter(x=>matchesCategory(x.name,selected));
    document.querySelector('#adGoals').innerHTML=ads.length?ads.map(x=>goalRow(x.name,x.spend,x.budget,x.progress,null,'预算')).join(''):'<div class="goal-empty">当前筛选没有设置投放预算</div>';
    const skuData=(g.skuGoals||[]).filter(x=>skus.includes(x.sku));
    const skuHost=document.querySelector('#skuGoals');
    if(!skuData.length){skuHost.innerHTML='';skuHost.hidden=true}else{skuHost.hidden=false;skuHost.innerHTML='<h4>SKU 目标</h4><div class="sku-goal-grid">'+skuData.map(x=>{const gmvRate=x.monthlyGmvTarget?x.actualGmv/x.monthlyGmvTarget:null,unitRate=x.targetUnits?x.actualUnits/x.targetUnits:null;return '<article><strong>'+esc(x.name)+'</strong><small>'+esc(x.sku)+' · '+esc(x.category)+'</small><div><span>GMV '+yuan(x.actualGmv)+' / '+(x.monthlyGmvTarget?yuan(x.monthlyGmvTarget):'未设置')+'</span><b>'+percent(gmvRate)+'</b></div><div><span>件数 '+integer(x.actualUnits)+' / '+(x.targetUnits?integer(x.targetUnits):'未设置')+'</span><b>'+percent(unitRate)+'</b></div></article>'}).join('')+'</div>'}
  }
  function goalRow(name,actual,target,rate,mtdRate,label){
    if(!target)return '<article class="goal-row no-target"><div><strong>'+esc(name)+'</strong><span>'+label+'目标未设置</span></div><div class="no-target-actual"><small>实际销售 GMV</small><b>'+yuan(actual)+'</b></div></article>';
    const width=Math.min(100,Math.max(0,n(rate)*100)),tone=n(rate)>=1?'done':(mtdRate!=null&&n(mtdRate)>=1?'ahead':'behind');
    return '<article class="goal-row"><div class="goal-row-title"><strong>'+esc(name)+'</strong><b class="'+tone+'">'+percent(rate)+'</b></div><div class="goal-track"><i class="'+tone+'" style="width:'+width.toFixed(1)+'%"></i></div><div class="goal-meta"><span>实际 '+yuan(actual)+' / '+label+' '+yuan(target)+'</span><span>'+(mtdRate==null?'':('截至当日目标完成 '+percent(mtdRate)))+'</span></div></article>';
  }
  boot();
})();
