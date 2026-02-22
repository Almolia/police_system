from rest_framework.test import APITestCase
from evidence.serializers import VehicleEvidenceSerializer

class EvidenceSerializerUnitTests(APITestCase):
    """
    Unit tests for Evidence validation logic.
    These tests bypass the database and Views entirely, 
    so they do not depend on the Case model being implemented.
    """

    def test_vehicle_validation_success_plate_only(self):
        """Validates successfully when ONLY a plate number is provided."""
        data = {
            "title": "Getaway Car",
            "model_name": "Peugeot 206",
            "color": "White",
            "plate_number": "12A345-67",
            "serial_number": "" 
        }
        # We pass the data directly to the Kitchen (Serializer)
        serializer = VehicleEvidenceSerializer(data=data)
        
        # is_valid() should return True
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_vehicle_validation_success_serial_only(self):
        """Validates successfully when ONLY a serial number is provided."""
        data = {
            "title": "Stolen Truck",
            "model_name": "Toyota Hilux",
            "color": "Black",
            "plate_number": "",
            "serial_number": "VIN123456789XYZ" 
        }
        serializer = VehicleEvidenceSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_vehicle_validation_fails_with_both(self):
        """Fails validation if BOTH Plate and Serial are provided."""
        data = {
            "title": "Suspect Vehicle",
            "model_name": "Pride",
            "color": "Grey",
            "plate_number": "99B888-11",
            "serial_number": "VIN123456789XYZ"
        }
        serializer = VehicleEvidenceSerializer(data=data)
        
        self.assertFalse(serializer.is_valid())
        self.assertIn('non_field_errors', serializer.errors)
        self.assertEqual(
            str(serializer.errors['non_field_errors'][0]), 
            "A vehicle cannot have BOTH a Plate Number and a Serial Number."
        )

    def test_vehicle_validation_fails_with_neither(self):
        """Fails validation if NEITHER Plate nor Serial is provided."""
        data = {
            "title": "Unknown Sedan",
            "model_name": "Unknown",
            "color": "Black",
            "plate_number": "",
            "serial_number": ""
        }
        serializer = VehicleEvidenceSerializer(data=data)
        
        self.assertFalse(serializer.is_valid())
        self.assertIn('non_field_errors', serializer.errors)