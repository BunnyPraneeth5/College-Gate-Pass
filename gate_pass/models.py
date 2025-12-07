import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone


class GatePass(models.Model):
    """Model for gate pass requests."""
    
    PASS_TYPE_CHOICES = [
        ('DAY_OUT', 'Day Out'),
        ('HOME_LEAVE', 'Home Leave'),
        ('EMERGENCY', 'Emergency'),
        ('NIGHT_OUT', 'Night Out'),
        ('LONG_LEAVE', 'Long Leave'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('expired', 'Expired'),
        ('used', 'Used'),
    ]
    
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='gate_passes',
        limit_choices_to={'role': 'student'}
    )
    pass_type = models.CharField(max_length=20, choices=PASS_TYPE_CHOICES, default='DAY_OUT')
    reason = models.TextField()
    out_datetime = models.DateTimeField()
    in_datetime = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_passes'
    )
    approver_comment = models.TextField(blank=True)
    qr_token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Gate Pass'
        verbose_name_plural = 'Gate Passes'
    
    def __str__(self):
        return f"{self.student.full_name} - {self.pass_type} - {self.status}"
    
    def is_valid(self):
        """Check if the gate pass is currently valid."""
        now = timezone.now()
        return (
            self.status == 'approved' and
            self.out_datetime <= now <= self.in_datetime
        )
    
    def is_expired(self):
        """Check if the gate pass has expired."""
        return timezone.now() > self.in_datetime
    
    def mark_as_used(self):
        """Mark the gate pass as used."""
        self.status = 'used'
        self.save()


class GateLog(models.Model):
    """Model for security entry/exit logs."""
    
    ACTION_CHOICES = [
        ('OUT', 'Exit'),
        ('IN', 'Entry'),
    ]
    
    gate_pass = models.ForeignKey(
        GatePass, 
        on_delete=models.CASCADE, 
        related_name='logs'
    )
    action = models.CharField(max_length=3, choices=ACTION_CHOICES)
    timestamp = models.DateTimeField(auto_now_add=True)
    marked_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='marked_logs',
        limit_choices_to={'role': 'security'}
    )
    notes = models.TextField(blank=True)
    
    class Meta:
        ordering = ['-timestamp']
        verbose_name = 'Gate Log'
        verbose_name_plural = 'Gate Logs'
    
    def __str__(self):
        return f"{self.gate_pass.student.full_name} - {self.action} at {self.timestamp}"
