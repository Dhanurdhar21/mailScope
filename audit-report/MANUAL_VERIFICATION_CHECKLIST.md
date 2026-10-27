# MailScope Manual Verification & Pre-Release Checklist

**Document Version:** 1.0.0  
**Audit Date:** 2026-10-27  
**Scope:** Procedures, Live Checks, and Environmental Validations Requiring Human Execution Prior to Production Deployment  

---

## 1. Scope of Manual Verification

While all automated unit tests, regression suites, component tests, and simulated browser workflows achieved a 100% pass rate, certain production considerations cannot be verified in a purely local development sandbox.

This checklist itemizes every validation step that must be performed by the release engineering team before promoting MailScope to production.

---

## 2. Pre-Release Manual Verification Checklist

| Status | Verification Item | Category | Target Environment | Owner |
| :---: | :--- | :--- | :--- | :--- |
| [ ] | **Live DNS Resolver Upstream Inspection** | Network / DNS | Staging / Prod | DevOps / SRE |
| [ ] | **Production SPA URL Rewrite Rules** | Web Server | Nginx / Cloudflare | Release Eng |
| [ ] | **Production CORS Allowlist Domain Binding** | Security | Backend Config | Backend Eng |
| [ ] | **Rate Limiting & DDoS Shield** | Security / Infrastructure | Reverse Proxy / WAF | SRE / SecOps |
| [ ] | **Physical Screen Reader Verification** | Accessibility | macOS / Windows / iOS | QA / A11Y Eng |
| [ ] | **Physical Mobile Device Gestures** | Mobile / UX | iPhone (Safari) / Pixel (Chrome) | QA Eng |
| [ ] | **Real Mailbox Deliverability Disclaimer** | Legal / Product | User Interface | Product Manager |

---

## 3. Step-by-Step Verification Procedures

### Step 1: Upstream Authoritative DNS Resolution
- **Objective:** Verify that the production environment can resolve external DNS records via configured recursive nameservers without port 53 / 853 blocking by host firewalls or security groups.
- **Procedure:**
  1. SSH into the staging/production host.
  2. Execute a DNS lookup using python:
     ```bash
     python -c "import dns.resolver; r = dns.resolver.Resolver(); print(r.resolve('google.com', 'MX')[0])"
     ```
  3. Ensure that response time is under 150ms and no `NoNameservers` or `Timeout` errors occur.
  4. If running in AWS VPC, ensure outbound UDP/TCP port 53 is open to VPC resolver (`169.254.169.253` or Route 53).

### Step 2: SPA Rewrite Configuration for Client-Side Routing
- **Objective:** Prevent HTTP 404 Not Found errors when users reload `/dashboard` directly or navigate using browser bookmarks.
- **Procedure:**
  1. When deploying static frontend assets from `dist/` to an Nginx server, verify `try_files` configuration:
     ```nginx
     server {
         listen 80;
         server_name mailscope.example.com;
         root /var/www/mailscope/dist;
         index index.html;

         location / {
             try_files $uri $uri/ /index.html;
         }

         location /api/ {
             proxy_pass http://127.0.0.1:8000;
             proxy_set_header Host $host;
             proxy_set_header X-Real-IP $remote_addr;
             proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
         }
     }
     ```
  2. Test in browser: navigate directly to `https://mailscope.example.com/dashboard` and refresh the page (F5). Ensure the dashboard loads without 404 errors.

### Step 3: Production CORS Origin Configuration
- **Objective:** Prevent arbitrary websites from calling the MailScope API backend.
- **Procedure:**
  1. In the production environment file (`.env`):
     ```bash
     CORS_ORIGINS=https://mailscope.example.com
     ```
  2. Restart the backend service.
  3. Execute a curl request from an unauthorized origin:
     ```bash
     curl -I -H "Origin: https://evil-site.com" http://127.0.0.1:8000/health
     ```
  4. Confirm that `Access-Control-Allow-Origin: https://evil-site.com` is **NOT** present in the response headers.

### Step 4: Screen Reader Audit with NVDA / VoiceOver
- **Objective:** Verify non-sighted usability of batch progress, modal dialogs, and table filters.
- **Procedure:**
  1. Enable VoiceOver (macOS: `Cmd + F5`) or NVDA (Windows: `Ctrl + Alt + N`).
  2. Tab into the email textarea. Verify the label and helper text are spoken clearly.
  3. Submit a batch. Verify the status updates or completion are announced via ARIA live regions.
  4. Tab into the results table and press Enter on an "Inspect" button.
  5. Verify the modal title and contents are focused and read aloud. Press Escape and verify focus returns to the triggering button.

### Step 5: Physical Touchscreen Testing
- **Objective:** Ensure no tap delay or touch overlap occurs on mobile viewports.
- **Procedure:**
  1. Open the application on an iPhone 14/15/16 and a modern Android phone.
  2. Tap "Load Sample Batch". Verify the keyboard does not unexpectedly shift elements.
  3. Tap "Run Deliverability Analysis". Verify the sticky bottom counter is easily tap-accessible without zooming.
  4. Scroll the results table horizontally and verify smooth touch inertial scrolling.

---

## 4. Release Decision Gate Criteria

Before authorizing production release:
1. Every automated test suite must report 0 failures.
2. All items in the checklist above must be completed and initialed by responsible engineers.
3. If any item fails, the release status must be set to `CONDITIONALLY READY` or `NOT READY`.
