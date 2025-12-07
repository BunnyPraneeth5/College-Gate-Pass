from django.urls import path
from .views import (
    RegisterView,
    StudentRegisterView,
    StaffRegisterView,
    SecurityRegisterView,
    LoginView, 
    LogoutView, 
    ProfileView,
    StudentProfileView,
    StudentBulkUploadView,
    BulkUploadUsersView,
    ClassAssignmentListCreateView,
    ClassAssignmentDetailView,
    UserListView,
    DepartmentListView
)

urlpatterns = [
    # Authentication
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/logout/', LogoutView.as_view(), name='logout'),
    path('auth/profile/', ProfileView.as_view(), name='profile'),
    path('auth/student-profile/', StudentProfileView.as_view(), name='student-profile'),
    
    # Registration endpoints
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/register/student/', StudentRegisterView.as_view(), name='register-student'),
    path('auth/register/staff/', StaffRegisterView.as_view(), name='register-staff'),
    path('auth/register/security/', SecurityRegisterView.as_view(), name='register-security'),
    
    # Bulk upload
    path('auth/students/upload/', StudentBulkUploadView.as_view(), name='student-bulk-upload'),
    path('bulk-upload/users/', BulkUploadUsersView.as_view(), name='bulk-upload-users'),
    
    # Class assignments
    path('class-assignments/', ClassAssignmentListCreateView.as_view(), name='class-assignments'),
    path('class-assignments/<int:pk>/', ClassAssignmentDetailView.as_view(), name='class-assignment-detail'),
    
    # User management
    path('users/', UserListView.as_view(), name='user-list'),
    
    # Departments
    path('departments/', DepartmentListView.as_view(), name='department-list'),
]
