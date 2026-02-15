
import { Component, OnInit } from '@angular/core';
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

  vehicleForm: FormGroup;

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
    // Default image based on type
    this.updateDefaultImage();
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
    if (this.vehicleForm.valid) {
      const formValue = this.vehicleForm.value;
      
      // Construct Vehicle Object
      const newVehicle: Partial<Vehicle> = {
        model: `${formValue.brand} ${formValue.model}`,
        licensePlate: `${formValue.licensePlate} ${formValue.province}`,
        province: formValue.province,
        image: this.selectedImage || 'https://img.freepik.com/free-photo/blue-car-speed-motion-stretch-style_53876-126838.jpg', // Fallback
        isDefault: false,
        status: 'active',
        lastUpdate: 'เพิ่งเพิ่ม',
        rank: 99 // Will be assigned by service
      };

      this.modalCtrl.dismiss(newVehicle, 'confirm');
    } else {
      this.vehicleForm.markAllAsTouched();
    }
  }

  // Helper for validation display
  isControlInvalid(controlName: string): boolean {
    const control = this.vehicleForm.get(controlName);
    return !!(control && control.invalid && control.touched);
  }
}
