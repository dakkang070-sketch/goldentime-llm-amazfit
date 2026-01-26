import os
import json
import argparse
import logging
import time

# Configure Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def load_dataset_mock(file_path):
    """Mock dataset loader that just reads the file to verify it exists and is valid JSONL."""
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Dataset not found at {file_path}")
    
    count = 0
    with open(file_path, 'r', encoding='utf-8') as f:
        for line in f:
            if line.strip():
                count += 1
    logger.info(f"Mock: Verified dataset file exists with {count} lines.")
    return count

def train(args):
    logger.info(f"Starting training with model: {args.model_name}")
    
    # MOCK MODE CHECK
    if args.mock:
        logger.info("⚠️  RUNNING IN MOCK MODE (No actual GPU/Torch required) ⚠️")
        
        # Verify dataset exists
        try:
            load_dataset_mock(args.data_path)
        except Exception as e:
            logger.error(f"Mock Training Failed: {e}")
            return

        print("Preparing Mock Training...")
        time.sleep(1)
        
        # Simulate training loop
        print("Training Epochs:")
        for i in range(20):
            print(f"Epoch {i+1}/20 complete")
            time.sleep(0.1)

        
        print(f"✅ Mock Training Complete. Model saved to {args.output_dir}")
        os.makedirs(args.output_dir, exist_ok=True)
        with open(os.path.join(args.output_dir, "adapter_config.json"), "w") as f:
            json.dump({"mock": True, "base_model": args.model_name, "status": "completed"}, f)
        return

    # REAL TRAINING IMPORTS
    try:
        import torch
        from datasets import Dataset
        from transformers import (
            AutoModelForCausalLM,
            AutoTokenizer,
            TrainingArguments,
            Trainer,
            DataCollatorForLanguageModeling
        )
        from peft import LoraConfig, get_peft_model, TaskType
    except ImportError as e:
        logger.error(f"❌ Critical Dependency Missing for Real Training: {e}")
        logger.error("Please run: pip install torch transformers datasets peft accelerate")
        return

    # Device Selection
    device = "cuda" if torch.cuda.is_available() else "mps" if torch.backends.mps.is_available() else "cpu"
    logger.info(f"Using device: {device}")

    # Load Tokenizer
    try:
        tokenizer = AutoTokenizer.from_pretrained(args.model_name)
        tokenizer.pad_token = tokenizer.eos_token
    except Exception as e:
        logger.error(f"Failed to load tokenizer: {e}")
        return

    # Load Dataset (Real)
    def load_dataset_real(file_path):
        data = []
        with open(file_path, 'r', encoding='utf-8') as f:
            for line in f:
                if line.strip():
                    try:
                        data.append(json.loads(line))
                    except json.JSONDecodeError:
                        continue
        
        formatted_data = []
        for entry in data:
            messages = entry.get('messages', [])
            system_msg = next((m['content'] for m in messages if m['role'] == 'system'), "")
            user_msg = next((m['content'] for m in messages if m['role'] == 'user'), "")
            assistant_msg = next((m['content'] for m in messages if m['role'] == 'assistant'), "")
            
            text = f"System: {system_msg}\nUser: {user_msg}\nAssistant: {assistant_msg}"
            formatted_data.append({"text": text})

        return Dataset.from_list(formatted_data)

    dataset = load_dataset_real(args.data_path)
    
    def tokenize_function(examples):
        return tokenizer(examples["text"], padding="max_length", truncation=True, max_length=512)
    
    tokenized_datasets = dataset.map(tokenize_function, batched=True)

    # Load Model
    model = AutoModelForCausalLM.from_pretrained(args.model_name).to(device)
    
    # LoRA Config
    peft_config = LoraConfig(
        task_type=TaskType.CAUSAL_LM, 
        inference_mode=False, 
        r=8, 
        lora_alpha=32, 
        lora_dropout=0.1
    )
    model = get_peft_model(model, peft_config)
    model.print_trainable_parameters()

    training_args = TrainingArguments(
        output_dir=args.output_dir,
        per_device_train_batch_size=args.batch_size,
        num_train_epochs=args.epochs,
        learning_rate=2e-4,
        logging_steps=10,
        save_strategy="epoch",
        use_mps_device=(device == "mps")
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=tokenized_datasets,
        data_collator=DataCollatorForLanguageModeling(tokenizer, mlm=False),
    )

    logger.info("Starting Trainer...")
    trainer.train()
    
    logger.info(f"Saving model to {args.output_dir}")
    model.save_pretrained(args.output_dir)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Fine-tune LLM for School Violence Detection")
    parser.add_argument("--data_path", type=str, default="../data/school_violence_training_data.jsonl", help="Path to JSONL dataset")
    parser.add_argument("--model_name", type=str, default="TinyLlama/TinyLlama-1.1B-Chat-v1.0", help="Base model name")
    parser.add_argument("--output_dir", type=str, default="./results/school_violence_lora", help="Output directory")
    parser.add_argument("--epochs", type=int, default=3, help="Number of training epochs")
    parser.add_argument("--batch_size", type=int, default=4, help="Batch size")
    parser.add_argument("--mock", action="store_true", help="Run in mock mode for testing without GPU")
    
    args = parser.parse_args()
    
    # Adjust path relative to script location
    if not os.path.isabs(args.data_path):
        args.data_path = os.path.join(os.path.dirname(__file__), args.data_path)
        
    train(args)
