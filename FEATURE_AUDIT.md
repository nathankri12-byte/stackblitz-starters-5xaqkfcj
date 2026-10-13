# FITNESS AI PRO — 60-Punkte-Audit

Stand: 13.10.2026. Diese Liste trennt vorhandene Funktionen von Verbesserungen und bewusst späteren Ausbaustufen. „Vorhanden“ bedeutet zunächst statisch im Code erkannt; „UI getestet“ steht nur dort, wo ein echter Browserlauf stattgefunden hat.

## Produktstrategie und Funktionsstatus

| Nr. | Punkt | Status | Befund / nächster Schritt |
|---:|---|---|---|
| 1 | Klare USP: persönlicher KI-Gym-Coach für Einsteiger | Teilweise umgesetzt | Anmeldebereich nennt jetzt den KI-Gym-Coach für Training, Technik und Fortschritt; Dashboard-Überschrift vereinheitlicht. Vollständige Onboarding-Prüfung offen. |
| 2 | Zielgruppe Einsteiger/Jugendliche klar definieren | Teilweise umgesetzt | KI erhält jetzt altersabhängige Leitlinien für 14–15, 16–17 und 18+ sowie konservative Vorgaben bei unbekanntem Alter. Sichtbarkeit im Onboarding und Privatsphäre-UX noch prüfen. |
| 3 | Adaptive Trainingspläne | Grundversion umgesetzt im Folge-Branch | Die Planerstellung lädt bis zu 30 eigene Trainingseinträge und übergibt die neuesten 20 als Kontext an die KI; sichere, kleine Anpassungen statt großer automatischer Steigerungen. E2E offen. |
| 4 | Trainingspläne passend zu Studio-Geräten | Grundversion umgesetzt, E2E offen | Admins pflegen Geräte/Ausstattung pro Studio. Nutzer wählen ein freigeschaltetes Studio per Name; dessen Geräte-Liste fließt in den Planprompt ein. |
| 5 | Geräte per QR-Code scannen | Später | Benötigt zuverlässige Geräte-Datenbank/Studio-Kooperation; kein MVP. |
| 6 | First Gym Mode | Grundversion umgesetzt im Folge-Branch | Aufklappbarer Einsteiger-Guide mit Geräteeinweisung, leichter Startlast, Pausen und Sicherheits-Hinweisen. |
| 7 | Kontextsensitiver KI-Coach | Teilweise umgesetzt | KI-Chat berücksichtigt Profil, bis zu 10 aktuelle Trainingseinträge und die letzten drei Kurzfeedbacks. Adaptive Folgeplanung berücksichtigt bis zu 30 Einträge und die letzten sieben Rückmeldungen. Ende-zu-Ende-Test offen. |
| 8 | Einfaches Onboarding | Teilweise umgesetzt | Dashboard zeigt fehlende Pflichtangaben vor der Planerstellung und bietet einen direkten Profil-Link. Ein mehrstufiger Einrichtungsassistent bleibt offen. |
| 9 | Geschlecht nur bei echter Relevanz erfassen | Prüfen | Nicht unnötig erfassen; keine geschlechtsbasierten pauschalen Annahmen. |
| 10 | Sichere Ernährungshinweise für Jugendliche | Grundschutz ergänzt, Prüfung offen | KI-Anweisungen verbieten für Minderjährige restriktive Kalorien-/Makroziele zur Gewichtsabnahme, Crash-Diäten und Druck durch Gewichtszahlen. Ernährungsplan-UI und authentifizierte End-to-End-Tests noch prüfen. |
| 11 | Ausführliches Makrotracking für Erwachsene | Später | Erst nach Stabilisierung des Trainings-Kernablaufs. |
| 12 | Keine Blutwerte im MVP | Bewusst zurückgestellt | Nicht implementieren. |
| 13 | Dashboard vereinfachen | Teilweise umgesetzt | Heutige Einheit und nächste Empfehlung werden aus dem gespeicherten Wochenplan abgeleitet. Gesamtzahl und Reihenfolge der Dashboard-Karten weiter prüfen. |
| 14 | Fortschritt als positive Geschichten | Grundversion umgesetzt im Folge-Branch | Fortschrittsbereich zeigt abgeschlossene Trainingstage, abgeschlossene Übungen und eigene Bestwerte in wertfreier Sprache. |
| 15 | Persönliche Rekorde (PRs) | Grundversion umgesetzt im Folge-Branch | Höchste gespeicherte Gewichte je Übung werden im Fortschrittsbereich zusammengefasst; noch kein automatischer PR-Verlauf. |
| 16 | Nicht-toxische Gamification | Teilweise umgesetzt | Persönliche Meilensteine und wertfreie Texte vorhanden; öffentliche Challenge-Ranglisten entfernt. Weitere Texte und Vergleichselemente prüfen. |
| 17 | Community | Vorhanden, E2E offen | Community-Tab, Profile, Posts, Likes, Kommentare, Freundschaftsanfragen und Challenges vorhanden. Profil-/Beitrags-Sichtbarkeit ist jetzt standardmäßig privat und muss aktiv freigegeben werden. Authentifizierte End-to-End-Tests offen. |
| 18 | Gemeinsam trainieren | Grundversion umgesetzt | Nutzer können den heutigen Trainingsschwerpunkt und Übungen ohne persönliche Profilwerte über die native Teilen-Funktion an Freunde senden. Gemeinsame Live-Sessions/Terminplanung bleiben offen. |
| 19 | Teilbare Fortschrittskarten | Grundversion umgesetzt | Fortschrittskarte als PNG kann freiwillig erstellt/geteilt werden; sensible Profilwerte werden nicht standardmäßig aufgenommen. E2E offen. |
| 20 | Privacy-by-default für Minderjährige | Teilweise umgesetzt, weiter kritisch prüfen | Community-Profile sind standardmäßig privat; Freigabe ist explizit per Checkbox erforderlich. RLS beschränkt Profile, Beiträge, Kommentare, Likes, Follows und Challenge-Teilnahmen auf sichtbare Mitglieder bzw. eigene Daten. Storage-Bildrichtlinien, Moderation und authentifizierte E2E-Prüfung bleiben offen. |
| 21 | Altersmodi 14–15, 16–17, 18+ | Grundversion umgesetzt | KI-Coach schaltet anhand des Profilalters automatisch auf Leitlinien für 14–15, 16–17 oder 18+; bei fehlendem/ungültigem Alter gilt eine konservative Fallback-Regel. UI-Test offen. |
| 22 | Übungserklärungen/Videos | Vorhanden | Übungsbibliothek mit YouTube-Suche und KI-Erklärungsaktion erkannt. |
| 23 | Kamera-Formcheck | Später | Hohe Datenschutz-/Fehleranforderungen; nicht im MVP. |
| 24 | Pausentimer direkt im Training | Umgesetzt im Feature-Branch | 60-Sekunden-Pausentimer mit Pause/Fortsetzen/Neustart direkt an jeder Trainingskarte; Browser-E2E nach Deployment offen. |
| 25 | Spotify als Nebenfunktion | Teilweise | Musikbereich/Embed vorhanden; Spotify-API und vollständige Wiedergabe nicht bestätigt. |
| 26 | Personalisierte Schnellzugriffe | Vorhanden | Einstellungen für Schnellzugriffe erkannt; Browser-E2E noch offen. |
| 27 | Adaptiver Startbildschirm | Teilweise umgesetzt | Dashboard-Empfehlung reagiert auf vorhandenen Plan, heutige Einheit/Ruhetag und Trainingsziel. Letzten Check-in und letzte absolvierte Einheit noch stärker einbeziehen. |
| 28 | Erholung/Readiness | Teilweise | Tages-Check-in für Schlaf, Wasser und Schritte existiert; keine medizinische Readiness-Bewertung. |
| 29 | Apple Health / Health Connect | Später | Plattformintegration und Berechtigungen erforderlich. |
| 30 | Wearables | Später | Erst nach Kern-MVP und Datenschutzprüfung. |
| 31 | Studio-Dashboard | Grundversion umgesetzt, E2E offen | Plattform-Admin legt Studio an und ordnet Manager zu; Studio-Manager pflegt Profil, Geräte/Ausstattung und Angebote; Admin steuert Veröffentlichung. |
| 32 | Studio-Inhalte | Später | Benötigt autorisierte Inhalte und Studio-Partnerschaft. |
| 33 | White Label | Später | Erst bei validiertem B2B-Bedarf. |
| 34 | Monetarisierungsstufen | Später / prüfen | Keine Bezahlwand vor funktionierendem Kernablauf. |
| 35 | Empfehlungsprogramm | Später | Erst nach stabiler Nutzung und Abuse-Schutz. |
| 36 | Creator-Programm | Später | Kein MVP. |
| 37 | Coach-Marktplatz | Später | Benötigt Anbieterprüfung, Moderation und rechtliche Klärung. |
| 38 | Challenges | Grundversion vorhanden, Datenschutz ergänzt | Freiwillige Challenges zählen Einheiten/Minuten/aktive Tage, nicht Körpergewicht. Teilnahme und Fortschritt werden nur für eigene Daten bzw. freigegebene Community-Mitglieder sichtbar; Tonalität und E2E weiter prüfen. |
| 39 | Fitness-Ausbildung/Erklärinhalte | Teilweise umgesetzt | Übungserklärungen und First-Gym-Hinweise vorhanden; KI-Anweisungen betonen Technik, Pausen, Progression und sichere Erholung. Strukturierte Lernmodule bleiben offen. |
| 40 | KI korrigiert Fitness-Mythen | Teilweise umgesetzt | KI-Prompt fordert freundliche, evidenzorientierte Korrektur verbreiteter Fitness-Mythen und klare Unsicherheit; gezielte Testfälle fehlen. |
| 41 | Quellenangaben | Teilweise umgesetzt | KI soll nur zuverlässig bekannte Quellen/Organisationen nennen und keine Studien/Links erfinden. Verifizierte Quellenabrufe bzw. automatische Quellenprüfung sind nicht integriert. |
| 42 | Keine medizinischen Versprechen | Grundschutz ergänzt, Prüfung offen | KI-Anweisungen untersagen medizinische Diagnosen/Heilversprechen und verweisen bei gesundheitlichen Problemen an Eltern oder medizinische Fachpersonen. Weitere UI-/Prompt-Prüfung offen. |
| 43 | Markenauftritt | Teilweise umgesetzt | Sportfotografie und responsive visuelle Hierarchie ergänzt; Navigation, Typografie und sämtliche Ansichten weiter prüfen. |
| 44 | Design nicht wie generische KI-Startup-Seite | Teilweise umgesetzt | Positionierung nennt jetzt Training, Technik und Fortschritt als Kern; Training und Workout im Dashboard weiter priorisieren. |
| 45 | Tonalität | Verbessern | Freundlich, klar, nicht wertend und altersgerecht. |
| 46 | Fünf Haupttabs | Prüfen | Navigation vorhanden, aber Struktur auf Kernbereiche reduzieren/validieren. |
| 47 | Fortschritt direkt im Training | Grundversion umgesetzt | Live-Balken zeigt erledigte Übungen im aktuellen Wochenplan und aktualisiert sich beim Abhaken/Speichern. Browser-E2E offen. |
| 48 | „Warum diese Übung?“ | Grundversion im Folge-Branch | Jede Trainingskarte hat eine Aktion, die im separaten KI-Coach Ziel, Muskelgruppen, Technik und häufige Fehler erklären lässt. |
| 49 | Übung tauschen | Grundversion im Feature-Branch | Tauschoptionen für bekannte Übungen, passende Tags und zurückgesetzte Logging-Felder; unbekannte Übungen zeigen einen sicheren Hinweis statt blind zu ersetzen. E2E offen. |
| 50 | Gym-Confidence-Modus | Grundversion vorhanden | First Gym Mode mit Einstiegs-/Sicherheitshinweisen sowie KI-Erklärung pro Übung; ausführlichere Geräteanleitungen bleiben offen. |
| 51 | Skill-Level | Grundversion im Folge-Branch | Erfahrungslevel Anfänger / Schon etwas Erfahrung / Fortgeschritten ist speicherbar und fließt in Trainingsplan und KI-Coach-Kontext ein. |
| 52 | Skills über Gewichte hinaus | Teilweise umgesetzt | Ziele für Technik, Beweglichkeit und Trainingsroutine ergänzt; Fortschrittsübersicht zeigt zusätzlich Wiederholungen und Dauer statt nur Gewichte. Eigenständige Skill-Bewertung bleibt offen. |
| 53 | Flexible Ziele | Grundversion ergänzt | Ziele können um ein optionales Zieldatum ergänzt werden; Datum wird im Profil gespeichert und in den KI-Planprompt übernommen. E2E-Test offen. |
| 54 | Sport-spezifische Programme | Grundversion ergänzt | Ziele für Basketball, Tennis, Parkour, Laufen und Fußball ergänzen den KI-Planprompt. Vollständige geprüfte Sportprogramme und gezielte Tests bleiben offen. |
| 55 | Kein Body-Shaming | Kritisch prüfen | Texte, KI-Prompts und Progress-Anzeigen auf wertfreie Sprache prüfen. |
| 56 | Strukturiertes Feedback | Vorhanden | Bewertung und Nachricht im Feedbackformular vorhanden. |
| 57 | Microfeedback | Grundversion umgesetzt | Nach Abschluss aller Übungen des aktuellen Tages erscheint freiwilliges Kurzfeedback (zu leicht / genau richtig / zu anstrengend); es wird privat gespeichert und bei der nächsten Planerstellung berücksichtigt. Authentifizierter E2E-Test offen. |
| 58 | Produktanalytics | Prüfen | Keine belastbare Ereignis-/Funnel-Auswertung in diesem Audit bestätigt. |
| 59 | North-Star-Metrik | Definieren | Vorschlag: wöchentlich abgeschlossene, protokollierte Trainingseinheiten pro aktivem Nutzer. |
| 60 | MVP-Kernablauf | Grundversion implementiert, E2E offen | Profil → Studio verbinden per Name → gerätebewusster KI-Plan → Workout/Logging → Trainingshistorie im Folgeplan → persönliche Meilensteine. Der vollständige Ablauf muss live durchgetestet werden. |

