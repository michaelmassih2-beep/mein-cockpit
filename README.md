# Mein Cockpit – Version 2

Eine statische, responsive Browser-Startseite. Das öffentliche Website-Paket enthält **keine** persönlichen Projekte, Chat-Texte, Aufgabendaten oder Zugangsdaten. Die private Startdatei `Mein_Cockpit_Private_Daten.json` wird getrennt übergeben und nur auf deinem Gerät importiert.

## Schnellstart ohne Cloud

1. Dieses ZIP lokal entpacken, `site/index.html` öffnen. Die Anzeige funktioniert offline; Online-Nachrichten sind offline eine Momentaufnahme.
2. Auf **Import** klicken und die separate Datei `Mein_Cockpit_Private_Daten.json` auswählen. Diese JSON-Datei nie in GitHub hochladen.
3. Einträge, Module, Erinnerungen und Projekte im Dashboard bearbeiten. Über **Backup** regelmäßig lokal sichern.

Die lokalen Inhalte sind im Browser unter der Domain/Dateiadresse gespeichert. Das Löschen von Browserdaten, Inkognito-Modus, unterschiedliche Browserprofile und Browserwechsel können Inhalte sonst verlieren. Lokale Daten sind **nicht** mit einem Passwort verschlüsselt, daher nur auf einem vertrauenswürdigen Gerät verwenden.

## Als aktuelle Browser-Startseite veröffentlichen

1. GitHub-Konto erstellen. Neues Repository, z.B. `mein-cockpit`, anlegen (public ist möglich, weil im `site`-Ordner keine privaten Startdaten enthalten sind).
2. Inhalt dieses ZIPs (`site`, `scripts`, `.github`, `sql` und README) in `main` hochladen – **keine private JSON-Datei**.
3. Unter GitHub Repository → Settings → Pages → Build and deployment → Source `GitHub Actions` auswählen. Workflow `Cockpit und Nachrichten bereitstellen` unter Actions manuell starten.
4. Die danach erscheinende Internetadresse als Startseite in Chrome oder Edge eintragen. Die persönliche JSON-Datei nur im Dashboard selbst importieren.

Der GitHub-Workflow zieht alle drei Stunden Google-News-RSS-Treffer. GitHub-Schedules sind best effort, externe RSS-Feeds können ausfallen. Meldungen zeigen den tatsächlichen Veröffentlichungsstand; nach sechs Stunden ist der Nachrichtenstand sichtbar als veraltet markiert. Die Aktualisierungszeit ist nicht gleich dem Veröffentlichungszeitpunkt jedes Artikels.

## Cloud-Synchronisierung (optional, benötigt eigene Einrichtung)

Die App unterstützt verschlüsselte Synchronisierung zwischen Browsern/Geräten mit einem eigenen Supabase-Projekt. Hierbei werden sämtliche privaten Inhalte **im Browser mit AES-GCM und PBKDF2** verschlüsselt, bevor sie an die Datenbank übertragen werden. Der Supabase-Betreiber sieht verschlüsselte Daten, Metadaten wie Nutzeridentität und Zeitpunkte aber weiterhin.

1. Ein eigenes Supabase-Projekt anlegen, Authentication → Providers → Email aktivieren. E-Mail-Einmalcodes konfigurieren (falls die E-Mail-Vorlage nur Links enthält, Supabase Email Templates so anpassen, dass `{{ .Token }}` als Code erscheint).
2. In Supabase SQL Editor den gesamten Inhalt von `sql/private_cloud.sql` ausführen.
3. Unter Project Settings / Data API die Projekt-URL und den **publishable / anon Key** kopieren. Nie einen `service_role`- oder `sb_secret_`-Schlüssel verwenden. Keine Schlüssel in GitHub-Repository-Dateien speichern.
4. Website öffnen → **Cloud-Sync** → Projektadresse und Publishable Key → **Verbindung vorbereiten** → E-Mail eingeben → **Einmalcode anfordern** → Code aus E-Mail eingeben → **Anmelden mit Code**.
5. Privates, mindestens 12 Zeichen langes **Verschlüsselungspasswort** eingeben → **Entsperren und laden**. Beim ersten Gerät auf **Jetzt sichern** klicken. Auf weiteren Geräten dieselbe Cloud-URL, denselben Publishable Key und dasselbe Verschlüsselungspasswort verwenden.
6. Änderungen werden bei entsperrtem Cloud-Zugang automatisch hochgeladen. Ist ein Gerät offline, bleiben die Änderungen lokal. Bei konkurrierenden Änderungen wird **nicht stillschweigend überschrieben**, sondern ein Konflikt angezeigt. In der Cloud-Ansicht bewusst entscheiden: `Cloud laden` erstellt vorher ein lokales Backup und ersetzt die lokalen Daten; `Jetzt sichern` fragt bei Konflikten nach Bestätigung und sichert zuvor ebenfalls die lokale Version.

