
import { Injectable, inject } from '@angular/core';
import * as THREE from 'three';
import { ThreeSceneService } from './three-scene.service';
import { FloorplanBuilderService } from './floorplan-builder.service';

@Injectable({
  providedIn: 'root'
})
export class PlayerControlsService {
  private threeSceneService = inject(ThreeSceneService);
  private floorplanBuilder = inject(FloorplanBuilderService);

  public player: THREE.Mesh | null = null;
  public playerSize = 0.5;
  private playerSpeed = 0.1;

  
  private moveVector = new THREE.Vector2(0, 0); 
  private keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false };

  
  private cameraDirection = new THREE.Vector3();
  private rightDirection = new THREE.Vector3();

  public initialize(): void {
    this.dispose();
    this.createPlayer();
  }

  private createPlayer(): void {
    const playerGeometry = new THREE.CylinderGeometry(this.playerSize / 2, this.playerSize / 2, this.playerSize * 2);
    const playerMaterial = new THREE.MeshStandardMaterial({ color: 0xff4444 });
    this.player = new THREE.Mesh(playerGeometry, playerMaterial);
    this.player.position.set(0, this.playerSize, 0);
    this.player.castShadow = true;
    this.threeSceneService.scene.add(this.player);
  }

  public dispose(): void {
    if (this.player) {
      try {
        this.threeSceneService.scene?.remove(this.player);
        this.player.geometry?.dispose();
        if (Array.isArray(this.player.material)) {
          this.player.material.forEach(material => material.dispose());
        } else {
          this.player.material?.dispose?.();
        }
      } catch {
        
      }
    }

    this.player = null;
    this.moveVector.set(0, 0);
    Object.keys(this.keys).forEach(key => ((this.keys as any)[key] = false));
  }

  
  public setKeyboardInput(key: string, state: boolean): void {
    if (key in this.keys) {
      (this.keys as any)[key] = state;
      
      
      this.moveVector.y = 0;
      this.moveVector.x = 0;
      if (this.keys.ArrowUp) this.moveVector.y += 1;
      if (this.keys.ArrowDown) this.moveVector.y -= 1;
      if (this.keys.ArrowLeft) this.moveVector.x -= 1;
      if (this.keys.ArrowRight) this.moveVector.x += 1;
    }
  }

  
  public setJoystickInput(x: number, y: number): void {
    
    if (this.keys.ArrowUp || this.keys.ArrowDown || this.keys.ArrowLeft || this.keys.ArrowRight) {
      return;
    }
    this.moveVector.x = -x; 
    this.moveVector.y = y;
  }

  
  public update(allowList: string[]): void { 
    if (!this.player || !this.threeSceneService.camera) return;

    
    this.threeSceneService.camera.getWorldDirection(this.cameraDirection);
    this.cameraDirection.y = 0;
    this.cameraDirection.normalize();
    this.rightDirection.crossVectors(this.threeSceneService.camera.up, this.cameraDirection).normalize();

    
    const finalMoveVector = new THREE.Vector3(0, 0, 0);
    finalMoveVector.addScaledVector(this.cameraDirection, this.moveVector.y); 
    finalMoveVector.addScaledVector(this.rightDirection, this.moveVector.x); 

    if (finalMoveVector.lengthSq() > 0) {
      finalMoveVector.normalize().multiplyScalar(this.playerSpeed);
      const newPosition = this.player.position.clone().add(finalMoveVector);

      
      if (!this.checkCollision(newPosition, allowList)) {
        this.player.position.copy(newPosition);
      }
    }
  }

  
  private checkCollision(newPosition: THREE.Vector3, allowList: string[]): boolean { 
    const playerBox = new THREE.Box3().setFromCenterAndSize(
      newPosition, new THREE.Vector3(this.playerSize, this.playerSize * 2, this.playerSize)
    );

    for (const wall of this.floorplanBuilder.getWallMeshes()) {
      if (playerBox.intersectsBox(new THREE.Box3().setFromObject(wall))) return true;
    }
    for (const obj of this.floorplanBuilder.getObjectMeshes()) {
      if (playerBox.intersectsBox(new THREE.Box3().setFromObject(obj))) return true;
    }
    
    for (const door of this.floorplanBuilder.getDoorMeshes()) {
      const doorId = door.userData['data'].id;
      
      if (!allowList.includes(doorId) && playerBox.intersectsBox(new THREE.Box3().setFromObject(door))) {
        return true;
      }
    }
    return false;
  }
}