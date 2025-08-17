# SmashImpact Project Overview

SmashImpact is an experimental WebRTC-based tag game focused on quick, intuitive play in the browser.

## Goals
- Provide an easy, fun peer-to-peer tag experience.
- Keep the interface smooth with minimal friction to join a match.
- Demonstrate WebRTC connection flows and in-browser game mechanics.

## Gameplay
- Two players connect directly via WebRTC (host / join flow).
- The tagger chases the runner; tagging swaps roles and increments score.
- Short rounds, clear win screen, and replay options.

## Technical Overview
- Client-side only (no backend) using JavaScript and WebRTC APIs.
- Connection flow uses copy/paste or QR code for signaling.
- UI built with vanilla HTML/CSS/JS, targeting modern Chrome, Firefox, and mobile browsers.

## Future Enhancements
- Latency compensation with interpolation.
- Audio cues and particle effects for tags.
- Optional background music and haptic feedback on mobile.

