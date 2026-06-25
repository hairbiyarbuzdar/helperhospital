# Deploying Helper Hospital to the VPS

Follows the standard VPS guide (Node 22, PostgreSQL, Nginx, PM2, Certbot already
installed). This file lists the exact commands for **this** app.

> Make sure the domain's A record points to the VPS IP before requesting HTTPS.

## 1. Create the database

```bash
sudo -u postgres psql <<'SQL'
CREATE DATABASE helperhospital;
CREATE USER hh_user WITH ENCRYPTED PASSWORD 'STRONG_DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE helperhospital TO hh_user;
\c helperhospital
GRANT ALL ON SCHEMA public TO hh_user;
SQL
```

Connection string:
`postgresql://hh_user:STRONG_DB_PASSWORD@localhost:5432/helperhospital`

## 2. Clone

```bash
cd /var/www
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git helperhospital
cd helperhospital
```

## 3. Configure `.env`

```bash
cp .env.example .env
nano .env
```

```env
DATABASE_URL="postgresql://hh_user:STRONG_DB_PASSWORD@localhost:5432/helperhospital"
JWT_SECRET="PASTE_A_LONG_RANDOM_STRING"      # openssl rand -base64 32
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="a-strong-admin-password"
ADMIN_EMAIL="admin@yourdomain.com"
```

> Login to the app is by **username + password** (not email).

## 4. Install, set up DB, build

```bash
npm ci
npm run db:generate    # generate Prisma client
npm run db:push        # create tables   (or: npm run db:deploy  to apply migrations)
npm run create:admin   # create the admin user from ADMIN_* in .env
npm run build
```

## 5. Run with PM2

```bash
pm2 start npm --name helperhospital -- start
# different port if 3000 is taken:
# PORT=3001 pm2 start npm --name helperhospital -- start
pm2 save
```

## 6. Nginx + 7. Certbot

Same as the standard guide — add a reverse-proxy site to the app's port, enable
it, `sudo nginx -t && sudo systemctl reload nginx`, then
`sudo certbot --nginx -d your.domain` and choose redirect HTTP → HTTPS.

## Redeploying

```bash
./deploy.sh
```

(adjust the PM2 app name in `deploy.sh` if you used a different one)
