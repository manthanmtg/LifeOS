# LifeOS: Ultimate Deployment & Go-Live Guide

This guide covers everything from buying your domain on Namecheap to having a live, secure (SSL) LifeOS application running on your own VPS (DigitalOcean Droplet / Hetzner Cloud).

---

## 1. Acquire Your Domain (Namecheap)

1.  **Search & Purchase:**
    *   Go to [Namecheap.com](https://www.namecheap.com/).
    *   Search for a domain (e.g., `my-life-os.xyz`).
    *   Select a cheap extension (like `.xyz`, `.online`, or `.in`).
    *   **⚠️ Check Renewal Price:** Ensure the "Renewal" price (shown in small text) is within your budget for next year.
    *   Complete the purchase. Namecheap includes **Free WHOIS Privacy** (Domain Privacy) forever—keep this enabled.

---

## 2. Provision Your Server (DigitalOcean / Hetzner)

1.  **Create a VPS:**
    *   **DigitalOcean:** Create a "Droplet". Pick **Ubuntu 22.04 LTS**. The $4 or $6/month basic plan is enough.
    *   **Hetzner:** Create a "Server". Pick **Ubuntu 22.04**. The CX21 plan is excellent value.
2.  **Get the IP:** Copy your server's **IPV4 Address** (e.g., `123.45.67.89`).
3.  **Note:** Choose "SSH Key" for login during setup for better security.

---

## 3. Link Domain to Server (DNS Setup)

1.  Log in to your **Namecheap Dashboard**.
2.  Go to **Domain List** -> Click **Manage** next to your domain.
3.  Click the **Advanced DNS** tab.
4.  **Add/Edit Records:**
    *   **A Record:**
        *   Host: `@`
        *   Value: `YOUR_SERVER_IP` (e.g., `123.45.67.89`)
        *   TTL: `Automatic`
    *   **CNAME Record (Optional for 'www'):**
        *   Host: `www`
        *   Target: `yourdomain.com`
        *   TTL: `Automatic`
5.  **Wait:** DNS propagation can take anywhere from 5 minutes to a few hours.

---

## 4. Server Setup & Docker Installation

Connect to your server:
```bash
ssh root@your-server-ip
```

### Install Docker & Compose
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install ca-certificates curl gnupg -y
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin -y
```

---

## 5. Deploying the App

1.  **Clone Source:**
    ```bash
    git clone https://github.com/your-username/LifeOS.git /opt/lifeos
    cd /opt/lifeos
    ```

2.  **Environment Variables:**
    ```bash
    cp .env.local.example .env
    nano .env
    ```
    *   Set `MONGODB_URI` (Use MongoDB Atlas for easiest setup).
    *   Set `ADMIN_PASSWORD` (Your login password).
    *   Set `JWT_SECRET` (Run `openssl rand -base64 32` to generate one).

3.  **Configure Caddy (SSL):**
    ```bash
    nano Caddyfile
    ```
    Replace the placeholder domain with **your purchased domain** and your email.
    ```caddy
    yourdomain.com {
        reverse_proxy app:3000
    }
    ```

4.  **GO LIVE:**
    ```bash
    sudo docker compose up -d --build
    ```

---

## 6. Verification & SSL

1.  **Check Status:** `sudo docker compose ps` (Should show `app`, `db`, and `caddy` as "Up").
2.  **Check Logs:** `sudo docker compose logs -f caddy`
    *   If you see "Successfully obtained certificate", your SSL is live!
3.  **Visit Site:** Open `https://yourdomain.com` in your browser.

---

## 7. Troubleshooting

*   **Site not loading?** Check your firewall: `ufw allow 80/tcp && ufw allow 443/tcp`.
*   **SSL Error?** Ensure your Namecheap DNS "A record" is correct and has had enough time to propagate.
*   **MongoDB won't connect?** If using Atlas, ensure you have "Allowed Access from Anywhere" (0.0.0.0/0) in the Atlas Network Access settings.

---

## 8. Alternative: Deploying on Netlify (Easiest)

If you don't want to manage a VPS/Docker, you can deploy LifeOS for free (or cheap) on Netlify.

### 1. Connect Repository
1.  Push your code to **GitHub, GitLab, or Bitbucket**.
2.  Log in to [Netlify](https://app.netlify.com/).
3.  Click **Add new site** -> **Import an existing project**.
4.  Select your repository.

### 2. Configure Build Settings
*   **Build Command:** `pnpm run build`
*   **Publish Directory:** `.next`
*   **Environment Variables:** Add `MONGODB_URI`, `ADMIN_PASSWORD`, and `JWT_SECRET` in **Site Configuration** -> **Environment variables**.

### 3. Link Namecheap Domain to Netlify
1.  On Netlify: Go to **Site Configuration** -> **Domain management** -> **Add custom domain**.
2.  Enter your Namecheap domain (e.g., `my-life-os.xyz`).
3.  **Setup DNS (Choose one):**
    *   **Option A: ALIAS/A Records (Keep Namecheap DNS):**
        *   In Namecheap Advanced DNS: Add an **A Record** (Host: `@`) pointing to Netlify's Load Balancer IP (`75.101.163.119`).
        *   Add a **CNAME Record** (Host: `www`) pointing to your Netlify site URL (e.g., `your-site.netlify.app`).
    *   **Option B: Netlify DNS (Recommended for ease):**
        *   Netlify will give you 4 Nameservers (e.g., `dns1.p01.nsone.net`).
        *   In Namecheap: Go to **Domain List** -> **Manage** -> **Nameservers**. Change from "Namecheap BasicDNS" to **Custom DNS** and paste the 4 nameservers.
4.  **SSL:** Netlify will automatically provision a Let's Encrypt SSL certificate once the DNS points to them.

---

## 9. Alternative: Deploying on Vercel (Recommended for Next.js)

Since LifeOS is a Next.js application, Vercel (the creators of Next.js) provides the most seamless deployment experience and best performance.

### 1. Connect Repository
1.  Push your code to **GitHub, GitLab, or Bitbucket**.
2.  Log in to [Vercel](https://vercel.com/).
3.  Click **Add New** -> **Project**.
4.  Import your LifeOS repository.

### 2. Configure Project
*   **Framework Preset:** Vercel will automatically detect **Next.js**.
*   **Root Directory:** `./`
*   **Build & Development Settings:** Leave as defaults.
*   **Environment Variables:** Add `MONGODB_URI`, `ADMIN_PASSWORD`, and `JWT_SECRET`.
*   Click **Deploy**.

### 3. Link Namecheap Domain to Vercel
1.  **In Vercel Dashboard:**
    *   Go to your project -> **Settings** -> **Domains**.
    *   Enter your domain (e.g., `my-life-os.xyz`) and click **Add**.
    *   Vercel will ask if you want to add `www.my-life-os.xyz` as well. Select **"Add [domain] and redirect www to it"** (Recommended).
2.  **In Namecheap Dashboard:**
    *   Go to **Domain List** -> Click **Manage** next to your domain.
    *   Click the **Advanced DNS** tab.
3.  **Setup DNS Records (The "Standard" Way):**
    *   **A Record (for the main domain):**
        *   Type: `A Record`
        *   Host: `@`
        *   Value: `76.76.21.21` (Vercel's IP)
        *   TTL: `Automatic`
    *   **CNAME Record (for www):**
        *   Type: `CNAME Record`
        *   Host: `www`
        *   Value: `cname.vercel-dns.com.` (Include the dot at the end)
        *   TTL: `Automatic`
4.  **Alternative: Nameserver Method (The "Auto-Pilot" Way):**
    *   If you want Vercel to handle everything (DNS, Subdomains, etc.):
    *   Vercel will show you 2-4 Nameservers (e.g., `ns1.vercel-dns.com`).
    *   In Namecheap: Go to **Domain List** -> **Manage** -> **Nameservers**.
    *   Change from "Namecheap BasicDNS" to **Custom DNS**.
    *   Paste the Vercel Nameservers and click the **Green Checkmark**.
5.  **Verification:** Vercel will automatically check the records every few minutes. Once it turns green, your site is live with **Automatic SSL**.

---

## 10. Email Setup (Cheap/Free Options)

Since you are using Namecheap, you have a few ways to get a professional email (e.g., `hello@yourdomain.com`).

### Option A: Free Email Forwarding (Namecheap)
*   **Cost:** Free.
*   **How it works:** Any mail sent to `admin@yourdomain.com` is automatically forwarded to your personal Gmail.
*   **Setup:** In Namecheap Dashboard -> **Domain List** -> **Manage** -> **Buttons & More** -> **Email Forwarding**. 

### Option B: Namecheap Private Email (Starter)
*   **Cost:** ~$1.24/month (approx. ₹100/month).
*   **How it works:** A full professional inbox with IMAP/POP support (works with Outlook, Apple Mail, etc.).
*   **Features:** 5GB Storage, 1 mailbox, 10 aliases.
*   **Setup:** Purchase "Private Email" from Namecheap and it will automatically prompt you to link it to your domain.

### Option C: Zoho Mail (Forever Free)
*   **Cost:** Free for up to 5 users.
*   **How it works:** A professional suite similar to Google Workspace but free for small teams.
*   **Setup:** Sign up at [Zoho Mail](https://www.zoho.com/mail/zohomail-pricing.html). You will need to add **MX Records** in your Namecheap Advanced DNS tab.
*   **Note:** The free plan is **Web/App only** (no Outlook/IMAP support).

---

### Security Checklist (Final Step)
- [ ] SSH is secured (Keys only, no password).
- [ ] Firewall (UFW) is enabled.
- [ ] `.env` file is NOT checked into Git.
- [ ] Backups are running (if using local DB).
- [ ] Email MX records are set (if using Option B or C).
