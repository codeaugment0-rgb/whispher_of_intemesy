# API Documentation

This document provides comprehensive information about the Django Scenes Project API endpoints.

## Base URL

```
http://localhost:8000/
```

## Authentication

The API uses session-based authentication for favorites functionality. No authentication is required for read-only operations.

## Endpoints

### Scene Management

#### List Scenes
```http
GET /
```

**Parameters:**
- `page` (optional): Page number (default: 1)
- `page_size` (optional): Items per page (10, 25, 50, 100, default: 10)
- `random` (optional): Random ordering (true/false, default: false)
- `favorites` (optional): Show only favorites (true/false, default: false)

**Response:**
```json
{
  "html": "...",
  "pagination_html": "...",
  "current_page": 1,
  "total_pages": 10,
  "total_items": 100,
  "page_size": 10
}
```

#### Get Scene Detail
```http
GET /scene/{id}/
```

**Response:**
```json
{
  "id": 1,
  "title": "Rosewood Romance",
  "effeminate_age": 30,
  "masculine_age": 35,
  "country": "India",
  "setting": "Traditional Room",
  "emotion": "Romance",
  "details": {
    "effeminate": {
      "appearance": "Radiant, porcelain-like fair skin",
      "hair": "Hip-length, high ponytail with silver chains",
      "clothing": "Deep maroon silk lehenga-choli"
    },
    "masculine": {
      "appearance": "Powerfully built, granite-hewn jawline",
      "hair": "Short, thick, silver-streaked",
      "clothing": "Cream silk sherwani"
    },
    "atmosphere": {
      "lighting": "Warm, golden from brass diyas",
      "scent": "Jasmine",
      "sound": "Soft tabla beats"
    }
  },
  "full_text": "...",
  "is_favorited": false,
  "favorite_count": 5
}
```

#### Get Random Scene
```http
GET /api/random/
```

**Response:**
```json
{
  "id": 42,
  "title": "Scene Title",
  "effeminate_age": 25,
  "masculine_age": 30,
  "country": "France",
  "setting": "Garden",
  "emotion": "Joy",
  "details": {...},
  "full_text": "..."
}
```

#### Get Scene Prompt
```http
GET /api/scene/{id}/prompt/
```

**Response:**
```json
{
  "full_text": "Complete scene description..."
}
```

### Favorites Management

#### Toggle Favorite
```http
POST /scene/{id}/toggle-favorite/
```

**Response:**
```json
{
  "success": true,
  "is_favorited": true,
  "action": "added",
  "favorite_count": 6,
  "message": "Scene added to favorites"
}
```

#### List Favorites
```http
GET /favorites/
```

**Parameters:**
- `page` (optional): Page number
- `page_size` (optional): Items per page

**Response:** Same format as scene list

### Analytics

#### Get Analytics Data
```http
GET /api/analytics/
```

**Parameters:**
- `chart_limit` (optional): Limit results per chart (default: 0 = no limit)
- `country` (optional): Filter by country
- `setting` (optional): Filter by setting
- `emotion` (optional): Filter by emotion
- `ageRange` (optional): Filter by age range
- `min_age` (optional): Minimum age filter
- `max_age` (optional): Maximum age filter

**Response:**
```json
{
  "total_scenes": 150,
  "countries": {
    "India": 45,
    "France": 30,
    "Japan": 25
  },
  "settings": {
    "Traditional Room": 40,
    "Garden": 35,
    "Beach": 20
  },
  "emotions": {
    "Romance": 60,
    "Joy": 45,
    "Passion": 30
  },
  "age_stats": {
    "effeminate_avg": 28.5,
    "masculine_avg": 33.2,
    "age_ranges": {
      "20-25": 25,
      "26-30": 45,
      "31-35": 35
    }
  },
  "request_info": {
    "filters_applied": 0,
    "chart_limit": 0,
    "timestamp": "2024-01-15T10:30:00Z",
    "total_params": 1
  }
}
```

### CRUD Operations

#### Create Scene
```http
POST /add_scene/
```

**Request Body:**
```json
{
  "title": "New Scene",
  "effeminate_age": 25,
  "masculine_age": 30,
  "country": "Italy",
  "setting": "Villa",
  "emotion": "Romance",
  "effeminate_appearance": "...",
  "effeminate_hair": "...",
  "effeminate_clothing": "...",
  "masculine_appearance": "...",
  "masculine_hair": "...",
  "masculine_clothing": "...",
  "atmosphere_lighting": "...",
  "atmosphere_scent": "...",
  "atmosphere_sound": "...",
  "full_text": "..."
}
```

