import {MigrationInterface, QueryRunner} from "typeorm";

export class SeanceAddLastCheckDate1551391637957 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(
      `ALTER TABLE "seance" ADD "seatAvailabilityLastCheck" character varying NULL DEFAULT NULL`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`ALTER TABLE "seance" DROP COLUMN "seatAvailabilityLastCheck"`);
  }

}
