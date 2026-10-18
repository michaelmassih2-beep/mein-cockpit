# Prüfprotokoll, 18.10.2026

## Nachgewiesen

- 19 automatische Prüfungen für Datenzusammenführung, konkurrierende Änderungen, Import, sichere Linkausgabe, Formularbedienung, Suche, Modulverwaltung, großer verschlüsselter Datenbestände und Ablehnung falscher Passwörter bestanden.
- Fünf Python-Prüfungen für RSS-Auswertung, Sortierung, externe XML-Entitäten und Erhalt alter Quellenzeitstempel bei Fehlern bestanden.
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
- Prüfung auf echte Artikelrelevanz bleibt regelbasiert; Quellen können unpassende oder verspätete Treffer liefern.

Die Veröffentlichung vom 18.10.2026 über GitHub Actions war erfolgreich. Der echte Browser lädt Version 3 und bestätigt die erreichbare Cloud-Konfiguration. Der Produktionsworkflow konnte die RSS-Quellen aktualisieren. Eine gespeicherte Aufgabe wird nicht allein als aktive Benachrichtigung gezählt.
