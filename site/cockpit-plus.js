'use strict';
// Ergänzende lokale Bedienung. Keine direkte ChatGPT- oder Cloud-Schnittstelle.
(function () {
  const el = id => document.getElementById(id);
  const inactive = {
    syncBtn: 'Cloud-Synchronisierung ist noch nicht eingerichtet. Deine Daten werden nur in diesem Browser gespeichert.',
    historyBtn: 'Ein automatischer ChatGPT-Verlauf-Import ist noch nicht angeschlossen.',
    tasksImportBtn: 'Ein automatischer Abgleich mit ChatGPT-Aufgaben ist derzeit nicht möglich.',
    chatContextBtn: 'Eine automatische ChatGPT-Memory-Synchronisierung ist derzeit nicht verfügbar.'
  };
  for (const [id, message] of Object.entries(inactive)) {
    const control = el(id);
    if (control) control.addEventListener('click', () => alert(message));
  }

  function instruction(item) {
    const date = item.date ? 'Gewünschtes Datum: ' + item.date + '\n' : '';
    return 'Bitte richte in ChatGPT eine Aufgabe bzw. Überwachung ein.\n\n' +
      'Titel: ' + item.title + '\n' +
      'Beschreibung: ' + (item.detail || 'Bitte anhand des Titels einrichten.') + '\n' +
      date +
      (item.status ? 'Zusatzangabe: ' + item.status + '\n' : '') +
      (item.url ? 'Link: ' + item.url + '\n' : '') +
      '\nFalls Termin, Uhrzeit oder Wiederholung fehlen, frage nach. ' +
      'Bestätige die Aufgabe erst, nachdem sie wirklich in ChatGPT angelegt wurde. ' +
      'Erkläre, wo ich die Benachrichtigungen kontrollieren kann.';
  }

  async function copy(text) {
    try {
      if (!navigator.clipboard || !window.isSecureContext) throw Error('Kein Clipboard-Zugriff');
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      const area = document.createElement('textarea');
      area.value = text;
      area.style.position = 'fixed';
      area.style.left = '-9999px';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      area.remove();
      return ok;
    }
  }

  window.taskAction = function(item, actions) {
    const confirmed = ['confirmed-snapshot', 'manually-confirmed'].includes(item.syncState);
    const indicator = document.createElement('span');
    indicator.className = 'small-tag';
    indicator.textContent = confirmed
      ? (item.syncState === 'confirmed-snapshot' ? 'ChatGPT: früher erfasst, nicht live geprüft' : 'ChatGPT: selbst bestätigt')
      : 'Nur Entwurf, keine Benachrichtigung';
    actions.appendChild(indicator);
    if (confirmed) return;

    const send = document.createElement('button');
    send.type = 'button';
    send.className = 'edit-btn';
    send.textContent = 'An ChatGPT übergeben';
    send.addEventListener('click', async () => {
      // Öffnen aus dem direkten Klick heraus, damit Popup-Blocker weniger häufig greifen.
      const newTab = window.open('https://chatgpt.com/', '_blank', 'noopener,noreferrer');
      const ok = await copy(instruction(item));
      const stored = data.tasks.find(x => x.id === item.id);
      if (stored) {
        stored.syncState = 'handoff';
        stored.updatedAt = new Date().toISOString();
        save();
        render();
      }
      if (ok) {
        alert('Übergabetext kopiert. Füge ihn im geöffneten ChatGPT-Fenster ein und sende ihn ab. Erst die Bestätigung von ChatGPT bedeutet, dass eine Benachrichtigung eingerichtet ist.' + (!newTab ? '\nFalls kein Fenster aufging, öffne chatgpt.com selbst.' : ''));
      } else {
        window.prompt('Bitte Text kopieren und in ChatGPT einfügen:', instruction(item));
      }
    });
    actions.appendChild(send);

    if (item.syncState === 'handoff') {
      const mark = document.createElement('button');
      mark.type = 'button';
      mark.className = 'edit-btn';
      mark.textContent = 'In ChatGPT eingerichtet';
      mark.addEventListener('click', () => {
        if (!window.confirm('Hast du die Aufgabe tatsächlich in ChatGPT erstellt und dort als aktiv gesehen? Diese Bestätigung führt keine technische Prüfung durch.')) return;
        const stored = data.tasks.find(x => x.id === item.id);
        if (!stored) return;
        stored.syncState = 'manually-confirmed';
        stored.updatedAt = new Date().toISOString();
        save();
        render();
      });
      actions.appendChild(mark);
    }
  };

  function info(id, message) {
    const e = el(id);
    if (e) e.textContent = message;
  }
  info('cloudHint', 'Nur in diesem Browser gespeichert. Cloud-Synchronisierung noch nicht eingerichtet.');
  render();
})();
