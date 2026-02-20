
import sys
import os
import json

# 현재 디렉토리를 경로에 추가하여 모듈 임포트 가능하게 함
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(current_dir)

from substanceDataProcessor import SubstanceDataProcessor

def main():
    print("🚀 랜덤 데이터 생성 및 전처리 시작...")
    
    # 데이터 프로세서 초기화 (저장 경로 지정)
    # backend/processed_data 에 저장하도록 설정
    base_path = os.path.join(os.path.dirname(current_dir), 'processed_data')
    processor = SubstanceDataProcessor(base_path=base_path)
    
    # 데이터 처리 실행
    results = processor.process_all_substances()
    
    print("\n✅ 모든 데이터 처리 완료!")
    
    # 생성된 LLM 학습 데이터 경로 확인
    if results.get('alcohol'):
        llm_data_path = results['alcohol']['file_paths']['llm_data']
        print(f"📝 알코올 LLM 학습 데이터: {llm_data_path}")
        
        if os.path.exists(llm_data_path):
            with open(llm_data_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
                print(f"   - 총 {len(lines)}개 샘플 생성됨")
                if lines:
                    print(f"   - 첫 번째 샘플: {lines[0][:100]}...")

if __name__ == "__main__":
    main()
