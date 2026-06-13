from django.contrib import admin
from users.models import User
from admins.models import Admin
from courses.models import Course
from instructors.models import Instructor
from enrollments.models import Enrollment
from notifications.models import Notification
from promotions.models import Promotion
from carts.models import Cart
from wishlists.models import Wishlist
from categories.models import Category
from quiz_questions.models import QuizQuestion
from quiz_results.models import QuizResult
from questions.models import Question
from answers.models import Answer
from systems_settings.models import PaymentSetting, PlatformSetting
from supports.models import Support

from payments.models import Payment
from reviews.models import Review
from blog_posts.models import BlogPost
from payment_details.models import Payment_Details
from instructor_earnings.models import InstructorEarning
from instructor_payouts.models import InstructorPayout
from instructor_levels.models import InstructorLevel
from support_replies.models import SupportReply
from coursemodules.models import CourseModule
from lesson_comments.models import LessonComment
from lessons.models import Lesson
from activity_logs.models import ActivityLog
from learning_progress.models import LearningProgress
from quiz_questions.models import QuizTestCase
from applications.models import Application, ApplicationResponse
from registration_forms.models import RegistrationForm, FormQuestion
admin.site.register(LearningProgress)
admin.site.register(BlogPost)
admin.site.register(User)
admin.site.register(Course)
admin.site.register(Instructor)
admin.site.register(Admin)

admin.site.register(Enrollment)
admin.site.register(Payment)
admin.site.register(Payment_Details)

admin.site.register(Notification)
admin.site.register(Promotion)
admin.site.register(Cart)
admin.site.register(Wishlist)
admin.site.register(Category)
admin.site.register(QuizQuestion)
admin.site.register(QuizResult)
admin.site.register(Question)
admin.site.register(Answer)
admin.site.register(PlatformSetting)
admin.site.register(PaymentSetting)
admin.site.register(Support)
admin.site.register(InstructorEarning)
admin.site.register(InstructorPayout)
admin.site.register(InstructorLevel)
admin.site.register(SupportReply)
admin.site.register(CourseModule)
admin.site.register(LessonComment)
admin.site.register(Lesson)
admin.site.register(ActivityLog)
admin.site.register(QuizTestCase)
admin.site.register(Application)
admin.site.register(ApplicationResponse)
admin.site.register(RegistrationForm)
admin.site.register(FormQuestion)
