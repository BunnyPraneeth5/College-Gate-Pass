from django.db import models
from django.conf import settings
from django.utils import timezone
from accounts.models import StudentProfile, DEPARTMENT_CHOICES


class AttendanceRecord(models.Model):
    """Record for a single attendance upload (per class/section/date)."""
    
    date = models.DateField()
    department = models.CharField(max_length=10, choices=DEPARTMENT_CHOICES)
    year = models.IntegerField()
    section = models.CharField(max_length=10)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='attendance_uploads'
    )
    upload_time = models.DateTimeField(auto_now_add=True)
    is_late = models.BooleanField(default=False)  # True if uploaded after 10 AM
    file = models.FileField(upload_to='attendance/', blank=True, null=True)
    total_students = models.IntegerField(default=0)
    present_count = models.IntegerField(default=0)
    absent_count = models.IntegerField(default=0)
    notes = models.TextField(blank=True)
    
    class Meta:
        verbose_name = 'Attendance Record'
        verbose_name_plural = 'Attendance Records'
        unique_together = ['date', 'department', 'year', 'section']
        ordering = ['-date', 'department', 'year', 'section']
    
    def __str__(self):
        return f"{self.department} Year-{self.year} Sec-{self.section} - {self.date}"
    
    def save(self, *args, **kwargs):
        # Check if upload is late (after 10 AM)
        if not self.pk:  # New record
            now = timezone.localtime()
            cutoff = now.replace(hour=10, minute=0, second=0, microsecond=0)
            if now.time() > cutoff.time():
                self.is_late = True
        super().save(*args, **kwargs)


class AttendanceEntry(models.Model):
    """Individual student attendance entry."""
    
    record = models.ForeignKey(
        AttendanceRecord,
        on_delete=models.CASCADE,
        related_name='entries'
    )
    student = models.ForeignKey(
        StudentProfile,
        on_delete=models.CASCADE,
        related_name='attendance_entries'
    )
    present = models.BooleanField(default=True)
    remarks = models.CharField(max_length=100, blank=True)
    
    class Meta:
        verbose_name = 'Attendance Entry'
        verbose_name_plural = 'Attendance Entries'
        unique_together = ['record', 'student']
    
    def __str__(self):
        status = 'Present' if self.present else 'Absent'
        return f"{self.student.roll_number} - {status}"
