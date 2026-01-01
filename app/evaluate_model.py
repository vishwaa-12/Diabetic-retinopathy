import os
import random
from model import AdvancedDRSystem, CLASSES

# Configuration
DATASET_DIR = "../colored_images"  # Relative to app/
SAMPLES_PER_CLASS = 20  # Limit to 20 images per class for quick testing. Set to None for full dataset.

# Map directory names to Model Class names
CLASS_MAPPING = {
    'No_DR': 'No DR',
    'Mild': 'Mild',
    'Moderate': 'Moderate',
    'Severe': 'Severe',
    'Proliferate_DR': 'Proliferative'
}

def evaluate_accuracy():
    print("============================================")
    print("   DIABETIC RETINOPATHY MODEL EVALUATION")
    print("============================================")
    
    # Initialize Model
    dr_system = AdvancedDRSystem()
    print("\n[INFO] Model loaded. Starting evaluation...\n")

    total_images = 0
    correct_predictions = 0
    
    # Per-class metrics
    class_stats = {k: {'total': 0, 'correct': 0} for k in CLASSES}
    
    # Iterate through each class folder
    for folder_name, model_label in CLASS_MAPPING.items():
        folder_path = os.path.join(DATASET_DIR, folder_name)
        
        if not os.path.exists(folder_path):
            print(f"[WARN] Directory not found: {folder_path} (Skipping)")
            continue

        images = [f for f in os.listdir(folder_path) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
        
        # Shuffle and select a subset if configured
        if SAMPLES_PER_CLASS:
            images = random.sample(images, min(len(images), SAMPLES_PER_CLASS))
            
        print(f"--> Evaluating Class: '{model_label}' ({len(images)} samples)")
        
        for img_name in images:
            img_path = os.path.join(folder_path, img_name)
            
            try:
                # Predict
                result = dr_system.predict(img_path, save=False)

                prediction = result['class']
                
                # Check correctness
                is_correct = (prediction == model_label)
                
                # Update stats
                total_images += 1
                class_stats[model_label]['total'] += 1
                if is_correct:
                    correct_predictions += 1
                    class_stats[model_label]['correct'] += 1
                
                # Optional: Print detail for debugging
                # print(f"    {img_name} -> Pred: {prediction} [{'✓' if is_correct else '✗'}]")

            except Exception as e:
                print(f"    [ERROR] Failed to process {img_name}: {e}")

    # Calculate Final Metrics
    print("\n============================================")
    print("             FINAL ACCURACY REPORT          ")
    print("============================================")
    
    if total_images == 0:
        print("No images evaluated.")
        return

    overall_accuracy = (correct_predictions / total_images) * 100
    print(f"Overall Accuracy: {overall_accuracy:.2f}% ({correct_predictions}/{total_images})")
    print("--------------------------------------------")
    print(f"{'Class':<15} | {'Accuracy':<10} | {'Samples'}")
    print("--------------------------------------------")
    
    for cls in CLASSES:
        stats = class_stats[cls]
        if stats['total'] > 0:
            acc = (stats['correct'] / stats['total']) * 100
            print(f"{cls:<15} | {acc:>6.1f}%    | {stats['total']}")
        else:
            print(f"{cls:<15} |   N/A      | 0")
            
    print("--------------------------------------------")
    print("Note: This heuristic model is optimized for feature demonstration.")
    print("Real-world accuracy requires training the XGBoost/CNN on the full dataset.")

if __name__ == "__main__":
    evaluate_accuracy()
