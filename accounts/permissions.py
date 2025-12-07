from rest_framework import permissions


class IsStudent(permissions.BasePermission):
    """Permission for student-only access."""
    
    message = "Only students can perform this action."
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role == 'student'
        )


class IsApprover(permissions.BasePermission):
    """Permission for users who can approve gate passes (HOD/Principal/Class Incharge/Faculty)."""
    
    message = "Only authorized approvers can perform this action."
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.is_approver()
        )


class CanApproveRegularPass(permissions.BasePermission):
    """Permission for HOD and Principal to approve regular passes."""
    
    message = "Only HOD or Principal can approve regular gate passes."
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.can_approve_regular_pass()
        )


class CanApproveEmergencyPass(permissions.BasePermission):
    """Permission for HOD, Principal, and Class Incharge to approve emergency passes."""
    
    message = "Only HOD, Principal, or Class Incharge can approve emergency gate passes."
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.can_approve_emergency_pass()
        )


class IsSecurity(permissions.BasePermission):
    """Permission for security personnel only."""
    
    message = "Only security personnel can perform this action."
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role == 'security'
        )


class IsAdmin(permissions.BasePermission):
    """Permission for admin users."""
    
    message = "Only admins can perform this action."
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role == 'admin'
        )


class IsOwnerOrApproverOrSecurity(permissions.BasePermission):
    """Permission for gate pass owner, approvers, or security."""
    
    message = "You don't have permission to view this gate pass."
    
    def has_object_permission(self, request, view, obj):
        # Student can view their own pass
        if hasattr(obj, 'student') and obj.student == request.user:
            return True
        # Approvers can view passes in their department
        if request.user.is_approver():
            return True
        # Security can view all passes
        if request.user.is_security():
            return True
        # Admin can view all
        if request.user.role == 'admin':
            return True
        return False


class IsAdminOrHodOrPrincipal(permissions.BasePermission):
    """
    Permission for bulk student upload.
    
    Allowed roles: admin, hod, principal
    - admin: Can import students for any department
    - principal: Can import students for any department  
    - hod: Can ONLY import students for their own department
    """
    
    message = "Only admin, HOD, or Principal can perform bulk student uploads."
    
    ALLOWED_ROLES = ['admin', 'hod', 'principal']
    ANY_DEPARTMENT_ROLES = ['admin', 'principal']
    OWN_DEPARTMENT_ONLY_ROLES = ['hod']
    
    def has_permission(self, request, view):
        """Check if user has permission to access this view."""
        if not (request.user and request.user.is_authenticated):
            return False
        return request.user.role in self.ALLOWED_ROLES
    
    def can_manage_department(self, user, department):
        """
        Check if user can manage students in the given department.
        
        Args:
            user: The authenticated user
            department: The department to check access for
            
        Returns:
            tuple: (allowed: bool, error_message: str or None)
        """
        # Admin and Principal can manage any department
        if user.role in self.ANY_DEPARTMENT_ROLES:
            return True, None
        
        # HOD can only manage their own department
        if user.role in self.OWN_DEPARTMENT_ONLY_ROLES:
            if not user.department:
                return False, "HOD must have a department assigned."
            if user.department != department:
                return False, f"HOD can only import students for their department ({user.department})."
            return True, None
        
        return False, "You don't have permission to manage this department."

