from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count, Q
from django.db.models.functions import TruncDate
from django.utils import timezone
from datetime import timedelta

from gate_pass.models import GatePass
from accounts.models import User, StudentProfile


class AnalyticsSummaryView(APIView):
    """
    Get analytics summary for gate passes.
    
    GET /api/analytics/summary/?from=YYYY-MM-DD&to=YYYY-MM-DD
    
    HOD: sees their department
    Principal/Admin: sees all
    """
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        
        # Only HOD, Principal, Admin can view analytics
        if user.role not in ['hod', 'principal', 'admin']:
            return Response({
                'error': 'Access denied.'
            }, status=403)
        
        # Date range
        from_date_str = request.query_params.get('from')
        to_date_str = request.query_params.get('to')
        
        today = timezone.localdate()
        
        if from_date_str:
            try:
                from datetime import datetime
                from_date = datetime.strptime(from_date_str, '%Y-%m-%d').date()
            except ValueError:
                from_date = today - timedelta(days=30)
        else:
            from_date = today - timedelta(days=30)
        
        if to_date_str:
            try:
                from datetime import datetime
                to_date = datetime.strptime(to_date_str, '%Y-%m-%d').date()
            except ValueError:
                to_date = today
        else:
            to_date = today
        
        # Base queryset with date filter
        passes = GatePass.objects.filter(
            created_at__date__gte=from_date,
            created_at__date__lte=to_date
        )
        
        # Department filter for HOD
        department = request.query_params.get('department')
        if user.role == 'hod' and user.department:
            department = user.department
            passes = passes.filter(student__department=department)
        elif department:
            passes = passes.filter(student__department=department)
        
        # Total counts
        total_passes = passes.count()
        pending_count = passes.filter(status='pending').count()
        approved_count = passes.filter(status='approved').count()
        rejected_count = passes.filter(status='rejected').count()
        used_count = passes.filter(status='used').count()
        
        # Passes per day
        passes_per_day = list(
            passes.annotate(date=TruncDate('created_at'))
            .values('date')
            .annotate(count=Count('id'))
            .order_by('date')
        )
        
        # Passes per department
        passes_per_department = list(
            passes.values('student__department')
            .annotate(count=Count('id'))
            .order_by('-count')
        )
        passes_per_department = [
            {'department': p['student__department'], 'count': p['count']}
            for p in passes_per_department if p['student__department']
        ]
        
        # Passes per type
        passes_per_type = list(
            passes.values('pass_type')
            .annotate(count=Count('id'))
            .order_by('-count')
        )
        
        # Top students by pass count
        top_students = list(
            passes.values('student__first_name', 'student__last_name', 'student__email', 'student__department')
            .annotate(count=Count('id'))
            .order_by('-count')[:10]
        )
        top_students = [
            {
                'name': f"{s['student__first_name']} {s['student__last_name']}",
                'email': s['student__email'],
                'department': s['student__department'],
                'count': s['count']
            }
            for s in top_students
        ]
        
        # Approval rate
        decided_passes = approved_count + rejected_count
        approval_rate = round((approved_count / decided_passes * 100), 1) if decided_passes > 0 else 0
        
        return Response({
            'date_range': {
                'from': from_date.isoformat(),
                'to': to_date.isoformat()
            },
            'department': department,
            'summary': {
                'total': total_passes,
                'pending': pending_count,
                'approved': approved_count,
                'rejected': rejected_count,
                'used': used_count,
                'approval_rate': approval_rate
            },
            'passes_per_day': passes_per_day,
            'passes_per_department': passes_per_department,
            'passes_per_type': passes_per_type,
            'top_students': top_students
        })


class DepartmentStatsView(APIView):
    """Get stats for a specific department."""
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request, department):
        user = request.user
        
        if user.role not in ['hod', 'principal', 'admin']:
            return Response({'error': 'Access denied.'}, status=403)
        
        if user.role == 'hod' and user.department != department:
            return Response({'error': 'Access denied.'}, status=403)
        
        # Student count
        student_count = User.objects.filter(
            role='student',
            department=department
        ).count()
        
        # Staff count
        staff_count = User.objects.filter(
            role__in=['faculty', 'class_incharge', 'hod'],
            department=department
        ).count()
        
        # Pass stats
        today = timezone.localdate()
        month_start = today.replace(day=1)
        
        passes = GatePass.objects.filter(student__department=department)
        monthly_passes = passes.filter(created_at__date__gte=month_start)
        
        return Response({
            'department': department,
            'students': student_count,
            'staff': staff_count,
            'passes': {
                'total': passes.count(),
                'this_month': monthly_passes.count(),
                'pending': passes.filter(status='pending').count()
            }
        })
