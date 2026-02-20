
import sys
import os
import json
from unittest.mock import MagicMock

# Mock dependencies
sys.modules["datasets"] = MagicMock()
sys.modules["peft"] = MagicMock()
sys.modules["transformers"] = MagicMock()
sys.modules["torch"] = MagicMock()
sys.modules["sklearn.metrics"] = MagicMock()

# Append path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend/finetuning'))

# Mock Tokenizer for the class __init__
class MockTokenizer:
    pad_token = None
    eos_token = None

# Now import
try:
    # We need to manually load the file because direct import might fail due to other dependencies
    # or complex imports. But let's try standard import first after mocking.
    from backend.finetuning.loraFineTuning import SubstanceDetectionDataset, BiometricToTextConverter
    
    print("Testing Emergency Control Data Generation...")
    
    # Instantiate directly
    # Note: SubstanceDetectionDataset takes tokenizer.
    dataset_obj = SubstanceDetectionDataset(tokenizer=MockTokenizer())
    
    # It automatically calls generate_synthetic_data in __init__ if no path provided
    data = dataset_obj.data
    
    # Save a sample to verify
    output_path = "backend/data/emergency_control_sample.jsonl"
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        for i, item in enumerate(data[:5]): # Save first 5
            f.write(json.dumps(item, ensure_ascii=False) + "\n")
            
    print(f"✅ Successfully generated {len(data)} samples.")
    print(f"✅ Sample saved to {output_path}")

except Exception as e:
    import traceback
    traceback.print_exc()
