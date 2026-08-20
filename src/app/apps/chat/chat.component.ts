// // import {Component,OnInit,OnDestroy,ViewChild,ElementRef,AfterViewChecked,
// // } from '@angular/core';
// // import { CommonModule } from '@angular/common';
// // import { FormsModule } from '@angular/forms';
// // import { NgScrollbar } from 'ngx-scrollbar';
// // import { ChatService, ChatUser, ChatMessage } from './chat.service';
// // import { AuthService } from '@core/service/auth.service';
// // import { Subscription } from 'rxjs';

// // @Component({
// //   selector: 'app-chat',
// //   templateUrl: './chat.component.html',
// //   styleUrls: ['./chat.component.scss'],
// //   standalone: true,
// //   imports: [CommonModule, FormsModule, NgScrollbar],
// // })
// // export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
// //   @ViewChild('messageScroll') messageScroll!: NgScrollbar;

// //   users: ChatUser[] = [];
// //   filteredUsers: ChatUser[] = [];
// //   messages: ChatMessage[] = [];
// //   searchText = '';
// //   newMessage = '';
// //   activeConversationId: number | null = null;
// //   selectedUser: ChatUser | null = null;
// //   currentUserId!: number;
// //   currentUserName!: string;
// //   loading = false;
// //   private socketSub!: Subscription;
// //   private shouldScroll = false;

// //   constructor(
// //     private chatService: ChatService,
// //     private authService: AuthService
// //   ) {}

// //   ngOnInit(): void {
// //     const user = this.authService.getLoggedUser();
// //     this.currentUserId = user?.id ?? 0;
// //     this.currentUserName = user?.fullName ?? '';

// //     this.chatService.getUsers().subscribe({
// //       next: (users) => {
// //         this.users = users.filter((u) => u.id !== this.currentUserId);
// //         this.filteredUsers = [...this.users];
// //       },
// //       error: (err) => console.error('Failed to load users', err),
// //     });

// //     this.socketSub = this.chatService.onMessage().subscribe((msg) => {
// //       // Skip own messages — already pushed locally in send()
// //       if (msg.sender_id === this.currentUserId) return;
// //       if (msg.conversation_id !== this.activeConversationId) return;

// //       // Resolve sender_name (socket payload doesn't include it)
// //       if (!msg.sender_name) {
// //         const sender = this.users.find((u) => u.id === msg.sender_id);
// //         msg.sender_name = sender?.fullName ?? 'Unknown';
// //       }

// //       this.messages.push(msg);
// //       this.shouldScroll = true;
// //     });
// //   }

// //   ngAfterViewChecked(): void {
// //     if (this.shouldScroll) {
// //       this.scrollToBottom();
// //       this.shouldScroll = false;
// //     }
// //   }

// //   filterUsers(): void {
// //     const q = this.searchText.toLowerCase();
// //     this.filteredUsers = this.users.filter((u) =>
// //       u.fullName.toLowerCase().includes(q)
// //     );
// //   }

// //   selectUser(user: ChatUser): void {
// //     this.selectedUser = user;
// //     this.messages = [];
// //     this.loading = true;

// //     this.chatService
// //       .openDirectConversation(this.currentUserId, user.id)
// //       .subscribe({
// //         next: ({ conversationId }) => {
// //           this.activeConversationId = conversationId;
// //           this.chatService.joinConversation(conversationId);
// //           this.loadMessages(conversationId);
// //         },
// //         error: (err) => {
// //           console.error('Conversation error', err);
// //           this.loading = false;
// //         },
// //       });
// //   }

// //   loadMessages(conversationId: number): void {
// //     this.chatService.getMessages(conversationId).subscribe({
// //       next: (msgs) => {
// //         this.messages = msgs;
// //         this.loading = false;
// //         this.shouldScroll = true;
// //       },
// //       error: (err) => {
// //         console.error('Messages error', err);
// //         this.loading = false;
// //       },
// //     });
// //   }

// //   send(): void {
// //     const text = this.newMessage.trim();
// //     if (!text || !this.activeConversationId) return;

