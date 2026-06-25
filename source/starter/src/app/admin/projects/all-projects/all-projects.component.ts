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
import { Project } from './core/project.model';
import { FeatherIconsComponent } from '@shared/components/feather-icons/feather-icons.component';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatRippleModule } from '@angular/material/core';
import { DeleteDialogComponent } from './dialogs/delete/delete.component';
import { FormDialogComponent } from './dialogs/form-dialog/form-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { Direction } from '@angular/cdk/bidi';

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
    MatRippleModule,
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
    'actions',
  ];
  public dataSource = new MatTableDataSource<Project>();
  public exampleDatabase = { isTblLoading: true };

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private projectService: ProjectService,
    public dialog: MatDialog
  ) {}

  ngAfterViewInit() {
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
        .filter((v) => v !== null && v !== undefined)
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
      error: () => {
        this.exampleDatabase.isTblLoading = false;
      },
    });
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value.trim().toLowerCase();
    this.dataSource.filter = filterValue;
  }

  editCall(project: Project) {
    const tempDirection: Direction = localStorage.getItem('isRtl') === 'true' ? 'rtl' : 'ltr';

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
    const tempDirection: Direction = localStorage.getItem('isRtl') === 'true' ? 'rtl' : 'ltr';

    const dialogRef = this.dialog.open(DeleteDialogComponent, {
      height: '260px',
      width: '300px',
      data: row,
      direction: tempDirection,
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.loadProjects();
      }
    });
  }

  addNew() {
    const tempDirection: Direction = localStorage.getItem('isRtl') === 'true' ? 'rtl' : 'ltr';
    const dialogRef = this.dialog.open(FormDialogComponent, {
      data: { action: 'add' },
      direction: tempDirection,
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) this.loadProjects();
    });
  }

  viewItem(row: any): void {
    this.editCall(row);
  }
}
