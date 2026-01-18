from flask import Flask, render_template, request, jsonify, send_file
import os
from werkzeug.utils import secure_filename
from datetime import datetime
import uuid
import sys

# Import predictor components
sys.path.append('.')
from dr_predictor import DRPredictor, AdvancedFeatureExtractor

# Import MongoDB components
from mongo_database import init_mongo_db, Patient, Diagnosis, Stats

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024

# Initialize MongoDB
init_mongo_db(app)

# Create uploads directory
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Initialize predictor
try:
    predictor = DRPredictor()
    print("Model loaded successfully!")
except Exception as e:
    print(f"Error loading model: {e}")
    predictor = None

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_severity_index(class_name):
    """Convert class name to severity index (0-4)"""
    mapping = {
        'No_DR': 0, 'No DR': 0,
        'Mild': 1,
        'Moderate': 2,
        'Severe': 3,
        'Proliferate_DR': 4, 'Proliferative': 4
    }
    return mapping.get(class_name, 0)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        data = request.get_json()
        login_id = data.get('login_id')
        # Allow specific Center IDs
        if login_id and login_id in ['DRD_Center', 'ADMIN', 'TEST', 'admin']:
            return jsonify({'success': True})
        return jsonify({'success': False, 'error': 'Invalid Center ID'})
    return render_template('login.html')

@app.route('/logout')
def logout():
    return render_template('login.html')

@app.route('/analyze', methods=['POST'])
def analyze():
    try:
        if not predictor:
            return jsonify({'error': 'Model not loaded'}), 500
            
        # Get patient details
        patient_data = {
            'name': request.form.get('name'),
            'age': request.form.get('age'),
            'dob': request.form.get('dob'),
            'mobile': request.form.get('mobile'),
            'gender': request.form.get('gender'),
            'diabetes_duration': request.form.get('diabetes_duration'),
        }
        
        # Check if file was uploaded
        if 'file' not in request.files:
            return jsonify({'error': 'No image uploaded'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No image selected'}), 400
        
        if file and allowed_file(file.filename):
            # Save file temporarily
            filename = f"{uuid.uuid4()}_{secure_filename(file.filename)}"
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)
            
            # Predict using the optimized model
            result = predictor.predict(filepath)
            
            # Add severity index and progression risk
            severity_index = get_severity_index(result['class'])
            
            # Calculate Risk based on Severity (Medically relevant)
            # Calculate Risk based on User-Defined Ranges
            # Ranges: (Min, Max)
            risk_ranges = {
                0: (0, 5),      # No DR
                1: (15, 35),    # Mild
                2: (36, 60),    # Moderate
                3: (61, 80),    # Severe
                4: (81, 100)    # Proliferative
            }
            
            # Get range for current severity (default to No DR if unknown)
            min_risk, max_risk = risk_ranges.get(severity_index, (0, 5))
            
            # Calculate actual risk position within range based on model confidence
            # If confidence is high (e.g. 0.9), we are at the top of the risk range
            range_span = max_risk - min_risk
            calculated_risk = min_risk + (result['confidence'] * range_span)
            
            progression_risk = int(calculated_risk)
            # Ensure boundaries
            progression_risk = max(min_risk, min(max_risk, progression_risk))
            
            # Clean up class names for UI
            def clean_name(name):
                name_map = {
                    'No_DR': 'No DR',
                    'Proliferate_DR': 'Proliferative',
                    'Proliferative DR': 'Proliferative'
                }
                return name_map.get(name, name)

            # Sanitize probabilities keys
            clean_probs = {}
            for k, v in result['probabilities'].items():
                clean_probs[clean_name(k)] = v
                
            clean_class = clean_name(result['class'])

            analysis_result = {
                'class': clean_class,
                'confidence': result['confidence'],
                'probabilities': clean_probs,
                'severity_index': severity_index,
                'progression_risk': progression_risk,
                'patient_mobile': patient_data['mobile']
            }
            
            # Check if patient exists, create if not
            existing_patient = Patient.find_by_mobile(patient_data['mobile'])
            if existing_patient:
                patient_id = existing_patient['patient_id']
            else:
                patient_id = Patient.create(patient_data)
            
            # Save diagnosis to database
            file.seek(0)  # Reset file pointer
            diagnosis_id = Diagnosis.create(patient_id, analysis_result, file)
            
            # Clean up uploaded file
            try:
                os.remove(filepath)
            except:
                pass
            
            # Return result
            return jsonify({
                'class': result['class'],
                'confidence': result['confidence'],
                'probabilities': result['probabilities'],
                'severity_index': severity_index,
                'progression_risk': progression_risk,
                'patient_id': patient_id,
                'diagnosis_id': diagnosis_id
            })
        
        return jsonify({'error': 'Invalid file type'}), 400
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/history')
def history():
    try:
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 50))
        search_query = request.args.get('search', '').strip()
        
        skip = (page - 1) * limit
        
        # Get diagnoses with pagination AND search
        diagnoses = Diagnosis.get_all(limit=limit, skip=skip, search_query=search_query)
        # Total count needs to be adjusted for search (simplified for now to match returned)
        total = len(diagnoses) if search_query else 100 # Approx for UI, ideal is separate count query
        
        # Convert to dict format
        data = [Diagnosis.to_dict(d) for d in diagnoses]
        
        return jsonify({
            'data': data,
            'total': total,
            'page': page,
            'limit': limit,
            'pages': 1 # Simplified pagination for search view
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/check_mobile/<mobile>')
def check_mobile(mobile):
    try:
        patient = Patient.find_by_mobile(mobile)
        return jsonify({'exists': patient is not None})
    except Exception as e:
        return jsonify({'exists': False, 'error': str(e)})


@app.route('/delete_diagnosis/<diagnosis_id>', methods=['DELETE'])
def delete_diagnosis(diagnosis_id):
    try:
        # Perform Soft Delete (Archive)
        Diagnosis.archive(diagnosis_id)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
@app.route('/diagnosis/<diagnosis_id>')
def get_diagnosis(diagnosis_id):
    try:
        diagnosis = Diagnosis.get_by_id(diagnosis_id)
        if not diagnosis:
            return jsonify({'error': 'Diagnosis not found'}), 404
        return jsonify(diagnosis)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/diagnosis/image/<diagnosis_id>')
def get_diagnosis_image(diagnosis_id):
    try:
        image_data = Diagnosis.get_image(diagnosis_id)
        if not image_data:
            return jsonify({'error': 'Image not found'}), 404
        
        from io import BytesIO
        return send_file(
            BytesIO(image_data.read()),
            mimetype='image/jpeg'
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("Starting RetinaAI Web Application...")
    print("Model Accuracy: 96.23%")
    print("Access at: http://localhost:5000")
    app.run(debug=True, host='0.0.0.0', port=5000)