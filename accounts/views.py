from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.authtoken.models import Token
from .models import User, StudentProfile
from .serializers import (
    UserSerializer, 
    UserRegistrationSerializer, 
    LoginSerializer,
    StudentProfileSerializer
)


class RegisterView(generics.CreateAPIView):
    """API endpoint for user registration."""
    
    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [AllowAny]
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Create auth token
        token, _ = Token.objects.get_or_create(user=user)
        
        return Response({
            'message': 'User registered successfully.',
            'user': UserSerializer(user).data,
            'token': token.key
        }, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    """API endpoint for user login."""
    
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        
        # Get or create auth token
        token, _ = Token.objects.get_or_create(user=user)
        
        return Response({
            'message': 'Login successful.',
            'user': UserSerializer(user).data,
            'token': token.key
        })


class LogoutView(APIView):
    """API endpoint for user logout."""
    
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        # Delete the user's token
        try:
            request.user.auth_token.delete()
        except:
            pass
        
        return Response({'message': 'Logout successful.'})


class ProfileView(generics.RetrieveUpdateAPIView):
    """API endpoint for viewing and updating user profile."""
    
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    
    def get_object(self):
        return self.request.user


class StudentProfileView(generics.RetrieveUpdateAPIView):
    """API endpoint for viewing and updating student profile."""
    
    serializer_class = StudentProfileSerializer
    permission_classes = [IsAuthenticated]
    
    def get_object(self):
        return self.request.user.student_profile


import csv
import io
from django.db import transaction
from .permissions import IsAdminOrHodOrPrincipal


class StudentBulkUploadView(APIView):
    """
    API endpoint for bulk student upload via CSV file.
    
    URL: POST /api/auth/students/upload/
    
    Allowed roles:
    - admin: Can import for any department
    - principal: Can import for any department
    - hod: Can only import for their own department
    
    CSV columns:
    email, first_name, last_name, department, roll_number, class_name, 
    section, year, parent_phone, address, residency_type
    
    For each row:
    - Creates or updates User with role="student"
    - Creates or updates corresponding StudentProfile
    """
    
    permission_classes = [IsAuthenticated, IsAdminOrHodOrPrincipal]
    
    # Required CSV columns
    REQUIRED_COLUMNS = ['email', 'first_name', 'last_name', 'department', 
                        'roll_number', 'class_name', 'section', 'year', 
                        'parent_phone', 'residency_type']
    
    # Valid residency types
    VALID_RESIDENCY_TYPES = ['DAY_SCHOLAR', 'HOSTELLER']
    
    def post(self, request):
        # Check if file is provided
        if 'file' not in request.FILES:
            return Response({
                'error': 'No file provided. Please upload a CSV file.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        uploaded_file = request.FILES['file']
        
        # Check file extension
        file_name = uploaded_file.name.lower()
        if not (file_name.endswith('.csv') or file_name.endswith('.txt')):
            return Response({
                'error': 'Invalid file format. Please upload a CSV file.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Read and decode CSV file
            decoded_file = uploaded_file.read().decode('utf-8')
            io_string = io.StringIO(decoded_file)
            reader = csv.DictReader(io_string)
            
            # Validate columns
            if reader.fieldnames is None:
                return Response({
                    'error': 'CSV file is empty or has no headers.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            missing_columns = set(self.REQUIRED_COLUMNS) - set(reader.fieldnames)
            if missing_columns:
                return Response({
                    'error': f'Missing required columns: {", ".join(missing_columns)}'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Get permission checker
            permission = IsAdminOrHodOrPrincipal()
            
            # Process rows
            results = {
                'created': [],
                'updated': [],
                'errors': []
            }
            
            rows = list(reader)
            if not rows:
                return Response({
                    'error': 'CSV file has no data rows.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            with transaction.atomic():
                for row_num, row in enumerate(rows, start=2):  # Start at 2 (row 1 is header)
                    try:
                        result = self._process_row(request.user, row, row_num, permission)
                        if result['status'] == 'created':
                            results['created'].append(result)
                        elif result['status'] == 'updated':
                            results['updated'].append(result)
                        elif result['status'] == 'error':
                            results['errors'].append(result)
                    except Exception as e:
                        results['errors'].append({
                            'row': row_num,
                            'email': row.get('email', 'unknown'),
                            'error': str(e)
                        })
            
            return Response({
                'message': f"Processed {len(rows)} rows.",
                'summary': {
                    'created': len(results['created']),
                    'updated': len(results['updated']),
                    'errors': len(results['errors'])
                },
                'details': results
            }, status=status.HTTP_200_OK if not results['errors'] else status.HTTP_207_MULTI_STATUS)
            
        except UnicodeDecodeError:
            return Response({
                'error': 'Could not decode file. Please ensure UTF-8 encoding.'
            }, status=status.HTTP_400_BAD_REQUEST)
        except csv.Error as e:
            return Response({
                'error': f'CSV parsing error: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({
                'error': f'Unexpected error: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _process_row(self, user, row, row_num, permission):
        """Process a single CSV row."""
        email = row.get('email', '').strip()
        department = row.get('department', '').strip()
        
        # Validate required fields
        if not email:
            return {'row': row_num, 'status': 'error', 'error': 'Email is required.'}
        
        if not department:
            return {'row': row_num, 'email': email, 'status': 'error', 'error': 'Department is required.'}
        
        # Check department permission
        allowed, error_msg = permission.can_manage_department(user, department)
        if not allowed:
            return {'row': row_num, 'email': email, 'status': 'error', 'error': error_msg}
        
        # Validate residency_type
        residency_type = row.get('residency_type', '').strip().upper()
        if residency_type not in self.VALID_RESIDENCY_TYPES:
            return {
                'row': row_num, 
                'email': email, 
                'status': 'error', 
                'error': f'Invalid residency_type. Must be one of: {", ".join(self.VALID_RESIDENCY_TYPES)}'
            }
        
        # Validate year
        try:
            year = int(row.get('year', 0))
            if year < 1 or year > 6:
                return {'row': row_num, 'email': email, 'status': 'error', 'error': 'Year must be between 1 and 6.'}
        except ValueError:
            return {'row': row_num, 'email': email, 'status': 'error', 'error': 'Year must be a valid integer.'}
        
        # Create or update User
        user_data = {
            'first_name': row.get('first_name', '').strip(),
            'last_name': row.get('last_name', '').strip(),
            'department': department,
            'role': 'student',
        }
        
        user_obj, user_created = User.objects.update_or_create(
            email=email,
            defaults=user_data
        )
        
        # Set default password for new users
        if user_created:
            user_obj.set_password('changeme123')  # Default password
            user_obj.save()
        
        # Create or update StudentProfile
        profile_data = {
            'roll_number': row.get('roll_number', '').strip(),
            'class_name': row.get('class_name', '').strip(),
            'section': row.get('section', '').strip(),
            'year': year,
            'parent_phone': row.get('parent_phone', '').strip(),
            'address': row.get('address', '').strip(),
            'residency_type': residency_type,
        }
        
        profile, profile_created = StudentProfile.objects.update_or_create(
            user=user_obj,
            defaults=profile_data
        )
        
        status_type = 'created' if user_created else 'updated'
        return {
            'row': row_num,
            'email': email,
            'roll_number': profile_data['roll_number'],
            'status': status_type
        }

