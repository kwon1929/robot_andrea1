import type { PickableObject } from "../lib/types";

interface PickableObjectProps {
  object: PickableObject;
}

export default function PickableObjectComponent({ object }: PickableObjectProps) {
  if (object.isPicked) return null; // Don't render if picked up

  return (
    <mesh position={[object.position.x, object.position.y, object.position.z]}>
      {object.type === "box" && <boxGeometry args={[object.size, object.size, object.size]} />}
      {object.type === "sphere" && <sphereGeometry args={[object.size / 2, 32, 32]} />}
      {object.type === "cylinder" && <cylinderGeometry args={[object.size / 2, object.size / 2, object.size, 32]} />}
      <meshStandardMaterial color={object.color} />
    </mesh>
  );
}
