import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Robot, PickableObject } from "../lib/types";

interface HumanoidProps {
  robot: Robot;
  heldObject?: PickableObject;
}

export default function Humanoid({ robot, heldObject }: HumanoidProps) {
  const groupRef = useRef<THREE.Group>(null);
  const torsoRef = useRef<THREE.Group>(null); // New: torso rotation
  const leftShoulderRef = useRef<THREE.Group>(null);
  const leftElbowRef = useRef<THREE.Group>(null);
  const rightShoulderRef = useRef<THREE.Group>(null);
  const rightElbowRef = useRef<THREE.Group>(null);
  const leftHipRef = useRef<THREE.Group>(null);
  const leftKneeRef = useRef<THREE.Group>(null);
  const rightHipRef = useRef<THREE.Group>(null);
  const rightKneeRef = useRef<THREE.Group>(null);

  useFrame(() => {
    // Simple position control without physics
    if (groupRef.current) {
      groupRef.current.position.set(robot.position.x, robot.position.y, robot.position.z);
      groupRef.current.rotation.y = THREE.MathUtils.degToRad(robot.rotation);
    }

    // Torso rotation (body lean)
    if (torsoRef.current && robot.pose.torso) {
      torsoRef.current.rotation.x = THREE.MathUtils.degToRad(-robot.pose.torso.pitch); // Negative for forward lean
      torsoRef.current.rotation.z = THREE.MathUtils.degToRad(robot.pose.torso.roll); // Left/right tilt
    }

    // Arms
    if (leftShoulderRef.current) {
      leftShoulderRef.current.rotation.x = THREE.MathUtils.degToRad(
        -robot.pose.leftArm.shoulder.pitch
      );
    }
    if (leftElbowRef.current) {
      leftElbowRef.current.rotation.x = THREE.MathUtils.degToRad(
        robot.pose.leftArm.elbow.flex
      );
    }
    if (rightShoulderRef.current) {
      rightShoulderRef.current.rotation.x = THREE.MathUtils.degToRad(
        -robot.pose.rightArm.shoulder.pitch
      );
    }
    if (rightElbowRef.current) {
      rightElbowRef.current.rotation.x = THREE.MathUtils.degToRad(
        robot.pose.rightArm.elbow.flex
      );
    }

    // Legs
    if (leftHipRef.current) {
      leftHipRef.current.rotation.x = THREE.MathUtils.degToRad(
        robot.pose.leftLeg.hip.pitch
      );
    }
    if (leftKneeRef.current) {
      leftKneeRef.current.rotation.x = THREE.MathUtils.degToRad(
        robot.pose.leftLeg.knee.flex
      );
    }
    if (rightHipRef.current) {
      rightHipRef.current.rotation.x = THREE.MathUtils.degToRad(
        robot.pose.rightLeg.hip.pitch
      );
    }
    if (rightKneeRef.current) {
      rightKneeRef.current.rotation.x = THREE.MathUtils.degToRad(
        robot.pose.rightLeg.knee.flex
      );
    }
  });

  return (
    <group ref={groupRef} position={[robot.position.x, robot.position.y, robot.position.z]}>
      {/* Torso group - can rotate for body lean */}
      <group ref={torsoRef}>
        {/* Body - Tesla Optimus style with white/gray panels */}
        <mesh position={[0, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.6, 1.0, 0.35]} />
          <meshStandardMaterial
            color="#e5e7eb"
            metalness={0.6}
            roughness={0.4}
          />
        </mesh>

        {/* Chest panel - darker accent */}
        <mesh position={[0, 0.1, 0.18]} castShadow>
          <boxGeometry args={[0.4, 0.6, 0.02]} />
          <meshStandardMaterial
            color="#1f2937"
            metalness={0.8}
            roughness={0.3}
          />
        </mesh>

        {/* Head - Spherical with visor */}
        <mesh position={[0, 0.75, 0]} castShadow receiveShadow>
          <sphereGeometry args={[0.25, 12, 12]} />
          <meshStandardMaterial
            color="#f3f4f6"
            metalness={0.5}
            roughness={0.4}
          />
        </mesh>

        {/* Visor - Dark glass-like surface */}
        <mesh position={[0, 0.77, 0.22]} rotation={[0.1, 0, 0]} castShadow>
          <boxGeometry args={[0.35, 0.12, 0.05]} />
          <meshStandardMaterial
            color="#111827"
            metalness={0.9}
            roughness={0.1}
            transparent={true}
            opacity={0.8}
          />
        </mesh>

        {/* Neck joint */}
        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[0.08, 0.1, 0.15, 16]} />
          <meshStandardMaterial
            color="#374151"
            metalness={0.7}
            roughness={0.3}
          />
        </mesh>

        {/* Left Arm - Optimus style with segmented panels */}
        <group ref={leftShoulderRef} position={[-0.35, 0.35, 0]}>
        {/* Shoulder joint */}
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.1, 6, 6]} />
          <meshStandardMaterial
            color="#6b7280"
            metalness={0.7}
            roughness={0.3}
          />
        </mesh>
        {/* Upper arm */}
        <mesh position={[0, -0.25, 0]} castShadow receiveShadow>
          <capsuleGeometry args={[0.07, 0.4, 8, 16]} />
          <meshStandardMaterial
            color="#d1d5db"
            metalness={0.6}
            roughness={0.4}
          />
        </mesh>
        <group ref={leftElbowRef} position={[0, -0.5, 0]}>
          {/* Elbow joint */}
          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[0.08, 8, 8]} />
            <meshStandardMaterial
              color="#6b7280"
              metalness={0.7}
              roughness={0.3}
            />
          </mesh>
          {/* Forearm */}
          <mesh position={[0, -0.2, 0]} castShadow receiveShadow>
            <capsuleGeometry args={[0.06, 0.35, 8, 16]} />
            <meshStandardMaterial
              color="#e5e7eb"
              metalness={0.5}
              roughness={0.4}
            />
          </mesh>
          {/* Hand */}
          <mesh position={[0, -0.42, 0]} castShadow>
            <boxGeometry args={[0.1, 0.12, 0.06]} />
            <meshStandardMaterial
              color="#9ca3af"
              metalness={0.6}
              roughness={0.4}
            />
          </mesh>
        </group>
      </group>

        {/* Right Arm */}
        <group ref={rightShoulderRef} position={[0.35, 0.35, 0]}>
          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[0.1, 8, 8]} />
            <meshStandardMaterial
              color="#6b7280"
              metalness={0.7}
              roughness={0.3}
            />
          </mesh>
          <mesh position={[0, -0.25, 0]} castShadow receiveShadow>
            <capsuleGeometry args={[0.07, 0.4, 8, 16]} />
            <meshStandardMaterial
              color="#d1d5db"
              metalness={0.6}
              roughness={0.4}
            />
          </mesh>
          <group ref={rightElbowRef} position={[0, -0.5, 0]}>
            <mesh position={[0, 0, 0]}>
              <sphereGeometry args={[0.08, 8, 8]} />
              <meshStandardMaterial
                color="#6b7280"
                metalness={0.7}
                roughness={0.3}
              />
            </mesh>
            <mesh position={[0, -0.2, 0]} castShadow receiveShadow>
              <capsuleGeometry args={[0.06, 0.35, 8, 16]} />
              <meshStandardMaterial
                color="#e5e7eb"
                metalness={0.5}
                roughness={0.4}
              />
            </mesh>
            <mesh position={[0, -0.42, 0]} castShadow>
              <boxGeometry args={[0.1, 0.12, 0.06]} />
              <meshStandardMaterial
                color="#9ca3af"
                metalness={0.6}
                roughness={0.4}
              />
            </mesh>
          </group>
        </group>
      </group> {/* End torso group */}

      {/* Left Leg - Thicker, more robust design */}
      <group ref={leftHipRef} position={[-0.18, -0.5, 0]}>
        {/* Hip joint */}
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshStandardMaterial
            color="#4b5563"
            metalness={0.7}
            roughness={0.3}
          />
        </mesh>
        {/* Thigh */}
        <mesh position={[0, -0.3, 0]} castShadow receiveShadow>
          <capsuleGeometry args={[0.09, 0.5, 8, 16]} />
          <meshStandardMaterial
            color="#d1d5db"
            metalness={0.6}
            roughness={0.4}
          />
        </mesh>
        <group ref={leftKneeRef} position={[0, -0.6, 0]}>
          {/* Knee joint */}
          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[0.09, 8, 8]} />
            <meshStandardMaterial
              color="#4b5563"
              metalness={0.7}
              roughness={0.3}
            />
          </mesh>
          {/* Calf */}
          <mesh position={[0, -0.25, 0]} castShadow receiveShadow>
            <capsuleGeometry args={[0.08, 0.4, 8, 16]} />
            <meshStandardMaterial
              color="#e5e7eb"
              metalness={0.5}
              roughness={0.4}
            />
          </mesh>
          {/* Foot */}
          <mesh position={[0, -0.5, 0.08]} castShadow receiveShadow>
            <boxGeometry args={[0.15, 0.08, 0.25]} />
            <meshStandardMaterial
              color="#374151"
              metalness={0.7}
              roughness={0.3}
            />
          </mesh>
        </group>
      </group>

      {/* Right Leg */}
      <group ref={rightHipRef} position={[0.18, -0.5, 0]}>
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshStandardMaterial
            color="#4b5563"
            metalness={0.7}
            roughness={0.3}
          />
        </mesh>
        <mesh position={[0, -0.3, 0]} castShadow receiveShadow>
          <capsuleGeometry args={[0.09, 0.5, 8, 16]} />
          <meshStandardMaterial
            color="#d1d5db"
            metalness={0.6}
            roughness={0.4}
          />
        </mesh>
        <group ref={rightKneeRef} position={[0, -0.6, 0]}>
          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[0.09, 8, 8]} />
            <meshStandardMaterial
              color="#4b5563"
              metalness={0.7}
              roughness={0.3}
            />
          </mesh>
          <mesh position={[0, -0.25, 0]} castShadow receiveShadow>
            <capsuleGeometry args={[0.08, 0.4, 8, 16]} />
            <meshStandardMaterial
              color="#e5e7eb"
              metalness={0.5}
              roughness={0.4}
            />
          </mesh>
          <mesh position={[0, -0.5, 0.08]} castShadow receiveShadow>
            <boxGeometry args={[0.15, 0.08, 0.25]} />
            <meshStandardMaterial
              color="#374151"
              metalness={0.7}
              roughness={0.3}
            />
          </mesh>
        </group>
      </group>

      {/* Held object visualization (attached to right hand) */}
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
              <sphereGeometry args={[heldObject.size / 2, 16, 16]} />
              <meshStandardMaterial color={heldObject.color} />
            </mesh>
          )}
          {heldObject.type === "cylinder" && (
            <mesh>
              <cylinderGeometry args={[heldObject.size / 2, heldObject.size / 2, heldObject.size, 16]} />
              <meshStandardMaterial color={heldObject.color} />
            </mesh>
          )}
        </group>
      )}
    </group>
  );
}