// //     this.chatService
// //       .sendMessage(this.activeConversationId, this.currentUserId, text)
// //       .subscribe({
// //         next: ({ messageId }) => {
// //           this.messages.push({
// //             id: messageId,
// //             conversation_id: this.activeConversationId!,
// //             sender_id: this.currentUserId,
// //             sender_name: this.currentUserName,
// //             message: text,
// //             created_at: new Date().toISOString(),
// //           });
// //           this.newMessage = '';
// //           this.shouldScroll = true;
// //         },
// //         error: (err) => console.error('Send error', err),
// //       });
// //   }

// //   onEnter(event: KeyboardEvent): void {
// //     if (event.key === 'Enter' && !event.shiftKey) {
// //       event.preventDefault();
// //       this.send();
// //     }
// //   }

// //   formatTime(dateStr: string): string {
// //     const d = new Date(dateStr);
// //     return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
// //   }

// //   getInitials(name: string | null | undefined): string {
// //     if (!name) return '?';
// //     return name
// //       .split(' ')
// //       .map((n) => n[0])
// //       .join('')
// //       .toUpperCase()
// //       .slice(0, 2);
// //   }

// //   private scrollToBottom(): void {
// //     if (this.messageScroll) {
// //       this.messageScroll.scrollTo({ bottom: 0, duration: 100 });
// //     }
// //   }

// //   ngOnDestroy(): void {
// //     this.socketSub?.unsubscribe();
// //   }
// // }




// import {
//   Component,
//   OnInit,
//   OnDestroy,
//   ViewChild,
//   AfterViewChecked,
// } from '@angular/core';

// import { CommonModule } from '@angular/common';
// import { FormsModule } from '@angular/forms';
// import { NgScrollbar } from 'ngx-scrollbar';

// import {
//   ChatService,
//   ChatUser,
//   ChatMessage,
// } from './chat.service';

// import { AuthService } from '@core/service/auth.service';
// import { Subscription } from 'rxjs';

// @Component({
//   selector: 'app-chat',

//   // HTML file
//   templateUrl: './chat.component.html',

//   // CSS/SCSS file
//   styleUrls: ['./chat.component.scss'],

//   // Standalone component (Angular 14+)
//   standalone: true,

//   // Modules used directly by this component
//   imports: [
//     CommonModule,
//     FormsModule,
//     NgScrollbar,
//   ],
// })
// export class ChatComponent
//   implements OnInit, OnDestroy, AfterViewChecked
// {
//   /*
//    * Gets access to:
//    *
//    * <ng-scrollbar #messageScroll>
//    *
//    * so we can scroll chat automatically
//    */
//   @ViewChild('messageScroll')
//   messageScroll!: NgScrollbar;

//   // DATA VARIABLES

//   /*
//    * Complete employee list
//    * received from API
//    */
//   users: ChatUser[] = [];

//   /*
//    * Users shown after search filtering
//    */
//   filteredUsers: ChatUser[] = [];

//   /*
//    * Messages of currently selected conversation
//    */
//   messages: ChatMessage[] = [];

//   /*
//    * Search input text
//    */
//   searchText = '';

//   /*
//    * Current text typed in message box
//    */
//   newMessage = '';

//   /*
//    * Current conversation id
//    *
//    * Example:
//    * Conversation between User 1 and User 5
//    */
//   activeConversationId: number | null = null;

//   /*
//    * Currently selected employee
//    */
//   selectedUser: ChatUser | null = null;

//   /*
//    * Logged-in user id
//    */
//   currentUserId!: number;

//   /*
//    * Logged-in user name
//    */
//   currentUserName!: string;

//   /*
//    * Used to show loading spinner
//    */
//   loading = false;

//   /*
//    * Socket subscription
//    * stored so we can unsubscribe later
//    */
//   private socketSub!: Subscription;

//   /*
//    * Flag that tells Angular:
//    * "scroll to bottom after UI finishes rendering"
//    */
//   private shouldScroll = false;

//   constructor(
//     private chatService: ChatService,
//     private authService: AuthService
//   ) {}

  
//   // COMPONENT STARTS HERE

//   ngOnInit(): void {

//     /*
//      * Get logged-in user from AuthService
//      */
//     const user = this.authService.getLoggedUser();

//     this.currentUserId = user?.id ?? 0;
//     this.currentUserName = user?.fullName ?? '';

//     // Load all users

//     this.chatService.getUsers().subscribe({
//       next: (users) => {

//         /*
//          * Remove myself from employee list
//          *
//          * I don't want to chat with myself
//          */
//         this.users = users.filter(
//           (u) => u.id !== this.currentUserId
//         );

