import { useEffect, useMemo, useRef } from 'react';
import { Physics } from '@react-three/rapier';
import * as THREE from 'three';
import campusLayoutRaw from '../data/campusLayout.json';
import hotspotsRaw from '../data/hotspots.json';
import type { CampusLayoutData } from '../types/campusLayout';
import type { HotspotData } from '../types/hotspot';
import type { QualityConfig } from '../hooks/useQualityTier';
import { DEFAULT_TIME_OF_DAY, type TimeOfDay } from '../theme/campusTheme';
import { CampusGround } from '../components/environment/CampusGround';
import { SoccerField } from '../components/environment/SoccerField';
import { CampusLake } from '../components/environment/CampusLake';
import { PerimeterFence } from '../components/environment/PerimeterFence';
import { CampusFoliage } from '../components/environment/CampusFoliage';
import { ProceduralBuilding } from '../components/buildings/ProceduralBuilding';
import { ArchGate } from '../components/landmarks/ArchGate';
import { MonumentBanhLai } from '../components/landmarks/MonumentBanhLai';
import { StarPlaza } from '../components/landmarks/StarPlaza';
import { LightingAndSky } from '../components/LightingAndSky';
import { PlayerController } from '../components/PlayerController';
import { useTourStore } from '../store/useTourStore';

interface CampusSceneProps {
  quality: QualityConfig;
  timeOfDay?: TimeOfDay;
}

const layout = campusLayoutRaw as unknown as CampusLayoutData;
const hotspots = hotspotsRaw as HotspotData[];

export function CampusScene({
  quality,
  timeOfDay = DEFAULT_TIME_OF_DAY,
}: CampusSceneProps) {
  const playerPosRef = useRef(new THREE.Vector3(0, 2, -8));
  const setSceneReady = useTourStore((s) => s.setSceneReady);

  // Báo hiệu cho LoadingScreen biết toàn bộ cảnh 3D và Rapier Physics đã mount thành công
  useEffect(() => {
    setSceneReady(true);
    return () => setSceneReady(false);
  }, [setSceneReady]);

  const hotspotMap = useMemo(() => {
    const map = new Map<string, HotspotData>();
    hotspots.forEach((h) => map.set(h.id, h));
    return map;
  }, []);

  const gateSpec = layout.landmarks.find((l) => l.type === 'arch-gate')!;
  const plazaSpec = layout.landmarks.find((l) => l.type === 'star-plaza')!;
  const monumentSpec = layout.landmarks.find((l) => l.type === 'monument-banh-lai')!;
  const soccerSpec = layout.landmarks.find((l) => l.type === 'soccer-field')!;
  const lakeSpec = layout.landmarks.find((l) => l.type === 'campus-lake')!;

  return (
    <>
      <LightingAndSky
        quality={quality}
        playerPosRef={playerPosRef}
        timeOfDay={timeOfDay}
      />

      <Physics gravity={[0, -24, 0]}>
        <CampusGround />
        <SoccerField position={soccerSpec.position} size={soccerSpec.size} />
        <CampusLake position={lakeSpec.position} size={lakeSpec.size} />
        <PerimeterFence />
        <CampusFoliage density={quality.foliageDensity} />

        <ArchGate position={gateSpec.position} />
        <MonumentBanhLai
          position={monumentSpec.position}
          facingDeg={monumentSpec.facingDeg ?? 0}
        />
        <StarPlaza
          position={plazaSpec.position}
          size={plazaSpec.size}
          facingDeg={plazaSpec.facingDeg ?? 0}
          hotspot={hotspotMap.get('star-plaza-main')}
        />

        {layout.buildings.map((building) => (
          <ProceduralBuilding
            key={building.id}
            spec={building}
            hotspot={hotspotMap.get(building.id)}
          />
        ))}

        <PlayerController playerPosRef={playerPosRef} />
      </Physics>
    </>
  );
}
