# Deployment Guide

This guide covers various deployment options for the Django Scenes Project.

## Table of Contents

1. [Production Environment Setup](#production-environment-setup)
2. [Docker Deployment](#docker-deployment)
3. [Cloud Deployment](#cloud-deployment)
4. [Database Configuration](#database-configuration)
5. [Static Files & Media](#static-files--media)
6. [Security Considerations](#security-considerations)
7. [Monitoring & Logging](#monitoring--logging)

## Production Environment Setup

### 1. Server Requirements

**Minimum Requirements:**
- CPU: 1 vCPU
- RAM: 1GB
- Storage: 10GB SSD
- OS: Ubuntu 20.04+ / CentOS 8+ / Amazon Linux 2

**Recommended for Production:**
- CPU: 2+ vCPUs
- RAM: 4GB+
- Storage: 50GB+ SSD
- Load balancer for high availability

### 2. System Dependencies

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install python3 python3-pip python3-venv nginx postgresql postgresql-contrib redis-server

# CentOS/RHEL
sudo yum update
sudo yum install python3 python3-pip nginx postgresql postgresql-server redis
```

### 3. Application Setup

```bash
# Create application user
sudo useradd -m -s /bin/bash scenes
sudo su - scenes

# Clone and setup application
git clone https://github.com/yourusername/django-scenes-project.git
cd django-scenes-project

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
pip install gunicorn psycopg2-binary redis

# Create production environment file
cp .env.example .env
```

### 4. Environment Configuration

Edit `.env` for production:

```env
# Production settings
DEBUG=False
SECRET_KEY=your-super-secret-production-key-here
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com

# Database
DATABASE_URL=postgresql://scenes_user:password@localhost:5432/scenes_db

# Redis (for caching)
REDIS_URL=redis://localhost:6379/0

# Email settings
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password

# Security
SECURE_SSL_REDIRECT=True
SECURE_HSTS_SECONDS=31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS=True
SECURE_HSTS_PRELOAD=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
```

### 5. Database Setup

```bash
# PostgreSQL setup
sudo -u postgres createuser scenes_user
sudo -u postgres createdb scenes_db -O scenes_user
sudo -u postgres psql -c "ALTER USER scenes_user PASSWORD 'your-password';"

# Run migrations
python manage.py migrate
python manage.py collectstatic --noinput
python manage.py createsuperuser
```

### 6. Gunicorn Configuration

Create `/home/scenes/django-scenes-project/gunicorn.conf.py`:

```python
bind = "127.0.0.1:8000"
workers = 3
worker_class = "sync"
worker_connections = 1000
max_requests = 1000
max_requests_jitter = 100
timeout = 30
keepalive = 2
preload_app = True
```

### 7. Systemd Service

Create `/etc/systemd/system/scenes.service`:

```ini
[Unit]
Description=Django Scenes Gunicorn daemon
After=network.target

[Service]
User=scenes
Group=scenes
WorkingDirectory=/home/scenes/django-scenes-project
ExecStart=/home/scenes/django-scenes-project/venv/bin/gunicorn \
    --config /home/scenes/django-scenes-project/gunicorn.conf.py \
    scenes_project.wsgi:application
ExecReload=/bin/kill -s HUP $MAINPID
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable scenes
sudo systemctl start scenes
```

### 8. Nginx Configuration

Create `/etc/nginx/sites-available/scenes`:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;

    client_max_body_size 10M;

    location /static/ {
        alias /home/scenes/django-scenes-project/staticfiles/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location /media/ {
        alias /home/scenes/django-scenes-project/media/;
        expires 1y;
        add_header Cache-Control "public";
    }

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/scenes /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Docker Deployment

### 1. Dockerfile

```dockerfile
FROM python:3.9-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        postgresql-client \
        build-essential \
        libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir gunicorn psycopg2-binary

# Copy project
COPY . .

# Collect static files
RUN python manage.py collectstatic --noinput

# Create non-root user
RUN adduser --disabled-password --gecos '' appuser
RUN chown -R appuser:appuser /app
USER appuser

# Expose port
EXPOSE 8000

# Run gunicorn
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "scenes_project.wsgi:application"]
```

### 2. Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  db:
    image: postgres:13
    volumes:
      - postgres_data:/var/lib/postgresql/data/
    environment:
      POSTGRES_DB: scenes_db
      POSTGRES_USER: scenes_user
      POSTGRES_PASSWORD: scenes_password
    ports:
      - "5432:5432"

  redis:
    image: redis:6-alpine
    ports:
      - "6379:6379"

  web:
    build: .
    command: gunicorn scenes_project.wsgi:application --bind 0.0.0.0:8000
    volumes:
      - .:/app
      - static_volume:/app/staticfiles
    ports:
      - "8000:8000"
    environment:
      - DEBUG=False
      - DATABASE_URL=postgresql://scenes_user:scenes_password@db:5432/scenes_db
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - db
      - redis

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - static_volume:/app/staticfiles
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - web

volumes:
  postgres_data:
  static_volume:
```

### 3. Production Docker Compose

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  db:
    image: postgres:13
    volumes:
      - postgres_data:/var/lib/postgresql/data/
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    restart: unless-stopped

  redis:
    image: redis:6-alpine
    restart: unless-stopped

  web:
    build:
      context: .
      dockerfile: Dockerfile.prod
    command: gunicorn scenes_project.wsgi:application --bind 0.0.0.0:8000 --workers 3
    volumes:
      - static_volume:/app/staticfiles
      - media_volume:/app/media
    expose:
      - 8000
    env_file:
      - .env.prod
    depends_on:
      - db
      - redis
    restart: unless-stopped

  nginx:
    build: ./nginx
    volumes:
      - static_volume:/app/staticfiles
      - media_volume:/app/media
      - ./certbot/conf:/etc/letsencrypt
      - ./certbot/www:/var/www/certbot
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - web
    restart: unless-stopped

  certbot:
    image: certbot/certbot
    volumes:
      - ./certbot/conf:/etc/letsencrypt
      - ./certbot/www:/var/www/certbot
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait $${!}; done;'"

volumes:
  postgres_data:
  static_volume:
  media_volume:
```

## Cloud Deployment

### AWS Deployment

#### 1. EC2 Instance

```bash
# Launch EC2 instance (t3.medium recommended)
# Configure security groups (HTTP, HTTPS, SSH)
# Attach Elastic IP

# Connect and setup
ssh -i your-key.pem ubuntu@your-ec2-ip
sudo apt update && sudo apt upgrade -y

# Follow production setup steps above
```

#### 2. RDS Database

```bash
# Create RDS PostgreSQL instance
# Update .env with RDS endpoint
DATABASE_URL=postgresql://username:password@your-rds-endpoint:5432/scenes_db
```

#### 3. S3 for Static Files

Add to `settings.py`:

```python
# AWS S3 Configuration
AWS_ACCESS_KEY_ID = config('AWS_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = config('AWS_SECRET_ACCESS_KEY')
AWS_STORAGE_BUCKET_NAME = config('AWS_STORAGE_BUCKET_NAME')
AWS_S3_REGION_NAME = config('AWS_S3_REGION_NAME', default='us-east-1')
AWS_S3_CUSTOM_DOMAIN = f'{AWS_STORAGE_BUCKET_NAME}.s3.amazonaws.com'

# Static files
STATICFILES_STORAGE = 'storages.backends.s3boto3.StaticS3Boto3Storage'
STATIC_URL = f'https://{AWS_S3_CUSTOM_DOMAIN}/static/'

# Media files
DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.MediaS3Boto3Storage'
MEDIA_URL = f'https://{AWS_S3_CUSTOM_DOMAIN}/media/'
```

### Heroku Deployment

#### 1. Heroku Setup

```bash
# Install Heroku CLI
# Login to Heroku
heroku login

# Create app
heroku create your-app-name

# Add PostgreSQL
heroku addons:create heroku-postgresql:hobby-dev

# Add Redis
heroku addons:create heroku-redis:hobby-dev
```

#### 2. Heroku Configuration

Create `Procfile`:

```
web: gunicorn scenes_project.wsgi:application --log-file -
release: python manage.py migrate
```

Create `runtime.txt`:

```
python-3.9.16
```

Update `settings.py` for Heroku:

```python
import dj_database_url

# Database
DATABASES = {
    'default': dj_database_url.config(
        default=config('DATABASE_URL')
    )
}

# Static files
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Middleware
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',  # Add this
    # ... other middleware
]
```

#### 3. Deploy

```bash
# Set environment variables
heroku config:set DEBUG=False
heroku config:set SECRET_KEY=your-secret-key
heroku config:set ALLOWED_HOSTS=your-app-name.herokuapp.com

# Deploy
git add .
git commit -m "Deploy to Heroku"
git push heroku main

# Run migrations
heroku run python manage.py migrate
heroku run python manage.py createsuperuser
```

### DigitalOcean App Platform

Create `app.yaml`:

```yaml
name: django-scenes
services:
- name: web
  source_dir: /
  github:
    repo: your-username/django-scenes-project
    branch: main
  run_command: gunicorn --worker-tmp-dir /dev/shm scenes_project.wsgi:application
  environment_slug: python
  instance_count: 1
  instance_size_slug: basic-xxs
  envs:
  - key: DEBUG
    value: "False"
  - key: SECRET_KEY
    value: your-secret-key
    type: SECRET
  - key: DATABASE_URL
    value: ${db.DATABASE_URL}
  - key: ALLOWED_HOSTS
    value: ${APP_DOMAIN}

databases:
- name: db
  engine: PG
  version: "13"
  size_slug: db-s-dev-database
```

## Database Configuration

### PostgreSQL Production Setup

```sql
-- Create database and user
CREATE DATABASE scenes_db;
CREATE USER scenes_user WITH PASSWORD 'secure_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE scenes_db TO scenes_user;
ALTER USER scenes_user CREATEDB;

-- Performance tuning
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
```

### Database Backup Strategy

```bash
#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
DB_NAME="scenes_db"
DB_USER="scenes_user"

# Create backup
pg_dump -U $DB_USER -h localhost $DB_NAME | gzip > $BACKUP_DIR/scenes_backup_$DATE.sql.gz

# Keep only last 7 days
find $BACKUP_DIR -name "scenes_backup_*.sql.gz" -mtime +7 -delete

# Upload to S3 (optional)
aws s3 cp $BACKUP_DIR/scenes_backup_$DATE.sql.gz s3://your-backup-bucket/
```

## Static Files & Media

### Production Static Files

```python
# settings.py
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

STATICFILES_DIRS = [
    os.path.join(BASE_DIR, 'scenes_project/scenes_app/static'),
]

# Use WhiteNoise for serving static files
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'
```

### CDN Configuration

```python
# For AWS CloudFront
AWS_S3_CUSTOM_DOMAIN = 'your-cloudfront-domain.cloudfront.net'
STATIC_URL = f'https://{AWS_S3_CUSTOM_DOMAIN}/static/'
```

## Security Considerations

### SSL/TLS Configuration

```bash
# Let's Encrypt with Certbot
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Security Headers

```python
# settings.py
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# CSP Header
CSP_DEFAULT_SRC = ("'self'",)
CSP_SCRIPT_SRC = ("'self'", "'unsafe-inline'")
CSP_STYLE_SRC = ("'self'", "'unsafe-inline'")
```

### Environment Security

```bash
# Secure file permissions
chmod 600 .env
chmod 600 /etc/systemd/system/scenes.service

# Firewall configuration
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable

# Fail2ban for SSH protection
sudo apt install fail2ban
```

## Monitoring & Logging

### Application Monitoring

```python
# settings.py
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': '/var/log/scenes/django.log',
            'maxBytes': 1024*1024*15,  # 15MB
            'backupCount': 10,
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['file'],
        'level': 'INFO',
    },
}
```

### System Monitoring

```bash
# Install monitoring tools
sudo apt install htop iotop nethogs

# Log rotation
sudo nano /etc/logrotate.d/scenes
```

```
/var/log/scenes/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 scenes scenes
    postrotate
        systemctl reload scenes
    endscript
}
```

### Health Checks

Create `health_check.py`:

```python
#!/usr/bin/env python
import requests
import sys

def health_check():
    try:
        response = requests.get('http://localhost:8000/api/debug/', timeout=10)
        if response.status_code == 200:
            print("✓ Application is healthy")
            return 0
        else:
            print(f"✗ Application returned status {response.status_code}")
            return 1
    except Exception as e:
        print(f"✗ Health check failed: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(health_check())
```

### Performance Monitoring

```bash
# Install New Relic (optional)
pip install newrelic
newrelic-admin generate-config YOUR_LICENSE_KEY newrelic.ini

# Update gunicorn command
NEW_RELIC_CONFIG_FILE=newrelic.ini newrelic-admin run-program gunicorn scenes_project.wsgi:application
```

## Troubleshooting

### Common Issues

1. **Static files not loading**
   ```bash
   python manage.py collectstatic --clear
   sudo systemctl restart nginx
   ```

2. **Database connection errors**
   ```bash
   # Check PostgreSQL status
   sudo systemctl status postgresql
   
   # Test connection
   psql -U scenes_user -d scenes_db -h localhost
   ```

3. **Permission errors**
   ```bash
   # Fix ownership
   sudo chown -R scenes:scenes /home/scenes/django-scenes-project
   
   # Fix permissions
   chmod +x manage.py
   ```

4. **Memory issues**
   ```bash
   # Check memory usage
   free -h
   
   # Reduce Gunicorn workers
   # Edit gunicorn.conf.py: workers = 2
   ```

### Log Analysis

```bash
# Application logs
tail -f /var/log/scenes/django.log

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# System logs
journalctl -u scenes -f
```

This deployment guide covers the most common deployment scenarios. Choose the approach that best fits your infrastructure and requirements.