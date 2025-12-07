from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User, StudentProfile, ClassAssignment, DEPARTMENT_CHOICES


class StudentProfileSerializer(serializers.ModelSerializer):
    """Serializer for StudentProfile model."""
    
    class Meta:
        model = StudentProfile
        fields = ['id', 'roll_number', 'class_name', 'section', 'year', 
                  'residency_type', 'parent_phone', 'parent_email', 'address', 
                  'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model."""
    
    student_profile = StudentProfileSerializer(read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'role', 
                  'department', 'phone', 'is_active', 'student_profile',
                  'created_at', 'updated_at']
        read_only_fields = ['id', 'is_active', 'created_at', 'updated_at']


class StudentRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for student registration."""
    
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)
    
    # Student profile fields
    roll_number = serializers.CharField(required=True)
    class_name = serializers.CharField(required=True)
    section = serializers.CharField(required=True)
    year = serializers.IntegerField(required=True, min_value=1, max_value=6)
    residency_type = serializers.ChoiceField(
        choices=[('DAY_SCHOLAR', 'Day Scholar'), ('HOSTELLER', 'Hosteller')],
        required=True
    )
    parent_phone = serializers.CharField(required=True)
    parent_email = serializers.EmailField(required=False, allow_blank=True)
    address = serializers.CharField(required=False, allow_blank=True)
    department = serializers.ChoiceField(choices=DEPARTMENT_CHOICES, required=True)
    
    class Meta:
        model = User
        fields = ['email', 'password', 'password_confirm', 'first_name', 
                  'last_name', 'department', 'phone',
                  'roll_number', 'class_name', 'section', 'year', 
                  'residency_type', 'parent_phone', 'parent_email', 'address']
    
    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError(
                "This email is already registered. Please log in instead."
            )
        return value
    
    def validate_roll_number(self, value):
        if StudentProfile.objects.filter(roll_number=value).exists():
            raise serializers.ValidationError(
                "This roll number is already registered."
            )
        return value
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password": "Passwords don't match."})
        return attrs
    
    def create(self, validated_data):
        student_data = {
            'roll_number': validated_data.pop('roll_number'),
            'class_name': validated_data.pop('class_name'),
            'section': validated_data.pop('section'),
            'year': validated_data.pop('year'),
            'residency_type': validated_data.pop('residency_type'),
            'parent_phone': validated_data.pop('parent_phone'),
            'parent_email': validated_data.pop('parent_email', ''),
            'address': validated_data.pop('address', ''),
        }
        validated_data.pop('password_confirm')
        
        # Create user with role=student
        user = User.objects.create_user(role='student', **validated_data)
        
        # Create student profile
        StudentProfile.objects.create(user=user, **student_data)
        
        return user


class StaffRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for staff registration (HOD, Principal, Class Incharge, Faculty)."""
    
    STAFF_ROLE_CHOICES = [
        ('faculty', 'Faculty'),
        ('class_incharge', 'Class Incharge'),
        ('hod', 'Head of Department'),
        ('principal', 'Principal'),
    ]
    
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)
    staff_role = serializers.ChoiceField(choices=STAFF_ROLE_CHOICES, required=True)
    department = serializers.ChoiceField(choices=DEPARTMENT_CHOICES, required=False, allow_blank=True)
    
    class Meta:
        model = User
        fields = ['email', 'password', 'password_confirm', 'first_name', 
                  'last_name', 'staff_role', 'department', 'phone']
    
    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError(
                "This email is already registered. Please log in instead."
            )
        return value
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password": "Passwords don't match."})
        
        # Principal doesn't need department (manages all)
        if attrs.get('staff_role') == 'principal':
            attrs['department'] = ''
        elif not attrs.get('department'):
            # Non-principal staff must have a department
            raise serializers.ValidationError({"department": "Department is required."})
        
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        role = validated_data.pop('staff_role')
        
        user = User.objects.create_user(role=role, **validated_data)
        return user


class SecurityRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for security registration."""
    
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)
    gate_location = serializers.CharField(required=False, allow_blank=True)
    
    class Meta:
        model = User
        fields = ['email', 'password', 'password_confirm', 'first_name', 
                  'last_name', 'phone', 'gate_location']
    
    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError(
                "This email is already registered. Please log in instead."
            )
        return value
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password": "Passwords don't match."})
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        validated_data.pop('gate_location', None)  # Store in notes or separate field if needed
        
        user = User.objects.create_user(role='security', **validated_data)
        return user


# Keep the old generic registration serializer for backward compatibility
class UserRegistrationSerializer(serializers.ModelSerializer):
    """Generic serializer for user registration (backward compatible)."""
    
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)
    
    # Student profile fields (optional, only for students)
    roll_number = serializers.CharField(required=False)
    class_name = serializers.CharField(required=False)
    section = serializers.CharField(required=False)
    year = serializers.IntegerField(required=False)
    residency_type = serializers.ChoiceField(
        choices=[('DAY_SCHOLAR', 'Day Scholar'), ('HOSTELLER', 'Hosteller')],
        required=False
    )
    parent_phone = serializers.CharField(required=False)
    address = serializers.CharField(required=False, allow_blank=True)
    
    class Meta:
        model = User
        fields = ['email', 'password', 'password_confirm', 'first_name', 
                  'last_name', 'role', 'department', 'phone',
                  'roll_number', 'class_name', 'section', 'year', 
                  'residency_type', 'parent_phone', 'address']
    
    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError(
                "This email is already registered. Please log in instead."
            )
        return value
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password": "Passwords don't match."})
        
        # Validate student profile fields if role is student
        if attrs.get('role') == 'student':
            required_fields = ['roll_number', 'class_name', 'section', 'year', 'residency_type', 'parent_phone']
            for field in required_fields:
                if not attrs.get(field):
                    raise serializers.ValidationError({field: f"{field} is required for students."})
        
        return attrs
    
    def create(self, validated_data):
        student_data = {
            'roll_number': validated_data.pop('roll_number', None),
            'class_name': validated_data.pop('class_name', None),
            'section': validated_data.pop('section', None),
            'year': validated_data.pop('year', None),
            'residency_type': validated_data.pop('residency_type', None),
            'parent_phone': validated_data.pop('parent_phone', None),
            'address': validated_data.pop('address', ''),
        }
        validated_data.pop('password_confirm')
        
        # Create user
        user = User.objects.create_user(**validated_data)
        
        # Create student profile if user is a student
        if user.role == 'student':
            StudentProfile.objects.create(user=user, **student_data)
        
        return user


class LoginSerializer(serializers.Serializer):
    """Serializer for user login."""
    
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    
    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')
        
        if email and password:
            user = authenticate(request=self.context.get('request'),
                                username=email, password=password)
            if not user:
                raise serializers.ValidationError("Invalid email or password.")
            if not user.is_active:
                raise serializers.ValidationError("User account is disabled.")
        else:
            raise serializers.ValidationError("Both email and password are required.")
        
        attrs['user'] = user
        return attrs


class UserMinimalSerializer(serializers.ModelSerializer):
    """Minimal user serializer for embedding in other responses."""
    
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'role', 'department']


class ClassAssignmentSerializer(serializers.ModelSerializer):
    """Serializer for ClassAssignment model."""
    
    incharge_name = serializers.CharField(source='incharge.full_name', read_only=True)
    incharge_email = serializers.CharField(source='incharge.email', read_only=True)
    
    class Meta:
        model = ClassAssignment
        fields = ['id', 'incharge', 'incharge_name', 'incharge_email', 
                  'department', 'year', 'section', 'semester', 
                  'academic_year', 'active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_incharge(self, value):
        if value.role not in ['class_incharge', 'faculty']:
            raise serializers.ValidationError(
                "Only faculty or class in-charge can be assigned."
            )
        return value


class UserListSerializer(serializers.ModelSerializer):
    """Serializer for listing users (admin view)."""
    
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'role', 
                  'department', 'phone', 'is_active', 'created_at']
