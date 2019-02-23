import { MigrationInterface, QueryRunner } from "typeorm";

export class AddReleaseDate1550921333168 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(
      `ALTER TABLE "movie" ADD "release_date" character varying NULL DEFAULT NULL`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`ALTER TABLE "movie" DROP COLUMN "release_date"`);
  }
}
