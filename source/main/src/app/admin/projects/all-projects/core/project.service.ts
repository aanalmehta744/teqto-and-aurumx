import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { Project, ProjectAdapter } from './project.model';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { UnsubscribeOnDestroyAdapter } from '@shared';
import { environment } from 'environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ProjectService extends UnsubscribeOnDestroyAdapter {
  private trash: Set<number> = new Set([]);
  private _projects = new BehaviorSubject<Project[]>([]);
  public readonly projects: Observable<Project[]> = this._projects.asObservable();

  private API_URL = `${environment.apiUrl}/projects`;

  constructor(private adapter: ProjectAdapter, private httpClient: HttpClient) {
    super();
    this.getAllProjects().subscribe((data) => {
      this._projects.next(data);
    });
  }

  /** CRUD METHODS */
  getAllProjects(): Observable<Project[]> {
    return this.httpClient.get<Project[]>(this.API_URL);
  }

  createProject(project: Project | FormData): Observable<Project> {
    return this.httpClient.post<Project>(this.API_URL, project);
  }
  updateProject(projectId: number, updatedProject: Project | FormData): Observable<Project> {
    return this.httpClient.put<Project>(`${this.API_URL}/${projectId}`, updatedProject).pipe(
      map((updatedData) => {
        const projects = this._projects.getValue().map((proj) =>
          proj.id === projectId ? updatedData : proj
        );
        this._projects.next(projects);
        return updatedData;
      })
    );
  }
  deleteProject(projectId: number): Observable<void> {
    return this.httpClient.delete<void>(`${this.API_URL}/${projectId}`).pipe(
      map(() => {
        const updatedProjects = this._projects.getValue().filter(proj => proj.id !== projectId);
        this._projects.next(updatedProjects);
      })
    );
  }

  getProjectById(id: string): Observable<any> {
    return this.httpClient.get<any>(`${this.API_URL}/${id}`);
  }
  
}
