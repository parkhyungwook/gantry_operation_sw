import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsOptional, Min } from "class-validator";

export class DeployProcessProgramDto {
  @ApiPropertyOptional({ description: "Base D address to write program words", example: 1000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  baseAddress?: number;

  @ApiPropertyOptional({ description: "Word size per step (padding included)", example: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  stepWords?: number;
}