//         /*
//          * Initially show all users
//          */
//         this.filteredUsers = [...this.users];
//       },

//       error: (err) =>
//         console.error('Failed to load users', err),
//     });

//     // SOCKET LISTENER

//     /*
//      * Listen for real-time messages
//      */
//     this.socketSub =
//       this.chatService.onMessage().subscribe((msg) => {

//         /*
//          * Ignore own messages
//          *
//          * Why?
//          *
//          * Because when we send a message
//          * we already push it locally.
//          *
//          * Without this check
//          * same message appears twice.
//          */
//         if (
//           msg.sender_id === this.currentUserId
//         )
//           return;

//         /*
//          * Ignore messages belonging
//          * to another conversation
//          */
//         if (
//           msg.conversation_id !==
//           this.activeConversationId
//         )
//           return;

//         /*
//          * Socket payload doesn't include
//          * sender_name.
//          *
//          * Find sender from employee list.
//          */
//         if (!msg.sender_name) {

//           const sender =
//             this.users.find(
//               (u) => u.id === msg.sender_id
//             );

//           msg.sender_name =
//             sender?.fullName ?? 'Unknown';
//         }

//         /*
//          * Add incoming message
//          * into chat window
//          */
//         this.messages.push(msg);

//         /*
//          * Trigger auto-scroll
//          */
//         this.shouldScroll = true;
//       });
//   }

//   // AFTER ANGULAR FINISHES RENDERING

//   ngAfterViewChecked(): void {

//     /*
//      * If new messages arrived,
//      * scroll chat to bottom.
//      *
//      * We do it here because DOM
//      * must finish rendering first.
//      */
//     if (this.shouldScroll) {

//       this.scrollToBottom();

//       this.shouldScroll = false;
//     }
//   }

//   // SEARCH EMPLOYEES

//   filterUsers(): void {

//     /*
//      * Convert search text
//      * to lowercase for case-insensitive search
//      */
//     const q =
//       this.searchText.toLowerCase();

//     /*
//      * Filter users whose names
//      * contain search text
//      */
//     this.filteredUsers =
//       this.users.filter((u) =>
//         u.fullName
//           .toLowerCase()
//           .includes(q)
//       );
//   }

//   // SELECT USER

//   selectUser(user: ChatUser): void {

//     /*
//      * Store selected employee
//      */
//     this.selectedUser = user;

//     /*
//      * Clear old messages
//      */
//     this.messages = [];

//     /*
//      * Show loading spinner
//      */
//     this.loading = true;

//     /*
//      * Create or fetch conversation
//      * between logged-in user
//      * and selected user
//      */
//     this.chatService
//       .openDirectConversation(
//         this.currentUserId,
//         user.id
//       )
//       .subscribe({

//         next: ({ conversationId }) => {

//           /*
//            * Save conversation id
//            */
//           this.activeConversationId =
//             conversationId;

//           /*
//            * Join socket room
//            */
//           this.chatService.joinConversation(
//             conversationId
//           );

//           /*
//            * Load previous messages
//            */
//           this.loadMessages(
//             conversationId
//           );
//         },

//         error: (err) => {
//           console.error(
//             'Conversation error',
//             err
//           );

//           this.loading = false;
//         },
//       });
//   }

//   // LOAD CHAT HISTORY

//   loadMessages(
//     conversationId: number
//   ): void {

//     this.chatService
//       .getMessages(conversationId)
//       .subscribe({

//         next: (msgs) => {

//           /*
//            * Store all messages
//            */
//           this.messages = msgs;

//           this.loading = false;

//           /*
//            * Auto-scroll after rendering
//            */
//           this.shouldScroll = true;
//         },

//         error: (err) => {
//           console.error(
//             'Messages error',
//             err
//           );

//           this.loading = false;
//         },
//       });
//   }

//   // SEND MESSAGE

//   send(): void {

//     /*
//      * Remove extra spaces
//      */
//     const text =
//       this.newMessage.trim();

//     /*
//      * Prevent empty messages
//      */
//     if (
//       !text ||
//       !this.activeConversationId
//     )
//       return;

//     this.chatService
//       .sendMessage(
//         this.activeConversationId,
//         this.currentUserId,
//         text
//       )
//       .subscribe({

