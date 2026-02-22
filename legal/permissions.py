from cases.permissions import HasRole

class IsJudge(HasRole):
    allowed_roles = ['JUDGE']
