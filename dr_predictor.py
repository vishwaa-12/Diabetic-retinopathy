#!/usr/bin/env python3
"""
Minimal Diabetic Retinopathy Predictor for Background Service
"""

import os
import cv2
import numpy as np
import pickle
from PIL import Image

class AdvancedFeatureExtractor:
    """Feature extraction for DR prediction"""
    
    def __init__(self, grid_size=4):
        self.grid_size = grid_size
        self.target_size = (224, 224)
    
    def extract_features(self, img_path):
        """Extract features from image"""
        img = Image.open(img_path).convert('RGB')
        img = img.resize(self.target_size)
        arr = np.array(img).astype(float)
        
        features = []
        
        # Color statistics
        for channel in range(3):
            ch = arr[:, :, channel]
            features.extend([
                np.mean(ch), np.std(ch), np.median(ch),
                np.percentile(ch, 25), np.percentile(ch, 75),
                np.max(ch) - np.min(ch), np.var(ch)
            ])
        
        # Texture analysis
        gray = cv2.cvtColor(arr.astype(np.uint8), cv2.COLOR_RGB2GRAY)
        laplacian = cv2.Laplacian(gray, cv2.CV_64F)
        features.extend([
            np.mean(laplacian), np.std(laplacian),
            np.median(laplacian), np.var(laplacian)
        ])
        
        # Edge detection
        edges = cv2.Canny(gray, 50, 150)
        edge_density = np.sum(edges > 0) / (edges.shape[0] * edges.shape[1])
        features.append(edge_density)
        
        # Grid-based analysis
        h, w = gray.shape
        step_h, step_w = h // self.grid_size, w // self.grid_size
        
        for r in range(self.grid_size):
            for c in range(self.grid_size):
                patch = gray[r*step_h:(r+1)*step_h, c*step_w:(c+1)*step_w]
                features.extend([
                    np.mean(patch), np.std(patch), np.var(patch)
                ])
        
        # Histogram features
        hist = cv2.calcHist([gray], [0], None, [32], [0, 256])
        hist = hist.flatten() / np.sum(hist)
        features.extend(hist.tolist())
        
        return np.array(features)

class DRPredictor:
    def __init__(self, model_path='dr_model_optimized.pkl'):
        """Load trained model"""
        with open(model_path, 'rb') as f:
            self.model_data = pickle.load(f)
        
        self.model = self.model_data['model']
        self.scaler = self.model_data['scaler']
        self.extractor = self.model_data['feature_extractor']
        self.class_names = self.model_data['class_names']
    
    def predict(self, image_path):
        """Predict diabetic retinopathy from image"""
        # Extract features
        features = self.extractor.extract_features(image_path)
        features = features.reshape(1, -1)
        
        # Scale features
        features_scaled = self.scaler.transform(features)
        
        # Predict
        prediction = self.model.predict(features_scaled)[0]
        probability = self.model.predict_proba(features_scaled)[0]
        
        return {
            'class': self.class_names[prediction],
            'confidence': float(max(probability)),
            'probabilities': {name: float(prob) for name, prob in zip(self.class_names, probability)}
        }
        print(f"DEBUG: Predicted Class: {self.class_names[prediction]}")
        print(f"DEBUG: Raw Probabilities: {probability}")
        return {
            'class': self.class_names[prediction],
            'confidence': float(max(probability)),
            'probabilities': {name: float(prob) for name, prob in zip(self.class_names, probability)}
        }

def main():
    """Test the predictor"""
    predictor = DRPredictor()
    
    # Test with sample image
    test_dir = 'colored_images'
    if os.path.exists(test_dir):
        for class_dir in os.listdir(test_dir):
            class_path = os.path.join(test_dir, class_dir)
            if os.path.isdir(class_path):
                images = [f for f in os.listdir(class_path) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
                if images:
                    test_image = os.path.join(class_path, images[0])
                    result = predictor.predict(test_image)
                    print(f"Test image: {test_image}")
                    print(f"Prediction: {result}")
                    break

if __name__ == "__main__":
    main()