//         next: ({ messageId }) => {

//           /*
//            * Optimistic UI update
//            *
//            * Show message instantly
//            * without waiting for socket
//            */
//           this.messages.push({
//             id: messageId,

//             conversation_id:
//               this.activeConversationId!,

//             sender_id:
//               this.currentUserId,

//             sender_name:
//               this.currentUserName,

//             message: text,

//             created_at:
//               new Date().toISOString(),
//           });

//           /*
//            * Clear input box
//            */
//           this.newMessage = '';

//           /*
//            * Scroll to newest message
//            */
//           this.shouldScroll = true;
//         },

//         error: (err) =>
//           console.error(
//             'Send error',
//             err
//           ),
//       });
//   }

  
//   // ENTER KEY SEND

//   onEnter(
//     event: KeyboardEvent
//   ): void {

//     /*
//      * Enter = Send
//      * Shift + Enter = New line
//      */
//     if (
//       event.key === 'Enter' &&
//       !event.shiftKey
//     ) {

//       event.preventDefault();

//       this.send();
//     }
//   }

//   // FORMAT MESSAGE TIME

//   formatTime(
//     dateStr: string
//   ): string {

//     const d =
//       new Date(dateStr);

//     return d.toLocaleTimeString(
//       [],
//       {
//         hour: '2-digit',
//         minute: '2-digit',
//       }
//     );
//   }

//   // GENERATE USER INITIALS

//   /*
//    * "John Doe"
//    * => "JD"
//    *
//    * "Aanal Mehta"
//    * => "AM"
//    */
//   getInitials(
//     name:
//       | string
//       | null
//       | undefined
//   ): string {

//     if (!name) return '?';

//     return name
//       .split(' ')
//       .map((n) => n[0])
//       .join('')
//       .toUpperCase()
//       .slice(0, 2);
//   }

//   // AUTO SCROLL

//   private scrollToBottom(): void {

//     if (this.messageScroll) {

//       this.messageScroll.scrollTo({
//         bottom: 0,

//         // smooth animation
//         duration: 100,
//       });
//     }
//   }

//   // CLEANUP

//   ngOnDestroy(): void {

//     /*
//      * Prevent memory leaks
//      *
//      * Remove socket listener when
//      * component is destroyed.
//      */
//     this.socketSub?.unsubscribe();
//   }
// }



// // 1. ngOnInit()
// //       ↓
// // 2. Get logged-in user
// //       ↓
// // 3. Load all employees
// //       ↓
// // 4. Start listening to Socket.IO messages
// //       ↓
// // 5. User selects employee
// //       ↓
// // 6. Open/Get conversation
// //       ↓
// // 7. Join socket room
// //       ↓
// // 8. Load old messages
// //       ↓
// // 9. User sends message
// //       ↓
// // 10. Message pushed instantly to UI
// //       ↓
// // 11. Socket receives new messages
// //       ↓
// // 12. Auto scroll to latest message
// //       ↓
// // 13. ngOnDestroy()
// //       ↓
// // 14. Unsubscribe socket
import {Component,OnInit,OnDestroy,ViewChild,AfterViewChecked,} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgScrollbar } from 'ngx-scrollbar';
import {ChatService,ChatUser,ChatMessage,} from './chat.service';
import { AuthService } from '@core/service/auth.service';
import { Subscription } from 'rxjs';
 
