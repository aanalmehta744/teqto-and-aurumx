import { Component, OnInit } from '@angular/core';
import { BreadcrumbComponent } from '@shared/components/breadcrumb/breadcrumb.component';
import { ActivatedRoute } from '@angular/router';
import { EmployeeSalaryService } from '../employee-salary/employee-salary.service';
import { EmployeeSalary } from '../employee-salary/employee-salary.model';
import { PayrollService } from './payroll.service';
import { CommonModule } from '@angular/common';
import { EmployeesService } from 'app/admin/employees/allEmployees/employees.service';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { COMPANY_LOGO_DATA_URL } from 'app/shared/company-logo.data';

@Component({
  selector: 'app-payslip',
  templateUrl: './payslip.component.html',
  styleUrls: ['./payslip.component.scss'],
  standalone: true,
  imports: [
    BreadcrumbComponent,
    CommonModule,
    MatButtonModule,
    MatIconModule,
    FormsModule
  ],
})
export class PayslipComponent implements OnInit {
  companyLogo = COMPANY_LOGO_DATA_URL;
  employeeSalary: EmployeeSalary | null = null;
  selectedEmployee: any = null;
  payslipID: any;
  empID: any;
  isEditingDays = false;
  tempWorkingDays: number | null = null;
  isEditingAddon = false;
  tempAddonAmount: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private payrollService: PayrollService,
    private employeeSalaryService: EmployeeSalaryService,
    private employeeService: EmployeesService,
  ) { }

  get monthName(): string {
    const names = ['','January','February','March','April','May','June','July','August','September','October','November','December'];
    return names[this.employeeSalary?.month || 0] || '';
  }

  enableEditDays() {
    if (this.employeeSalary) {
      this.tempWorkingDays = this.employeeSalary.workingDays;
      this.isEditingDays = true;
    }
  }

  enableEditAddon() {
    if (this.employeeSalary) {
      this.tempAddonAmount = +(this.employeeSalary.addonAmount || 0);
      this.isEditingAddon = true;
    }
  }

  saveAddonAmount() {
    if (this.employeeSalary && this.tempAddonAmount !== null) {
      this.employeeSalary.addonAmount = this.tempAddonAmount;
      this.employeeSalaryService.updatePayslipOverride(
        this.employeeSalary.employeeId,
        this.employeeSalary.month,
        this.employeeSalary.year,
        {
          workingDays: this.employeeSalary.workingDays,
          paidLeaveDays: this.employeeSalary.paidLeaveDays || 0,
          unpaidLeaveDays: this.employeeSalary.unpaidLeaveDays || 0,
          netSalary: this.employeeSalary.netSalary,
          addonAmount: this.tempAddonAmount,
        }
      ).subscribe({
        next: () => { this.isEditingAddon = false; },
        error: (err) => { console.error('Error saving addon amount:', err); }
      });
    }
  }

  cancelEditAddon() {
    this.isEditingAddon = false;
    this.tempAddonAmount = null;
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const empId = +params.get('id')!;
      this.empID = empId;
      // fetch employee info
      this.employeeService.getEmployeeById(empId).subscribe({
        next: (data) => {
          this.selectedEmployee = data;
          console.log("Employee Deatils ", this.selectedEmployee);

        },
        error: (err) => {
          console.error('Failed to fetch employee details:', err);
        }
      });
      this.route.queryParamMap.subscribe(queryParams => {
        const month = Number(queryParams.get('month'));
        const year = Number(queryParams.get('year'));

        if (this.empID && month && year) {
          this.loadPayslipData(this.empID, month, year);
        } else if (this.empID) {
          // fallback: load with current month/year if not passed
          const currentMonth = new Date().getMonth() + 1;
          const currentYear = new Date().getFullYear();
          this.loadPayslipData(this.empID, currentMonth, currentYear);
        }
      });
    });
  }
  saveWorkingDays() {
    if (this.employeeSalary && this.tempWorkingDays !== null) {
      this.employeeSalary.workingDays = this.tempWorkingDays;

      // Ensure salary is treated as a number
      const monthlySalary: number = Number(this.employeeSalary.salary) || 0;
      const totalDays: number = this.employeeSalary.totalDays || 30;
      const perDayRate: number = monthlySalary / totalDays;

      // Calculate new net salary as number
      const newNetSalary = +(perDayRate * this.tempWorkingDays).toFixed(2);

      this.employeeSalary.netSalary = newNetSalary; //  keep as number

      //  Call backend override PATCH
      this.employeeSalaryService
        .updatePayslipOverride(
          this.employeeSalary.employeeId,
          this.employeeSalary.month,
          this.employeeSalary.year,
          {
            workingDays: this.tempWorkingDays,
            paidLeaveDays: this.employeeSalary.paidLeaveDays || 0,
            unpaidLeaveDays: this.employeeSalary.unpaidLeaveDays || 0,
            netSalary: newNetSalary,
          }
        )
        .subscribe({
          next: () => {
            this.isEditingDays = false;
          },
          error: (err) => {
            console.error('Error updating working days:', err);
          },
        });
    }
  }

  cancelEditDays() {
    this.isEditingDays = false;
    this.tempWorkingDays = null;
  }

  loadPayslipData(employeeID: number, month: number, year: number): void {
    if (!employeeID || !month || !year) {
      console.error('Missing employee ID, month, or year.');
      return;
    }
    this.employeeSalaryService.getPayslipData(employeeID, month, year).subscribe({
      next: (data) => {
        console.log(data);
        if (!data || Object.keys(data).length === 0) {
          console.warn('No payslip data found for this period.');
          this.employeeSalary = null;
          return;
        }


        // Use backend-calculated values
        // this.selectedEmployee.finalSalary = parseFloat(data.netSalary) || 0;
        this.employeeSalary = data;

        console.log('Final Salary (from backend):', this.selectedEmployee.finalSalary);
      },
      error: (error) => {
        console.error('Error fetching payslip data:', error);
      }
    });

  }
  printPayslip() {
    if (this.employeeSalary) {
      this.employeeSalaryService
        .updatePayslipOverride(
          this.employeeSalary.employeeId,
          this.employeeSalary.month,
          this.employeeSalary.year,
          {
            workingDays: this.employeeSalary.workingDays,
            paidLeaveDays: this.employeeSalary.paidLeaveDays || 0,
            unpaidLeaveDays: this.employeeSalary.unpaidLeaveDays || 0,
            netSalary: this.employeeSalary.netSalary,
            addonAmount: this.employeeSalary.addonAmount || 0,
          }
        )
        .subscribe({
          next: () => {
            console.log('Payslip saved/updated before download');
            this.generatePDF(); // call separate method for actual PDF
          },
          error: (err) => {
            console.error('Error ensuring payslip save before download:', err);
            this.generatePDF(); // still allow PDF even if save fails
          },
        });
    }
  }

  private generatePDF() {
    const element = document.getElementById('payslip');
    const printBtn = document.querySelector('.print_btn');
    const editBtns = document.querySelectorAll('.edit-day'); // select all edit buttons

    if (!element) {
      console.error('Payslip container not found!');
      return;
    }

    // Hide buttons
    if (printBtn) printBtn.classList.add('hidden-in-pdf');
    editBtns.forEach(btn => (btn as HTMLElement).style.display = 'none');

    // Wait for all images (e.g. the logo) to finish loading before capturing,
    // otherwise html2canvas may render them as blank in the downloaded PDF.
    const images = Array.from(element.querySelectorAll('img'));
    const waitForImages = Promise.all(
      images.map(img =>
        img.complete && img.naturalWidth > 0
          ? Promise.resolve()
          : new Promise<void>(resolve => {
              img.onload = () => resolve();
              img.onerror = () => resolve();
            })
      )
    );

    // Capture where the logo <img> sits, relative to the payslip, so we can
    // redraw it directly into the PDF (html2canvas fails to rasterize it).
    const logoImg = element.querySelector('img') as HTMLImageElement | null;
    const elRect = element.getBoundingClientRect();
    const logoRect = logoImg ? logoImg.getBoundingClientRect() : null;

    waitForImages.then(() =>
      html2canvas(element, { scale: 2, useCORS: true, allowTaint: true, backgroundColor: '#ffffff' })
    ).then(canvas => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

      // Draw the company logo directly with jsPDF (reliable for base64 images).
      if (logoRect) {
        const x = ((logoRect.left - elRect.left) / elRect.width) * pdfWidth;
        const y = ((logoRect.top - elRect.top) / elRect.height) * pdfHeight;
        const w = (logoRect.width / elRect.width) * pdfWidth;
        const h = (logoRect.height / elRect.height) * pdfHeight;
        pdf.addImage(this.companyLogo, 'PNG', x, y, w, h);
      }

      pdf.save(`Payslip-${this.selectedEmployee?.fullName || 'employee'}.pdf`);
    }).finally(() => {
      // Show buttons again after generating PDF
      if (printBtn) printBtn.classList.remove('hidden-in-pdf');
      editBtns.forEach(btn => (btn as HTMLElement).style.display = '');
    });
  }
}