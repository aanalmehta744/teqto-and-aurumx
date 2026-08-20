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
//   created_at: string;
// }

// export interface Conversation {
//   id: number;
//   name: string | null;
//   type: 'direct' | 'group';
//   created_by: number;
//   created_at: string;
// }

// @Injectable({ providedIn: 'root' })
// export class ChatService implements OnDestroy {
//   private apiUrl = `${environment.apiUrl}/chat`;
//   private socket: Socket;

//   constructor(private http: HttpClient) {
//     const socketUrl = environment.apiUrl.replace('/api', '');
//     this.socket = io(socketUrl, { transports: ['websocket'] });
//   }

//   private getHeaders(): HttpHeaders {
//     const token = localStorage.getItem('authToken') || '';
//     return new HttpHeaders({ Authorization: `Bearer ${token}` });
//   }

//   getUsers(): Observable<ChatUser[]> {
//     return this.http.get<ChatUser[]>(`${this.apiUrl}/users`, {
//       headers: this.getHeaders(),
//     });
//   }

//   getConversations(employeeId: number): Observable<Conversation[]> {
//     return this.http.get<Conversation[]>(
//       `${this.apiUrl}/conversations/${employeeId}`,
//       { headers: this.getHeaders() }
//     );
//   }

//   openDirectConversation(user1: number, user2: number): Observable<{ conversationId: number }> {
//     return this.http.post<{ conversationId: number }>(
//       `${this.apiUrl}/conversation/direct`,
//       { user1, user2 },
//       { headers: this.getHeaders() }
//     );
//   }

//   getMessages(conversationId: number): Observable<ChatMessage[]> {
//     return this.http.get<ChatMessage[]>(
//       `${this.apiUrl}/message/${conversationId}`,
//       { headers: this.getHeaders() }
//     );
//   }

//   sendMessage(conversation_id: number, sender_id: number, message: string): Observable<{ messageId: number }> {
//     return this.http.post<{ messageId: number }>(
//       `${this.apiUrl}/message`,
//       { conversation_id, sender_id, message },
//       { headers: this.getHeaders() }
//     );
//   }

//   joinConversation(conversationId: number): void {
//     this.socket.emit('join_conversation', conversationId);
//   }

//   onMessage(): Observable<ChatMessage> {
//     return new Observable((observer) => {
//       this.socket.on('receive_message', (msg: ChatMessage) => {
//         observer.next(msg);
//       });
//       return () => this.socket.off('receive_message');
//     });
//   }

//   ngOnDestroy(): void {
//     this.socket.disconnect();
//   }
// }


import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from 'environments/environment';

/*
|--------------------------------------------------------------------------
| USER MODEL
|--------------------------------------------------------------------------
| Represents an employee/user in chat
|
| Example:
| {
|   id: 1,
|   fullName: "Aanal Mehta",
|   role: "Admin",
|   email: "aanal@test.com"
| }
*/
export interface ChatUser {
  id: number;
  fullName: string;
  role: string;
  email: string;
}

/*
|--------------------------------------------------------------------------
| MESSAGE MODEL
|--------------------------------------------------------------------------
| Represents a single chat message
|
| Example:
| {
|   id: 15,
|   conversation_id: 3,
|   sender_id: 1,
|   sender_name: "Aanal",
|   message: "Hello",
|   created_at: "2025-06-15"
| }
*/
export interface ChatMessage {
  id: number;
  conversation_id: number;
  sender_id: number;
  sender_name: string;
  message: string;
  created_at: string;
}

/*
|--------------------------------------------------------------------------
| CONVERSATION MODEL
|--------------------------------------------------------------------------
| Represents a chat room
|
| Direct Chat:
| Aanal ↔ Rahul
|
| Group Chat:
| HR Team
*/
export interface Conversation {
  id: number;
  name: string | null;
  type: 'direct' | 'group';
  created_by: number;
  created_at: string;
}

/*
|--------------------------------------------------------------------------
| CHAT SERVICE
|--------------------------------------------------------------------------
|
| Responsible for:
|
| 1. Calling backend APIs
| 2. Creating socket connection
| 3. Sending messages
| 4. Receiving messages
| 5. Managing chat rooms
|
*/
@Injectable({
  providedIn: 'root',
})
export class ChatService implements OnDestroy {

  /*
   * Base API URL
   *
   * Example:
   * http://localhost:5001/api/chat
   */
  private apiUrl =
    `${environment.apiUrl}/chat`;

  /*
   * Socket.IO connection object
   */
  private socket: Socket;

  constructor(
    private http: HttpClient
  ) {

    /*
     * Backend URL for socket connection
     *
     * REST API:
     * http://localhost:5001/api
     *
     * Socket:
     * http://localhost:5001
     *
     * Therefore remove "/api"
     */
    const socketUrl =
      environment.apiUrl.replace(
        '/api',
        ''
      );

    /*
     * Create socket connection
     *
     * transports:['websocket']
     *
     * Forces websocket directly
     * instead of polling
     */
    this.socket = io(
      socketUrl,
      {
        transports: ['websocket'],
      }
    );
  }