## Studio-Admin und Verbindung per Studio-Namen (live deployed)\n\n- Plattform-Admin kann ein Studio mit Stadt anlegen und eine Manager-E-Mail zuordnen.\n- Studio-Manager kann Studio-Name, Stadt, Adresse, Telefon, Website, Öffnungszeiten, Beschreibung und separate Geräte-/Ausstattungsliste bearbeiten.
- Nutzer wählen im Profil „Fitnessstudio“, geben den Namen eines freigeschalteten Studios ein und speichern die Verbindung; die ausgewählte Studio-ID wird im Profil gespeichert und die Geräte-/Ausstattungsdaten fließen in den KI-Trainingsplan ein.\n- Studio-Manager kann Angebote mit Preis/Vorteil, Beschreibung, Start-/Enddatum erstellen, pausieren/aktivieren und löschen.\n- Veröffentlichung bleibt dem Plattform-Admin vorbehalten; ein Datenbank-Trigger blockiert Änderungen am Veröffentlichungsstatus durch Studio-Manager.\n- Neue Tabellen: `fitness_studios`, `studio_admins`, `studio_offers` und `workout_session_feedback`; RLS aktiviert. Kurzfeedback ist auf eigene Nutzerdaten beschränkt. `anon` kann nur veröffentlichte Studios und gültige aktive Angebote lesen.\n- Render-Deployment der aktuellen Version ist live. Öffentlicher Browser-Smoke-Test bestätigt, dass die Login-/Registrierungsseite lädt und kein Fehler-Overlay sichtbar ist. Der bereits getestete Profil-Speichervorgang funktioniert; angemeldeter End-to-End-Test für Studio-Verbindung, Admin-Konfiguration und Angebotsspeicherung steht noch aus.\n\n## Verifizierte technische Checks

