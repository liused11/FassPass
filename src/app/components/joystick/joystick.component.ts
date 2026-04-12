
import { Component, ElementRef, HostListener, ViewChild, inject, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlayerControlsService } from '../../services/floorplan/player-controls.service';

@Component({
  selector: 'app-joystick',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './joystick.component.html',
  styleUrls: ['./joystick.component.css']
})
export class JoystickComponent {
  @ViewChild('base') private baseRef!: ElementRef<HTMLDivElement>;
  @ViewChild('stick') private stickRef!: ElementRef<HTMLDivElement>;

  private playerControls = inject(PlayerControlsService);
  private ngZone = inject(NgZone);

  private activePointerId: number | null = null;
  private baseRadius = 0;
  private stickRadius = 0;
  private maxMove = 0;
  private readonly stickPadding = 6;
  private isDragging = false;

  private get baseEl(): HTMLDivElement {
    return this.baseRef.nativeElement;
  }

  private get stickEl(): HTMLDivElement {
    return this.stickRef.nativeElement;
  }

  
  onPointerDown(event: PointerEvent): void {
    
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
    this.activePointerId = event.pointerId;

    this.recalculateBounds();

    try {
      this.baseEl.setPointerCapture(event.pointerId);
    } catch {
      
    }

    
    this.ngZone.runOutsideAngular(() => {
      this.updateStickPosition(event.clientX, event.clientY);
    });
  }

  
  @HostListener('window:pointermove', ['$event'])
  onPointerMove(event: PointerEvent): void {
    if (!this.isDragging || event.pointerId !== this.activePointerId) return;

    this.ngZone.runOutsideAngular(() => {
      this.updateStickPosition(event.clientX, event.clientY);
    });
  }

  
  @HostListener('window:pointerup', ['$event'])
  onPointerUp(event: PointerEvent): void {
    if (!this.isDragging || event.pointerId !== this.activePointerId) return;

    this.isDragging = false;
    this.releasePointerCapture(event.pointerId);
    this.resetStick();
  }

  @HostListener('window:pointercancel', ['$event'])
  onPointerCancel(event: PointerEvent): void {
    if (!this.isDragging || event.pointerId !== this.activePointerId) return;

    this.isDragging = false;
    this.releasePointerCapture(event.pointerId);
    this.resetStick();
  }

  private updateStickPosition(clientX: number, clientY: number): void {
    const baseRect = this.baseEl.getBoundingClientRect();
    const baseCenterX = baseRect.left + baseRect.width / 2;
    const baseCenterY = baseRect.top + baseRect.height / 2;

    let deltaX = clientX - baseCenterX;
    let deltaY = clientY - baseCenterY;

    
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const maxMove = this.maxMove || Math.max(0, baseRect.width / 2 - this.stickEl.offsetWidth / 2 - this.stickPadding);

    if (maxMove <= 0) {
      return;
    }

    if (distance > maxMove) {
      deltaX = (deltaX / distance) * maxMove;
      deltaY = (deltaY / distance) * maxMove;
    }

    
    this.stickEl.style.transform = `translate(${deltaX}px, ${deltaY}px)`;

    
    
    const vectorX = deltaX / maxMove;
    const vectorY = -deltaY / maxMove;

    
    this.playerControls.setJoystickInput(vectorX, vectorY);
  }

  private recalculateBounds(): void {
    const baseRect = this.baseEl.getBoundingClientRect();
    const stickRect = this.stickEl.getBoundingClientRect();

    this.baseRadius = baseRect.width / 2;
    this.stickRadius = stickRect.width / 2;
    this.maxMove = Math.max(0, this.baseRadius - this.stickRadius - this.stickPadding);
  }

  private releasePointerCapture(pointerId: number): void {
    const baseEl = this.baseRef?.nativeElement;
    if (!baseEl) return;

    try {
      if ((baseEl as any).hasPointerCapture?.(pointerId)) {
        baseEl.releasePointerCapture(pointerId);
      }
    } catch {
      
    }
  }

  private resetStick(): void {
    this.activePointerId = null;
    this.stickEl.style.transform = 'translate(0px, 0px)';
    this.playerControls.setJoystickInput(0, 0);
  }
}
