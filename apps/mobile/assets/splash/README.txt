CITIANS SPLASH ASSET PACK

FILES
- citians_wordmark.png : transparent Citians wordmark without butterfly
- butterfly.png        : transparent butterfly landing asset
- gold_glow.png        : optional glow/particle sprite
- animation_spec.json  : exact 3-second animation sequence for Codex

IMPLEMENTATION
Use these as separate layers. Keep the wordmark centered and stationary.
Animate butterfly.png along a smooth curved path from off-screen left.
The butterfly must land at the upper-right edge of the letter S.
Do not display another butterfly in the final logo.
Play once, settle briefly, then fade/transition into the app.

For best production quality, Codex can implement this with React Native
Reanimated/SVG, Flutter AnimationController/CustomPainter, or the equivalent
native animation system. These PNG assets do not require Rive/Lottie.
