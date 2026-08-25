// import { Injectable, OnDestroy } from '@angular/core';
// import { HttpClient, HttpHeaders } from '@angular/common/http';
// import { Observable } from 'rxjs';
// import { io, Socket } from 'socket.io-client';
// import { environment } from 'environments/environment';

// export interface ChatUser {
//   id: number;
//   fullName: string;
//   role: string;
//   email: string;
// }

// export interface ChatMessage {
//   id: number;
//   conversation_id: number;
//   sender_id: number;
//   sender_name: string;
//   message: string;
//   attachment_url?: string | null;
//   attachment_type?: string | null;
//   created_at: string;
// }

// export interface Conversation {
//   id: number;
//   name: string | null;
//   type: 'direct' | 'group';
//   created_by: number;
//   created_at: string;
//   other_employee_id?: number | null;
//   unread_count?: number;
// }

// @Injectable({
//   providedIn: 'root',
// })
// export class ChatService implements OnDestroy {
//   private apiUrl = `${environment.apiUrl}/chat`;
//   private socket: Socket;

//   constructor(private http: HttpClient) {
//     const socketUrl = environment.apiUrl.replace('/api', '');

//     this.socket = io(socketUrl, {
//       transports: ['websocket'],
//     });
//   }

//   private getHeaders(): HttpHeaders {
//     const token = localStorage.getItem('authToken') || '';

//     return new HttpHeaders({
//       Authorization: `Bearer ${token}`,
//     });
//   }

//   // ---------------------------------------------------------
//   // GET ALL USERS
//   // ---------------------------------------------------------

//   getUsers(): Observable<ChatUser[]> {
//     return this.http.get<ChatUser[]>(
//       `${this.apiUrl}/users`,
//       {
//         headers: this.getHeaders(),
//       }
//     );
//   }

//   // ---------------------------------------------------------
//   // GET USER CONVERSATIONS
//   // ---------------------------------------------------------

//   getConversations(
//     employeeId: number
//   ): Observable<Conversation[]> {
//     return this.http.get<Conversation[]>(
//       `${this.apiUrl}/conversations/${employeeId}`,
//       {
//         headers: this.getHeaders(),
//       }
//     );
//   }

//   // ---------------------------------------------------------
//   // CREATE DIRECT CONVERSATION
//   // ---------------------------------------------------------

//   openDirectConversation(
//     user1: number,
//     user2: number
//   ): Observable<{ conversationId: number }> {
//     return this.http.post<{ conversationId: number }>(
//       `${this.apiUrl}/conversation/direct`,
//       {
//         user1,
//         user2,
//       },
//       {
//         headers: this.getHeaders(),
//       }
//     );
//   }

//   // ---------------------------------------------------------
//   // CREATE GROUP CONVERSATION
//   // ---------------------------------------------------------

//   createGroup(
//     name: string,
//     createdBy: number,
//     members: number[]
//   ): Observable<{ conversationId: number }> {
//     return this.http.post<{ conversationId: number }>(
//       `${this.apiUrl}/conversation/group`,
//       {
//         name,
//         created_by: createdBy,
//         members,
//       },
//       {
//         headers: this.getHeaders(),
//       }
//     );
//   }

//   // ---------------------------------------------------------
//   // GET MESSAGES
//   // ---------------------------------------------------------

//   getMessages(
//     conversationId: number
//   ): Observable<ChatMessage[]> {
//     return this.http.get<ChatMessage[]>(
//       `${this.apiUrl}/message/${conversationId}`,
//       {
//         headers: this.getHeaders(),
//       }
//     );
//   }

//   // ---------------------------------------------------------
//   // SEND MESSAGE
//   // ---------------------------------------------------------

//   sendMessage(
//     conversation_id: number,
//     sender_id: number,
//     message: string,
//     file?: File | null
//   ): Observable<{
//     messageId: number;
//     attachment_url?: string | null;
//     attachment_type?: string | null;
//   }> {
//     const formData = new FormData();

