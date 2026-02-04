import { IsString, IsOptional, IsEmail } from 'class-validator';

export class CreateManufacturerDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  mah?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsEmail()
  @IsOptional()
  contactEmail?: string;
}
