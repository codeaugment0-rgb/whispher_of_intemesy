from django.db import models


class Scene(models.Model):
    title = models.CharField(max_length=255, unique=True)
    effeminate_age = models.IntegerField()
    masculine_age = models.IntegerField()
    country = models.CharField(max_length=100)
    setting = models.CharField(max_length=100)
    emotion = models.CharField(max_length=100)
    details = models.JSONField(default=dict)
    full_text = models.TextField()

    class Meta:
        ordering = ['id']
        indexes = [
            models.Index(fields=['country']),
            models.Index(fields=['setting']),
            models.Index(fields=['emotion']),
        ]

    def __str__(self) -> str:
        return self.title

    @property
    def favorite_count(self):
        return self.favorites.count()


class FavoriteScene(models.Model):
    scene = models.ForeignKey(Scene, on_delete=models.CASCADE, related_name='favorites')
    session_key = models.CharField(max_length=40)  # Using session for anonymous users
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('scene', 'session_key')
        ordering = ['-created_at']

    def __str__(self) -> str:
        return f"Favorite: {self.scene.title} (Session: {self.session_key[:8]}...)"


