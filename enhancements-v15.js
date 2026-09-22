(function(){
  'use strict';
  let attempts=0,rankType='全部',rankQuery='',rankSort='rank';
  function boot(){
    attempts++;
    if(!window.DASHBOARD_RANKINGS||typeof state==='undefined'||typeof renderDetail!=='function'||!document.querySelector('#keywordPerformance')){if(attempts<200)setTimeout(boot,50);return}
    if(document.documentElement.dataset.keywordRank==='ready')return;document.documentElement.dataset.keywordRank='ready';install();
    const previous=renderDetail;renderDetail=function(list){previous(list);renderRankings()};if(state.sku)renderRankings();
  }
  function install(){
    const host=document.querySelector('#keywordPerformance');if(!host||document.querySelector('#keywordRanking'))return;
    const section=document.createElement('section');section.id='keywordRanking';section.className='keyword-ranking';section.innerHTML=[
      '<div class="rank-head"><div><span class="section-kicker">搜索排名定位</span><h4>SKU × 关键词排名</h4><p id="rankNote">词下曝光排名，数字越小越靠前。</p></div><div class="rank-tools"><input id="rankSearch" type="search" placeholder="搜索排名关键词"><select id="rankSort"><option value="rank">按曝光排名</option><option value="popularity">按词热度</option><option value="impressions">按曝光次数</option><option value="searchOrders">按搜索成交</option></select></div></div>',
      '<div class="rank-types" id="rankTypes"></div><div class="rank-summary" id="rankSummary"></div>',
      '<div class="rank-table-wrap"><table class="rank-table"><thead><tr><th>关键词</th><th>分类</th><th>分层</th><th>曝光排名</th><th>较前日</th><th>广告排名</th><th>词热度</th><th>曝光</th><th>点击率</th><th>搜索转化</th><th>搜索成交</th></tr></thead><tbody id="rankBody"></tbody></table></div>'
    ].join('');host.appendChild(section);
    document.querySelector('#rankSearch').oninput=e=>{rankQuery=e.target.value.trim().toLowerCase();renderRankings()};document.querySelector('#rankSort').onchange=e=>{rankSort=e.target.value;renderRankings()};
  }
  const n=v=>Number(v)||0,fmt=v=>Math.round(n(v)).toLocaleString('zh-CN'),pc=v=>(n(v)*100).toFixed(1)+'%';
  function latestRows(){
    if(!state.sku)return{date:null,rows:[]};const end=state.end||window.DASHBOARD_RANKINGS.meta.snapshot,start=state.start||window.DASHBOARD_RANKINGS.meta.minDate;
    const scoped=window.DASHBOARD_RANKINGS.rows.filter(x=>x.sku===state.sku&&x.date<=end&&x.date>=start);if(!scoped.length)return{date:null,rows:[]};const latest=scoped.reduce((m,x)=>x.date>m?x.date:m,scoped[0].date);return{date:latest,rows:scoped.filter(x=>x.date===latest)};
  }
  function renderRankings(){
    const panel=document.querySelector('#keywordRanking');if(!panel)return;if(!state.sku){panel.hidden=true;return}panel.hidden=false;
    const result=latestRows(),all=result.rows,types=['全部',...new Set(all.map(x=>x.type))];if(!types.includes(rankType))rankType='全部';
    document.querySelector('#rankNote').textContent=result.date?'排名数据截至 '+result.date.replaceAll('-','.')+'；词下曝光排名数字越小越靠前。':'当前所选日期范围没有排名数据（排名源截至 '+window.DASHBOARD_RANKINGS.meta.snapshot+'）。';
    document.querySelector('#rankTypes').innerHTML=types.map(x=>'<button type="button" class="'+(x===rankType?'active':'')+'" data-type="'+esc(x)+'">'+esc(x)+'</button>').join('');document.querySelectorAll('#rankTypes button').forEach(b=>b.onclick=()=>{rankType=b.dataset.type;renderRankings()});
    let rows=all.filter(x=>(rankType==='全部'||x.type===rankType)&&(!rankQuery||x.keyword.toLowerCase().includes(rankQuery)));
    rows.sort((a,b)=>rankSort==='rank'?(n(a.rank)||999999)-(n(b.rank)||999999):n(b[rankSort])-n(a[rankSort]));
    const top10=all.filter(x=>n(x.rank)>0&&n(x.rank)<=10).length,improved=all.filter(x=>n(x.change)<0).length,declined=all.filter(x=>n(x.change)>0).length,best=all.filter(x=>n(x.rank)>0).sort((a,b)=>n(a.rank)-n(b.rank))[0];
    document.querySelector('#rankSummary').innerHTML=[['关键词数',fmt(all.length),'当前排名快照'],['TOP 10',fmt(top10),'曝光排名前10'],['上升词',fmt(improved),'较前一日名次提升'],['下降词',fmt(declined),'较前一日名次回落'],['最佳排名',best?('#'+fmt(best.rank)):'—',best?best.keyword:'暂无排名']].map(x=>'<div><span>'+esc(x[0])+'</span><strong>'+esc(x[1])+'</strong><small>'+esc(x[2])+'</small></div>').join('');
    document.querySelector('#rankBody').innerHTML=rows.slice(0,120).map(x=>'<tr><td><strong>'+esc(x.keyword)+'</strong></td><td><span class="rank-type">'+esc(x.type)+'</span></td><td>'+esc(x.tier)+'</td><td><b class="rank-number">#'+fmt(x.rank)+'</b></td><td>'+changeText(x.change)+'</td><td>'+(n(x.adRank)?('#'+fmt(x.adRank)):'—')+'</td><td>'+fmt(x.popularity)+'</td><td>'+fmt(x.impressions)+'</td><td>'+pc(x.ctr)+'</td><td>'+pc(x.conversion)+'</td><td>'+fmt(x.searchOrders)+'</td></tr>').join('')||'<tr><td colspan="11" class="rank-empty">当前条件没有匹配的关键词排名</td></tr>';
  }
  function changeText(v){const value=n(v);if(value<0)return '<span class="rank-up">↑ 上升 '+fmt(-value)+'</span>';if(value>0)return '<span class="rank-down">↓ 下降 '+fmt(value)+'</span>';return '<span class="rank-flat">— 持平</span>'}
  boot();
})();
