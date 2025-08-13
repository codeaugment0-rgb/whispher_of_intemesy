#!/usr/bin/env python
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'scenes_project.settings')
django.setup()

from scenes_project.scenes_app.models import Scene

def find_scenes_with_missing_details():
    scenes = Scene.objects.all()
    print(f'Checking {scenes.count()} scenes for missing details...\n')
    
    missing_details = []
    
    for scene in scenes:
        issues = []
        
        if not scene.details:
            issues.append("No details field")
        else:
            # Check effeminate details
            effeminate = scene.details.get('effeminate', {})
            if not effeminate.get('appearance'):
                issues.append("Missing effeminate appearance")
            if not effeminate.get('hair'):
                issues.append("Missing effeminate hair")
            if not effeminate.get('clothing'):
                issues.append("Missing effeminate clothing")
            
            # Check masculine details
            masculine = scene.details.get('masculine', {})
            if not masculine.get('appearance'):
                issues.append("Missing masculine appearance")
            if not masculine.get('hair'):
                issues.append("Missing masculine hair")
            if not masculine.get('clothing'):
                issues.append("Missing masculine clothing")
            
            # Check atmosphere details
            atmosphere = scene.details.get('atmosphere', {})
            if not atmosphere.get('lighting'):
                issues.append("Missing atmosphere lighting")
            if not atmosphere.get('scent'):
                issues.append("Missing atmosphere scent")
            if not atmosphere.get('sound'):
                issues.append("Missing atmosphere sound")
        
        if issues:
            missing_details.append((scene, issues))
    
    if missing_details:
        print(f'Found {len(missing_details)} scenes with missing details:')
        for scene, issues in missing_details[:10]:  # Show first 10
            print(f'\nScene {scene.id}: {scene.title}')
            for issue in issues:
                print(f'  - {issue}')
    else:
        print('All scenes have complete details!')
    
    return missing_details

if __name__ == '__main__':
    find_scenes_with_missing_details()