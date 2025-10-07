import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Robot, PickableObject } from "../lib/types";

interface HumanoidProps {
  robot: Robot;
  heldObject?: PickableObject;
}

export default function Humanoid({ robot, heldObject }: HumanoidProps) {
  const leftShoulderRef = useRef<THREE.Group>(null);
  const leftElbowRef = useRef<THREE.Group>(null);
  const rightShoulderRef = useRef<THREE.Group>(null);
  const rightElbowRef = useRef<THREE.Group>(null);
  const leftHipRef = useRef<THREE.Group>(null);
  const leftKneeRef = useRef<THREE.Group>(null);
  const rightHipRef = useRef<THREE.Group>(null);
  const rightKneeRef = useRef<THREE.Group>(null);

  useFrame(() => {
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
    <group
      position={[robot.position.x, robot.position.y, robot.position.z]}
      rotation={[0, THREE.MathUtils.degToRad(robot.rotation), 0]}
    >
      {/* Body */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.8, 1.2, 0.4]} />
        <meshStandardMaterial color="#3b82f6" />
      </mesh>

      {/* Head */}
      <mesh position={[0, 0.9, 0]}>
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshStandardMaterial color="#60a5fa" />
      </mesh>

      {/* Face - Eyes to show front */}
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

      {/* Left Arm */}
      <group ref={leftShoulderRef} position={[-0.5, 0.4, 0]}>
        {/* Upper arm */}
        <mesh position={[0, -0.3, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.6, 16]} />
          <meshStandardMaterial color="#2563eb" />
        </mesh>

        {/* Elbow */}
        <group ref={leftElbowRef} position={[0, -0.6, 0]}>
          <mesh position={[0, -0.25, 0]}>
            <cylinderGeometry args={[0.07, 0.07, 0.5, 16]} />
            <meshStandardMaterial color="#1d4ed8" />
          </mesh>
        </group>
      </group>

      {/* Right Arm */}
      <group ref={rightShoulderRef} position={[0.5, 0.4, 0]}>
        {/* Upper arm */}
        <mesh position={[0, -0.3, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.6, 16]} />
          <meshStandardMaterial color="#2563eb" />
        </mesh>

        {/* Elbow */}
        <group ref={rightElbowRef} position={[0, -0.6, 0]}>
          <mesh position={[0, -0.25, 0]}>
            <cylinderGeometry args={[0.07, 0.07, 0.5, 16]} />
            <meshStandardMaterial color="#1d4ed8" />
          </mesh>
        </group>
      </group>

      {/* Left Leg */}
      <group ref={leftHipRef} position={[-0.25, -0.6, 0]}>
        {/* Upper leg (thigh) */}
        <mesh position={[0, -0.35, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 0.7, 16]} />
          <meshStandardMaterial color="#10b981" />
        </mesh>

        {/* Knee */}
        <group ref={leftKneeRef} position={[0, -0.7, 0]}>
          <mesh position={[0, -0.3, 0]}>
            <cylinderGeometry args={[0.09, 0.09, 0.6, 16]} />
            <meshStandardMaterial color="#059669" />
          </mesh>
        </group>
      </group>

      {/* Right Leg */}
      <group ref={rightHipRef} position={[0.25, -0.6, 0]}>
        {/* Upper leg (thigh) */}
        <mesh position={[0, -0.35, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 0.7, 16]} />
          <meshStandardMaterial color="#10b981" />
        </mesh>

        {/* Knee */}
        <group ref={rightKneeRef} position={[0, -0.7, 0]}>
          <mesh position={[0, -0.3, 0]}>
            <cylinderGeometry args={[0.09, 0.09, 0.6, 16]} />
            <meshStandardMaterial color="#059669" />
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
    </group>
  );
}
