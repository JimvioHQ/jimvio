# Trust Checker — threat-intelligence providers (licensing record)

Checked 2026-11-05 against each provider's official pages. Jimvio is treated as a
commercial organisation (the Trust Checker is part of a commercial platform, even
though scans are free for users). Only APPROVED sources are on by default.

| Provider | Free forever | Product/commercial use | Access | Decision | Evidence |
|---|---|---|---|---|---|
| Phishing.Database | Yes | MIT licence (use, copy, distribute, sell) | Public GitHub lists, no key | APPROVED WITH CONDITIONS — keep the MIT copyright notice (shown in provider terms) | github.com/Phishing-Database/Phishing.Database (LICENSE) — licence names "Software"; data files not named separately |
| CERT Polska Warning List | Yes | "may be used by any user for any purpose, including commercial purposes" | hole.cert.pl/domains/v2/domains.txt, no key | APPROVED WITH CONDITIONS — refresh ≤5 min, block subdomains not parents, honour removals, never imply NASK/CERT endorsement | cert.pl/en/warning-list/ |
| Feodo Tracker (abuse.ch) | Yes | CC0, commercial and non-commercial | feodotracker.abuse.ch/downloads/ipblocklist.txt | APPROVED | abuse.ch/terms-of-use/ §3.4 |
| SSL Blacklist (abuse.ch) | Yes | CC0, commercial and non-commercial | sslbl.abuse.ch/blacklist/sslblacklist.csv (≤ every 5 min) | APPROVED | abuse.ch/terms-of-use/ §3.4 |
| URLhaus / ThreatFox / MalwareBazaar (abuse.ch) | Not for commercial use | "may require a paid subscription, managed by Spamhaus" | Auth-Key | REJECTED as a free-forever source (adapter for URLhaus stays off unless URLHAUS_AUTH_KEY is set by the owner) | abuse.ch/terms-of-use/ §3.1–3.2, §4.1–4.2 |
| OpenPhish community feed | Free | Non-commercial only | openphish.com/feed.txt | REJECTED (adapter only accepts a licensed OPENPHISH_FEED_URL) | github.com/openphish/public_feed |
| PhishTank | Free | Not stated; Cisco EULA; new registrations closed | checkurl API with app key | UNVERIFIED / PERMISSION REQUIRED (off unless PHISHTANK_APP_KEY + PHISHTANK_USERNAME) | phishtank.com/developer_info.php |
| Phishing Army | Free | Adds no restriction, but "cannot grant rights over third-party data"; upstream includes OpenPhish (non-commercial), PhishTank, urlscan | Public lists | REJECTED (inherits upstream terms) | phishing.army/license/, phishing.army/sources/ |
| Spamhaus DROP | Free of charge | Commercial not explicitly granted; "Nothing … grant[s] … licence" | drop_v4.json | PERMISSION REQUIRED (not integrated) | spamhaus.org/drop/terms/ |
| DigitalSide Threat-Intel | Free | LICENSE file is a copied MIT template (other copyright holder) | osint.digitalside.it lists | UNVERIFIED (not integrated) | github.com/davidonzo/Threat-Intel |
| blocklist.de | Free | Not addressed; large-volume downloads excluded | export lists | UNVERIFIED (not integrated) | blocklist.de/en/terms.html |
| Emerging Threats compromised IPs | Free | Terms page not retrievable | rules.emergingthreats.net | UNVERIFIED (not integrated) | — |
| Google Web Risk | Not free (billing) | Commercial with billing | API key + billing | REJECTED as a required dependency (stays optional) | Google error: "requires billing to be enabled" |

Approved sources need no credentials. No paid or trial provider is required:
keyed adapters (URLhaus, PhishTank, OpenPhish, Web Risk) stay visible as
"Not configured" and are never counted as clean.

Independence: Phishing.Database, OpenPhish and PhishTank share a family (overlapping
community phishing data); CERT Polska, the abuse.ch C2 lists (Feodo + SSLBL) and
Google are separate families. Confidence counts families, not providers.
