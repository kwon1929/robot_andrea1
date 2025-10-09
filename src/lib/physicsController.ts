import type { RapierRigidBody } from "@react-three/rapier";
import type { FullPose } from "./types";
import * as THREE from "three";

/**
 * Physics-based control system inspired by PHC
 * Uses PD (Proportional-Derivative) controllers to apply torques
 * that drive the robot towards target poses
 */

interface PDGains {
  kp: number; // Proportional gain (stiffness)
  kd: number; // Derivative gain (damping)
}

// Joint-specific PD gains
export const JOINT_PD_GAINS: Record<string, PDGains> = {
  shoulder: { kp: 200, kd: 20 },
  elbow: { kp: 150, kd: 15 },
  hip: { kp: 300, kd: 30 },
  knee: { kp: 250, kd: 25 },
};

/**
 * Compute PD control torque
 * τ = Kp * (θ_target - θ_current) - Kd * ω_current
 */
export function computePDTorque(
  targetAngle: number, // radians
  currentAngle: number, // radians
  currentAngularVelocity: number, // rad/s
  gains: PDGains
): number {
  const angleError = targetAngle - currentAngle;
  const torque = gains.kp * angleError - gains.kd * currentAngularVelocity;
  return torque;
}

/**
 * Apply stabilizing forces to keep torso upright
 * This prevents the robot from falling over
 */
export function applyBalanceControl(
  torsoBody: RapierRigidBody | null,
  targetRotation: THREE.Quaternion = new THREE.Quaternion()
): void {
  if (!torsoBody) return;

  const rotation = torsoBody.rotation();
  const currentQuat = new THREE.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w);

  // Calculate rotation difference
  const rotationError = new THREE.Quaternion();
  rotationError.copy(targetRotation).invert().multiply(currentQuat);

  // Convert to angle-axis
  const angle = 2 * Math.acos(Math.min(1, Math.abs(rotationError.w)));
  const axis = new THREE.Vector3(rotationError.x, rotationError.y, rotationError.z);
  if (axis.length() > 0.001) {
    axis.normalize();
  }

  // Apply corrective torque
  const kp = 50; // Balance stiffness
  const kd = 10; // Balance damping

  const angvel = torsoBody.angvel();
  const torque = {
    x: -kp * angle * axis.x - kd * angvel.x,
    y: 0, // Allow Y rotation (turning)
    z: -kp * angle * axis.z - kd * angvel.z,
  };

  torsoBody.applyTorqueImpulse(torque, true);
}

/**
 * Apply forces to legs for walking
 * This creates forward momentum while maintaining balance
 */
export function applyWalkingForces(
  leftLegBody: RapierRigidBody | null,
  rightLegBody: RapierRigidBody | null,
  torsoBody: RapierRigidBody | null,
  phase: number, // 0 to 1, walking cycle phase
  direction: THREE.Vector3 = new THREE.Vector3(0, 0, -1)
): void {
  if (!leftLegBody || !rightLegBody || !torsoBody) return;

  // Alternate leg forces based on walking phase
  const leftPhase = Math.sin(phase * Math.PI * 2);
  const rightPhase = Math.sin((phase + 0.5) * Math.PI * 2);

  const forceStrength = 20; // N

  // Apply forward force to stance leg (when foot is on ground)
  if (leftPhase < 0) {
    const force = direction.clone().multiplyScalar(forceStrength * Math.abs(leftPhase));
    leftLegBody.applyImpulse({ x: force.x, y: 0, z: force.z }, true);
  }

  if (rightPhase < 0) {
    const force = direction.clone().multiplyScalar(forceStrength * Math.abs(rightPhase));
    rightLegBody.applyImpulse({ x: force.x, y: 0, z: force.z }, true);
  }

  // Apply upward force to maintain height
  const torsoPos = torsoBody.translation();
  const targetHeight = 0; // Target Y position
  const heightError = targetHeight - torsoPos.y;

  if (heightError < -0.2) {
    torsoBody.applyImpulse({ x: 0, y: 30 * Math.abs(heightError), z: 0 }, true);
  }
}

/**
 * Compute center of mass for balance
 */
export function computeCOM(
  torsoBody: RapierRigidBody | null,
  leftLegBody: RapierRigidBody | null,
  rightLegBody: RapierRigidBody | null
): THREE.Vector3 {
  const com = new THREE.Vector3();
  let totalMass = 0;

  if (torsoBody) {
    const pos = torsoBody.translation();
    const mass = torsoBody.mass();
    com.add(new THREE.Vector3(pos.x, pos.y, pos.z).multiplyScalar(mass));
    totalMass += mass;
  }

  if (leftLegBody) {
    const pos = leftLegBody.translation();
    const mass = leftLegBody.mass();
    com.add(new THREE.Vector3(pos.x, pos.y, pos.z).multiplyScalar(mass));
    totalMass += mass;
  }

  if (rightLegBody) {
    const pos = rightLegBody.translation();
    const mass = rightLegBody.mass();
    com.add(new THREE.Vector3(pos.x, pos.y, pos.z).multiplyScalar(mass));
    totalMass += mass;
  }

  if (totalMass > 0) {
    com.divideScalar(totalMass);
  }

  return com;
}

/**
 * Check if robot is grounded (feet touching ground)
 */
export function isGrounded(
  leftFootY: number,
  rightFootY: number,
  groundY: number = -2
): boolean {
  const threshold = 0.15; // meters
  const leftGrounded = Math.abs(leftFootY - groundY) < threshold;
  const rightGrounded = Math.abs(rightFootY - groundY) < threshold;
  return leftGrounded || rightGrounded;
}

/**
 * Apply pose tracking using PD control
 * This is the core of physics-based motion imitation
 */
export function applyPoseTracking(
  targetPose: FullPose,
  // Body references would be passed here
  // For now, this is a placeholder for future joint motor implementation
): void {
  // TODO: Implement joint motors in PhysicsHumanoid
  // Each joint should track its target angle using PD control
  // τ = Kp * (target - current) - Kd * velocity
}

/**
 * Smooth damping for realistic motion
 */
export function applyDamping(
  body: RapierRigidBody | null,
  linearDamping: number = 0.1,
  angularDamping: number = 0.5
): void {
  if (!body) return;

  const linvel = body.linvel();
  body.applyImpulse(
    {
      x: -linvel.x * linearDamping,
      y: -linvel.y * linearDamping,
      z: -linvel.z * linearDamping,
    },
    true
  );

  const angvel = body.angvel();
  body.applyTorqueImpulse(
    {
      x: -angvel.x * angularDamping,
      y: -angvel.y * angularDamping,
      z: -angvel.z * angularDamping,
    },
    true
  );
}
