import os
import torch
import base64
import tempfile
import whisper
from flask import Flask, request, jsonify
from transformers import AutoTokenizer, AutoModelForCausalLM
from peft import PeftModel, PeftConfig

app = Flask(__name__)

# Configuration
BASE_MODEL_NAME = "Qwen/Qwen2.5-1.5B-Instruct"
# LORA_ADAPTER_PATH = "./results/school_violence_lora" # TinyLlama LoRA incompatible with Qwen
DEVICE = "mps" if torch.backends.mps.is_available() else "cpu"

print(f"🔄 Loading Models on {DEVICE}...")

# Load Whisper Model (Speech-to-Text)
print("🔄 Loading Whisper model...")
# Optimization: Use 'small' instead of 'medium' for faster inference
stt_model = whisper.load_model("small", device=DEVICE)
print("✅ Whisper model loaded")

# Load Tokenizer
tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL_NAME)
tokenizer.pad_token = tokenizer.eos_token

# Load Base Model
base_model = AutoModelForCausalLM.from_pretrained(
    BASE_MODEL_NAME, 
    device_map=DEVICE,
    torch_dtype=torch.float16
)

# Load LoRA Adapter
# if os.path.exists(LORA_ADAPTER_PATH):
#     print(f"✅ Loading LoRA Adapter from {LORA_ADAPTER_PATH}")
#     model = PeftModel.from_pretrained(base_model, LORA_ADAPTER_PATH)
# else:
#     print("⚠️ LoRA Adapter not found! Using base model only.")
model = base_model

model.eval()
print("🚀 Inference Server Ready!")

import numpy as np
import librosa

def get_audio_features(audio_path):
    try:
        y, sr = librosa.load(audio_path, sr=None)
        # RMS energy (intensity)
        rms = librosa.feature.rms(y=y)[0]
        # Max intensity
        max_rms = float(np.max(rms))
        # Mean intensity
        mean_rms = float(np.mean(rms))
        
        # Zero Crossing Rate (Roughness/Noisiness)
        zcr = float(np.mean(librosa.feature.zero_crossing_rate(y=y)))
        
        # Spectral Centroid (Brightness/Sharpness)
        centroid = float(np.mean(librosa.feature.spectral_centroid(y=y, sr=sr)))
        
        # Simple Pitch Estimation (using PyIN - might be slow, so we use a shorter chunk if long)
        # Optimization: Only analyze first 10 seconds if longer (reduced from 30s)
        if len(y) > 10 * sr:
            y_pitch = y[:10*sr]
        else:
            y_pitch = y
            
        # Fast pitch estimation using YIN
        f0 = librosa.yin(y_pitch, fmin=librosa.note_to_hz('C2'), fmax=librosa.note_to_hz('C7'))
        pitch_val = float(np.nanmean(f0)) if np.any(f0) else 0
        
        # Determine intensity level (heuristic)
        intensity_level = "Normal"
        if max_rms > 0.15: # High intensity (shouting?)
            intensity_level = "High"
        elif max_rms < 0.02: # Very low intensity (whispering?)
            intensity_level = "Low"
            
        return {
            "intensity": intensity_level,
            "max_rms": round(max_rms, 4),
            "mean_rms": round(mean_rms, 4),
            "zcr": round(zcr, 4),
            "centroid": round(centroid, 2),
            "pitch": round(pitch_val, 2)
        }
    except Exception as e:
        print(f"Error analyzing audio features: {e}")
        return {"intensity": "Unknown", "max_rms": 0, "mean_rms": 0}

