// import {
//   Component,
//   OnInit,
//   OnDestroy,
//   ViewChild,
//   ElementRef,
//   AfterViewChecked,
// } from '@angular/core';

// import { CommonModule } from '@angular/common';
// import { FormsModule } from '@angular/forms';
// import { NgScrollbar } from 'ngx-scrollbar';

// import {
//   ChatService,
//   ChatUser,
//   ChatMessage,
//   Conversation,
// } from './chat.service';

// import { AuthService } from '@core/service/auth.service';
// import { Subscription } from 'rxjs';

// @Component({
//   selector: 'app-chat',
//   templateUrl: './chat.component.html',
//   styleUrls: ['./chat.component.scss'],
//   standalone: true,
//   imports: [
//     CommonModule,
//     FormsModule,
//     NgScrollbar,
//   ],
// })
// export class ChatComponent
//   implements OnInit, OnDestroy, AfterViewChecked {

//   @ViewChild('messageScroll')
//   messageScroll!: NgScrollbar;

//    @ViewChild('messageInput')
//   messageInputRef!: ElementRef<HTMLTextAreaElement>;

//   // ---------------------------------------------------------
//   // USERS
//   // ---------------------------------------------------------

//   users: ChatUser[] = [];
//   filteredUsers: ChatUser[] = [];

//   // ---------------------------------------------------------
//   // GROUPS
//   // ---------------------------------------------------------

//   conversations: Conversation[] = [];
//   groups: Conversation[] = [];

//   groupSearchText = '';

//   selectedGroupMemberIds: number[] = [];

//   groupName = '';
//   showCreateGroupModal = false;
//   creatingGroup = false;

//   // ---------------------------------------------------------
//   // CHAT
//   // ---------------------------------------------------------

//   messages: ChatMessage[] = [];

//   searchText = '';
//   newMessage = '';

//   selectedFile: File | null = null;
//   filePreviewUrl: string | null = null;

//   activeConversationId: number | null = null;

//   selectedUser: ChatUser | null = null;
//   selectedGroup: Conversation | null = null;

//   // ---------------------------------------------------------
//   // UNREAD BADGES
//   // ---------------------------------------------------------

//   // conversationId -> unread count
//   unreadCounts: { [conversationId: number]: number } = {};
//     otherUserLastReadAt: string | null = null;

//   private readStatusSub!: Subscription;

//   // userId -> direct conversationId (built from this.conversations)
//   private directConversationByUserId: {
//     [userId: number]: number;
//   } = {};

//   // ---------------------------------------------------------
//   // CURRENT USER
//   // ---------------------------------------------------------

//   currentUserId!: number;
//   currentUserName!: string;

//   loading = false;

//   private socketSub!: Subscription;
//   private shouldScroll = false;

//   constructor(
//     private chatService: ChatService,
//     private authService: AuthService
//   ) {}

//   // =========================================================
//   // INITIALIZE
//   // =========================================================

//   ngOnInit(): void {

//     const user =
//       this.authService.getLoggedUser();

//     this.currentUserId =
//       user?.id ?? 0;

//     this.currentUserName =
//       user?.fullName ?? '';

//     // -------------------------------------------------------
//     // UNREAD BADGES - join every conversation room this
//     // employee belongs to (counts themselves come from the
//     // /conversations response once it loads)
//     // -------------------------------------------------------

//     this.chatService.identify(
//       this.currentUserId
//     );

//     // -------------------------------------------------------
//     // LOAD USERS
//     // -------------------------------------------------------

//     this.chatService.getUsers().subscribe({

//       next: (users) => {

//         this.users =
//           users.filter(
//             (u) =>
//               u.id !== this.currentUserId
//           );

//         this.filteredUsers =
//           [...this.users];
//       },

//       error: (err) =>
//         console.error(
//           'Failed to load users',
//           err
//         ),
//     });

//     // -------------------------------------------------------
//     // LOAD CONVERSATIONS / GROUPS
//     // -------------------------------------------------------

//     this.loadConversations();

//     // -------------------------------------------------------
//     // SOCKET LISTENER
//     // -------------------------------------------------------

//     this.socketSub =
//       this.chatService
//         .onMessage()
//         .subscribe((msg) => {

//           // Ignore own message
//           if (
//             msg.sender_id ===
//             this.currentUserId
//           ) {
//             return;
//           }

//           // Message for a conversation that isn't open right
//           // now - bump its unread badge instead of dropping it
//           if (
//             msg.conversation_id !==
//             this.activeConversationId
//           ) {
//             this.incrementUnread(
//               msg.conversation_id
//             );

//             return;
//           }

//           // Resolve sender name
//           if (!msg.sender_name) {

//             const sender =
//               this.users.find(
//                 (u) =>
//                   u.id === msg.sender_id
//               );

//             msg.sender_name =
//               sender?.fullName ??
//               'Unknown';
//           }

//           this.messages.push(msg);

//           this.shouldScroll = true;

//           // Conversation is open right now, keep last_read_at
//           // current so it isn't marked unread again after
//           // closing the tab without reselecting this chat
//           this.chatService
//             .markRead(
//               msg.conversation_id,
//               this.currentUserId
//             )
//             .subscribe({
//               error: (err) =>
//                 console.error(
//                   'Mark read failed',
//                   err
//                 ),
//             });
//         });

//             this.readStatusSub =
//       this.chatService
//         .onConversationRead()
//         .subscribe((data) => {

//           // Only relevant for the direct chat currently open,
//           // and only when it's the OTHER person who read it
//           if (
//             !this.selectedUser ||
//             data.conversation_id !==
//               this.activeConversationId ||
//             data.employee_id ===
//               this.currentUserId
//           ) {
//             return;
//           }

//           this.otherUserLastReadAt =
//             data.last_read_at;
//         });
//   }

//   // =========================================================
//   // LOAD CONVERSATIONS
//   // =========================================================

