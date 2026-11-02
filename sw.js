'use strict';
const CACHE="meow-web-21de8be2cb6c",FILES=["./assets/arrow.png","./assets/arrow.svg","./assets/arrowLeft.png","./assets/arrowLeft.svg","./assets/bag.png","./assets/bag.svg","./assets/book.png","./assets/book.svg","./assets/bowl.png","./assets/bowl.svg","./assets/bus.png","./assets/bus.svg","./assets/calendar.png","./assets/calendar.svg","./assets/cat.png","./assets/cat.svg","./assets/chart.png","./assets/chart.svg","./assets/check.png","./assets/check.svg","./assets/chevron.png","./assets/chevron.svg","./assets/close.png","./assets/close.svg","./assets/cup.png","./assets/cup.svg","./assets/dots.png","./assets/dots.svg","./assets/download.png","./assets/download.svg","./assets/empty-cat.png","./assets/empty-cat.svg","./assets/game.png","./assets/game.svg","./assets/gift.png","./assets/gift.svg","./assets/heart.png","./assets/heart.svg","./assets/home.png","./assets/home.svg","./assets/mascot.png","./assets/mascot.svg","./assets/paw.png","./assets/paw.svg","./assets/plus.png","./assets/plus.svg","./assets/return.png","./assets/return.svg","./assets/search.png","./assets/search.svg","./assets/shield.png","./assets/shield.svg","./assets/spark.png","./assets/spark.svg","./assets/sun.png","./assets/sun.svg","./assets/trash.png","./assets/trash.svg","./assets/wallet.png","./assets/wallet.svg","./bridge.js","./bundle.js","./icons/apple-touch-icon.png","./icons/icon-192.png","./icons/icon-512.png","./index.html","./ledger.js","./manifest.webmanifest","./pwa.js","./reimbursement.js","./shell.css","./theme.css","./vendor/exceljs.LICENSE.txt","./vendor/exceljs.min.js","./web.css"];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('meow-web-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin)return;
  if(request.mode==='navigate'){
    event.respondWith(caches.match(new URL('./index.html',self.registration.scope).href).then(cached=>cached||fetch(request)));
    return;
  }
  event.respondWith(caches.match(request).then(cached=>cached||fetch(request)));
});
