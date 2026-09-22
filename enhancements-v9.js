(function bootCheckboxReset(attempt=0){
  const host=document.querySelector('#lineMulti'),skuHost=document.querySelector('#skuMulti');
  if(!host||!skuHost){if(attempt<50)setTimeout(()=>bootCheckboxReset(attempt+1),50);return}
  if(host.dataset.checkboxReset)return;host.dataset.checkboxReset='true';
  const parent=$('#ketoconazoleParent'),kids=['酮康唑 OTC','酮康唑 RX'];
  const leaves=()=>$$('#lineMulti input').filter(x=>x!==parent);
  const kidBoxes=()=>leaves().filter(x=>kids.includes(x.value));
  const chosen=()=>leaves().filter(x=>x.checked).map(x=>x.value);
  function paint(){
    const count=kidBoxes().filter(x=>x.checked).length;parent.checked=count===2;parent.indeterminate=count===1;
    $$('#lineMulti label').forEach(label=>{const input=label.querySelector('input'),active=!!input?.checked||!!input?.indeterminate;label.classList.toggle('is-checked',active);label.setAttribute('aria-checked',input?.indeterminate?'mixed':String(!!input?.checked))});
    const status=$('#categoryLiveStatus');if(status)status.textContent=`已选 ${chosen().length}`;
  }
  function commit(){
    state.lines=chosen();state.categoryFocus=kids.every(x=>state.lines.includes(x))?'酮康唑':null;state.sku=null;
    const valid=new Set(cube.skuIndex.filter(x=>!state.lines.length||state.lines.includes(x.line)).map(x=>x.sku));state.skus=state.skus.filter(x=>valid.has(x));
    paint();$('#skuSearch').dispatchEvent(new Event('input',{bubbles:true}));renderAll();
  }
  parent.onchange=e=>{kidBoxes().forEach(x=>x.checked=e.target.checked);commit()};
  leaves().forEach(input=>{input.onchange=()=>{paint();commit()}});
  $$('#lineMulti [data-tree],#lineMulti [data-multi]').forEach(button=>{button.onclick=e=>{e.preventDefault();const selectAll=button.dataset.tree==='all'||button.dataset.multi==='all';leaves().forEach(x=>x.checked=selectAll);commit()}});
  $$('#lineMulti label').forEach(label=>{label.onclick=e=>{if(e.target.tagName==='INPUT')return};label.onkeydown=e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();label.querySelector('input')?.click()}}});
  paint();
})();
