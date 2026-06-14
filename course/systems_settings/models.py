from decimal import Decimal

from django.db import models
from admins.models import Admin


DEFAULT_HOMEPAGE_COMPONENTS = [
    "HeroSection",
    "TrustedCompanies",
    "FeaturesSection",
    "Categories",
    "FeaturedCourses",
    "LearningGoals",
    "TrendingCourses",
    "PopularSkills",
    "TestimonialsSection",
    "StatsSection",
    "InstructorPromo",
    "NewsletterSection",
]


def default_homepage_layout():
    return [
        {"component": name, "enabled": True, "order": index + 1}
        for index, name in enumerate(DEFAULT_HOMEPAGE_COMPONENTS)
    ]


def default_homepage_config():
    return {
        "hero": {
            "headline": "Learn from experts, build your future",
            "subheadline": "Structured learning paths and practical outcomes.",
            "primary_cta": "Explore Courses",
            "secondary_cta": "Become an Instructor",
        }
    }


def default_platform_config():
    return {
        "general": {
            "siteName": "coursePlatform",
            "siteDescription": "Learn new skills with expert-led courses",
            "siteUrl": "https://eduplatform.com",
            "supportEmail": "support@eduplatform.com",
            "logoUrl": "",
            "faviconUrl": "",
            "defaultLanguage": "en",
            "timezone": "UTC",
        },
        "features": {
            "allowUserRegistration": True,
            "requireEmailVerification": True,
            "enableCourseReviews": True,
            "enableBlog": True,
            "enableCertificates": True,
            "enableDiscussions": True,
            "enableLiveStreaming": False,
        },
        "notifications": {
            "emailNotifications": True,
            "pushNotifications": True,
            "smsNotifications": False,
            "marketingEmails": True,
        },
        "security": {
            "passwordMinLength": 8,
            "requireStrongPassword": True,
            "enableTwoFactor": False,
            "sessionTimeout": 3600,
            "maxLoginAttempts": 5,
            "ipWhitelist": [],
        },
        "policies": {},
    }


def default_website_management_config():
    return {}


def default_social_links():
    return {}


def default_banners():
    return []


def default_refund_settings():
    return {
        "refund_mode": "direct_system",
        "refund_retry_cooldown_minutes": 30,
        "refund_max_retry_count": 3,
        "refund_timeout_seconds": 15,
        "allow_admin_override_refund_status": True,
        "allow_admin_soft_delete_refund": True,
    }


def default_legal_policies():
    return {"terms": "", "privacy": "", "refund": "", "community": ""}


def default_payment_methods_config():
    return []


def default_payment_settings_config():
    return {}


def default_payment_gateways():
    return []


def default_subscription_revenue_pool():
    return {
        "poolPercentage": 15,
        "minPayoutThreshold": 50,
        "engagementRate": 0.03,
        "autoPayoutEnabled": True,
    }


class PlatformSetting(models.Model):
    id = models.AutoField(primary_key=True)
    singleton_key = models.PositiveSmallIntegerField(default=1, unique=True, editable=False)
    site_name = models.CharField(max_length=120, default="coursePlatform")
    site_description = models.TextField(blank=True, default="Learn new skills with expert-led courses")
    site_logo = models.URLField(max_length=500, blank=True, default="")
    favicon = models.URLField(max_length=500, blank=True, default="")
    primary_color = models.CharField(max_length=32, blank=True, default="#A435F0")
    secondary_color = models.CharField(max_length=32, blank=True, default="#5624D0")
    contact_email = models.EmailField(max_length=255, blank=True, default="support@eduplatform.com")
    contact_phone = models.CharField(max_length=50, blank=True, default="")
    contact_address = models.CharField(max_length=255, blank=True, default="")
    social_links = models.JSONField(default=default_social_links)
    banners = models.JSONField(default=default_banners)
    min_payout = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("500000"))
    auto_approve_instructor_application = models.BooleanField(default=True)
    auto_approve_payout = models.BooleanField(default=True)
    homepage_layout = models.JSONField(default=default_homepage_layout)
    homepage_config = models.JSONField(default=default_homepage_config)
    homepage_schema_v2 = models.JSONField(null=True, blank=True)
    homepage_schema_v2_initial_backup = models.JSONField(null=True, blank=True)
    website_management = models.JSONField(default=default_website_management_config)
    legal_policies = models.JSONField(default=default_legal_policies)
    learning_path_gemini_model = models.CharField(max_length=120, blank=True, default="")
    updated_by = models.ForeignKey(Admin, on_delete=models.SET_NULL, null=True, blank=True, related_name='platform_settings_updates')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'PlatformSettings'

    def save(self, *args, **kwargs):
        self.singleton_key = 1
        super().save(*args, **kwargs)

    def __str__(self):
        return "Platform settings"


class PaymentSetting(models.Model):
    id = models.AutoField(primary_key=True)
    singleton_key = models.PositiveSmallIntegerField(default=1, unique=True, editable=False)
    payment_policies = models.JSONField(default=list)
    instructor_rates = models.JSONField(default=list)
    discount_rules = models.JSONField(default=list)
    payment_methods_config = models.JSONField(default=default_payment_methods_config)
    payment_settings_config = models.JSONField(default=default_payment_settings_config)
    payment_gateways = models.JSONField(default=default_payment_gateways)
    updated_by = models.ForeignKey(Admin, on_delete=models.SET_NULL, null=True, blank=True, related_name='payment_settings_updates')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'PaymentSettings'

    def save(self, *args, **kwargs):
        self.singleton_key = 1
        super().save(*args, **kwargs)

    def __str__(self):
        return "Payment settings"
