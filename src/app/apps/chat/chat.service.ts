import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from 'environments/environment';

export interface ChatUser {
  id: number;
  fullName: string;
  role: string;
  email: string;
}

export interface ChatMessage {
  id: number;
  conversation_id: number;
  sender_id: number;
  sender_name: string;
  message: string;
  attachment_url?: string | null;
  attachment_type?: string | null;
  created_at: string;
}

export interface Conversation {
  id: number;
  name: string | null;
  type: 'direct' | 'group';
  created_by: number;
  created_at: string;
  other_employee_id?: number | null;
  unread_count?: number;
}

@Injectable({
  providedIn: 'root',
})
export class ChatService implements OnDestroy {
  private apiUrl = `${environment.apiUrl}/chat`;
  private socket: Socket;

  constructor(private http: HttpClient) {
    const socketUrl = environment.apiUrl.replace('/api', '');

    this.socket = io(socketUrl, {
      transports: ['websocket'],
    });
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('authToken') || '';

    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
  }

  // ---------------------------------------------------------
  // GET ALL USERS
  // ---------------------------------------------------------

  getUsers(): Observable<ChatUser[]> {
    return this.http.get<ChatUser[]>(
      `${this.apiUrl}/users`,
      {
        headers: this.getHeaders(),
      }
    );
  }

  // ---------------------------------------------------------
  // GET USER CONVERSATIONS
  // ---------------------------------------------------------

  getConversations(
    employeeId: number
  ): Observable<Conversation[]> {
    return this.http.get<Conversation[]>(
      `${this.apiUrl}/conversations/${employeeId}`,
      {
        headers: this.getHeaders(),
      }
    );
  }

  // ---------------------------------------------------------
  // CREATE DIRECT CONVERSATION
  // ---------------------------------------------------------

  openDirectConversation(
    user1: number,
    user2: number
  ): Observable<{ conversationId: number }> {
    return this.http.post<{ conversationId: number }>(
      `${this.apiUrl}/conversation/direct`,
      {
        user1,
        user2,
      },
      {
        headers: this.getHeaders(),
      }
    );
  }

  // ---------------------------------------------------------
  // CREATE GROUP CONVERSATION
  // ---------------------------------------------------------

  createGroup(
    name: string,
    createdBy: number,
    members: number[]
  ): Observable<{ conversationId: number }> {
    return this.http.post<{ conversationId: number }>(
      `${this.apiUrl}/conversation/group`,
      {
        name,
        created_by: createdBy,
        members,
      },
      {
        headers: this.getHeaders(),
      }
    );
  }

  // ---------------------------------------------------------
  // GET MESSAGES
  // ---------------------------------------------------------

  getMessages(
    conversationId: number
  ): Observable<ChatMessage[]> {
    return this.http.get<ChatMessage[]>(
      `${this.apiUrl}/message/${conversationId}`,
      {
        headers: this.getHeaders(),
      }
    );
  }

  // ---------------------------------------------------------
  // SEND MESSAGE
  // ---------------------------------------------------------

  sendMessage(
    conversation_id: number,
    sender_id: number,
    message: string,
    file?: File | null
  ): Observable<{
    messageId: number;
    attachment_url?: string | null;
    attachment_type?: string | null;
  }> {
    const formData = new FormData();

    formData.append(
      'conversation_id',
      String(conversation_id)
    );

    formData.append(
      'sender_id',
      String(sender_id)
    );

    formData.append(
      'message',
      message
    );

    if (file) {
      formData.append(
        'attachment',
        file
      );
    }

    return this.http.post<{
      messageId: number;
      attachment_url?: string | null;
      attachment_type?: string | null;
    }>(
      `${this.apiUrl}/message`,
      formData
    );
  }

  // ---------------------------------------------------------
  // MARK CONVERSATION AS READ
  // ---------------------------------------------------------

  markRead(
    conversationId: number,
    employeeId: number
  ): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(
      `${this.apiUrl}/read`,
      {
        conversation_id: conversationId,
        employee_id: employeeId,
      },
      {
        headers: this.getHeaders(),
      }
    );
  }

  // ---------------------------------------------------------
  // SOCKET - IDENTIFY (joins every conversation room the
  // employee belongs to, so unread badges work for chats
  // that haven't been opened yet)
  // ---------------------------------------------------------

  identify(
    employeeId: number
  ): void {
    this.socket.emit(
      'identify',
      employeeId
    );
  }

  // ---------------------------------------------------------
  // SOCKET - JOIN CONVERSATION
  // ---------------------------------------------------------

  joinConversation(
    conversationId: number
  ): void {
    this.socket.emit(
      'join_conversation',
      conversationId
    );
  }

  // ---------------------------------------------------------
  // SOCKET - RECEIVE MESSAGE
  // ---------------------------------------------------------

  onMessage(): Observable<ChatMessage> {
    return new Observable(
      (observer) => {
        this.socket.on(
          'receive_message',
          (msg: ChatMessage) => {
            observer.next(msg);
          }
        );

        return () => {
          this.socket.off('receive_message');
        };
      }
    );
  }

  // ---------------------------------------------------------
  // DESTROY
  // ---------------------------------------------------------

  ngOnDestroy(): void {
    this.socket.disconnect();
  }
}