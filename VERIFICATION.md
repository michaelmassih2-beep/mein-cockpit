# Prüfprotokoll, 18.10.2026

## Nachgewiesen

- 16 automatische Prüfungen für Datenzusammenführung, konkurrierende Änderungen, Import, sichere Linkausgabe, Formularbedienung, Suche und Modulverwaltung bestanden.
- Vier Python-Prüfungen für RSS-Auswertung, Sortierung, externe XML-Entitäten und Erhalt alter Quellenzeitstempel bei Fehlern bestanden.
- Serverseitige SQL-Integrationprüfung bestanden: Erstschreiben, atomare Versionsfortschreibung, Zurückweisen veralteter Schreibversuche, Ausschluss fremder Konten, Ausschluss anonymer Zugriffe und interner Funktionen.
- Testidentitäten vollständig innerhalb einer Transaktion zurückgerollt.
- Supabase-Funktion veröffentlicht. Cron-Minutenplan aktiv. Tatsächlicher Worker-Aufruf mit HTTP 200 und aktualisiertem Lebenszeichen beobachtet.
- Sicherheitsberater: keine Warnungen oder Fehler. Zwei informative Hinweise zu aktivem Zugriffsschutz ohne Client-Regeln; diese Tabellen sind absichtlich ausschließlich serverseitig zugänglich.

## Noch nicht nachgewiesen

- Persönliche Anmeldung und Import der privaten Startdaten in den Cloud-Tresor.
- Tatsächlicher Browser-Push-Empfang auf einem freigegebenen Endgerät.
- E-Mail-Versand; Versanddienst und Absenderdomain fehlen.
- Gleichzeitige Nutzung mit zwei real angemeldeten Geräten. Datenzusammenführung und serverseitige Versionsprüfung sind isoliert geprüft.
- Vollständige visuelle Prüfung auf Smartphone und Desktop.
- Aktueller RSS-Abruf im Produktionsworkflow. Der Entwicklungsrechner erreicht die RSS-Quellen derzeit nicht; vorhandene Daten bleiben mit Fehlermarkierung erhalten.

Diese Punkte werden nach Live-Veröffentlichung soweit möglich aktualisiert. Eine gespeicherte Aufgabe wird nicht allein als aktive Benachrichtigung gezählt.
