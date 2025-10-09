import type { FullPose, Vector3 } from "./types";

// Easing functions
export const ease = {
  linear: (t: number) => t,
  easeInOut: (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  easeOut: (t: number) => t * (2 - t),
  easeIn: (t: number) => t * t,
  spring: (t: number) => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },
  // Natural bounce-back effect (like settling into position)
  easeOutBack: (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  // Elastic spring effect (more dramatic than spring)
  easeOutElastic: (t: number) => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  }
};

// Linear interpolation
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// Vector3 lerp
export function lerpVec3(a: Vector3, b: Vector3, t: number): Vector3 {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    z: lerp(a.z, b.z, t),
  };
}

// Pose lerp
export function lerpPose(a: FullPose, b: FullPose, t: number): FullPose {
  const result: FullPose = {
    leftArm: {
      shoulder: {
        pitch: lerp(a.leftArm.shoulder.pitch, b.leftArm.shoulder.pitch, t),
        roll: lerp(a.leftArm.shoulder.roll || 0, b.leftArm.shoulder.roll || 0, t)
      },
      elbow: { flex: lerp(a.leftArm.elbow.flex, b.leftArm.elbow.flex, t) },
    },
    rightArm: {
      shoulder: {
        pitch: lerp(a.rightArm.shoulder.pitch, b.rightArm.shoulder.pitch, t),
        roll: lerp(a.rightArm.shoulder.roll || 0, b.rightArm.shoulder.roll || 0, t)
      },
      elbow: { flex: lerp(a.rightArm.elbow.flex, b.rightArm.elbow.flex, t) },
    },
    leftLeg: {
      hip: {
        pitch: lerp(a.leftLeg.hip.pitch, b.leftLeg.hip.pitch, t),
        roll: lerp(a.leftLeg.hip.roll || 0, b.leftLeg.hip.roll || 0, t)
      },
      knee: { flex: lerp(a.leftLeg.knee.flex, b.leftLeg.knee.flex, t) },
    },
    rightLeg: {
      hip: {
        pitch: lerp(a.rightLeg.hip.pitch, b.rightLeg.hip.pitch, t),
        roll: lerp(a.rightLeg.hip.roll || 0, b.rightLeg.hip.roll || 0, t)
      },
      knee: { flex: lerp(a.rightLeg.knee.flex, b.rightLeg.knee.flex, t) },
    },
  };

  // Lerp torso if both poses have it
  if (a.torso && b.torso) {
    result.torso = {
      pitch: lerp(a.torso.pitch, b.torso.pitch, t),
      roll: lerp(a.torso.roll, b.torso.roll, t),
    };
  } else if (a.torso || b.torso) {
    // If only one has torso, lerp from/to neutral position
    const neutralTorso = { pitch: 0, roll: 0 };
    const fromTorso = a.torso || neutralTorso;
    const toTorso = b.torso || neutralTorso;
    result.torso = {
      pitch: lerp(fromTorso.pitch, toTorso.pitch, t),
      roll: lerp(fromTorso.roll, toTorso.roll, t),
    };
  }

  return result;
}

// Keyframe definition
export interface Keyframe {
  time: number; // 0-1 normalized time
  pose: FullPose;
  position?: Vector3;
  easing?: (t: number) => number;
}

// Motion sequence
export interface MotionSequence {
  keyframes: Keyframe[];
  duration: number; // milliseconds
  loop?: boolean;
}

// Evaluate pose at specific time in sequence
export function evaluateMotion(sequence: MotionSequence, elapsedMs: number): { pose: FullPose; position?: Vector3 } {
  const t = Math.min(elapsedMs / sequence.duration, 1);

  // Find surrounding keyframes
  let prevFrame = sequence.keyframes[0];
  let nextFrame = sequence.keyframes[sequence.keyframes.length - 1];

  for (let i = 0; i < sequence.keyframes.length - 1; i++) {
    if (t >= sequence.keyframes[i].time && t <= sequence.keyframes[i + 1].time) {
      prevFrame = sequence.keyframes[i];
      nextFrame = sequence.keyframes[i + 1];
      break;
    }
  }

  // Interpolate between keyframes
  const frameT = (t - prevFrame.time) / (nextFrame.time - prevFrame.time || 1);
  const easingFn = nextFrame.easing || ease.easeInOut;
  const easedT = easingFn(frameT);

  const pose = lerpPose(prevFrame.pose, nextFrame.pose, easedT);

  let position: Vector3 | undefined;
  if (prevFrame.position && nextFrame.position) {
    position = lerpVec3(prevFrame.position, nextFrame.position, easedT);
  }

  return { pose, position };
}

