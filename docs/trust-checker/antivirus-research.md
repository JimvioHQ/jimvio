# File antivirus for Digital Product Verification — research (Nov 2026)

Requirement: free forever, no credit card, no trial, no mandatory billing,
commercial use explicitly allowed, and no uploading buyers' private files to
third parties without consent. If nothing qualifies, keep the honest
"Antivirus: Not Configured" status (current behaviour) — never a clean verdict.

| Option | Free? | Commercial use | Privacy | Decision |
|---|---|---|---|---|
| **ClamAV** (Cisco Talos) | Yes, GPLv2 | Allowed under GPLv2 (ClamAV maintainers: "Can you use ClamAV in a commercial environment? Sure. As long as you adhere to the GPLv2") | Runs on our own server, files never leave Jimvio | **Eligible licence, but not deployable for free** (see below) |
| VirusTotal Public API | Free key | **Prohibited**: "The VirusTotal public API must not be used in commercial products or services" | Uploads are shared with the security community | Rejected |
| MetaDefender Cloud (OPSWAT) | Free tier | Not stated for the free tier; the Standard tier is "geared towards personal users and very small startups"; contractual limits per key (free Prevention API: 40 requests/day) | Third-party upload; private scanning only on paid tiers | Rejected |
| Hybrid Analysis / sandboxes | Free registration | Community / non-commercial terms; public sandbox reports | Uploads become public reports | Rejected |

## Why ClamAV is not enabled

- ClamAV needs **3 GiB RAM minimum, 4 GiB preferred**, and "uses upwards of
  1.2 GiB of RAM simply to load the signature definitions"
  (docs.clamav.net, Docker guide). Vercel Functions cannot hold that in memory
  across requests, so a scan would reload the signatures (hundreds of MB)
  every time.
- It therefore needs an always-on server. No hosting option we found is free
  forever **without a credit card** (the "always free" cloud tiers require a
  card at sign-up), so it would breach the no-billing rule.
- Talos asks that signature updates use FreshClam at most once or twice a day
  and blocks abusive downloaders, so per-request downloads from serverless
  functions are not acceptable either.

## What would make it possible (owner decision)

A small always-on server the owner already pays for (≥4 GiB RAM) running
`clamd` + FreshClam on a private network, called by the product checker with a
timeout. Until the owner approves such a host, the checker keeps reporting
"Antivirus: Not Configured" and tells buyers to scan files themselves.

Sources: ClamAV README (licence) — github.com/Cisco-Talos/clamav;
docs.clamav.net/manual/Installing/Docker.html (RAM); clamav-users list,
12 Aug 2021 (commercial use); blog.clamav.net (FreshClam usage);
docs.virustotal.com/reference/getting-started (public API terms);
opswat.com/blog/announcement-changes-metadefender-cloud-api-licensing and
opswat.com/docs/mdcloud/account-management/product-licensing (MetaDefender).
