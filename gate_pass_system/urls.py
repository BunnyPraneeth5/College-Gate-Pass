"""
URL configuration for gate_pass_system project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # API endpoints
    path('api/', include('accounts.urls')),
    path('api/', include('gate_pass.urls')),
    path('api/attendance/', include('attendance.urls')),
    path('api/analytics/', include('analytics.urls')),
    
    # DRF browsable API login
    path('api-auth/', include('rest_framework.urls')),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
