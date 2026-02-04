import { IsUUID, IsString, IsOptional, IsDateString, IsBoolean } from 'class-validator';

export class LinkRepositoryDto {
  @IsUUID()
  repositoryId: string;

  @IsString()
  @IsOptional()
  version?: string;

  @IsDateString()
  @IsOptional()
  releaseDate?: string;

  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;
}
