from rest_framework import generics, status, views
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.utils import timezone
from .models import GatePass, GateLog
from .serializers import (
    GatePassCreateSerializer,
    GatePassListSerializer,
    GatePassDetailSerializer,
    GatePassApprovalSerializer,
    SecurityScanSerializer,
    GateLogSerializer
)
from .permissions import (
    CanCreateGatePass,
    CanApproveGatePass,
    CanMarkEntryExit,
    CanViewGatePass
)


class GatePassCreateView(generics.CreateAPIView):
    """API endpoint for students to create gate pass requests."""
    
    serializer_class = GatePassCreateSerializer
    permission_classes = [IsAuthenticated, CanCreateGatePass]
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        gate_pass = serializer.save()
        
        return Response({
            'message': 'Gate pass request created successfully.',
            'gate_pass': GatePassDetailSerializer(gate_pass).data
        }, status=status.HTTP_201_CREATED)


class GatePassListView(generics.ListAPIView):
    """
    API endpoint to list gate passes.
    
    Results are filtered based on user role:
    - student: Only their own GatePass records
    - faculty, class_incharge, hod: Passes of students in their department
    - principal, admin: All passes
    - security: Only passes with status == 'approved' (for gate verification)
    """
    
    serializer_class = GatePassListSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        queryset = GatePass.objects.select_related('student', 'approved_by')
        
        # Role-based filtering
        if user.role == 'student':
            queryset = queryset.filter(student=user)
        
        elif user.role in ['faculty', 'class_incharge', 'hod']:
            if user.department:
                queryset = queryset.filter(student__department=user.department)
            else:
                queryset = queryset.none()
        
        elif user.role in ['principal', 'admin']:
            pass  # No filtering needed
        
        elif user.role == 'security':
            queryset = queryset.filter(status='approved')
        
        else:
            queryset = queryset.none()
        
        # Additional filters from query params
        status_filter = self.request.query_params.get('status', None)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        pass_type = self.request.query_params.get('pass_type', None)
        if pass_type:
            queryset = queryset.filter(pass_type=pass_type)
        
        date_from = self.request.query_params.get('date_from', None)
        if date_from:
            queryset = queryset.filter(out_datetime__date__gte=date_from)
        
        date_to = self.request.query_params.get('date_to', None)
        if date_to:
            queryset = queryset.filter(out_datetime__date__lte=date_to)
        
        return queryset


class GatePassDetailView(generics.RetrieveAPIView):
    """API endpoint to view gate pass details."""
    
    serializer_class = GatePassDetailSerializer
    permission_classes = [IsAuthenticated, CanViewGatePass]
    queryset = GatePass.objects.all()


