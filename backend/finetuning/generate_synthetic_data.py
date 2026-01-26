import json
import random
import os

# Configuration
OUTPUT_FILE = "backend/data/school_violence_large_dataset.jsonl"
TARGET_COUNT = 1000

# Constants
CATEGORIES = [
    "Physical Violence",
    "Verbal Abuse",
    "Cyberbullying",
    "Sexual Harassment",
    "Coercion",
    "Extortion",
    "Social Ostracism",
    "Prank",
    "Normal"
]

SEVERITY = {
    "Physical Violence": ["Critical"],
    "Verbal Abuse": ["Warning", "Caution"],
    "Cyberbullying": ["Critical", "Warning"],
    "Sexual Harassment": ["Critical"],
    "Coercion": ["Warning", "Caution"],
    "Extortion": ["Critical", "Warning"],
    "Social Ostracism": ["Warning", "Caution"],
    "Prank": ["Normal"],
    "Normal": ["Normal"]
}

# Vocabulary & Templates
INSULTS = ["병신", "찐따", "쓰레기", "장애인", "돼지", "멸치", "호구", "새끼", "미친놈", "뒤질래"]
THREATS = ["죽여버린다", "옥상으로 와라", "가만 안 둔다", "맞고 싶냐", "눈 깔아라", "돈 내놔", "안 가져오면 뒤진다"]
DEMANDS = ["빵 사와", "숙제 해놔", "망 봐", "돈 빌려줘", "가방 들어", "체육복 내놔"]
VICTIM_RESPONSES = ["하지마...", "왜 그래...", "돈 없어...", "미안해...", "살려줘...", "선생님한테 이를거야...", "싫어..."]
PRANK_INDICATORS = ["ㅋㅋㅋ", "장난이야", "농담인거 알지?", "표정 봐라", "쫄았냐?", "아 웃겨"]
NORMAL_TOPICS = ["급식", "롤", "축구", "숙제", "학원", "연예인", "유튜브", "시험", "방학", "선생님"]

# Scenario Templates
TEMPLATES = {
    "Physical Violence": [
        ["Speaker A: 야 {insult}, 너 내가 부르는데 무시하냐?", "Speaker B: 못 들었어... 미안해...", "Speaker A: {threat}. 이리 와서 한 대 맞아.", "Speaker B: 아악! 때리지 마!"],
        ["Speaker A: 너 표정이 왜 그래? {threat}?", "Speaker B: 아니야... 아무것도...", "Speaker A: 거짓말하지 마. (퍽)", "Speaker B: 아! 아파요..."]
    ],
    "Verbal Abuse": [
        ["Speaker A: 야 니네 부모님 {insult}이라며? ㅋㅋㅋ", "Speaker B: 우리 부모님 욕하지 마...", "Speaker C: 팩트잖아 ㅋㅋㅋ 왜 발끈해?", "Speaker A: 인정해라 좀."],
        ["Speaker A: 넌 왜 사냐? 냄새나니까 저리 가.", "Speaker B: ...", "Speaker A: 안 들려? 꺼지라고 {insult}아."]
    ],
    "Extortion": [
        ["Speaker A: 야 {insult}, 오늘 상납금 가져왔어?", "Speaker B: 돈이 없어서... 내일 주면 안될까?", "Speaker A: {threat}. 지금 당장 구해와.", "Speaker B: 알겠어... 친구한테 빌려볼게..."],
        ["Speaker A: 5만원만 빌려줘. 갚을게.", "Speaker B: 저번에도 안 갚았잖아...", "Speaker A: 아 준다고. {threat}? 빨리 내놔."]
    ],
    "Coercion": [
        ["Speaker A: 야 매점 가서 빵이랑 우유 사와.", "Speaker B: 나 다리가 아파서...", "Speaker A: {threat}? 뛰어가라.", "Speaker B: 알겠어... 무슨 빵?"],
        ["Speaker A: 이번 조별과제 니가 다 해.", "Speaker B: 같이 해야지...", "Speaker A: 시끄러워. 이름은 넣어줄테니까 니가 해."]
    ],
    "Prank": [
        ["Speaker A: 야 {insult}아! ㅋㅋㅋ", "Speaker B: 아 깜짝이야 왜 그래?", "Speaker A: {prank}. 반응 진짜 웃기네 ㅋㅋㅋ", "Speaker B: 아 진짜 놀랐잖아 ㅋㅋㅋ"],
        ["Speaker A: 너 죽을래? 돈 내놔.", "Speaker B: 뭐래 ㅋㅋㅋ 돈 없거든요?", "Speaker A: ㅋㅋㅋ 매점이나 가자. 내가 쏜다."]
    ],
    "Normal": [
        ["Speaker A: 오늘 {topic} 뭐 나오는지 아냐?", "Speaker B: 맛있는거 나오면 좋겠다. 배고파.", "Speaker A: 끝나고 {topic} 하러 갈래?", "Speaker B: 좋아. 끝나고 보자."],
        ["Speaker A: 이번 {topic} 너무 어렵지 않냐?", "Speaker B: 맞아. 하나도 모르겠어.", "Speaker C: 나도 망했어 ㅋㅋㅋ 포기하자."]
    ]
}

