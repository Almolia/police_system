from rest_framework.permissions import BasePermission, SAFE_METHODS

class IsCadet(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            request.user.role and 
            request.user.role.codename == 'CADET'
        )

class IsOfficer(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            request.user.role and 
            request.user.role.codename == 'OFFICER'
        )

class IsDetective(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            request.user.role and 
            request.user.role.codename == 'DETECTIVE'
        )

class IsSergeant(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            request.user.role and 
            request.user.role.codename == 'SERGEANT'
        )

class IsCaptain(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            request.user.role and 
            request.user.role.codename == 'CAPTAIN'
        )

class IsChief(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            request.user.role and 
            request.user.role.codename == 'CHIEF'
        )

class IsJudge(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            request.user.role and 
            request.user.role.codename == 'JUDGE'
        )

class IsCitizen(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            request.user.role and 
            request.user.role.codename == 'CITIZEN'
        )

class IsPolicePersonnel(BasePermission):
    """Allows access to anyone in the police force hierarchy."""
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated and request.user.role):
            return False
        police_roles = ['CADET', 'OFFICER', 'DETECTIVE', 'SERGEANT', 'CAPTAIN', 'CHIEF']
        return request.user.role.codename in police_roles