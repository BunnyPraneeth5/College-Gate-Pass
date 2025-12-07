from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
import logging

logger = logging.getLogger(__name__)


def send_pass_notification(gate_pass, action):
    """
    Send email notification for gate pass actions.
    
    action: 'approved', 'rejected', 'out', 'in'
    """
    try:
        student = gate_pass.student
        student_email = student.email
        student_name = student.full_name
        
        # Get parent email if hosteller
        parent_email = None
        if hasattr(student, 'student_profile'):
            profile = student.student_profile
            if profile.residency_type == 'HOSTELLER' and profile.parent_email:
                parent_email = profile.parent_email
        
        # Subject based on action
        subjects = {
            'approved': f'Gate Pass Approved - {gate_pass.pass_type}',
            'rejected': f'Gate Pass Rejected - {gate_pass.pass_type}',
            'out': f'Exit Marked - Gate Pass #{gate_pass.id}',
            'in': f'Entry Marked - Gate Pass #{gate_pass.id}'
        }
        
        subject = subjects.get(action, 'Gate Pass Notification')
        
        # Build message
        messages_map = {
            'approved': f"""
Dear {student_name},

Your gate pass request has been APPROVED.

Details:
- Pass Type: {gate_pass.pass_type}
- Reason: {gate_pass.reason}
- Out Time: {gate_pass.out_datetime}
- Return Time: {gate_pass.in_datetime}
- Approved By: {gate_pass.approved_by.full_name if gate_pass.approved_by else 'N/A'}

Please show your QR code at the security gate.

Regards,
College Gate Pass System
            """,
            'rejected': f"""
Dear {student_name},

Your gate pass request has been REJECTED.

Details:
- Pass Type: {gate_pass.pass_type}
- Reason: {gate_pass.reason}
- Comment: {gate_pass.approver_comment or 'No comment provided'}

You may submit a new request if needed.

Regards,
College Gate Pass System
            """,
            'out': f"""
Dear {student_name},

Your exit has been recorded.

Details:
- Pass ID: #{gate_pass.id}
- Exit Time: {gate_pass.logs.filter(action='OUT').first().timestamp if gate_pass.logs.filter(action='OUT').exists() else 'N/A'}
- Expected Return: {gate_pass.in_datetime}

Have a safe journey!

Regards,
College Gate Pass System
            """,
            'in': f"""
Dear {student_name},

Welcome back! Your entry has been recorded.

Details:
- Pass ID: #{gate_pass.id}
- Entry Time: {gate_pass.logs.filter(action='IN').first().timestamp if gate_pass.logs.filter(action='IN').exists() else 'N/A'}

Gate pass completed successfully.

Regards,
College Gate Pass System
            """
        }
        
        message = messages_map.get(action, 'Gate pass notification')
        
        # Recipients
        recipients = [student_email]
        if parent_email and action in ['approved', 'out', 'in']:
            recipients.append(parent_email)
        
        # Send email
        send_mail(
            subject=subject,
            message=message.strip(),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=recipients,
            fail_silently=True
        )
        
        logger.info(f"Notification sent for pass #{gate_pass.id}: {action}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send notification: {str(e)}")
        return False


def send_bulk_notification(users, subject, message):
    """Send notification to multiple users."""
    try:
        emails = [u.email for u in users if u.email]
        
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=emails,
            fail_silently=True
        )
        
        return True
    except Exception as e:
        logger.error(f"Failed to send bulk notification: {str(e)}")
        return False
