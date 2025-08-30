ACTION_CHOICES = [
    ("login", "User Login"),
    ("logout", "User Logout"),
    ("register", "User Register"),
    ("update_profile", "Update Profile"),
    ("change_password", "Change Password"),
    ("enroll_course", "Enroll Course"),


    ("view_course", "View Course"),
    ("post_forum_topic", "Post Forum Topic"),
    ("reply_forum_topic", "Reply Forum Topic"),
    ("post_forum_comment", "Post Forum Comment"),
    ("reply_forum_comment", "Reply Forum Comment"),
    ("make_payment", "Make Payment"),
    ("apply_promotion", "Apply Promotion"),
    ("admin_delete_course", "Admin Delete Course"),
]
ACTION_CHOICES = [

    # --- Auth & Account ---
    "LOGIN",
    "LOGOUT",
    "FAILED_LOGIN",
    "REGISTER",
    "EMAIL_VERIFIED",
    "PASSWORD_CHANGED",
    "PROFILE_UPDATED",

    # --- CRUD Operations ---
    "CREATE",
    "UPDATE",
    "DELETE",

    # --- Payment & Refund ---
    "PAYMENT_INITIATED",
    "PAYMENT_SUCCESS",
    "PAYMENT_FAILED",
    "REFUND_REQUESTED",
    "REFUND_APPROVED",
    "REFUND_REJECTED",

    # --- Course & Learning Progress ---
    "ENROLL",
    "VIEW_LESSON",

    # --- User Interactions ---
    "COMMENT",
    "REPLY",
    "LIKE_COMMENT",
    "DISLIKE_COMMENT",
    "REPORT_COMMENT",

    # --- Admin & System ---
    "COURSE_APPROVED",
    "COURSE_REJECTED",
    "USER_BANNED",
    "USER_UNBANNED",
    "EMAIL_SENT",
    "SYSTEM_CONFIGURED",
]
