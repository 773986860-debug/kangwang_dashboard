(function bootFreshness(attempt=0){
  if(!window.DASHBOARD_DATA_V2){if(attempt<20)setTimeout(()=>bootFreshness(attempt+1),50);return}
  const d=cube.meta.snapshot,short=d.slice(5).replace('-','.');
  document.querySelector('.snapshot strong')?.replaceChildren(document.createTextNode(short));
  const snapSmall=document.querySelector('.snapshot small');if(snapSmall)snapSmall.textContent=`${Number(cube.meta.recordCount).toLocaleString('zh-CN')} 条日级记录`;
  const sourceSmall=document.querySelector('.source-note small');if(sourceSmall)sourceSmall.textContent=`日级数据截至 ${d.replaceAll('-','.')}`;
})();
