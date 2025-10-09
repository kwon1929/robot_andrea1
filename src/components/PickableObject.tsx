import type { PickableObject } from "../lib/types";

interface PickableObjectProps {
  object: PickableObject;
}

export default function PickableObjectComponent({ object }: PickableObjectProps) {
  if (object.isPicked) return null; // Don't render if picked up

  // Calculate proper ground position based on object type and size
  const groundPlane = -2; // Ground plane
  let objectY = groundPlane;

  if (object.type === "box" || object.type === "cylinder") {
    objectY = groundPlane + object.size / 2; // Bottom of box/cylinder touches ground
  } else if (object.type === "sphere") {
    objectY = groundPlane + object.size / 2; // Bottom of sphere touches ground
  }

  return (
    <group position={[object.position.x, objectY, object.position.z]}>
      <mesh castShadow receiveShadow>
        {object.type === "box" && <boxGeometry args={[object.size, object.size, object.size]} />}
        {object.type === "sphere" && <sphereGeometry args={[object.size / 2, 16, 16]} />}
        {object.type === "cylinder" && <cylinderGeometry args={[object.size / 2, object.size / 2, object.size, 16]} />}
        <meshStandardMaterial
          color={object.color}
          metalness={0.6}
          roughness={0.3}
          emissive={object.color}
          emissiveIntensity={0.2}
        />
      </mesh>
      {/* Holographic outline effect */}
      <mesh scale={1.05}>
        {object.type === "box" && <boxGeometry args={[object.size, object.size, object.size]} />}
        {object.type === "sphere" && <sphereGeometry args={[object.size / 2, 16, 16]} />}
        {object.type === "cylinder" && <cylinderGeometry args={[object.size / 2, object.size / 2, object.size, 16]} />}
        <meshBasicMaterial
          color="#00ffff"
          transparent
          opacity={0.15}
          wireframe
        />
      </mesh>
    </group>
  );
}