Wichtig: Verlust des Verschlüsselungspassworts bedeutet, dass die verschlüsselten Cloud-Daten nicht wiederhergestellt werden können. Ein lokales Backup behalten. Cloud-Zugang ist nach einem Seitenneuladen gesperrt und muss mit Passwort wieder entsperrt werden. Durch bewusste Wahl eines eigenen Supabase-Projekts verbleiben die privaten Daten nicht in einem vom Anbieter dieser Datei betriebenen Konto.

**Sicherheit:** Row-Level-Security und Vergleich der Versionsnummer verhindern kontoübergreifenden Zugriff sowie unbeabsichtigte Überschreibungen. Sie ersetzen keine regelmäßige Sicherung und keinen Sicherheitstest einer produktiven Anwendung. Bei streng vertraulichen Firmendaten sind die Vorgaben deines Unternehmens maßgeblich.

## ChatGPT-Aufgaben und Benachrichtigungen

**Technische Grenze:** Ein eigenes Dashboard kann ChatGPT-Aufgaben **nicht automatisch** per öffentlicher Schnittstelle erstellen, verändern oder in Echtzeit abrufen. Deshalb unterscheidet die App:

- **Entwurf:** nur im Cockpit gespeichert, **keine** Benachrichtigung.
- **Übergabe offen:** Text an ChatGPT kopiert beziehungsweise Übernahme begonnen, **keine bestätigte** Benachrichtigung.
- **Manuell bestätigt:** Nutzer hat nach dem Absenden überprüft, dass die Aufgabe unter ChatGPT → Geplant aktiv ist. Die App kann das nicht selbst verifizieren.
- **Abgeglichen:** Aus einer manuell bereitgestellten Liste übernommener Aufgabenstatus; ebenfalls keine unabhängige Serverprüfung.

Für neue Aufgaben im Dashboard **Hinzufügen** → **Speichern** → **An ChatGPT senden** → **Auftrag kopieren** → in ChatGPT absenden → nach der Bestätigung zurückkehren → **In ChatGPT geprüft und aktiv**. Die Anzeige kann die Übertragung nicht überspringen. Zum Stoppen einer aktiven Aufgabe die Aufgabe **in ChatGPT unter Geplant** deaktivieren/löschen; das Löschen im Dashboard stoppt sie nicht. Push- und E-Mail-Kanäle in ChatGPT → Einstellungen → Benachrichtigungen konfigurieren.

**Nicht verwechseln:** Ein im Dashboard gespeicherter Eintrag unter `Erinnerungen` ist zunächst nur ein Hinweis im Cockpit. Er löst weder Browser-Push noch ChatGPT-Push aus. Für Erinnerungs-Benachrichtigungen zusätzlich eine echte ChatGPT-Aufgabe erstellen.

## Letzte intensive ChatGPT-Gespräche

Unter ChatGPT → Einstellungen → Datenkontrollen → Daten exportieren einen Datenexport anfordern. Aus dem ZIP die `conversations.json` lokal entpacken und unter **Chat-Verlauf importieren** auswählen. Die App nimmt drei zuletzt aktualisierte Chats mit mindestens zwölf Nutzer-/Assistenten-Nachrichten; wenn weniger vorhanden sind, füllt sie mit kürzeren Gesprächen auf. Die Datei wird nur lokal im Browser verarbeitet. Bei neuen Gesprächen ist ein neuer Export notwendig; ein dauerhafter Live-Zugriff auf deine Chat-Historie wird nicht behauptet.

Unter **Kontext für ChatGPT** kannst du den aktuellen Cockpit-Datenbestand in die Zwischenablage kopieren, um ihn bei Bedarf bewusst in ChatGPT zu übernehmen.

## Funktionsumfang und bekannte Grenzen

| Bereich | Funktioniert | Voraussetzung / Grenze |
|---|---|---|
| Dashboard und zusätzliche Module | Ja, lokal | Browser-Speicher oder JSON-Import |
| Verschlüsselte Cloud-Synchronisierung | Nach Einrichtung | Eigenes Supabase-Projekt und E-Mail-Anmeldung; mit lokalem Passwort entsperren |
| ChatGPT-Aufgaben direkt vom Dashboard aktivieren | Nein | Geführte, ausdrücklich manuelle ChatGPT-Übergabe |
| ChatGPT-Aufgaben-/Chat-/Memory-Live-Synchronisierung | Nein | Keine verfügbare öffentliche Schnittstelle für diesen Zugriff |
| Letzte intensive Chats aus Datenexport ermitteln | Ja | Gelegentlich aktueller `conversations.json`-Export |
| Nachrichten Weltwirtschaft / KI / Aktien | Ja, auf GitHub Pages | GitHub Actions und Google-News-RSS; eventuelle Ausfälle und Verzögerungen |
| Browser-Push / SMS | Nicht in der Website | Echte ChatGPT-Aufgaben und deren Benachrichtigungseinstellungen getrennt |

Der ursprüngliche Entwurf wurde optisch beibehalten, jedoch um konkrete Übergabe- und Synchronisierungsschritte ergänzt. Cloud-Funktionen benötigen zur End-to-End-Prüfung dein eigenes Supabase-Projekt; ohne diese Anmeldedaten lassen sich nur die lokalen UI-Abläufe, Datenverarbeitung und Kryptografie isoliert testen.
