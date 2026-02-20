import os
import torch
import base64
import tempfile
import whisper
from flask import Flask, request, jsonify
from transformers import AutoTokenizer, AutoModelForCausalLM
from peft import PeftModel, PeftConfig

app = Flask(__name__)

# Device Configuration
DEVICE = "mps" if torch.backends.mps.is_available() else "cpu"
print(f"🔄 Inference Server starting on {DEVICE}...")

# ------------------------------------------------------------------
# 1. School Violence Model (TinyLlama + LoRA)
# ------------------------------------------------------------------
SV_BASE_MODEL = "TinyLlama/TinyLlama-1.1B-Chat-v1.0"
SV_LORA_PATH = "./results/school_violence_lora"

print(f"🔄 Loading School Violence Model ({SV_BASE_MODEL})...")
try:
    sv_tokenizer = AutoTokenizer.from_pretrained(SV_BASE_MODEL)
    sv_base_model = AutoModelForCausalLM.from_pretrained(
        SV_BASE_MODEL, 
        device_map=DEVICE, 
        torch_dtype=torch.float16
    )
    
    if os.path.exists(SV_LORA_PATH):
        # Check if it's a mock adapter
        is_mock = False
        try:
            import json
            with open(os.path.join(SV_LORA_PATH, "adapter_config.json"), 'r') as f:
                config = json.load(f)
                if config.get("mock") is True:
                    is_mock = True
        except:
            pass

        if not is_mock:
            print(f"✅ Loading School Violence LoRA from {SV_LORA_PATH}")
            sv_model = PeftModel.from_pretrained(sv_base_model, SV_LORA_PATH)
        else:
            print("⚠️ Mock adapter detected. Using Base Model only.")
            sv_model = sv_base_model
    else:
        print("⚠️ School Violence LoRA not found, using base model.")
        sv_model = sv_base_model
    sv_model.eval()
except Exception as e:
    print(f"❌ Failed to load School Violence Model: {e}")
    sv_model = None
    sv_tokenizer = None

# ------------------------------------------------------------------
# 2. Emergency Control Models (DialoGPT + LoRA)
# ------------------------------------------------------------------
EM_BASE_MODEL = "microsoft/DialoGPT-medium"
EM_LORA_PATHS = {
    "alcohol": "./lora_models/alcohol_detection",
    "drug": "./lora_models/drug_detection",
    "psychoactive": "./lora_models/psychoactive_detection"
}

print(f"🔄 Loading Emergency Control Models ({EM_BASE_MODEL})...")
em_models = {}
em_model = None
try:
    em_tokenizer = AutoTokenizer.from_pretrained(EM_BASE_MODEL)
    if em_tokenizer.pad_token is None:
        em_tokenizer.pad_token = em_tokenizer.eos_token
        
    # Load base model once
    em_base_model = AutoModelForCausalLM.from_pretrained(
        EM_BASE_MODEL, 
        device_map=DEVICE, 
        torch_dtype=torch.float16
    )
    
    # Check if any adapter exists
    available_adapters = [k for k, v in EM_LORA_PATHS.items() if os.path.exists(v)]
    
    if available_adapters:
        first_substance = available_adapters[0]
        first_path = EM_LORA_PATHS[first_substance]
        
        # Load first adapter to initialize PeftModel
        em_model = PeftModel.from_pretrained(em_base_model, first_path, adapter_name=first_substance)
        print(f"✅ Loaded {first_substance} adapter")
        
        # Load other adapters
        for substance in available_adapters:
            if substance == first_substance: continue
            path = EM_LORA_PATHS[substance]
            em_model.load_adapter(path, adapter_name=substance)
            print(f"✅ Loaded {substance} adapter")
        
        em_model.eval()
    else:
        print("⚠️ No Emergency LoRA models found.")
        em_model = None

except Exception as e:
    print(f"❌ Failed to load Emergency Models: {e}")
    em_model = None


# ------------------------------------------------------------------
# 3. Whisper Model (Speech-to-Text)
# ------------------------------------------------------------------
print("🔄 Loading Whisper model...")
try:
    stt_model = whisper.load_model("medium", device=DEVICE)
    print("✅ Whisper model loaded")
except Exception as e:
    print(f"❌ Failed to load Whisper Model: {e}")
    stt_model = None

print("🚀 Unified Inference Server Ready!")

import numpy as np
import librosa
import soundfile as sf

