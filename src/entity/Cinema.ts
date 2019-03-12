import { Entity, Column, PrimaryGeneratedColumn, Unique } from "typeorm";
import { ColumnNumericTransformer } from "../utils/ColumnNumericTransformer";

@Entity()
@Unique(["multikinoId"])
export class Cinema {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  chain: string;

  @Column()
  name: string;

  @Column()
  multikinoId: number;

  @Column({ transformer: new ColumnNumericTransformer() })
  latitude: number;

  @Column({ transformer: new ColumnNumericTransformer() })
  longitude: number;
}
