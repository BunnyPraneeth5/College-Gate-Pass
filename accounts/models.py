from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models


# Fixed department choices
DEPARTMENT_CHOICES = [
    ('CSE', 'Computer Science & Engineering'),
    ('CAI', 'Computer Science & AI'),
    ('CSD', 'Computer Science & Data Science'),
    ('EEE', 'Electrical & Electronics Engineering'),
    ('ECE', 'Electronics & Communication Engineering'),
    ('MEC', 'Mechanical Engineering'),
    ('CIV', 'Civil Engineering'),
    ('H&S', 'Humanities & Sciences'),
]


class UserManager(BaseUserManager):
    """Custom user manager for email-based authentication."""
    
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'admin')
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
        
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """Custom User model with role-based access."""
    
    ROLE_CHOICES = [
        ('student', 'Student'),
        ('faculty', 'Faculty'),
        ('class_incharge', 'Class Incharge'),
        ('hod', 'Head of Department'),
        ('principal', 'Principal'),
        ('security', 'Security'),
        ('admin', 'Admin'),
    ]
    
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='student')
    department = models.CharField(max_length=10, choices=DEPARTMENT_CHOICES, blank=True)
    phone = models.CharField(max_length=15, blank=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    objects = UserManager()
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']
    
    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.role})"
    
    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"
    
    def is_student(self):
        return self.role == 'student'
    
    def is_approver(self):
        """Check if user can approve gate passes."""
        return self.role in ['hod', 'principal', 'class_incharge', 'faculty']
    
    def is_security(self):
        return self.role == 'security'
    
    def can_approve_regular_pass(self):
        """Only HOD and Principal can approve regular passes."""
        return self.role in ['hod', 'principal']
    
    def can_approve_emergency_pass(self):
        """HOD, Principal, and Class Incharge can approve emergency passes."""
        return self.role in ['hod', 'principal', 'class_incharge']


class StudentProfile(models.Model):
    """Extended profile for students."""
    
    RESIDENCY_CHOICES = [
        ('DAY_SCHOLAR', 'Day Scholar'),
        ('HOSTELLER', 'Hosteller'),
    ]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='student_profile')
    roll_number = models.CharField(max_length=20, unique=True)
    class_name = models.CharField(max_length=50)  # e.g., "B.Tech CSE"
    section = models.CharField(max_length=10)  # e.g., "A", "B"
    year = models.IntegerField()  # 1, 2, 3, 4
    residency_type = models.CharField(max_length=15, choices=RESIDENCY_CHOICES, default='DAY_SCHOLAR')
    parent_phone = models.CharField(max_length=15)
    parent_email = models.EmailField(blank=True)  # For notifications
    address = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.user.full_name} - {self.roll_number}"
    
    class Meta:
        verbose_name = 'Student Profile'
        verbose_name_plural = 'Student Profiles'


class ClassAssignment(models.Model):
    """Model for assigning class in-charges to specific classes per semester."""
    
    incharge = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='class_assignments',
        limit_choices_to={'role__in': ['class_incharge', 'faculty']}
    )
    department = models.CharField(max_length=10, choices=DEPARTMENT_CHOICES)
    year = models.IntegerField()  # 1, 2, 3, 4
    section = models.CharField(max_length=10)  # A, B, C
    semester = models.IntegerField()  # 1-8
    academic_year = models.CharField(max_length=10)  # e.g., "2024-25"
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Class Assignment'
        verbose_name_plural = 'Class Assignments'
        unique_together = ['department', 'year', 'section', 'semester', 'academic_year']
    
    def __str__(self):
        return f"{self.department} Year-{self.year} Sec-{self.section} Sem-{self.semester} - {self.incharge.full_name}"
