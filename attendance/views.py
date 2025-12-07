from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from django.utils import timezone
import csv
import io
from datetime import datetime

from .models import AttendanceRecord, AttendanceEntry
from .serializers import (
    AttendanceRecordSerializer,
    AttendanceRecordListSerializer
)
from accounts.models import StudentProfile, DEPARTMENT_CHOICES
from accounts.permissions import IsAdminOrHodOrPrincipal


class AttendanceUploadView(APIView):
    """
    Upload attendance for a class.
    
    POST /api/attendance/upload/
    
    Accepts CSV or form data with attendance entries.
    """
    
    permission_classes = [IsAuthenticated]
    
    VALID_DEPARTMENTS = [d[0] for d in DEPARTMENT_CHOICES]
    
    def post(self, request):
        user = request.user
        
        # Staff only
        if user.role not in ['faculty', 'class_incharge', 'hod', 'principal', 'admin']:
            return Response({
                'error': 'Only staff can upload attendance.'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Get required fields
        date_str = request.data.get('date')
        department = request.data.get('department', '').upper()
        year = request.data.get('year')
        section = request.data.get('section', '').upper()
        
        # Validate required fields
        if not all([date_str, department, year, section]):
            return Response({
                'error': 'date, department, year, and section are required.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate department
        if department not in self.VALID_DEPARTMENTS:
            return Response({
                'error': f'Invalid department. Must be one of: {", ".join(self.VALID_DEPARTMENTS)}'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate year
        try:
            year = int(year)
            if year < 1 or year > 6:
                raise ValueError()
        except (ValueError, TypeError):
            return Response({
                'error': 'Year must be a number between 1 and 6.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Parse date
        try:
            if isinstance(date_str, str):
                attendance_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            else:
                attendance_date = date_str
        except ValueError:
            return Response({
                'error': 'Invalid date format. Use YYYY-MM-DD.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # HOD can only upload for their department
        if user.role == 'hod' and user.department != department:
            return Response({
                'error': 'You can only upload attendance for your department.'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Check if already uploaded
        existing = AttendanceRecord.objects.filter(
            date=attendance_date,
            department=department,
            year=year,
            section=section
        ).first()
        
        if existing:
            return Response({
                'error': 'Attendance already uploaded for this class and date.',
                'record_id': existing.id,
                'upload_time': existing.upload_time,
                'is_late': existing.is_late
            }, status=status.HTTP_409_CONFLICT)
        
        # Process attendance data
        entries_data = request.data.get('entries', [])
        file = request.FILES.get('file')
        
        if file:
            # Parse CSV file
            try:
                entries_data = self._parse_csv(file)
            except Exception as e:
                return Response({
                    'error': f'Error parsing CSV: {str(e)}'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        if not entries_data:
            return Response({
                'error': 'No attendance entries provided.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            with transaction.atomic():
                # Create attendance record
                record = AttendanceRecord.objects.create(
                    date=attendance_date,
                    department=department,
                    year=year,
                    section=section,
                    uploaded_by=user,
                    notes=request.data.get('notes', '')
                )
                
                if file:
                    record.file = file
                    record.save()
                
                # Create entries
                present_count = 0
                absent_count = 0
                
                for entry in entries_data:
                    roll_number = entry.get('roll_number', '').strip()
                    present = entry.get('present', True)
                    
                    if isinstance(present, str):
                        present = present.upper() in ['Y', 'YES', 'TRUE', '1', 'P', 'PRESENT']
                    
                    try:
                        student = StudentProfile.objects.get(roll_number=roll_number)
                        AttendanceEntry.objects.create(
                            record=record,
                            student=student,
                            present=present,
                            remarks=entry.get('remarks', '')
                        )
                        
                        if present:
                            present_count += 1
                        else:
                            absent_count += 1
                            
                    except StudentProfile.DoesNotExist:
                        continue  # Skip unknown students
                
                # Update counts
                record.total_students = present_count + absent_count
                record.present_count = present_count
                record.absent_count = absent_count
                record.save()
                
                return Response({
                    'message': 'Attendance uploaded successfully.',
                    'record': AttendanceRecordSerializer(record).data
                }, status=status.HTTP_201_CREATED)
                
        except Exception as e:
            return Response({
                'error': f'Error saving attendance: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _parse_csv(self, file):
        """Parse CSV file to get attendance entries."""
        decoded = file.read().decode('utf-8')
        reader = csv.DictReader(io.StringIO(decoded))
        
        entries = []
        for row in reader:
            entries.append({
                'roll_number': row.get('roll_number', row.get('Roll Number', '')),
                'present': row.get('present', row.get('Present', row.get('STATUS', 'Y'))),
                'remarks': row.get('remarks', row.get('Remarks', ''))
            })
        
        return entries


class AttendanceStatusView(APIView):
    """
    Get attendance upload status for a date.
    
    GET /api/attendance/status/?date=YYYY-MM-DD
    """
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        date_str = request.query_params.get('date')
        
        if not date_str:
            date_str = timezone.localdate().isoformat()
        
        try:
            check_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response({
                'error': 'Invalid date format. Use YYYY-MM-DD.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get department filter
        department = request.query_params.get('department')
        if user.role == 'hod' and user.department:
            department = user.department
        
        # Get all classes that should have attendance
        from django.db.models import Q
        
        students_query = StudentProfile.objects.values(
            'user__department', 'year', 'section'
        ).distinct()
        
        if department:
            students_query = students_query.filter(user__department=department)
        
        # Get uploaded records for the date
        uploaded_records = AttendanceRecord.objects.filter(date=check_date)
        if department:
            uploaded_records = uploaded_records.filter(department=department)
        
        uploaded_set = {
            (r.department, r.year, r.section): {
                'is_late': r.is_late,
                'upload_time': r.upload_time
            }
            for r in uploaded_records
        }
        
        # Build status list
        status_list = []
        for student in students_query:
            dept = student['user__department']
            year = student['year']
            section = student['section']
            key = (dept, year, section)
            
            if key in uploaded_set:
                status_list.append({
                    'department': dept,
                    'year': year,
                    'section': section,
                    'uploaded': True,
                    'is_late': uploaded_set[key]['is_late'],
                    'upload_time': uploaded_set[key]['upload_time']
                })
            else:
                status_list.append({
                    'department': dept,
                    'year': year,
                    'section': section,
                    'uploaded': False,
                    'is_late': None,
                    'upload_time': None
                })
        
        # Sort by department, year, section
        status_list.sort(key=lambda x: (x['department'], x['year'], x['section']))
        
        # Calculate summary
        total = len(status_list)
        uploaded_count = sum(1 for s in status_list if s['uploaded'])
        late_count = sum(1 for s in status_list if s.get('is_late'))
        
        return Response({
            'date': date_str,
            'summary': {
                'total_classes': total,
                'uploaded': uploaded_count,
                'pending': total - uploaded_count,
                'late_uploads': late_count
            },
            'classes': status_list
        })


class AttendanceRecordListView(generics.ListAPIView):
    """List attendance records."""
    
    serializer_class = AttendanceRecordListSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        queryset = AttendanceRecord.objects.select_related('uploaded_by').all()
        
        # HOD can only see their department
        if user.role == 'hod' and user.department:
            queryset = queryset.filter(department=user.department)
        
        # Filter by query params
        date = self.request.query_params.get('date')
        if date:
            queryset = queryset.filter(date=date)
        
        department = self.request.query_params.get('department')
        if department:
            queryset = queryset.filter(department=department)
        
        year = self.request.query_params.get('year')
        if year:
            queryset = queryset.filter(year=year)
        
        return queryset.order_by('-date', 'department', 'year', 'section')


class AttendanceRecordDetailView(generics.RetrieveAPIView):
    """Get attendance record with entries."""
    
    serializer_class = AttendanceRecordSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        queryset = AttendanceRecord.objects.prefetch_related('entries__student').all()
        
        if user.role == 'hod' and user.department:
            queryset = queryset.filter(department=user.department)
        
        return queryset
