# Deployment

The site runs at **https://gradients.f13s.com** on the owner's VPS (Ubuntu 24.04), first deployed 2026-11-13. The server is shared with other sites; everything of ours is separate. Server-specific notes that should not be public are in `docs/DEPLOY.private.md`, which is git-ignored.

## What is where on the server

| Thing | Location |
|---|---|
| Code and build | `/srv/gradientf/app` (owned by the system user `gradientf`, which cannot log in) |
| Settings and secrets | `/srv/gradientf/app/.env.local`, mode 600: `DATABASE_URL`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` (the **live** Razorpay keys) |
| Database | PostgreSQL 16, database `gradientf`, role `gradientf`. Its password was generated on the server and exists only in `.env.local` there. |
| Service | `gradientf.service` (systemd): `next start` on `127.0.0.1:3410`, restarts on failure, starts on boot |
| Web server | nginx site `/etc/nginx/sites-available/gradients.f13s.com`, proxying to port 3410 |
| HTTPS | Let's Encrypt certificate through certbot, renewed by the server's existing `certbot.timer` |
| Logs | `journalctl -u gradientf.service`; build log at `/srv/gradientf/build.log` |

## Deploying a new version

From the project folder on the development machine, with the work committed:

```bash
git archive --format=tar.gz -o /tmp/gradientf.tgz HEAD
```

```bash
scp /tmp/gradientf.tgz root@YOUR_SERVER:/tmp/gradientf.tgz
```

```bash
ssh root@YOUR_SERVER 'set -e; cd /srv/gradientf/app && tar -xzf /tmp/gradientf.tgz && rm /tmp/gradientf.tgz && chown -R gradientf:gradientf /srv/gradientf && sudo -u gradientf -H bash -c "cd /srv/gradientf/app && npm ci --no-audit --no-fund && npm run db:migrate && NODE_ENV=production npm run build" && systemctl restart gradientf && sleep 3 && curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3410/'
```

The last line should print `200`. `tar` overwrites changed files but does not delete files removed from the repository; that is harmless for a Next.js app, since only what the build references is served. `.env.local` is not in the archive, so it is never overwritten.

The site is briefly unavailable while the service restarts (a few seconds). The build runs before the restart, so a failed build leaves the old version running.

## Checks after a deploy

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://gradients.f13s.com/
```

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://gradients.f13s.com/api/mcp
```

Expect `200` and `405`. `/studio` signed out should redirect to `/signin`.

## Data

- The live database started with one account, copied from the development database: the owner's, with lifetime access. Test accounts and unpaid test orders were not copied.
- **There is no backup of the `gradientf` database yet.** Other projects on the server keep dated `pg_dump` files in `/root`; the same should be set up here before real customers pay.
- To give an account lifetime access by hand, insert a zero-amount paid row into `purchases` for it (see how `e2e/global-setup.ts` does it). Never do it by paying.

## Not done

- No Razorpay webhook (`RAZORPAY_WEBHOOK_SECRET` is unset). The site reconciles payments when the buyer returns, so it works without one; add it in the Razorpay dashboard pointing at `https://gradients.f13s.com/api/billing/webhook` for payments where the buyer closes the tab early.
- No error monitoring or uptime check.
- The in-memory rate limits reset whenever the service restarts.
