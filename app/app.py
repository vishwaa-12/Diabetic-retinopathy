import os
from flask import Flask, render_template, request, jsonify, session, redirect, url_for
import json
import smtplib
from email.mime.text import MIMEText
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps

from werkzeug.utils import secure_filename
from model import dr_system

app = Flask(__name__)
app.secret_key = 'super_secret_key_retina_ai_2026' # Change in production

from datetime import timedelta

# Configuration
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['SESSION_PERMANENT'] = False
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(minutes=30)

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# --- AUTH DECORATOR ---
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user' not in session:
            return redirect(url_for('login_page'))
        return f(*args, **kwargs)
    return decorated_function

# --- EMAIL HELPER (Placeholder) ---
def send_email_notification(to_email, subject, body):
    # In a real app, configure SMTP server here
    print(f"📧 [MOCK EMAIL] To: {to_email} | Subject: {subject} | Body: {body}")
    # Example SMTP setup (Commented out):
    # msg = MIMEText(body)
    # msg['Subject'] = subject
    # msg['From'] = "noreply@retinaai.health"
    # msg['To'] = to_email
    # with smtplib.SMTP('smtp.gmail.com', 587) as server:
    #    server.starttls()
    #    server.login("user", "pass")
    #    server.send_message(msg)

# --- ROUTES ---

@app.route('/login', methods=['GET', 'POST'])
def login_page():
    if request.method == 'POST':
        data = request.json
        login_id = data.get('login_id')
        
        # Single Login ID Check
        if login_id == "DRD_Center":
            session.permanent = False
            session['user'] = {
                'name': 'Medical Officer', 
                'email': 'center@drd.com', 
                'role': 'doctor'
            }
            return jsonify({'success': True})
        
        return jsonify({'error': 'Invalid Center ID'}), 401

    if 'user' in session:
        return redirect(url_for('home'))
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.pop('user', None)
    return redirect(url_for('login_page'))

@app.route('/')
@login_required
def home():
    user = session['user']
    return render_template('index.html', user=user)

@app.route('/analyze', methods=['POST'])
@login_required
def analyze():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
        
    if file:
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        try:
            # Extract Patient Data
            patient_details = {
                'name': request.form.get('name', 'Unknown'),
                'age': request.form.get('age', 'N/A'),
                'mobile': request.form.get('mobile', 'N/A')
            }

            result = dr_system.predict(filepath, patient_details=patient_details)
            
            # Smart Error Handling
            if 'error' in result:
                return jsonify({'error': result['error']}), 400
            
            return jsonify({
                'success': True,
                'data': result,
                'image_path': filepath
            })
            
        except Exception as e:
            return jsonify({'error': str(e)}), 500
            
    return jsonify({'error': 'Invalid file'}), 400

@app.route('/history')
@login_required
def get_history():
    try:
        with open('history.json', 'r') as f:
            data = json.load(f)
        return jsonify(data)
    except:
        return jsonify([])

@app.route('/check_mobile/<mobile>')
@login_required
def check_mobile(mobile):
    try:
        with open('history.json', 'r') as f:
            data = json.load(f)
            
        exists = any(item.get('patient', {}).get('mobile') == mobile for item in data)
        return jsonify({'exists': exists})
    except:
        return jsonify({'exists': False})

@app.route('/delete_history/<int:index>', methods=['DELETE'])
@login_required
def delete_history_item(index):
    try:
        with open('history.json', 'r') as f:
            data = json.load(f)
        
        if 0 <= index < len(data):
            del data[index]
            with open('history.json', 'w') as f:
                json.dump(data, f, indent=4)
            return jsonify({'success': True})
        return jsonify({'error': 'Item not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/delete_history_bulk', methods=['POST'])
@login_required
def delete_history_bulk():
    try:
        indices = request.json.get('indices', [])
        # Delete in reverse order to prevent index shifting
        indices = sorted(indices, reverse=True)
        
        with open('history.json', 'r') as f:
            data = json.load(f)
            
        for index in indices:
            if 0 <= index < len(data):
                del data[index]
                
        with open('history.json', 'w') as f:
            json.dump(data, f, indent=4)
            
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500



if __name__ == '__main__':
    app.run(debug=True, port=3000)

