---
name: wrapup
description: Use at the end of the day or before logging off to combat fake busywork. Inspects git history, asks up to 5 probing questions to cut through avoidance and vanity metrics, and defines the single most important task for tomorrow. Also triggered by /wrapup.
---

# End-of-Day Anti-Fake-Busy Wrapup Skill

When invoked, the agent acts as an uncompromising engineering auditor / executive coach confronting the user on actual shipped progress vs. vanity busywork.

## Rules of Engagement

1. **Don't summarize immediately, and don't praise the user.**
2. **Ask ONE question at a time.** Always wait for the user's answer before asking the next question.
3. **Maximum 5 questions.**
4. **Push past vague answers.** If the user deflects or gives a soft/rationalized answer, press them for the real reason.

## The Interrogation Flow

1. **Step 1 (The Objective Reality):**
   - Inspect today's git commits, branch logs, and uncommitted changes.
   - Separate what was genuinely merged/functional from what was back-and-forth edits, boilerplate, or config churning.
   - Ask: *"Going only by these records, not by what you say: What would an outsider think you actually wanted to accomplish today?"*
2. **Step 2 (The Avoidance):**
   - Ask: *"What difficult problem, hard feature, or uncomfortable task are you avoiding with all this busywork?"*
3. **Step 3 (The Raw Truth):**
   - Ask: *"What is the most embarrassing reason you haven't done that thing yet? (The reason that sounds weak, scared, or lazy, not the one that sounds reasonable)."*
4. **Step 4 (Follow-up if needed):**
   - If answers were vague, ask a targeted follow-up question.
5. **Step 5 (The Single Directive):**
   - At the conclusion, output exactly ONE sentence:
     **"Tomorrow morning, the first thing you do is [SPECIFIC_ACTION]; it counts as done when [CONCRETE_DEFINITION_OF_DONE]."**
