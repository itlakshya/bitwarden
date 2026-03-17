# Lakshya Copycat - Deployment Guide

## Production Deployment Checklist

### Prerequisites
- [ ] Node.js 18+ installed
- [ ] PostgreSQL 15+ database
- [ ] Domain name configured
- [ ] SSL certificate ready
- [ ] SMTP email service configured

### Environment Configuration

#### 1. Production Environment Variables
Create `.env.production` with the following variables:

```env
NODE_ENV=production
DATABASE_URL="postgresql://username:password@host:port/database"
NEXTAUTH_SECRET="your-secure-32-character-secret-key"
NEXTAUTH_URL="https://yourdomain.com"
BASE_URL="https://yourdomain.com"

# SMTP Configuration
SMTP_HOST="your-smtp-host"
SMTP_PORT=587
SMTP_USER="your-smtp-username"
SMTP_PASS="your-smtp-password"
SMTP_FROM="noreply@yourdomain.com"

# Cloudflare Turnstile (Bot Protection)
NEXT_PUBLIC_TURNSTILE_SITE_KEY="your-turnstile-site-key"
TURNSTILE_SECRET_KEY="your-turnstile-secret-key"

# Encryption Key (32 characters)
ENCRYPTION_KEY="your-32-character-encryption-key"
```

#### 2. Database Setup

```bash
# 1. Create production database
createdb lakshya_production

# 2. Run Prisma migrations
npx prisma db push --accept-data-loss

# 3. Generate Prisma client
npx prisma generate

# 4. Create super admin (production)
NODE_ENV=production npm run seed:super-admin
```

#### 3. Build and Deploy

```bash
# 1. Install dependencies
npm ci --production

# 2. Build application
npm run build

# 3. Start production server
npm start
```

### Security Configuration

#### 1. Email Domain Restriction
- Only `@iiclakshya.com` emails are allowed
- Configure in `src/lib/middleware/auth.ts`
- Update domain as needed for your organization

#### 2. Password Requirements
- Minimum 8 characters
- Must contain: uppercase, lowercase, number, special character
- Configured in `src/lib/middleware/auth.ts`

#### 3. Encryption
- AES-256-CBC encryption for sensitive fields
- Automatic encryption for PASSWORD field types
- Key rotation: Update `ENCRYPTION_KEY` and re-encrypt data

### Docker Deployment (Recommended)

#### 1. Create Production Docker Compose

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    depends_on:
      - postgres
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: lakshya_production
      POSTGRES_USER: lakshya_user
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/ssl/certs
    depends_on:
      - app
    restart: unless-stopped

volumes:
  postgres_data:
```

#### 2. Create Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --production

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build application
RUN npm run build

# Expose port
EXPOSE 3000

# Start application
CMD ["npm", "start"]
```

### Nginx Configuration

```nginx
# nginx.conf
events {
    worker_connections 1024;
}

http {
    upstream app {
        server app:3000;
    }

    server {
        listen 80;
        server_name yourdomain.com;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl;
        server_name yourdomain.com;

        ssl_certificate /etc/ssl/certs/cert.pem;
        ssl_certificate_key /etc/ssl/certs/key.pem;

        location / {
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

### Monitoring and Maintenance

#### 1. Health Checks
- Database connectivity: `/api/health/db`
- Application status: `/api/health/app`
- Authentication: `/api/health/auth`

#### 2. Backup Strategy
```bash
# Daily database backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Weekly full backup with encryption keys
tar -czf full_backup_$(date +%Y%m%d).tar.gz backup_*.sql .env.production
```

#### 3. Log Management
- Application logs: `logs/app.log`
- Error logs: `logs/error.log`
- Access logs: `logs/access.log`

### Performance Optimization

#### 1. Database Optimization
```sql
-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_groups_department ON groups(department_id);
CREATE INDEX idx_group_items_group ON group_items(group_id);
CREATE INDEX idx_field_values_item ON field_values(group_item_id);
```

#### 2. Caching Strategy
- Redis for session storage (optional)
- CDN for static assets
- Database query caching

#### 3. Security Headers
```javascript
// next.config.js
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ]
  },
}
```

### Troubleshooting

#### Common Issues

1. **Database Connection Failed**
   - Check DATABASE_URL format
   - Verify database server is running
   - Check firewall rules

2. **Authentication Not Working**
   - Verify NEXTAUTH_SECRET is set
   - Check NEXTAUTH_URL matches domain
   - Ensure cookies are enabled

3. **Email Not Sending**
   - Verify SMTP credentials
   - Check firewall for SMTP ports
   - Test with email provider

4. **Encryption Errors**
   - Verify ENCRYPTION_KEY is 32 characters
   - Check for special characters in key
   - Ensure key consistency across deployments

### Support and Maintenance

#### Regular Tasks
- [ ] Weekly database backups
- [ ] Monthly security updates
- [ ] Quarterly password policy review
- [ ] Annual encryption key rotation

#### Monitoring Alerts
- Database connection failures
- High CPU/memory usage
- Failed login attempts (>10/hour)
- Encryption/decryption errors

### Rollback Procedure

1. **Stop current deployment**
   ```bash
   docker-compose down
   ```

2. **Restore database backup**
   ```bash
   psql $DATABASE_URL < backup_YYYYMMDD.sql
   ```

3. **Deploy previous version**
   ```bash
   git checkout previous-stable-tag
   docker-compose up -d
   ```

### Success Metrics

- [ ] All health checks passing
- [ ] Authentication working for all roles
- [ ] Department/group creation functional
- [ ] Data encryption/decryption working
- [ ] Email notifications sending
- [ ] Performance within acceptable limits
- [ ] Security scans passing
- [ ] Backup/restore tested

---

**Deployment Status**: ✅ Ready for Production
**Last Updated**: $(date)
**Version**: 1.0.0