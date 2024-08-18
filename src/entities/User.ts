import {
  Entity,
  Column,
  UpdateDateColumn,
  BaseEntity,
  CreateDateColumn,
  PrimaryColumn,
} from "typeorm";

@Entity()
export class User extends BaseEntity {
  @PrimaryColumn()
  id!: string;

  @Column()
  name!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  password!: string;

  @Column()
  mnemonic!: string;

  @Column()
  address!: string;

  @Column()
  private_key!: string;

  @Column("bigint")
  amount!: string;

  @Column({ default: 0 })
  steps!: number;

  @Column({ default: 0 })
  tokens!: number;

  @Column({ nullable: true })
  username?: string;

  @Column({ nullable: true })
  profilePicture?: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ nullable: true })
  refreshToken?: string; // New field for refresh token

  @UpdateDateColumn()
  updateDate!: string;

  @CreateDateColumn()
  createDate!: string;
}