//   loadConversations(): void {

//     this.chatService
//       .getConversations(
//         this.currentUserId
//       )
//       .subscribe({

//         next: (conversations) => {

//           this.conversations =
//             conversations;

//           this.groups =
//             conversations.filter(
//               (conversation) =>
//                 conversation.type ===
//                 'group'
//             );

//           this.directConversationByUserId =
//             {};

//           conversations.forEach(
//             (conversation) => {

//               // unread counts come straight from the backend,
//               // so they're correct even after being offline
//               this.unreadCounts[
//                 conversation.id
//               ] =
//                 conversation.unread_count ??
//                 0;

//               if (
//                 conversation.type ===
//                   'direct' &&
//                 conversation.other_employee_id
//               ) {
//                 this.directConversationByUserId[
//                   conversation.other_employee_id
//                 ] = conversation.id;
//               }
//             }
//           );
//         },

//         error: (err) => {

//           console.error(
//             'Failed to load conversations',
//             err
//           );
//         },
//       });
//   }

//   // =========================================================
//   // AFTER VIEW CHECKED
//   // =========================================================

//   ngAfterViewChecked(): void {

//     if (this.shouldScroll) {

//       this.scrollToBottom();

//       this.shouldScroll = false;
//     }
//   }

//   // =========================================================
//   // SEARCH EMPLOYEES
//   // =========================================================

//   filterUsers(): void {

//     const q =
//       this.searchText
//         .toLowerCase()
//         .trim();

//     this.filteredUsers =
//       this.users.filter(
//         (user) =>
//           user.fullName
//             .toLowerCase()
//             .includes(q)
//       );
//   }

//   // =========================================================
//   // DIRECT CHAT
//   // =========================================================

//   selectUser(
//     user: ChatUser
//   ): void {

//     this.selectedUser =
//       user;

//     this.selectedGroup =
//       null;

//     this.messages = [];

//     this.loading = true;

//     this.chatService
//       .openDirectConversation(
//         this.currentUserId,
//         user.id
//       )
//       .subscribe({

//              next: ({
//           conversationId,
//         }) => {

//           this.activeConversationId =
//             conversationId;

//           this.directConversationByUserId[
//             user.id
//           ] = conversationId;

//           this.clearUnread(
//             conversationId
//           );

//           this.chatService
//             .joinConversation(
//               conversationId
//             );

//           this.loadMessages(
//             conversationId
//           );

//           this.otherUserLastReadAt =
//             null;

//           this.chatService
//             .getReadStatus(
//               conversationId,
//               this.currentUserId
//             )
//             .subscribe({

//               next: (res) => {

//                 this.otherUserLastReadAt =
//                   res.last_read_at;
//               },

//               error: (err) =>
//                 console.error(
//                   'Read status error',
//                   err
//                 ),
//             });
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

//   // =========================================================
//   // GROUP CHAT
//   // =========================================================

//     // =========================================================
//   // BACK TO LIST (mobile)
//   // =========================================================

//   goBackToList(): void {

//     this.selectedUser = null;

//     this.selectedGroup = null;

//     this.activeConversationId = null;

//     this.messages = [];
//   }

//   selectGroup(
//     group: Conversation
//   ): void {

//     this.selectedGroup =
//       group;

//     this.selectedUser =
//       null;

//     this.messages = [];

//     this.loading = true;

//       this.activeConversationId =
//       group.id;

//     this.otherUserLastReadAt =
//       null;

//     this.clearUnread(
//       group.id
//     );

//     this.chatService
//       .joinConversation(
//         group.id
//       );

//     this.loadMessages(
//       group.id
//     );
//   }

//   // =========================================================
//   // LOAD MESSAGES
//   // =========================================================

//   loadMessages(
//     conversationId: number
//   ): void {

//     this.chatService
//       .getMessages(
//         conversationId
//       )
//       .subscribe({

//         next: (msgs) => {

//           this.messages =
//             msgs;

//           this.loading =
//             false;

//           this.shouldScroll =
//             true;
//         },

//         error: (err) => {

//           console.error(
//             'Messages error',
//             err
//           );

//           this.loading =
//             false;
//         },
//       });
//   }

//   // =========================================================
//   // OPEN GROUP MODAL
//   // =========================================================

//   openCreateGroupModal(): void {

//     this.groupName = '';

//     this.groupSearchText = '';

//     this.selectedGroupMemberIds =
//       [];

//     this.showCreateGroupModal =
//       true;
//   }

//   // =========================================================
//   // CLOSE GROUP MODAL
//   // =========================================================

//   closeCreateGroupModal(): void {

//     if (this.creatingGroup) {
//       return;
//     }

//     this.showCreateGroupModal =
//       false;

//     this.groupName = '';

//     this.groupSearchText = '';

//     this.selectedGroupMemberIds =
//       [];
//   }

//   // =========================================================
//   // FILTER USERS INSIDE GROUP MODAL
//   // =========================================================

//   get groupUsers(): ChatUser[] {

//     const q =
//       this.groupSearchText
//         .toLowerCase()
//         .trim();

//     if (!q) {
//       return this.users;
//     }

//     return this.users.filter(
//       (user) =>
//         user.fullName
//           .toLowerCase()
//           .includes(q)
//     );
//   }

//   // =========================================================
//   // SELECT / UNSELECT GROUP MEMBER
//   // =========================================================

//   toggleGroupMember(
//     userId: number
//   ): void {

//     const index =
//       this.selectedGroupMemberIds
//         .indexOf(userId);

//     if (index === -1) {

//       this.selectedGroupMemberIds
//         .push(userId);

//     } else {

//       this.selectedGroupMemberIds
//         .splice(index, 1);
//     }
//   }

//   // =========================================================
//   // CHECK GROUP MEMBER
//   // =========================================================

//   isGroupMember(
//     userId: number
//   ): boolean {

