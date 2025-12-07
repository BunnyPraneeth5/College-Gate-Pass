from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User, StudentProfile


class StudentProfileSerializer(serializers.ModelSerializer):
    """Serializer for StudentProfile model."""
    
    class Meta:
        model = StudentProfile
        fields = ['id', 'roll_number', 'class_name', 'section', 'year', 
                  'residency_type', 'parent_phone', 'address', 'created_at', 'updated_at']
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


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for user registration."""
    
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
