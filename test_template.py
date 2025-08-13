#!/usr/bin/env python
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'scenes_project.settings')
django.setup()

from scenes_project.scenes_app.models import Scene
from django.template.loader import render_to_string
from django.test import RequestFactory

def test_template_rendering():
    # Get the first scene
    scene = Scene.objects.first()
    print(f'Testing with scene: {scene.title}')
    
    # Create a mock request
    factory = RequestFactory()
    request = factory.get(f'/scene/{scene.id}/')
    request.session = {}
    
    # Test direct template variable access
    from django.template import Template, Context
    
    test_templates = [
        '{{ scene.details.effeminate.appearance }}',
        '{{ scene.details.effeminate.appearance|default:"Default appearance" }}',
        '{{ scene.details.masculine.appearance }}',
        '{{ scene.details.atmosphere.lighting }}',
    ]
    
    context = Context({'scene': scene})
    
    for template_str in test_templates:
        template = Template(template_str)
        result = template.render(context)
        print(f'Template: {template_str}')
        print(f'Result: "{result}"')
        print()

if __name__ == '__main__':
    test_template_rendering