# Future Python model experiments

This folder is preparation only. **No dataset has been collected, no model has been fine-tuned, and no evaluation has been performed.** The live application uses the configured hosted provider adapter. Keep experiments separate from the production Node.js server until a model shows measurable benefit.

## Suggested experiment stages

1. **Choose a pretrained base model.** Compare a small instruction-tuned language model that supports a permissive license and can be served on available hardware. Record model name, exact version, license, and model-card URL. Consider vision support only if image-to-caption is part of the training experiment; do not assume text-only models understand images.
2. **Acquire licensed data.** Build a dataset from creator-submitted memes with explicit consent or a source whose license permits model training and redistribution. Do not scrape arbitrary meme sites. Store source, creator permission, license, attribution, and removal contact in a dataset card (start with `dataset-card-template.md`). Remove personal data and disallowed content. Images and captions can have separate rights.
3. **Clean and preprocess.** Normalize Unicode and whitespace, remove duplicate/near-duplicate records, check image decoding and dimensions, preserve train/validation/test separation by source or creator to reduce leakage, filter harmful/private content, and retain a record of each transformation. Keep a raw source manifest separate from generated training artifacts.
4. **Create examples.** Use fields such as `image`, `situation`, `caption`, `tone`, `tags`, and consent/license metadata. Split data before augmentation. Keep the dataset small and inspect samples manually before training.
5. **Fine-tune with parameter-efficient methods.** Start with a small LoRA/QLoRA experiment using a framework compatible with the model license and hardware. Pin Python dependencies and model revision; log seed, GPU/CPU, quantization, hyperparameters, training time, and checkpoint hash. Do not commit large model weights or private dataset content to Git.
6. **Evaluate before integration.** Compare the fine-tuned checkpoint against the exact original checkpoint on the same held-out prompts/images. Track format validity, relevance to image/context, repetition, length, tone adherence, human preference, and safety failures. Use blinded human review for humor quality and bootstrap confidence intervals where practical. Publish limitations and a small, licensed evaluation set.
7. **Serve behind an API.** Package inference as a separate Python service with request-size limits, schema validation, timeouts, health checks, model/version metadata, and usage limits. Add a Node provider adapter that calls it over a private network. Keep the current Gemini or local demo route available until quality and reliability are demonstrated.

## Reproducibility checklist

- Dataset card and license/consent audit complete.
- Immutable train/validation/test manifests and deduplication report.
- Base model and tokenizer revisions recorded.
- Training config, random seed, package lock, and checkpoint checksum recorded.
- Evaluation set and baseline model outputs retained under terms that permit it.
- Human quality/safety review and model limitations documented.
- API service tested for malformed input, oversized requests, timeouts, and unavailable model state.

Do not claim a model was trained or improved until there is a reproducible run and comparison report.