  /*
   |--------------------------------------------------------------------------
   | AUTH HEADER
   |--------------------------------------------------------------------------
   |
   | Every protected API requires JWT token.
   |
   | Authorization:
   | Bearer xxxxxxxxx
   |
   */
  private getHeaders(): HttpHeaders {

    /*
     * Get saved token
     */
    const token =
      localStorage.getItem(
        'authToken'
      ) || '';

    /*
     * Attach token to request
     */
    return new HttpHeaders({
      Authorization:
        `Bearer ${token}`,
    });
  }

  /*
   |--------------------------------------------------------------------------
   | GET ALL USERS
   |--------------------------------------------------------------------------
   |
   | GET:
   | /chat/users
   |
   | Used in sidebar
   |
   */
  getUsers(): Observable<ChatUser[]> {

    return this.http.get<
      ChatUser[]
    >(
      `${this.apiUrl}/users`,
      {
        headers:
          this.getHeaders(),
      }
    );
  }

  /*
   |--------------------------------------------------------------------------
   | GET USER CONVERSATIONS
   |--------------------------------------------------------------------------
   |
   | GET:
   | /chat/conversations/1
   |
   | Returns all chats
   | belonging to employee
   |
   */
  getConversations(
    employeeId: number
  ): Observable<Conversation[]> {

    return this.http.get<
      Conversation[]
    >(
      `${this.apiUrl}/conversations/${employeeId}`,
      {
        headers:
          this.getHeaders(),
      }
    );
  }

  /*
   |--------------------------------------------------------------------------
   | CREATE OR OPEN DIRECT CHAT
   |--------------------------------------------------------------------------
   |
   | Example:
   |
   | User1 = Aanal
   | User2 = Rahul
   |
   | Backend:
   |
   | If conversation exists
   | return existing id
   |
   | Else create new conversation
   |
   */
  openDirectConversation(
    user1: number,
    user2: number
  ): Observable<{
    conversationId: number;
  }> {

    return this.http.post<
      {
        conversationId: number;
      }
    >(
      `${this.apiUrl}/conversation/direct`,
      {
        user1,
        user2,
      },
      {
        headers:
          this.getHeaders(),
      }
    );
  }

  /*
   |--------------------------------------------------------------------------
   | GET CHAT HISTORY
   |--------------------------------------------------------------------------
   |
   | Example:
   |
   | GET:
   | /chat/message/5
   |
   | Returns all messages
   | for conversation 5
   |
   */
  getMessages(
    conversationId: number
  ): Observable<ChatMessage[]> {

    return this.http.get<
      ChatMessage[]
    >(
      `${this.apiUrl}/message/${conversationId}`,
      {
        headers:
          this.getHeaders(),
      }
    );
  }

  /*
   |--------------------------------------------------------------------------
   | SEND MESSAGE
   |--------------------------------------------------------------------------
   |
   | POST:
   | /chat/message
   |
   | Saves message in database
   |
   */
  sendMessage(
    conversation_id: number,
    sender_id: number,
    message: string
  ): Observable<{
    messageId: number;
  }> {

    return this.http.post<
      {
        messageId: number;
      }
    >(
      `${this.apiUrl}/message`,
      {
        conversation_id,
        sender_id,
        message,
      },
      {
        headers:
          this.getHeaders(),
      }
    );
  }

  /*
   |--------------------------------------------------------------------------
   | JOIN SOCKET ROOM
   |--------------------------------------------------------------------------
   |
   | Example:
   |
   | Conversation 5
   |
   | User joins room 5
   |
   | Only users inside room 5
   | receive messages for room 5
   |
   */
  joinConversation(
    conversationId: number
  ): void {

    this.socket.emit(
      'join_conversation',
      conversationId
    );
  }

  /*
   |--------------------------------------------------------------------------
   | RECEIVE SOCKET MESSAGE
   |--------------------------------------------------------------------------
   |
   | Listens for:
   |
   | receive_message
   |
   | emitted by backend
   |
   */
  onMessage():
    Observable<ChatMessage> {

    return new Observable(
      (observer) => {

        /*
         * Backend emits:
         *
         * socket.emit(
         *   "receive_message",
         *   message
         * )
         */
        this.socket.on(
          'receive_message',
          (
            msg: ChatMessage
          ) => {

            /*
             * Push data to subscriber
             */
            observer.next(msg);
          }
        );

        /*
         * Cleanup
         *
         * Runs automatically
         * when component unsubscribes
         */
        return () => {

          this.socket.off(
            'receive_message'
          );
        };
      }
    );
  }

  /*
   |--------------------------------------------------------------------------
   | DESTROY SERVICE
   |--------------------------------------------------------------------------
   |
   | Close socket connection
   | when Angular destroys service
   |
   */
  ngOnDestroy(): void {

    this.socket.disconnect();
  }
}


// User types "Hello"
//         |
//         v
// send()
//         |
//         v
// ChatService.sendMessage()
//         |
//         v
// POST /chat/message
//         |
//         v
// Message saved in MySQL
//         |
//         v
// Backend emits socket event
//         |
//         v
// receive_message
//         |
//         v
// onMessage()
//         |
//         v
// Component updates UI