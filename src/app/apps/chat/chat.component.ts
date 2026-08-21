import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
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

  // ---------------------------------------------------------
  // USERS
  // ---------------------------------------------------------

  users: ChatUser[] = [];
  filteredUsers: ChatUser[] = [];

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

        this.filteredUsers =
          [...this.users];
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

    this.filteredUsers =
      this.users.filter(
        (user) =>
          user.fullName
            .toLowerCase()
            .includes(q)
      );
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
      !this.activeConversationId
    ) {
      return;
    }

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

            created_at:
              new Date().toISOString(),
          });

          this.newMessage =
            '';

          this.removeSelectedFile();

          this.shouldScroll =
            true;
        },

        error: (err) =>
          console.error(
            'Send error',
            err
          ),
      });
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
  // DESTROY
  // =========================================================

  ngOnDestroy(): void {

    if (this.filePreviewUrl) {

      URL.revokeObjectURL(
        this.filePreviewUrl
      );
    }

    this.socketSub?.unsubscribe();
  }
}