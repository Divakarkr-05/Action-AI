# Safety & Emergency Response Policy

## 1. Overview & Core Philosophy

**Reality → Action AI** is designed to provide actionable technical visual intelligence. When user uploads or camera frames depict potentially dangerous, harmful, or acute life-safety conditions, the platform activates the **Safety & Emergency Response Layer**.

> **CRITICAL RULE**: Image analysis is **probabilistic** and **NOT forensic or clinical proof**.  
> The system uses tentative phrasing such as *"possible"*, *"may indicate"*, and *"cannot be confirmed from the image alone"*. It never makes definitive criminal, medical, suicide, or drug-identification declarations.

---

## 2. Fundamental Disclaimers

1. **Not a Medical Diagnostic System**:
   Reality → Action AI is an artificial intelligence inspection tool, not a doctor, healthcare provider, or emergency medical dispatch system. It cannot diagnose illnesses, determine vital signs, or confirm physical trauma.
2. **Probabilistic Image Classifications**:
   All visual classifications are probabilistic estimates influenced by resolution, lighting, angles, compression artifacts, and context. An image alone can never substitute for trained on-scene human assessment.
3. **Emergency Action for Real-World Crises**:
   For any situation involving immediate peril, severe physical injury, self-harm crisis, or threat to human life, **contact professional emergency services (112 in India) immediately**.
4. **Drug Identification Cannot Be Confirmed from an Image**:
   Visual features alone cannot determine chemical composition, purity, legality, or pharmacology of any substance.

---

## 3. Strict Non-Auto-Reporting & Privacy

- **No Automatic Calls or Reports**:
  The system **NEVER** automatically calls emergency dispatch, police, the Narcotics Control Bureau (NCB), hospitals, or any third party. The user maintains sole control over if and when to contact authorities.
- **No Automatic Image Sharing**:
  Images are never dispatched or transmitted to law enforcement, government bodies, or healthcare facilities.
- **Process → Respond → Forget**:
  - Image base64 payloads are processed transiently in memory.
  - The platform **does not** create permanent behavioral safety profiles or track users across safety categories.
  - Emergency images are never stored in background registries or persistent training datasets.
  - Raw image base64 is **never** printed to backend logs.
  - If a user explicitly clicks *"Save to History"*, normal Supabase Row Level Security (RLS) policies apply to their private account only.

---

## 4. Supported Safety Categories & Severities

The safety layer classifies inputs into seven mutually exclusive categories with clear severity states:

| Category | Severity | Emergency Required | Description & Primary Guidance |
| :--- | :---: | :---: | :--- |
| **`NORMAL`** | `NORMAL` | `false` | Standard technical inspection (electronics, machinery, infrastructure). |
| **`POSSIBLE_DRUG_RELATED`** | `WARNING` | `false` | Unidentified substances or suspected illicit material. Do not touch, taste, smell, or confront. MANAS (1933) / NCB. |
| **`POSSIBLE_SELF_HARM`** | `EMERGENCY` | `true` | Indications of crisis or self-inflicted harm. Immediate help needed. Tele-MANAS (14416 / 1800-891-4416) / 112. |
| **`POSSIBLE_SUICIDE_ATTEMPT`** | `EMERGENCY` | `true` | Life-threatening crisis indicators. Stay with person if safe; call 112 / Tele-MANAS. |
| **`POSSIBLE_SERIOUS_INJURY`** | `URGENT` | `true` | Possible acute physical trauma or severe bleeding. Avoid movement; call 112. |
| **`POSSIBLE_UNCONSCIOUS_PERSON`** | `URGENT` | `true` | Unresponsive individual. Call 112; check safe surroundings. |
| **`EMERGENCY_UNCERTAIN`** | `WARNING` | `false` | Ambiguous acute danger or environmental hazard. Maintain safe distance; evaluate with caution. |

---

## 5. Safety Pipeline & Policy Immutability

Safety policy maintains absolute priority over LLM generation:

```
IMAGE
  ↓
IMAGE VALIDATION
  ↓
DETECTRA (Authenticity Detection)
  ↓
SAFETY CLASSIFICATION (Authoritative Pre-flight)
  ↓
SAFETY POLICY (Injected as Authoritative System Context)
  ↓
GEMMA / SARVAM (Multimodal Processing)
  ↓
SAFETY IMMUTABILITY & CLAIM SANITIZATION
  ↓
RAG GROUNDING
  ↓
ACTION RESPONSE
```

### Safety Policy Immutability Rules
- **No Downgrades**: Gemma or Sarvam **CANNOT** downgrade an emergency classification (`POSSIBLE_SELF_HARM`, `POSSIBLE_SUICIDE_ATTEMPT`, `POSSIBLE_SERIOUS_INJURY`, `POSSIBLE_UNCONSCIOUS_PERSON`) to `NORMAL`.
- **Automatic Upgrades**: If the LLM output reveals an acute emergency not flagged initially, the safety policy automatically upgrades the response to the detected emergency category.
- **Claim Sanitization**: Phrases like *"this is definitely an illegal drug"* or *"this person definitely committed suicide"* are automatically intercepted and sanitized into tentative, probabilistic language.

---

## 6. Verified Government Emergency Helplines (India)

All emergency helplines surfaced in the application are verified official numbers and rendered as clickable mobile links (`tel:`):

- **`112`** — **National Emergency Response Support System (ERSS)**:
  Single unified emergency number for Police, Fire, and Ambulance across India.
- **`1933`** — **MANAS / National Narcotics Helpline**:
  Toll-free 24x7 helpline operated by the Ministry of Home Affairs for reporting illicit drug trafficking, narcotics assistance, and guidance.
- **`+91-11-26761000`** — **Narcotics Control Bureau (NCB) Headquarters Control Room**:
  Official control room for narcotics enforcement coordination.
- **`14416`** — **Tele-MANAS (Shortcode)**:
  National Tele Mental Health Programme of India providing 24x7 free, confidential mental health counseling in multiple regional languages.
- **`1800-891-4416`** — **Tele-MANAS (Toll-Free)**:
  24x7 all-India toll-free mental health support line.
