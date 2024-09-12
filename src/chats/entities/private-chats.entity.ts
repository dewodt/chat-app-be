import { PrivateMessage } from './private-messages.entity';
import { User } from 'src/users/entities';
import {
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('private_chats')
@Index(['user1', 'user2'], { unique: true })
export class PrivateChat {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({
    name: 'created_at',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
  })
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.id)
  @JoinColumn({ name: 'user1_id' })
  user1: User;

  @ManyToOne(() => User, (user) => user.id)
  @JoinColumn({ name: 'user2_id' })
  user2: User;

  @OneToMany(
    () => PrivateMessage,
    (privateMessage) => privateMessage.privateChat,
  )
  messages: PrivateMessage[];

  // Aditional field from query
  latestMessage: PrivateMessage | null; // null if no message exists
  unreadCount: number;
}
