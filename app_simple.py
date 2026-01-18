from flask import Flask, render_template, request, jsonify
import os
from werkzeug.utils import secure_filename
import uuid
import sys

# Import predictor components
sys.path.append('.')
from dr_predictor import DRPredictor, AdvancedFeatureExtractor

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024

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

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/login')
def login():
    return render_template('login.html')

@app.route('/logout')
def logout():
    return render_template('login.html')

@app.route('/analyze', methods=['POST'])
def analyze():
    try:
        if not predictor:
            return jsonify({'error': 'Model not loaded'}), 500
            
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
            
            # Clean up uploaded file
            try:
                os.remove(filepath)
            except:
                pass
            
            # Return result
            return jsonify({
                'class': result['class'],
                'confidence': result['confidence'],
                'probabilities': result['probabilities']
            })
        
        return jsonify({'error': 'Invalid file type'}), 400
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("Starting RetinaAI Web Application...")
    print("Model Accuracy: 96.23%")
    print("Access at: http://localhost:5000/login")
    app.run(debug=True, host='0.0.0.0', port=5000)