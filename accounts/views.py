from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.authtoken.models import Token
from django.db import transaction
import csv
import io

from .models import User, StudentProfile, ClassAssignment, DEPARTMENT_CHOICES
from .serializers import (
    UserSerializer, 
    UserRegistrationSerializer,
    StudentRegistrationSerializer,
    StaffRegistrationSerializer,
    SecurityRegistrationSerializer,
    LoginSerializer,
    StudentProfileSerializer,
    ClassAssignmentSerializer,
    UserListSerializer
)
from .permissions import IsAdminOrHodOrPrincipal


class RegisterView(generics.CreateAPIView):
    """API endpoint for generic user registration (backward compatible)."""
    
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


class StudentRegisterView(generics.CreateAPIView):
    """API endpoint for student registration."""
    
    serializer_class = StudentRegistrationSerializer
    permission_classes = [AllowAny]
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        token, _ = Token.objects.get_or_create(user=user)
        
        return Response({
            'message': 'Student registered successfully.',
            'user': UserSerializer(user).data,
            'token': token.key
        }, status=status.HTTP_201_CREATED)


class StaffRegisterView(generics.CreateAPIView):
    """API endpoint for staff registration (HOD, Principal, Class Incharge, Faculty)."""
    
    serializer_class = StaffRegistrationSerializer
    permission_classes = [AllowAny]
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        token, _ = Token.objects.get_or_create(user=user)
        
        return Response({
            'message': 'Staff registered successfully.',
            'user': UserSerializer(user).data,
            'token': token.key
        }, status=status.HTTP_201_CREATED)


