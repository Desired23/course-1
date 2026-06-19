from .models import Enrollment


OWNED_ENROLLMENT_STATUSES = (
    Enrollment.Status.Active,
    Enrollment.Status.Complete,
    Enrollment.Status.SUSPENDED,
)
