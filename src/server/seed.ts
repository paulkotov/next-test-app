import {
  CLIENT_CHURNED_SHARE,
  CLIENT_COUNT,
  CLIENT_SEED,
  USER_SEEDED_AT,
} from "@/config";
import { Role, UserStatus } from "@/domain/authz";
import { ClientStatus, type Client } from "@/domain/client";
import type { User } from "@/domain/user";
import { createEntityFactory, faker } from "@/lib/entity-factory";

type SeedUser = Pick<User, "id" | "fullName" | "email" | "role"> &
  Partial<Pick<User, "status" | "managerId">>;

function buildUser({
  id,
  fullName,
  email,
  role,
  status = UserStatus.ACTIVE,
  managerId = null,
}: SeedUser): User {
  return {
    id,
    fullName,
    email,
    role,
    status,
    managerId,
    password: `${id.replace(/^user_/, "")}-pass`,
    createdAt: USER_SEEDED_AT,
  };
}

export function createSeedUsers(): User[] {
  return [
    { id: "user_ivan", fullName: "Ivan Petrenko", email: "ivan@example.com", role: Role.IT },
    { id: "user_sofia", fullName: "Sofia Melnyk", email: "sofia@example.com", role: Role.IT },
    { id: "user_anna", fullName: "Anna Koval", email: "anna@example.com", role: Role.MANAGER },
    { id: "user_marko", fullName: "Marko Shevchenko", email: "marko@example.com", role: Role.MANAGER },
    { id: "user_ira", fullName: "Ira Bondar", email: "ira@example.com", role: Role.MANAGER },
    { id: "user_olena", fullName: "Olena Tkachenko", email: "olena@example.com", role: Role.USER, managerId: "user_anna" },
    { id: "user_pavlo", fullName: "Pavlo Hrytsenko", email: "pavlo@example.com", role: Role.USER, managerId: "user_anna" },
    { id: "user_marta", fullName: "Marta Sydorenko", email: "marta@example.com", role: Role.USER, managerId: "user_anna" },
    { id: "user_yulia", fullName: "Yulia Kravets", email: "yulia@example.com", role: Role.USER, managerId: "user_anna" },
    { id: "user_dmytro", fullName: "Dmytro Savchuk", email: "dmytro@example.com", role: Role.USER, managerId: "user_marko" },
    { id: "user_nazar", fullName: "Nazar Polishchuk", email: "nazar@example.com", role: Role.USER, status: UserStatus.DEACTIVATED },
    { id: "user_taras", fullName: "Taras Boyko", email: "taras@example.com", role: Role.MANAGER, status: UserStatus.DEACTIVATED },
    { id: "user_iryna", fullName: "Iryna Lysenko", email: "iryna@example.com", role: Role.USER, managerId: "user_taras" },
  ].map(buildUser);
}

export function createSeedClients(count: number = CLIENT_COUNT): Client[] {
  faker.seed(CLIENT_SEED);

  const clients = createEntityFactory<Client>(() => ({
    id: faker.string.uuid(),
    name: faker.person.fullName(),
    company: faker.company.name(),
    email: faker.internet.email(),
    country: faker.location.country(),
    status: faker.datatype.boolean({ probability: CLIENT_CHURNED_SHARE })
      ? ClientStatus.CHURNED
      : ClientStatus.ACTIVE,
    createdAt: faker.date.past({ years: 3 }).toISOString(),
  }));

  return clients.createList(count);
}
