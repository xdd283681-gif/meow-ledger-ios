/* WKUIDelegate supplies synchronous, atomic native storage. Browser preview uses localStorage. */
(function () {
  'use strict';
  const handler=window.webkit?.messageHandlers?.meow;
  if(!handler)return;
  function storage(action,key,value){
    const response=window.prompt('meow-storage:'+JSON.stringify({action,key,value}),'');
    if(response===null)throw new Error('本地存储暂不可用');
    const result=JSON.parse(response);
    if(!result.ok)throw new Error(result.error||'本地存储失败');
    return result.value;
  }
  window.MeowNative={
    getBook:key=>storage('get',key),
    saveBook:(key,value)=>storage('set',key,value),
    hideKeyboard:()=>handler.postMessage({action:'hideKeyboard'}),
    exportCsv:(filename,csv)=>handler.postMessage({action:'exportCsv',filename,csv})
  };
})();