- `script.js` und `studio-admin.js` bestehen den JavaScript-Syntaxcheck.
- `index.html` hat keine doppelten `id`-Attribute; Inline-JavaScript besteht den Syntaxcheck.
- Live-Browser: Anmeldung erfolgreich; Profilseite mit Name, Alter, Größe und Ernährungsweise sichtbar.
- Live-Browser: „Profil speichern“ mit unveränderten Werten zeigte „Profil erfolgreich gespeichert.“
- Live-Browser: Feedbackformular mit 1–5-Bewertung und Nachricht vorhanden; es wurde kein Testfeedback gesendet.
- Vorhandene Module im Code: KI-Trainingsplan, AI-Chat mit altersabhängigen Sicherheitsleitlinien, Trainingsprotokoll, Gewichtsverlauf, Tages-Check-in, Community mit Opt-in-Sichtbarkeit, Übungsbibliothek, eigener Timer, Musikbereich, Schnellzugriffe und teilbare Fortschrittskarte.
- Supabase Security Advisor meldet: veraltete Tabelle `public."Feedback"` hat RLS ohne Policies; Tabellenrechte für `PUBLIC`, `anon` und `authenticated` wurden entzogen, da die App die separate Tabelle `public.feedback` nutzt. Drei `SECURITY DEFINER`-Funktionen bleiben für angemeldete Nutzer ausführbar; ihre Verwendung ist vor Änderung sorgfältig zu prüfen, da `is_app_admin`/`is_studio_manager` in RLS genutzt werden und `admin_list_profile_names` intern Admin-Rechte prüft. Schutz vor kompromittierten Passwörtern ist weiterhin deaktiviert und muss in den Supabase-Auth-Einstellungen aktiviert werden.
- Supabase Performance Advisor: die Studio-Admin-Policy wurde auf `(select auth.jwt() ->> email)` umgestellt und doppelte permissive SELECT-Policies für veröffentlichte Studios/Angebote wurden zusammengeführt, ohne anonymen Zugriff auf unveröffentlichte Daten zu erweitern. Der Advisor meldet weiterhin eine Auth-RLS-Initialplan-Warnung, 17 bisher ungenutzte Indizes (nicht ohne Last-/Nutzungsanalyse entfernen) und weitere Hinweise.
- Ein vollständiger End-to-End-Test aller Community-, KI-, Musik- und Trainingsabläufe steht noch aus. Community-Opt-in und die neuen RLS-Regeln sowie `workout_session_feedback` wurden per SQL/Policy-Abfrage und JavaScript-/HTML-Syntaxcheck geprüft; ein Test mit echtem angemeldetem Nutzer ist noch offen.
- Feature-Branch ergänzt adaptive Planerstellung anhand eigener Trainingshistorie, First-Gym-Einsteiger-Guide, öffentliche Seite für freigeschaltete Studios/Angebote, Übungserklärungen direkt aus dem Workout, wertfreie Trainings-Meilensteine, speicherbares Erfahrungslevel und Verbindung zum konfigurierten Studio anhand des Namens. JavaScript-Syntax- und HTML-ID-Prüfungen sowie Live-Tests müssen nach Merge/Deploy erneut bestätigt werden.

