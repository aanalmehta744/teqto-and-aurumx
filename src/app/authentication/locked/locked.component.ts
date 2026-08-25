import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { UntypedFormBuilder, UntypedFormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Role, AuthService } from '@core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { environment } from 'environments/environment';

@Component({
  selector: 'app-locked',
  templateUrl: './locked.component.html',
  styleUrls: ['./locked.component.scss'],
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    RouterLink,
  ],
})
export class LockedComponent implements OnInit {
  authForm!: UntypedFormGroup;
  submitted = false;
  userImg: string | undefined; // Make this optional
  userFullName: string | undefined; // Make this optional
  hide = true;

  constructor(
    private formBuilder: UntypedFormBuilder,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.authForm = this.formBuilder.group({
      password: ['', Validators.required],
    });

    const currentUser = this.authService.currentUserValue;

    if (currentUser) {
      // Ensure that currentUser is not null before accessing its properties
      this.userImg = currentUser.img;
      this.userFullName = currentUser.first_name + ' ' + currentUser.last_name;
    }
  }

  get f() {
    return this.authForm.controls;
  }
  getImageUrl(img:string){
    if (!img) return 'assets/images/defult-profile.png';
    if (img.startsWith('http')) return img;
    return `${environment.apiUrl.replace('/api','')}/uploads/employees/${img}`;
  }
//   onSubmit() {
//     this.submitted = true;

//     // Stop here if form is invalid
//     if (this.authForm.invalid) {
//       return;
//     } else {
//       const currentUser = this.authService.currentUserValue;

//       // if (currentUser) {
//       //   const role = currentUser.role;

//       //   if (role === Role.All || role === Role.Admin) {
//       //     this.router.navigate(['/admin/dashboard/main']);
//       //   } else if (role === Role.Employee) {
//       //     this.router.navigate(['/employee/dashboard']);
//       //   } else if (role === Role.BDE) {
//       //     this.router.navigate(['/client/dashboard']);
//       //   } else {
//       //     this.router.navigate(['/authentication/signin']);
//       //   }
//       // }
//       if (role === Role.All || role === Role.Admin) {

//   this.router.navigate(['/admin/dashboard/main']);

// } else if (role === Role.Employee) {

//   const department = currentUser.department?.toLowerCase().trim();

//   if (department === 'bde') {

//     this.router.navigate(['/client/dashboard']);

//   } else if (department === 'ba') {

//     this.router.navigate(['/ba/dashboard/main']);

//   } else {

//     this.router.navigate(['/employee/dashboard']);

//   }

// } else {

//   this.router.navigate(['/authentication/signin']);

// }
//     }
//   }
onSubmit() {
  this.submitted = true;

  if (this.authForm.invalid) {
    return;
  }

  const currentUser = this.authService.currentUserValue;

  if (!currentUser) {
    this.router.navigate(['/authentication/signin']);
    return;
  }

  const role = String(currentUser.role || '').toLowerCase().trim();
  const department = String(currentUser.department || '').toLowerCase().trim();

  if (role === 'admin') {

    this.router.navigate(['/admin/dashboard/main']);

  } else if (role === 'employee') {

    if (department === 'bde') {

      this.router.navigate(['/client/dashboard']);

    } else if (department === 'ba') {

      this.router.navigate(['/ba/dashboard']);

    } else {

      this.router.navigate(['/employee/dashboard']);

    }

  } else {

    this.router.navigate(['/authentication/signin']);

  }
}
}
