from django.db import models
from lessons.models import Lesson

class QuizQuestion(models.Model):
    class QuestionType(models.TextChoices):
        MULTIPLE_CHOICE = 'multiple', 'multiple'
        TRUE_FALSE = 'truefalse', 'true/false'
        SHORT_ANSWER = 'short', 'short'
        ESSAY = 'essay'
        CODE = 'code'
    
    class DifficultyLevel(models.TextChoices):
        EASY = 'easy'
        MEDIUM = 'medium'
        HARD = 'hard'
    
    id = models.AutoField(primary_key=True)
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name='quiz_question_lesson')
    difficulty = models.CharField(max_length=10, choices=DifficultyLevel.choices, default=DifficultyLevel.EASY)   
    question_text = models.TextField()
    question_type = models.CharField(max_length=20, choices=QuestionType.choices)
    options = models.JSONField(blank=True, null=True)
    correct_answer = models.TextField()
    points = models.IntegerField(default=1)
    explanation = models.TextField(blank=True, null=True)
    order_number = models.IntegerField(blank=True, null=True)
    
    # Fields for CODE type questions
    description = models.TextField(blank=True, null=True, help_text="Detailed description for code questions")
    time_limit = models.IntegerField(null=True, blank=True, help_text="Time limit in seconds for code execution")
    memory_limit = models.IntegerField(null=True, blank=True, help_text="Memory limit in KB for code execution")
    allowed_languages = models.JSONField(blank=True, null=True, help_text="Array of Judge0 language IDs allowed for this question")
    starter_code = models.TextField(blank=True, null=True, help_text="Starter/template code for students")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='deleted_quiz_questions')
    is_deleted = models.BooleanField(default=False)
    
    class Meta:
        db_table = "QuizQuestions"

    def __str__(self):
        return f"Question {self.id}: {self.question_text[:50]}"


class QuizTestCase(models.Model):
    """Test cases for code-type quiz questions"""
    id = models.AutoField(primary_key=True)
    question = models.ForeignKey(QuizQuestion, on_delete=models.CASCADE, related_name='test_cases')
    
    input_data = models.TextField(help_text="Input data for the test case")
    expected_output = models.TextField(help_text="Expected output for the test case")
    is_hidden = models.BooleanField(default=False, help_text="Whether this test case is hidden from students")
    points = models.IntegerField(default=0, help_text="Points awarded for passing this test case (0 means use question's points)")
    order_number = models.IntegerField(default=0, help_text="Order of test case execution")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    is_deleted = models.BooleanField(default=False)
    
    class Meta:
        db_table = "QuizTestCases"
        ordering = ['order_number']
    
    def __str__(self):
        return f"TestCase {self.id} for Question {self.question.id} (Hidden: {self.is_hidden})"