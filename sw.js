const V='souffleur-v3';
const CORE=['./','./index.html','./audio.js','./manifest.webmanifest','./icon-192.png','./icon-512.png','./icon-maskable-512.png'];
self.addEventListener('install',e=>{ e.waitUntil(caches.open(V).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())); });
self.addEventListener('activate',e=>{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V && k!=='souffleur-fonts').map(k=>caches.delete(k)))).then(()=>self.clients.claim())); });
self.addEventListener('fetch',e=>{
  const req=e.request; if(req.method!=='GET') return;
  const u=new URL(req.url);
  if(u.hostname==='fonts.googleapis.com'||u.hostname==='fonts.gstatic.com'){
    e.respondWith(caches.open('souffleur-fonts').then(async c=>{ const hit=await c.match(req); if(hit) return hit; try{ const r=await fetch(req); c.put(req,r.clone()); return r; }catch(err){ return new Response('',{status:504}); } }));
    return;
  }
  if(u.origin!==self.location.origin) return;
  const isPage = req.mode==='navigate' || u.pathname.endsWith('/') || u.pathname.endsWith('index.html');
  e.respondWith(caches.open(V).then(async c=>{
    const hit = await c.match(isPage ? './index.html' : req, {ignoreSearch:true});
    if(isPage){
      const net = fetch(req).then(r=>{ if(r.ok) c.put('./index.html', r.clone()); return r; }).catch(()=>null);
      return hit || (await net) || new Response('Hors ligne',{status:503});
    }
    if(hit) return hit;
    const r = await fetch(req); if(r.ok) c.put(req, r.clone()); return r;
  }));
});
