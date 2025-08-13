#!/usr/bin/env python
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'scenes_project.settings')
django.setup()

from scenes_project.scenes_app.models import Scene

def check_scenes():
    scenes = Scene.objects.all()
    print(f'Total scenes: {scenes.count()}')
    
    for scene in scenes[:5]:
        print(f'\nScene {scene.id}: {scene.title}')
        print(f'  Details keys: {list(scene.details.keys()) if scene.details else "No details"}')
        
        if scene.details:
            effeminate = scene.details.get('effeminate', {})
            masculine = scene.details.get('masculine', {})
            atmosphere = scene.details.get('atmosphere', {})
            
            print(f'  Effeminate appearance: {effeminate.get("appearance", "MISSING")}')
            print(f'  Masculine appearance: {masculine.get("appearance", "MISSING")}')
            print(f'  Atmosphere lighting: {atmosphere.get("lighting", "MISSING")}')
        else:
            print('  NO DETAILS FIELD')

if __name__ == '__main__':
    check_scenes()