class GatePassApproveView(views.APIView):
    """API endpoint to approve a gate pass."""
    
    permission_classes = [IsAuthenticated, CanApproveGatePass]
    
    def post(self, request, pk):
        gate_pass = get_object_or_404(GatePass, pk=pk)
        
        # Check object-level permission
        self.check_object_permissions(request, gate_pass)
        
        # Validate the gate pass can be approved
        if gate_pass.status != 'pending':
            return Response({
                'error': f'Gate pass is already {gate_pass.status}.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = GatePassApprovalSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Approve the gate pass
        gate_pass.status = 'approved'
        gate_pass.approved_by = request.user
        gate_pass.approver_comment = serializer.validated_data.get('comment', '')
        gate_pass.save()
        
        return Response({
            'message': 'Gate pass approved successfully.',
            'gate_pass': GatePassDetailSerializer(gate_pass).data
        })


class GatePassRejectView(views.APIView):
    """API endpoint to reject a gate pass."""
    
    permission_classes = [IsAuthenticated, CanApproveGatePass]
    
    def post(self, request, pk):
        gate_pass = get_object_or_404(GatePass, pk=pk)
        
        # Check object-level permission
        self.check_object_permissions(request, gate_pass)
        
        # Validate the gate pass can be rejected
        if gate_pass.status != 'pending':
            return Response({
                'error': f'Gate pass is already {gate_pass.status}.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = GatePassApprovalSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Reject the gate pass
        gate_pass.status = 'rejected'
        gate_pass.approved_by = request.user
        gate_pass.approver_comment = serializer.validated_data.get('comment', '')
        gate_pass.save()
        
        return Response({
            'message': 'Gate pass rejected.',
            'gate_pass': GatePassDetailSerializer(gate_pass).data
        })


class GatePassMarkOutView(views.APIView):
    """API endpoint for security to mark student exit."""
    
    permission_classes = [IsAuthenticated, CanMarkEntryExit]
    
    def post(self, request, pk):
        gate_pass = get_object_or_404(GatePass, pk=pk)
        
        # Validate gate pass status
        if gate_pass.status != 'approved':
            return Response({
                'error': 'Gate pass is not approved.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if already marked out
        existing_out = gate_pass.logs.filter(action='OUT').exists()
        if existing_out:
            return Response({
                'error': 'Student has already exited.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate gate pass is within valid time window
        now = timezone.now()
        if now < gate_pass.out_datetime:
            return Response({
                'error': 'Gate pass is not yet valid. Valid from: ' + 
                         gate_pass.out_datetime.strftime('%Y-%m-%d %H:%M')
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if now > gate_pass.in_datetime:
            gate_pass.status = 'expired'
            gate_pass.save()
            return Response({
                'error': 'Gate pass has expired.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = SecurityScanSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Create log entry
        log = GateLog.objects.create(
            gate_pass=gate_pass,
            action='OUT',
            marked_by=request.user,
            notes=serializer.validated_data.get('notes', '')
        )
        
        return Response({
            'message': 'Exit marked successfully.',
            'log': GateLogSerializer(log).data,
            'gate_pass': GatePassDetailSerializer(gate_pass).data
        })


class GatePassMarkInView(views.APIView):
    """API endpoint for security to mark student entry (return)."""
    
    permission_classes = [IsAuthenticated, CanMarkEntryExit]
    
    def post(self, request, pk):
        gate_pass = get_object_or_404(GatePass, pk=pk)
        
        # Validate gate pass status
        if gate_pass.status not in ['approved', 'used']:
            return Response({
                'error': 'Gate pass is not valid.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if already marked out
        existing_out = gate_pass.logs.filter(action='OUT').exists()
        if not existing_out:
            return Response({
                'error': 'Student has not exited yet.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if already marked in
        existing_in = gate_pass.logs.filter(action='IN').exists()
        if existing_in:
            return Response({
                'error': 'Student has already returned.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = SecurityScanSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Create log entry
        log = GateLog.objects.create(
            gate_pass=gate_pass,
            action='IN',
            marked_by=request.user,
            notes=serializer.validated_data.get('notes', '')
        )
        
        # Mark gate pass as used
        gate_pass.status = 'used'
        gate_pass.save()
        
        return Response({
            'message': 'Entry marked successfully. Gate pass completed.',
            'log': GateLogSerializer(log).data,
            'gate_pass': GatePassDetailSerializer(gate_pass).data
        })


class GatePassScanView(views.APIView):
    """API endpoint for security to scan QR code and get gate pass info."""
    
    permission_classes = [IsAuthenticated, CanMarkEntryExit]
    
    def post(self, request):
        serializer = SecurityScanSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        qr_token = serializer.validated_data.get('qr_token')
        if not qr_token:
            return Response({
                'error': 'QR token is required.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            gate_pass = GatePass.objects.get(qr_token=qr_token)
        except GatePass.DoesNotExist:
            return Response({
                'error': 'Invalid QR code.'
            }, status=status.HTTP_404_NOT_FOUND)
        
        return Response({
            'gate_pass': GatePassDetailSerializer(gate_pass).data
        })


class PendingApprovalsView(generics.ListAPIView):
    """
    API endpoint for approvers to see pending gate passes.
    
    Filtering by role:
    - class_incharge: Only EMERGENCY passes from their department
    - hod: All pending passes from their department
    - principal: All pending passes (all departments)
    """
    
    serializer_class = GatePassListSerializer
    permission_classes = [IsAuthenticated, CanApproveGatePass]
    
    def get_queryset(self):
        user = self.request.user
        queryset = GatePass.objects.filter(status='pending').select_related('student', 'approved_by')
        
        # Class incharge: only EMERGENCY passes from their department
        if user.role == 'class_incharge':
            queryset = queryset.filter(pass_type='EMERGENCY')
            if user.department:
                queryset = queryset.filter(student__department=user.department)
            else:
                queryset = queryset.none()
        
        # HOD: all pending passes from their department
        elif user.role == 'hod':
            if user.department:
                queryset = queryset.filter(student__department=user.department)
            else:
                queryset = queryset.none()
        
        # Principal: sees all pending passes (no department filter)
        elif user.role == 'principal':
            pass  # No filtering needed
        
        return queryset
