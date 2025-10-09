import { useEffect, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import Humanoid from "./Humanoid";
import PickableObjectComponent from "./PickableObject";
import type { Robot, PickableObject } from "../lib/types";

interface SceneProps {
  robots: Robot[];
  objects: PickableObject[];
  usePhysics?: boolean;
}

export default function Scene({ robots, objects, usePhysics = true }: SceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);

  useEffect(() => {
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      console.error("⚠️ WebGL context lost! Attempting to restore...");

      // Force reload after 1 second if not restored
      setTimeout(() => {
        if (glRef.current?.isContextLost()) {
          console.error("Context not restored. Reloading page...");
          window.location.reload();
        }
      }, 1000);
    };

    const handleContextRestored = () => {
      console.log("✅ WebGL context restored successfully.");
    };

    const canvas = canvasRef.current;
    if (canvas) {
      // Store GL context reference
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      glRef.current = gl as WebGLRenderingContext;

      canvas.addEventListener("webglcontextlost", handleContextLost);
      canvas.addEventListener("webglcontextrestored", handleContextRestored);

      return () => {
        canvas.removeEventListener("webglcontextlost", handleContextLost);
        canvas.removeEventListener("webglcontextrestored", handleContextRestored);
      };
    }
  }, []);

  return (
    <Canvas
      ref={canvasRef as any}
      camera={{ position: [4, 1, 5], fov: 50 }}
      gl={{
        alpha: false, // Changed: no transparency needed
        antialias: true,
        powerPreference: "high-performance",
        failIfMajorPerformanceCaveat: false,
        preserveDrawingBuffer: false, // Don't preserve buffer (saves memory)
        depth: true,
        stencil: false, // Don't need stencil buffer
      }}
      shadows
      dpr={[1, 1.5]} // Limit pixel ratio to save memory
      performance={{ min: 0.5 }}
      frameloop="always" // Keep animations running
    >
      {/* Natural white lighting for Tesla Optimus aesthetic */}
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[10, 10, 5]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[512, 512]} // Reduced from 1024 to save memory
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      {/* Reduced point lights to 1 to save GPU */}
      <pointLight position={[0, 5, 0]} intensity={0.5} />

      {/* Light fog for depth */}
      <fog attach="fog" args={["#d1d5db", 10, 30]} />

      {robots.map((robot) => {
        const heldObject = robot.holdingObjectId
          ? objects.find((obj) => obj.id === robot.holdingObjectId)
          : undefined;
        return <Humanoid key={robot.id} robot={robot} heldObject={heldObject} />;
      })}

      {objects.map((obj) => (
        <PickableObjectComponent key={obj.id} object={obj} />
      ))}

      {/* Ground plane with clean white/gray material */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial
          color="#f9fafb"
          metalness={0.1}
          roughness={0.8}
        />
      </mesh>

      {/* Clean grid lines for lab aesthetic */}
      <gridHelper
        args={[30, 30, "#9ca3af", "#e5e7eb"]}
        position={[0, -1.99, 0]}
      />

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={2}
        maxDistance={15}
      />
    </Canvas>
  );
}
