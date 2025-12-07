from django.urls import path
from .views import (
    RegisterView, 
    LoginView, 
    LogoutView, 
    ProfileView,
    StudentProfileView,
    StudentBulkUploadView
)

urlpatterns = [
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/logout/', LogoutView.as_view(), name='logout'),
    path('auth/profile/', ProfileView.as_view(), name='profile'),
    path('auth/student-profile/', StudentProfileView.as_view(), name='student-profile'),
    path('auth/students/upload/', StudentBulkUploadView.as_view(), name='student-bulk-upload'),
]

