# FITNESS AI PRO — 60-Punkte-Audit

Stand: 13.10.2026. Diese Liste trennt vorhandene Funktionen von Verbesserungen und bewusst späteren Ausbaustufen. „Vorhanden“ bedeutet zunächst statisch im Code erkannt; „UI getestet“ steht nur dort, wo ein echter Browserlauf stattgefunden hat.

## Produktstrategie und Funktionsstatus

| Nr. | Punkt | Status | Befund / nächster Schritt |
|---:|---|---|---|
| 1 | Klare USP: persönlicher KI-Gym-Coach für Einsteiger | Verbessern | Positionierung in Dashboard und Onboarding konsistent machen. |
| 2 | Zielgruppe Einsteiger/Jugendliche klar definieren | Verbessern | Altersgerechte Sprache, Belastungsgrenzen und Privatsphäre klarer sichtbar machen. |
| 3 | Adaptive Trainingspläne | Grundversion umgesetzt im Folge-Branch | Die Planerstellung lädt bis zu 30 eigene Trainingseinträge und übergibt die neuesten 20 als Kontext an die KI; sichere, kleine Anpassungen statt großer automatischer Steigerungen. E2E offen. |
| 4 | Trainingspläne passend zu Studio-Geräten | Teilweise vorhanden | Trainingsort wird berücksichtigt; Gerätebestand des konkreten Studios fehlt. |
| 5 | Geräte per QR-Code scannen | Später | Benötigt zuverlässige Geräte-Datenbank/Studio-Kooperation; kein MVP. |
| 6 | First Gym Mode | Grundversion umgesetzt im Folge-Branch | Aufklappbarer Einsteiger-Guide mit Geräteeinweisung, leichter Startlast, Pausen und Sicherheits-Hinweisen. |
| 7 | Kontextsensitiver KI-Coach | Teilweise vorhanden | Profilkontext und KI-Chat existieren; Trainingstage, Verlauf und letzte Einheit stärker einbeziehen. |
| 8 | Einfaches Onboarding | Verbessern | Profilfelder und Trainingsort schrittweise statt als lange Form erfassen. |
| 9 | Geschlecht nur bei echter Relevanz erfassen | Prüfen | Nicht unnötig erfassen; keine geschlechtsbasierten pauschalen Annahmen. |
| 10 | Sichere Ernährungshinweise für Jugendliche | Prüfen / begrenzen | Keine aggressiven Diäten oder Kalorienziele für Minderjährige; altersgerechte Hinweise priorisieren. |
| 11 | Ausführliches Makrotracking für Erwachsene | Später | Erst nach Stabilisierung des Trainings-Kernablaufs. |
| 12 | Keine Blutwerte im MVP | Bewusst zurückgestellt | Nicht implementieren. |
| 13 | Dashboard vereinfachen | Verbessern | Kernaktionen priorisieren: heutiges Training, Plan, Fortschritt. |
| 14 | Fortschritt als positive Geschichten | Teilweise vorhanden | Gewicht-/Trainingsverlauf existiert; positive, nicht wertende Zusammenfassung ergänzen. |
| 15 | Persönliche Rekorde (PRs) | Teilweise / prüfen | Trainingswerte existieren; PR-Erkennung nicht bestätigt. |
| 16 | Nicht-toxische Gamification | Verbessern | Konsistenz und persönliche Bestwerte statt Ranglisten/Druck. |
| 17 | Community | Vorhanden, nicht E2E getestet | Community-Tab, Profile, Posts, Likes und Kommentare im Code vorhanden. |
| 18 | Gemeinsam trainieren | Später | Benötigt Einladungen/Datenschutzregeln und Missbrauchsschutz. |
| 19 | Teilbare Fortschrittskarten | Später | Nur freiwillig, ohne sensible Profilwerte standardmäßig zu teilen. |
| 20 | Privacy-by-default für Minderjährige | Kritisch prüfen | Community ist vorhanden; Sichtbarkeit, Altersregeln und Bildfreigaben gründlich prüfen. |
| 21 | Altersmodi 14–15, 16–17, 18+ | Fehlt | Altersgerechte Modi und passende Grenzen implementieren. |
| 22 | Übungserklärungen/Videos | Vorhanden | Übungsbibliothek mit YouTube-Suche und KI-Erklärungsaktion erkannt. |
| 23 | Kamera-Formcheck | Später | Hohe Datenschutz-/Fehleranforderungen; nicht im MVP. |
| 24 | Pausentimer direkt im Training | Umgesetzt im Feature-Branch | 60-Sekunden-Pausentimer mit Pause/Fortsetzen/Neustart direkt an jeder Trainingskarte; Browser-E2E nach Deployment offen. |
| 25 | Spotify als Nebenfunktion | Teilweise | Musikbereich/Embed vorhanden; Spotify-API und vollständige Wiedergabe nicht bestätigt. |
| 26 | Personalisierte Schnellzugriffe | Vorhanden | Einstellungen für Schnellzugriffe erkannt; Browser-E2E noch offen. |
| 27 | Adaptiver Startbildschirm | Verbessern | Dashboard abhängig von Trainingsplan, letztem Training und Tagesstatus gestalten. |
| 28 | Erholung/Readiness | Teilweise | Tages-Check-in für Schlaf, Wasser und Schritte existiert; keine medizinische Readiness-Bewertung. |
| 29 | Apple Health / Health Connect | Später | Plattformintegration und Berechtigungen erforderlich. |
| 30 | Wearables | Später | Erst nach Kern-MVP und Datenschutzprüfung. |
| 31 | Studio-Dashboard | Teilweise umgesetzt im Feature-Branch | Studio-Center für Studio-Admins mit Profil-/Öffnungszeiten-/Ausstattungsdaten; Plattform-Admin kann Studios anlegen und Manager zuordnen. Live-E2E offen. |
| 32 | Studio-Inhalte | Später | Benötigt autorisierte Inhalte und Studio-Partnerschaft. |
| 33 | White Label | Später | Erst bei validiertem B2B-Bedarf. |
| 34 | Monetarisierungsstufen | Später / prüfen | Keine Bezahlwand vor funktionierendem Kernablauf. |
| 35 | Empfehlungsprogramm | Später | Erst nach stabiler Nutzung und Abuse-Schutz. |
| 36 | Creator-Programm | Später | Kein MVP. |
| 37 | Coach-Marktplatz | Später | Benötigt Anbieterprüfung, Moderation und rechtliche Klärung. |
| 38 | Challenges | Verbessern | Kleine private Ziele statt öffentlichem Leistungsdruck. |
| 39 | Fitness-Ausbildung/Erklärinhalte | Verbessern | Kurze, sichere Erklärungen zu Technik, Pausen und Progression ergänzen. |
| 40 | KI korrigiert Fitness-Mythen | Verbessern | Evidenzorientierte Antworten, Unsicherheit nennen und keine Diagnosen stellen. |
| 41 | Quellenangaben | Verbessern | Bei wissenschaftlichen/gesundheitlichen Aussagen nachvollziehbare Quellen anzeigen. |
| 42 | Keine medizinischen Versprechen | Kritisch prüfen | KI-Prompts und UI müssen Grenzen klar machen. |
| 43 | Markenauftritt | Verbessern | Einheitliche Typografie, Navigation und visuelle Hierarchie. |
| 44 | Design nicht wie generische KI-Startup-Seite | Verbessern | Training als Hauptprodukt zeigen; KI als unterstützendes Werkzeug. |
| 45 | Tonalität | Verbessern | Freundlich, klar, nicht wertend und altersgerecht. |
| 46 | Fünf Haupttabs | Prüfen | Navigation vorhanden, aber Struktur auf Kernbereiche reduzieren/validieren. |
| 47 | Fortschritt direkt im Training | Teilweise | Trainingskarten speichern Werte; Live-Fortschritt im Workout ergänzen. |
| 48 | „Warum diese Übung?“ | Teilweise | KI-Erklärung ist erreichbar; gezielte Erklärung direkt an jeder Planübung fehlt. |
| 49 | Übung tauschen | Grundversion im Feature-Branch | Tauschoptionen für bekannte Übungen, passende Tags und zurückgesetzte Logging-Felder; unbekannte Übungen zeigen einen sicheren Hinweis statt blind zu ersetzen. E2E offen. |
| 50 | Gym-Confidence-Modus | Fehlt | Kurze Gerätehinweise und diskrete Schritt-für-Schritt-Anleitung. |
| 51 | Skill-Level | Teilweise | KI soll Anfänger berücksichtigen; explizite Levelauswahl fehlt/prüfen. |
| 52 | Skills über Gewichte hinaus | Verbessern | Technik, Mobilität, Ausdauer und Trainingsroutine abbilden. |
| 53 | Flexible Ziele | Teilweise | Zielauswahl existiert; temporäre und veränderbare Ziele verbessern. |
| 54 | Sport-spezifische Programme | Später / ausbauen | Ziel „sportliche Leistung“ existiert; Programme für konkrete Sportarten fehlen. |
| 55 | Kein Body-Shaming | Kritisch prüfen | Texte, KI-Prompts und Progress-Anzeigen auf wertfreie Sprache prüfen. |
| 56 | Strukturiertes Feedback | Vorhanden | Bewertung und Nachricht im Feedbackformular vorhanden. |
| 57 | Microfeedback | Verbessern | Kurze Rückmeldung nach abgeschlossener Einheit anbieten, nicht aufdringlich. |
| 58 | Produktanalytics | Prüfen | Keine belastbare Ereignis-/Funnel-Auswertung in diesem Audit bestätigt. |
| 59 | North-Star-Metrik | Definieren | Vorschlag: wöchentlich abgeschlossene, protokollierte Trainingseinheiten pro aktivem Nutzer. |
| 60 | MVP-Kernablauf | Teilweise vorhanden | Onboarding → Ort → KI-Plan → Workout/Erklärungen → Logging → adaptive nächste Einheit → Fortschritt. Adaptivität ist die größte funktionale Lücke. |

