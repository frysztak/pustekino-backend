import {MigrationInterface, QueryRunner} from "typeorm";

export class MovieAddDetails1550046409565 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "movie" ADD "poster_large_url" character varying NOT NULL DEFAULT ''`);
        await queryRunner.query(`ALTER TABLE "movie" ADD "hero_url" character varying NOT NULL DEFAULT ''`);
        await queryRunner.query(`ALTER TABLE "movie" ADD "directors" text array NOT NULL DEFAULT '{}'::text[]`);
        await queryRunner.query(`ALTER TABLE "movie" ADD "actors" text array NOT NULL DEFAULT '{}'::text[]`);
        await queryRunner.query(`ALTER TABLE "movie" ADD "country" character varying NOT NULL DEFAULT ''`);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "movie" DROP COLUMN "country"`);
        await queryRunner.query(`ALTER TABLE "movie" DROP COLUMN "actors"`);
        await queryRunner.query(`ALTER TABLE "movie" DROP COLUMN "directors"`);
        await queryRunner.query(`ALTER TABLE "movie" DROP COLUMN "hero_url"`);
        await queryRunner.query(`ALTER TABLE "movie" DROP COLUMN "poster_large_url"`);
    }

}