//     return this.selectedGroupMemberIds
//       .includes(userId);
//   }

//   // =========================================================
//   // CREATE GROUP
//   // =========================================================

//   createGroup(): void {

//     const name =
//       this.groupName.trim();

//     if (!name) {
//       return;
//     }

//     this.creatingGroup =
//       true;

//     this.chatService
//       .createGroup(
//         name,
//         this.currentUserId,
//         this.selectedGroupMemberIds
//       )
//       .subscribe({

//         next: ({
//           conversationId,
//         }) => {

//           this.creatingGroup =
//             false;

//           this.showCreateGroupModal =
//             false;

//           // Reset modal
//           this.groupName = '';

//           this.groupSearchText = '';

//           this.selectedGroupMemberIds =
//             [];

//           // Refresh group list
//           this.loadConversations();

//           // Open newly created group
//           const newGroup: Conversation = {
//             id: conversationId,
//             name,
//             type: 'group',
//             created_by:
//               this.currentUserId,
//             created_at:
//               new Date().toISOString(),
//           };

//           this.selectGroup(
//             newGroup
//           );
//         },

//         error: (err) => {

//           console.error(
//             'Create group error',
//             err
//           );

//           this.creatingGroup =
//             false;
//         },
//       });
//   }

//   // =========================================================
//   // SEND MESSAGE
//   // =========================================================

//   send(): void {

//     const text =
//       this.newMessage.trim();

//     if (
//       (!text &&
//         !this.selectedFile) ||
//       !this.activeConversationId
//     ) {
//       return;
//     }

//     this.chatService
//       .sendMessage(
//         this.activeConversationId,
//         this.currentUserId,
//         text,
//         this.selectedFile
//       )
//       .subscribe({

//         next: (res) => {

//           this.messages.push({

//             id:
//               res.messageId,

//             conversation_id:
//               this.activeConversationId!,

//             sender_id:
//               this.currentUserId,

//             sender_name:
//               this.currentUserName,

//             message:
//               text,

//             attachment_url:
//               res.attachment_url,

//             attachment_type:
//               res.attachment_type,

//             created_at:
//               new Date().toISOString(),
//           });

//                     this.newMessage =
//             '';

//           if (this.messageInputRef) {
//             this.messageInputRef.nativeElement.style.height =
//               'auto';
//           }

//           this.removeSelectedFile();

//           this.shouldScroll =
//             true;
//         },

//         error: (err) =>
//           console.error(
//             'Send error',
//             err
//           ),
//       });
//   }

//   // =========================================================
//   // FILE SELECT
//   // =========================================================

//   onFileSelected(
//     event: Event
//   ): void {

//     const input =
//       event.target as HTMLInputElement;

//     const file =
//       input.files?.[0];

//     if (!file) {
//       return;
//     }

//     if (this.filePreviewUrl) {

//       URL.revokeObjectURL(
//         this.filePreviewUrl
//       );
//     }

//     this.selectedFile =
//       file;

//     this.filePreviewUrl =
//       file.type.startsWith(
//         'image/'
//       )
//         ? URL.createObjectURL(file)
//         : null;

//     input.value = '';
//   }

//   // =========================================================
//   // REMOVE FILE
//   // =========================================================

//   removeSelectedFile(): void {

//     if (this.filePreviewUrl) {

//       URL.revokeObjectURL(
//         this.filePreviewUrl
//       );
//     }

//     this.selectedFile =
//       null;

//     this.filePreviewUrl =
//       null;
//   }

//   // =========================================================
//   // ENTER TO SEND
//   // =========================================================

//   onEnter(
//     event: KeyboardEvent
//   ): void {

//     if (
//       event.key === 'Enter' &&
//       !event.shiftKey
//     ) {

//       event.preventDefault();

//       this.send();
//     }
//   }

//   // =========================================================
//   // AUTO-GROW TEXTAREA
//   // =========================================================

//   autoGrow(
//     textarea: HTMLTextAreaElement
//   ): void {

//     textarea.style.height = 'auto';

//     textarea.style.height =
//       textarea.scrollHeight + 'px';
//   }

//   // =========================================================
//   // FORMAT TIME
//   // =========================================================

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

//   // =========================================================
//   // DATE SEPARATORS (Today / Yesterday / date)
//   // =========================================================

//   getDateSeparator(
//     index: number
//   ): string | null {

//     const msg =
//       this.messages[index];

//     if (!msg) {
//       return null;
//     }

//     const msgDate =
//       new Date(msg.created_at);

//     if (index === 0) {
//       return this.formatDateLabel(
//         msgDate
//       );
//     }

//     const prevDate =
//       new Date(
//         this.messages[index - 1]
//           .created_at
//       );

//     if (
//       !this.isSameDay(
//         msgDate,
//         prevDate
//       )
//     ) {
//       return this.formatDateLabel(
//         msgDate
//       );
//     }

//     return null;
//   }

//   private formatDateLabel(
//     date: Date
//   ): string {

//     const today = new Date();

//     const yesterday = new Date();

//     yesterday.setDate(
//       today.getDate() - 1
//     );

//     if (
//       this.isSameDay(date, today)
//     ) {
//       return 'Today';
//     }

//     if (
//       this.isSameDay(
//         date,
//         yesterday
//       )
//     ) {
//       return 'Yesterday';
//     }

//     return date.toLocaleDateString(
//       'en-US',
//       {
//         weekday: 'long',
//         month: 'long',
//         day: 'numeric',
//         year:
//           date.getFullYear() !==
//           today.getFullYear()
//             ? 'numeric'
//             : undefined,
//       }
//     );
//   }

//   private isSameDay(
//     a: Date,
//     b: Date
//   ): boolean {

//     return (
//       a.getFullYear() ===
//         b.getFullYear() &&
//       a.getMonth() === b.getMonth() &&
//       a.getDate() === b.getDate()
//     );
//   }