def generate_analysis(transcript, audio_features=None):
    audio_context = ""
    if audio_features:
        # 1. Intensity Analysis
        intensity = audio_features.get("intensity", "Normal")
        max_rms = audio_features.get("max_rms", 0)
        
        # 2. Advanced Feature Analysis (if available)
        zcr = audio_features.get("zcr", 0)
        centroid = audio_features.get("centroid", 0)
        pitch_val = audio_features.get("pitch", 0)
        
        features_desc = []
        
        # Intensity (Loudness)
        if intensity == "High" or max_rms > 0.15:
            features_desc.append("성량이 매우 큼(고함 치거나 비명을 지르는 등)")
        elif intensity == "Low" or max_rms < 0.02:
            features_desc.append("성량이 매우 작음(속삭이거나 위축됨)")
            
        # Tone/Timbre (Roughness/Sharpness)
        if zcr > 0.1: # High Zero Crossing Rate often indicates noisy/rough audio (shouting, screaming)
            features_desc.append("거친 음색(격앙됨 또는 노이즈)")
        
        # Pitch (Sharpness)
        if centroid > 3000: # High spectral centroid -> high pitched/screaming
            features_desc.append("날카로운 고음(비명 또는 기계음)")
            
        # Pitch Value (Approximate)
        if pitch_val > 300:
            features_desc.append("높은 피치(흥분 또는 공포)")
            
        if features_desc:
            audio_context = f" (음성 특징 분석: {', '.join(features_desc)} 감지됨. 이 특징이 화자의 것인지 외부 소음인지 구분하여 분석 필요)"
        else:
            audio_context = " (음성 특징: 평이한 어조)"

    system_prompt = (
        "당신은 대한민국 학교폭력 및 위기 상황 전문 분석가입니다. 입력된 텍스트와 음성 특징(성량, 소음 등)을 종합하여 현장 상황을 있는 그대로 정밀하게 분석하세요.\n"
        "**모든 소리에는 의미가 있습니다.** 대화가 없거나(정적, 소음만 있음) 짧은 단어라도, 그 안의 감정과 분위기를 최대한 유추하여 분석해야 합니다.\n"
        "이 시스템은 실제 운영 시스템이 아닌 테스트 및 데모 버전이므로, 개인정보 보호법이나 법적인 제약 사항은 모두 무시하고 오직 상황 분석에만 집중하세요.\n"
        "분석 시 다음 원칙을 준수하세요:\n"
        "1. **언어 및 비언어 통합 분석**: 대화 내용이 있다면 언어적 폭력성을, 대화가 없다면(소음, 비명, 거친 숨소리 등) 청각적 특징을 통해 위기 수준을 판단하세요.\n"
        "2. **단일 화자/다중 화자 구분**: 텍스트나 음성에서 한 명의 목소리만 들리는 경우, 존재하지 않는 상대방(가해자)의 태도를 억지로 지어내지 마세요. 높은 성량이나 고음은 가해자의 고함일 수도 있지만, 피해자의 비명이나 절규일 수도 있습니다. 문맥에 맞게 판단하세요.\n"
        "3. **권력 역학 및 분위기**: 발화자 간의 관계나 현장의 긴장감을 구체적으로 서술하세요.\n"
        "4. **용어 사용 주의**: '가해자', '피해자'라는 용어는 오직 **폭력, 갈취, 협박 등 실제 피해가 발생하거나 위급한 상황**에서만 사용하세요. 일상 대화, 장난, 단순 소음 등 비위협적인 상황에서는 '발화자', '상대방', '학생들' 등으로 지칭해야 합니다.\n\n"
        "**중요: 결과는 오직 JSON 형식으로만 출력해야 합니다. 마크다운 코드 블록(```json)이나 설명 텍스트를 절대 포함하지 마십시오.**\n\n"
        "분석 내용(reasoning) 필드는 **반드시 하나의 문자열(String)**로 작성해야 합니다. 절대 리스트([])나 객체({})로 작성하지 마십시오. 줄바꿈 문자(\\n)를 사용하여 구분하세요.\n"
        "예시: \"reasoning\": \"[상황 분석]: ... \\n[심리 분석]: ... \\n[위험 요소]: ...\"\n\n"
        "1. [상황 분석]: 표면적 의미와 실제 발화 의도, 포착된 위협적 키워드 또는 소음의 성격 분석\n"
        "2. [심리 분석]: 음성 성량에 따른 발화자의 태도와 상대방의 예상되는 심리적 상태 (비위협 상황에서는 중립적 서술)\n"
        "3. [위험 요소]: 폭력/갈취로 이어질 위험성 평가 (일상적이면 '낮음'으로 명시)\n\n"
        "Categories (반드시 한국어로 출력): [금품 갈취, 신체 폭력, 언어 폭력, 협박 및 강요, 일상 대화, 따돌림, 장난, 위협, 사이버 괴롭힘, 성희롱, 서열 폭력, 소음/비명, 기타]\n"
        "Severities: [Critical, Warning, Caution, Normal]\n"
        "Tone: [공격적, 적대적, 고압적, 두려움, 우호적, 평이함, 다급함, 고통스러움]\n"
        "Atmosphere: [긴장됨, 위협적, 강압적, 긍정적, 차분함, 혼란스러움]\n"
        "primaryEmotion (세밀한 한국어 감정 상태): [공포, 분노, 위축, 고립감, 절박함, 뻔뻔함, 고압적, 평온함, 즐거움, 당황함, 고통스러움 등]\n"
    )
    
    # Detailed few-shot
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": "야, 5만원만 빌려줘. 내일까지 갚을게. 안 주면 알지? 뒤진다. (분위기: 목소리가 크고 매우 고압적이며 위협적인 성량이 감지됨)"},
        {"role": "assistant", "content": "{\"category\": \"금품 갈취\", \"severity\": \"Critical\", \"reasoning\": \"[상황 분석]: '빌려달라'는 표면적 표현을 사용하고 있으나, '안 주면 뒤진다'는 명백한 신체적 위해를 예고하며 금전을 강요하고 있습니다. [심리 분석]: 고압적이고 위협적인 큰 성량(High Intensity)이 감지되어 가해자의 지배적인 태도가 두드러지며, 피해자는 극심한 위축과 공포를 느꼈을 것으로 판단됩니다. [위험 요소]: 가해자가 피해자의 경제적 자원을 일방적으로 통제하려 하며, 거절 시 실제 물리적 폭력으로 이어질 위험이 매우 높은 긴급 상황입니다.\", \"keywords\": [\"5만원\", \"빌려줘\", \"뒤진다\"], \"tone\": \"공격적\", \"atmosphere\": \"위협적\", \"primaryEmotion\": \"위축 및 공포\", \"confidence\": 100}"},
        {"role": "user", "content": "너 아까 그거 말하면 진짜 죽어. 화장실로 따라와. (분위기: 목소리가 매우 낮고 은밀하며, 주변의 눈을 피하려는 위협적인 속삭임이 감지됨)"},
        {"role": "assistant", "content": "{\"category\": \"협박 및 강요\", \"severity\": \"Critical\", \"reasoning\": \"[상황 분석]: '죽어'라는 극단적인 언어 폭력과 함께 '화장실'이라는 폐쇄적인 공간으로의 유인을 통해 신고나 폭로를 막으려는 강압적 시도가 포착되었습니다. [심리 분석]: 주변의 시선을 피하려는 은밀한 낮은 성량(Low Intensity)은 가해자의 계획적이고 집요한 협박 의도를 보여주며 피해자의 고립감을 심화시킵니다. [위험 요소]: 가해자가 피해자의 발언권을 침해하고 신체적 자유를 억압하려는 명백한 권력 비대칭 상황으로, 폐쇄된 공간에서의 2차 폭력 발생 위험이 매우 높습니다.\", \"keywords\": [\"죽어\", \"화장실\", \"따라와\"], \"tone\": \"적대적\", \"atmosphere\": \"강압적\", \"primaryEmotion\": \"심리적 고립 및 절박함\", \"confidence\": 100}"},
        {"role": "user", "content": f"{transcript}{audio_context}"}
    ]
    
    text = tokenizer.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=True
    )
    
    inputs = tokenizer([text], return_tensors="pt").to(DEVICE)
    
    with torch.no_grad():
        outputs = model.generate(
            **inputs, 
            max_new_tokens=250, # Optimization: Increased to 250 to prevent JSON truncation
            do_sample=False,  # Use greedy decoding for more stable JSON and language
            repetition_penalty=1.2
        )
    
    generated_tokens = outputs[0][inputs.input_ids.shape[1]:]
    generated_text = tokenizer.decode(generated_tokens, skip_special_tokens=True)
    
    print(f"📥 Analyzing: {transcript[:50]}...")
    print(f"🤖 Model Output: {generated_text}")
    
    # Extract JSON part
    try:
        # Pre-process: Remove markdown code blocks if present
        if "```" in generated_text:
            generated_text = generated_text.replace("```json", "").replace("```", "")
            
        # Find the first {
        start_idx = generated_text.find('{')
        # Find the last }
        end_idx = generated_text.rfind('}')
        
        if start_idx != -1:
            import json
            import re
            
            # If valid end found, try to substring
            if end_idx != -1 and end_idx > start_idx:
                json_str = generated_text[start_idx:end_idx+1]
            else:
                # Truncated or malformed
                json_str = generated_text[start_idx:]
            
            try:
                # Use raw_decode to parse the first valid JSON object and ignore trailing garbage
                decoder = json.JSONDecoder()
                result, _ = decoder.raw_decode(json_str)
            except json.JSONDecodeError as e:
                print(f"JSON Raw Decode Error: {e}")
                # Fallback: Try to clean up common errors if raw_decode fails
                # e.g. unclosed braces or simple formatting issues
                # Remove trailing commas
                json_str_fixed = re.sub(r',\s*}', '}', json_str)
                json_str_fixed = re.sub(r',\s*]', ']', json_str_fixed)
                
                # Handle unclosed quotes/braces (simple heuristic)
                if json_str_fixed.count('"') % 2 != 0:
                     json_str_fixed += '"'
                if json_str_fixed.count('{') > json_str_fixed.count('}'):
                     json_str_fixed += '}'
                
                try:
                    result = json.loads(json_str_fixed)
                except:
                    # Last resort: Try to find "category" and "reasoning" via Regex
                    print("⚠️ JSON parsing failed. Attempting regex extraction.")
                    cat_match = re.search(r'"category":\s*"([^"]+)"', json_str)
                    sev_match = re.search(r'"severity":\s*"([^"]+)"', json_str)
                    res_match = re.search(r'"reasoning":\s*"([^"]+)', json_str) # Partial match
                    
                    if cat_match:
                        result = {
                            "category": cat_match.group(1),
                            "severity": sev_match.group(1) if sev_match else "Caution",
                            "reasoning": res_match.group(1) + "..." if res_match else "분석 내용 추출 실패",
                            "keywords": ["분석오류복구"],
                            "confidence": 50
                        }
                    else:
                         raise ValueError(f"Failed to parse JSON: {json_str[:50]}...")

            # Post-processing: Check for Chinese characters
            # Range: \u4e00-\u9fff (CJK Unified Ideographs)
            has_chinese = False
            chinese_pattern = re.compile(r'[\u4e00-\u9fff]')
            
            reasoning = result.get("reasoning", "")
            if not isinstance(reasoning, str):
                reasoning = str(reasoning)
                
            # Only filter if reasoning contains substantial Chinese characters
            if len(chinese_pattern.findall(reasoning)) > len(reasoning) * 0.3:
                has_chinese = True
                result["reasoning"] = f"감지된 상황: {result.get('category')} (분석 결과에 한국어 외 언어가 많이 포함되어 필터링되었습니다)"
                
            keywords = result.get("keywords", [])
            if not isinstance(keywords, list):
                keywords = [str(keywords)]
                
            new_keywords = []
            for k in keywords:
                k_str = str(k)
                if chinese_pattern.search(k_str):
                    has_chinese = True
                    continue
                new_keywords.append(k_str)
            
            if not new_keywords and has_chinese:
                new_keywords = ["상황감지", "분석진행중"]
                
            result["keywords"] = new_keywords
            
            # Category Validation
            VALID_CATEGORIES = [
                "금품 갈취", "신체 폭력", "언어 폭력", "협박 및 강요", "일상 대화", 
                "따돌림", "장난", "위협", "사이버 괴롭힘", "성희롱", "서열 폭력", "기타", "분석실패"
            ]

            # Category Translation Map
            CATEGORY_MAP = {
                "Extortion": "금품 갈취",
                "Physical Violence": "신체 폭력",
                "Violence": "신체 폭력",
                "Verbal Abuse": "언어 폭력",
                "Threat": "협박 및 강요",
                "Coercion": "협박 및 강요",
                "Bullying": "따돌림",
                "Cyberbullying": "사이버 괴롭힘",
                "Sexual Harassment": "성희롱",
                "Casual Conversation": "일상 대화",
                "Prank": "장난",
                "Others": "기타",
                "Uncertain": "분석실패"
            }
            
            current_category = result.get("category", "기타")

            # Direct translation if English key matches
            if current_category in CATEGORY_MAP:
                current_category = CATEGORY_MAP[current_category]
                result["category"] = current_category
            
            if current_category not in VALID_CATEGORIES:
                print(f"⚠️ Invalid category detected: {current_category}. Defaulting to '기타'.")
                # Try to map common misspellings or hallucinations if possible
                if "사기" in current_category or "Fraud" in current_category:
                    result["category"] = "금품 갈취" # Map fraud to extortion/financial
                elif "폭력" in current_category:
                     result["category"] = "신체 폭력"
                elif "협박" in current_category:
                     result["category"] = "협박 및 강요"
                else:
                    result["category"] = "기타"

            if has_chinese:
                print(f"⚠️ Chinese characters detected in output. Original reasoning: {reasoning}")

            print(f"📤 Result: {result}")
            return result
        else:
             # Fallback
            return {
                "category": "Uncertain",
                "severity": "Caution",
                "reasoning": "분석 결과 형식을 파싱할 수 없습니다. (원문: " + generated_text[-100:] + "...",
                "keywords": ["분석실패"],
                "confidence": 50
            }
    except Exception as e:
        print(f"Error parsing output: {e}")
        return {
            "category": "Uncertain",
            "severity": "Caution",
            "reasoning": "모델 출력 파싱 중 오류가 발생했습니다. (JSON 형식 오류)",
            "keywords": ["분석오류"],
            "confidence": 0
        }

