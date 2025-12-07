from rest_framework import serializers
from .models import AttendanceRecord, AttendanceEntry
from accounts.serializers import UserMinimalSerializer


class AttendanceEntrySerializer(serializers.ModelSerializer):
    """Serializer for individual attendance entries."""
    
    student_name = serializers.CharField(source='student.user.full_name', read_only=True)
    roll_number = serializers.CharField(source='student.roll_number', read_only=True)
    
    class Meta:
        model = AttendanceEntry
        fields = ['id', 'student', 'student_name', 'roll_number', 'present', 'remarks']


class AttendanceRecordSerializer(serializers.ModelSerializer):
    """Serializer for attendance records."""
    
    uploaded_by_name = serializers.CharField(source='uploaded_by.full_name', read_only=True)
    entries = AttendanceEntrySerializer(many=True, read_only=True)
    attendance_percentage = serializers.SerializerMethodField()
    
    class Meta:
        model = AttendanceRecord
        fields = ['id', 'date', 'department', 'year', 'section', 
                  'uploaded_by', 'uploaded_by_name', 'upload_time', 
                  'is_late', 'total_students', 'present_count', 
                  'absent_count', 'attendance_percentage', 'notes', 'entries']
        read_only_fields = ['id', 'uploaded_by', 'upload_time', 'is_late']
    
    def get_attendance_percentage(self, obj):
        if obj.total_students > 0:
            return round((obj.present_count / obj.total_students) * 100, 1)
        return 0


class AttendanceRecordListSerializer(serializers.ModelSerializer):
    """Lighter serializer for listing records."""
    
    uploaded_by_name = serializers.CharField(source='uploaded_by.full_name', read_only=True)
    
    class Meta:
        model = AttendanceRecord
        fields = ['id', 'date', 'department', 'year', 'section', 
                  'uploaded_by_name', 'upload_time', 'is_late',
                  'total_students', 'present_count', 'absent_count']


class AttendanceStatusSerializer(serializers.Serializer):
    """Serializer for attendance status response."""
    
    department = serializers.CharField()
    year = serializers.IntegerField()
    section = serializers.CharField()
    uploaded = serializers.BooleanField()
    is_late = serializers.BooleanField(required=False)
    upload_time = serializers.DateTimeField(required=False)
