from django.urls import path
from .views import (
    AttendanceUploadView,
    AttendanceStatusView,
    AttendanceRecordListView,
    AttendanceRecordDetailView
)

urlpatterns = [
    path('upload/', AttendanceUploadView.as_view(), name='attendance-upload'),
    path('status/', AttendanceStatusView.as_view(), name='attendance-status'),
    path('records/', AttendanceRecordListView.as_view(), name='attendance-records'),
    path('records/<int:pk>/', AttendanceRecordDetailView.as_view(), name='attendance-detail'),
]
