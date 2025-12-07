from django.urls import path
from .views import (
    GatePassCreateView,
    GatePassListView,
    GatePassDetailView,
    GatePassApproveView,
    GatePassRejectView,
    GatePassMarkOutView,
    GatePassMarkInView,
    GatePassScanView,
    PendingApprovalsView
)

urlpatterns = [
    # Gate pass CRUD
    path('gate-pass/', GatePassCreateView.as_view(), name='gate-pass-create'),
    path('gate-pass/list/', GatePassListView.as_view(), name='gate-pass-list'),
    path('gate-pass/<int:pk>/', GatePassDetailView.as_view(), name='gate-pass-detail'),
    
    # Approval endpoints
    path('gate-pass/<int:pk>/approve/', GatePassApproveView.as_view(), name='gate-pass-approve'),
    path('gate-pass/<int:pk>/reject/', GatePassRejectView.as_view(), name='gate-pass-reject'),
    path('gate-pass/pending/', PendingApprovalsView.as_view(), name='gate-pass-pending'),
    
    # Security endpoints
    path('gate-pass/<int:pk>/mark-out/', GatePassMarkOutView.as_view(), name='gate-pass-mark-out'),
    path('gate-pass/<int:pk>/mark-in/', GatePassMarkInView.as_view(), name='gate-pass-mark-in'),
    path('gate-pass/scan/', GatePassScanView.as_view(), name='gate-pass-scan'),
]
