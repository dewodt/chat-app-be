import { PrivateMessage } from './private-messages.entity';
import { User } from 'src/users/entities';
import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('private_chats')
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
}
