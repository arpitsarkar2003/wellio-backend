I have updated the backend to support detailed user profiling (Age, Height, Weight, Goal). Now I need to implement the frontend collection flow with a "Soft Gate" approach.

**Feature 1: Post-Login Onboarding & Re-engagement**
Implement a check after the user logs in or opens the app:
1. Check if the user's core data (Age, Height, Weight, Goal) is missing.
2. If missing, present a "Personalization Setup" screen/modal explaining that this data improves AI accuracy.
3. **Crucial:** This flow must have a "Skip" option. The user is not forced to complete it immediately.
4. However, if they skip it, this check should trigger again on the next app launch (or session start) with a gentle nudge: "Add your details for better results."

**Feature 2: Profile Completeness Indicator**
In the existing "Profile Settings" area:
1. Add a visual indicator for "Profile Completion" (e.g., a progress bar or a "Complete/Incomplete" badge).
2. If the profile is incomplete, this area should clearly highlight what is missing.
3. Tapping this indicator should re-open the "Personalization Setup" flow to let the user finish entering their data.

**Implementation Goal:**
Ensure the AI has context when possible, but respect the user's choice to skip. The UI should consistently encourage completion without blocking access to the app.

---

## Backend changes implemented (high-level)
- The backend now stores and returns detailed user profiling fields (Age, Height, Weight, Goal, plus activity level, gender, and dietary preferences).
- The existing profile update endpoint accepts these fields in a single request, so the app can save them together.
- The AI system prompt is now **dynamic** and includes a “CURRENT USER CONTEXT” section on every chat request.
- If any user data is missing, the prompt explicitly marks it as “Not provided yet”.

## What remains (frontend)
- Build the soft‑gate onboarding flow to collect the missing data (with a Skip option).
- Add a profile completeness indicator and a way to resume setup from Profile Settings.