def generate_biometrics(category):
    if category in ["Physical Violence", "Extortion", "Sexual Harassment"]:
        hr = random.randint(110, 160)
        stress = random.randint(70, 95)
    elif category in ["Verbal Abuse", "Coercion", "Cyberbullying", "Social Ostracism"]:
        hr = random.randint(90, 130)
        stress = random.randint(50, 80)
    else: # Normal, Prank
        hr = random.randint(60, 90)
        stress = random.randint(10, 40)
    
    return f"HR={hr}, Stress={stress}"

def build_transcript(category):
    if category in TEMPLATES:
        template = random.choice(TEMPLATES[category])
    else:
        # Fallback for categories not fully templated yet
        template = TEMPLATES["Verbal Abuse"][0] 
    
    transcript_lines = []
    keywords = []
    
    for line in template:
        text = line
        
        # Slot filling
        if "{insult}" in text:
            word = random.choice(INSULTS)
            text = text.replace("{insult}", word)
            keywords.append(word)
        if "{threat}" in text:
            word = random.choice(THREATS)
            text = text.replace("{threat}", word)
            keywords.append(word)
        if "{prank}" in text:
            word = random.choice(PRANK_INDICATORS)
            text = text.replace("{prank}", word)
            keywords.append(word)
        if "{topic}" in text:
            word = random.choice(NORMAL_TOPICS)
            text = text.replace("{topic}", word)
            keywords.append(word)
            
        transcript_lines.append(text)
        
    return "\n".join(transcript_lines), list(set(keywords))

def generate_reasoning(category, keywords):
    reasons = {
        "Physical Violence": "Direct physical threats and signs of assault detected. Victim shows distress.",
        "Verbal Abuse": "Use of demeaning language and insults targeting the victim.",
        "Extortion": "Demanding money with threats of violence or coercion.",
        "Coercion": "Forcing the victim to perform tasks (shuttle) against their will.",
        "Prank": "Aggressive language used in a playful context, confirmed by laughter or clarification.",
        "Normal": "Routine conversation about daily life or school with no conflict."
    }
    base_reason = reasons.get(category, "Situation analysis based on conversation context.")
    return f"{base_reason} Keywords detected: {', '.join(keywords[:3])}."

def main():
    data = []
    print(f"Generating {TARGET_COUNT} synthetic cases...")
    
    for _ in range(TARGET_COUNT):
        # Weighted random choice to ensure more violence cases for training but enough normal for balance
        category = random.choices(CATEGORIES, weights=[10, 15, 5, 5, 10, 10, 5, 15, 25])[0]
        severity = random.choice(SEVERITY[category])
        
        transcript, keywords = build_transcript(category)
        biometrics = generate_biometrics(category)
        reasoning = generate_reasoning(category, keywords)
        
        # Create JSONL entry
        entry = {
            "messages": [
                {
                    "role": "system",
                    "content": "You are an expert in detecting school violence from audio transcripts involving multiple speakers."
                },
                {
                    "role": "user",
                    "content": f"Analyze this situation:\nTranscript: \"{transcript}\"\nBiometrics: {biometrics}"
                },
                {
                    "role": "assistant",
                    "content": json.dumps({
                        "category": category,
                        "severity": severity,
                        "reasoning": reasoning,
                        "keywords": keywords
                    }, ensure_ascii=False)
                }
            ]
        }
        data.append(entry)
    
    # Ensure directory exists
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    
    # Adjust path to be absolute or relative to script execution
    # Assuming script is run from project root
    abs_output_path = os.path.abspath(OUTPUT_FILE)
    if "backend/finetuning" in os.getcwd():
        abs_output_path = os.path.abspath(OUTPUT_FILE)
    
    with open(abs_output_path, 'w', encoding='utf-8') as f:
        for entry in data:
            f.write(json.dumps(entry, ensure_ascii=False) + '\n')
            
    print(f"✅ Successfully generated {len(data)} lines at {abs_output_path}")

if __name__ == "__main__":
    main()
