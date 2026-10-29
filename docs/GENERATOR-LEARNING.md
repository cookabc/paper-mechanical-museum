# Generator: predict, operate, explain, re-verify

Baseline is `main` at `b298f4aaf6363c3acd74ddf9aa814b572ee320bf`, content tree `b708c6210c7898397d2ebf4d6ea9e5bc82514c61`. This note records the candidate implementation and local acceptance; release status follows GitHub / Vercel separately.

## Scope

Adds one optional "Learn by doing · open circuit and stopping" entry to the existing generator dock. No new exhibit, external service, AI call or dependency. The dimensional drawing, the original ten plus the bicycle, the original physics model, the sound service, the view and the physical-part click logic are unchanged. The original steady-power challenge remains independently usable.

This is a short activity built from preset choices, preset feedback and measured conditions. It does not diagnose free text dynamically and makes no claim to be a multi-agent classroom.

## Teaching and the evidence gate

1. **Predict the open circuit**: feedback and the operating entry appear only after an answer is chosen. You first establish a forward 60 rpm closed-circuit reference yourself and observe continuously for 1.5 simulated seconds before the open-circuit step unlocks. Then, at the same speed, open the switch by hand and observe continuously for another 1.5 seconds before the explanation question unlocks.
2. **Explain**: while turning with an open circuit the RMS voltage is about 4.44 V, and the current and average power are zero. The lesson separates "generating voltage" from "forming a current loop" and does not treat a dark lamp as evidence of no voltage.
3. **Transfer to stopping**: answer first, then stop it by hand while open-circuit at a forward 60 rpm. The real stop event and the zero readings are the evidence; an already-stopped RAF is not required to keep accumulating. Old evidence from a previous stop, an automatic stop on losing focus, or a pause-triggered clear cannot substitute for this operation; changing speed or reversing cancels the pending verification.
4. **Transfer to reversal**: answer first, then restore the closed-circuit forward 60 rpm reference and then observe at reverse 60 rpm. Each segment runs continuously for 1.5 seconds. The RMS voltage and the resistor's average power are unchanged (4.44 V / 1.97 W); the phase advance reverses direction, and no claim is made that alternating current always flows one way.

The stable observation uses the machine's own simulated time; at ¼ speed you watch for longer. Mismatched conditions, a pause or a loss of focus clear the currently unfinished timing; nothing is back-filled from the background. An AC zero crossing is not a failure: the evidence test uses RMS and average power, not the sign of the instantaneous voltage.

The learning button never sets the machine's speed, direction, switch or running state. "Start over" clears only the learning record; "Exit learning" keeps the current machine state and restores the normal entry; a whole-machine "Restart" and leaving the exhibit route clear both machine and learning state. All original controls remain available throughout.

## Acceptance

- Pure state tests cover the feedback for all three choices in every question, answering before revealing, wrong conditions, speed changes and reversal, the stop-event gate, continuous timing, pausing and restarting, and that learning does not modify physical state.
- Real DOM adapter tests cover the full physical-part operating path, open-circuit/stopped/reversed readouts, the original challenge progress bar not interfering, keeping the machine on exit/retry, pausing, whole-machine reset, route destruction and stale nodes becoming inert.
- Desktop Chromium completed the whole flow, including wrong predictions, explanations and transfer answers, by clicking the physical crank and the knife switch; not merely by calling state functions directly.
- The narrow check used a desktop Chrome window at 125% page zoom with `innerWidth=400` and `clientWidth=scrollWidth=388`, with no horizontal overflow, and completed the prediction, explanation, stopping and reversal operations. It is not a physical phone or touch-device test.
- Screenshots are kept in the workspace at `learning-evidence/` and do not enter the build package. Stage changes get a short live-region announcement; an explicit learning action leaves focus on the new question or the continue button. No screen-reader software or actual listening test is claimed.

The current implementation does not record learning scores or persist answers; no script cranks automatically, flips the switch or hides controls on the user's behalf.

---

中文版见 [GENERATOR-LEARNING.zh-CN.md](GENERATOR-LEARNING.zh-CN.md)。
