import { Component, OnInit, Input } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Vehicle } from '../../data/models';

@Component({
  selector: 'app-add-vehicle-modal',
  templateUrl: './add-vehicle-modal.component.html',
  styleUrls: ['./add-vehicle-modal.component.scss'],
  standalone: false
})
export class AddVehicleModalComponent implements OnInit {

  @Input() editVehicle?: Vehicle; // Add Input to accept vehicle for editing

  vehicleForm: FormGroup;
  isEditMode: boolean = false;

  // Mock Data for Selectors
  vehicleTypes = [
    { value: 'car', label: 'รถยนต์ทั่วไป', icon: 'car-sport' },
    { value: 'ev', label: 'รถไฟฟ้า (EV)', icon: 'flash' },
    { value: 'motorcycle', label: 'รถจักรยานยนต์', icon: 'bicycle' }
  ];

  brands = [
    'Toyota', 'Honda', 'Nissan', 'Mazda', 'Mitsubishi', 'Isuzu',
    'Suzuki', 'Ford', 'MG', 'BMW', 'Mercedes-Benz', 'BYD', 'GWM', 'Tesla'
  ];

  provinces = [
    'กรุงเทพมหานคร', 'กระบี่', 'กาญจนบุรี', 'กาฬสินธุ์', 'กำแพงเพชร', 'ขอนแก่น', 'จันทบุรี', 'ฉะเชิงเทรา', 'ชลบุรี', 'ชัยนาท',
    'ชัยภูมิ', 'ชุมพร', 'เชียงราย', 'เชียงใหม่', 'ตรัง', 'ตราด', 'ตาก', 'นครนายก', 'นครปฐม', 'นครพนม',
    'นครราชสีมา', 'นครศรีธรรมราช', 'นครสวรรค์', 'นนทบุรี', 'นราธิวาส', 'น่าน', 'บึงกาฬ', 'บุรีรัมย์', 'ปทุมธานี', 'ประจวบคีรีขันธ์',
    'ปราจีนบุรี', 'ปัตตานี', 'พระนครศรีอยุธยา', 'พะเยา', 'พังงา', 'พัทลุง', 'พิจิตร', 'พิษณุโลก', 'เพชรบุรี', 'เพชรบูรณ์',
    'แพร่', 'ภูเก็ต', 'มหาสารคาม', 'มุกดาหาร', 'แม่ฮ่องสอน', 'ยโสธร', 'ยะลา', 'ร้อยเอ็ด', 'ระนอง', 'ระยอง',
    'ราชบุรี', 'ลพบุรี', 'ลำปาง', 'ลำพูน', 'เลย', 'ศรีสะเกษ', 'สกลนคร', 'สงขลา', 'สตูล', 'สมุทรปราการ',
    'สมุทรสงคราม', 'สมุทรสาคร', 'สระแก้ว', 'สระบุรี', 'สิงห์บุรี', 'สุโขทัย', 'สุพรรณบุรี', 'สุราษฎร์ธานี', 'สุรินทร์', 'หนองคาย',
    'หนองบัวลำภู', 'อ่างทอง', 'อำนาจเจริญ', 'อุดรธานี', 'อุตรดิตถ์', 'อุทัยธานี', 'อุบลราชธานี'
  ];

  selectedImage: string | null = null;

  constructor(
    private modalCtrl: ModalController,
    private fb: FormBuilder
  ) {
    this.vehicleForm = this.fb.group({
      type: ['car', Validators.required],
      brand: ['', Validators.required],
      model: ['', Validators.required],
      color: ['', Validators.required],
      licensePlate: ['', [Validators.required, Validators.pattern(/^[0-9ก-ฮ]{1,3}[0-9ก-ฮ]{1,2} [0-9]{1,4}$/)]], // Basic Thai plate regex
      province: ['กรุงเทพมหานคร', Validators.required]
    });
  }

  ngOnInit() {
    if (this.editVehicle) {
      this.isEditMode = true;
      this.selectedImage = this.editVehicle.image || null;

      // Attempt to split model into brand and model part if they were concatenated
      let brand = '';
      let modelPart = this.editVehicle.model || '';

      // Basic splitting logic (assumes first word is brand, rest is model)
      if (modelPart.includes(' ')) {
        const parts = modelPart.split(' ');
        brand = parts[0];
        modelPart = parts.slice(1).join(' ');
      }

      this.vehicleForm.patchValue({
        type: 'car', // Assume car for now or derive from data
        brand: brand,
        model: modelPart,
        color: this.editVehicle.color || '',
        licensePlate: this.editVehicle.licensePlate || '',
        province: this.editVehicle.province || 'กรุงเทพมหานคร'
      });
    } else {
      // Default image based on type
      this.updateDefaultImage();
    }
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        this.selectedImage = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  updateDefaultImage() {
    if (this.selectedImage) return; // User uploaded overrides default

    // Simple placeholder logic
    const type = this.vehicleForm.get('type')?.value;
    // In real app, map to assets. For now use placeholder.
  }

  close() {
    this.modalCtrl.dismiss(null, 'cancel');
  }

  submit() {
    console.log('[AddVehicleModal] Submit called');
    if (this.vehicleForm.valid) {
      console.log('[AddVehicleModal] Form is valid');
      const formValue = this.vehicleForm.value;

      // Construct Vehicle Object
      const newVehicle: Partial<Vehicle> = {
        model: `${formValue.brand} ${formValue.model}`,
        licensePlate: formValue.licensePlate, // Send clean plate, province is separate
        province: formValue.province,
        color: formValue.color, // Add color
        image: this.selectedImage || 'https://img.freepik.com/free-photo/blue-car-speed-motion-stretch-style_53876-126838.jpg', // Fallback
        isDefault: this.isEditMode ? this.editVehicle?.isDefault : false,
        status: this.isEditMode ? this.editVehicle?.status : 'active',
        lastUpdate: 'เพิ่งเพิ่ม',
        rank: this.isEditMode ? this.editVehicle?.rank : 99 // Will be assigned by service if new
      };

      if (this.isEditMode && this.editVehicle?.id) {
        newVehicle.id = this.editVehicle.id;
      }

      this.modalCtrl.dismiss(newVehicle, 'confirm');
    } else {
      console.warn('[AddVehicleModal] Form is invalid');
      this.vehicleForm.markAllAsTouched();

      // Log errors
      Object.keys(this.vehicleForm.controls).forEach(key => {
        const controlErrors = this.vehicleForm.get(key)?.errors;
        if (controlErrors) {
          console.error(`[AddVehicleModal] Invalid control: ${key}`, controlErrors);
        }
      });
    }
  }

  // Helper for validation display
  isControlInvalid(controlName: string): boolean {
    const control = this.vehicleForm.get(controlName);
    return !!(control && control.invalid && control.touched);
  }
}
