import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import Humanoid from "./Humanoid";
import PickableObjectComponent from "./PickableObject";
import type { Robot, PickableObject } from "../lib/types";

interface SceneProps {
  robots: Robot[];
  objects: PickableObject[];
}

export default function Scene({ robots, objects }: SceneProps) {
  return (
    <Canvas camera={{ position: [3, 2, 5], fov: 50 }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} />

      {robots.map((robot) => {
        const heldObject = robot.holdingObjectId
          ? objects.find((obj) => obj.id === robot.holdingObjectId)
          : undefined;
        return <Humanoid key={robot.id} robot={robot} heldObject={heldObject} />;
      })}

      {objects.map((obj) => (
        <PickableObjectComponent key={obj.id} object={obj} />
      ))}

      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#374151" />
      </mesh>

      {/* Grid lines on ground */}
      <gridHelper args={[20, 20, "#6b7280", "#4b5563"]} position={[0, -1.99, 0]} />

      <OrbitControls />
    </Canvas>
  );
}
