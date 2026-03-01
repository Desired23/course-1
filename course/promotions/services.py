from rest_framework.exceptions import ValidationError
from .serializers import PromotionSerializer
from .models import Promotion
from admins.models import Admin
from courses.models import Course
from django.utils.timezone import make_aware
from instructors.models import Instructor
from users.models import User
from django.utils import timezone
from dateutil.parser import parse

def create_promotion(data):
    try:

        admin_id = data.get('admin_id')
        instructor_id = data.get('instructor_id')


        if not admin_id and not instructor_id:
            raise ValidationError({"error": "Either admin_id or instructor_id is required."})


        if admin_id:
            try:
                Admin.objects.get(id=admin_id)
            except Admin.DoesNotExist:
                raise ValidationError({"error": "Admin not found."})


        if instructor_id:
            try:
                Instructor.objects.get(id=instructor_id)
            except Instructor.DoesNotExist:
                raise ValidationError({"error": "Instructor not found."})


        end_date_str = data.get('end_date')
        if not end_date_str:
            raise ValidationError({"error": "end_date is required."})
        try:
            end_date = parse(end_date_str)
            if end_date.tzinfo is None:
                end_date = make_aware(end_date)
            if end_date < timezone.now():
                raise ValidationError({"error": "End date cannot be in the past."})
        except (ValueError, TypeError):
            raise ValidationError({"error": "Invalid end date format."})

        code = data.get('code')
        if not code:
            raise ValidationError({"error": "Promotion code is required."})
        if Promotion.objects.filter(code=code).exists():
            raise ValidationError({"error": "Promotion code already exists."})

        applicable_course_ids = data.pop('applicable_courses', [])
        if not isinstance(applicable_course_ids, list):
            raise ValidationError({"error": "applicable_courses must be a list of IDs."})

        serializer = PromotionSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        promotion = serializer.save()

        if applicable_course_ids:
            courses = Course.objects.filter(pk__in=applicable_course_ids)
            if len(courses) != len(applicable_course_ids):
                raise ValidationError({"error": "Some courses not found."})
            # Verify instructor owns all applicable courses
            if instructor_id:
                for course in courses:
                    if course.instructor_id != int(instructor_id):
                        raise ValidationError(
                            {"error": f"Giảng viên không sở hữu khóa học '{course.title}' (ID={course.id})."}
                        )
            promotion.applicable_courses.set(courses)

        return PromotionSerializer(promotion).data

    except ValidationError:
        raise
    except Exception as e:
        raise ValidationError({"error": f"Unexpected error: {str(e)}"})

def get_promotion_by_id(promotion_id):
    try:
        if not promotion_id:
            raise ValidationError({"error": "promotion_id is required"})

        promotion = (
            Promotion.objects
            .select_related('admin', 'instructor')
            .prefetch_related('applicable_courses', 'applicable_categories')
            .get(id=promotion_id)
        )

        return PromotionSerializer(promotion).data

    except Promotion.DoesNotExist:
        raise ValidationError({"error": "Promotion not found"})
    except ValidationError:
        raise
    except Exception as e:
        raise ValidationError({"error": f"Error retrieving promotion: {str(e)}"})


def get_promotions_by_admin(admin_id):
    try:
        if not admin_id:
            raise ValidationError({"error": "admin_id is required"})

        try:
            Admin.objects.get(id=admin_id)
        except Admin.DoesNotExist:
            raise ValidationError({"error": "Admin not found"})

        promotions = (
            Promotion.objects
            .filter(admin=admin_id)
            .select_related('admin', 'instructor')
            .prefetch_related('applicable_courses', 'applicable_categories')
        )
        return promotions

    except ValidationError:
        raise
    except Exception as e:
        raise ValidationError({"error": f"Error retrieving promotions: {str(e)}"})

def get_promotions_by_instructor(instructor_id):
    try:
        if not instructor_id:
            raise ValidationError({"error": "instructor_id is required"})

        try:
            Instructor.objects.get(id=instructor_id)
        except Instructor.DoesNotExist:
            raise ValidationError({"error": "Instructor not found"})

        promotions = (
            Promotion.objects
            .filter(instructor=instructor_id)
            .select_related('admin', 'instructor')
            .prefetch_related('applicable_courses', 'applicable_categories')
        )
        return promotions

    except ValidationError:
        raise
    except Exception as e:
        raise ValidationError({"error": f"Error retrieving promotions: {str(e)}"})

def delete_promotion(promotion_id):
    try:
        if not promotion_id:
            raise ValidationError({"error": "promotion_id is required"})

        promotion = Promotion.objects.get(id=promotion_id)
        promotion.delete()
        return {"message": "Promotion deleted successfully"}

    except Promotion.DoesNotExist:
        raise ValidationError({"error": "Promotion not found"})
    except ValidationError:
        raise
    except Exception as e:
        raise ValidationError({"error": f"Error deleting promotion: {str(e)}"})

def update_promotion(promotion_id, data):
    try:
        if not promotion_id:
            raise ValidationError({"error": "promotion_id is required"})

        promotion = Promotion.objects.get(id=promotion_id)

        if 'end_date' in data:
            from dateutil.parser import parse
            from django.utils import timezone
            from django.utils.timezone import make_aware
            end_date = parse(data['end_date'])
            if end_date.tzinfo is None:
                end_date = make_aware(end_date)
            if end_date < timezone.now():
                raise ValidationError({"error": "End date cannot be in the past."})

        serializer = PromotionSerializer(promotion, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return serializer.data

    except Promotion.DoesNotExist:
        raise ValidationError({"error": "Promotion not found."})
    except ValidationError:
        raise
    except Exception as e:
        raise ValidationError({"error": f"Error updating promotion: {str(e)}"})
