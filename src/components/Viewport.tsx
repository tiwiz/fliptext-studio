import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, ContactShadows } from '@react-three/drei';
import { Suspense, useMemo, useRef, useEffect } from 'react';
import { Vector3 } from 'three';
import { STLLoader } from 'three-stdlib';

interface ViewportProps {
  stlData: string | null;
}

function StlMesh({ stlData }: { stlData: string | null }) {
  const meshRef = useRef<any>(null);

  const geometry = useMemo(() => {
    if (!stlData) return null;
    try {
      const loader = new STLLoader();
      const geo = loader.parse(stlData);
      geo.computeVertexNormals();
      return geo;
    } catch (err) {
      console.error('STL parse error:', err);
      return null;
    }
  }, [stlData]);

  useEffect(() => {
    if (meshRef.current && geometry) {
      geometry.computeBoundingBox();
      const box = geometry.boundingBox!;
      const center = new Vector3(
        (box.max.x + box.min.x) / 2,
        (box.max.y + box.min.y) / 2,
        (box.max.z + box.min.z) / 2,
      );
      meshRef.current.position.set(-center.x, -center.y, -center.z);
    }
  }, [geometry]);

  if (!geometry) return null;

  return (
    <mesh ref={meshRef} geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial
        color="#f0ebe3"
        roughness={0.65}
        metalness={0.0}
        side={2}
      />
    </mesh>
  );
}

export default function Viewport({ stlData }: ViewportProps) {
  return (
    <div className="w-full h-full touch-none select-none">
      <Canvas
        camera={{ position: [200, 150, 250], fov: 35 }}
        shadows
        gl={{
          antialias: true,
          toneMapping: 3,
          toneMappingExposure: 1.2,
        }}
        style={{ background: '#1a1a1f' }}
        // Prevent browser from intercepting touch for scrolling
        onPointerDown={(e) => e.stopPropagation()}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.5} />
          <directionalLight
            position={[150, 200, 100]}
            intensity={1.8}
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
            castShadow
          />
          <directionalLight
            position={[-100, 100, -50]}
            intensity={0.4}
          />
          <directionalLight
            position={[0, -100, 0]}
            intensity={0.2}
            color="#8ecae6"
          />

          <StlMesh stlData={stlData} />

          <Grid
            args={[500, 500]}
            cellSize={10}
            cellThickness={0.6}
            cellColor="#3a3a3f"
            sectionSize={50}
            sectionThickness={1.5}
            sectionColor="#555"
            fadeDistance={400}
            position={[0, 0, -0.5]}
          />

          <ContactShadows
            position={[0, 0, 0]}
            opacity={0.35}
            scale={400}
            blur={2.5}
            far={50}
          />

          <OrbitControls
            enableDamping
            dampingFactor={0.15}
            minDistance={50}
            maxDistance={600}
            autoRotate={!stlData}
            autoRotateSpeed={1.5}
            // Touch-specific tuning
            zoomSpeed={0.85}
            rotateSpeed={0.8}
            panSpeed={0.5}
            enablePan={true}
            // Better feel on mobile
            target={[0, 0, 0]}
          />
        </Suspense>
      </Canvas>

      {/* Touch hint on mobile when model is loaded */}
      {stlData && (
        <div className="absolute bottom-24 md:bottom-4 left-1/2 -translate-x-1/2 pointer-events-none opacity-0 md:opacity-0 transition-opacity duration-1000">
          <span className="text-[10px] text-zinc-600 bg-zinc-900/70 px-2 py-1 rounded-full">
            🖱 Rotate · Scroll zoom · Drag pan
          </span>
        </div>
      )}

      {!stlData && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-zinc-500 text-sm font-medium tracking-wider uppercase select-none">
            Generate a model to preview
          </p>
        </div>
      )}
    </div>
  );
}
