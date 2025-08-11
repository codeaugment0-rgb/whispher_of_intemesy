# Contributing to Django Scenes Project

Thank you for your interest in contributing to the Django Scenes Project! This document provides guidelines and information for contributors.

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Setup](#development-setup)
4. [Contributing Guidelines](#contributing-guidelines)
5. [Pull Request Process](#pull-request-process)
6. [Coding Standards](#coding-standards)
7. [Testing](#testing)
8. [Documentation](#documentation)

## Code of Conduct

### Our Pledge

We pledge to make participation in our project a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, gender identity and expression, level of experience, nationality, personal appearance, race, religion, or sexual identity and orientation.

### Our Standards

Examples of behavior that contributes to creating a positive environment include:

- Using welcoming and inclusive language
- Being respectful of differing viewpoints and experiences
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

### Enforcement

Instances of abusive, harassing, or otherwise unacceptable behavior may be reported by contacting the project team. All complaints will be reviewed and investigated promptly and fairly.

## Getting Started

### Prerequisites

- Python 3.8 or higher
- Git
- Basic knowledge of Django and web development
- Familiarity with HTML, CSS, and JavaScript

### Areas for Contribution

We welcome contributions in the following areas:

- **Bug fixes**: Help us identify and fix issues
- **Feature development**: Implement new features
- **Documentation**: Improve existing docs or write new ones
- **Testing**: Add test coverage and improve test quality
- **UI/UX improvements**: Enhance the user interface
- **Performance optimization**: Make the application faster
- **Accessibility**: Improve accessibility compliance
- **Internationalization**: Add support for multiple languages

## Development Setup

### 1. Fork and Clone

```bash
# Fork the repository on GitHub
# Clone your fork
git clone https://github.com/YOUR_USERNAME/django-scenes-project.git
cd django-scenes-project

# Add upstream remote
git remote add upstream https://github.com/ORIGINAL_OWNER/django-scenes-project.git
```

### 2. Set Up Development Environment

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
pip install -r requirements-dev.txt  # Development dependencies
```

### 3. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env with development settings
DEBUG=True
SECRET_KEY=dev-secret-key-for-development-only
ALLOWED_HOSTS=localhost,127.0.0.1
```

### 4. Set Up Database

```bash
# Run migrations
python manage.py migrate

# Load sample data (optional)
python manage.py loaddata fixtures/sample_scenes.json

# Create superuser
python manage.py createsuperuser
```

### 5. Install Pre-commit Hooks

```bash
# Install pre-commit
pip install pre-commit

# Install hooks
pre-commit install

# Run hooks on all files (optional)
pre-commit run --all-files
```

### 6. Run Development Server

```bash
python manage.py runserver
```

Visit `http://127.0.0.1:8000` to see the application.

## Contributing Guidelines

### Issue Reporting

Before creating an issue, please:

1. **Search existing issues** to avoid duplicates
2. **Use the issue template** when available
3. **Provide detailed information** including:
   - Steps to reproduce
   - Expected behavior
   - Actual behavior
   - Environment details (OS, Python version, etc.)
   - Screenshots if applicable

### Feature Requests

When requesting a feature:

1. **Check if it already exists** in issues or discussions
2. **Explain the use case** and why it's needed
3. **Provide examples** of how it would work
4. **Consider the scope** - start with smaller features

### Branch Naming

Use descriptive branch names:

```bash
# Feature branches
git checkout -b feature/add-scene-search
git checkout -b feature/improve-pagination

# Bug fix branches
git checkout -b fix/favorite-toggle-bug
git checkout -b fix/mobile-responsive-issue

# Documentation branches
git checkout -b docs/api-documentation
git checkout -b docs/deployment-guide
```

### Commit Messages

Follow conventional commit format:

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(scenes): add search functionality to scene list

fix(favorites): resolve toggle favorite button issue

docs(api): update API documentation with new endpoints

test(models): add tests for Scene model validation
```

## Pull Request Process

### 1. Before Creating a PR

- [ ] Ensure your branch is up to date with main
- [ ] Run tests and ensure they pass
- [ ] Run linting and fix any issues
- [ ] Update documentation if needed
- [ ] Add or update tests for your changes

```bash
# Update your branch
git fetch upstream
git rebase upstream/main

# Run tests
python manage.py test

# Run linting
flake8 .
black --check .
isort --check-only .
```

### 2. Creating the PR

1. **Use the PR template** when available
2. **Write a clear title** describing the change
3. **Provide detailed description** including:
   - What changes were made
   - Why the changes were necessary
   - How to test the changes
   - Any breaking changes
4. **Link related issues** using keywords like "Fixes #123"
5. **Add screenshots** for UI changes
6. **Mark as draft** if work is in progress

### 3. PR Review Process

- PRs require at least one approval from a maintainer
- Address all review comments
- Keep the PR updated with main branch
- Be responsive to feedback and questions

### 4. After Approval

- Maintainers will merge the PR
- Your branch will be deleted automatically
- Update your local repository:

```bash
git checkout main
git pull upstream main
git branch -d your-feature-branch
```

## Coding Standards

### Python Code Style

We follow PEP 8 with some modifications:

```python
# Use Black for formatting
black --line-length 88 .

# Use isort for import sorting
isort .

# Use flake8 for linting
flake8 --max-line-length=88 --extend-ignore=E203,W503 .
```

### Django Best Practices

1. **Models**
   ```python
   class Scene(models.Model):
       title = models.CharField(max_length=255, unique=True)
       created_at = models.DateTimeField(auto_now_add=True)
       
       class Meta:
           ordering = ['-created_at']
           indexes = [
               models.Index(fields=['title']),
           ]
       
       def __str__(self):
           return self.title
   ```

2. **Views**
   ```python
   def scene_list(request):
       """List all scenes with pagination."""
       scenes = Scene.objects.all()
       paginator = Paginator(scenes, 10)
       page_obj = paginator.get_page(request.GET.get('page'))
       
       return render(request, 'scene_list.html', {
           'page_obj': page_obj
       })
   ```

3. **Templates**
   ```html
   <!-- Use semantic HTML -->
   <article class="scene-card">
       <h2 class="scene-title">{{ scene.title }}</h2>
       <p class="scene-description">{{ scene.description|truncatewords:20 }}</p>
   </article>
   ```

### JavaScript Code Style

```javascript
// Use modern JavaScript features
const fetchScenes = async (page = 1) => {
    try {
        const response = await fetch(`/api/scenes/?page=${page}`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching scenes:', error);
        throw error;
    }
};

// Use meaningful variable names
const sceneContainer = document.getElementById('scene-container');
const loadingSpinner = document.querySelector('.loading-spinner');
```

### CSS/Tailwind Guidelines

```html
<!-- Use Tailwind utility classes -->
<div class="max-w-4xl mx-auto p-6">
    <h1 class="text-3xl font-bold text-gray-900 mb-6">Scenes</h1>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <!-- Scene cards -->
    </div>
</div>
```

## Testing

### Running Tests

```bash
# Run all tests
python manage.py test

# Run specific app tests
python manage.py test scenes_project.scenes_app

# Run with coverage
coverage run --source='.' manage.py test
coverage report
coverage html  # Generate HTML report
```

### Writing Tests

1. **Model Tests**
   ```python
   from django.test import TestCase
   from .models import Scene
   
   class SceneModelTest(TestCase):
       def setUp(self):
           self.scene = Scene.objects.create(
               title="Test Scene",
               effeminate_age=25,
               masculine_age=30,
               country="Test Country",
               setting="Test Setting",
               emotion="Test Emotion",
               full_text="Test description"
           )
       
       def test_string_representation(self):
           self.assertEqual(str(self.scene), "Test Scene")
       
       def test_favorite_count(self):
           self.assertEqual(self.scene.favorite_count, 0)
   ```

2. **View Tests**
   ```python
   from django.test import TestCase, Client
   from django.urls import reverse
   
   class SceneViewTest(TestCase):
       def setUp(self):
           self.client = Client()
           self.scene = Scene.objects.create(...)
       
       def test_scene_list_view(self):
           response = self.client.get(reverse('scene_list'))
           self.assertEqual(response.status_code, 200)
           self.assertContains(response, self.scene.title)
   ```

3. **API Tests**
   ```python
   from rest_framework.test import APITestCase
   from rest_framework import status
   
   class SceneAPITest(APITestCase):
       def test_get_random_scene(self):
           Scene.objects.create(...)
           response = self.client.get('/api/random/')
           self.assertEqual(response.status_code, status.HTTP_200_OK)
   ```

### Test Coverage Goals

- Maintain at least 80% test coverage
- All new features must include tests
- Critical paths should have 100% coverage

## Documentation

### Code Documentation

```python
def analyze_scenes():
    """
    Analyze scene data and return statistics.
    
    Returns:
        dict: Dictionary containing analysis results with keys:
            - total_scenes: Total number of scenes
            - countries: Distribution by country
            - settings: Distribution by setting
            - emotions: Distribution by emotion
    
    Raises:
        ValueError: If no scenes are found in database
    """
    pass
```

### API Documentation

Update `docs/API.md` when adding new endpoints:

```markdown
#### Get Scene Analytics
```http
GET /api/analytics/
```

**Parameters:**
- `country` (optional): Filter by country
- `limit` (optional): Limit results

**Response:**
```json
{
    "total_scenes": 150,
    "countries": {...}
}
```
```

### README Updates

Keep the main README.md updated with:
- New features
- Changed requirements
- Updated installation steps
- New configuration options

## Development Tools

### Recommended IDE Setup

**VS Code Extensions:**
- Python
- Django
- Tailwind CSS IntelliSense
- GitLens
- Prettier
- ESLint

**Settings:**
```json
{
    "python.defaultInterpreterPath": "./venv/bin/python",
    "python.linting.enabled": true,
    "python.linting.flake8Enabled": true,
    "python.formatting.provider": "black",
    "editor.formatOnSave": true
}
```

### Debugging

```python
# Use Django's built-in debugging
import pdb; pdb.set_trace()

# Or use ipdb for better experience
import ipdb; ipdb.set_trace()

# For API debugging
import logging
logger = logging.getLogger(__name__)
logger.debug(f"Processing scene: {scene.title}")
```

## Release Process

### Version Numbering

We use Semantic Versioning (SemVer):
- `MAJOR.MINOR.PATCH`
- Major: Breaking changes
- Minor: New features (backward compatible)
- Patch: Bug fixes

### Creating a Release

1. Update version in `__init__.py`
2. Update `CHANGELOG.md`
3. Create release branch
4. Test thoroughly
5. Create GitHub release
6. Deploy to production

## Getting Help

- **GitHub Issues**: For bugs and feature requests
- **GitHub Discussions**: For questions and general discussion
- **Documentation**: Check the `/docs/` directory
- **Code Review**: Ask for help in PR comments

## Recognition

Contributors will be recognized in:
- `CONTRIBUTORS.md` file
- GitHub contributors page
- Release notes for significant contributions

Thank you for contributing to the Django Scenes Project! 🎉