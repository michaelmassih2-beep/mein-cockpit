'use strict';
self.addEventListener('push',event=>{let msg={title:'Mein Cockpit',body:'Eine Erinnerung ist fällig.'};try{msg=event.data.json()}catch{}
 event.waitUntil(self.registration.showNotification(msg.title,{body:msg.body,tag:msg.tag||'cockpit',data:{url:self.registration.scope},requireInteraction:true}));
});
self.addEventListener('notificationclick',event=>{event.notification.close();event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(async windows=>{for(const w of windows){if(w.url.startsWith(self.registration.scope))return w.focus()}return clients.openWindow(self.registration.scope)}))});
