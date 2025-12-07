from rest_framework import permissions


class CanCreateGatePass(permissions.BasePermission):
    """Only students can create gate passes."""
    
    message = "Only students can create gate pass requests."
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role == 'student'
        )


class CanApproveGatePass(permissions.BasePermission):
    """
    Permission to approve/reject gate passes.
    
    Approval Rules:
    - class_incharge: Can approve/reject ONLY EMERGENCY passes
    - hod: Can approve/reject ALL pass types
    - principal: Can approve/reject ALL pass types
    
    NOT allowed to approve:
    - student, faculty, security, admin (they have other roles)
    """
    
    message = "You don't have permission to approve/reject this gate pass."
    
    # Roles allowed to approve gate passes
    APPROVER_ROLES = ['class_incharge', 'hod', 'principal']
    
    # Roles that can approve ALL pass types
    FULL_APPROVER_ROLES = ['hod', 'principal']
    
    # Roles that can only approve EMERGENCY passes
    EMERGENCY_ONLY_ROLES = ['class_incharge']
    
    def has_permission(self, request, view):
        """Check if user has a role that can approve gate passes."""
        if not (request.user and request.user.is_authenticated):
            return False
        
        # Only specific roles can approve - explicitly exclude faculty, security, etc.
        return request.user.role in self.APPROVER_ROLES
    
    def has_object_permission(self, request, view, obj):
        """Check if user can approve this specific gate pass."""
        user = request.user
        
        # HOD and Principal can approve ALL pass types
        if user.role in self.FULL_APPROVER_ROLES:
            return True
        
        # Class Incharge can ONLY approve EMERGENCY passes
        if user.role in self.EMERGENCY_ONLY_ROLES:
            if obj.pass_type == 'EMERGENCY':
                return True
            else:
                self.message = "Class Incharge can only approve EMERGENCY passes."
                return False
        
        return False


class CanMarkEntryExit(permissions.BasePermission):
    """Only security personnel can mark entry/exit."""
    
    message = "Only security personnel can mark entry/exit."
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role == 'security'
        )


class CanViewGatePass(permissions.BasePermission):
    """
    Permission to view gate passes:
    - Students can view their own passes
    - Approvers can view all passes (for approval purposes)
    - Security can view all passes (for verification)
    - Admin can view all
    """
    
    message = "You don't have permission to view this gate pass."
    
    def has_object_permission(self, request, view, obj):
        user = request.user
        
        # Student can view their own pass
        if obj.student == user:
            return True
        
        # Approvers can view all passes
        if user.role in ['hod', 'principal', 'class_incharge', 'faculty']:
            return True
        
        # Security can view all passes
        if user.role == 'security':
            return True
        
        # Admin can view all
        if user.role == 'admin':
            return True
        
        return False
