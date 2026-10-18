'use strict';
// Safe fallback while advanced synchronization is not deployed.
(function () {
  function byId(id) { return document.getElementById(id); }
  const disabled = {
    syncBtn: 'Cloud-Synchronisierung ist noch nicht eingerichtet. Änderungen bleiben ausschließlich in diesem Browser.',
    historyBtn: 'Chat-Verlauf-Import ist in dieser Online-Version noch nicht aktiviert.',
    tasksImportBtn: 'Der automatische Aufgabenabgleich ist nicht verfügbar. Aktive Aufgaben ausschließlich in ChatGPT kontrollieren.',
    chatContextBtn: 'Diese Funktion ist noch nicht eingerichtet.'
  };
  for (const [id, message] of Object.entries(disabled)) {
    const button = byId(id);
    if (!button) continue;
    button.addEventListener('click', () => alert(message));
  }
  const status = byId('cloudHint');
  if (status) status.textContent = 'Nur lokal gespeichert. Noch keine Cloud-Synchronisierung.';
  const taskBox = byId('tasksList');
  if (taskBox) {
    const note = document.createElement('p');
    note.textContent = 'Neue Aufgaben hier sind nur Entwürfe. Sie lösen keine Benachrichtigung aus. Richte sie separat unter chatgpt.com ein.';
    note.style.cssText = 'font-size:12px;color:#e8bd7b;margin:10px 0';
    taskBox.prepend(note);
  }
})();