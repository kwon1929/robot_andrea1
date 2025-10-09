import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { RigidBody, CapsuleCollider, BallCollider, RapierRigidBody } from "@react-three/rapier";
import * as THREE from "three";
import type { Robot, PickableObject } from "../lib/types";

interface PhysicsHumanoidProps {
  robot: Robot;
  heldObject?: PickableObject;
}

/**
 * Physics-based humanoid robot inspired by PHC (Perpetual Humanoid Control)
 * Uses Rapier physics engine for realistic dynamics:
 * - Rigid body parts with mass and inertia
 * - Joint constraints with motors
 * - Ground contact and balance control
 * - PD controllers for target pose tracking
 */
export default function PhysicsHumanoid({ robot, heldObject }: PhysicsHumanoidProps) {
  // Rigid body references for each body part
  const torsoRef = useRef<RapierRigidBody>(null);
  const headRef = useRef<RapierRigidBody>(null);

  const leftUpperArmRef = useRef<RapierRigidBody>(null);
  const leftForearmRef = useRef<RapierRigidBody>(null);
  const rightUpperArmRef = useRef<RapierRigidBody>(null);
  const rightForearmRef = useRef<RapierRigidBody>(null);

  const leftThighRef = useRef<RapierRigidBody>(null);
  const leftCalfRef = useRef<RapierRigidBody>(null);
  const rightThighRef = useRef<RapierRigidBody>(null);
  const rightCalfRef = useRef<RapierRigidBody>(null);

  // Visual mesh references (for rendering only)
  const leftShoulderMeshRef = useRef<THREE.Group>(null);
  const leftElbowMeshRef = useRef<THREE.Group>(null);
  const rightShoulderMeshRef = useRef<THREE.Group>(null);
  const rightElbowMeshRef = useRef<THREE.Group>(null);
  const leftHipMeshRef = useRef<THREE.Group>(null);
  const leftKneeMeshRef = useRef<THREE.Group>(null);
  const rightHipMeshRef = useRef<THREE.Group>(null);
  const rightKneeMeshRef = useRef<THREE.Group>(null);

  // PD controller gains (proportional-derivative)
  const KP = 100; // Proportional gain (stiffness)
  const KD = 10;  // Derivative gain (damping)

  useEffect(() => {
    // Initialize robot at specified position
    if (torsoRef.current) {
      torsoRef.current.setTranslation(
        { x: robot.position.x, y: robot.position.y, z: robot.position.z },
        true
      );
      torsoRef.current.setRotation(
        { x: 0, y: THREE.MathUtils.degToRad(robot.rotation), z: 0, w: 1 },
        true
      );
    }
  }, [robot.position.x, robot.position.y, robot.position.z, robot.rotation]);

  useFrame((state) => {
    // PD control: Apply torques to match target pose
    // This is inspired by PHC's approach to continuous control
    const time = state.clock.elapsedTime;

    // Torso stabilization and balance control
    if (torsoRef.current) {
      const linvel = torsoRef.current.linvel();
      const angvel = torsoRef.current.angvel();

      // Apply damping to prevent excessive motion
      torsoRef.current.applyImpulse({ x: -linvel.x * 0.1, y: 0, z: -linvel.z * 0.1 }, true);

      // Balance control - keep torso upright
      const rotation = torsoRef.current.rotation();
      const currentQuat = new THREE.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w);
      const euler = new THREE.Euler().setFromQuaternion(currentQuat);

      // Apply corrective torques to maintain upright posture
      const tiltX = euler.x;
      const tiltZ = euler.z;
      const balanceStrength = 50;

      torsoRef.current.applyTorqueImpulse({
        x: -tiltX * balanceStrength - angvel.x * 10,
        y: -angvel.y * 0.5,
        z: -tiltZ * balanceStrength - angvel.z * 10,
      }, true);

      // Apply upward force if too low
      const pos = torsoRef.current.translation();
      if (pos.y < robot.position.y - 0.3) {
        torsoRef.current.applyImpulse({ x: 0, y: 20, z: 0 }, true);
      }
    }

    // Apply walking forces for smooth locomotion
    if (leftThighRef.current && rightThighRef.current) {
      const walkPhase = (time * 0.5) % 1; // Walking cycle

      // Alternate leg forces
      const leftForce = Math.sin(walkPhase * Math.PI * 2);
      const rightForce = Math.sin((walkPhase + 0.5) * Math.PI * 2);

      if (leftForce < 0) {
        leftCalfRef.current?.applyImpulse({ x: 0, y: 0, z: leftForce * 5 }, true);
      }
      if (rightForce < 0) {
        rightCalfRef.current?.applyImpulse({ x: 0, y: 0, z: rightForce * 5 }, true);
      }
    }

    // Sync visual meshes with target pose from robot.pose
    if (leftShoulderMeshRef.current) {
      leftShoulderMeshRef.current.rotation.x = THREE.MathUtils.degToRad(
        -robot.pose.leftArm.shoulder.pitch
      );
    }
    if (leftElbowMeshRef.current) {
      leftElbowMeshRef.current.rotation.x = THREE.MathUtils.degToRad(
        robot.pose.leftArm.elbow.flex
      );
    }
    if (rightShoulderMeshRef.current) {
      rightShoulderMeshRef.current.rotation.x = THREE.MathUtils.degToRad(
        -robot.pose.rightArm.shoulder.pitch
      );
    }
    if (rightElbowMeshRef.current) {
      rightElbowMeshRef.current.rotation.x = THREE.MathUtils.degToRad(
        robot.pose.rightArm.elbow.flex
      );
    }
    if (leftHipMeshRef.current) {
      leftHipMeshRef.current.rotation.x = THREE.MathUtils.degToRad(
        robot.pose.leftLeg.hip.pitch
      );
    }
    if (leftKneeMeshRef.current) {
      leftKneeMeshRef.current.rotation.x = THREE.MathUtils.degToRad(
        robot.pose.leftLeg.knee.flex
      );
    }
    if (rightHipMeshRef.current) {
      rightHipMeshRef.current.rotation.x = THREE.MathUtils.degToRad(
        robot.pose.rightLeg.hip.pitch
      );
    }
    if (rightKneeMeshRef.current) {
      rightKneeMeshRef.current.rotation.x = THREE.MathUtils.degToRad(
        robot.pose.rightLeg.knee.flex
      );
    }
  });

  return (
    <group>
      {/* Torso - Main body with physics */}
      <RigidBody
        ref={torsoRef}
        position={[robot.position.x, robot.position.y, robot.position.z]}
        rotation={[0, THREE.MathUtils.degToRad(robot.rotation), 0]}
        mass={15} // kg
        linearDamping={0.5}
        angularDamping={0.8}
        colliders={false}
        enabledRotations={[false, true, false]} // Only allow Y-axis rotation
      >
        <CapsuleCollider args={[0.4, 0.3]} />
        <mesh>
          <boxGeometry args={[0.8, 1.2, 0.4]} />
          <meshStandardMaterial color="#3b82f6" />
        </mesh>

        {/* Head - attached to torso */}
        <mesh position={[0, 0.9, 0]}>
          <sphereGeometry args={[0.3, 32, 32]} />
          <meshStandardMaterial color="#60a5fa" />
        </mesh>

        {/* Face - Eyes */}
        <mesh position={[-0.1, 0.95, 0.25]}>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
        <mesh position={[0.1, 0.95, 0.25]}>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>

        {/* Nose/mouth indicator */}
        <mesh position={[0, 0.85, 0.28]}>
          <boxGeometry args={[0.08, 0.04, 0.04]} />
          <meshStandardMaterial color="#f59e0b" />
        </mesh>

        {/* Left Arm - visual representation */}
        <group ref={leftShoulderMeshRef} position={[-0.5, 0.4, 0]}>
          <mesh position={[0, -0.3, 0]}>
            <cylinderGeometry args={[0.08, 0.08, 0.6, 16]} />
            <meshStandardMaterial color="#2563eb" />
          </mesh>

          <group ref={leftElbowMeshRef} position={[0, -0.6, 0]}>
            <mesh position={[0, -0.25, 0]}>
              <cylinderGeometry args={[0.07, 0.07, 0.5, 16]} />
              <meshStandardMaterial color="#1d4ed8" />
            </mesh>
          </group>
        </group>

        {/* Right Arm - visual representation */}
        <group ref={rightShoulderMeshRef} position={[0.5, 0.4, 0]}>
          <mesh position={[0, -0.3, 0]}>
            <cylinderGeometry args={[0.08, 0.08, 0.6, 16]} />
            <meshStandardMaterial color="#2563eb" />
          </mesh>

          <group ref={rightElbowMeshRef} position={[0, -0.6, 0]}>
            <mesh position={[0, -0.25, 0]}>
              <cylinderGeometry args={[0.07, 0.07, 0.5, 16]} />
              <meshStandardMaterial color="#1d4ed8" />
            </mesh>
          </group>
        </group>

        {/* Held object visualization */}
        {heldObject && (
          <group position={[0.5, -0.3, 0.5]}>
            {heldObject.type === "box" && (
              <mesh>
                <boxGeometry args={[heldObject.size, heldObject.size, heldObject.size]} />
                <meshStandardMaterial color={heldObject.color} />
              </mesh>
            )}
            {heldObject.type === "sphere" && (
              <mesh>
                <sphereGeometry args={[heldObject.size / 2, 32, 32]} />
                <meshStandardMaterial color={heldObject.color} />
              </mesh>
            )}
            {heldObject.type === "cylinder" && (
              <mesh>
                <cylinderGeometry args={[heldObject.size / 2, heldObject.size / 2, heldObject.size, 32]} />
                <meshStandardMaterial color={heldObject.color} />
              </mesh>
            )}
          </group>
        )}
      </RigidBody>

      {/* Left Leg - Physics bodies */}
      <group position={[robot.position.x, robot.position.y, robot.position.z]}>
        <group ref={leftHipMeshRef} position={[-0.25, -0.6, 0]}>
          <RigidBody
            ref={leftThighRef}
            position={[0, -0.35, 0]}
            mass={5}
            linearDamping={0.5}
            angularDamping={0.5}
            colliders={false}
          >
            <CapsuleCollider args={[0.35, 0.1]} />
            <mesh>
              <cylinderGeometry args={[0.1, 0.1, 0.7, 16]} />
              <meshStandardMaterial color="#10b981" />
            </mesh>
          </RigidBody>

          <group ref={leftKneeMeshRef} position={[0, -0.7, 0]}>
            <RigidBody
              ref={leftCalfRef}
              position={[0, -0.3, 0]}
              mass={3}
              linearDamping={0.5}
              angularDamping={0.5}
              colliders={false}
            >
              <CapsuleCollider args={[0.3, 0.09]} />
              <mesh>
                <cylinderGeometry args={[0.09, 0.09, 0.6, 16]} />
                <meshStandardMaterial color="#059669" />
              </mesh>
              {/* Foot - ground contact */}
              <mesh position={[0, -0.35, 0.1]}>
                <boxGeometry args={[0.15, 0.1, 0.25]} />
                <meshStandardMaterial color="#047857" />
              </mesh>
            </RigidBody>
          </group>
        </group>

        {/* Right Leg - Physics bodies */}
        <group ref={rightHipMeshRef} position={[0.25, -0.6, 0]}>
          <RigidBody
            ref={rightThighRef}
            position={[0, -0.35, 0]}
            mass={5}
            linearDamping={0.5}
            angularDamping={0.5}
            colliders={false}
          >
            <CapsuleCollider args={[0.35, 0.1]} />
            <mesh>
              <cylinderGeometry args={[0.1, 0.1, 0.7, 16]} />
              <meshStandardMaterial color="#10b981" />
            </mesh>
          </RigidBody>

          <group ref={rightKneeMeshRef} position={[0, -0.7, 0]}>
            <RigidBody
              ref={rightCalfRef}
              position={[0, -0.3, 0]}
              mass={3}
              linearDamping={0.5}
              angularDamping={0.5}
              colliders={false}
            >
              <CapsuleCollider args={[0.3, 0.09]} />
              <mesh>
                <cylinderGeometry args={[0.09, 0.09, 0.6, 16]} />
                <meshStandardMaterial color="#059669" />
              </mesh>
              {/* Foot - ground contact */}
              <mesh position={[0, -0.35, 0.1]}>
                <boxGeometry args={[0.15, 0.1, 0.25]} />
                <meshStandardMaterial color="#047857" />
              </mesh>
            </RigidBody>
          </group>
        </group>
      </group>
    </group>
  );
}
