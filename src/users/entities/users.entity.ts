import { PrivateChat } from 'src/chats/entities/private-chats.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  username: string;

  @Column()
  password: string;

  @Column()
  name: string;

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

  @OneToMany(() => PrivateChat, (privateChat) => privateChat.user1)
  privateChats1: PrivateChat[];

  @OneToMany(() => PrivateChat, (privateChat) => privateChat.user2)
  privateChats2: PrivateChat[];
}
