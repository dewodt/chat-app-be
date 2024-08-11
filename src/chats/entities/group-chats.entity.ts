import { GroupChatParticipant } from './group-chat-participants.entity';
import { GroupMessage } from './group-messages.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('group_chats')
export class GroupChat {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  about: string | null;

  @Column({
    name: 'avatar_url',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  avatarUrl: string | null;

  @CreateDateColumn({
    name: 'created_at',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
  })
  updatedAt: Date;

  @ManyToOne(
    () => GroupChatParticipant,
    (groupChatParticipant) => groupChatParticipant.groupChat,
  )
  participants: GroupChatParticipant[];

  @OneToMany(() => GroupMessage, (groupMessage) => groupMessage.groupChat)
  messages: GroupMessage[];
}
