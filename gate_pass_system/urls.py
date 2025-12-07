"""
URL configuration for gate_pass_system project.
"""
from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('accounts.urls')),
    path('api/', include('gate_pass.urls')),
    path('api-auth/', include('rest_framework.urls')),
]
