# mongo_database.py
from flask_pymongo import PyMongo
from gridfs import GridFS
from datetime import datetime
import uuid
import bson

mongo = PyMongo()
fs = None  # Will be initialized with app

def init_mongo_db(app):
    """Initialize MongoDB with app"""
    # MongoDB configuration
    app.config['MONGO_URI'] = 'mongodb://localhost:27017/retina_ai'
    
    # Initialize PyMongo
    mongo.init_app(app)
    
    # Initialize GridFS for image storage
    global fs
    fs = GridFS(mongo.db)
    
    # Create indexes for better performance
    create_indexes()
    
    print("✅ MongoDB initialized with GridFS")

def create_indexes():
    """Create necessary indexes for performance"""
    # Patients collection indexes
    mongo.db.patients.create_index([("mobile", 1)], unique=True)
    mongo.db.patients.create_index([("patient_id", 1)], unique=True)
    mongo.db.patients.create_index([("name", "text")])
    
    # Diagnoses collection indexes
    mongo.db.diagnoses.create_index([("patient_id", 1)])
    mongo.db.diagnoses.create_index([("date", -1)])
    mongo.db.diagnoses.create_index([("diagnosis_class", 1)])
    mongo.db.diagnoses.create_index([("mobile", 1)])

class Patient:
    """Patient document structure"""
    @staticmethod
    def create(patient_data):
        """Create a new patient"""
        patient_id = f"PID-{uuid.uuid4().hex[:8].upper()}"
        
        patient_doc = {
            'patient_id': patient_id,
            'name': patient_data.get('name', 'Unknown'),
            'age': int(patient_data.get('age', 0)) if str(patient_data.get('age', '0')).isdigit() else 0,
            'mobile': patient_data.get('mobile', ''),
            'email': patient_data.get('email', ''),
            'gender': patient_data.get('gender', ''),
            'diabetes_duration': int(patient_data.get('diabetes_duration', 0)) if str(patient_data.get('diabetes_duration', '0')).isdigit() else 0,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        }
        
        result = mongo.db.patients.insert_one(patient_doc)
        return patient_id

    @staticmethod
    def find_by_mobile(mobile):
        """Find patient by mobile number"""
        return mongo.db.patients.find_one({'mobile': mobile})

    @staticmethod
    def update(patient_id, update_data):
        """Update patient information"""
        update_data['updated_at'] = datetime.utcnow()
        return mongo.db.patients.update_one(
            {'patient_id': patient_id},
            {'$set': update_data}
        )

    @staticmethod
    def get_all():
        """Get all patients"""
        return list(mongo.db.patients.find())

    @staticmethod
    def delete(patient_id):
        """Delete patient and all related diagnoses"""
        # Delete patient
        mongo.db.patients.delete_one({'patient_id': patient_id})
        # Delete related diagnoses
        mongo.db.diagnoses.delete_many({'patient_id': patient_id})