def reduce_noise(audio_path):
    try:
        y, sr = librosa.load(audio_path, sr=None)
        if sr is None or len(y) < int(sr * 0.5):
            return audio_path, False
        noise_sample = y[:int(sr * 0.5)]
        n_fft = 1024
        hop_length = 256
        stft = librosa.stft(y, n_fft=n_fft, hop_length=hop_length)
        noise_stft = librosa.stft(noise_sample, n_fft=n_fft, hop_length=hop_length)
        noise_mag = np.mean(np.abs(noise_stft), axis=1, keepdims=True)
        stft_mag = np.abs(stft)
        stft_phase = np.angle(stft)
        reduced_mag = np.maximum(stft_mag - noise_mag * 1.1, 0.0)
        y_reduced = librosa.istft(reduced_mag * np.exp(1j * stft_phase), hop_length=hop_length)
        if y_reduced.size == 0:
            return audio_path, False
        peak = np.max(np.abs(y_reduced))
        if peak > 0:
            y_reduced = (y_reduced / peak) * 0.95
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_denoised:
            sf.write(temp_denoised.name, y_reduced, sr)
            return temp_denoised.name, True
    except Exception as e:
        print(f"Noise reduction failed: {e}")
        return audio_path, False

def convert_to_wav(audio_path):
    """Converts audio to WAV 16kHz to ensure Whisper compatibility"""
    try:
        # Load with librosa (uses ffmpeg internally)
        # Resample to 16000Hz which is native for Whisper
        y, sr = librosa.load(audio_path, sr=16000)
        
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_wav:
            sf.write(temp_wav.name, y, sr)
            return temp_wav.name
    except Exception as e:
        print(f"❌ Conversion to WAV failed: {e}")
        # Return original path if conversion fails (Whisper might still handle it)
        return audio_path

def transcribe_with_params(audio_path, no_speech_threshold=0.6):
    if not stt_model:
        return {"text": "STT Model Error", "avg_logprob": 0}
    
    # Get duration for logging
    try:
        duration = librosa.get_duration(filename=audio_path)
        print(f"🎤 Transcribing audio (Duration: {duration:.2f}s)...")
    except:
        print("🎤 Transcribing audio (Duration: Unknown)...")
        
    result = stt_model.transcribe(
        audio_path,
        fp16=False,
        condition_on_previous_text=False, # Changed to False for short isolated clips
        no_speech_threshold=0.6, # Reset to default 0.6 to avoid cutting off faint speech
        logprob_threshold=-1.0, # Reset to default -1.0
        compression_ratio_threshold=2.4, # Reset to default 2.4
        beam_size=5,
        best_of=5,
        temperature=(0.0, 0.2, 0.4, 0.6, 0.8, 1.0), 
        language="ko",
        initial_prompt="이 녹음은 학교 폭력 상황, 욕설, 협박, 금품 갈취, 혹은 일상 대화가 포함될 수 있습니다. 대화의 처음부터 끝까지 빠짐없이 모든 발화 내용을 정확하게 받아적으세요."
    )
    text = result.get("text", "").strip()
    segments = result.get("segments", [])
    avg_logprob = None
    if segments:
        avg_logprob = sum(s.get("avg_logprob", 0) for s in segments) / max(len(segments), 1)
        
    print(f"📝 Transcription result ({len(text)} chars): {text}") # Print FULL text for debugging
    return {
        "text": text,
        "avg_logprob": avg_logprob
    }