class SecurityRegisterView(generics.CreateAPIView):
    """API endpoint for security registration."""
    
    serializer_class = SecurityRegistrationSerializer
    permission_classes = [AllowAny]
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        token, _ = Token.objects.get_or_create(user=user)
        
        return Response({
            'message': 'Security registered successfully.',
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


# ==================== Class Assignment Views ====================

class ClassAssignmentListCreateView(generics.ListCreateAPIView):
    """List and create class assignments."""
    
    serializer_class = ClassAssignmentSerializer
    permission_classes = [IsAuthenticated, IsAdminOrHodOrPrincipal]
    
    def get_queryset(self):
        user = self.request.user
        queryset = ClassAssignment.objects.select_related('incharge').all()
        
        # HOD can only see their department assignments
        if user.role == 'hod' and user.department:
            queryset = queryset.filter(department=user.department)
        
        # Filter by query params
        department = self.request.query_params.get('department')
        if department:
            queryset = queryset.filter(department=department)
        
        year = self.request.query_params.get('year')
        if year:
            queryset = queryset.filter(year=year)
        
        semester = self.request.query_params.get('semester')
        if semester:
            queryset = queryset.filter(semester=semester)
        
        active_only = self.request.query_params.get('active')
        if active_only == 'true':
            queryset = queryset.filter(active=True)
        
        return queryset.order_by('department', 'year', 'section', 'semester')
    
    def perform_create(self, serializer):
        user = self.request.user
        
        # HOD can only create for their department
        if user.role == 'hod':
            if serializer.validated_data.get('department') != user.department:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("You can only create assignments for your department.")
        
        serializer.save()


class ClassAssignmentDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, or delete a class assignment."""
    
    serializer_class = ClassAssignmentSerializer
    permission_classes = [IsAuthenticated, IsAdminOrHodOrPrincipal]
    
    def get_queryset(self):
        user = self.request.user
        queryset = ClassAssignment.objects.select_related('incharge').all()
        
        # HOD can only manage their department
        if user.role == 'hod' and user.department:
            queryset = queryset.filter(department=user.department)
        
        return queryset
    
    def perform_update(self, serializer):
        user = self.request.user
        
        # HOD can only update for their department
        if user.role == 'hod':
            if serializer.validated_data.get('department') != user.department:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("You can only update assignments for your department.")
        
        serializer.save()


# ==================== Bulk Upload View ====================

class StudentBulkUploadView(APIView):
    """
    API endpoint for bulk student upload via CSV file.
    
    URL: POST /api/auth/students/upload/
    
    Allowed roles: admin, principal, hod
    """
    
    permission_classes = [IsAuthenticated, IsAdminOrHodOrPrincipal]
    
    REQUIRED_COLUMNS = ['email', 'first_name', 'last_name', 'department', 
                        'roll_number', 'class_name', 'section', 'year', 
                        'parent_phone', 'residency_type']
    
    VALID_RESIDENCY_TYPES = ['DAY_SCHOLAR', 'HOSTELLER']
    VALID_DEPARTMENTS = [d[0] for d in DEPARTMENT_CHOICES]
    
    def post(self, request):
        if 'file' not in request.FILES:
            return Response({
                'error': 'No file provided. Please upload a CSV file.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        uploaded_file = request.FILES['file']
        file_name = uploaded_file.name.lower()
        
        if not (file_name.endswith('.csv') or file_name.endswith('.txt')):
            return Response({
                'error': 'Invalid file format. Please upload a CSV file.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            decoded_file = uploaded_file.read().decode('utf-8')
            io_string = io.StringIO(decoded_file)
            reader = csv.DictReader(io_string)
            
            if reader.fieldnames is None:
                return Response({
                    'error': 'CSV file is empty or has no headers.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            missing_columns = set(self.REQUIRED_COLUMNS) - set(reader.fieldnames)
            if missing_columns:
                return Response({
                    'error': f'Missing required columns: {", ".join(missing_columns)}'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            permission = IsAdminOrHodOrPrincipal()
            results = {'created': [], 'updated': [], 'errors': []}
            rows = list(reader)
            
            if not rows:
                return Response({
                    'error': 'CSV file has no data rows.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            with transaction.atomic():
                for row_num, row in enumerate(rows, start=2):
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
    
    def _process_row(self, user, row, row_num, permission):
        email = row.get('email', '').strip()
        department = row.get('department', '').strip().upper()
        
        if not email:
            return {'row': row_num, 'status': 'error', 'error': 'Email is required.'}
        
        if not department:
            return {'row': row_num, 'email': email, 'status': 'error', 'error': 'Department is required.'}
        
        if department not in self.VALID_DEPARTMENTS:
            return {'row': row_num, 'email': email, 'status': 'error', 
                    'error': f'Invalid department. Must be one of: {", ".join(self.VALID_DEPARTMENTS)}'}
        
        allowed, error_msg = permission.can_manage_department(user, department)
        if not allowed:
            return {'row': row_num, 'email': email, 'status': 'error', 'error': error_msg}
        
        residency_type = row.get('residency_type', '').strip().upper()
        if residency_type not in self.VALID_RESIDENCY_TYPES:
            return {'row': row_num, 'email': email, 'status': 'error', 
                    'error': f'Invalid residency_type. Must be one of: {", ".join(self.VALID_RESIDENCY_TYPES)}'}
        
        try:
            year = int(row.get('year', 0))
            if year < 1 or year > 6:
                return {'row': row_num, 'email': email, 'status': 'error', 'error': 'Year must be between 1 and 6.'}
        except ValueError:
            return {'row': row_num, 'email': email, 'status': 'error', 'error': 'Year must be a valid integer.'}
        
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
        
        if user_created:
            user_obj.set_password('changeme123')
            user_obj.save()
        
        profile_data = {
            'roll_number': row.get('roll_number', '').strip(),
            'class_name': row.get('class_name', '').strip(),
            'section': row.get('section', '').strip(),
            'year': year,
            'parent_phone': row.get('parent_phone', '').strip(),
            'address': row.get('address', '').strip(),
            'residency_type': residency_type,
        }
        
        StudentProfile.objects.update_or_create(
            user=user_obj,
            defaults=profile_data
        )
        
        return {
            'row': row_num,
            'email': email,
            'roll_number': profile_data['roll_number'],
            'status': 'created' if user_created else 'updated'
        }


# ==================== Bulk Upload All Users View ====================

class BulkUploadUsersView(APIView):
    """
    API endpoint for bulk upload of any user type via CSV.
    
    URL: POST /api/bulk-upload/users/
    
    Allowed roles: admin, principal, hod
    
    CSV must have column 'user_type': student, staff, security
    For staff: also need 'staff_role': faculty, class_incharge, hod, principal
    """
    
    permission_classes = [IsAuthenticated, IsAdminOrHodOrPrincipal]
    
    VALID_USER_TYPES = ['student', 'staff', 'security']
    VALID_STAFF_ROLES = ['faculty', 'class_incharge', 'hod', 'principal']
    VALID_DEPARTMENTS = [d[0] for d in DEPARTMENT_CHOICES]
    VALID_RESIDENCY_TYPES = ['DAY_SCHOLAR', 'HOSTELLER']
    
    def post(self, request):
        if 'file' not in request.FILES:
            return Response({
                'error': 'No file provided.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        uploaded_file = request.FILES['file']
        file_name = uploaded_file.name.lower()
        
        if not (file_name.endswith('.csv') or file_name.endswith('.txt')):
            return Response({
                'error': 'Invalid file format. Please upload a CSV file.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            decoded_file = uploaded_file.read().decode('utf-8')
            io_string = io.StringIO(decoded_file)
            reader = csv.DictReader(io_string)
            
            if not reader.fieldnames or 'user_type' not in reader.fieldnames:
                return Response({
                    'error': 'CSV must have user_type column.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            permission = IsAdminOrHodOrPrincipal()
            results = {'created': [], 'updated': [], 'errors': []}
            rows = list(reader)
            
            with transaction.atomic():
                for row_num, row in enumerate(rows, start=2):
                    try:
                        result = self._process_row(request.user, row, row_num, permission)
                        results[result['status']].append(result) if result['status'] != 'error' else results['errors'].append(result)
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
            
        except Exception as e:
            return Response({
                'error': f'Error: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)
    
    def _process_row(self, user, row, row_num, permission):
        email = row.get('email', '').strip()
        user_type = row.get('user_type', '').strip().lower()
        department = row.get('department', '').strip().upper()
        
        if not email:
            return {'row': row_num, 'status': 'error', 'error': 'Email is required.'}
        
        if user_type not in self.VALID_USER_TYPES:
            return {'row': row_num, 'email': email, 'status': 'error', 
                    'error': f'Invalid user_type. Must be one of: {", ".join(self.VALID_USER_TYPES)}'}
        
        # Check department for students and staff
        if user_type in ['student', 'staff'] and department:
            if department not in self.VALID_DEPARTMENTS:
                return {'row': row_num, 'email': email, 'status': 'error', 
                        'error': f'Invalid department. Must be one of: {", ".join(self.VALID_DEPARTMENTS)}'}
            
            allowed, error_msg = permission.can_manage_department(user, department)
            if not allowed:
                return {'row': row_num, 'email': email, 'status': 'error', 'error': error_msg}
        
        if user_type == 'student':
            return self._create_student(email, row, row_num, department)
        elif user_type == 'staff':
            return self._create_staff(email, row, row_num, department)
        else:  # security
            return self._create_security(email, row, row_num)
    
    def _create_student(self, email, row, row_num, department):
        residency_type = row.get('residency_type', '').strip().upper()
        if residency_type not in self.VALID_RESIDENCY_TYPES:
            residency_type = 'DAY_SCHOLAR'
        
        try:
            year = int(row.get('year', 1))
        except ValueError:
            year = 1
        
        user_data = {
            'first_name': row.get('first_name', '').strip(),
            'last_name': row.get('last_name', '').strip(),
            'department': department,
            'role': 'student',
        }
        
        user_obj, created = User.objects.update_or_create(email=email, defaults=user_data)
        if created:
            user_obj.set_password('changeme123')
            user_obj.save()
        
        StudentProfile.objects.update_or_create(
            user=user_obj,
            defaults={
                'roll_number': row.get('roll_number', '').strip() or f"AUTO-{user_obj.id}",
                'class_name': row.get('class_name', '').strip(),
                'section': row.get('section', '').strip(),
                'year': year,
                'parent_phone': row.get('parent_phone', '').strip(),
                'address': row.get('address', '').strip(),
                'residency_type': residency_type,
            }
        )
        
        return {'row': row_num, 'email': email, 'status': 'created' if created else 'updated'}
    
    def _create_staff(self, email, row, row_num, department):
        staff_role = row.get('staff_role', '').strip().lower()
        if staff_role not in self.VALID_STAFF_ROLES:
            staff_role = 'faculty'
        
        user_data = {
            'first_name': row.get('first_name', '').strip(),
            'last_name': row.get('last_name', '').strip(),
            'department': '' if staff_role == 'principal' else department,
            'role': staff_role,
        }
        
        user_obj, created = User.objects.update_or_create(email=email, defaults=user_data)
        if created:
            user_obj.set_password('changeme123')
            user_obj.save()
        
        return {'row': row_num, 'email': email, 'status': 'created' if created else 'updated'}
    
    def _create_security(self, email, row, row_num):
        user_data = {
            'first_name': row.get('first_name', '').strip(),
            'last_name': row.get('last_name', '').strip(),
            'role': 'security',
        }
        
        user_obj, created = User.objects.update_or_create(email=email, defaults=user_data)
        if created:
            user_obj.set_password('changeme123')
            user_obj.save()
        
        return {'row': row_num, 'email': email, 'status': 'created' if created else 'updated'}


# ==================== User Management (Admin) ====================

class UserListView(generics.ListAPIView):
    """List all users (admin only)."""
    
    serializer_class = UserListSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        
        if user.role not in ['admin', 'principal', 'hod']:
            return User.objects.none()
        
        queryset = User.objects.all()
        
        # HOD can only see their department
        if user.role == 'hod' and user.department:
            queryset = queryset.filter(department=user.department)
        
        # Filter by query params
        role = self.request.query_params.get('role')
        if role:
            queryset = queryset.filter(role=role)
        
        department = self.request.query_params.get('department')
        if department:
            queryset = queryset.filter(department=department)
        
        search = self.request.query_params.get('search')
        if search:
            from django.db.models import Q
            queryset = queryset.filter(
                Q(email__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search)
            )
        
        return queryset.order_by('-created_at')


class DepartmentListView(APIView):
    """Get list of valid departments."""
    
    permission_classes = [AllowAny]
    
    def get(self, request):
        return Response({
            'departments': [
                {'code': code, 'name': name} 
                for code, name in DEPARTMENT_CHOICES
            ]
        })
