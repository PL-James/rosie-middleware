import { IsString, IsUrl, IsOptional, IsBoolean, IsInt, Min } from 'class-validator';

export class CreateRepositoryDto {
  @IsString()
  name: string;

  @IsUrl()
  gitUrl: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  autoScan?: boolean;

  @IsInt()
  @Min(5)
  @IsOptional()
  scanIntervalMinutes?: number;
}
