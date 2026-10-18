# Mein Cockpit – Version 3

Persönliche Browser-Startseite auf GitHub Pages, mit einem getrennten Supabase-Backend in Frankfurt. Gestaltung und bestehender Browser-Speicherschlüssel bleiben erhalten. Der öffentliche Quellcode enthält keine persönlichen Startdaten und keine Zugangsschlüssel.

## Nutzung

1. Website öffnen, **Cloud-Sync**, eigene E-Mail eingeben, **Anmeldelink senden**. Den Code oder vollständigen Bestätigungslink aus der E-Mail in das vorgesehene Feld der Website einfügen. Keine Anmeldewerte im Chat teilen.
2. Ein eigenes Verschlüsselungspasswort mit mindestens zwölf Zeichen eingeben und entsperren. Auf weiteren Geräten dasselbe Passwort verwenden. Das Passwort wird nur im Arbeitsspeicher gehalten. Ein vergessenes Passwort kann die Cloud-Daten nicht entschlüsseln; ein exportiertes Backup bleibt nutzbar.
3. Bestehende Browserdaten werden beim Öffnen vor der Migration gesichert. **Import** führt eine private Cockpit-JSON-Datei mit dem Bestand zusammen. Keine privaten Dateien in das Repository hochladen.
4. **Benachrichtigungen**: Push auf dem jeweiligen Gerät erlauben, anschließend Test senden und Versandprotokoll prüfen. Auf iPhone/iPad ist gegebenenfalls zuerst die Installation zum Home-Bildschirm erforderlich.
5. Bei Aufgabe oder Erinnerung **Benachrichtigung einrichten** wählen, Zeitpunkt, Wiederholung und Kanal festlegen. Erst die bestätigte Serverantwort führt zum Status „Auf Server geplant“.

## Tatsächlicher Funktionsumfang

- Verschlüsselter Cloud-Speicher mit Anmeldung, kontoabhängigen Datenbankregeln und atomarer Versionsprüfung. Alle fünf Datenkategorien einschließlich Modulreihenfolge werden synchronisiert.
- Automatischer Abgleich im sichtbaren Tab alle 15 Sekunden und nach Änderungen. Offline bleiben Änderungen lokal. Beim Wiederverbinden werden unabhängige Änderungen zusammengeführt. Bei gleichzeitiger Änderung desselben Eintrags werden beide Fassungen nach ausdrücklicher Konfliktauflösung behalten.
- Vor Import, Löschen, Bearbeiten und Konfliktauflösung werden bis zu fünf lokale Wiederherstellungskopien angelegt. Zusätzlich manuelles JSON-Backup. Lokale Inhalte und Sicherungskopien liegen im Browser im Klartext; ein angemeldetes Benutzerprofil und ein vertrauenswürdiges Gerät bleiben erforderlich.
- Serverseitiger Minutenplan über PostgreSQL Cron. Push funktioniert unabhängig vom offenen Dashboard. Tages- und Wochenwiederholungen halten die Ortszeit auch beim Wechsel zwischen Sommer- und Winterzeit. Betriebssystem, Browser und Versanddienst können verzögern oder unterdrücken.
- Zustellversuche mit Arbeitsreservierung, Wiederholungen bei Fehlern und Protokoll. Erfolgreich protokolliert wird die Annahme durch den Versanddienst, keine unbewiesene Anzeige oder Kenntnisnahme. Bei Bearbeiten/Löschen wird eine aktive Cockpit-Benachrichtigung zunächst auf dem Server pausiert. Bereits laufender Versand lässt sich nicht zuverlässig zurückholen.
- E-Mail-Kanal vorbereitet, aber ohne konfigurierten Versanddienst ausdrücklich deaktiviert. Erfordert serverseitig `RESEND_API_KEY` und `EMAIL_FROM` einer verifizierten Absenderdomain. Keine kostenpflichtige Einrichtung wird automatisch abgeschlossen.
- Die drei letzten intensiven Chats werden aus `conversations.json` ermittelt. Kontext-JSON kann Projekte und Erinnerungen ergänzen. Importzeitpunkte werden angezeigt. Keine automatische Auslesung des persönlichen ChatGPT-Verlaufs oder der ChatGPT-Erinnerungen.
- Drei zuletzt bearbeitete beziehungsweise priorisierte Projekte, alle Projekte auf Wunsch sichtbar. Module hinzufügen, bearbeiten, löschen und mit Textschaltflächen umordnen. Globale Suche, Prioritäten und responsive Darstellung.
- Nachrichten: drei Meldungen pro Kategorie, öffentliche RSS-Quellen mit Themen- und Quellenfiltern. GitHub Actions aktualisiert alle drei Stunden; offene Seiten laden den veröffentlichten Stand alle 15 Minuten. Fehler einer Kategorie ändern deren letzten erfolgreichen Zeitstempel nicht. Alte Meldungen bleiben als solche sichtbar. GitHub-Zeitpläne und externe Feeds liefern keine garantierte Aktualisierungsfrist.

