import { faker } from "@faker-js/faker";

export { faker };

export type EntityFactory<T extends object> = {
  create: (overrides?: Partial<T>) => T;
  createList: (count: number, overrides?: Partial<T>) => T[];
};

export function createEntityFactory<T extends object>(
  build: () => T,
): EntityFactory<T> {
  const create = (overrides?: Partial<T>): T => ({
    ...build(),
    ...overrides,
  });

  const createList = (count: number, overrides?: Partial<T>): T[] =>
    Array.from({ length: count }, () => create(overrides));

  return { create, createList };
}
