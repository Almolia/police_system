from django.urls import path
from .views import (
    CaseEvidenceListView, VehicleEvidenceCreateView, WitnessEvidenceCreateView,
    BioEvidenceCreateView, IDEvidenceCreateView, MiscEvidenceCreateView
)

app_name = 'cases'

urlpatterns = [
    path('<int:case_id>/evidence/', CaseEvidenceListView.as_view(), name='evidence-list'),
    path('<int:case_id>/evidence/vehicle/', VehicleEvidenceCreateView.as_view(), name='evidence-add-vehicle'),
    path('<int:case_id>/evidence/witness/', WitnessEvidenceCreateView.as_view(), name='evidence-add-witness'),
    path('<int:case_id>/evidence/bio/', BioEvidenceCreateView.as_view(), name='evidence-add-bio'),
    path('<int:case_id>/evidence/id-doc/', IDEvidenceCreateView.as_view(), name='evidence-add-id'),
    path('<int:case_id>/evidence/misc/', MiscEvidenceCreateView.as_view(), name='evidence-add-misc'),
]