## Reihenfolge für die Umsetzung

1. Sicherheit/Privatsphäre und Auth-Zugriff prüfen.
2. Kernablauf zuverlässig machen: Profil → Trainingsplan → Workout-Logging → Fortschritt.
3. Pausentimer und Übungstausch direkt im Workout ergänzen.
4. Adaptive Folgepläne und First Gym Mode.
5. Altersmodi, Quellen, wertfreie Sprache und Feedbackschleife.
6. Danach Community-Extras, Integrationen und Monetarisierung.

## Neu ergänzt am 13.10.2026

- Community: Freundschaftsanfragen (senden, annehmen, ablehnen, zurückziehen), Challenges mit Fortschrittsanzeige und freiwilliger Rangliste, Meldungen zu Beiträgen und ein Admin-Prüfbereich.
- Fortschritt: Erfolgskarten als PNG zum Teilen/Herunterladen; private Körper- und Gesundheitswerte werden nicht auf die Karte gesetzt.
- Ernährung: privates Ernährungstagebuch mit Mahlzeit, Datum und optionaler Notiz; keine Kalorienziele als Standard.
- Anmeldung: Apple-OAuth-Schaltfläche ergänzt; der Provider benötigt noch eine Apple-/Supabase-Konfiguration, bevor echte Anmeldung möglich ist.
- Datenbank: neue RLS-geschützte Tabellen für Freundschaftsanfragen, Challenges, Teilnahmen, Meldungen und Ernährungstagebuch; Fremdschlüssel-Indizes ergänzt.
- Tests: JavaScript-Syntax, Inline-Scripts und doppelte HTML-IDs geprüft. Live-Smoke-Test der Login-Seite erfolgreich; authentifizierte End-to-End-Tests der neuen Funktionen stehen noch aus.
