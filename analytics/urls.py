from django.urls import path
from .views import AnalyticsSummaryView, DepartmentStatsView

urlpatterns = [
    path('summary/', AnalyticsSummaryView.as_view(), name='analytics-summary'),
    path('department/<str:department>/', DepartmentStatsView.as_view(), name='department-stats'),
]