//     formData.append(
//       'conversation_id',
//       String(conversation_id)
//     );

//     formData.append(
//       'sender_id',
//       String(sender_id)
//     );

//     formData.append(
//       'message',
//       message
//     );

//     if (file) {
//       formData.append(
//         'attachment',
//         file
//       );
//     }

//     return this.http.post<{
//       messageId: number;
//       attachment_url?: string | null;
//       attachment_type?: string | null;
//     }>(
//       `${this.apiUrl}/message`,
//       formData
//     );
//   }

//   // ---------------------------------------------------------
//   // MARK CONVERSATION AS READ
//   // ---------------------------------------------------------

//    markRead(
//     conversationId: number,
//     employeeId: number
//   ): Observable<{ success: boolean }> {
//     return this.http.post<{ success: boolean }>(
//       `${this.apiUrl}/read`,
//       {
//         conversation_id: conversationId,
//         employee_id: employeeId,
//       },
//       {
//         headers: this.getHeaders(),
//       }
//     );
//   }

//   // ---------------------------------------------------------
//   // READ STATUS (for tick marks)
//   // ---------------------------------------------------------

//   getReadStatus(
//     conversationId: number,
//     employeeId: number
//   ): Observable<{ last_read_at: string | null }> {
//     return this.http.get<{ last_read_at: string | null }>(
//       `${this.apiUrl}/read-status/${conversationId}/${employeeId}`,
//       {
//         headers: this.getHeaders(),
//       }
//     );
//   }

//   // ---------------------------------------------------------
//   // SOCKET - CONVERSATION READ (live tick updates)
//   // ---------------------------------------------------------

//   onConversationRead(): Observable<{
//     conversation_id: number;
//     employee_id: number;
//     last_read_at: string;
//   }> {
//     return new Observable(
//       (observer) => {
//         this.socket.on(
//           'conversation_read',
//           (data) => {
//             observer.next(data);
//           }
//         );

//         return () => {
//           this.socket.off('conversation_read');
//         };
//       }
//     );
//   }

//   // ---------------------------------------------------------
//   // SOCKET - IDENTIFY (joins every conversation room the
//   // employee belongs to, so unread badges work for chats
//   // that haven't been opened yet)
//   // ---------------------------------------------------------

//   identify(
//     employeeId: number
//   ): void {
//     this.socket.emit(
//       'identify',
//       employeeId
//     );
//   }

//   // ---------------------------------------------------------
//   // SOCKET - JOIN CONVERSATION
//   // ---------------------------------------------------------

//   joinConversation(
//     conversationId: number
//   ): void {
//     this.socket.emit(
//       'join_conversation',
//       conversationId
//     );
//   }

//   // ---------------------------------------------------------
//   // SOCKET - RECEIVE MESSAGE
//   // ---------------------------------------------------------

//   onMessage(): Observable<ChatMessage> {
//     return new Observable(
//       (observer) => {
//         this.socket.on(
//           'receive_message',
//           (msg: ChatMessage) => {
//             observer.next(msg);
//           }
//         );

//         return () => {
//           this.socket.off('receive_message');
//         };
//       }
//     );
//   }

//   // ---------------------------------------------------------
//   // DESTROY
//   // ---------------------------------------------------------

//   ngOnDestroy(): void {
//     this.socket.disconnect();
//   }
// }
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
  uploadImg?: string | null;
}

export interface ChatMessage {
  id: number;
  conversation_id: number;
  sender_id: number;
  sender_name: string;
  sender_avatar?: string | null;
  message: string;
  attachment_url?: string | null;
  attachment_type?: string | null;
  attachment_name?: string | null;
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

export interface ChatRequest {
  id: number;
  sender_id?: number;
  receiver_id?: number;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  sender_name?: string;
  sender_role?: string;
  receiver_name?: string;
  receiver_role?: string;
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

