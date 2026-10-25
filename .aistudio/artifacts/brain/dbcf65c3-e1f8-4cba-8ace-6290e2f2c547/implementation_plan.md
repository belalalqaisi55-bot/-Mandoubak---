# Implementation Plan: Adding Missing Features

## 1. Goal
Add the requested missing features to the Mandoubak app, while ensuring we do not duplicate existing functionality.

## 2. Features to Add / Refine
- **Animate images into video**: Add a new component that allows users to upload an image and generate a video (landscape or portrait aspect ratio) using `gemini-omni-1.1-flash` via the `gemini-interactions-api`.
- **Verify/Refine Chatbot Grounding**: Ensure Search and Maps grounding are fully implemented according to the latest requirements, using `gemini-3.8-flash` with the appropriate tools (`googleSearch`, `googleMaps`).
- **Verify Bioscience Skills Integration**: Ensure `BioscienceSkillsExplorer.tsx` utilizes the `science` skill correctly (referencing authoritative databases like AlphaFold DB, etc.).

## 3. Plan
1. **Video Generation Component**:
   - Create `VideoGenerationModal.tsx`.
   - Implement server-side route `/api/video-gen` using `gemini-omni-1.1-flash` via `ai.interactions.create`.
   - Ensure secure file upload/base64 handling on the server.
2. **Grounding Verification**:
   - Audit `GeminiChatModal.tsx` to confirm grounding meets the required specifications.
   - Update grounding implementation if necessary to ensure adherence to `gemini-api` guidelines.
3. **Bioscience Verification**:
   - Review `BioscienceSkillsExplorer.tsx` to ensure it uses the `science` skill patterns, including proper citations and API etiquette.

## 4. Feedback Request
Please let me know if this plan covers all the missing features you have in mind.