@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NgScrollbar,
  ],
})
export class ChatComponent
  implements OnInit, OnDestroy, AfterViewChecked
{
 
  @ViewChild('messageScroll')
  messageScroll!: NgScrollbar;
  users: ChatUser[] = [];
  filteredUsers: ChatUser[] = [];
  messages: ChatMessage[] = [];
  searchText = '';
  newMessage = '';
  selectedFile: File | null = null;
  filePreviewUrl: string | null = null;
  activeConversationId: number | null = null;
  selectedUser: ChatUser | null = null;
  currentUserId!: number;
  currentUserName!: string;
  loading = false;
 
  private socketSub!: Subscription;
  private shouldScroll = false;
 
  constructor(
    private chatService: ChatService,
    private authService: AuthService
  ) {}
 
  ngOnInit(): void {
 
    const user = this.authService.getLoggedUser();
    this.currentUserId = user?.id ?? 0;
    this.currentUserName = user?.fullName ?? '';
    this.chatService.getUsers().subscribe({
 
      next: (users) => {
        this.users = users.filter((u) => u.id !== this.currentUserId);
        this.filteredUsers = [...this.users];
      },
 
      error: (err) =>
        console.error('Failed to load users', err),
    });
 
    this.socketSub = this.chatService.onMessage().subscribe((msg) => {
 
        if (msg.sender_id === this.currentUserId)
          return;
        if (
          msg.conversation_id !==
          this.activeConversationId
        )
          return;
        if (!msg.sender_name) {
          const sender = this.users.find((u) => u.id === msg.sender_id);
          msg.sender_name = sender?.fullName ?? 'Unknown';
        }
        this.messages.push(msg);
        this.shouldScroll = true;
      });
  }
 
  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }
 
  filterUsers(): void {
    const q = this.searchText.toLowerCase();
    this.filteredUsers =
      this.users.filter((u) =>
        u.fullName
          .toLowerCase()
          .includes(q)
      );
  }
 
  selectUser(user: ChatUser): void {
    this.selectedUser = user;
    this.messages = [];
    this.loading = true;
    this.chatService
      .openDirectConversation(
        this.currentUserId,
        user.id
      )
      .subscribe({
        next: ({ conversationId }) => {
          this.activeConversationId = conversationId;
          this.chatService.joinConversation(conversationId);
          this.loadMessages(conversationId);
        },
 
        error: (err) => {
          console.error('Conversation error',err);
          this.loading = false;
        },
      });
  }
 
  loadMessages(conversationId: number): void {
 
    this.chatService.getMessages(conversationId).subscribe({
        next: (msgs) => {
          this.messages = msgs;
          this.loading = false;
          this.shouldScroll = true;
        },
 
        error: (err) => {
          console.error('Messages error',err);
          this.loading = false;
        },
      });
  }
 
  send(): void {
    const text = this.newMessage.trim();
    console.log('SEND MESSAGE DATA:', {
  conversationId: this.activeConversationId,
  currentUserId: this.currentUserId,
  text,
  selectedFile: this.selectedFile
});
    if (
      (!text && !this.selectedFile) ||
      !this.activeConversationId
    )
      return;
 
    this.chatService
      .sendMessage(
        this.activeConversationId,
        this.currentUserId,
        text,
        this.selectedFile
      )
      .subscribe({
 
        next: (res) => {
          this.messages.push({
            id: res.messageId,
            conversation_id:this.activeConversationId!,
            sender_id:this.currentUserId,
            sender_name:this.currentUserName,
            message: text,
            attachment_url: res.attachment_url,
            attachment_type: res.attachment_type,
            created_at:new Date().toISOString(),
          });
 
          this.newMessage = '';
          this.removeSelectedFile();
          this.shouldScroll = true;
        },
 
        error: (err) =>
          console.error('Send error',err),
      });
  }
 
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
 
    // Clean up any previous preview URL before creating a new one
    if (this.filePreviewUrl) {
      URL.revokeObjectURL(this.filePreviewUrl);
    }
 
    this.selectedFile = file;
    this.filePreviewUrl = file.type.startsWith('image/')
      ? URL.createObjectURL(file)
      : null;
 
    // Reset the input so selecting the same file again still fires (change)
    input.value = '';
  }
 
  removeSelectedFile(): void {
    if (this.filePreviewUrl) {
      URL.revokeObjectURL(this.filePreviewUrl);
    }
    this.selectedFile = null;
    this.filePreviewUrl = null;
  }
 
  onEnter(event: KeyboardEvent): void {
    if (
      event.key === 'Enter' &&
      !event.shiftKey
    ) {
      event.preventDefault();
      this.send();
    }
  }
 
  formatTime(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleTimeString(
      [],
      {
        hour: '2-digit',
        minute: '2-digit',
      }
    );
  }
 
  getInitials(name:| string | null | undefined): string {
 
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
 
  private scrollToBottom(): void {
 
    if (this.messageScroll) {
      this.messageScroll.scrollTo({
        bottom: 0,
        duration: 100,
      });
    }
  }
 
  ngOnDestroy(): void {
    if (this.filePreviewUrl) {
      URL.revokeObjectURL(this.filePreviewUrl);
    }
    this.socketSub?.unsubscribe();
  }
}
 