## Neue Studio-Admin-Funktion (im vorherigen Deploy veröffentlicht)\n\n- Plattform-Admin kann ein Studio mit Stadt anlegen und eine Manager-E-Mail zuordnen.\n- Studio-Manager kann Studio-Name, Stadt, Adresse, Telefon, Website, Öffnungszeiten, Beschreibung/Ausstattung bearbeiten.\n- Studio-Manager kann Angebote mit Preis/Vorteil, Beschreibung, Start-/Enddatum erstellen, pausieren/aktivieren und löschen.\n- Veröffentlichung bleibt dem Plattform-Admin vorbehalten; ein Datenbank-Trigger blockiert Änderungen am Veröffentlichungsstatus durch Studio-Manager.\n- Neue Tabellen: `fitness_studios`, `studio_admins`, `studio_offers`; RLS aktiviert, Policies: 5/4/5. `anon` kann nur veröffentlichte Studios und gültige aktive Angebote lesen.\n- Live-Smoke-Test des App-Shells und des sign-out Zustands bestanden. Browser-End-to-End-Test der Studio-Verwaltung mit angemeldetem Admin steht noch aus.\n\n## Verifizierte technische Checks

- `script.js` und `studio-admin.js` bestehen den JavaScript-Syntaxcheck.
- `index.html` hat keine doppelten `id`-Attribute; Inline-JavaScript besteht den Syntaxcheck.
- Live-Browser: Anmeldung erfolgreich; Profilseite mit Name, Alter, Größe und Ernährungsweise sichtbar.
- Live-Browser: „Profil speichern“ mit unveränderten Werten zeigte „Profil erfolgreich gespeichert.“
- Live-Browser: Feedbackformular mit 1–5-Bewertung und Nachricht vorhanden; es wurde kein Testfeedback gesendet.
- Vorhandene Module im Code: KI-Trainingsplan, AI-Chat, Trainingsprotokoll, Gewichtsverlauf, Tages-Check-in, Community, Übungsbibliothek, eigener Timer, Musikbereich, Schnellzugriffe.
- Supabase Security Advisor meldet: veraltete Tabelle `public."Feedback"` ohne RLS-Policies; zwei `SECURITY DEFINER`-Funktionen sind für `anon` ausführbar; Schutz vor kompromittierten Passwörtern ist deaktiviert. Diese Punkte sollten vor breiter Veröffentlichung behoben werden.
- Supabase Performance Advisor meldet fehlende Indizes auf zwei Fremdschlüsseln und mehrere permissive Feedback-SELECT-Policies; vor Schemaänderungen prüfen.
- Ein vollständiger End-to-End-Test aller Community-, KI-, Musik- und Trainingsabläufe steht noch aus.
- Folge-Branch ergänzt adaptive Planerstellung anhand eigener Trainingshistorie, First-Gym-Einsteiger-Guide und öffentliche Seite für freigeschaltete Studios/Angebote. JavaScript-Syntax- und HTML-ID-Prüfungen bestanden; Live-Test nach Deployment offen.

## Reihenfolge für die Umsetzung

1. Sicherheit/Privatsphäre und Auth-Zugriff prüfen.
2. Kernablauf zuverlässig machen: Profil → Trainingsplan → Workout-Logging → Fortschritt.
3. Pausentimer und Übungstausch direkt im Workout ergänzen.
4. Adaptive Folgepläne und First Gym Mode.
5. Altersmodi, Quellen, wertfreie Sprache und Feedbackschleife.
6. Danach Community-Extras, Integrationen und Monetarisierung.
