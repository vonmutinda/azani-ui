# azanikids.com domain rollout

The approved destination is the production storefront at `https://azanikids.com`
and production API at `https://api.azanikids.com`, with staging separate. This
guide prepares the rollout; it does not authorize live configuration changes,
release promotion, or deployment. Hold DNS cutover until the reviewed production
release is ready. Family Bank is the sole payment provider; activation, credentials,
callback registration, and real payments are outside this domain PR.

## Verified baseline — 2026-10-05

The signed-in Squarespace and Railway settings were inspected in Chrome.

Railway project: `Azani` (`de930e78-10ba-4241-a31a-925fca4e6f82`).

| Environment | ID                                     | UI / API source       | Storefront                                | API                                        |
| ----------- | -------------------------------------- | --------------------- | ----------------------------------------- | ------------------------------------------ |
| Production  | `08b51cbe-6616-4424-bfa5-29e8acaa8f3c` | `main` / `main`       | `https://azani-ui.up.railway.app`         | `https://azani-api.up.railway.app`         |
| Staging     | `63a7cb39-e92e-4963-af4b-8e2ba2a7a82b` | `develop` / `develop` | `https://azani-ui-staging.up.railway.app` | `https://azani-api-staging.up.railway.app` |

The UI service ID is `6b3005f1-3ff5-4700-9221-d9c1b924a4b7`; the API service ID
is `be0dd2b3-9b51-4f62-b666-eb04bda13e61`. Production has the older release;
staging UI's active deployment was PR #60 (cart/catalog polish). Both environments
have auto-deploy enabled; inspected Wait for CI settings were off. Do not change
those settings or merge to either tracked branch as part of preparing this guide.

Staging UI's backend and site URL variables point to the staging URLs above.
Its image host is `minio-staging-0e36.up.railway.app`. Staging API's
`STOREFRONT_URL` points to staging UI; its CORS lists include staging and local
development origins. Leave staging configuration unchanged. The legacy Railway
`NEXT_PUBLIC_STORE_DOMAIN=azani.shop` exists; verify whether the selected release
uses it before changing it. This guide does not rename configuration contracts.

### Existing DNS and security

Registrar/DNS host: Squarespace. Authoritative nameservers are
`nsb1.squarespacedns.com` through `nsb4.squarespacedns.com`. DNSSEC is enabled
in the domain's DNSSEC panel. Domain lock and WHOIS privacy are enabled.

| Existing record | Name             | Data                                                                                                    | TTL     |
| --------------- | ---------------- | ------------------------------------------------------------------------------------------------------- | ------- |
| A (four)        | `@`              | `198.185.159.144`, `198.185.159.145`, `198.49.23.144`, `198.49.23.145`                                  | 4 hours |
| CNAME           | `www`            | `ext-sq.squarespace.com`                                                                                | 4 hours |
| HTTPS           | `@`              | Squarespace parking service, priority `1`, target `.`, `h2,http/1.1`, IPv4 hints for the four A records | 4 hours |
| CNAME           | `_domainconnect` | `_domainconnect.domains.squarespace.com`                                                                | 1 hour  |
| TXT             | `@`              | `v=spf1 -all`                                                                                           | 4 hours |
| TXT             | `_dmarc`         | `v=DMARC1; p=reject; sp=reject; adkim=s; aspf=s`                                                        | 4 hours |
| TXT             | `_domainkey`     | `v=DKIM1; p=`                                                                                           | 4 hours |

The DNS panel showed no custom records or MX records. Recheck and capture the
complete zone immediately before any approved change. Preserve all email,
verification, Domain Connect, and security records, including any added since
this inspection. Do not provision or advertise a new `@azanikids.com` email
address merely because the domain is registered.

## Apex routing must be resolved before cutover

