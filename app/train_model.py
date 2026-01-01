import os
import pickle
import numpy as np
from PIL import Image, ImageStat
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score

# --- CONFIGURATION ---
DATASET_DIR = "../colored_images"  # Path to dataset
MODEL_PATH = "dr_model.pkl"        # Where to save the trained model
IMG_SIZE = (224, 224)              # Analysis size

# Class Mapping (Folder Name -> Label Index)
CLASS_MAP = {
    'No_DR': 0,
    'Mild': 1,
    'Moderate': 2,
    'Severe': 3,
    'Proliferate_DR': 4
}

def extract_features(img_path):
    """
    Extracts the same heuristic features used in the app:
    1. Green Channel Variance (Texture/Roughness)
    2. High Intensity Ratio (Exudates)
    3. Low Intensity Ratio (Hemorrhages)
    """
    try:
        img = Image.open(img_path).convert('RGB')
        img = img.resize(IMG_SIZE)
        r, g, b = img.split()
        
        # Feature 1: Variance (Green Channel)
        stat = ImageStat.Stat(g)
        variance = stat.stddev[0]
        
        # Feature 2 & 3: Histogram Analysis
        hist = g.histogram()
        total_pixels = img.width * img.height
        
        # Count pixels in tails
        high_intensity_count = sum(hist[200:])
        low_intensity_count = sum(hist[:30])
        
        # Normalize to ratios (0.0 - 1.0)
        high_ratio = high_intensity_count / total_pixels
        low_ratio = low_intensity_count / total_pixels
        
        return [variance, high_ratio, low_ratio]
        
    except Exception as e:
        print(f"Error reading {img_path}: {e}")
        return None

def train():
    print("=========================================")
    print("   TRAINING DR DETECTION MODEL (v2.0)    ")
    print("=========================================")
    
    X = []
    y = []
    
    # 1. Load Data
    print("[1/5] Loading Dataset and Extracting Features...")
    for folder_name, label_idx in CLASS_MAP.items():
        folder_path = os.path.join(DATASET_DIR, folder_name)
        if not os.path.exists(folder_path):
            print(f"  [WARN] Folder not found: {folder_path}")
            continue
            
        files = [f for f in os.listdir(folder_path) if f.lower().endswith(('png', 'jpg', 'jpeg'))]
        print(f"  Processing '{folder_name}' ({len(files)} images)...")
        
        for f in files:
            feat = extract_features(os.path.join(folder_path, f))
            if feat:
                X.append(feat)
                y.append(label_idx)
                
    X = np.array(X)
    y = np.array(y)
    
    if len(X) == 0:
        print("Error: No data found. Check your 'colored_images' path.")
        return

    # 2. Split Data (80% Train, 20% Test)
    print("\n[2/5] Splitting Data (80% Train, 20% Test)...")
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    print(f"  Training Samples: {len(X_train)}")
    print(f"  Testing Samples:  {len(X_test)}")

    # 3. Train Model
    print("\n[3/5] Training Random Forest Classifier...")
    # Using Random Forest as it's robust and works well with our variance features
    clf = RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42)
    clf.fit(X_train, y_train)

    # 4. Evaluate
    print("\n[4/5] Evaluating Performance...")
    y_pred = clf.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    print(f"  >> TEST ACCURACY: {acc*100:.2f}%")
    print("\nDetailed Report:")
    print(classification_report(y_test, y_pred, target_names=list(CLASS_MAP.keys())))

    # 5. Save Model
    print("\n[5/5] Saving Model...")
    with open(MODEL_PATH, 'wb') as f:
        pickle.dump(clf, f)
    print(f"  Model saved to: {os.path.abspath(MODEL_PATH)}")
    print("  You can now restart the Flask app to use this trained model.")

if __name__ == "__main__":
    train()
