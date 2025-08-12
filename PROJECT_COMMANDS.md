# 🚀 **Whisper of Intimacy - Project Commands Guide**

## 📋 **Table of Contents**
- [Project Setup Commands](#project-setup-commands)
- [Starting the Development Server](#starting-the-development-server)
- [Database Management](#database-management)
- [Data Management](#data-management)
- [Search Index Management](#search-index-management)
- [Accessing the Application](#accessing-the-application)
- [Development Commands](#development-commands)
- [Using the Application](#using-the-application)
- [Maintenance Commands](#maintenance-commands)
- [Troubleshooting Commands](#troubleshooting-commands)
- [Production Deployment](#production-deployment)
- [Security Commands](#security-commands)
- [Monitoring Commands](#monitoring-commands)

---

## 🚀 **Project Setup Commands**

### **1. Initial Setup**
```bash
# Clone or navigate to the project directory
cd whispher_of_intemesy

# Install Python dependencies
pip install -r requirements.txt

# Run database migrations
python manage.py migrate

# Create a superuser (optional, for admin access)
python manage.py createsuperuser

# Load sample data (if available)
python manage.py loaddata scenes.json
```

### **2. Starting the Development Server**
```bash
# Start the Django development server
python manage.py runserver

# Start on specific port
python manage.py runserver 8000

# Start on specific host and port
python manage.py runserver 0.0.0.0:8000
```

---

## 🗄️ **Database Management**

### **Migration Commands**
```bash
# Create new migrations after model changes
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Show migration status
python manage.py showmigrations

# Reset migrations (if migration issues)
python manage.py migrate --fake-initial
```

### **Database Operations**
```bash
# Reset database (careful - deletes all data)
python manage.py flush

# Create database backup
python manage.py dumpdata > backup.json

# Load data from backup
python manage.py loaddata backup.json

# Open database shell
python manage.py dbshell
```

---

## 📊 **Data Management**

### **Scene Data Operations**
```bash
# Import scenes from JSON file
python manage.py loaddata scenes.json

# Export scenes to JSON file
python manage.py dumpdata scenes_app.Scene > scenes_export.json

# Export all app data
python manage.py dumpdata scenes_app > full_backup.json

# Clear all scenes
python manage.py shell -c "from scenes_app.models import Scene; Scene.objects.all().delete()"
```

### **Data Inspection**
```bash
# Count total scenes
python manage.py shell -c "from scenes_app.models import *; print(f'Total scenes: {Scene.objects.count()}')"

# Show recent scenes
python manage.py shell -c "from scenes_app.models import *; [print(f'{s.id}: {s.title}') for s in Scene.objects.order_by('-id')[:5]]"

# Show database statistics
python manage.py shell -c "from scenes_app.models import *; print(f'Scenes: {Scene.objects.count()}, Favorites: {FavoriteScene.objects.count()}, Searches: {SearchQuery.objects.count()}')"
```

---

## 🔍 **Search Index Management**

### **Search Operations**
```bash
# Rebuild search suggestions (if you have a management command)
python manage.py rebuild_search_index

# Update search suggestions
python manage.py update_suggestions

# Clear search history
python manage.py shell -c "from scenes_app.models import SearchQuery; SearchQuery.objects.all().delete()"

# Show popular search terms
python manage.py shell -c "from scenes_app.models import SearchQuery; from django.db.models import Count; print(SearchQuery.objects.values('query').annotate(count=Count('query')).order_by('-count')[:10])"
```

---

## 🌐 **Accessing the Application**

### **Main URLs**
- **Home Page**: `http://127.0.0.1:8000/`
- **Search Results**: `http://127.0.0.1:8000/search/?q=your_query`
- **Add Scene**: `http://127.0.0.1:8000/add/`
- **Edit Scene**: `http://127.0.0.1:8000/scene/{id}/edit/`
- **Scene Detail**: `http://127.0.0.1:8000/scene/{id}/`
- **Analytics**: `http://127.0.0.1:8000/analytics/`
- **Favorites**: `http://127.0.0.1:8000/favorites/`
- **Admin Panel**: `http://127.0.0.1:8000/admin/`

### **API Endpoints**
- **Search Suggestions**: `GET http://127.0.0.1:8000/api/search/suggestions/?q=query&limit=10`
- **Scene Details**: `GET http://127.0.0.1:8000/api/scene/{id}/`
- **Add to Favorites**: `POST http://127.0.0.1:8000/api/scene/{id}/favorite/`
- **Remove from Favorites**: `DELETE http://127.0.0.1:8000/api/scene/{id}/favorite/`
- **Delete Scene**: `DELETE http://127.0.0.1:8000/api/scene/{id}/delete/`
- **Search API**: `GET http://127.0.0.1:8000/api/search/?q=query&page=1&page_size=12`

---

## 🔧 **Development Commands**

### **Django Management**
```bash
# Check for issues
python manage.py check

# Check for deployment issues
python manage.py check --deploy

# Collect static files (for production)
python manage.py collectstatic

# Collect static files without prompts
python manage.py collectstatic --noinput

# Run tests
python manage.py test

# Run specific test
python manage.py test scenes_app.tests.TestSceneModel

# Open Django shell
python manage.py shell

# Show all available commands
python manage.py help
```

### **Code Quality**
```bash
# Check Python syntax
python -m py_compile scenes_project/scenes_app/views.py

# Run Django's built-in checks
python manage.py validate

# Check for missing migrations
python manage.py makemigrations --dry-run

# Show Django version
python manage.py version
```

---

## 📱 **Using the Application**

### **1. Browsing Scenes**
- Visit the home page to see all scenes with pagination
- Use the navigation arrows or page numbers to browse
- Click on scene cards to view full details
- Use the favorite button (heart icon) to save scenes
- Use keyboard shortcuts: ← → for pagination, Home/End for first/last page

### **2. Searching Scenes**
- Use the search bar in the navigation (desktop and mobile)
- Type at least 2 characters to see autocomplete suggestions
- Use arrow keys to navigate suggestions, Enter to select
- Click on suggestions or press Enter to search
- Results appear on a dedicated search results page with pagination

### **3. Adding New Scenes**
- Click "Add Scene" in the navigation
- Fill out all required fields in the form
- Use the character detail sections for effeminate and masculine characters
- Add atmosphere details (lighting, scent, sound)
- Submit to add the scene to the database

### **4. Managing Favorites**
- Click the heart icon on any scene card to add to favorites
- View all favorites by clicking "Favorites" in navigation
- Remove favorites by clicking the heart icon again
- Favorites are session-based (stored per browser session)

### **5. Analytics Dashboard**
- View search analytics and popular search terms
- See usage statistics and trends
- Monitor scene popularity and user engagement
- Track search patterns and frequently accessed content

---

## 🛠 **Maintenance Commands**

### **Regular Maintenance**
```bash
# Clear expired sessions
python manage.py clearsessions

# Clear old search queries (older than 30 days)
python manage.py shell -c "from scenes_app.models import SearchQuery; from django.utils import timezone; from datetime import timedelta; SearchQuery.objects.filter(created_at__lt=timezone.now() - timedelta(days=30)).delete()"

# Optimize database (SQLite)
python manage.py shell -c "from django.db import connection; cursor = connection.cursor(); cursor.execute('VACUUM;')"

# Update search suggestions based on recent searches
python manage.py shell -c "from scenes_app.models import SearchSuggestion; SearchSuggestion.update_from_searches()"
```

### **Performance Optimization**
```bash
# Show database size
python manage.py shell -c "import os; print(f'Database size: {os.path.getsize(\"db.sqlite3\")/1024/1024:.2f} MB')"

# Show table sizes
python manage.py shell -c "from django.db import connection; cursor = connection.cursor(); cursor.execute(\"SELECT name FROM sqlite_master WHERE type='table';\"); tables = cursor.fetchall(); [print(f'{table[0]}: {cursor.execute(f\"SELECT COUNT(*) FROM {table[0]}\").fetchone()[0]} rows') for table in tables]"

# Clear unused static files
python manage.py collectstatic --clear --noinput

# Rebuild search index (if implemented)
python manage.py rebuild_search_index
```

---

## 🚨 **Troubleshooting Commands**

### **Common Issues**
```bash
# Reset database completely (DANGER: Deletes all data)
rm db.sqlite3
python manage.py migrate
python manage.py loaddata scenes.json

# Fix migration conflicts
python manage.py migrate --fake-initial

# Check for missing static files
python manage.py findstatic css/main.css
python manage.py findstatic js/main.js

# Validate all templates
python manage.py check --deploy

# Check for broken links in templates
python manage.py check --tag templates
```

### **Debug Information**
```bash
# Show environment information
python manage.py shell -c "import django; import sys; print(f'Django: {django.get_version()}'); print(f'Python: {sys.version}')"

# Show installed packages
pip list

# Show project structure
tree . -I '__pycache__|*.pyc|node_modules|.git'

# Check disk space
df -h .

# Show memory usage
python manage.py shell -c "import psutil; print(f'Memory usage: {psutil.virtual_memory().percent}%')"
```

### **Error Diagnosis**
```bash
# Run with verbose output
python manage.py runserver --verbosity=2

# Check for template errors
python manage.py check --tag templates

# Validate models
python manage.py check --tag models

# Test database connection
python manage.py shell -c "from django.db import connection; cursor = connection.cursor(); cursor.execute('SELECT 1'); print('Database connection: OK')"
```

---

## 📦 **Production Deployment**

### **Preparation**
```bash
# Set environment variables
export DJANGO_SETTINGS_MODULE=scenes_project.settings
export DEBUG=False
export ALLOWED_HOSTS=your-domain.com

# Install production dependencies
pip install gunicorn psycopg2-binary

# Collect static files
python manage.py collectstatic --noinput

# Run security checks
python manage.py check --deploy

# Create production database
python manage.py migrate --run-syncdb
```

### **Server Commands**
```bash
# Run with Gunicorn (production server)
gunicorn scenes_project.wsgi:application

# Run with specific workers
gunicorn scenes_project.wsgi:application --workers 3

# Run on specific port
gunicorn scenes_project.wsgi:application --bind 0.0.0.0:8000

# Run as daemon
gunicorn scenes_project.wsgi:application --daemon --pid gunicorn.pid

# Stop Gunicorn daemon
kill -TERM `cat gunicorn.pid`
```

### **Production Maintenance**
```bash
# Backup production database
python manage.py dumpdata > production_backup_$(date +%Y%m%d_%H%M%S).json

# Update production code
git pull origin main
python manage.py migrate
python manage.py collectstatic --noinput
sudo systemctl restart gunicorn

# Monitor logs
tail -f /var/log/gunicorn/error.log
tail -f /var/log/nginx/access.log
```

---

## 🔐 **Security Commands**

### **Authentication & Authorization**
```bash
# Create new secret key
python manage.py shell -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"

# Change admin password
python manage.py changepassword admin

# Create new superuser
python manage.py createsuperuser

# List all users
python manage.py shell -c "from django.contrib.auth.models import User; [print(f'{u.username}: {u.email}') for u in User.objects.all()]"
```

### **Security Checks**
```bash
# Run security checks
python manage.py check --deploy

# Check for security vulnerabilities
pip audit

# Update dependencies
pip install --upgrade -r requirements.txt

# Check for outdated packages
pip list --outdated
```

---

## 📊 **Monitoring Commands**

### **Application Monitoring**
```bash
# Monitor database size and growth
python manage.py shell -c "from scenes_app.models import *; import os; print(f'Scenes: {Scene.objects.count()}'); print(f'DB Size: {os.path.getsize(\"db.sqlite3\")/1024/1024:.2f} MB')"

# Check recent activity
python manage.py shell -c "from scenes_app.models import *; print('Recent scenes:'); [print(f'{s.id}: {s.title}') for s in Scene.objects.order_by('-id')[:5]]"

# Monitor search activity
python manage.py shell -c "from scenes_app.models import *; from django.utils import timezone; from datetime import timedelta; recent = SearchQuery.objects.filter(created_at__gte=timezone.now() - timedelta(days=7)).count(); print(f'Searches this week: {recent}')"

# Check favorites activity
python manage.py shell -c "from scenes_app.models import *; print(f'Total favorites: {FavoriteScene.objects.count()}'); print(f'Unique sessions with favorites: {FavoriteScene.objects.values(\"session_key\").distinct().count()}')"
```

### **Performance Monitoring**
```bash
# Check response times (basic)
time curl -s http://127.0.0.1:8000/ > /dev/null

# Monitor memory usage during operation
python manage.py shell -c "import psutil; import time; [print(f'Memory: {psutil.virtual_memory().percent}%') or time.sleep(5) for _ in range(12)]"

# Check database query performance
python manage.py shell -c "from django.db import connection; from django.conf import settings; settings.DEBUG = True; from scenes_app.models import Scene; list(Scene.objects.all()[:10]); print(f'Queries executed: {len(connection.queries)}')"
```

### **Log Analysis**
```bash
# Show recent Django logs (if logging is configured)
tail -f django.log

# Count error types in logs
grep -c "ERROR" django.log
grep -c "WARNING" django.log

# Show most accessed URLs
grep "GET" access.log | awk '{print $7}' | sort | uniq -c | sort -nr | head -10
```

---

## 🎯 **Quick Reference**

### **Most Common Commands**
```bash
# Start development
python manage.py runserver

# Apply database changes
python manage.py makemigrations && python manage.py migrate

# Load sample data
python manage.py loaddata scenes.json

# Create admin user
python manage.py createsuperuser

# Backup data
python manage.py dumpdata > backup.json

# Check for issues
python manage.py check
```

### **Emergency Commands**
```bash
# Reset everything (DANGER)
rm db.sqlite3
python manage.py migrate
python manage.py loaddata scenes.json
python manage.py createsuperuser

# Quick backup before changes
python manage.py dumpdata > emergency_backup_$(date +%Y%m%d_%H%M%S).json

# Restore from backup
python manage.py loaddata backup.json
```

---

## 📞 **Support & Documentation**

- **Django Documentation**: https://docs.djangoproject.com/
- **Project Repository**: Check your local repository for additional documentation
- **Issue Tracking**: Use your preferred issue tracking system
- **API Documentation**: Available at `/api/docs/` when running the server

---

*Last Updated: $(date)*
*Project: Whisper of Intimacy - Scene Management System*