class Diagnosis:
    """Diagnosis document structure"""
    @staticmethod
    def create(patient_id, analysis_result, image_file=None, notes="Automated Analysis"):
        """Create a new diagnosis record"""
        # Get patient details
        patient = Patient.find_by_mobile(analysis_result.get('patient_mobile', ''))
        if not patient:
            # Try to find by patient_id
            patient = mongo.db.patients.find_one({'patient_id': patient_id})
        
        # Store image in GridFS if provided
        image_file_id = None
        if image_file:
            image_file_id = fs.put(
                image_file,
                filename=image_file.filename,
                content_type=image_file.content_type,
                patient_id=patient_id
            )
        
        diagnosis_doc = {
            'patient_id': patient_id,
            'patient_mobile': patient.get('mobile', '') if patient else '',
            'date': datetime.utcnow(),
            'diagnosis_class': analysis_result['class'],
            'severity_index': analysis_result['severity_index'],
            'progression_risk': analysis_result['progression_risk'],
            'probabilities': analysis_result['probabilities'],
            'image_file_id': image_file_id,
            'image_filename': image_file.filename if image_file else None,
            'notes': notes,
            'model_version': 'v3.0'
        }
        
        # If patient found, embed some patient info for quick access
        if patient:
            diagnosis_doc['patient_info'] = {
                'name': patient.get('name'),
                'age': patient.get('age'),
                'gender': patient.get('gender')
            }
        
        result = mongo.db.diagnoses.insert_one(diagnosis_doc)
        return str(result.inserted_id)

    @staticmethod
    def get_all(sort_by='date', limit=100, skip=0):
        """Get all diagnoses with pagination"""
        return list(mongo.db.diagnoses.find()
                    .sort(sort_by, -1)
                    .skip(skip)
                    .limit(limit))

    @staticmethod
    def get_by_patient(patient_id):
        """Get all diagnoses for a patient"""
        return list(mongo.db.diagnoses.find({'patient_id': patient_id})
                    .sort('date', -1))

    @staticmethod
    def get_by_id(diagnosis_id):
        """Get diagnosis by ID"""
        from bson.objectid import ObjectId
        try:
            return mongo.db.diagnoses.find_one({'_id': ObjectId(diagnosis_id)})
        except:
            return None

    @staticmethod
    def delete(diagnosis_id):
        """Delete diagnosis and associated image"""
        from bson.objectid import ObjectId
        
        # Get diagnosis to find image_file_id
        diagnosis = mongo.db.diagnoses.find_one({'_id': ObjectId(diagnosis_id)})
        
        if diagnosis and diagnosis.get('image_file_id'):
            # Delete image from GridFS
            fs.delete(diagnosis['image_file_id'])
        
        # Delete diagnosis document
        mongo.db.diagnoses.delete_one({'_id': ObjectId(diagnosis_id)})

    @staticmethod
    def get_image(diagnosis_id):
        """Get image file from GridFS"""
        from bson.objectid import ObjectId
        
        diagnosis = mongo.db.diagnoses.find_one({'_id': ObjectId(diagnosis_id)})
        if diagnosis and diagnosis.get('image_file_id'):
            return fs.get(diagnosis['image_file_id'])
        return None

    @staticmethod
    def to_dict(diagnosis_doc):
        """Convert MongoDB document to dictionary"""
        from bson.objectid import ObjectId
        
        if not diagnosis_doc:
            return None
        
        # Convert ObjectId to string
        diagnosis_dict = {
            'id': str(diagnosis_doc['_id']),
            'patient_id': diagnosis_doc.get('patient_id', ''),
            'date': diagnosis_doc.get('date', datetime.utcnow()).strftime("%Y-%m-%d %H:%M"),
            'diagnosis': diagnosis_doc.get('diagnosis_class', ''),
            'severity_index': diagnosis_doc.get('severity_index', 0),
            'risk': diagnosis_doc.get('progression_risk', 0),
            'probabilities': diagnosis_doc.get('probabilities', {}),
            'image_filename': diagnosis_doc.get('image_filename'),
            'notes': diagnosis_doc.get('notes', ''),
            'patient': {
                'name': diagnosis_doc.get('patient_info', {}).get('name', 'Unknown'),
                'age': diagnosis_doc.get('patient_info', {}).get('age', 'N/A'),
                'mobile': diagnosis_doc.get('patient_mobile', 'N/A'),
                'gender': diagnosis_doc.get('patient_info', {}).get('gender', '')
            }
        }
        return diagnosis_dict

class Stats:
    """Statistics helper class"""
    @staticmethod
    def get_dashboard_stats():
        """Get dashboard statistics"""
        total_patients = mongo.db.patients.count_documents({})
        total_diagnoses = mongo.db.diagnoses.count_documents({})
        
        # Diagnoses by class
        pipeline = [
            {'$group': {'_id': '$diagnosis_class', 'count': {'$sum': 1}}},
            {'$sort': {'count': -1}}
        ]
        class_distribution = list(mongo.db.diagnoses.aggregate(pipeline))
        
        # Monthly trend (last 6 months)
        six_months_ago = datetime.utcnow().replace(day=1)  # First day of current month
        for _ in range(5):
            # Go back 5 more months
            if six_months_ago.month == 1:
                six_months_ago = six_months_ago.replace(year=six_months_ago.year-1, month=12)
            else:
                six_months_ago = six_months_ago.replace(month=six_months_ago.month-1)
        
        monthly_pipeline = [
            {'$match': {'date': {'$gte': six_months_ago}}},
            {'$group': {
                '_id': {'year': {'$year': '$date'}, 'month': {'$month': '$date'}},
                'count': {'$sum': 1}
            }},
            {'$sort': {'_id.year': 1, '_id.month': 1}}
        ]
        monthly_trend = list(mongo.db.diagnoses.aggregate(monthly_pipeline))
        
        # Format monthly trend
        formatted_monthly = []
        for item in monthly_trend:
            month_str = f"{item['_id']['year']}-{item['_id']['month']:02d}"
            formatted_monthly.append({'month': month_str, 'count': item['count']})
        
        return {
            'total_patients': total_patients,
            'total_diagnoses': total_diagnoses,
            'class_distribution': {item['_id']: item['count'] for item in class_distribution},
            'monthly_trend': formatted_monthly
        }