from rest_framework import permissions

class HasRole(permissions.BasePermission):
    """Base permission to check user role codename."""
    allowed_roles = []

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        # Assuming your Role model uses codenames like 'CADET', 'OFFICER', etc.
        return request.user.role and request.user.role.codename in self.allowed_roles

class IsCadet(HasRole):
    allowed_roles = ['CADET']

class IsOfficer(HasRole):
    allowed_roles = ['OFFICER', 'PATROL_OFFICER']

class IsSuperior(HasRole):
    allowed_roles = ['SERGEANT', 'CAPTAIN', 'CHIEF']

class IsCitizen(permissions.IsAuthenticated):
    # Any authenticated user can act as a complainant
    pass
