(function bootCategoryFix(attempt=0){
  const host=document.querySelector('#lineMulti');
  if(!host||!document.querySelector('#skuMulti')){if(attempt<50)setTimeout(()=>bootCategoryFix(attempt+1),50);return}
  if(host.dataset.liveFix)return;host.dataset.liveFix='true';
  host.querySelector('.multi-actions')?.insertAdjacentHTML('beforeend','<span id="categoryLiveStatus">已选 0</span>');
  const leaves=()=>$$('#lineMulti input').filter(x=>x.id!=='ketoconazoleParent');
  const chosenLines=()=>leaves().filter(x=>x.checked).map(x=>x.value);
  function updateCategoryStatus(){const selected=chosenLines();$('#categoryLiveStatus').textContent=`已选 ${selected.length}`;$$('#lineMulti label').forEach(label=>{const input=label.querySelector('input');label.classList.toggle('is-checked',!!input?.checked||!!input?.indeterminate)})}
  function applyCategoryLive(){
    state.lines=chosenLines();
    const valid=new Set(cube.skuIndex.filter(x=>!state.lines.length||state.lines.includes(x.line)).map(x=>x.sku));
    state.skus=state.skus.filter(x=>valid.has(x));
    state.categoryFocus=['酮康唑 OTC','酮康唑 RX'].every(x=>state.lines.includes(x))?'酮康唑':null;
    state.sku=null;
    $('#skuSearch').dispatchEvent(new Event('input',{bubbles:true}));
    updateCategoryStatus();
    renderAll();
  }
  host.addEventListener('change',()=>setTimeout(applyCategoryLive,0));
  host.addEventListener('click',e=>{if(e.target.closest('[data-tree],[data-multi]'))setTimeout(applyCategoryLive,0)});
  $$('#lineMulti label').forEach(label=>{label.tabIndex=0;label.setAttribute('role','checkbox');label.onkeydown=e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();label.querySelector('input')?.click()}}});
  $('#filterBtn').addEventListener('click',()=>setTimeout(()=>{updateCategoryStatus();document.querySelector('#lineMulti input:checked')?.closest('label')?.scrollIntoView({block:'nearest'})},30));
  updateCategoryStatus();
})();
