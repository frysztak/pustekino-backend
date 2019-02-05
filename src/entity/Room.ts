import { Entity, Column, PrimaryGeneratedColumn, Unique } from "typeorm";

@Entity()
@Unique(["multikinoId"])
export class Room {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    multikinoId: number;

    @Column()
    name: string;
}