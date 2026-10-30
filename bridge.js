/* Browser preview bridge: the actual WXML and Page controller are reused. */
(async function () {
  'use strict';
  const native = null;
  const L = window.MeowLedger, mount = document.getElementById('app');
  const {wxml, source} = window.MeowWebBundle;
  const template = new DOMParser().parseFromString('<root xmlns:wx="wx">'+wxml+'</root>', 'application/xml');
  if (template.querySelector('parsererror')) throw new Error('WXML 解析失败：'+template.querySelector('parsererror').textContent);
  for (const node of template.querySelectorAll('*')) {
    for (const attr of ['wx:if','wx:elif','wx:for']) {
      const value=node.getAttribute(attr);
      if(value!==null && !/^\{\{[\s\S]*\}\}$/.test(value)) throw new Error(attr+' 必须使用 {{ }} 数据绑定');
    }
  }
  let page, scheduled = false, toastTimer, focusReturn;
  const cache = new Map(), virtualFiles = new Map();
  function evaluate(expr, ctx) { if (!cache.has(expr)) cache.set(expr, new Function('ctx', 'with(ctx){return ('+expr+')}')); return cache.get(expr)(ctx); }
  function interpolate(value, ctx) { return String(value).replace(/\{\{([\s\S]*?)\}\}/g, (_, expr) => { const result=evaluate(expr,ctx);return result==null?'':String(result); }); }
  function eventCall(name, el, value) { if (page[name]) page[name]({ currentTarget: el, target: el, detail: { value } }); }
  function renderChildren(parent, target, ctx, key) {
    let chain = false, matched = false;
    Array.from(parent.childNodes).forEach((node, index) => {
      if (node.nodeType === 3) { const t=interpolate(node.textContent,ctx); if(t.trim())target.appendChild(document.createTextNode(t)); return; }
      if (node.nodeType !== 1) return;
      const ifExp = node.getAttribute('wx:if'), elifExp = node.getAttribute('wx:elif'), isElse = node.hasAttribute('wx:else');
      if (ifExp !== null) { chain=true; matched=!!evaluate(ifExp.replace(/^\{\{|\}\}$/g,''),ctx); if(!matched)return; }
      else if(elifExp !== null){ if(!chain || matched)return;matched=!!evaluate(elifExp.replace(/^\{\{|\}\}$/g,''),ctx);if(!matched)return; }
      else if(isElse){if(!chain||matched)return;matched=true;}
      else { chain=false; matched=false; }
      const loop=node.getAttribute('wx:for');
      if(loop){const rows=evaluate(loop.replace(/^\{\{|\}\}$/g,''),ctx)||[];rows.forEach((item,i)=>{ const sub=Object.assign({},ctx);sub[node.getAttribute('wx:for-item')||'item']=item;sub[node.getAttribute('wx:for-index')||'index']=i;renderNode(node,target,sub,key+'.'+index+'.'+(item.id||item.date||i)); });}
      else renderNode(node,target,ctx,key+'.'+index);
    });
  }
  function renderNode(node,target,ctx,key){
    const tag=node.tagName;
    if(tag==='block'){renderChildren(node,target,ctx,key);return;}
    const mapping={view:'div',text:'span',image:'img','scroll-view':'div',picker:'label'};
    const el=document.createElement(mapping[tag]||tag);el.dataset.renderKey=key;
    for(const attr of Array.from(node.attributes)){
      const name=attr.name,value=interpolate(attr.value,ctx);
      if(name.startsWith('wx:')||name.startsWith('bind')||name.startsWith('catch')||['mode','fields','start','end','adjust-position','scroll-y'].includes(name))continue;
      if(name==='src'){el.setAttribute(name,new URL('assets/'+value.split('/').pop(),document.baseURI).href);continue;}
      if(name==='type'&&tag==='input'){el.type='text';if(value==='digit')el.inputMode='decimal';continue;}
      if(name==='value'&&tag==='input'){el.value=value;continue;}
      el.setAttribute(name,value);
    }
    if(tag==='image')el.alt='';
    if(tag==='scroll-view')el.classList.add('scroll-view');
    const tap=node.getAttribute('bindtap')||node.getAttribute('catchtap');
    if(tap){el.addEventListener('click',e=>{if(node.hasAttribute('catchtap'))e.stopPropagation();eventCall(tap,el);});if(tag!=='button'){el.tabIndex=0;el.setAttribute('role','button');el.addEventListener('keydown',e=>{if(e.target===el&&(e.key==='Enter'||e.key===' ')){e.preventDefault();el.click();}});}}
    if(tag==='input'){
      const handler=node.getAttribute('bindinput');if(handler)el.addEventListener('input',()=>eventCall(handler,el,el.value));
      el.setAttribute('aria-label',node.getAttribute('bindinput')==='inputAmount'?'金额':node.getAttribute('bindinput')==='inputBudget'?'月预算':interpolate(node.getAttribute('placeholder')||'输入',ctx));
      if(el.inputMode==='decimal')el.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();page[page.data.budgetEditor?'saveBudget':'saveEntry']();}});
    }
    renderChildren(node,el,ctx,key);
    if(tag==='picker'){
      el.classList.add('native-picker');const picker=document.createElement('input');picker.type=node.getAttribute('fields')==='month'?'month':'date';picker.value=interpolate(node.getAttribute('value')||'',ctx);picker.min=node.getAttribute('start')||'';picker.max=node.getAttribute('end')||'';picker.dataset.renderKey=key+'.picker';picker.setAttribute('aria-label',picker.type==='month'?'选择月份':'选择日期');picker.addEventListener('change',()=>eventCall(node.getAttribute('bindchange'),el,picker.value));el.appendChild(picker);
    }
    target.appendChild(el);
  }
  function render(){
    scheduled=false;const active=document.activeElement,key=active?.dataset?.renderKey,selection=active?.selectionStart,end=active?.selectionEnd;
    const scroll=mount.querySelector('.app-shell')?.scrollTop||0,sheetScroll=mount.querySelector('.sheet')?.scrollTop||0,catScroll=mount.querySelector('.category-scroll')?.scrollTop||0;
    const oldEditor=!!mount.querySelector('.modal-mask'),fragment=document.createDocumentFragment();renderChildren(template.documentElement,fragment,page.data,'root');mount.replaceChildren(fragment);
    const shell=mount.querySelector('.app-shell');shell.scrollTop=scroll;
    const sheet=mount.querySelector('.sheet');if(sheet)sheet.scrollTop=sheetScroll;const categories=mount.querySelector('.category-scroll');if(categories)categories.scrollTop=catScroll;
    const newEditor=!!sheet;if(newEditor)shell.style.overflow='hidden';
    const next=key?Array.from(mount.querySelectorAll('[data-render-key]')).find(el=>el.dataset.renderKey===key):null;
    if(next){next.focus({preventScroll:true});try{next.setSelectionRange(selection,end);}catch(_){}}
    if(!oldEditor&&newEditor){focusReturn=active;sheet.setAttribute('role','dialog');sheet.setAttribute('aria-modal','true');sheet.setAttribute('aria-label',page.data.budgetEditor?'月度预算':'记一笔');}
    if(oldEditor&&!newEditor){mount.querySelector('.nav-add')?.focus({preventScroll:true});}
    if(sheet){sheet.setAttribute('role','dialog');sheet.setAttribute('aria-modal','true');sheet.setAttribute('aria-label',page.data.budgetEditor?'月度预算':'记一笔');}
  }
  function schedule(){if(!scheduled){scheduled=true;queueMicrotask(render);}}
  function toast(title){const el=document.getElementById('toast');clearTimeout(toastTimer);el.textContent=title;el.classList.add('visible');toastTimer=setTimeout(()=>el.classList.remove('visible'),2400);}
  window.__meowExportResult=message=>toast(message);
  function dialog(options){
    const root=document.getElementById('dialog-root'),mask=document.createElement('div');mask.className='confirm-mask';const card=document.createElement('div');card.className='confirm-card';card.setAttribute('role','alertdialog');card.setAttribute('aria-modal','true');card.setAttribute('aria-labelledby','confirm-title');
    const image=document.createElement('img');image.src=new URL('assets/paw.svg',document.baseURI).href;image.alt='';card.appendChild(image);
    const title=document.createElement('div');title.id='confirm-title';title.className='confirm-title';title.textContent=options.title;card.appendChild(title);const message=document.createElement('div');message.className='confirm-message';message.textContent=options.content;card.appendChild(message);
    const actions=document.createElement('div');actions.className='confirm-actions';const previous=document.activeElement;
    function close(confirm){root.replaceChildren();previous?.focus({preventScroll:true});options.success?.({confirm,cancel:!confirm});}
    if(options.showCancel!==false){const cancel=document.createElement('button');cancel.textContent=options.cancelText||'再想想';cancel.onclick=()=>close(false);actions.appendChild(cancel);}
    const ok=document.createElement('button');ok.className='confirm-primary';ok.textContent=options.confirmText||'确定';ok.onclick=()=>close(true);actions.appendChild(ok);card.appendChild(actions);mask.appendChild(card);root.replaceChildren(mask);ok.focus();
  }
  const wx={
    getWindowInfo:()=>({statusBarHeight:37}),getSystemInfoSync:()=>({statusBarHeight:37}),
    getStorageSync:key=>{const data=native?native.getBook(key):localStorage.getItem(key);return data?JSON.parse(data):null;},
    setStorageSync:(key,value)=>{const json=JSON.stringify(value);if(native){if(!native.saveBook(key,json))throw new Error('设备存储失败');}else localStorage.setItem(key,json);},
    hideKeyboard:()=>{document.activeElement?.blur();native?.hideKeyboard();},
    showToast:o=>toast(o.title),showModal:dialog,pageScrollTo:o=>mount.querySelector('.app-shell')?.scrollTo({top:o.scrollTop,behavior:'smooth'}),env:{USER_DATA_PATH:'/virtual'},
    getFileSystemManager:()=>({writeFile:o=>{virtualFiles.set(o.filePath,o.data);o.success?.();}}),
    shareFileMessage:async o=>{
      const contents=String(virtualFiles.get(o.filePath));virtualFiles.delete(o.filePath);
      try{
        const file=new File([contents],o.fileName,{type:'text/csv;charset=utf-8'});
        if(navigator.canShare&&navigator.canShare({files:[file]})){
          await navigator.share({files:[file],title:'喵喵账本 · '+page.data.accountName});
          o.success?.();return;
        }
        const url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download=o.fileName;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);o.success?.();toast('已开始下载账单');
      }catch(error){if(error.name!=='AbortError'){o.fail?.({errMsg:error.message});}}
    },
    setClipboardData:o=>navigator.clipboard.writeText(o.data).then(()=>o.success?.()).catch(()=>toast('请允许剪贴板访问'))
  };
  function Page(def){page=Object.assign({},def);page.data=JSON.parse(JSON.stringify(def.data));page.setData=function(patch){for(const [key,value]of Object.entries(patch)){const parts=key.split('.');let target=this.data;while(parts.length>1){target=target[parts.shift()];}target[parts[0]]=value;}schedule();};}
  new Function('require','Page','wx',source)(()=>L,Page,wx);
  page.onLoad();render();window.__meowPage=page;
  window.__meowBack=()=>{const buttons=document.querySelectorAll('.confirm-actions button');if(buttons.length){buttons[0].click();return true;}if(page.data.editor||page.data.budgetEditor){page.closeEditor();return true;}if(page.data.tab!=='home'){page.switchTab({currentTarget:{dataset:{tab:'home'}}});return true;}return false;};
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){const cancel=document.querySelector('.confirm-actions button:not(.confirm-primary)');if(cancel){cancel.click();return;}if(!document.querySelector('.confirm-mask'))page.closeEditor();}
    if(e.key==='Tab'){const dialog=document.querySelector('.confirm-card')||mount.querySelector('.sheet');if(dialog){const els=Array.from(dialog.querySelectorAll('button,input,[tabindex="0"]')).filter(el=>el.offsetParent!==null),first=els[0],last=els[els.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}}
  });
})().catch(error=>{console.error(error);document.getElementById('app').textContent='账本加载失败，请关闭应用后重新打开。'+error.message;});
