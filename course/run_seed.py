import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()


from config.seed_view import _run_seed

if __name__ == '__main__':
    _run_seed()
