import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { BreadcrumbComponent } from '@shared/components/breadcrumb/breadcrumb.component';
import { DepartmentsService, Department } from './departments.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-departments', standalone: true,
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, BreadcrumbComponent],
  templateUrl: './departments.component.html'
})
export class DepartmentsComponent implements OnInit {
  departments: Department[] = [];
  newDepartment = '';
  loading = false;
  canManage = false;
  constructor(private service: DepartmentsService) {}
  ngOnInit() {
    const user = JSON.parse(localStorage.getItem('currentUser') || 'null');
    this.canManage = user?.role?.toLowerCase() === 'admin' || user?.department?.toLowerCase() === 'hr';
    this.load();
  }
  load() { this.loading = true; this.service.getAll().subscribe({ next: d => { this.departments = d; this.loading = false; }, error: () => { this.loading = false; } }); }
  add() {
    const name = this.newDepartment.trim();
    if (!name) return;
    this.service.create(name).subscribe({
      next: d => { this.departments = [...this.departments, d].sort((a,b) => a.name.localeCompare(b.name)); this.newDepartment = ''; Swal.fire({icon:'success', title:'Department Added', text:`${d.name} has been added.`}); },
      error: err => Swal.fire({icon:'error', title:'Cannot Add Department', text: err?.error?.message || 'Please try again.'})
    });
  }
  remove(dept: Department) {
    Swal.fire({icon:'warning', title:'Delete department?', text:`Delete ${dept.name}?`, showCancelButton:true, confirmButtonText:'Delete', confirmButtonColor:'#d33'}).then(r => {
      if (!r.isConfirmed) return;
      this.service.delete(dept.id).subscribe({
        next: () => { this.departments = this.departments.filter(d => d.id !== dept.id); Swal.fire({icon:'success', title:'Deleted', text:'Department deleted successfully.', timer:1200, showConfirmButton:false}); },
        error: err => Swal.fire({icon:'error', title:'Cannot Delete', text: err?.error?.message || 'Please try again.'})
      });
    });
  }
}
