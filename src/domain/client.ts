export enum ClientStatus {
  ACTIVE = "ACTIVE",
  CHURNED = "CHURNED",
}

export type Client = {
  id: string;
  name: string;
  company: string;
  email: string;
  country: string;
  status: ClientStatus;
  createdAt: string;
};

export type Page<T> = {
  items: T[];
  page: number;
  limit: number;
  total: number;
};
