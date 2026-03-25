"""
URL configuration for course project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from config.seed_view import seed_demo_view, seed_status_view


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/seed-demo/', seed_demo_view, name='seed-demo'),
    path('api/seed-demo/status/', seed_status_view, name='seed-status'),

    path('api/', include('users.urls')),           # /api/users/
    path('api/', include('payments.urls')),        # /api/payments/
    # path('api/', include('reviews.urls')), 
    path('api/', include('courses.urls')),
    path('api/', include('instructors.urls')),
    path('api/', include('categories.urls')),
    path('api/', include('admins.urls')),
    path('api/', include('lessons.urls')),
    path('api/', include('coursemodules.urls')),
    path('api/', include('enrollments.urls')),
    path('api/', include('learning_progress.urls')),
    path('api/', include('reviews.urls')),
    path('api/', include('blog_posts.urls')),
    path('api/', include('lesson_attachments.urls')),
    path('api/', include('quiz_questions.urls')),
    path('api/', include('notifications.urls')),
    path('api/', include('promotions.urls')),
    path('api/', include('carts.urls')),
    path('api/', include('wishlists.urls')),
    path('api/', include('quiz_results.urls')),
    path('api/', include('qnas.urls')),
    path('api/', include('qna_answers.urls')),
    path('api/', include('forums.urls')),
    path('api/', include('forum_topics.urls')),
    path('api/', include('forum_comments.urls')),
    path('api/', include('systems_settings.urls')),
    path('api/', include('supports.urls')),
    path('api/', include('reports.urls')),
    path('api/', include('instructor_earnings.urls')),
    path('api/', include('instructor_payouts.urls')),
    path('api/', include('instructor_levels.urls')),
    path('api/', include('support_replies.urls')),
    path('api/', include('utils.upload.urls')),     # /api/cloudinary/upload/
    path('api/', include('lesson_comments.urls')),  # /api/lesson_comments/
    path('api/', include('registration_forms.urls')),
    path('api/', include('applications.urls')),
    path('api/', include('certificates.urls')),
    path('api/', include('subscription_plans.urls')),
    path('api/', include('payment_methods.urls')),
    path('api/', include('activity_logs.urls')),
    path('api/', include('blog_comments.urls')),
    path('api/', include('realtime.urls')),
]
