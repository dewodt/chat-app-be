import { PrivateChat } from './private-chats.entity';
import { User } from 'src/users/entities';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('private_messages')
export class PrivateMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text')
  content: string;

  @Column({ name: 'is_read', default: false })
  @Index()
  isRead: boolean;

  @CreateDateColumn({
    name: 'created_at',
  })
  @Index()
  createdAt: Date;

  @Column({
    name: 'edited_at',
    nullable: true,
    type: 'timestamp without time zone',
  })
  editedAt: Date | null;

  @Column({
    name: 'read_at',
    nullable: true,
    type: 'timestamp without time zone',
  })
  readAt: Date | null;

  @UpdateDateColumn({
    name: 'updated_at',
  })
  updatedAt: Date;

  @DeleteDateColumn({
    name: 'deleted_at',
  })
  deletedAt: Date | null;

  @ManyToOne(() => PrivateChat, (privateChat) => privateChat.id)
  @JoinColumn({ name: 'private_chat_id' })
  @Index()
  privateChat: PrivateChat;

  @ManyToOne(() => User, (user) => user.id)
  @JoinColumn({ name: 'sender_id' })
  @Index()
  sender: User;
}
