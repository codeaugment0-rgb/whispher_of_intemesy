from rest_framework import serializers
from .models import Scene


class SceneSerializer(serializers.ModelSerializer):
    class Meta:
        model = Scene
        fields = [
            'id', 'title', 'effeminate_age', 'masculine_age',
            'country', 'setting', 'emotion', 'details', 'full_text'
        ]