Squarespace's actual record-type menu includes ALIAS. Its current
[web-hosting guide](https://support.squarespace.com/hc/en-us/articles/31119879125645-DNS-records-for-web-hosting)
documents ALIAS at `@`, requires DNSSEC to be off, and also describes a Railway
preset. In contrast, [Railway's domain guide](https://docs.railway.com/networking/domains/working-with-domains)
lists Squarespace among providers without compatible apex flattening/dynamic
ALIAS support. ALIAS availability alone does not prove Railway compatibility.

Railway's [DNS configuration guidance](https://docs.railway.com/integrations/api/manage-domains)
states that it publishes no static inbound IP and does not support A records
for this route. Its [Pro static outbound IPs](https://docs.railway.com/networking/static-outbound-ips)
cannot receive inbound traffic and cannot solve apex routing.

Keep DNSSEC enabled and current nameservers in place. Do not apply a preset,
disable DNSSEC, resolve a Railway hostname to an IP and pin it as an A record,
or put a normal CNAME at `@`. Before live work, verify an apex route that preserves
the approved canonical apex and current security. If no compatible route is
available, stop and obtain a separate decision on DNS hosting or canonical-host
strategy. Nameserver migration and weakening DNSSEC need separate approval;
neither is authorized by approving this PR.

## Record plan — values generated later

| Hostname            | Railway destination              | DNS preparation                                                                                                    |
| ------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `azanikids.com`     | Production `azani-ui`            | Compatible apex route pending; use that custom domain's exact generated target and verification TXT after approval |
| `api.azanikids.com` | Production `azani-api`           | `api` CNAME plus Railway's exact generated verification TXT name/value                                             |
| `www.azanikids.com` | HTTPS redirect to canonical apex | Application/edge redirect implementation pending; verify HTTPS, path/query preservation, and absence of loops      |

Use a separately approved and verified application or edge redirect for `www`
to the canonical apex. [Squarespace managed forwarding](https://support.squarespace.com/hc/en-us/articles/214767107-Forwarding-a-domain)
can preserve paths but drops query parameters, so it does not meet this plan's
path-and-query preservation requirement in either direction. Redirect
implementation and routing remain pending; this PR implements no redirect.

Exact generated CNAME/TXT values and domain target ports are **pending**. No
custom domains were added during inspection. Railway's existing public URLs
are service identities, not a substitute for its generated custom-domain DNS
records. Do not guess TXT names or values. Browser-facing traffic uses HTTPS
port 443; Railway's target port must match the application's actual listener.
Verify each current domain's target port and selected release's `PORT`/start
command before adding a custom domain; do not assume local UI/API ports apply.

At approved cutover, replace only conflicting Squarespace parking records
(including the apex HTTPS record) as required by the reviewed route. Preserve
their exact values in the rollback snapshot. Do not delete unrelated presets
or email records. Account reauthentication may require the user's secure handoff.

## Production application configuration

Apply these only with the reviewed production release and approved deployment:

| Service | Variable                             | Intended value / rule                                                                     |
| ------- | ------------------------------------ | ----------------------------------------------------------------------------------------- |
| UI      | `NEXT_PUBLIC_MEDUSA_BACKEND_URL`     | `https://api.azanikids.com`                                                               |
| UI      | `NEXT_PUBLIC_SITE_URL`               | `https://azanikids.com`                                                                   |
| UI      | `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` | Existing correct production key; do not copy a staging key or publish its value           |
| UI      | `NEXT_PUBLIC_IMAGE_HOSTS`            | Preserve the selected release's existing production image hosts                           |
| API     | `STOREFRONT_URL`                     | `https://azanikids.com` for reset, verification, and email links                          |
| API     | `STORE_CORS`                         | Exact canonical storefront origin; preserve needed existing production transition origins |
| API     | `ADMIN_CORS`                         | Exact actual admin origin(s), including the custom API origin if admin is served there    |
| API     | `AUTH_CORS`                          | Exact storefront and admin origins; preserve needed transition origins                    |

Inspect current production nonsecret values before applying a delta; this
inspection did not reveal their URL/CORS values. Do not dump the variable set or
change secrets. CORS origins include `https://` and no path or trailing slash.
Include `www` only if it actually serves the application rather than redirects.
Do not use wildcard CORS with credentialed requests. Add transition origins
before traffic moves and remove them only after validation and separate review.

`NEXT_PUBLIC_*` values are build-time configuration and need a rebuild. The
existing metadata fallback is `https://azani.shop`; set the site URL explicitly.
Changing the example does not change deployed metadata or configure an HTTP
redirect. Preserve existing image allowlists and HSTS/security headers.

If Google sign-in is enabled, verify authorized JavaScript origins and the
provider's actual callback URL. Check the UI `/account/google-callback` and API
`/auth/customer/google/callback` flow against the provider configuration; do not
guess which callback is registered. Update OAuth configuration only with the
necessary authorization. Verify reset and verification links use the canonical
site. Do not change payment callback URLs or tokens as part of this rollout.

Login tokens, carts, and wishlists held in browser storage belong to an origin.
They do not migrate automatically from the Railway URL or old domain. Test a
fresh browser session and acknowledge that users may need to sign in again.
Verify credentialed API requests and cookie Secure/SameSite behavior on the new
HTTPS origins; do not broaden cookie domains or weaken cookie security.

## Execution and verification checklist

1. Separately review and prepare the intended production release; this PR does
   not sync `develop` into `main` or deploy code. Verify release commits, database
   readiness, existing image hosts, and Family Bank-only configuration without
   activating payments or making a transaction.
2. Resolve the apex/security prerequisite. Capture the full DNS zone, old
   nonsecret URL/CORS configuration, domain mappings, and redirect rules.
3. Obtain approval for the concrete Railway domain/port and DNS record plan.
   Add approved custom domains to the correct production services and capture
   their exact generated DNS records. Staging remains on its current URLs.
4. Prepare the API's exact production CORS and required OAuth configuration,
   retaining the current storefront origin during transition. Deploy the API
   release/configuration only when separately authorized. Do not merge or
   redeploy merely to unblock CI.
5. Apply the approved API DNS records first. Verify `api.azanikids.com` public
   DNS, Railway domain ownership, TLS issuance, API health, and preflight for
   both current and planned storefront origins before changing the UI's backend
   URL. Allow for the existing TTL/propagation interval.
6. Only after the custom API hostname passes those checks, deploy the separately
   authorized UI release with the approved production URL values. The public
   backend URL is built into the UI; switching it before API readiness can break
   the existing Railway storefront. Verify the deployed UI before applying the
   approved apex and `www` DNS/redirect changes.
7. Confirm HTTPS apex, catalog/images, canonical metadata, and the approved
   application/edge `www` redirect. Test an actual path with query parameters
   and inspect the redirect destination for preservation and absence of loops.
   Test browser auth, cart, and email-link behavior without making real payments.
8. Keep staging independent. Review staging indexing separately; this PR adds
   no robots/noindex enforcement and must not be described as doing so. Confirm
   production OpenGraph URLs use the canonical site before announcing launch.

Use local typecheck, lint, tests, and formatting for this PR. Verify actual remote
checks after pushing: unavailable or billing-blocked CI is not a passing check.
Do not bypass account billing or existing review protections.

## Rollback

If TLS, routing, auth, or catalog verification fails, stop further changes and
use the reviewed rollback plan. Restore the exact pre-change parking A/CNAME/
HTTPS records and any changed redirect rules; preserve email/security records
and nameservers throughout. Restore prior production URL/CORS values and rebuild
the UI only with deployment authorization. Retain needed transition origins
until traffic settles. DNS caches can keep the changed route through its TTL;
restoration is not instantaneous. Do not change DNSSEC or activate payments as
a recovery step.
