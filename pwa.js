(function(){
  'use strict';
  if('serviceWorker' in navigator){
    window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(error=>console.warn('离线缓存暂不可用',error)));
  }
  const fit=()=>{
    const viewport=window.visualViewport;
    document.documentElement.style.setProperty('--app-height',(viewport?viewport.height:window.innerHeight)+'px');
  };
  fit();window.visualViewport?.addEventListener('resize',fit);window.addEventListener('resize',fit);
})();