// Pre-defined motion sequences
export const MOTIONS = {
  idle: (): FullPose => ({
    torso: { pitch: 0, roll: 0 },
    leftArm: { shoulder: { pitch: 0, roll: 0 }, elbow: { flex: 0 } },
    rightArm: { shoulder: { pitch: 0, roll: 0 }, elbow: { flex: 0 } },
    leftLeg: { hip: { pitch: 0, roll: 0 }, knee: { flex: 0 } },
    rightLeg: { hip: { pitch: 0, roll: 0 }, knee: { flex: 0 } },
  }),

  // Walking cycle - one full step (left foot forward)
  // Natural human walking: asymmetric, slight irregularity, arm-leg coordination
  walkCycle: (phase: number): FullPose => {
    const legSwing = Math.sin(phase * Math.PI * 2) * 35;
    const legLift = Math.max(0, Math.sin(phase * Math.PI * 2)) * 45;
    const oppositeLegSwing = Math.sin((phase + 0.5) * Math.PI * 2) * 35;
    const oppositeLegLift = Math.max(0, Math.sin((phase + 0.5) * Math.PI * 2)) * 45;

    // Body sway: torso tilts opposite to swing leg (weight shift)
    const bodyRoll = Math.sin(phase * Math.PI * 2) * 3; // Subtle 3° tilt

    // Micro-motion: slight breathing-like pitch variation (very subtle)
    const breathingVariation = Math.sin(phase * Math.PI * 4) * 0.5; // 0.5° micro-sway
    const bodyPitch = 5 + breathingVariation; // Slight forward lean + micro-motion

    // Natural arm swing: slightly more fluid with offset timing
    const leftArmSwing = -legSwing * 0.5; // Increased from 0.4 for more natural swing
    const rightArmSwing = legSwing * 0.5;

    // Arm roll: slight outward motion during swing (more human-like)
    const leftArmRoll = Math.sin(phase * Math.PI * 2) * 2; // 2° outward during swing
    const rightArmRoll = -Math.sin(phase * Math.PI * 2) * 2;

    // Elbow flex: varies with arm swing (bend more when arm forward)
    const leftElbowFlex = 15 + Math.max(0, leftArmSwing) * 0.3;
    const rightElbowFlex = 15 + Math.max(0, rightArmSwing) * 0.3;

    return {
      torso: { pitch: bodyPitch, roll: -bodyRoll }, // Negative for natural counter-balance
      // Arms swing opposite to legs with natural variation
      leftArm: { shoulder: { pitch: leftArmSwing, roll: leftArmRoll }, elbow: { flex: leftElbowFlex } },
      rightArm: { shoulder: { pitch: rightArmSwing, roll: rightArmRoll }, elbow: { flex: rightElbowFlex } },
      // Left leg forward
      leftLeg: { hip: { pitch: legSwing, roll: 0 }, knee: { flex: legLift } },
      // Right leg back
      rightLeg: { hip: { pitch: oppositeLegSwing, roll: 0 }, knee: { flex: oppositeLegLift } },
    };
  },

  // Squat preparation - slight bend, arms reaching forward (natural pre-squat)
  squatPrep: (): FullPose => ({
    torso: { pitch: 25, roll: 0 }, // Lean forward MORE to prepare (increased from 15)
    leftArm: { shoulder: { pitch: 35, roll: 0 }, elbow: { flex: 10 } },
    rightArm: { shoulder: { pitch: 35, roll: 0 }, elbow: { flex: 10 } },
    leftLeg: { hip: { pitch: 25, roll: 0 }, knee: { flex: 30 } }, // Slight knee bend
    rightLeg: { hip: { pitch: 25, roll: 0 }, knee: { flex: 30 } },
  }),

  // Squat pose (for picking up)
  // Real human squat: torso leans forward 45-60°, butt goes back, chest toward knees
  // This creates natural counterbalance - center of mass stays over feet
  squat: (): FullPose => ({
    torso: { pitch: 50, roll: 0 }, // STRONG forward lean (increased from 35) - like real squat
    leftArm: { shoulder: { pitch: 50, roll: 0 }, elbow: { flex: 20 } }, // Arms forward for balance
    rightArm: { shoulder: { pitch: 50, roll: 0 }, elbow: { flex: 20 } },
    leftLeg: { hip: { pitch: 70, roll: 0 }, knee: { flex: 110 } }, // Deep squat
    rightLeg: { hip: { pitch: 70, roll: 0 }, knee: { flex: 110 } },
  }),

  // Reaching down (arms extend forward and down)
  // Torso stays bent forward, arm extends down
  reachDown: (): FullPose => ({
    torso: { pitch: 55, roll: 0 }, // Even MORE forward to reach (increased from 35)
    leftArm: { shoulder: { pitch: 30, roll: 0 }, elbow: { flex: 10 } },
    rightArm: { shoulder: { pitch: 120, roll: 0 }, elbow: { flex: 30 } }, // Right arm reaches DOWN
    leftLeg: { hip: { pitch: 70, roll: 0 }, knee: { flex: 110 } },
    rightLeg: { hip: { pitch: 70, roll: 0 }, knee: { flex: 110 } },
  }),

  // Holding object comfortably (with slight back lean for heavy objects)
  holding: (weight: number = 0.3): FullPose => {
    // Weight 0.25-0.35: normal, >0.35: heavy (lean back more)
    const isHeavy = weight > 0.35;
    const backLean = isHeavy ? -8 : -3; // Negative pitch = lean back

    return {
      torso: { pitch: backLean, roll: 0 },
      leftArm: { shoulder: { pitch: 10, roll: 0 }, elbow: { flex: 20 } },
      rightArm: { shoulder: { pitch: 40, roll: 0 }, elbow: { flex: 50 } },
      leftLeg: { hip: { pitch: 0, roll: 0 }, knee: { flex: 0 } },
      rightLeg: { hip: { pitch: 0, roll: 0 }, knee: { flex: 0 } },
    };
  },
};
