# Troubleshooting Guide

This guide helps you diagnose and resolve common issues with the Django Scenes Project.

## Table of Contents

1. [Installation Issues](#installation-issues)
2. [Database Problems](#database-problems)
3. [Server Issues](#server-issues)
4. [Static Files Problems](#static-files-problems)
5. [API Issues](#api-issues)
6. [Performance Problems](#performance-problems)
7. [Frontend Issues](#frontend-issues)
8. [Deployment Issues](#deployment-issues)
9. [Common Error Messages](#common-error-messages)
10. [Getting Help](#getting-help)

## Installation Issues

### Python Version Compatibility

**Problem**: `SyntaxError` or compatibility issues
```bash
SyntaxError: invalid syntax
```

**Solution**:
```bash
# Check Python version
python --version

# Ensure Python 3.8 or higher
# Install correct Python version if needed
```

### Virtual Environment Issues

**Problem**: Packages not found or import errors
```bash
ModuleNotFoundError: No module named 'django'
```

**Solution**:
```bash
# Ensure virtual environment is activated
# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate

# Verify activation (should show (venv) in prompt)
which python

# Reinstall requirements
pip install -r requirements.txt
```

### Requirements Installation Failures

**Problem**: Package installation fails
```bash
ERROR: Could not install packages due to an EnvironmentError
```

**Solutions**:
```bash
# Update pip
pip install --upgrade pip

# Install with user flag
pip install --user -r requirements.txt

# Clear pip cache
pip cache purge

# Install specific problematic packages individually
pip install django==4.2.0
pip install djangorestframework
```

### Permission Errors

**Problem**: Permission denied during installation
```bash
PermissionError: [Errno 13] Permission denied
```

**Solutions**:
```bash
# Use virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows

# Or use --user flag
pip install --user -r requirements.txt

# On Linux/macOS, avoid sudo with pip
```

## Database Problems

### Migration Issues

**Problem**: Migration fails or database out of sync
```bash
django.db.migrations.exceptions.InconsistentMigrationHistory
```

**Solutions**:
```bash
# Reset migrations (development only)
rm -rf scenes_project/scenes_app/migrations/
python manage.py makemigrations scenes_app
python manage.py migrate

# Or reset database (development only)
rm db.sqlite3
python manage.py migrate
python manage.py createsuperuser
```

### Database Connection Errors

**Problem**: Can't connect to database
```bash
django.db.utils.OperationalError: no such table
```

**Solutions**:
```bash
# Run migrations
python manage.py migrate

# Check database file exists and has correct permissions
ls -la db.sqlite3

# For PostgreSQL, check connection
psql -U username -d database_name -h localhost
```

### Data Loading Issues

**Problem**: Can't load initial data
```bash
CommandError: Problem installing fixture
```

**Solutions**:
```bash
# Check JSON file format
python -m json.tool scenes.json

# Load data step by step
python manage.py shell
>>> from scenes_project.scenes_app.models import Scene
>>> Scene.objects.all()

# Clear existing data if needed
python manage.py flush
```

### Database Corruption

**Problem**: Database appears corrupted
```bash
database disk image is malformed
```

**Solutions**:
```bash
# Backup current database
cp db.sqlite3 db.sqlite3.backup

# Try to repair (SQLite)
sqlite3 db.sqlite3 ".recover" | sqlite3 db_recovered.sqlite3

# Or restore from backup
cp db.sqlite3.backup db.sqlite3

# Last resort: recreate database
rm db.sqlite3
python manage.py migrate
# Restore data from JSON backup
```

## Server Issues

### Development Server Won't Start

**Problem**: Server fails to start
```bash
Error: That port is already in use.
```

**Solutions**:
```bash
# Use different port
python manage.py runserver 8001

# Kill process using port 8000
# Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:8000 | xargs kill -9

# Or find and kill Django process
ps aux | grep manage.py
kill <PID>
```

### Import Errors

**Problem**: Module import failures
```bash
ImportError: No module named 'scenes_project'
```

**Solutions**:
```bash
# Check PYTHONPATH
echo $PYTHONPATH

# Ensure you're in correct directory
pwd
ls manage.py

# Check Django settings module
echo $DJANGO_SETTINGS_MODULE

# Set explicitly if needed
export DJANGO_SETTINGS_MODULE=scenes_project.settings
```

### Settings Configuration Issues

**Problem**: Settings not loading correctly
```bash
django.core.exceptions.ImproperlyConfigured
```

**Solutions**:
```bash
# Check .env file exists and is readable
ls -la .env
cat .env

# Verify environment variables
python -c "from decouple import config; print(config('SECRET_KEY'))"

# Check settings file syntax
python manage.py check

# Use default settings for testing
cp .env.example .env
```

## Static Files Problems

### Static Files Not Loading

**Problem**: CSS/JS files return 404
```bash
GET /static/css/style.css 404 (Not Found)
```

**Solutions**:
```bash
# Collect static files
python manage.py collectstatic

# Check static files configuration
python manage.py findstatic css/style.css

# Verify STATIC_URL and STATIC_ROOT in settings
python manage.py shell
>>> from django.conf import settings
>>> print(settings.STATIC_URL)
>>> print(settings.STATIC_ROOT)

# For development, ensure DEBUG=True
```

### Tailwind CSS Not Working

**Problem**: Tailwind styles not applied
```bash
# Styles appear unstyled or default
```

**Solutions**:
```bash
# Install Tailwind dependencies
python manage.py tailwind install

# Start Tailwind development server
python manage.py tailwind start

# Build Tailwind for production
python manage.py tailwind build

# Check Tailwind configuration
cat tailwind.config.js
```

### Static Files Permission Issues

**Problem**: Permission denied accessing static files
```bash
PermissionError: [Errno 13] Permission denied: '/path/to/static/'
```

**Solutions**:
```bash
# Fix permissions
chmod -R 755 scenes_project/scenes_app/static/
chown -R $USER:$USER scenes_project/scenes_app/static/

# Check directory structure
ls -la scenes_project/scenes_app/static/

# Ensure collectstatic directory is writable
mkdir -p staticfiles
chmod 755 staticfiles
```

## API Issues

### API Endpoints Not Working

**Problem**: API returns 404 or 500 errors
```bash
HTTP 404: Not Found
```

**Solutions**:
```bash
# Check URL patterns
python manage.py show_urls | grep api

# Verify API is included in main urls.py
cat scenes_project/urls.py

# Test API endpoints
curl http://localhost:8000/api/debug/

# Check for trailing slashes
curl http://localhost:8000/api/scenes/
```

### CSRF Token Issues

**Problem**: CSRF verification failed
```bash
Forbidden (CSRF token missing or incorrect)
```

**Solutions**:
```bash
# For API calls, include CSRF token
# In JavaScript:
function getCookie(name) {
    // ... cookie retrieval code
}

fetch('/api/endpoint/', {
    method: 'POST',
    headers: {
        'X-CSRFToken': getCookie('csrftoken'),
        'Content-Type': 'application/json'
    }
});

# Or disable CSRF for API (not recommended for production)
# Add @csrf_exempt decorator to views
```

### JSON Parsing Errors

**Problem**: Invalid JSON in API responses
```bash
JSONDecodeError: Expecting value: line 1 column 1 (char 0)
```

**Solutions**:
```bash
# Check API response format
curl -v http://localhost:8000/api/scenes/

# Verify Content-Type header
# Should be: Content-Type: application/json

# Check for HTML error pages in JSON responses
# Look for Django error pages being returned instead of JSON
```

### Session Issues with Favorites

**Problem**: Favorites not persisting
```bash
# Favorites reset after browser refresh
```

**Solutions**:
```bash
# Check session configuration
python manage.py shell
>>> from django.conf import settings
>>> print(settings.SESSION_ENGINE)
>>> print(settings.SESSION_COOKIE_AGE)

# Ensure sessions are working
>>> from django.contrib.sessions.models import Session
>>> Session.objects.all()

# Check browser cookies
# Open browser dev tools > Application > Cookies
```

## Performance Problems

### Slow Page Loading

**Problem**: Pages load slowly
```bash
# Page takes several seconds to load
```

**Solutions**:
```bash
# Enable Django debug toolbar (development)
pip install django-debug-toolbar

# Check database queries
python manage.py shell
>>> from django.db import connection
>>> connection.queries

# Add database indexes
# Check models.py for Index definitions

# Optimize queries with select_related/prefetch_related
# In views.py:
scenes = Scene.objects.select_related().prefetch_related('favorites')
```

### High Memory Usage

**Problem**: Application uses too much memory
```bash
# Memory usage keeps increasing
```

**Solutions**:
```bash
# Monitor memory usage
top -p $(pgrep -f manage.py)

# Check for memory leaks
pip install memory_profiler
python -m memory_profiler manage.py runserver

# Optimize database queries
# Avoid loading unnecessary data
scenes = Scene.objects.only('title', 'country', 'setting')

# Use pagination for large datasets
from django.core.paginator import Paginator
paginator = Paginator(scenes, 25)
```

### Database Performance Issues

**Problem**: Database queries are slow
```bash
# Queries take several seconds
```

**Solutions**:
```bash
# Add database indexes
python manage.py dbshell
.schema scenes_app_scene

# Check query execution plan
EXPLAIN QUERY PLAN SELECT * FROM scenes_app_scene WHERE country = 'India';

# Optimize queries in code
# Use select_related for foreign keys
# Use prefetch_related for many-to-many
# Add database indexes in models.py

class Scene(models.Model):
    # ...
    class Meta:
        indexes = [
            models.Index(fields=['country']),
            models.Index(fields=['setting']),
            models.Index(fields=['emotion']),
        ]
```

## Frontend Issues

### JavaScript Errors

**Problem**: JavaScript functionality not working
```bash
Uncaught TypeError: Cannot read property 'addEventListener' of null
```

**Solutions**:
```bash
# Check browser console for errors
# Open browser dev tools > Console

# Ensure DOM is loaded before running scripts
document.addEventListener('DOMContentLoaded', function() {
    // Your code here
});

# Check for missing elements
const element = document.getElementById('scene-container');
if (element) {
    // Safe to use element
}

# Verify script loading order
# Ensure dependencies load before your scripts
```

### AJAX Requests Failing

**Problem**: AJAX calls return errors
```bash
Failed to fetch
```

**Solutions**:
```bash
# Check network tab in browser dev tools
# Look for failed requests

# Verify CSRF token for POST requests
fetch('/api/endpoint/', {
    method: 'POST',
    headers: {
        'X-CSRFToken': getCookie('csrftoken'),
        'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
});

# Check for CORS issues (if using different domains)
# Add CORS headers in Django settings

# Handle errors properly
fetch('/api/endpoint/')
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .catch(error => console.error('Error:', error));
```

### CSS Styling Issues

**Problem**: Styles not applied correctly
```bash
# Elements appear unstyled or incorrectly styled
```

**Solutions**:
```bash
# Check CSS file loading
# Open browser dev tools > Network tab
# Look for 404 errors on CSS files

# Verify Tailwind CSS is working
# Check if utility classes are applied
# Inspect elements in browser dev tools

# Clear browser cache
# Hard refresh: Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)

# Check for CSS conflicts
# Use browser dev tools to inspect computed styles
```

## Deployment Issues

### Production Server Errors

**Problem**: Server errors in production
```bash
Internal Server Error (500)
```

**Solutions**:
```bash
# Check server logs
tail -f /var/log/nginx/error.log
tail -f /var/log/scenes/django.log

# Enable debug temporarily (not recommended for production)
DEBUG=True python manage.py runserver

# Check static files are collected
python manage.py collectstatic --noinput

# Verify database migrations
python manage.py showmigrations
python manage.py migrate

# Check environment variables
env | grep DJANGO
```

### SSL/HTTPS Issues

**Problem**: SSL certificate errors
```bash
SSL certificate problem: unable to get local issuer certificate
```

**Solutions**:
```bash
# Check certificate validity
openssl x509 -in certificate.crt -text -noout

# Verify certificate chain
openssl verify -CAfile ca-bundle.crt certificate.crt

# Check Nginx SSL configuration
nginx -t
systemctl reload nginx

# Renew Let's Encrypt certificate
certbot renew --dry-run
certbot renew
```

### Docker Issues

**Problem**: Docker container won't start
```bash
Container exits with code 1
```

**Solutions**:
```bash
# Check container logs
docker logs container_name

# Build image with no cache
docker build --no-cache -t scenes-app .

# Check Dockerfile syntax
docker build -t scenes-app .

# Run container interactively for debugging
docker run -it scenes-app /bin/bash

# Check environment variables in container
docker exec container_name env
```

## Common Error Messages

### `ModuleNotFoundError: No module named 'scenes_project'`

**Cause**: Python can't find the project module
**Solution**:
```bash
# Ensure you're in the correct directory
cd /path/to/django-scenes-project

# Check PYTHONPATH
export PYTHONPATH="${PYTHONPATH}:/path/to/django-scenes-project"

# Or use python -m django
python -m django runserver --settings=scenes_project.settings
```

### `django.db.utils.OperationalError: no such table`

**Cause**: Database tables haven't been created
**Solution**:
```bash
python manage.py migrate
```

### `ImproperlyConfigured: The SECRET_KEY setting must not be empty`

**Cause**: SECRET_KEY not set in environment
**Solution**:
```bash
# Check .env file
cat .env

# Set SECRET_KEY
echo "SECRET_KEY=your-secret-key-here" >> .env

# Or set environment variable
export SECRET_KEY="your-secret-key-here"
```

### `TemplateDoesNotExist at /`

**Cause**: Template files not found
**Solution**:
```bash
# Check template directory exists
ls -la scenes_project/scenes_app/templates/

# Verify TEMPLATES setting in settings.py
python manage.py shell
>>> from django.conf import settings
>>> print(settings.TEMPLATES)
```

### `StaticFilesNotFound`

**Cause**: Static files not collected or configured incorrectly
**Solution**:
```bash
# Collect static files
python manage.py collectstatic

# Check static files settings
python manage.py shell
>>> from django.conf import settings
>>> print(settings.STATIC_URL)
>>> print(settings.STATIC_ROOT)
>>> print(settings.STATICFILES_DIRS)
```

## Getting Help

### Debug Information to Collect

When asking for help, include:

1. **Error Message**: Full error message and traceback
2. **Environment**: OS, Python version, Django version
3. **Steps to Reproduce**: What you were doing when error occurred
4. **Configuration**: Relevant settings and environment variables
5. **Logs**: Server logs and browser console errors

### Useful Commands for Debugging

```bash
# Django version
python -m django --version

# Check Django configuration
python manage.py check

# Show all URLs
python manage.py show_urls

# Database shell
python manage.py dbshell

# Django shell
python manage.py shell

# Show migrations
python manage.py showmigrations

# Collect static files
python manage.py collectstatic --dry-run

# Test email configuration
python manage.py sendtestemail your-email@example.com
```

### Log Analysis

```bash
# View recent logs
tail -n 100 /var/log/scenes/django.log

# Follow logs in real-time
tail -f /var/log/scenes/django.log

# Search for specific errors
grep -i "error" /var/log/scenes/django.log

# View logs by date
grep "2024-01-15" /var/log/scenes/django.log
```

### Performance Debugging

```bash
# Install debug toolbar
pip install django-debug-toolbar

# Add to INSTALLED_APPS in settings.py
INSTALLED_APPS = [
    # ...
    'debug_toolbar',
]

# Add middleware
MIDDLEWARE = [
    # ...
    'debug_toolbar.middleware.DebugToolbarMiddleware',
]

# Configure internal IPs
INTERNAL_IPS = ['127.0.0.1']
```

### Community Resources

- **GitHub Issues**: Report bugs and ask questions
- **Django Documentation**: Official Django docs
- **Stack Overflow**: Search for similar issues
- **Django Community**: Django forums and mailing lists

### Professional Support

For production issues or complex problems:
- Consider hiring Django consultants
- Use monitoring services (Sentry, New Relic)
- Implement proper logging and alerting
- Set up health checks and monitoring

Remember to always backup your data before attempting fixes, especially in production environments.