//   // =========================================================
//   // INITIALS
//   // =========================================================

//   getInitials(
//     name: string | null | undefined
//   ): string {

//     if (!name) {
//       return '?';
//     }

//     return name
//       .split(' ')
//       .map(
//         (n) => n[0]
//       )
//       .join('')
//       .toUpperCase()
//       .slice(0, 2);
//   }

//   // =========================================================
//   // SCROLL TO BOTTOM
//   // =========================================================

//   private scrollToBottom(): void {

//     if (this.messageScroll) {

//       this.messageScroll.scrollTo({
//         bottom: 0,
//         duration: 100,
//       });
//     }
//   }

//   // =========================================================
//   // UNREAD BADGES
//   // =========================================================

//   private incrementUnread(
//     conversationId: number
//   ): void {

//     this.unreadCounts[conversationId] =
//       (this.unreadCounts[conversationId] ?? 0) + 1;
//   }

//   private clearUnread(
//     conversationId: number
//   ): void {

//     this.unreadCounts[conversationId] =
//       0;

//     this.chatService
//       .markRead(
//         conversationId,
//         this.currentUserId
//       )
//       .subscribe({

//         error: (err) =>
//           console.error(
//             'Mark read failed',
//             err
//           ),
//       });
//   }

//   getUserUnreadCount(
//     user: ChatUser
//   ): number {

//     const conversationId =
//       this.directConversationByUserId[user.id];

//     if (!conversationId) {
//       return 0;
//     }

//     return this.unreadCounts[conversationId] ?? 0;
//   }

//   getGroupUnreadCount(
//     group: Conversation
//   ): number {

//     return this.unreadCounts[group.id] ?? 0;
//   }

//   // =========================================================
//   // READ RECEIPTS (individual chats only)
//   // =========================================================

//   getTickStatus(
//     msg: ChatMessage
//   ): 'sent' | 'seen' | null {

//     // Only show ticks on your own messages in a direct chat
//     if (
//       !this.selectedUser ||
//       msg.sender_id !==
//         this.currentUserId
//     ) {
//       return null;
//     }

//     if (!this.otherUserLastReadAt) {
//       return 'sent';
//     }

//     const msgTime =
//       new Date(
//         msg.created_at
//       ).getTime();

//     const readTime =
//       new Date(
//         this.otherUserLastReadAt
//       ).getTime();

//     return msgTime <= readTime
//       ? 'seen'
//       : 'sent';
//   }

//   // =========================================================
//   // DESTROY
//   // =========================================================

//   ngOnDestroy(): void {

//     if (this.filePreviewUrl) {

//       URL.revokeObjectURL(
//         this.filePreviewUrl
//       );
//     }

//     this.socketSub?.unsubscribe();

//     this.readStatusSub?.unsubscribe();
//   }
// }
import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  AfterViewChecked,
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgScrollbar } from 'ngx-scrollbar';

