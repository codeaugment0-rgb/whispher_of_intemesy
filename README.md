# Django Scenes Project

A Django web application for managing and viewing romantic scenes with advanced features including favorites, analytics, pagination, and responsive design.

## 🌟 Features

- **Scene Management**: Create, read, update, and delete romantic scenes
- **Favorites System**: Mark scenes as favorites with session-based storage
- **Advanced Analytics**: Comprehensive data analysis with charts and filtering
- **Smart Pagination**: Efficient pagination with random ordering options
- **Responsive Design**: Mobile-friendly interface using Tailwind CSS
- **REST API**: Full API endpoints for programmatic access
- **Search & Filter**: Filter scenes by country, setting, emotion, and age ranges
- **Random Scene**: Get random scenes for discovery

## 🚀 Quick Start

### Prerequisites

- Python 3.8+
- pip (Python package manager)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/django-scenes-project.git
   cd django-scenes-project
   ```

2. **Create and activate virtual environment**
   ```bash
   # Windows
   python -m venv venv
   venv\Scripts\activate

   # macOS/Linux
   python -m venv venv
   source venv/bin/activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Environment setup**
   ```bash
   # Copy the example environment file
   cp .env.example .env
   
   # Edit .env with your settings
   # Add your SECRET_KEY and other configurations
   ```

5. **Database setup**
   ```bash
   python manage.py migrate
   python manage.py createsuperuser  # Optional: create admin user
   ```

6. **Load initial data (optional)**
   ```bash
   python manage.py loaddata scenes.json
   ```

7. **Run the development server**
   ```bash
   python manage.py runserver
   ```

8. **Access the application**
   - Main application: http://127.0.0.1:8000/
   - Admin panel: http://127.0.0.1:8000/admin/
   - Analytics: http://127.0.0.1:8000/analytics/

## 📁 Project Structure

```
django-scenes-project/
├── manage.py                    # Django management script
├── requirements.txt             # Python dependencies
├── scenes.json                  # Initial data file
├── tailwind.config.js          # Tailwind CSS configuration
├── .env                        # Environment variables
├── scenes_project/             # Main project directory
│   ├── __init__.py
│   ├── settings.py             # Django settings
│   ├── urls.py                 # Main URL configuration
│   ├── wsgi.py                 # WSGI configuration
│   └── scenes_app/             # Main application
│       ├── models.py           # Database models
│       ├── views.py            # View functions
│       ├── urls.py             # App URL patterns
│       ├── admin.py            # Admin configuration
│       ├── serializers.py      # API serializers
│       ├── context_processors.py # Template context
│       ├── templates/          # HTML templates
│       ├── static/             # Static files (CSS, JS, images)
│       ├── management/         # Custom management commands
│       └── migrations/         # Database migrations
└── docs/                       # Documentation files
```

## 🎯 Usage

### Web Interface

1. **Browse Scenes**: Visit the homepage to view all scenes with pagination
2. **View Scene Details**: Click on any scene to see full details
3. **Add to Favorites**: Click the heart icon to favorite/unfavorite scenes
4. **Random Scene**: Use the "Random Scene" button for discovery
5. **Analytics**: Visit `/analytics/` for comprehensive data insights

### API Endpoints

The application provides a comprehensive REST API:

```
GET  /                          # Scene list (with pagination)
GET  /scene/<id>/               # Scene detail
GET  /random/                   # Random scene redirect
GET  /favorites/                # User's favorite scenes
POST /scene/<id>/toggle-favorite/ # Toggle favorite status

# API Endpoints
GET  /api/scene/<id>/prompt/    # Get scene full text
GET  /api/random/               # Random scene data
GET  /api/analytics/            # Analytics data
GET  /api/pagination/           # Pagination metadata
GET  /api/debug/                # Debug information

# CRUD API
POST   /api/scene/<id>/update/  # Update scene
DELETE /api/scene/<id>/delete/  # Delete scene
```

### Management Commands

```bash
# Load scenes from JSON file
python manage.py load_scenes scenes.json

# Generate analytics report
python manage.py generate_analytics

# Clear favorites older than X days
python manage.py cleanup_favorites --days 30
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database (optional - defaults to SQLite)
DATABASE_URL=sqlite:///db.sqlite3

# Analytics settings
ANALYTICS_CACHE_TIMEOUT=3600
```

### Key Settings

- **Database**: SQLite by default, easily configurable for PostgreSQL/MySQL
- **Static Files**: Configured for development and production
- **Tailwind CSS**: Integrated for responsive design
- **REST Framework**: Configured for API functionality
- **Session Management**: Used for favorites without user accounts

## 📊 Data Models

### Scene Model
```python
class Scene(models.Model):
    title = models.CharField(max_length=255, unique=True)
    effeminate_age = models.IntegerField()
    masculine_age = models.IntegerField()
    country = models.CharField(max_length=100)
    setting = models.CharField(max_length=100)
    emotion = models.CharField(max_length=100)
    details = models.JSONField(default=dict)
    full_text = models.TextField()
```

### FavoriteScene Model
```python
class FavoriteScene(models.Model):
    scene = models.ForeignKey(Scene, on_delete=models.CASCADE)
    session_key = models.CharField(max_length=40)
    created_at = models.DateTimeField(auto_now_add=True)
```

## 🎨 Frontend Features

- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Interactive UI**: AJAX-powered pagination and favorites
- **Modern Components**: Cards, modals, and smooth animations
- **Accessibility**: ARIA labels and keyboard navigation support
- **Performance**: Optimized queries and caching

## 🔍 Analytics Features

- **Scene Distribution**: By country, setting, emotion
- **Age Analysis**: Age range distributions and averages
- **Popularity Metrics**: Most favorited scenes
- **Trend Analysis**: Creation patterns over time
- **Interactive Charts**: Filterable and responsive visualizations

## 🚀 Deployment

### Production Setup

1. **Environment Configuration**
   ```env
   DEBUG=False
   ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
   SECRET_KEY=your-production-secret-key
   ```

2. **Database Migration**
   ```bash
   python manage.py migrate
   python manage.py collectstatic
   ```

3. **Web Server Configuration**
   - Use Gunicorn or uWSGI for WSGI server
   - Configure Nginx for static files and reverse proxy
   - Set up SSL certificates

### Docker Deployment

```dockerfile
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
RUN python manage.py collectstatic --noinput

EXPOSE 8000
CMD ["gunicorn", "scenes_project.wsgi:application", "--bind", "0.0.0.0:8000"]
```

## 🧪 Testing

```bash
# Run all tests
python manage.py test

# Run specific app tests
python manage.py test scenes_project.scenes_app

# Run with coverage
coverage run --source='.' manage.py test
coverage report
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow PEP 8 style guidelines
- Write tests for new features
- Update documentation for API changes
- Use meaningful commit messages

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Issues**: Report bugs and request features on GitHub Issues
- **Documentation**: Check the `/docs/` directory for detailed guides
- **Community**: Join our discussions in GitHub Discussions

## 🔄 Changelog

See [CHANGELOG.md](CHANGELOG.md) for a detailed history of changes.

---

**Made with ❤️ using Django and Tailwind CSS**