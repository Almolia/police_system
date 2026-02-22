from cases.permissions import HasRole

class IsDetective(HasRole):
    allowed_roles = ['DETECTIVE']

class IsSergeant(HasRole):
    allowed_roles = ['SERGEANT']

class IsCaptain(HasRole):
    allowed_roles = ['CAPTAIN']

class IsChief(HasRole):
    allowed_roles = ['CHIEF']