  getUsers(): Observable<ChatUser[]> {
    return this.http.get<ChatUser[]>(
      `${this.apiUrl}/users`,
      {
        headers: this.getHeaders(),
      }
    );
  }

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

  searchUsers(query: string, employeeId: number): Observable<ChatUser[]> {
  return this.http.get<ChatUser[]>(
    `${this.apiUrl}/search`,
    {
      headers: this.getHeaders(),
      params: { q: query, employeeId: String(employeeId) },
    }
  );
}

sendChatRequest(senderId: number, receiverId: number): Observable<any> {
  return this.http.post(
    `${this.apiUrl}/request`,
    { sender_id: senderId, receiver_id: receiverId },
    { headers: this.getHeaders() }
  );
}

getChatRequests(employeeId: number): Observable<{ incoming: ChatRequest[]; outgoing: ChatRequest[] }> {
  return this.http.get<{ incoming: ChatRequest[]; outgoing: ChatRequest[] }>(
    `${this.apiUrl}/requests/${employeeId}`,
    { headers: this.getHeaders() }
  );
}

respondToRequest(requestId: number, employeeId: number, action: 'accept' | 'reject'): Observable<any> {
  return this.http.post(
    `${this.apiUrl}/request/respond`,
    { request_id: requestId, employee_id: employeeId, action },
    { headers: this.getHeaders() }
  );
}

onChatRequestReceived(): Observable<ChatRequest> {
  return new Observable((observer) => {
    this.socket.on('chat_request_received', (data) => observer.next(data));
    return () => this.socket.off('chat_request_received');
  });
}

onChatRequestAccepted(): Observable<any> {
  return new Observable((observer) => {
    this.socket.on('chat_request_accepted', (data) => observer.next(data));
    return () => this.socket.off('chat_request_accepted');
  });
}

onChatRequestRejected(): Observable<any> {
  return new Observable((observer) => {
    this.socket.on('chat_request_rejected', (data) => observer.next(data));
    return () => this.socket.off('chat_request_rejected');
  });
}
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


  sendMessage(
    conversation_id: number,
    sender_id: number,
    message: string,
    file?: File | null
  ): Observable<{
    messageId: number;
    attachment_url?: string | null;
    attachment_type?: string | null;
    attachment_name?: string | null;
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
      attachment_name?: string | null;
    }>(
      `${this.apiUrl}/message`,
      formData
    );
  }

  getOnlineStatus(): Observable<{ [employeeId: number]: boolean }> {
    return this.http.get<{ [employeeId: number]: boolean }>(
      `${this.apiUrl}/online-status`,
      {
        headers: this.getHeaders(),
      }
    );
  }

  onPresenceChanged(): Observable<{
    employeeId: number;
    online: boolean;
  }> {
    return new Observable((observer) => {
      this.socket.on('presence_changed', (data) => observer.next(data));
      return () => this.socket.off('presence_changed');
    });
  }

  getAttachmentDownloadUrl(messageId: number): string {
    return `${this.apiUrl}/download/${messageId}`;
  }


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

  getReadStatus(
    conversationId: number,
    employeeId: number
  ): Observable<{ last_read_at: string | null }> {
    return this.http.get<{ last_read_at: string | null }>(
      `${this.apiUrl}/read-status/${conversationId}/${employeeId}`,
      {
        headers: this.getHeaders(),
      }
    );
  }

  onConversationRead(): Observable<{
    conversation_id: number;
    employee_id: number;
    last_read_at: string;
  }> {
    return new Observable(
      (observer) => {
        this.socket.on(
          'conversation_read',
          (data) => {
            observer.next(data);
          }
        );

        return () => {
          this.socket.off('conversation_read');
        };
      }
    );
  }


  identify(
    employeeId: number
  ): void {
    this.socket.emit(
      'identify',
      employeeId
    );
  }


  joinConversation(
    conversationId: number
  ): void {
    this.socket.emit(
      'join_conversation',
      conversationId
    );
  }

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


  ngOnDestroy(): void {this.socket.disconnect();}
}