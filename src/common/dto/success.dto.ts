export class Meta {
  public page: number;

  public limit: number;

  public totalPage: number;

  public totalData: number;

  constructor(
    page: number,
    limit: number,
    totalPage: number,
    totalData: number,
  ) {
    this.page = page;
    this.limit = limit;
    this.totalPage = totalPage;
    this.totalData = totalData;
  }
}

/**
 * SuccessDto is a class that contains the message/data of the success response.
 */
export class SuccessDto<T = any> {
  public message: string;

  public data: T | undefined;

  public meta: Meta | undefined;

  constructor(
    message: string,
    data: T | undefined = undefined,
    meta: Meta | undefined = undefined,
  ) {
    this.message = message;
    this.data = data;
    this.meta = meta;
  }
}