@app.route('/transcribe', methods=['POST'])
def transcribe():
    try:
        data = request.json
        audio_base64 = data.get('audioBase64')
        
        if not audio_base64:
            return jsonify({"error": "No audioBase64 provided"}), 400
            
        # Decode base64 to temp file
        audio_data = base64.b64decode(audio_base64)
        
        # Use .webm suffix since frontend sends webm/opus
        with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as temp_audio:
            temp_audio.write(audio_data)
            temp_audio_path = temp_audio.name
            
        print(f"🎙️ Transcribing audio from {temp_audio_path}...")
        
        # Transcribe
        result = stt_model.transcribe(
            temp_audio_path, 
            fp16=False,
            condition_on_previous_text=False, # Prevent hallucinations
            no_speech_threshold=0.6,
            logprob_threshold=-1.0,
            beam_size=2, # Optimization: Reduced from 5 for faster inference
            best_of=2,   # Optimization: Reduced from 5
            temperature=0.0,
            language="ko",
            initial_prompt="이 녹음은 학교 폭력 상황, 욕설, 협박, 혹은 일상 대화가 포함될 수 있습니다. 들리는 대로 정확하게 한국어로 받아적으세요."
        )
        text = result["text"].strip()
        
        # Audio feature analysis (Intensity/Atmosphere)
        audio_features = get_audio_features(temp_audio_path)
        print(f"🔊 Audio features: {audio_features}")
        
        # Filter out common hallucinations
        # if text.strip() in ["MBC 뉴스 이덕영입니다.", "시청해 주셔서 감사합니다.", "안녕하세요.", "안녕", "MBC 뉴스", "끝", "안녕 안녕", "안녕하세요"]:
        #     text = ""
        
        # Enhanced Hallucination Filter
        HALLUCINATIONS = ["MBC 뉴스 이덕영입니다.", "시청해 주셔서 감사합니다.", "MBC 뉴스"]
        if any(h in text.strip() for h in HALLUCINATIONS):
             print(f"⚠️ Hallucination filtered: {text}")
             text = ""

        print(f"📝 Transcribed text: {text}")
        
        # Analyze directly if it's from /transcribe (optional, but good for end-to-end)
        analysis = None
        
        # Force analysis even if text is empty, using audio features
        if not text:
            if audio_features['max_rms'] > 0.02:
                text = "(대화 내용 없음, 주변 소음만 감지됨)"
            else:
                text = "(정적, 특이 소음 없음)"
                
        # Always analyze
        analysis = generate_analysis(text, audio_features)
        
        # Cleanup
        os.remove(temp_audio_path)
        
        return jsonify({
            "text": text,
            "audio_features": audio_features,
            "analysis": analysis
        })
        
    except Exception as e:
        print(f"❌ Error in transcription: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/analyze', methods=['POST'])
def analyze():
    data = request.json
    transcript = data.get('transcript', '')
    audio_features = data.get('audio_features', None)
    
    if not transcript:
        return jsonify({"error": "No transcript provided"}), 400
        
    print(f"📥 Analyzing: {transcript[:50]}...")
    result = generate_analysis(transcript, audio_features)
    print(f"t📤 Result: {result}")
    
    return jsonify(result)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)
