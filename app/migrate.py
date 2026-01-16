# migrate.py
from app import app, db
from database import Patient, Diagnosis
import json

def migrate_from_json():
    """Migrate data from old JSON file to database"""
    try:
        with open('history.json', 'r') as f:
            old_data = json.load(f)
        
        for entry in old_data:
            # Check if patient already exists
            patient = Patient.query.filter_by(mobile=entry['patient'].get('mobile', '')).first()
            
            if not patient:
                # Create new patient
                patient = Patient(
                    patient_id=entry['patient_id'],
                    name=entry['patient'].get('name', 'Unknown'),
                    age=int(entry['patient'].get('age', 0)) if str(entry['patient'].get('age', '0')).isdigit() else 0,
                    mobile=entry['patient'].get('mobile', ''),
                    email='',
                    gender='',
                    diabetes_duration=0
                )
                db.session.add(patient)
            
            # Create diagnosis record
            diagnosis = Diagnosis(
                patient_id=patient.patient_id,
                diagnosis_class=entry['diagnosis'],
                severity_index=0,  # Default, you might need to map from old data
                progression_risk=float(entry['risk']),
                probabilities={'No DR': 0.0, 'Mild': 0.0, 'Moderate': 0.0, 'Severe': 0.0, 'Proliferative': 0.0},
                image_path='',
                notes=entry.get('notes', 'Migrated from old system')
            )
            db.session.add(diagnosis)
        
        db.session.commit()
        print(f"✅ Migrated {len(old_data)} records to database")
        
    except Exception as e:
        db.session.rollback()
        print(f"❌ Migration failed: {e}")

if __name__ == '__main__':
    with app.app_context():
        migrate_from_json()