import {
  ChatService,
  ChatUser,
  ChatMessage,
  Conversation,
  ChatRequest,
} from './chat.service';

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
  implements OnInit, OnDestroy, AfterViewChecked {

  @ViewChild('messageScroll')
  messageScroll!: NgScrollbar;

   @ViewChild('messageInput')
  messageInputRef!: ElementRef<HTMLTextAreaElement>;

  // ---------------------------------------------------------
  // USERS
  // ---------------------------------------------------------

  users: ChatUser[] = [];
  filteredUsers: ChatUser[] = [];

  // People found via backend search who are NOT yet a contact
  // (no accepted conversation) - shown with a Send Request button
  searchResults: ChatUser[] = [];

  // ---------------------------------------------------------
  // CHAT REQUESTS
  // ---------------------------------------------------------

  // userId -> requestId, for people I've sent a pending request to
  pendingOutgoingRequests: { [userId: number]: number } = {};

  // people I've sent a request to - shown in the Chats list
  // with a "Pending" tag until they accept
  pendingContacts: ChatUser[] = [];
  filteredPendingContacts: ChatUser[] = [];

  // requests waiting on me to accept/reject (bell dropdown)
  incomingRequests: ChatRequest[] = [];
  showRequestsDropdown = false;

  private searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  private chatRequestReceivedSub!: Subscription;
  private chatRequestAcceptedSub!: Subscription;
  private chatRequestRejectedSub!: Subscription;

  // ---------------------------------------------------------
  // ONLINE / OFFLINE PRESENCE
  // ---------------------------------------------------------

  // userId -> true (online) / false (offline)
  onlineStatus: { [userId: number]: boolean } = {};

  private presenceSub!: Subscription;

  // ---------------------------------------------------------
  // GROUPS
  // ---------------------------------------------------------

  conversations: Conversation[] = [];
  groups: Conversation[] = [];

  groupSearchText = '';

  selectedGroupMemberIds: number[] = [];

  groupName = '';
  showCreateGroupModal = false;
  creatingGroup = false;

  // ---------------------------------------------------------
  // CHAT
  // ---------------------------------------------------------

  messages: ChatMessage[] = [];

  searchText = '';
  newMessage = '';

  selectedFile: File | null = null;
  filePreviewUrl: string | null = null;

  activeConversationId: number | null = null;

  selectedUser: ChatUser | null = null;
  selectedGroup: Conversation | null = null;

  // ---------------------------------------------------------
  // UNREAD BADGES
  // ---------------------------------------------------------

  // conversationId -> unread count
  unreadCounts: { [conversationId: number]: number } = {};
    otherUserLastReadAt: string | null = null;

  private readStatusSub!: Subscription;

  // userId -> direct conversationId (built from this.conversations)
  private directConversationByUserId: {
    [userId: number]: number;
  } = {};

  // ---------------------------------------------------------
  // CURRENT USER
  // ---------------------------------------------------------

  currentUserId!: number;
  currentUserName!: string;

  loading = false;

  // true while a message (with or without an attachment) is
  // being sent - blocks the send button so a slow file upload
  // can't be double-submitted
  sending = false;

  private socketSub!: Subscription;
  private shouldScroll = false;

  constructor(
    private chatService: ChatService,
    private authService: AuthService
  ) {}

  // =========================================================
  // INITIALIZE
  // =========================================================

  ngOnInit(): void {

    const user =
      this.authService.getLoggedUser();

    this.currentUserId =
      user?.id ?? 0;

    this.currentUserName =
      user?.fullName ?? '';

    // -------------------------------------------------------
    // UNREAD BADGES - join every conversation room this
    // employee belongs to (counts themselves come from the
    // /conversations response once it loads)
    // -------------------------------------------------------

    this.chatService.identify(
      this.currentUserId
    );

    // -------------------------------------------------------
    // LOAD USERS
    // -------------------------------------------------------

    this.chatService.getUsers().subscribe({

      next: (users) => {

        this.users =
          users.filter(
            (u) =>
              u.id !== this.currentUserId
          );

        this.filterUsers();
      },

      error: (err) =>
        console.error(
          'Failed to load users',
          err
        ),
    });

    // -------------------------------------------------------
    // LOAD CONVERSATIONS / GROUPS
    // -------------------------------------------------------

    this.loadConversations();

    // -------------------------------------------------------
    // LOAD CHAT REQUESTS (bell dropdown + pending state)
    // -------------------------------------------------------

    this.loadChatRequests();

    // -------------------------------------------------------
    // ONLINE / OFFLINE PRESENCE
    // -------------------------------------------------------

    this.chatService.getOnlineStatus().subscribe({

      next: (status) => {

        this.onlineStatus = status;
      },

      error: (err) =>
        console.error(
          'Failed to load online status',
          err
        ),
    });

    this.presenceSub =
      this.chatService
        .onPresenceChanged()
        .subscribe((data) => {

          this.onlineStatus[data.employeeId] =
            data.online;
        });

    // -------------------------------------------------------
    // CHAT REQUEST SOCKET LISTENERS
    // -------------------------------------------------------

    this.chatRequestReceivedSub =
      this.chatService
        .onChatRequestReceived()
        .subscribe((data) => {

          const sender =
            this.users.find(
              (u) => u.id === data.sender_id
            );

          this.incomingRequests.unshift({
            id: data.id,
            sender_id: data.sender_id,
            status: 'pending',
            created_at: new Date().toISOString(),
            sender_name: sender?.fullName ?? 'Unknown',
            sender_role: sender?.role ?? '',
          });
        });

    this.chatRequestAcceptedSub =
      this.chatService
        .onChatRequestAccepted()
        .subscribe((data) => {

          // I sent the request; the other person accepted it
          delete this.pendingOutgoingRequests[
            data.by_employee_id
          ];

          this.pendingContacts =
            this.pendingContacts.filter(
              (u) => u.id !== data.by_employee_id
            );

          this.filterUsers();

          this.loadConversations();
        });

    this.chatRequestRejectedSub =
      this.chatService
        .onChatRequestRejected()
        .subscribe((data) => {

          const userId =
            Object.keys(this.pendingOutgoingRequests)
              .find(
                (uid) =>
                  this.pendingOutgoingRequests[+uid] ===
                  data.request_id
              );

          if (userId) {
            delete this.pendingOutgoingRequests[+userId];

            this.pendingContacts =
              this.pendingContacts.filter(
                (u) => u.id !== +userId!
              );

            this.filterUsers();
          }
        });

    // -------------------------------------------------------
    // SOCKET LISTENER
    // -------------------------------------------------------

    this.socketSub =
      this.chatService
        .onMessage()
        .subscribe((msg) => {

          // Ignore own message
          if (
            msg.sender_id ===
            this.currentUserId
          ) {
            return;
          }

          // New activity on this conversation - move it to
          // the top of the sidebar, same as Teams/WhatsApp
          this.bumpConversationToTop(
            msg.conversation_id
          );

          // Message for a conversation that isn't open right
          // now - bump its unread badge instead of dropping it
          if (
            msg.conversation_id !==
            this.activeConversationId
          ) {
            this.incrementUnread(
              msg.conversation_id
            );

            return;
          }

          // Resolve sender name
          if (!msg.sender_name) {

            const sender =
              this.users.find(
                (u) =>
                  u.id === msg.sender_id
              );

            msg.sender_name =
              sender?.fullName ??
              'Unknown';
          }

          this.messages.push(msg);

          this.shouldScroll = true;

          // Conversation is open right now, keep last_read_at
          // current so it isn't marked unread again after
          // closing the tab without reselecting this chat
          this.chatService
            .markRead(
              msg.conversation_id,
              this.currentUserId
            )
            .subscribe({
              error: (err) =>
                console.error(
                  'Mark read failed',
                  err
                ),
            });
        });

            this.readStatusSub =
      this.chatService
        .onConversationRead()
        .subscribe((data) => {

          // Only relevant for the direct chat currently open,
          // and only when it's the OTHER person who read it
          if (
            !this.selectedUser ||
            data.conversation_id !==
              this.activeConversationId ||
            data.employee_id ===
              this.currentUserId
          ) {
            return;
          }

          this.otherUserLastReadAt =
            data.last_read_at;
        });
  }

  // =========================================================
  // LOAD CONVERSATIONS
  // =========================================================

  loadConversations(): void {

    this.chatService
      .getConversations(
        this.currentUserId
      )
      .subscribe({

        next: (conversations) => {

          this.conversations =
            conversations;

          this.groups =
            conversations.filter(
              (conversation) =>
                conversation.type ===
                'group'
            );

          this.directConversationByUserId =
            {};

          conversations.forEach(
            (conversation) => {

              // unread counts come straight from the backend,
              // so they're correct even after being offline
              this.unreadCounts[
                conversation.id
              ] =
                conversation.unread_count ??
                0;

              if (
                conversation.type ===
                  'direct' &&
                conversation.other_employee_id
              ) {
                this.directConversationByUserId[
                  conversation.other_employee_id
                ] = conversation.id;
              }
            }
          );

          // Contacts (people with an accepted conversation)
          // depend on this map, so refresh the visible list
          this.filterUsers();
        },

        error: (err) => {

          console.error(
            'Failed to load conversations',
            err
          );
        },
      });
  }

  // =========================================================
  // BUMP CONVERSATION TO TOP (most recent activity first)
  // =========================================================

  private bumpConversationToTop(
    conversationId: number
  ): void {

    const idx =
      this.conversations.findIndex(
        (c) => c.id === conversationId
      );

    // Not in our local list yet (e.g. brand new conversation
    // from an accepted request) - just refetch the real order
    if (idx === -1) {
      this.loadConversations();
      return;
    }

    if (idx > 0) {

      const [conversation] =
        this.conversations.splice(idx, 1);

      this.conversations.unshift(
        conversation
      );

      this.groups =
        this.conversations.filter(
          (c) => c.type === 'group'
        );

      this.filterUsers();
    }
  }

  // =========================================================
  // AFTER VIEW CHECKED
  // =========================================================

  ngAfterViewChecked(): void {

    if (this.shouldScroll) {

      this.scrollToBottom();

      this.shouldScroll = false;
    }
  }

  // =========================================================
  // SEARCH EMPLOYEES
  // =========================================================

  filterUsers(): void {

    const q =
      this.searchText
        .toLowerCase()
        .trim();

    // Sidebar default = only people I already have an
    // accepted conversation with, most recently active
    // conversation first (matches Teams-style ordering)
    const contacts: ChatUser[] = [];

    this.conversations
      .filter(
        (c) =>
          c.type === 'direct' &&
          !!c.other_employee_id
      )
      .forEach((c) => {

        const user =
          this.users.find(
            (u) => u.id === c.other_employee_id
          );

        if (user) {
          contacts.push(user);
        }
      });

    this.filteredUsers =
      contacts.filter(
        (user) =>
          user.fullName
            .toLowerCase()
            .includes(q)
      );

    this.filteredPendingContacts =
      this.pendingContacts.filter(
        (user) =>
          user.fullName
            .toLowerCase()
            .includes(q)
      );

    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }

    if (!q) {
      this.searchResults = [];
      return;
    }

    // New people (not yet a contact, not already pending) only
    // ever surface through a live backend search, never from a
    // preloaded full employee list
    this.searchDebounceTimer =
      setTimeout(() => {

        this.chatService
          .searchUsers(
            this.searchText.trim(),
            this.currentUserId
          )
          .subscribe({

            next: (results) => {

              this.searchResults =
                results.filter(
                  (user) =>
                    !this.directConversationByUserId[user.id] &&
                    !this.pendingOutgoingRequests[user.id]
                );
            },

            error: (err) =>
              console.error(
                'Search users failed',
                err
              ),
          });
      }, 250);
  }

  // =========================================================
  // CHAT REQUESTS
  // =========================================================

  loadChatRequests(): void {

    this.chatService
      .getChatRequests(
        this.currentUserId
      )
      .subscribe({

        next: ({ incoming, outgoing }) => {

          this.incomingRequests =
            incoming;

          this.pendingContacts = [];

          outgoing.forEach((req) => {

            if (req.receiver_id) {

              this.pendingOutgoingRequests[
                req.receiver_id
              ] = req.id;

              this.pendingContacts.push({
                id: req.receiver_id,
                fullName: req.receiver_name ?? 'Unknown',
                role: req.receiver_role ?? '',
                email: '',
              });
            }
          });

          this.filterUsers();
        },

        error: (err) =>
          console.error(
            'Failed to load chat requests',
            err
          ),
      });
  }

  isPendingRequest(
    user: ChatUser
  ): boolean {

    return !!this.pendingOutgoingRequests[user.id];
  }

  sendRequestToUser(
    user: ChatUser
  ): void {

    if (this.pendingOutgoingRequests[user.id]) {
      return;
    }

    this.chatService
      .sendChatRequest(
        this.currentUserId,
        user.id
      )
      .subscribe({

        next: (res) => {

          if (
            res.status === 'already_conversation' &&
            res.conversationId
          ) {
            this.loadConversations();
            this.selectUser(user);
            return;
          }

          if (res.requestId) {
            this.pendingOutgoingRequests[user.id] =
              res.requestId;

            if (
              !this.pendingContacts.some(
                (u) => u.id === user.id
              )
            ) {
              this.pendingContacts.push(user);
            }

            this.filterUsers();
          }
        },

        error: (err) =>
          console.error(
            'Send chat request failed',
            err
          ),
      });
  }

  toggleRequestsDropdown(): void {

    this.showRequestsDropdown =
      !this.showRequestsDropdown;
  }

  respondToRequest(
    req: ChatRequest,
    action: 'accept' | 'reject'
  ): void {

    this.chatService
      .respondToRequest(
        req.id,
        this.currentUserId,
        action
      )
      .subscribe({

        next: (res) => {

          this.incomingRequests =
            this.incomingRequests.filter(
              (r) => r.id !== req.id
            );

          if (action === 'accept' && res.conversationId) {
            this.loadConversations();
          }
        },

        error: (err) =>
          console.error(
            'Respond to chat request failed',
            err
          ),
      });
  }

  // =========================================================
  // DIRECT CHAT
  // =========================================================

  selectUser(
    user: ChatUser
  ): void {

    this.selectedUser =
      user;

    this.selectedGroup =
      null;

    this.messages = [];

    this.loading = true;

    this.chatService
      .openDirectConversation(
        this.currentUserId,
        user.id
      )
      .subscribe({

             next: ({
          conversationId,
        }) => {

          this.activeConversationId =
            conversationId;

          this.directConversationByUserId[
            user.id
          ] = conversationId;

          this.clearUnread(
            conversationId
          );

          this.chatService
            .joinConversation(
              conversationId
            );

          this.loadMessages(
            conversationId
          );

          this.otherUserLastReadAt =
            null;

          this.chatService
            .getReadStatus(
              conversationId,
              this.currentUserId
            )
            .subscribe({

              next: (res) => {

                this.otherUserLastReadAt =
                  res.last_read_at;
              },

              error: (err) =>
                console.error(
                  'Read status error',
                  err
                ),
            });
        },

        error: (err) => {

          console.error(
            'Conversation error',
            err
          );

          this.loading = false;
        },
      });
  }

  // =========================================================
  // GROUP CHAT
  // =========================================================

    // =========================================================
  // BACK TO LIST (mobile)
  // =========================================================

  goBackToList(): void {

    this.selectedUser = null;

    this.selectedGroup = null;

    this.activeConversationId = null;

    this.messages = [];
  }

  selectGroup(
    group: Conversation
  ): void {

    this.selectedGroup =
      group;

    this.selectedUser =
      null;

    this.messages = [];

    this.loading = true;

      this.activeConversationId =
      group.id;

    this.otherUserLastReadAt =
      null;

    this.clearUnread(
      group.id
    );

    this.chatService
      .joinConversation(
        group.id
      );

    this.loadMessages(
      group.id
    );
  }

  // =========================================================
  // LOAD MESSAGES
  // =========================================================

  loadMessages(
    conversationId: number
  ): void {

    this.chatService
      .getMessages(
        conversationId
      )
      .subscribe({

        next: (msgs) => {

          this.messages =
            msgs;

          this.loading =
            false;

          this.shouldScroll =
            true;
        },

        error: (err) => {

          console.error(
            'Messages error',
            err
          );

          this.loading =
            false;
        },
      });
  }

  // =========================================================
  // OPEN GROUP MODAL
  // =========================================================

  openCreateGroupModal(): void {

    this.groupName = '';

    this.groupSearchText = '';

    this.selectedGroupMemberIds =
      [];

    this.showCreateGroupModal =
      true;
  }

  // =========================================================
  // CLOSE GROUP MODAL
  // =========================================================

  closeCreateGroupModal(): void {

    if (this.creatingGroup) {
      return;
    }

    this.showCreateGroupModal =
      false;

    this.groupName = '';

    this.groupSearchText = '';

    this.selectedGroupMemberIds =
      [];
  }

  // =========================================================
  // FILTER USERS INSIDE GROUP MODAL
  // =========================================================

  get groupUsers(): ChatUser[] {

    const q =
      this.groupSearchText
        .toLowerCase()
        .trim();

    if (!q) {
      return this.users;
    }

    return this.users.filter(
      (user) =>
        user.fullName
          .toLowerCase()
          .includes(q)
    );
  }

  // =========================================================
  // SELECT / UNSELECT GROUP MEMBER
  // =========================================================

  toggleGroupMember(
    userId: number
  ): void {

    const index =
      this.selectedGroupMemberIds
        .indexOf(userId);

    if (index === -1) {

      this.selectedGroupMemberIds
        .push(userId);

    } else {

      this.selectedGroupMemberIds
        .splice(index, 1);
    }
  }

  // =========================================================
  // CHECK GROUP MEMBER
  // =========================================================

  isGroupMember(
    userId: number
  ): boolean {

    return this.selectedGroupMemberIds
      .includes(userId);
  }

  // =========================================================
  // CREATE GROUP
  // =========================================================

  createGroup(): void {

    const name =
      this.groupName.trim();

    if (!name) {
      return;
    }

    this.creatingGroup =
      true;

    this.chatService
      .createGroup(
        name,
        this.currentUserId,
        this.selectedGroupMemberIds
      )
      .subscribe({

        next: ({
          conversationId,
        }) => {

          this.creatingGroup =
            false;

          this.showCreateGroupModal =
            false;

          // Reset modal
          this.groupName = '';

          this.groupSearchText = '';

          this.selectedGroupMemberIds =
            [];

          // Refresh group list
          this.loadConversations();

          // Open newly created group
          const newGroup: Conversation = {
            id: conversationId,
            name,
            type: 'group',
            created_by:
              this.currentUserId,
            created_at:
              new Date().toISOString(),
          };

          this.selectGroup(
            newGroup
          );
        },

        error: (err) => {

          console.error(
            'Create group error',
            err
          );

          this.creatingGroup =
            false;
        },
      });
  }

  // =========================================================
  // SEND MESSAGE
  // =========================================================

  send(): void {

    const text =
      this.newMessage.trim();

    if (
      (!text &&
        !this.selectedFile) ||
      !this.activeConversationId ||
      this.sending
    ) {
      return;
    }

    this.sending = true;

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

            id:
              res.messageId,

            conversation_id:
              this.activeConversationId!,

            sender_id:
              this.currentUserId,

            sender_name:
              this.currentUserName,

            message:
              text,

            attachment_url:
              res.attachment_url,

            attachment_type:
              res.attachment_type,

            attachment_name:
              res.attachment_name,

            created_at:
              new Date().toISOString(),
          });

                    this.newMessage =
            '';

          if (this.messageInputRef) {
            this.messageInputRef.nativeElement.style.height =
              'auto';
          }

          this.removeSelectedFile();

          this.sending = false;

          this.bumpConversationToTop(
            this.activeConversationId!
          );

          this.shouldScroll =
            true;
        },

        error: (err) => {

          console.error(
            'Send error',
            err
          );

          this.sending = false;
        },
      });
  }

  // =========================================================
  // ONLINE / OFFLINE PRESENCE
  // =========================================================

  isOnline(
    userId: number
  ): boolean {

    return !!this.onlineStatus[userId];
  }

  // =========================================================
  // ATTACHMENT DOWNLOAD
  // =========================================================

  getDownloadUrl(
    msg: ChatMessage
  ): string {

    return this.chatService.getAttachmentDownloadUrl(
      msg.id
    );
  }

  // =========================================================
  // FILE SELECT
  // =========================================================

  onFileSelected(
    event: Event
  ): void {

    const input =
      event.target as HTMLInputElement;

    const file =
      input.files?.[0];

    if (!file) {
      return;
    }

    if (this.filePreviewUrl) {

      URL.revokeObjectURL(
        this.filePreviewUrl
      );
    }

    this.selectedFile =
      file;

    this.filePreviewUrl =
      file.type.startsWith(
        'image/'
      )
        ? URL.createObjectURL(file)
        : null;

    input.value = '';
  }

  // =========================================================
  // REMOVE FILE
  // =========================================================

  removeSelectedFile(): void {

    if (this.filePreviewUrl) {

      URL.revokeObjectURL(
        this.filePreviewUrl
      );
    }

    this.selectedFile =
      null;

    this.filePreviewUrl =
      null;
  }

  // =========================================================
  // ENTER TO SEND
  // =========================================================

  onEnter(
    event: KeyboardEvent
  ): void {

    if (
      event.key === 'Enter' &&
      !event.shiftKey
    ) {

      event.preventDefault();

      this.send();
    }
  }

  // =========================================================
  // AUTO-GROW TEXTAREA
  // =========================================================

  autoGrow(
    textarea: HTMLTextAreaElement
  ): void {

    textarea.style.height = 'auto';

    textarea.style.height =
      textarea.scrollHeight + 'px';
  }

  // =========================================================
  // FORMAT TIME
  // =========================================================

  formatTime(
    dateStr: string
  ): string {

    const d =
      new Date(dateStr);

    return d.toLocaleTimeString(
      [],
      {
        hour: '2-digit',
        minute: '2-digit',
      }
    );
  }

  // =========================================================
  // DATE SEPARATORS (Today / Yesterday / date)
  // =========================================================

  getDateSeparator(
    index: number
  ): string | null {

    const msg =
      this.messages[index];

    if (!msg) {
      return null;
    }

    const msgDate =
      new Date(msg.created_at);

    if (index === 0) {
      return this.formatDateLabel(
        msgDate
      );
    }

    const prevDate =
      new Date(
        this.messages[index - 1]
          .created_at
      );

    if (
      !this.isSameDay(
        msgDate,
        prevDate
      )
    ) {
      return this.formatDateLabel(
        msgDate
      );
    }

    return null;
  }

  private formatDateLabel(
    date: Date
  ): string {

    const today = new Date();

    const yesterday = new Date();

    yesterday.setDate(
      today.getDate() - 1
    );

    if (
      this.isSameDay(date, today)
    ) {
      return 'Today';
    }

    if (
      this.isSameDay(
        date,
        yesterday
      )
    ) {
      return 'Yesterday';
    }

    return date.toLocaleDateString(
      'en-US',
      {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year:
          date.getFullYear() !==
          today.getFullYear()
            ? 'numeric'
            : undefined,
      }
    );
  }

  private isSameDay(
    a: Date,
    b: Date
  ): boolean {

    return (
      a.getFullYear() ===
        b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }

  // =========================================================
  // INITIALS
  // =========================================================

  getInitials(
    name: string | null | undefined
  ): string {

    if (!name) {
      return '?';
    }

    return name
      .split(' ')
      .map(
        (n) => n[0]
      )
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  // =========================================================
  // SCROLL TO BOTTOM
  // =========================================================

  private scrollToBottom(): void {

    if (this.messageScroll) {

      this.messageScroll.scrollTo({
        bottom: 0,
        duration: 100,
      });
    }
  }

  // =========================================================
  // UNREAD BADGES
  // =========================================================

  private incrementUnread(
    conversationId: number
  ): void {

    this.unreadCounts[conversationId] =
      (this.unreadCounts[conversationId] ?? 0) + 1;
  }

  private clearUnread(
    conversationId: number
  ): void {

    this.unreadCounts[conversationId] =
      0;

    this.chatService
      .markRead(
        conversationId,
        this.currentUserId
      )
      .subscribe({

        error: (err) =>
          console.error(
            'Mark read failed',
            err
          ),
      });
  }

  getUserUnreadCount(
    user: ChatUser
  ): number {

    const conversationId =
      this.directConversationByUserId[user.id];

    if (!conversationId) {
      return 0;
    }

    return this.unreadCounts[conversationId] ?? 0;
  }

  getGroupUnreadCount(
    group: Conversation
  ): number {

    return this.unreadCounts[group.id] ?? 0;
  }

  // =========================================================
  // READ RECEIPTS (individual chats only)
  // =========================================================

  getTickStatus(
    msg: ChatMessage
  ): 'sent' | 'seen' | null {

    // Only show ticks on your own messages in a direct chat
    if (
      !this.selectedUser ||
      msg.sender_id !==
        this.currentUserId
    ) {
      return null;
    }

    if (!this.otherUserLastReadAt) {
      return 'sent';
    }

    const msgTime =
      new Date(
        msg.created_at
      ).getTime();

    const readTime =
      new Date(
        this.otherUserLastReadAt
      ).getTime();

    return msgTime <= readTime
      ? 'seen'
      : 'sent';
  }

  // =========================================================
  // DESTROY
  // =========================================================

  ngOnDestroy(): void {

    if (this.filePreviewUrl) {

      URL.revokeObjectURL(
        this.filePreviewUrl
      );
    }

    this.socketSub?.unsubscribe();

    this.readStatusSub?.unsubscribe();

    this.chatRequestReceivedSub?.unsubscribe();

    this.chatRequestAcceptedSub?.unsubscribe();

    this.chatRequestRejectedSub?.unsubscribe();

    this.presenceSub?.unsubscribe();

    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
  }
}