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
  return {
    leftArm: {
      shoulder: { pitch: lerp(a.leftArm.shoulder.pitch, b.leftArm.shoulder.pitch, t) },
      elbow: { flex: lerp(a.leftArm.elbow.flex, b.leftArm.elbow.flex, t) },
    },
    rightArm: {
      shoulder: { pitch: lerp(a.rightArm.shoulder.pitch, b.rightArm.shoulder.pitch, t) },
      elbow: { flex: lerp(a.rightArm.elbow.flex, b.rightArm.elbow.flex, t) },
    },
    leftLeg: {
      hip: { pitch: lerp(a.leftLeg.hip.pitch, b.leftLeg.hip.pitch, t) },
      knee: { flex: lerp(a.leftLeg.knee.flex, b.leftLeg.knee.flex, t) },
    },
    rightLeg: {
      hip: { pitch: lerp(a.rightLeg.hip.pitch, b.rightLeg.hip.pitch, t) },
      knee: { flex: lerp(a.rightLeg.knee.flex, b.rightLeg.knee.flex, t) },
    },
  };
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
    leftArm: { shoulder: { pitch: 0 }, elbow: { flex: 0 } },
    rightArm: { shoulder: { pitch: 0 }, elbow: { flex: 0 } },
    leftLeg: { hip: { pitch: 0 }, knee: { flex: 0 } },
    rightLeg: { hip: { pitch: 0 }, knee: { flex: 0 } },
  }),

  // Walking cycle - one full step (left foot forward)
  walkCycle: (phase: number): FullPose => {
    const legSwing = Math.sin(phase * Math.PI * 2) * 35;
    const legLift = Math.max(0, Math.sin(phase * Math.PI * 2)) * 45;
    const oppositeLegSwing = Math.sin((phase + 0.5) * Math.PI * 2) * 35;
    const oppositeLegLift = Math.max(0, Math.sin((phase + 0.5) * Math.PI * 2)) * 45;

    return {
      // Arms swing opposite to legs
      leftArm: { shoulder: { pitch: -legSwing * 0.4 }, elbow: { flex: 15 } },
      rightArm: { shoulder: { pitch: legSwing * 0.4 }, elbow: { flex: 15 } },
      // Left leg forward
      leftLeg: { hip: { pitch: legSwing }, knee: { flex: legLift } },
      // Right leg back
      rightLeg: { hip: { pitch: oppositeLegSwing }, knee: { flex: oppositeLegLift } },
    };
  },

  // Squat pose (for picking up)
  // Hip flexion brings thighs forward, knee flexion bends legs
  // 1:1.6 ratio for natural squat
  squat: (): FullPose => ({
    leftArm: { shoulder: { pitch: 15 }, elbow: { flex: 5 } },
    rightArm: { shoulder: { pitch: 15 }, elbow: { flex: 5 } },
    leftLeg: { hip: { pitch: 70 }, knee: { flex: 110 } }, // Deep squat, 1:1.57 ratio
    rightLeg: { hip: { pitch: 70 }, knee: { flex: 110 } },
  }),

  // Reaching down (arms extend forward and down)
  reachDown: (): FullPose => ({
    leftArm: { shoulder: { pitch: 25 }, elbow: { flex: 10 } },
    rightArm: { shoulder: { pitch: 110 }, elbow: { flex: 25 } }, // Right arm reaches down
    leftLeg: { hip: { pitch: 70 }, knee: { flex: 110 } },
    rightLeg: { hip: { pitch: 70 }, knee: { flex: 110 } },
  }),

  // Holding object comfortably
  holding: (): FullPose => ({
    leftArm: { shoulder: { pitch: 10 }, elbow: { flex: 20 } },
    rightArm: { shoulder: { pitch: 40 }, elbow: { flex: 50 } },
    leftLeg: { hip: { pitch: 0 }, knee: { flex: 0 } },
    rightLeg: { hip: { pitch: 0 }, knee: { flex: 0 } },
  }),
};
