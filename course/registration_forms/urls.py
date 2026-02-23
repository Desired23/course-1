from django.urls import path
from .views import (
    RegistrationFormAdminView,
    RegistrationFormPublicView,
    FormQuestionAdminView,
    FormQuestionBatchView,
)

urlpatterns = [
    path('registration-forms/', RegistrationFormAdminView.as_view(), name='registration-form-list'),
    path('registration-forms/<int:form_id>/', RegistrationFormAdminView.as_view(), name='registration-form-detail'),
    path('registration-forms/active/', RegistrationFormPublicView.as_view(), name='registration-form-active'),
    path('registration-forms/<int:form_id>/questions/', FormQuestionAdminView.as_view(), name='form-question-add'),
    path('registration-forms/questions/<int:question_id>/', FormQuestionAdminView.as_view(), name='form-question-detail'),
    path('registration-forms/<int:form_id>/questions/batch/', FormQuestionBatchView.as_view(), name='form-question-batch'),
]