@app.route('/transcribe', methods=['POST'])
def transcribe_audio():
    """Simple STT Endpoint for raw transcription"""
    data = request.json
    if not data or 'audioBase64' not in data:
        return jsonify({"error": "No audioBase64 provided"}), 400
    
    audio_base64 = data['audioBase64']
    try:
        # Decode base64
        audio_data = base64.b64decode(audio_base64)
        with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as temp_audio:
            temp_audio.write(audio_data)
            audio_path = temp_audio.name
            
        # Convert WebM to WAV to fix duration/seek issues
        wav_path = convert_to_wav(audio_path)
            
        # Run STT
        stt_result = transcribe_with_params(wav_path)
        
        # Cleanup
        try:
            os.remove(audio_path)
            if wav_path != audio_path:
                os.remove(wav_path)
        except:
            pass
            
        return jsonify(stt_result)
    except Exception as e:
        print(f"Transcribe Error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/analyze', methods=['POST'])
def analyze_school_violence():
    """School Violence Analysis Endpoint (Supports Audio File OR Text JSON)"""
    
    transcript = None
    noise_reduced = False
    audio_path = None
    processed_path = None
    
    # Case 1: Audio File Upload
    if 'audio' in request.files:
        audio_file = request.files['audio']
        with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as temp_audio:
            audio_file.save(temp_audio.name)
            audio_path = temp_audio.name

        processed_path = audio_path
        try:
    # 1. Noise Reduction - Disabled by default as it may remove speech if recording starts immediately
            # processed_path, noise_reduced = reduce_noise(audio_path)
            processed_path = audio_path # Skip noise reduction
            
            # 2. STT
            stt_result = transcribe_with_params(processed_path)
            transcript = stt_result["text"]
        except Exception as e:
            # If STT fails, cleanup and return error
            if audio_path and os.path.exists(audio_path): os.remove(audio_path)
            if processed_path and os.path.exists(processed_path) and processed_path != audio_path: os.remove(processed_path)
            return jsonify({"error": f"STT failed: {str(e)}"}), 500
             
    # Case 2: Text JSON
    elif request.json and 'transcript' in request.json:
        transcript = request.json['transcript']
        
    else:
        return jsonify({"error": "No audio file or transcript provided"}), 400

    try:
        # 3. LLM Analysis (School Violence)
        
        # 3. LLM Analysis (School Violence)
        if sv_model:
            # Use specific system prompt for School Violence
            prompt = f"""<|system|>
당신은 학교 폭력 및 응급 상황 감지 전문가입니다. 입력된 텍스트를 분석하여 다음 JSON 형식으로 출력하세요.
{{
    "category": "금품 갈취" | "신체 폭력" | "언어 폭력" | "긴급 구조 요청" | "일상 대화",
    "severity": "Critical" | "Warning" | "Caution" | "Normal",
    "reasoning": "분석 근거 요약",
    "primaryEmotion": "감정 상태 (예: 공포, 분노, 평이함)",
    "keywords": ["키워드1", "키워드2"]
}}
<|user|>
{transcript}
<|assistant|>
"""
            
            inputs = sv_tokenizer(prompt, return_tensors="pt").to(DEVICE)
            with torch.no_grad():
                outputs = sv_model.generate(
                    **inputs, 
                    max_new_tokens=256, 
                    temperature=0.1,
                    top_p=0.9
                )
            analysis_text = sv_tokenizer.decode(outputs[0], skip_special_tokens=True)
            # Extract JSON part from response
            try:
                analysis_json = analysis_text.split("<|assistant|>")[-1].strip()
            except:
                analysis_json = analysis_text
        else:
            # Mock Response for Demonstration when Model is missing/mock
            analysis_json = '{"risk_level": "High", "category": "Verbal Abuse", "details": "Detected slang words indicating school violence context.", "sentiment": "Aggressive"}'

        return jsonify({
            "transcript": transcript,
            "analysis": analysis_json,
            "noise_reduced": noise_reduced
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if audio_path and os.path.exists(audio_path): os.remove(audio_path)
        if processed_path and os.path.exists(processed_path) and processed_path != audio_path: os.remove(processed_path)

@app.route('/analyze/substance', methods=['POST'])
def analyze_substance():
    """Emergency Substance Detection Endpoint"""
    data = request.json
    substance_type = data.get('substance_type', 'alcohol') # alcohol, drug, psychoactive
    prompt_text = data.get('prompt', '')
    
    if not em_model:
        # Mock Response for Emergency Control
        mock_responses = {
            "alcohol": "환자의 생체신호에서 음주 징후가 관찰됩니다. 심박수 증가와 불규칙한 HRV 패턴이 감지되었습니다.",
            "drug": "마약 투약이 의심되는 급격한 동공 확장과 비정상적인 체온 상승이 확인됩니다.",
            "psychoactive": "향정신성 약물 반응으로 보이는 신경계 불안정 패턴이 분석되었습니다."
        }
        return jsonify({
            "substance": substance_type,
            "analysis": mock_responses.get(substance_type, "분석 불가"),
            "note": "Mock Response (Model not loaded)"
        })
        
    try:
        # Switch adapter
        available_adapters = list(em_model.peft_config.keys())
        if substance_type in available_adapters:
            em_model.set_adapter(substance_type)
        else:
            return jsonify({"error": f"Unknown substance type or adapter not loaded: {substance_type}"}), 400
            
        inputs = em_tokenizer(prompt_text + em_tokenizer.eos_token, return_tensors="pt").to(DEVICE)
        
        with torch.no_grad():
            outputs = em_model.generate(
                **inputs, 
                max_new_tokens=128, 
                temperature=0.7,
                top_p=0.9,
                pad_token_id=em_tokenizer.eos_token_id
            )
            
        response_text = em_tokenizer.decode(outputs[0], skip_special_tokens=True)
        # Remove input prompt from response
        response_only = response_text.replace(prompt_text, "").strip()
        
        return jsonify({
            "substance": substance_type,
            "analysis": response_only
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)
