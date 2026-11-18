import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CapsuleCollider, RigidBody, RapierRigidBody, useRapier } from '@react-three/rapier';
import * as THREE from 'three';
import { usePlayerInput } from '../hooks/usePlayerInput';
import { useTourStore } from '../store/useTourStore';
import { LowPolyCharacter } from './character/LowPolyCharacter';

interface PlayerControllerProps {
  playerPosRef?: React.MutableRefObject<THREE.Vector3>;
}

// Khởi tạo tĩnh toàn bộ biến toán học ở phạm vi module (100% Zero Allocation trong useFrame)
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _moveDir = new THREE.Vector3();
const _playerPos = new THREE.Vector3();
const _camTarget = new THREE.Vector3();
const _idealCamOffset = new THREE.Vector3();
const _idealCamPos = new THREE.Vector3();
const _rayDir = new THREE.Vector3();
const _yAxis = new THREE.Vector3(0, 1, 0);
const _targetQuat = new THREE.Quaternion();
const _linvel = { x: 0, y: 0, z: 0 };

const MOVE_SPEED = 10.5;
const CAM_DISTANCE = 9.0;
const CAM_MIN_PITCH = 0.14;
const CAM_MAX_PITCH = Math.PI / 2.2;

export function PlayerController({ playerPosRef }: PlayerControllerProps) {
  const bodyRef = useRef<RapierRigidBody>(null);
  const visualRef = useRef<THREE.Group>(null);
  const speedRef = useRef(0);
  const keys = usePlayerInput();
  const { rapier, world } = useRapier();

  // Tái sử dụng 1 instance rapier.Ray duy nhất xuyên suốt vòng đời component
  const rayRef = useRef<InstanceType<typeof rapier.Ray> | null>(null);

  const cameraAngles = useRef({ yaw: 0.25, pitch: 0.42 });
  // Khởi tạo camera mượt ở vị trí gần player spawn (tránh lerp quá xa gây đen trong frame đầu)
  const smoothedCamPos = useRef(new THREE.Vector3(2, 4.5, -4));
  const smoothedLookAt = useRef(new THREE.Vector3(0, 1.5, -8));

  useFrame((state, delta) => {
    const body = bodyRef.current;
    if (!body) return;

    const camDelta = useTourStore.getState().consumeCameraDelta();
    if (camDelta.x !== 0 || camDelta.y !== 0) {
      cameraAngles.current.yaw -= camDelta.x * 0.005;
      cameraAngles.current.pitch = THREE.MathUtils.clamp(
        cameraAngles.current.pitch + camDelta.y * 0.005,
        CAM_MIN_PITCH,
        CAM_MAX_PITCH
      );
    }

    const { joystick } = useTourStore.getState();
    let inputX = joystick.x;
    let inputZ = joystick.y;

    if (keys.current.forward) inputZ += 1;
    if (keys.current.backward) inputZ -= 1;
    if (keys.current.left) inputX -= 1;
    if (keys.current.right) inputX += 1;

    const yaw = cameraAngles.current.yaw;
    _forward.set(-Math.sin(yaw), 0, -Math.cos(yaw)).normalize();
    _right.set(Math.cos(yaw), 0, -Math.sin(yaw)).normalize();

    _moveDir
      .set(0, 0, 0)
      .addScaledVector(_forward, inputZ)
      .addScaledVector(_right, inputX);

    if (_moveDir.lengthSq() > 1) {
      _moveDir.normalize();
    }

    const currentSpeed = _moveDir.length() * MOVE_SPEED;
    speedRef.current = currentSpeed;

    const currentVel = body.linvel();
    _linvel.x = _moveDir.x * MOVE_SPEED;
    _linvel.y = currentVel.y;
    _linvel.z = _moveDir.z * MOVE_SPEED;
    body.setLinvel(_linvel, true);

    if (_moveDir.lengthSq() > 0.01 && visualRef.current) {
      const targetAngle = Math.atan2(_moveDir.x, _moveDir.z);
      _targetQuat.setFromAxisAngle(_yAxis, targetAngle);
      visualRef.current.quaternion.slerp(_targetQuat, Math.min(1, delta * 12));
    }

    const pos = body.translation();
    _playerPos.set(pos.x, pos.y, pos.z);
    if (playerPosRef) {
      playerPosRef.current.copy(_playerPos);
    }

    _camTarget.set(pos.x, pos.y + 0.85, pos.z);

    const pitch = cameraAngles.current.pitch;
    _idealCamOffset.set(
      Math.sin(yaw) * Math.cos(pitch) * CAM_DISTANCE,
      Math.sin(pitch) * CAM_DISTANCE,
      Math.cos(yaw) * Math.cos(pitch) * CAM_DISTANCE
    );
    _idealCamPos.copy(_camTarget).add(_idealCamOffset);

    _rayDir.copy(_idealCamOffset).normalize();
    if (!rayRef.current) {
      rayRef.current = new rapier.Ray(_camTarget, _rayDir);
    } else {
      rayRef.current.origin.x = _camTarget.x;
      rayRef.current.origin.y = _camTarget.y;
      rayRef.current.origin.z = _camTarget.z;
      rayRef.current.dir.x = _rayDir.x;
      rayRef.current.dir.y = _rayDir.y;
      rayRef.current.dir.z = _rayDir.z;
    }

    const hit = world.castRay(
      rayRef.current,
      CAM_DISTANCE,
      true,
      undefined,
      undefined,
      undefined,
      body
    );

    if (hit && hit.timeOfImpact < CAM_DISTANCE) {
      const safeDist = Math.max(1.2, hit.timeOfImpact - 0.35);
      _idealCamPos.copy(_camTarget).addScaledVector(_rayDir, safeDist);
    }

    const lerpFactor = 1 - Math.exp(-12 * delta);
    smoothedCamPos.current.lerp(_idealCamPos, lerpFactor);
    smoothedLookAt.current.lerp(_camTarget, lerpFactor);

    state.camera.position.copy(smoothedCamPos.current);
    state.camera.lookAt(smoothedLookAt.current);
  });

  return (
    <RigidBody
      ref={bodyRef}
      colliders={false}
      position={[0, 2, -8]}
      enabledRotations={[false, false, false]}
      mass={1}
      linearDamping={0.5}
    >
      <CapsuleCollider args={[0.45, 0.45]} />
      <group ref={visualRef}>
        <LowPolyCharacter speedRef={speedRef} />
      </group>
    </RigidBody>
  );
}
