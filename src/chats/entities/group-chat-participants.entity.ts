import { GroupChat } from './group-chats.entity';
import { GroupParticipantRole } from './group-participant-role.entity';
import { User } from 'src/users/entities';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

@Entity('group_chat_participants')
@Unique(['user', 'groupChat'])
export class GroupChatParticipant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: GroupParticipantRole,
    default: GroupParticipantRole.MEMBER,
  })
  role: GroupParticipantRole;

  @CreateDateColumn({
    name: 'created_at',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
  })
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.id)
  @JoinColumn({ name: 'user_id' })
  @Index()
  user: User;

  @ManyToOne(() => GroupChat, (groupChat) => groupChat.id)
  @JoinColumn({ name: 'group_chat_id' })
  @Index()
  groupChat: GroupChat;
}
