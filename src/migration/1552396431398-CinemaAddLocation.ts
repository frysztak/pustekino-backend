import { MigrationInterface, QueryRunner } from "typeorm";

export class CinemaAddLocation1552396431398 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(
      `ALTER TABLE "cinema" ADD "latitude" NUMERIC NOT NULL DEFAULT 'NaN'`
    );
    await queryRunner.query(
      `ALTER TABLE "cinema" ADD "longitude" NUMERIC NOT NULL DEFAULT 'NaN'`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`ALTER TABLE "cinema" DROP COLUMN "latitude"`);
    await queryRunner.query(`ALTER TABLE "cinema" DROP COLUMN "longitude"`);
  }
}
