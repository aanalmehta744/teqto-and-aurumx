import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Clients } from './clients.model';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { UnsubscribeOnDestroyAdapter } from '@shared';
import { environment } from 'environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ClientsService extends UnsubscribeOnDestroyAdapter {
  private API_URL = `${environment.apiUrl}/clients`;
  isTblLoading = true;
  dataChange: BehaviorSubject<Clients[]> = new BehaviorSubject<Clients[]>([]);
  dialogData!: Clients;

  constructor(private httpClient: HttpClient) {
    super();
  }

  get data(): Clients[] {
    return this.dataChange.value;
  }

  getDialogData() {
    return this.dialogData;
  }

  /** ✅ GET ALL CLIENTS */
  getAllClients(): Observable<Clients[]> {
    return this.httpClient.get<Clients[]>(this.API_URL);
  }
  /** ✅ ADD CLIENT */
  // addClient(client: Clients): Observable<any> {
  //   return this.httpClient.post(this.API_URL, client);
  // }
  addClient(client: Clients): Observable<any> {
    // Retrieve the logged-in user's ID from localStorage
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const employeeId = currentUser.id;
    const payload = {
      ...client,
      employee_id: employeeId
    };
    return this.httpClient.post(this.API_URL, payload);
  }

  /** ✅ UPDATE CLIENT */
  updateClient(id: number, client: Clients): Observable<any> {
    return this.httpClient.put(`${this.API_URL}/${id}`, client);
  }

  /** ✅ DELETE CLIENT */
  deleteClient(id: number): Observable<any> {
    return this.httpClient.delete(`${this.API_URL}/${id}`);
  }

  getClientById(id: string): Observable<any> {
    return this.httpClient.get(`${this.API_URL}/${id}`);
  }
  getClientFollowups(clientId: string) {
    return this.httpClient.get<any[]>(`${this.API_URL}/followups/${clientId}`);
  }


  addFollowup(clientId: number, followup: any): Observable<any> {
    return this.httpClient.post(`${this.API_URL}/followups/${clientId}`, followup);
  }

  getClientsGroupedByBDE(): Observable<any[]> {
    return this.httpClient.get<any[]>(`${this.API_URL}/grouped-by-bde`);
  }

}
