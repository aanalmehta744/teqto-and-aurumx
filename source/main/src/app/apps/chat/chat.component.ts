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