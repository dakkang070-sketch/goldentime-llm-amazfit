
import sys
import os

# Add the backend/dataprocessing directory to the path so imports work
sys.path.append('/Users/jace/Documents/llm/goldentime-llm/backend/dataprocessing')

try:
    from substanceDataProcessor import SubstanceDataProcessor
    
    print("Testing SubstanceDataProcessor...")
    processor = SubstanceDataProcessor()
    
    # Run only one iteration or a small subset if possible, 
    # but the class is designed to process everything.
    # We'll just run it and hope it's fast enough or fails quickly if there are errors.
    results = processor.process_all_substances()
    
    print("Test Complete!")
    print(results)

except Exception as e:
    print(f"Test Failed: {e}")
    import traceback
    traceback.print_exc()