**Response:**
```json
{
  "status": "success"
}
```

#### Update Scene
```http
POST /api/scene/{id}/update/
```

**Request Body:**
```json
{
  "title": "Updated Title",
  "country": "Updated Country",
  "details": {
    "effeminate": {...},
    "masculine": {...},
    "atmosphere": {...}
  }
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Scene updated successfully",
  "scene": {
    "id": 1,
    "title": "Updated Title",
    "country": "Updated Country",
    "setting": "Villa",
    "emotion": "Romance"
  }
}
```

#### Delete Scene
```http
DELETE /api/scene/{id}/delete/
```

**Response:**
```json
{
  "status": "success",
  "message": "Scene \"Scene Title\" deleted successfully"
}
```

### Utility Endpoints

#### Pagination Info
```http
GET /api/pagination/
```

**Parameters:** Same as scene list

**Response:**
```json
{
  "success": true,
  "current_page": 1,
  "total_pages": 10,
  "total_items": 100,
  "page_size": 10,
  "page_range": [1, 2, 3, "...", 10],
  "has_previous": false,
  "has_next": true,
  "previous_page_number": null,
  "next_page_number": 2,
  "start_index": 1,
  "end_index": 10
}
```

#### Debug Information
```http
GET /api/debug/
```

**Response:**
```json
{
  "database_count": 150,
  "favorites_count": 45,
  "sync_info": {
    "json_count": 150,
    "db_count": 150,
    "in_sync": true
  },
  "unique_countries": 15,
  "unique_settings": 12,
  "unique_emotions": 8,
  "sample_countries": ["India", "France", "Japan"],
  "sample_settings": ["Traditional Room", "Garden", "Beach"],
  "sample_emotions": ["Romance", "Joy", "Passion"],
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Error Handling

### Error Response Format
```json
{
  "error": "Error message description",
  "status": "error",
  "message": "Detailed error information"
}
```

### Common HTTP Status Codes

- `200 OK`: Successful request
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request data
- `404 Not Found`: Resource not found
- `405 Method Not Allowed`: HTTP method not supported
- `500 Internal Server Error`: Server error

## Rate Limiting

Currently, no rate limiting is implemented. For production use, consider implementing rate limiting using Django-ratelimit or similar packages.

## Examples

### JavaScript Fetch Examples

#### Get Random Scene
```javascript
fetch('/api/random/')
  .then(response => response.json())
  .then(data => console.log(data));
```

#### Toggle Favorite
```javascript
fetch(`/scene/${sceneId}/toggle-favorite/`, {
  method: 'POST',
  headers: {
    'X-CSRFToken': getCookie('csrftoken'),
    'Content-Type': 'application/json'
  }
})
.then(response => response.json())
.then(data => console.log(data));
```

#### Get Analytics with Filters
```javascript
const params = new URLSearchParams({
  country: 'India',
  emotion: 'Romance',
  chart_limit: 10
});

fetch(`/api/analytics/?${params}`)
  .then(response => response.json())
  .then(data => console.log(data));
```

### Python Requests Examples

#### Get Scene List
```python
import requests

response = requests.get('http://localhost:8000/', params={
    'page': 1,
    'page_size': 25,
    'random': 'true'
})
data = response.json()
```

#### Create New Scene
```python
import requests

scene_data = {
    'title': 'New Scene',
    'effeminate_age': 25,
    'masculine_age': 30,
    'country': 'Italy',
    'setting': 'Villa',
    'emotion': 'Romance',
    'full_text': 'Scene description...'
}

response = requests.post('http://localhost:8000/add_scene/', data=scene_data)
```

## Webhooks

Currently, no webhooks are implemented. Future versions may include webhook support for:
- New scene creation
- Favorite additions
- Analytics updates

## SDK and Libraries

Consider creating SDKs for popular languages:
- Python SDK using requests
- JavaScript/Node.js SDK
- Mobile SDKs for iOS/Android

## Versioning

The API currently doesn't use versioning. Future versions should implement versioning using:
- URL versioning: `/api/v1/scenes/`
- Header versioning: `Accept: application/vnd.api+json;version=1`