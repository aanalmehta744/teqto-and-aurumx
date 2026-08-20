import { Component, AfterViewInit, ViewChild } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { BreadcrumbComponent } from '@shared/components/breadcrumb/breadcrumb.component';
import { ProjectService } from './core/project.service';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { Project } from './core/project.model'; // Import the correct Project model
import { FeatherIconsComponent } from '@shared/components/feather-icons/feather-icons.component';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { DeleteDialogComponent } from './dialogs/delete/delete.component';
import { FormDialogComponent } from './dialogs/form-dialog/form-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { Direction } from '@angular/cdk/bidi';
import { Router } from '@angular/router';
@Component({
  selector: 'app-all-projects',
  templateUrl: './all-projects.component.html',
  styleUrls: ['./all-projects.component.scss'],
  standalone: true,
  imports: [
    BreadcrumbComponent,
    MatTooltipModule,
    MatIconModule,
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    FeatherIconsComponent,
    MatProgressSpinnerModule,
    MatButtonModule,
  ],
})
export class AllprojectsComponent implements AfterViewInit {
  public displayedColumns: string[] = [
    'name',
    'team',
    'client',
    'status',
    'startDate',
    'endDate',
    // 'priority',
    // 'department',
    'actions'];
  public dataSource = new MatTableDataSource<Project>();
  public exampleDatabase = { isTblLoading: true };

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(private projectService: ProjectService, public dialog: MatDialog, private router: Router) { }

  ngAfterViewInit() {
    // Override filter predicate for custom date format search
    this.dataSource.filterPredicate = (data: Project, filter: string) => {
      const searchTerm = filter.trim().toLowerCase();

      const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };

      const startDateFormatted = data.startDate
        ? new Date(data.startDate).toLocaleDateString('en-US', options).toLowerCase()
        : '';

      const endDateFormatted = data.endDate
        ? new Date(data.endDate).toLocaleDateString('en-US', options).toLowerCase()
        : '';


      const fullRow = Object.values(data)
        .filter(v => v !== null && v !== undefined)
        .join(' ')
        .toLowerCase();

      return (
        fullRow.includes(searchTerm) ||
        startDateFormatted.includes(searchTerm) ||
        endDateFormatted.includes(searchTerm)
      );
    };

    this.loadProjects();
  }

  loadProjects() {
    this.exampleDatabase.isTblLoading = true;
    this.projectService.getAllProjects().subscribe({
      next: (data: Project[]) => {
        this.dataSource.data = data as Project[];
        this.exampleDatabase.isTblLoading = false;
        setTimeout(() => {
          if (this.paginator) this.dataSource.paginator = this.paginator;
          if (this.sort) this.dataSource.sort = this.sort;
        });
      },
      error: () => { this.exampleDatabase.isTblLoading = false; }
    });
  }


  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value.trim().toLowerCase();
    this.dataSource.filter = filterValue;
  }

  editCall(project: Project) {
    let tempDirection: Direction = localStorage.getItem('isRtl') === 'true' ? 'rtl' : 'ltr';

    const dialogRef = this.dialog.open(FormDialogComponent, {
      data: {
        project: project,
        action: 'edit',
      },
      direction: tempDirection,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadProjects();
      }
    });
  }


  deleteItem(i: number, row: Project) {
    console.log('Delete project:', row);
    let tempDirection: Direction = localStorage.getItem('isRtl') === 'true' ? 'rtl' : 'ltr';

    const dialogRef = this.dialog.open(DeleteDialogComponent, {
      height: '260px',
      width: '300px',
      data: row,
      direction: tempDirection,
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.loadProjects(); // Refresh the table after deletion
      }
    });
  }
  viewItem(row: any): void {
    // Implement view logic (e.g., open a dialog or route to a detail page)
    console.log('Viewing item:', row);
    this.router.navigate(['/admin/projects/projectDetails', row.id]);
  }

}
