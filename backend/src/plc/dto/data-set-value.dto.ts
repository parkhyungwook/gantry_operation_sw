import { ApiProperty } from "@nestjs/swagger";

export class DataSetValuesResponseDto {
  @ApiProperty()
  dataSetId: number;

  @ApiProperty()
  length: number;

  @ApiProperty({ type: [Number] })
  values: number[];

  @ApiProperty({ required: false })
  timestamp?: Date;

  @ApiProperty({ required: false })
  error?: string;
}

export class WriteDataSetValuesDto {
  @ApiProperty()
  dataSetId: number;

  @ApiProperty({ type: [Number], description: "DataSet 길이 이하의 워드 배열" })
  values: number[];
}