## ChatGPT-Anbindung

Offizielle Dokumentation geprüft am 18.10.2026:

- [Geplante Aufgaben](https://learn.chatgpt.com/docs/automations)
- [Sign in with ChatGPT](https://developers.openai.com/siwc/quickstart)
- [Conversations API](https://developers.openai.com/api/reference/resources/conversations/methods/retrieve)

Die geprüften öffentlichen Schnittstellen stellen keine geeignete persönliche ChatGPT-Aufgaben-, Verlauf- und Erinnerungsverwaltung für diese GitHub-Pages-Anwendung bereit. Die Conversations API betrifft über die Programmierschnittstelle verwaltete Gespräche. Sign in with ChatGPT ist kein vollständiger Zugriff auf persönliche Chats oder Erinnerungen. Eine direkte Live-Synchronisierung wird nicht behauptet.

**Wichtig:** Cockpit-Benachrichtigungen versenden eine gespeicherte Erinnerung. Sie recherchieren nicht eigenständig im Internet, erkennen keine semantischen Ereignisse und überwachen keine Produktpreise. Für solche Rechercheaufträge gibt es eine ausdrücklich manuelle ChatGPT-Übergabe. Bestehende ChatGPT-Aufgaben werden durch Löschen im Cockpit nicht verändert.

## Backend und Sicherheit

- `sql/private_cloud.sql`: Verschlüsselter Tresor und atomare Versionsprüfung.
- `sql/notifications.sql`: Benutzerbezogene Versandaufträge, Geräte und Protokolle. Anonyme Zugriffe und direkte Client-Schreibzugriffe sind gesperrt. Backend-interne Einstellungen sind ausschließlich dem Server zugänglich.
- `sql/scheduler.sql`: Minutenplan; Authentisierung über ein zufälliges, ausschließlich privat gespeichertes Scheduler-Geheimnis.
- `backend/index.ts`: Supabase Edge Function. Öffentliche Laufzeitkonfiguration enthält nur die für Browser vorgesehene Publishable-Konfiguration. Jeder private Endpunkt prüft das Zugriffstoken beim Authentisierungsdienst. Kein beliebiger Ziel-E-Mail-Versand; E-Mails nur an die verifizierte Konto-Adresse. Push-Ziele sind auf bekannte Browser-Versanddienste begrenzt.
- Browser-Push benötigt lesbare Versandtitel und -texte auf dem geschützten Server. Die sonstigen privaten Cockpit-Inhalte werden vorher im Browser mit Advanced Encryption Standard im Galois/Counter Mode und passwortbasierter Schlüsselableitung verschlüsselt.
- Keine Service-Schlüssel, privaten VAPID-Schlüssel, Sitzungen oder privaten Startdaten im Repository. Keine Speicherung von Volltext-Chatverläufen beim Import.

## Entwicklung und Prüfung

```sh
npm ci --ignore-scripts
npm run check
npm test
python scripts/update_news.py
```

`tests/database.sql` ist eine transaktionale Integrationprüfung mit vollständig zurückgerollten synthetischen Identitäten. Sie prüft Erstschreiben, Versionskonflikt, Kontoisolation und verweigerte anonyme beziehungsweise interne Zugriffe.

`tests/core.test.js` prüft Importe und parallele Änderungen; `tests/ui.test.js` prüft Formulare und Bedienlogik im Dokumentmodell. `tests/test_news.py` prüft Nachrichtenausfälle und Zeitstempel. Diese Prüfungen ersetzen keine echten Tests auf zwei physischen Geräten und keinen bestätigten Push-Empfang.

Die GitHub-Veröffentlichung prüft Syntax und Tests vor dem Deployment. Der Sicherungszweig `backup/pre-production-20261018` enthält den ursprünglichen Stand.
